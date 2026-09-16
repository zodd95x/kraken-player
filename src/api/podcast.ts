import axios from "axios";
import type { CoverType, SongType } from "@/types/main";
import { QualityType } from "@/types/main";

// 热门国家列表
export interface PodcastCountry {
  code: string;
  name: string;
  flag: string;
}

export const PODCAST_COUNTRIES: PodcastCountry[] = [
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "US", name: "USA", flag: "🇺🇸" },
  { code: "GB", name: "UK", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "BE", name: "Belgique", flag: "🇧🇪" },
  { code: "CH", name: "Suisse", flag: "🇨🇭" },
  { code: "DE", name: "Allemagne", flag: "🇩🇪" },
  { code: "ES", name: "Espagne", flag: "🇪🇸" },
  { code: "IT", name: "Italie", flag: "🇮🇹" },
  { code: "CN", name: "Chine", flag: "🇨🇳" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "MA", name: "Maroc", flag: "🇲🇦" },
];

// 播客分类预设
export interface PodcastCategory {
  id: string;
  name: string;
  keyword: string;
}

export const PODCAST_CATEGORIES: PodcastCategory[] = [
  { id: "all", name: "Tous", keyword: "podcast" },
  { id: "news", name: "Actualités", keyword: "actualités" },
  { id: "comedy", name: "Humour", keyword: "humour" },
  { id: "culture", name: "Société & Culture", keyword: "société culture" },
  { id: "crime", name: "True Crime", keyword: "crime faits divers" },
  { id: "tech", name: "Technologie", keyword: "technologie" },
  { id: "history", name: "Histoire", keyword: "histoire" },
  { id: "science", name: "Sciences", keyword: "science" },
  { id: "business", name: "Business", keyword: "business économie" },
  { id: "music", name: "Musique", keyword: "musique" },
];

// 转换 iTunes 结果为封面对象
export const formatPodcastCover = (item: any): CoverType => {
  return {
    id: item.collectionId,
    name: item.collectionName || item.trackName || "Podcast",
    cover: item.artworkUrl600 || item.artworkUrl100 || "/images/song.jpg?asset",
    creator: {
      id: 0,
      name: item.artistName || "Créateur inconnu",
      avatarUrl: item.artworkUrl100 || "",
    },
    count: item.trackCount || 0,
    description: item.genres?.join(" • ") || item.primaryGenreName || "",
    tags: item.genres || [],
    updateTime: item.releaseDate ? new Date(item.releaseDate).getTime() : undefined,
  };
};

// 搜索播客
export const searchPodcasts = async (
  query: string,
  country: string = "FR",
  limit: number = 30,
): Promise<CoverType[]> => {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&entity=podcast&country=${country}&limit=${limit}`;
    const res = await axios.get(url, { timeout: 10000 });
    const results = res.data?.results || [];
    return results.map(formatPodcastCover);
  } catch (error) {
    console.error("Failed to search podcasts:", error);
    return [];
  }
};

// 获取推荐播客
export const getPopularPodcasts = async (
  country: string = "FR",
  categoryKeyword: string = "podcast",
  limit: number = 30,
): Promise<CoverType[]> => {
  return searchPodcasts(categoryKeyword || "podcast", country, limit);
};

//  spotlight 缓存（country -> 结果，10分钟）
const spotlightCache = new Map<string, { at: number; list: CoverType[] }>();

const normalizeText = (text: string): string =>
  (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * 本地 spotlight：用国家名搜索并只保留标题/作者相关的结果
 * @param country 国家代码
 * @param names 按优先排序的国家名
 * @param limit 最大条数
 */
export const searchCountrySpotlight = async (
  country: string,
  names: string[],
  limit: number = 8,
): Promise<CoverType[]> => {
  if (!country || names.length === 0) return [];
  const hit = spotlightCache.get(country);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.list;
  const normNames = names.map(normalizeText).filter(Boolean);
  for (const name of names) {
    if (!name) continue;
    try {
      const results = await searchPodcasts(name, country, 20);
      const local = results.filter((item) => {
        const creatorName =
          typeof item.creator === "string" ? item.creator : item.creator?.name || "";
        const hay = normalizeText(`${item.name} ${creatorName}`);
        return normNames.some((n) => n && hay.includes(n));
      });
      if (local.length > 0) {
        const list = local.slice(0, limit);
        spotlightCache.set(country, { at: Date.now(), list });
        return list;
      }
    } catch {
      // 该名称无结果，尝试下一个
    }
  }
  spotlightCache.set(country, { at: Date.now(), list: [] });
  return [];
};

// 获取播客单集详情
export const getPodcastDetailAndEpisodes = async (
  collectionId: number | string,
  limit: number = 200,
): Promise<{
  detail: CoverType | null;
  episodes: SongType[];
}> => {
  try {
    const url = `https://itunes.apple.com/lookup?id=${collectionId}&entity=podcastEpisode&limit=${limit}`;
    const res = await axios.get(url, { timeout: 15000 });
    const results = res.data?.results || [];
    if (results.length === 0) return { detail: null, episodes: [] };

    // 第一个为播客基本信息
    const podcastInfo = results[0];
    const detail = formatPodcastCover(podcastInfo);

    // 其余为单集列表
    const episodeResults = results
      .slice(1)
      .filter((item: any) => item.wrapperType === "podcastEpisode");
    const episodes: SongType[] = episodeResults.map((item: any, index: number) => {
      return {
        id: item.trackId || Number(collectionId) * 1000 + index,
        name: item.trackName || `Épisode ${index + 1}`,
        artists: podcastInfo.artistName || "Podcast",
        album: podcastInfo.collectionName || "Podcast",
        cover: item.artworkUrl600 || podcastInfo.artworkUrl600 || "/images/song.jpg?asset",
        duration: Math.floor(item.trackTimeMillis || 0),
        free: 0,
        mv: null,
        type: "streaming",
        streamUrl: item.episodeUrl,
        updateTime: item.releaseDate ? new Date(item.releaseDate).getTime() : undefined,
        alia: item.description || item.shortDescription || "",
        quality: QualityType.SQ,
      };
    });

    return { detail, episodes };
  } catch (error) {
    console.error("Failed to get podcast episodes:", error);
    return { detail: null, episodes: [] };
  }
};

