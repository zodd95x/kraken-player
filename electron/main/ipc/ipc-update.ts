import { ipcMain } from "electron";
import { checkUpdate, quitAndInstall } from "../update";
import mainWindow from "../windows/main-window";

// 初始化更新 IPC 通信
const initUpdateIpc = (): void => {
  // 检查更新
  ipcMain.on("check-update", (_event, showTip: boolean = true) => {
    const win = mainWindow.getWin();
    if (!win) return;
    checkUpdate(win, showTip);
  });

  // 安装更新并重启
  ipcMain.on("quit-and-install", () => {
    quitAndInstall();
  });
};

export default initUpdateIpc;
