import { DEFAULT_TASKBAR_LYRIC_SETTINGS, type TaskbarLyricSettings } from "@shared";
import { app, screen } from "electron";
import Store from "electron-store";
import { join } from "path";
import defaultLyricConfig from "../../../src/assets/data/lyricConfig";
import type { LyricConfig } from "../../../src/types/desktop-lyric";
import { storeLog } from "../logger";
import { defaultAMLLDbServer } from "../utils/config";

storeLog.info("🌱 Store init");

export interface StoreType {
  /** 窗口 */
  window: {
    /** 窗口宽度 */
    width: number;
    /** 窗口高度 */
    height: number;
    /** 窗口位置 x */
    x?: number;
    /** 窗口位置 y */
    y?: number;
    /** 是否最大化 */
    maximized?: boolean;
    /** 是否启用无边框窗口 */
    useBorderless?: boolean;
    /** 缩放系数 (0.5 - 2.0) */
    zoomFactor?: number;
  };
  /** 歌词 */
  lyric: {
    /** 窗口位置 x */
    x?: number;
    /** 窗口位置 y */
    y?: number;
    /** 窗口宽度 */
    width?: number;
    /** 窗口高度 */
    height?: number;
    /** 配置 */
    config?: LyricConfig;
  };
  /** 任务栏歌词设置 */
  taskbarLyric: TaskbarLyricSettings;
  /** 窗口状态（用于启动时恢复） */
  windowStates: {
    taskbarLyric: {
      visible: boolean;
    };
  };
  /** 代理 */
  proxy: string;
  /** amll-db-server */
  amllDbServer: string;
  /** 缓存地址 */
  cachePath: string;
  /** 缓存大小限制 (GB) */
  cacheLimit: number;
  /** websocket */
  websocket: {
    /** 是否启用 */
    enabled: boolean;
    /** 端口 */
    port: number;
  };
  /** mcp */
  mcp: {
    /** 是否启用 */
    enabled: boolean;
    /** 端口 */
    port: number;
    /** 访问密钥 */
    accessKey?: string;
  };
  /** 下载线程数 */
  downloadThreadCount?: number;
  /** 启用HTTP2下载 */
  enableDownloadHttp2?: boolean;
  /** macOS 专属设置 */
  macos: {
    /** 状态栏歌词 */
    statusBarLyric: {
      /** 是否启用 */
      enabled: boolean;
    };
  };
}

/**
 * 使用 Store
 * @returns Store<StoreType>
 */
export const useStore = () => {
  // 获取主屏幕
  const screenData = screen.getPrimaryDisplay();
  return new Store<StoreType>({
    defaults: {
      window: {
        width: 1280,
        height: 800,
        useBorderless: true,
      },
      lyric: {
        x: screenData.workAreaSize.width / 2 - 400,
        y: screenData.workAreaSize.height - 90,
        width: 800,
        height: 136,
        config: defaultLyricConfig,
      },
      taskbarLyric: { ...DEFAULT_TASKBAR_LYRIC_SETTINGS },
      windowStates: {
        taskbarLyric: { visible: true },
      },
      macos: {
        statusBarLyric: {
          enabled: false,
        },
      },
      proxy: "",
      amllDbServer: defaultAMLLDbServer,
      cachePath: join(app.getPath("userData"), "DataCache"),
      cacheLimit: 10, // 默认 10GB
      // websocket
      websocket: {
        enabled: false,
        port: 25885,
      },
      // mcp
      mcp: {
        enabled: false,
        port: 14559,
        accessKey: "",
      },
      downloadThreadCount: 8,
      enableDownloadHttp2: true,
    },
  });
};
