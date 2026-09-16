import { onBeforeUnmount, onMounted, ref, shallowRef, type Ref, type ShallowRef } from "vue";
import type { LyricLine } from "@applemusic-like-lyrics/lyric";
import {
  TASKBAR_IPC_CHANNELS,
  type SyncStatePayload,
  type SyncTickPayload,
  type ThemeColorData,
  type TrackData,
} from "@shared";
import { clampLastLineEnd } from "@windows/shared/utils/lyricSync";

/** 同步偏差阈值（ms） */
const SYNC_DRIFT_THRESHOLD = 300;

/** 提供给逐字高亮的非响应式当前播放时间 */
let currentNowPlayingMs = 0;

export const getNowPlayingCurrentMs = (): number => currentNowPlayingMs;

export interface NowPlayingSyncOptions {
  /** 选择当前主行索引的算法 */
  pickIndex: (lyric: LyricLine[], time: number) => number;
  /** 日志 / 错误前缀 */
  logTag: string;
}

export interface NowPlayingSync {
  track: ShallowRef<TrackData | null>;
  lyric: ShallowRef<LyricLine[]>;
  playing: Ref<boolean>;
  primaryIndex: Ref<number>;
  themeColor: ShallowRef<ThemeColorData | null>;
  /** 界面语言（无 Pinia 的隔离窗口用，跟随主窗口下发） */
  language: Ref<string>;
}

/**
 * 播放状态同步
 *
 * 维护播放锚点 + RAF 高频插值，驱动 currentMs 与 primaryIndex。
 * 数据来源桥接到本项目现有的 taskbar:sync-state / taskbar:sync-tick 通道
 * （由主窗口经 PlayerIpc 推送，主进程 ipc-taskbar 转发）。
 *
 * 注意：本项目的 tick 不携带 sendTimestamp（跨进程时钟不可比），
 * 因此接收即以 Date.now() 为基准（ipcDelay≈0），仅靠 RAF + 漂移阈值平滑，speed 恒为 1。
 */
export const useNowPlayingSync = (options: NowPlayingSyncOptions): NowPlayingSync => {
  const { pickIndex, logTag } = options;

  const track = shallowRef<TrackData | null>(null);
  const lyric = shallowRef<LyricLine[]>([]);
  const playing = ref(false);
  const primaryIndex = ref(-1);
  // 封面主题色（部件频谱用）
  const themeColor = shallowRef<ThemeColorData | null>(null);
  // 界面语言（默认英文，主窗口下发后更新）
  const language = ref("en");

  let anchorPos = 0;
  let anchorPerf = 0;
  let anchorInitialized = false;
  let rafId: number | null = null;
  /** 当前曲目歌词偏移（ms，正值为歌词提前） */
  let lyricOffsetMs = 0;
  /** 已知曲目时长（用于末行 endTime 兜底） */
  let trackDurationMs: number | undefined;

  const resetAnchor = (positionMs: number, sendTimestamp: number): void => {
    const ipcDelay = Math.max(0, Date.now() - sendTimestamp);
    anchorPos = positionMs + (playing.value ? ipcDelay : 0);
    anchorPerf = performance.now();
    currentNowPlayingMs = anchorPos + lyricOffsetMs;
    anchorInitialized = true;
  };

  // 仅当与 RAF 插值的偏差超过阈值时才重置锚点，避免每次同步都打断动画
  const applyAnchor = (positionMs: number, sendTimestamp: number): void => {
    if (!anchorInitialized || !playing.value) {
      resetAnchor(positionMs, sendTimestamp);
      return;
    }
    const ipcDelay = Math.max(0, Date.now() - sendTimestamp);
    const candidate = positionMs + ipcDelay;
    const projected = anchorPos + (performance.now() - anchorPerf);
    if (Math.abs(candidate - projected) > SYNC_DRIFT_THRESHOLD) {
      resetAnchor(positionMs, sendTimestamp);
    }
  };

  const syncOnce = (): void => {
    const next = playing.value ? anchorPos + (performance.now() - anchorPerf) : anchorPos;
    currentNowPlayingMs = next + lyricOffsetMs;
    const idx = pickIndex(lyric.value, currentNowPlayingMs);
    if (idx !== primaryIndex.value) primaryIndex.value = idx;
  };

  const tick = (): void => {
    syncOnce();
    rafId = playing.value ? requestAnimationFrame(tick) : null;
  };

  const kickTick = (): void => {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(tick);
  };

  const setLyric = (lines: LyricLine[]): void => {
    const mainLines = lines.filter((line) => !line.isBG);
    lyric.value = clampLastLineEnd(mainLines, trackDurationMs);
    primaryIndex.value = -1;
  };

  const onSyncState = (_event: unknown, payload: SyncStatePayload): void => {
    switch (payload.type) {
      case "full-hydration": {
        const { track: t, playback, lyrics, themeColor: c, language: lang } = payload.data;
        track.value = t;
        if (typeof lang === "string" && lang) language.value = lang;
        trackDurationMs = playback.tick[1];
        lyricOffsetMs = playback.tick[2];
        setLyric(lyrics.lines);
        playing.value = playback.isPlaying;
        themeColor.value = c ?? null;
        resetAnchor(playback.tick[0], Date.now());
        kickTick();
        break;
      }
      case "track-change": {
        track.value = payload.data;
        break;
      }
      case "lyrics-loaded": {
        setLyric(payload.data.lines);
        kickTick();
        break;
      }
      case "playback-state": {
        playing.value = payload.data.isPlaying;
        if (playing.value) kickTick();
        else syncOnce();
        break;
      }
      case "theme-color": {
        themeColor.value = payload.data;
        break;
      }
      default:
        break;
    }
  };

  const onSyncTick = (_event: unknown, payload: SyncTickPayload): void => {
    trackDurationMs = payload[1];
    lyricOffsetMs = payload[2];
    applyAnchor(payload[0], Date.now());
    kickTick();
  };

  // 主窗口转发的语言变更（与 full-hydration 共用同一 language 状态）
  const onLanguageChange = (_event: unknown, lang: unknown): void => {
    if (typeof lang === "string" && lang) language.value = lang;
  };

  onMounted(() => {
    try {
      const ipc = window.electron?.ipcRenderer;
      if (!ipc) {
        console.error(`[${logTag}] ipcRenderer 不可用`);
        return;
      }
      ipc.on(TASKBAR_IPC_CHANNELS.SYNC_STATE, onSyncState);
      ipc.on(TASKBAR_IPC_CHANNELS.SYNC_TICK, onSyncTick);
      ipc.on("language-change", onLanguageChange);
      // 请求初始数据
      ipc.send(TASKBAR_IPC_CHANNELS.REQUEST_DATA);
    } catch (error) {
      console.error(`[${logTag}] 初始化同步失败`, error);
    }
  });

  onBeforeUnmount(() => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    const ipc = window.electron?.ipcRenderer;
    ipc?.removeListener(TASKBAR_IPC_CHANNELS.SYNC_STATE, onSyncState);
    ipc?.removeListener(TASKBAR_IPC_CHANNELS.SYNC_TICK, onSyncTick);
    ipc?.removeListener("language-change", onLanguageChange);
  });

  return { track, lyric, playing, primaryIndex, themeColor, language };
};
