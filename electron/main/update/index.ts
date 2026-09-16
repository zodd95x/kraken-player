import type { BrowserWindow } from "electron";
import electronUpdater from "electron-updater";
import type { ProgressInfo, UpdateInfo } from "electron-updater";
import { updateLog } from "../logger";
import { isDev } from "../utils/config";

// 兼容 CJS 模块写法
const { autoUpdater } = electronUpdater;

// 更新源（官方仓库发布后填写）
export const UPDATE_OWNER = "";
export const UPDATE_REPO = "";

// 是否已配置更新源
export const isUpdateConfigured = (): boolean => Boolean(UPDATE_OWNER && UPDATE_REPO);

// 是否已初始化监听
let isInit = false;
// 是否提示检查结果
let isShowTip = false;

// 初始化更新事件监听
export const initUpdater = (win: BrowserWindow): void => {
  if (isInit) return;
  // 自动下载新版本
  autoUpdater.autoDownload = true;
  // 不接收预发布版本
  autoUpdater.allowPrerelease = false;

  // 发现新版本
  autoUpdater.on("update-available", (info: UpdateInfo) => {
    win.webContents.send("update-available", info);
    updateLog.info(`发现新版本: ${info.version}`);
  });

  // 下载进度
  autoUpdater.on("download-progress", (progress: ProgressInfo) => {
    win.webContents.send("download-progress", progress);
    updateLog.info(`正在下载更新: ${Math.floor(progress.percent)}%`);
  });

  // 下载完成
  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    win.webContents.send("update-downloaded", info);
    updateLog.info(`更新下载完成: ${info.version}`);
  });

  // 已是最新版本
  autoUpdater.on("update-not-available", (info: UpdateInfo) => {
    if (isShowTip) win.webContents.send("update-not-available", info);
    updateLog.info(`已是最新版本: ${info.version}`);
  });

  // 更新出错
  autoUpdater.on("error", (err: Error) => {
    win.webContents.send("update-error", err?.message ?? String(err));
    updateLog.error(`更新出错: ${err?.message ?? err}`);
  });

  isInit = true;
};

// 检查更新
export const checkUpdate = (win: BrowserWindow, showTip: boolean = false): void => {
  initUpdater(win);
  isShowTip = showTip;

  // 未配置更新源时直接返回
  if (!isUpdateConfigured()) {
    win.webContents.send("update-not-configured");
    updateLog.warn("更新源未配置，跳过检查");
    return;
  }

  // 开发环境跳过检查
  if (isDev) {
    if (isShowTip) win.webContents.send("update-error", "Dev mode, skip update check");
    updateLog.info("开发环境跳过更新检查");
    return;
  }

  // 设置更新源
  autoUpdater.setFeedURL({ provider: "github", owner: UPDATE_OWNER, repo: UPDATE_REPO });
  // 开始检查
  autoUpdater
    .checkForUpdates()
    .then((res) => {
      // 检查被跳过时手动结束前端等待状态
      if (!res && isShowTip) {
        win.webContents.send("update-not-available", null);
      }
    })
    .catch((err) => {
      updateLog.error(`检查更新失败: ${err}`);
      win.webContents.send("update-error", err?.message ?? String(err));
    });
};

// 安装更新并重启
export const quitAndInstall = (): void => {
  updateLog.info("安装更新并重启应用");
  autoUpdater.quitAndInstall(false, true);
};