// 解析自定义 RSS 链接
export const parseCustomRssFeed = async (
  feedUrl: string,
): Promise<{
  detail: CoverType | null;
  episodes: SongType[];
}> => {
  try {
    const res = await axios.get<string>(feedUrl, { timeout: 15000, responseType: "text" });
    const doc = new DOMParser().parseFromString(res.data, "text/xml");
    if (doc.querySelector("parsererror")) return { detail: null, episodes: [] };
    const channel = doc.querySelector("channel");
    if (!channel) return { detail: null, episodes: [] };
    // 播客基本信息
    const title = channel.querySelector("title")?.textContent?.trim() || "Podcast";
    const imageEl =
      channel.querySelector("image > url")?.textContent?.trim() ||
      channel.getElementsByTagName("itunes:image")[0]?.getAttribute("href") ||
      "";
    const cover = imageEl || "/images/song.jpg?asset";
    const detail: CoverType = {
      id: feedUrl,
      name: title,
      cover,
      description: channel.querySelector("description")?.textContent?.trim() || "",
    };
    // 单集列表
    const items = Array.from(channel.querySelectorAll("item"));
    const episodes: SongType[] = items
      .map((item, index): SongType => {
        const enclosure = item.querySelector("enclosure");
        const streamUrl =
          enclosure?.getAttribute("url")?.trim() ||
          item.querySelector("link")?.textContent?.trim() ||
          "";
        const durationEl =
          item.getElementsByTagName("itunes:duration")[0]?.textContent?.trim() ||
          item.querySelector("duration")?.textContent?.trim() ||
          "";
        return {
          id: Date.now() + index,
          name: item.querySelector("title")?.textContent?.trim() || `Épisode ${index + 1}`,
          artists: title,
          album: title,
          cover,
          duration: parseRssDuration(durationEl),
          free: 0,
          mv: null,
          type: "streaming",
          streamUrl,
          alia: item.querySelector("description")?.textContent?.trim() || "",
          quality: QualityType.SQ,
        };
      })
      .filter((ep) => ep.streamUrl);
    return { detail, episodes };
  } catch (error) {
    console.error("Failed to parse RSS feed:", error);
    return { detail: null, episodes: [] };
  }
};

// 解析 RSS 时长为毫秒
const parseRssDuration = (text: string): number => {
  if (!text) return 0;
  const clean = text.trim();
  if (/^\d+$/.test(clean)) return Number(clean) * 1000;
  const parts = clean.split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  let seconds = 0;
  for (const p of parts) seconds = seconds * 60 + p;
  return seconds * 1000;
};
