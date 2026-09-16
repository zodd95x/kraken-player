import axios from "axios";
import { searchResult } from "@/api/search";
import { formatSongsList } from "@/utils/format";
import { useLocalStore } from "@/stores";
import { trSetting } from "@/utils/i18nSettings";
import type { SongType } from "@/types/main";

// 导入进度回调数据
export interface ImportProgress {
  current: number;
  total: number;
  trackTitle: string;
}

// 导入结果
export interface SpotifyImportResult {
  matched: number;
  title: string;
  total: number;
  playlistId: number;
}

interface SpotifyTrack {
  name: string;
  artists: string;
}

// 解析链接或 URI
const parseSpotifyUrl = (url: string): { type: string; id: string } | null => {
  const cleaned = url.trim();
  const uriMatch = cleaned.match(/^spotify:(playlist|album|track|artist):([A-Za-z0-9]+)$/);
  if (uriMatch) return { type: uriMatch[1], id: uriMatch[2] };
  const linkMatch = cleaned.match(
    /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|track|artist)\/([A-Za-z0-9]+)/,
  );
  if (linkMatch) return { type: linkMatch[1], id: linkMatch[2] };
  return null;
};

// 文本抓取（主进程优先，无 CORS 限制）
const fetchPageText = async (url: string): Promise<string> => {
  try {
    const res = await window.api?.spotify?.fetchText(url);
    if (res && res.success) return res.text;
  } catch (error) {
    console.error("Main fetch failed, fallback to renderer:", error);
  }
  const { data } = await axios.get<string>(url, {
    timeout: 15000,
    responseType: "text",
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  return typeof data === "string" ? data : "";
};

// fetch metadata (public oEmbed, no key needed)
const fetchSpotifyMeta = async (
  type: string,
  id: string,
): Promise<{ title: string; author: string; cover: string }> => {
  const text = await fetchPageText(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(
      `https://open.spotify.com/${type}/${id}`,
    )}`,
  );
  const data = JSON.parse(text);
  return {
    title: data?.title || "Spotify",
    author: data?.author_name || "",
    cover: data?.thumbnail_url || "",
  };
};

// 提取页面 JSON embarque
const extractNextData = (html: string): any | null => {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/s);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

// 收集曲目 (titre + artistes)
const collectTracks = (data: any, type: string): SpotifyTrack[] => {
  const out: SpotifyTrack[] = [];
  const pushTrack = (name: string, artists: string) => {
    if (name) out.push({ name, artists });
  };
  const readArtists = (artists: any): string => {
    if (!artists) return "";
    if (typeof artists === "string") return artists;
    const list = Array.isArray(artists) ? artists : artists?.items || [];
    return list
      .map((a: any) => a?.profile?.name || a?.name || "")
      .filter(Boolean)
      .join(", ");
  };
  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const track = node.track || node;
    if (track?.uri?.startsWith?.("spotify:track:") && track?.name) {
      pushTrack(track.name, readArtists(track.artists || track.artist));
    }
    Object.values(node).forEach(walk);
  };
  if (type === "track") return out;
  walk(data?.props?.pageProps?.state?.data || data?.props?.pageProps || data);
  // dedup by uri
  const seen = new Set<string>();
  return out.filter((t) => {
    const key = `${t.name} - ${t.artists}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// fetch track list (page embed + oEmbed fallback)
const fetchSpotifyTracks = async (
  type: string,
  id: string,
  meta: { title: string; author: string },
): Promise<SpotifyTrack[]> => {
  if (type === "track") {
    return meta.title ? [{ name: meta.title, artists: meta.author }] : [];
  }
  const html = await fetchPageText(`https://open.spotify.com/embed/${type}/${id}`);
  const nextData = extractNextData(html);
  const tracks = nextData ? collectTracks(nextData, type) : [];
  return tracks;
};

// import Spotify playlist/album/track/artist into a local playlist
export const importSpotifyPlaylist = async (
  url: string,
  onProgress?: (progress: ImportProgress) => void,
): Promise<SpotifyImportResult> => {
  const parsed = parseSpotifyUrl(url);
  if (!parsed) throw new Error(trSetting("Lien Spotify invalide"));
  const localStore = useLocalStore();

  // 元信息
  let meta = { title: "Spotify", author: "", cover: "" };
  try {
    meta = await fetchSpotifyMeta(parsed.type, parsed.id);
  } catch (error) {
    console.error("Failed to fetch Spotify meta:", error);
  }

  // 曲目列表
  let tracks: SpotifyTrack[] = [];
  try {
    tracks = await fetchSpotifyTracks(parsed.type, parsed.id, meta);
  } catch (error) {
    console.error("Failed to fetch Spotify tracks:", error);
  }
  if (tracks.length === 0) throw new Error(trSetting("Aucun titre trouvable sur ce lien"));

  // 创建本地歌单
  const playlist = await localStore.createLocalPlaylist(meta.title);

  // 逐个匹配到曲库
  const matchedIds: string[] = [];
  const matchedSongs: SongType[] = [];
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    onProgress?.({ current: i + 1, total: tracks.length, trackTitle: track.name });
    try {
      const keyword = track.artists ? `${track.name} ${track.artists}` : track.name;
      const result = await searchResult(keyword, 5, 0, 1);
      const songs = formatSongsList(result?.result?.songs || []);
      if (songs.length > 0) {
        matchedIds.push(String(songs[0].id));
        matchedSongs.push(songs[0]);
      }
    } catch (error) {
      console.error("Failed to match track:", track.name, error);
    }
  }

  if (matchedIds.length > 0) {
    await localStore.addSongsToLocalPlaylist(playlist.id, matchedIds, matchedSongs);
  }

  return {
    matched: matchedIds.length,
    title: meta.title,
    total: tracks.length,
    playlistId: playlist.id,
  };
};
