<script setup lang="ts">
import type { LyricLine } from "@applemusic-like-lyrics/lyric";
import {
  DEFAULT_TASKBAR_LYRIC_SETTINGS,
  TASKBAR_IPC_CHANNELS,
  type TaskbarLayoutPayload,
  type TaskbarLyricSettings,
} from "@shared";
import SvgIcon from "@/components/Global/SvgIcon.vue";
import TaskbarLyricLine from "./components/TaskbarLyricLine.vue";
import TaskbarVisualizer from "./components/TaskbarVisualizer.vue";
import { pickPrimaryIndex } from "@windows/shared/utils/lyricSync";
import { useNowPlayingSync } from "@windows/shared/composables/useNowPlayingSync";

const config = reactive<TaskbarLyricSettings>({ ...DEFAULT_TASKBAR_LYRIC_SETTINGS });

const anchor = ref<"left" | "right">("left");
const taskbarIsLight = ref(false);
const isHovered = ref(false);

const { track, lyric, primaryIndex, playing, themeColor, language } = useNowPlayingSync({
  pickIndex: pickPrimaryIndex,
  logTag: "taskbar-lyric",
});

const currentLine = computed<LyricLine | null>(() => {
  const idx = primaryIndex.value;
  if (idx < 0) return null;
  return lyric.value[idx] ?? null;
});

const hasLyric = computed(() => lyric.value.length > 0 && primaryIndex.value >= 0);

// 无 Pinia 的隔离窗口：已知中文占位元数据直译表（与 trSetting 对齐）
const META_PLACEHOLDERS: Record<string, { fr: string; en: string }> = {
  未知艺术家: { fr: "Artiste inconnu", en: "Unknown Artist" },
  未知歌手: { fr: "Artiste inconnu", en: "Unknown Artist" },
  未知歌曲: { fr: "Titre inconnu", en: "Unknown Track" },
  未知专辑: { fr: "Album inconnu", en: "Unknown Album" },
  未知播客: { fr: "Podcast inconnu", en: "Unknown Podcast" },
  未播放歌曲: { fr: "Aucun titre en cours", en: "No song playing" },
};

// 翻译原始元数据中的中文占位符，空值走语言兜底
const trMeta = (text: string, emptyFallback: string): string => {
  const trimmed = text.trim();
  if (!trimmed) return emptyFallback;
  const hit = META_PLACEHOLDERS[trimmed];
  if (hit) return language.value === "fr" ? hit.fr : language.value === "zh" ? trimmed : hit.en;
  return text;
};

// 空歌手兜底（与 trSetting 对齐）
const emptyArtist = (): string => {
  if (language.value === "fr") return "Artiste inconnu";
  if (language.value === "zh") return "未知艺术家";
  return "Unknown Artist";
};

const titleText = computed<string>(() => trMeta(track.value?.title ?? "", "Kraken Player"));
const artistsText = computed<string>(() => trMeta(track.value?.artist ?? "", emptyArtist()));
const coverSrc = computed<string>(() => track.value?.cover || "");
// 默认封面（相对路径：dev 与 file:// 产物下均可解析，动态绑定避免构建期处理）
const defaultCover = "../../images/song.jpg";

// 封面加载失败时回退到默认音符图标
const coverOk = ref(true);
watch(coverSrc, () => {
  coverOk.value = true;
});

const effectiveTheme = computed<"light" | "dark">(() => {
  if (config.colorMode === "light") return "light";
  if (config.colorMode === "dark") return "dark";
  return taskbarIsLight.value ? "light" : "dark";
});

// 频谱颜色：自适应封面开启时使用封面，否则保持白色
const barColor = computed<string | null>(() => {
  const c = themeColor.value;
  if (!c) return "#ffffff";
  return effectiveTheme.value === "light" ? c.light : c.dark;
});

// 紧凑部件模式（无按钮，封面 + 标题 + 频谱）
const isWidget = computed(() => (config.displayMode ?? "lyric") === "widget");

interface RenderItem {
  key: string;
  role: "primary" | "secondary";
  text: string;
  line?: LyricLine;
}

const items = computed<RenderItem[]>(() => {
  if (hasLyric.value) {
    const idx = primaryIndex.value;
    const line = currentLine.value!;
    const list: RenderItem[] = [
      {
        key: `line-${idx}`,
        role: "primary",
        text: line.words.map((w) => w.word).join(""),
        line,
      },
    ];
    if (config.doubleLine) {
      const trans = config.showTranslation ? line.translatedLyric : "";
      if (trans) {
        list.push({ key: `trans-${idx}`, role: "secondary", text: trans });
      } else {
        const next = lyric.value[idx + 1];
        if (next) {
          list.push({
            key: `line-${idx + 1}`,
            role: "secondary",
            text: next.words.map((w) => w.word).join(""),
            line: next,
          });
        }
      }
    }
    return list;
  }
  /* 无歌词：歌曲信息填在主/副行 */
  const list: RenderItem[] = [{ key: "meta-title", role: "primary", text: titleText.value }];
  if (config.doubleLine) {
    list.push({ key: "meta-artist", role: "secondary", text: artistsText.value });
  }
  return list;
});

