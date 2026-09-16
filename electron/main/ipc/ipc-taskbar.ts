import {
  DEFAULT_TASKBAR_LYRIC_SETTINGS,
  TASKBAR_IPC_CHANNELS,
  type SpectrumPayload,
  type SyncStatePayload,
  type TaskbarLyricSettings,
} from "@shared";
import { ipcMain } from "electron";
import { processLog } from "../logger";
import { useStore } from "../store";
import { isDev } from "../utils/config";
import mainWindow from "../windows/main-window";
import {
  applyTaskbarLyricLayout,
  createTaskbarLyricWindow,
  getTaskbarLyricWindow,
  sendToTaskbarLyric,
  setTaskbarLyricHasContent,
  setTaskbarLyricVisible,
} from "../windows/taskbar-lyric-window";

/** 读取完整任务栏歌词配置 */
const getTaskbarConfig = (): TaskbarLyricSettings => {
  return useStore().get("taskbarLyric");
};

const initTaskbarIpc = () => {
  const store = useStore();

  // 空闲时不建窗口：等首个有效曲目再创建，避免任务栏挂空白部件
  // （用户显式开关仍即时生效，走 SET_VISIBLE / toggle 通道）

  // 获取完整配置
  ipcMain.handle(TASKBAR_IPC_CHANNELS.GET_OPTION, () => getTaskbarConfig());

  // 设置配置（增量合并）
  ipcMain.on(
    TASKBAR_IPC_CHANNELS.SET_OPTION,
    (_event, option: Partial<TaskbarLyricSettings>, pushToWindow = true) => {
      if (!option) return;

      // 安全过滤：仅允许写入 DEFAULT_TASKBAR_LYRIC_SETTINGS 中定义的合法键
      const allowedKeys = Object.keys(DEFAULT_TASKBAR_LYRIC_SETTINGS);
      let layoutAffected = false;

      Object.entries(option).forEach(([key, value]) => {
        if (allowedKeys.includes(key)) {
          store.set(`taskbarLyric.${key}`, value);
          if (key === "position" || key === "autoMaxWidth" || key === "maxWidth") {
            layoutAffected = true;
          }
        }
      });

      // 推送配置变更到任务栏窗口
      if (pushToWindow) {
        sendToTaskbarLyric(TASKBAR_IPC_CHANNELS.CONFIG_CHANGE, getTaskbarConfig());
      }

      // 影响定位的配置变更后重算布局
      if (layoutAffected) applyTaskbarLyricLayout();
    },
  );

  // 设置窗口显隐
  ipcMain.on(TASKBAR_IPC_CHANNELS.SET_VISIBLE, (_event, visible: boolean) => {
    setTaskbarLyricVisible(visible);
  });

  // 转发播放状态到任务栏窗口
  // 首个有效曲目到达时建窗口；清空时隐藏（不断开，下首歌自动恢复）
  ipcMain.on(TASKBAR_IPC_CHANNELS.SYNC_STATE, (_event, payload: SyncStatePayload) => {
    const title =
      payload.type === "full-hydration"
        ? payload.data.track?.title
        : payload.type === "track-change"
          ? payload.data.title
          : undefined;
    const win = getTaskbarLyricWindow();
    if (title) {
      setTaskbarLyricHasContent(true);
      if (!win && store.get("windowStates.taskbarLyric.visible")) {
        createTaskbarLyricWindow();
      } else if (win && !win.isVisible()) {
        win.showInactive();
      }
    } else if (payload.type === "track-change") {
      setTaskbarLyricHasContent(false);
      if (win && win.isVisible()) {
        win.hide();
      }
    } else if (payload.type === "full-hydration" && !payload.data.track?.title) {
      setTaskbarLyricHasContent(false);
    }
    sendToTaskbarLyric(TASKBAR_IPC_CHANNELS.SYNC_STATE, payload);
  });

  // 转发播放进度到任务栏窗口
  ipcMain.on(TASKBAR_IPC_CHANNELS.SYNC_TICK, (_event, payload) => {
    sendToTaskbarLyric(TASKBAR_IPC_CHANNELS.SYNC_TICK, payload);
  });

  // 转发频谱数据到任务栏窗口
  let spectrumCount = 0;
  let spectrumPeak = 0;
  let lastSpectrumLog = 0;
  ipcMain.on(TASKBAR_IPC_CHANNELS.SYNC_SPECTRUM, (_event, payload: SpectrumPayload) => {
    sendToTaskbarLyric(TASKBAR_IPC_CHANNELS.SYNC_SPECTRUM, payload);
    // 开发期诊断：每 5 秒汇总一次接收量
    if (isDev) {
      spectrumCount++;
      if (Array.isArray(payload)) {
        for (const v of payload) if (typeof v === "number" && v > spectrumPeak) spectrumPeak = v;
      }
      const now = Date.now();
      if (now - lastSpectrumLog > 5000) {
        const win = getTaskbarLyricWindow();
        processLog.log(
          `[taskbar-spectrum] rx count=${spectrumCount} peak=${spectrumPeak} win=${win ? "open" : "null"} visible=${win?.isVisible() ?? false}`,
        );
        spectrumCount = 0;
        spectrumPeak = 0;
        lastSpectrumLog = now;
      }
    }
  });

  // 任务栏窗口请求初始数据：转发给主窗口，由其回推 full-hydration
  ipcMain.on(TASKBAR_IPC_CHANNELS.REQUEST_DATA, () => {
    const mainWin = mainWindow.getWin();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send(TASKBAR_IPC_CHANNELS.REQUEST_DATA);
    }
    applyTaskbarLyricLayout();
  });
};

export default initTaskbarIpc;
