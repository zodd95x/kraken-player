import { isMac } from "../utils/config";
import initCacheIpc from "./ipc-cache";
import initFileIpc from "./ipc-file";
import initLyricIpc from "./ipc-lyric";
import { initMacStatusBarIpc } from "./ipc-mac-statusbar";
import initMediaIpc from "./ipc-media";
import initMpvIpc from "./ipc-mpv";
import initProtocolIpc from "./ipc-protocol";
import initRendererLogIpc from "./ipc-renderer-log";
import initShortcutIpc from "./ipc-shortcut";
import initSocketIpc from "./ipc-socket";
import initSpotifyIpc from "./ipc-spotify";
import initMcpIpc from "./ipc-mcp";
import initStoreIpc from "./ipc-store";
import initSystemIpc from "./ipc-system";
import initTaskbarIpc from "./ipc-taskbar";
import initThumbarIpc from "./ipc-thumbar";
import initTrayIpc from "./ipc-tray";
import initWindowsIpc from "./ipc-window";

/**
 * 初始化全部 IPC 通信
 * @returns void
 */
const initIpc = (): void => {
  initSystemIpc();
  initWindowsIpc();
  initFileIpc();
  initTrayIpc();
  initLyricIpc();
  initStoreIpc();
  initThumbarIpc();
  initShortcutIpc();
  initProtocolIpc();
  initCacheIpc();
  initSocketIpc();
  initSpotifyIpc();
  initMcpIpc();
  initMediaIpc();
  initMpvIpc();
  initRendererLogIpc();
  if (isMac) {
    initMacStatusBarIpc();
  } else {
    initTaskbarIpc();
  }
};

export default initIpc;
