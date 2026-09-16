import { encryptQuery } from "./kwDES";
import type { SongMatchInfo, SongUrlResult } from "./unblock";
import { isSongMatch } from "./match";
import { serverLog } from "../../main/logger";
import axios from "axios";

// 获取酷我音乐歌曲 ID
const getKuwoSongId = async (match: SongMatchInfo): Promise<string | null> => {
  try {
    const url =
      "http://search.kuwo.cn/r.s?&correct=1&stype=comprehensive&encoding=utf8&rformat=json&mobi=1&show_copyright_off=1&searchapi=6&all=" +
      encodeURIComponent(match.keyword);
    const result = await axios.get(url);
    if (
      !result.data ||
      result.data.content.length < 2 ||
      !result.data.content[1].musicpage ||
      result.data.content[1].musicpage.abslist.length < 1
    ) {
      return null;
    }
    // 遍历搜索结果，找歌名和艺术家匹配的项
    for (const item of result.data.content[1].musicpage.abslist) {
      const songId = item?.MUSICRID;
      if (!songId) continue;
      if (isSongMatch(item?.SONGNAME || "", item?.ARTIST || "", match)) {
        return songId.slice("MUSIC_".length);
      }
    }
    serverLog.warn(`⚠️ Kuwo 搜索结果均不匹配原曲: "${match.songName}"`);
    return null;
  } catch (error) {
    serverLog.error("❌ Get KuwoSongId Error:", error);
    return null;
  }
};

// 获取酷我音乐歌曲 URL
const getKuwoSongUrl = async (match: SongMatchInfo): Promise<SongUrlResult> => {
  try {
    if (!match.keyword) return { code: 404, url: null };
    const songId = await getKuwoSongId(match);
    if (!songId) return { code: 404, url: null };
    // 请求地址
    const PackageName = "kwplayer_ar_5.1.0.0_B_jiakong_vh.apk";
    const url =
      "http://mobi.kuwo.cn/mobi.s?f=kuwo&q=" +
      encryptQuery(
        `corp=kuwo&source=${PackageName}&p2p=1&type=convert_url2&sig=0&format=mp3` +
          "&rid=" +
          songId,
      );
    const result = await axios.get(url, {
      headers: {
        "User-Agent": "okhttp/3.10.0",
      },
    });
    if (result.data) {
      const urlMatch = result.data.match(/http[^\s$"]+/)[0];
      serverLog.log("🔗 KuwoSong URL:", urlMatch);
      return { code: 200, url: urlMatch };
    }
    return { code: 404, url: null };
  } catch (error) {
    serverLog.error("❌ Get KuwoSong URL Error:", error);
    return { code: 404, url: null };
  }
};

export default getKuwoSongUrl;
