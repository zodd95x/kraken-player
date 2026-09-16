import { ipcMain } from "electron";
import { ipcLog } from "../logger";

// 允许抓取的域名白名单
const SPOTIFY_ALLOW_HOSTS = new Set(["open.spotify.com", "i.scdn.co"]);

// 请求超时时间
const FETCH_TIMEOUT = 15000;

// 主进程抓取文本（无 CORS 限制）
const fetchTextInMain = async (rawUrl: string): Promise<string> => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("INVALID_URL");
  }
  // 仅允许白名单域名
  if (parsed.protocol !== "https:" || !SPOTIFY_ALLOW_HOSTS.has(parsed.hostname)) {
    throw new Error("HOST_NOT_ALLOWED");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MusicBoxPlayer/3.1.1",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
};

/**
 * 初始化 Spotify 抓取 IPC 主进程
 */
const initSpotifyIpc = (): void => {
  // 抓取页面文本
  ipcMain.handle("spotify-fetch", async (_event, url: string) => {
    try {
      if (typeof url !== "string" || !url) throw new Error("INVALID_URL");
      const text = await fetchTextInMain(url);
      return { success: true as const, text };
    } catch (error: any) {
      ipcLog.warn(`[SpotifyFetch] 抓取失败: ${String(error?.message || error)}`);
      return { success: false as const, error: String(error?.message || error) };
    }
  });
};

export default initSpotifyIpc;