const rootStyle = computed(() => ({
  "--tbl-font-size": `${config.fontSize}px`,
  fontFamily: config.fontFamily || undefined,
}));

const dispatch = (action: "playPrev" | "playOrPause" | "playNext"): void => {
  window.electron?.ipcRenderer.send("send-to-main-win", action);
};
const handlePrev = (): void => dispatch("playPrev");
const handleNext = (): void => dispatch("playNext");
const handleTogglePlay = (): void => dispatch("playOrPause");
const handleFocusMain = (): void => {
  window.electron?.ipcRenderer.send("win-show-main");
};

const onLayout = (_event: unknown, data: TaskbarLayoutPayload): void => {
  anchor.value = data.anchor;
  taskbarIsLight.value = data.isLight;
};
const onConfigChange = (_event: unknown, next: TaskbarLyricSettings): void => {
  Object.assign(config, next);
};

onMounted(async () => {
  const ipc = window.electron?.ipcRenderer;
  if (!ipc) return;
  try {
    const saved = (await ipc.invoke(
      TASKBAR_IPC_CHANNELS.GET_OPTION,
    )) as TaskbarLyricSettings | null;
    if (saved) Object.assign(config, saved);
  } catch (error) {
    console.error("[taskbar-lyric] load config failed", error);
  }

  ipc.on(TASKBAR_IPC_CHANNELS.LAYOUT, onLayout);
  ipc.on(TASKBAR_IPC_CHANNELS.CONFIG_CHANGE, onConfigChange);
});

onBeforeUnmount(() => {
  const ipc = window.electron?.ipcRenderer;
  ipc?.removeListener(TASKBAR_IPC_CHANNELS.LAYOUT, onLayout);
  ipc?.removeListener(TASKBAR_IPC_CHANNELS.CONFIG_CHANGE, onConfigChange);
});
</script>

<template>
  <div class="wrapper" :data-align="anchor">
    <div
      class="container"
      :class="{ 'is-hovered': isHovered, 'is-widget': isWidget }"
      :data-theme="effectiveTheme"
      :data-align="anchor"
      :style="rootStyle"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
      @dblclick="handleFocusMain"
    >
      <!-- 紧凑部件：封面 + 标题 + 频谱，悬停封面显示播放/暂停 -->
      <template v-if="isWidget">
        <button
          v-if="config.showCover"
          class="cover-wrapper cover-btn"
          type="button"
          @click.stop="handleTogglePlay"
          @dblclick.stop
        >
          <img
            v-if="coverSrc && coverOk"
            class="cover"
            :src="coverSrc"
            alt=""
            draggable="false"
            @error="coverOk = false"
          />
          <img v-else class="cover" :src="defaultCover" alt="" draggable="false" />
          <span class="cover-overlay">
            <SvgIcon :name="playing ? 'Pause' : 'Play'" :size="16" />
          </span>
        </button>
        <div class="widget-meta">
          <div class="song-title">{{ titleText }}</div>
          <div class="song-artist">{{ artistsText }}</div>
        </div>
        <TaskbarVisualizer
          v-if="config.showVisualizer ?? true"
          :playing="playing"
          :theme="effectiveTheme"
          :color="barColor"
        />
      </template>
      <template v-else>
        <div v-if="config.showCover" class="cover-wrapper">
          <img
            v-if="coverSrc && coverOk"
            class="cover"
            :src="coverSrc"
            alt=""
            draggable="false"
            @error="coverOk = false"
          />
          <img v-else class="cover" :src="defaultCover" alt="" draggable="false" />
        </div>

        <!-- 播放控件 -->
        <div class="controls-wrapper">
          <div class="controls-inner">
            <button class="control-btn" type="button" @click.stop="handlePrev" @dblclick.stop>
              <SvgIcon name="SkipPrev" :size="18" />
            </button>
            <button class="control-btn" type="button" @click.stop="handleTogglePlay" @dblclick.stop>
              <SvgIcon :name="playing ? 'Pause' : 'Play'" :size="16" />
            </button>
            <button class="control-btn" type="button" @click.stop="handleNext" @dblclick.stop>
              <SvgIcon name="SkipNext" :size="18" />
            </button>
          </div>
        </div>

        <!-- 文本区 -->
        <div class="lyric-area">
          <!-- 歌词层 -->
          <TransitionGroup tag="div" name="line" class="lyric-column">
            <div v-for="item in items" :key="item.key" class="lyric-line" :data-role="item.role">
              <TaskbarLyricLine
                :line="item.line"
                :text="item.text"
                :word-by-word="config.wordByWord && !!item.line"
                :anchor="anchor"
              />
            </div>
          </TransitionGroup>
          <!-- 歌曲信息（hover 时显示） -->
          <div class="song-info">
            <div class="song-title">{{ titleText }}</div>
            <div v-if="config.doubleLine" class="song-artist">
              {{ artistsText }}
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
.wrapper {
  width: 100vw;
  height: 100vh;
  padding: 4px 6px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  pointer-events: none;
}
.wrapper[data-align="right"] {
  justify-content: flex-end;
}
.container {
  /* 深色主题 */
  --tbl-text-primary: #ffffff;
  --tbl-text-secondary: rgba(255, 255, 255, 0.5);
  --tbl-hover-bg: rgba(255, 255, 255, 0.12);
  --tbl-played: var(--tbl-text-primary);
  --tbl-unplayed: var(--tbl-text-secondary);
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  border-radius: 8px;
  background: transparent;
  overflow: hidden;
  pointer-events: auto;
  color: var(--tbl-text-primary);
  transition: background 0.3s;
}
.container[data-align="right"] {
  flex-direction: row-reverse;
}
.container[data-theme="light"] {
  --tbl-text-primary: #1a1a1a;
  --tbl-text-secondary: rgba(0, 0, 0, 0.62);
  --tbl-hover-bg: rgba(0, 0, 0, 0.08);
}
.container:hover {
  background: var(--tbl-hover-bg);
}
/* 封面 */
.cover-wrapper {
  flex: 0 0 auto;
  height: 100%;
  aspect-ratio: 1 / 1;
  padding: 4px;
  overflow: hidden;
}
.cover {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  object-fit: cover;
  user-select: none;
  pointer-events: none;
  display: block;
}
.controls-wrapper {
  flex: 0 0 auto;
  align-self: stretch;
  display: flex;
  max-width: 0;
  overflow: hidden;
  pointer-events: none;
  transition: max-width 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}
