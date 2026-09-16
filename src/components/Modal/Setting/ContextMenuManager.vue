<template>
  <div class="context-menu-manager">
    <div class="list">
      <n-card
        v-for="item in items"
        :key="item.key"
        :content-style="{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
        }"
        class="item"
      >
        <n-text class="name">{{ item.label }}</n-text>
        <n-switch
          :value="settingStore.contextMenuOptions[item.key]"
          :round="false"
          @update:value="(val) => updateSetting(item.key, val)"
        />
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import type { SettingState } from "@/stores/setting";
import { trSetting } from "@/utils/i18nSettings";

const settingStore = useSettingStore();

type ContextMenuOptionKey = keyof SettingState["contextMenuOptions"];
type Item = { label: string; key: ContextMenuOptionKey };

const rawItems: { labelKey: string; key: ContextMenuOptionKey }[] = [
  { labelKey: "播放", key: "play" },
  { labelKey: "下一首播放", key: "playNext" },
  { labelKey: "添加到歌单", key: "addToPlaylist" },
  { labelKey: "查看 MV", key: "mv" },
  { labelKey: "不感兴趣", key: "dislike" },
  { labelKey: "更多操作", key: "more" },
  { labelKey: "导入至云盘", key: "cloudImport" },
  { labelKey: "从歌单中删除", key: "deleteFromPlaylist" },
  { labelKey: "从云盘中删除", key: "deleteFromCloud" },
  { labelKey: "从本地磁盘中删除", key: "deleteFromLocal" },
  { labelKey: "打开歌曲所在目录", key: "openFolder" },
  { labelKey: "云盘歌曲纠正", key: "cloudMatch" },
  { labelKey: "音乐百科", key: "wiki" },
  { labelKey: "搜索", key: "search" },
  { labelKey: "下载歌曲", key: "download" },
  { labelKey: "复制歌曲名", key: "copyName" },
  { labelKey: "音乐标签编辑", key: "musicTagEditor" },
];

const items = computed<Item[]>(() =>
  rawItems.map((it) => ({
    label: trSetting(it.labelKey),
    key: it.key,
  })),
);

const updateSetting = (key: ContextMenuOptionKey, val: boolean) => {
  settingStore.contextMenuOptions[key] = val;
};
</script>

<style scoped lang="scss">
.context-menu-manager {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;

  /* 自定义滚动条样式 */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(128, 128, 128, 0.3);
    border-radius: 3px;
    &:hover {
      background-color: rgba(128, 128, 128, 0.5);
    }
  }
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  .item {
    border-radius: 8px;
    .name {
      font-size: 16px;
      line-height: normal;
    }
    .n-switch {
      margin-left: auto;
    }
  }
}
</style>
