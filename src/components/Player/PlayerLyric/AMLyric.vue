<template>
  <Transition name="fade" mode="out-in">
    <div
      :key="amLyricsData?.[0]?.words?.length"
      :class="[
        'lyric-am',
        {
          pure: statusStore.pureLyricMode,
          duet: hasDuet,
          'align-right': settingStore.lyricAlignRight,
        },
      ]"
      :style="{
        '--amll-lp-color': 'rgb(var(--main-cover-color, 239 239 239))',
        '--amll-lp-hover-bg-color': statusStore.playerMetaShow
          ? 'rgba(var(--main-cover-color), 0.08)'
          : 'transparent',
        '--amll-lyric-left-padding': settingStore.lyricAlignRight
          ? ''
          : `${settingStore.lyricHorizontalOffset}px`,
        '--amll-lyric-right-padding': settingStore.lyricAlignRight
          ? `${settingStore.lyricHorizontalOffset}px`
          : '',
      }"
    >
      <div v-if="statusStore.lyricLoading" class="lyric-loading">Chargement des paroles...</div>
      <LyricPlayer
        v-else
        ref="lyricPlayerRef"
        :lyricLines="amLyricsData"
        :currentTime="currentTime"
        :playing="statusStore.playStatus"
        :enableSpring="settingStore.useAMSpring"
        :enableScale="settingStore.useAMSpring"
        :alignPosition="settingStore.lyricsScrollOffset"
        :alignAnchor="settingStore.lyricsScrollOffset > 0.4 ? 'center' : 'top'"
        :enableBlur="settingStore.lyricsBlur"
        :hidePassedLines="settingStore.hidePassedLines"
        :wordFadeWidth="settingStore.wordFadeWidth"
        :style="{
          '--display-count-down-show': settingStore.countDownShow ? 'flex' : 'none',
          '--amll-lp-font-size': getFontSize(
            settingStore.lyricFontSize,
            settingStore.lyricFontSizeMode,
          ),
          'font-weight': settingStore.lyricFontWeight,
          'font-family': settingStore.LyricFont !== 'follow' ? settingStore.LyricFont : '',
          ...lyricLangFontStyle(settingStore),
        }"
        class="am-lyric"
        @line-click="jumpSeek"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import {
  LyricLineMouseEvent,
  LyricPlayer as CoreLyricPlayer,
  type LyricLine,
} from "@applemusic-like-lyrics/core";
import { type LyricPlayerRef } from "@/components/AMLL/LyricPlayer.vue";
import { useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { getLyricLanguage } from "@/utils/format";
import { usePlayerController } from "@/core/player/PlayerController";
import { cloneDeep } from "lodash-es";
import { lyricLangFontStyle } from "@/utils/lyric/lyricFontConfig";
import { getFontSize } from "@/utils/style";

defineProps({
  currentTime: {
    type: Number,
    default: 0,
  },
});

const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();
const player = usePlayerController();

const lyricPlayerRef = ref<LyricPlayerRef | null>(null);

// 当前歌词
const amLyricsData = computed(() => {
  const { songLyric } = musicStore;
  if (!songLyric) return [];
  // 优先使用逐字歌词(YRC/TTML)
  const useYrc = songLyric.yrcData?.length && settingStore.showWordLyrics;
  const lyrics = useYrc ? songLyric.yrcData : songLyric.lrcData;
  // 简单检查歌词有效性
  if (!Array.isArray(lyrics) || lyrics.length === 0) return [];
  // 此处cloneDeep 删除会暴毙 不要动
  const clonedLyrics = cloneDeep(lyrics) as LyricLine[];
  // 处理歌词内容
  const { showTran, showRoma, showWordsRoma, swapTranRoma, lyricAlignRight } = settingStore;
  clonedLyrics.forEach((line) => {
    // 处理显隐
    if (!showTran) line.translatedLyric = "";
    if (!showRoma) line.romanLyric = "";
    if (!showWordsRoma) line.words?.forEach((word) => delete word.romanWord);
    // 调换翻译与音译位置
    if (swapTranRoma) {
      const temp = line.translatedLyric;
      line.translatedLyric = line.romanLyric;
      line.romanLyric = temp;
    }
    // 处理对唱方向反转
    if (lyricAlignRight) {
      line.isDuet = !line.isDuet;
    }
  });
  return clonedLyrics;
});

// 是否有对唱行
const hasDuet = computed(() => amLyricsData.value?.some((line) => line.isDuet) ?? false);

// 进度跳转
const jumpSeek = (line: LyricLineMouseEvent) => {
  const lineContent = line.line.getLine();
  const lyricTargetTime = lineContent?.startTime;
  if (
    typeof lyricTargetTime !== "number" ||
    !Number.isFinite(lyricTargetTime) ||
    lyricTargetTime < 0
  ) {
    return;
  }
  // 让 LyricPlayer 跳转到目标时间，第二个参数 isSeek = true 会重置滚动状态
  lyricPlayerRef.value?.setCurrentTime(lyricTargetTime, true);
  // 获取偏移时间，计算歌曲真实的目标时间，并跳转
  const offsetMs = statusStore.getSongOffset(musicStore.playSong?.id);
  const musicTargetTime = lyricTargetTime - offsetMs;
  player.setSeek(musicTargetTime);
  player.play();
};

// 处理歌词语言
const processLyricLanguage = (player = lyricPlayerRef.value) => {
  const lyricGroups = (player?.lyricPlayer as CoreLyricPlayer | undefined)?.currentLyricGroups;
  if (!Array.isArray(lyricGroups) || lyricGroups.length === 0) {
    return;
  }

  // 遍历主歌词行
  for (const group of lyricGroups) {
    const lyricLine = group.mainLine?.getLine();
    const lyricLineElement = group.mainLine?.getElement();
    if (!lyricLine || !lyricLineElement) continue;

    // 获取歌词行内容 (合并逐字歌词为一句)
    const content = lyricLine.words.map((word) => word.word).join("");
    // 跳过空行
    if (!content) continue;
    // 获取歌词语言
    const lang = getLyricLanguage(content);

    // 为主歌词设置 lang 属性 (firstChild 获取主歌词 不为翻译和音译设置属性)
    const lyricMainLineElement = lyricLineElement.firstChild;
    if (lyricMainLineElement instanceof HTMLElement) {
      lyricMainLineElement.setAttribute("lang", lang);
    } else {
      console.warn("无法获取歌词行元素的主歌词部分，无法设置 lang 属性", lyricLineElement);
    }
  }
};

// 切换歌曲时处理歌词语言
watch(amLyricsData, (data) => {
  if (data) nextTick(() => processLyricLanguage());
});
watch(lyricPlayerRef, (player) => {
  if (player) nextTick(() => processLyricLanguage(player));
});
</script>

<style lang="scss" scoped>
.lyric-am {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  isolation: isolate;

  :deep(.am-lyric) {
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    padding-left: var(--amll-lyric-left-padding, 10px);
    padding-right: 80px;
    div {
      div[class^="_interludeDots"] {
        display: var(--display-count-down-show);
      }
    }
    @media (max-width: 990px) {
      padding: 0;
      margin-left: 0;
      .amll-lyric-player {
        > div {
          padding-left: 20px;
          padding-right: 20px;
        }
      }
    }
  }

  &.align-right {
    :deep(.am-lyric) {
      padding-left: 80px;
      padding-right: var(--amll-lyric-right-padding, 10px);

      @media (max-width: 990px) {
        padding: 0;
        margin-right: -20px;
      }
      @media (max-width: 500px) {
        margin-right: 0;
      }
    }
  }
  &.pure {
    &:not(.duet) {
      text-align: center;

      :deep(.am-lyric) div {
        transform-origin: center;
      }
    }

    :deep(.am-lyric) {
      margin: 0;
      padding: 0 80px;
    }
  }

  :deep(.am-lyric div[class*="lyricMainLine"] span) {
    text-align: start;
  }

  :lang(ja) {
    font-family: var(--ja-font-family);
  }
  :lang(en) {
    font-family: var(--en-font-family);
  }
  :lang(ko) {
    font-family: var(--ko-font-family);
  }
}

.lyric-loading {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--amll-lp-color, #efefef);
  font-size: 22px;
}
</style>
