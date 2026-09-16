import type { LyricLine } from "@applemusic-like-lyrics/lyric";

export type Milliseconds = number;

/** 任务栏展示模式 */
export type TaskbarDisplayMode = "lyric" | "widget";

/** 频谱数据（下采样后的 0-255 柱状值） */
export type SpectrumPayload = number[];

/** 频谱柱数（部件模式 12 柱，对齐 YouTube 参考） */
export const TASKBAR_SPECTRUM_BARS = 12;

/** 任务栏歌词位置 */
export type TaskbarLyricPosition = "auto" | "left" | "right";

/** 任务栏歌词配色模式 */
export type TaskbarLyricColorMode = "taskbar" | "light" | "dark";

/** 任务栏歌词设置 */
export interface TaskbarLyricSettings {
  /** 显示位置（auto 跟随任务栏对齐方式） */
  position: TaskbarLyricPosition;
  /** 宽度自动——开启时占满可用空间，关闭时按 maxWidth 限制 */
  autoMaxWidth: boolean;
  /** 最大宽度（逻辑像素，仅在 autoMaxWidth 关闭时生效） */
  maxWidth: number;
  /** 配色模式（taskbar 跟随系统任务栏明暗） */
  colorMode: TaskbarLyricColorMode;
  /** 双行显示（主行 + 翻译/下一行） */
  doubleLine: boolean;
  /** 显示翻译（双行时优先翻译） */
  showTranslation: boolean;
  /** 显示封面 */
  showCover: boolean;
  /** 逐字歌词 */
  wordByWord: boolean;
  /** 字体大小（逻辑像素） */
  fontSize: number;
  /** 字体（空字符串使用系统默认） */
  fontFamily: string;
  /** 展示模式（lyric 歌词 / widget 紧凑部件） */
  displayMode: TaskbarDisplayMode;
  /** 是否显示频谱 */
  showVisualizer: boolean;
}

export interface TrackData {
  title: string;
  artist: string;
  cover: string;
}

export interface PlaybackState {
  isPlaying: boolean;
}

export interface LyricData {
  lines: LyricLine[];
  type: "line" | "word";
}

export interface ThemeColorData {
  light: string;
  dark: string;
}

/**
 * 格式: [currentTime, duration, offset]
 */
export type SyncTickPayload = [Milliseconds, Milliseconds, Milliseconds];

export type SyncStatePayload =
  | {
      type: "full-hydration";
      data: {
        track: TrackData;
        playback: PlaybackState & { tick: SyncTickPayload };
        lyrics: LyricData;
        config: TaskbarLyricSettings;
        lyricLoading: boolean;
        themeColor: ThemeColorData | null;
        /** 界面语言（任务栏窗口存储分区隔离，需主窗口下发） */
        language: string;
      };
    }
  | {
      type: "track-change";
      data: TrackData;
    }
  | {
      type: "playback-state";
      data: PlaybackState;
    }
  | {
      type: "lyrics-loaded";
      data: LyricData;
    }
  | {
      type: "config-update";
      data: Partial<TaskbarLyricSettings>;
    }
  | {
      type: "theme-color";
      data: ThemeColorData | null;
    }
  | {
      type: "system-theme";
      data: { isDark: boolean };
    };

/** 任务栏布局信息（主进程 -> 渲染进程） */
export interface TaskbarLayoutPayload {
  isCentered: boolean;
  systemType: string;
  isLight: boolean;
  anchor: "left" | "right";
}

/** 默认任务栏歌词设置 */
export const DEFAULT_TASKBAR_LYRIC_SETTINGS: TaskbarLyricSettings = {
  position: "left",
  autoMaxWidth: true,
  maxWidth: 400,
  colorMode: "taskbar",
  doubleLine: true,
  showTranslation: false,
  showCover: true,
  wordByWord: true,
  fontSize: 14,
  fontFamily: "",
  displayMode: "widget",
  showVisualizer: true,
};

export const TASKBAR_IPC_CHANNELS = {
  /**
   * 主进程 handle，获取完整配置
   */
  GET_OPTION: "taskbar:get-option",
  /**
   * 渲染进程 -> 主进程，设置配置（增量合并）
   */
  SET_OPTION: "taskbar:set-option",
  /**
   * 渲染进程 -> 主进程，设置任务栏歌词窗口显隐
   */
  SET_VISIBLE: "taskbar:set-visible",
  /**
   * 主进程 -> 渲染进程 (状态)
   */
  SYNC_STATE: "taskbar:sync-state",
  /**
   * 主进程 -> 渲染进程 (进度)
   */
  SYNC_TICK: "taskbar:sync-tick",
  /**
   * 渲染进程 -> 主进程 (初始化握手)
   */
  REQUEST_DATA: "taskbar:request-data",
  /**
   * 主进程 -> 任务栏窗口 (任务栏布局/锚定/主题)
   */
  LAYOUT: "taskbarLyric:layout",
  /**
   * 主进程 -> 任务栏窗口 (配置变更)
   */
  CONFIG_CHANGE: "taskbarLyric:configChange",
  /**
   * 主窗口 -> 主进程 -> 任务栏窗口 (频谱)
   */
  SYNC_SPECTRUM: "taskbar:sync-spectrum",
} as const;