.controls-inner {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  opacity: 0;
  transition: opacity 0.25s ease;
}
.container.is-hovered .controls-wrapper {
  max-width: calc(3 * (100vh - 16px) + 16px);
  pointer-events: auto;
}
.container.is-hovered .controls-inner {
  opacity: 1;
  transition-delay: 0.1s;
}
.control-btn {
  flex: 0 0 auto;
  height: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--tbl-text-primary) 24%, transparent);
  color: var(--tbl-text-primary);
  cursor: pointer;
  transition:
    background 0.3s,
    transform 0.3s;
}
.control-btn:hover {
  background: color-mix(in srgb, var(--tbl-text-primary) 16%, transparent);
}
.control-btn:active {
  transform: scale(0.9);
}

.lyric-area {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0 4px;
  position: relative;
  height: 100%;
  overflow: hidden;
}

.lyric-column {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  opacity: 1;
  transition: opacity 0.18s ease;
}
.container[data-align="right"] .lyric-column {
  align-items: flex-end;
}
.container.is-hovered .lyric-column {
  opacity: 0;
  pointer-events: none;
}

.lyric-line {
  width: 100%;
  transform-origin: left center;
  transition:
    font-size 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.3s ease;
  will-change: transform, opacity;
}
.container[data-align="right"] .lyric-line {
  transform-origin: right center;
}
.lyric-line[data-role="primary"] {
  font-size: var(--tbl-font-size);
  color: var(--tbl-text-primary);
}
.lyric-line[data-role="secondary"] {
  font-size: calc(var(--tbl-font-size) * 0.82);
  color: var(--tbl-text-secondary);
}

.line-move,
.line-enter-active,
.line-leave-active {
  transition:
    transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    font-size 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.3s ease;
}
.line-leave-active {
  position: absolute;
  left: 0;
  right: 0;
}
.line-enter-from {
  opacity: 0;
  transform: translateY(100%);
}
.line-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

.song-info {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease;
}
.container[data-align="right"] .song-info {
  align-items: flex-end;
}
.container.is-hovered .song-info {
  opacity: 1;
  pointer-events: auto;
  transition-delay: 0.08s;
}
.song-title {
  font-size: var(--tbl-font-size);
  color: var(--tbl-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.song-artist {
  font-size: calc(var(--tbl-font-size) * 0.82);
  color: var(--tbl-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
/* 紧凑部件文本区 */
.widget-meta {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 150px;
  margin: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
}
/* 部件：透明无底，直接贴在任务栏上 */
.container.is-widget {
  width: auto;
  max-width: 336px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 3px 10px 3px 3px;
  gap: 8px;
}
.container.is-widget:hover {
  background: var(--tbl-hover-bg);
}
/* 封面按钮：重置原生样式 */
.cover-btn {
  position: relative;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.container.is-widget .cover-wrapper {
  padding: 0;
  height: 32px;
  width: 32px;
  flex: 0 0 32px;
  aspect-ratio: auto;
  border-radius: 6px;
}
.cover-btn:focus {
  outline: none;
}
.cover-btn:focus-visible {
  outline: 1px solid var(--tbl-text-secondary);
  outline-offset: -1px;
  border-radius: 8px;
}
/* 悬停遮罩：播放/暂停 */
.cover-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 6px;
  color: #fff;
  opacity: 0;
  transition: opacity 0.18s ease;
  pointer-events: none;
}
.cover-btn:hover .cover-overlay,
.cover-btn:focus-visible .cover-overlay {
  opacity: 1;
}
/* 频谱右置，贴底对齐 */
.container.is-widget .visualizer {
  margin-left: 2px;
  align-self: center;
}
</style>
