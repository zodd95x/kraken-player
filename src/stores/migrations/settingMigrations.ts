import { keywords, regexes } from "@/assets/data/exclude";
import { SongUnlockServer } from "@/core/player/SongManager";
import { defaultAMLLDbServer } from "@/utils/meta";
import type { SettingState } from "../setting";

/**
 * 当前设置 Schema 版本号
 */
export const CURRENT_SETTING_SCHEMA_VERSION = 19;

/**
 * 迁移函数类型
 * 迁移函数只需返回需要更新的字段，系统会自动合并到原有状态
 */
export type MigrationFunction = (state: Partial<SettingState>) => Partial<SettingState>;

/**
 * 迁移脚本映射表
 * key: 目标版本号
 * value: 从上一版本迁移到该版本的函数
 */
export const settingMigrations: Record<number, MigrationFunction> = {
  3: () => {
    return {
      // ttml 同步
      enableTTMLLyric: false,
      amllDbServer: defaultAMLLDbServer,
    };
  },
  4: () => {
    return {
      songUnlockServer: [
        { key: SongUnlockServer.BODIAN, enabled: true },
        { key: SongUnlockServer.NETEASE, enabled: true },
        { key: SongUnlockServer.KUWO, enabled: true },
      ],
    };
  },
  5: (state) => {
    // 迁移排除歌词关键字和正则表达式到用户自定义字段
    // 如果旧字段存在且不为空，则迁移到新字段
    // 定义旧版本的设置状态类型（包含已废弃的字段）
    interface OldSettingState extends Partial<SettingState> {
      excludeKeywords?: string[];
      excludeRegexes?: string[];
    }

    const oldState = state as OldSettingState;
    const oldKeywords = oldState.excludeKeywords;
    const oldRegexes = oldState.excludeRegexes;

    // 如果旧字段包含默认值，则只保留用户自定义的部分
    const userKeywords: string[] = [];
    const userRegexes: string[] = [];

    if (oldKeywords && Array.isArray(oldKeywords)) {
      // 过滤掉默认关键字，只保留用户自定义的
      oldKeywords.forEach((keyword) => {
        if (!keywords.includes(keyword)) {
          userKeywords.push(keyword);
        }
      });
    }

    if (oldRegexes && Array.isArray(oldRegexes)) {
      // 过滤掉默认正则，只保留用户自定义的
      oldRegexes.forEach((regex) => {
        if (!regexes.includes(regex)) {
          userRegexes.push(regex);
        }
      });
    }

    return {
      // 这些字段在 Schema Version 8 时被重命名，导致类型检查报错
      excludeUserKeywords: userKeywords,
      excludeUserRegexes: userRegexes,
    } as Partial<SettingState>;
  },
  6: (state) => {
    interface OldSettingState extends Partial<SettingState> {
      enableTTMLLyric?: boolean;

      hideDiscover?: boolean;
      hidePersonalFM?: boolean;
      hideRadioHot?: boolean;
      hideLike?: boolean;
      hideCloud?: boolean;
      hideDownload?: boolean;
      hideLocal?: boolean;
      hideHistory?: boolean;
      hideUserPlaylists?: boolean;
      hideLikedPlaylists?: boolean;
      hideHeartbeatMode?: boolean;
    }
    const oldState = state as OldSettingState;

    return {
      enableOnlineTTMLLyric: oldState.enableTTMLLyric,

      sidebarHide: {
        hideDiscover: oldState.hideDiscover || false,
        hidePersonalFM: oldState.hidePersonalFM || false,
        hideRadioHot: oldState.hideRadioHot || false,
        hideLike: oldState.hideLike || false,
        hideCloud: oldState.hideCloud || false,
        hideDownload: oldState.hideDownload || false,
        hideLocal: oldState.hideLocal || false,
        hideHistory: oldState.hideHistory || false,
        hideUserPlaylists: oldState.hideUserPlaylists || false,
        hideLikedPlaylists: oldState.hideLikedPlaylists || false,
        hideHeartbeatMode: oldState.hideHeartbeatMode || false,
      },
    };
  },
  8: (state) => {
    interface OldSettingState extends Partial<SettingState> {
      enableExcludeTTML?: boolean;
      enableExcludeLocalLyrics?: boolean;
      excludeUserKeywords?: string[];
      excludeUserRegexes?: string[];
    }

    const oldState = state as OldSettingState;

    return {
      enableExcludeLyricsTTML: oldState.enableExcludeTTML,
      enableExcludeLyricsLocal: oldState.enableExcludeLocalLyrics,
      excludeLyricsUserKeywords: oldState.excludeUserKeywords,
      excludeLyricsUserRegexes: oldState.excludeUserRegexes,
    };
  },
  9: (state) => {
    interface OldSettingState extends Partial<SettingState> {
      preferQQMusicLyric?: boolean;
    }
    const oldState = state as OldSettingState;
    const preferQM = oldState.preferQQMusicLyric ?? false;

    return {
      enableQQMusicLyric: preferQM,
      lyricPriority: preferQM ? "qm" : "auto",
    };
  },
  10: (state) => {
    interface OldSettingState extends Partial<SettingState> {
      clearSearchOnBlur?: boolean;
    }
    const oldState = state as OldSettingState;
    return oldState.clearSearchOnBlur === true ? { searchInputBehavior: "clear" } : {};
  },
  11: () => {
    return {
      uncensorMaskedProfanity: false,
    };
  },
  12: (state) => {
    // 移除已废弃的 gequbao 解锁源，清理老用户持久化设置中残留的条目
    const servers = state.songUnlockServer;
    if (!Array.isArray(servers)) return {};
    return {
      songUnlockServer: servers.filter((s) => (s.key as string) !== "gequbao"),
    };
  },
  13: (state) => {
    // 默认音质与下载音质统一为 320k，默认关闭中文歌词翻译
    const updates: Partial<SettingState> = {};
    if (state.downloadSongLevel !== "h") {
      updates.downloadSongLevel = "h";
    }
    if (state.songLevel !== "exhigh") {
      updates.songLevel = "exhigh";
    }
    if (state.showTran !== false) {
      updates.showTran = false;
    }
    return updates;
  },
  14: (state) => {
    // 默认禁用 Web Stream 流媒体服务
    const updates: Partial<SettingState> = {};
    if (state.streamingEnabled !== false) {
      updates.streamingEnabled = false;
    }
    return updates;
  },
  15: (state) => {
    // 移除首页视频 (MV) 板块
    const updates: Partial<SettingState> = {};
    if (Array.isArray(state.homePageSections)) {
      updates.homePageSections = state.homePageSections.filter((s) => s.key !== "video");
    }
    return updates;
  },
  16: (state) => {
    // 恢复创作者原始设计的次色变体（柔和非激进），避免激进过饱和配色
    const updates: Partial<SettingState> = {};
    if (state.themeVariant === "primary") {
      updates.themeVariant = "secondary";
    }
    return updates;
  },
  17: (state) => {
    // 默认正计时（已播放 / 总时长）
    const updates: Partial<SettingState> = {};
    if (state.timeFormat !== "current-total") {
      updates.timeFormat = "current-total";
    }
    return updates;
  },
  18: () => ({}),
  19: () => {
    // 清除旧的更新开关
    return { checkUpdateOnStart: undefined } as Partial<SettingState>;
  },
};
