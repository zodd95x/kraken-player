import type { PlayModePayload } from "@shared";
import { ipcMain } from "electron";
import { getMainTray } from "../tray";
import { appName, isMac } from "../utils/config";
import lyricWindow from "../windows/lyric-window";
import { useStore } from "../store";
import { getThumbar } from "../thumbar";
import { setMainLanguage } from "../utils/localization";
import { sendToTaskbarLyric } from "../windows/taskbar-lyric-window";

// 当前歌曲标题
let currentSongTitle = appName;

/**
 * 获取当前歌曲标题
 * @returns 当前歌曲标题
 */
export const getCurrentSongTitle = () => currentSongTitle;

/**
 * 托盘 IPC
 */
const initTrayIpc = (): void => {
  const tray = getMainTray();

  // 音乐播放状态更改
  ipcMain.on("play-status-change", (_, playStatus: boolean) => {
    const lyricWin = lyricWindow.getWin();
    tray?.setPlayState(playStatus ? "play" : "pause");
    if (!lyricWin) return;
    lyricWin.webContents.send("play-status-change", playStatus);
  });

  // 音乐名称更改
  ipcMain.on("play-song-change", (_, options) => {
    const store = useStore();
    // 从 Store 获取 macOS 状态栏歌词的启用状态
    const isMacLyricEnabled = store.get("macos.statusBarLyric.enabled") ?? false;
    let title = options?.title;
    if (!title) title = appName;
    currentSongTitle = title;
    // 更改托盘标题：仅在非 macOS 状态栏歌词模式下，或 macOS 歌词未启用时，才更新托盘标题为歌曲名
    if (!isMac || !isMacLyricEnabled) {
      tray?.setTitle(title);
    }
    tray?.setPlayName(title);
  });

  // 播放模式切换
  ipcMain.on("play-mode-change", (_, data: PlayModePayload) => {
    tray?.setPlayMode(data.repeatMode, data.shuffleMode);
  });

  // 喜欢状态切换
  ipcMain.on("like-status-change", (_, likeStatus: boolean) => {
    tray?.setLikeState(likeStatus);
  });

  // 桌面歌词开关
  ipcMain.on("desktop-lyric:toggle", (_, val: boolean) => {
    tray?.setDesktopLyricShow(val);
  });

  // 锁定/解锁桌面歌词
  ipcMain.on("desktop-lyric:toggle-lock", (_, { lock }: { lock: boolean }) => {
    tray?.setDesktopLyricLock(lock);
  });

  // 语言变更通知（同步转发给任务栏窗口，其存储分区隔离读不到主窗口配置）
  ipcMain.on("language-change", (_, lang: string) => {
    tray?.setLanguage(lang);
    getThumbar()?.setLanguage(lang);
    setMainLanguage(lang);
    sendToTaskbarLyric("language-change", lang);
  });
};

export default initTrayIpc;
