<template>
  <div class="history">
    <div class="title">
      <n-text class="keyword">{{ trSetting("播放历史") }}</n-text>
      <n-text class="size" depth="3"
        >{{ dataStore.historyList?.length || 0 }} {{ trSetting("首歌曲") }}</n-text
      >
    </div>
    <n-flex class="menu">
      <n-button
        :focusable="false"
        :disabled="!dataStore.historyList?.length"
        type="primary"
        strong
        secondary
        round
        v-debounce="() => player.updatePlayList(dataStore.historyList)"
      >
        <template #icon>
          <SvgIcon name="Play" />
        </template>
        {{ trSetting("播放全部") }}
      </n-button>
      <n-button
        :focusable="false"
        :disabled="!dataStore.historyList?.length"
        class="more"
        strong
        secondary
        round
        @click="cleanHistory"
      >
        <template #icon>
          <SvgIcon name="Delete" />
        </template>
        {{ trSetting("清空历史") }}
      </n-button>
    </n-flex>
    <Transition name="fade" mode="out-in">
      <SongList
        v-if="dataStore.historyList.length > 0"
        :data="dataStore.historyList"
        :loading="true"
        hiddenSize
      />
      <n-empty
        v-else
        :description="trSetting('暂无历史播放')"
        style="margin-top: 60px"
        size="large"
      >
        <template #icon>
          <SvgIcon name="SearchOff" />
        </template>
      </n-empty>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useDataStore } from "@/stores";
import { usePlayerController } from "@/core/player/PlayerController";
import { trSetting } from "@/utils/i18nSettings";

const player = usePlayerController();
const dataStore = useDataStore();

// 清空最近播放
const cleanHistory = () => {
  window.$dialog.warning({
    title: trSetting("清空历史"),
    content: trSetting("确定清空播放历史？该操作不可逆！"),
    positiveText: trSetting("清空"),
    negativeText: trSetting("取消"),
    onPositiveClick: async () => {
      await dataStore.clearHistory();
      window.$message.success(trSetting("播放历史已清空"));
    },
  });
};
</script>

<style lang="scss" scoped>
.history {
  display: flex;
  flex-direction: column;
  height: 100%;
  .title {
    display: flex;
    align-items: flex-end;
    line-height: normal;
    margin-top: 12px;
    margin-bottom: 20px;
    .keyword {
      font-size: 30px;
      font-weight: bold;
      margin-right: 8px;
      line-height: normal;
    }
    .size {
      font-size: 15px;
      font-weight: normal;
      line-height: 30px;
    }
  }
  .menu {
    width: 100%;
    margin-bottom: 12px;
    .n-button {
      height: 40px;
      transition: all 0.3s var(--n-bezier);
    }
  }
  .song-list {
    flex: 1;
    overflow: hidden;
  }
}
</style>
