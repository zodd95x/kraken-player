<template>
  <div class="discover-toplists">
    <n-divider style="margin-bottom: 0"> {{ trSetting("全球榜") }} </n-divider>
    <CoverList
      :data="topListData.selected"
      :loading="true"
      type="playlist"
      :hiddenCover="settingStore.hiddenCovers.toplist"
    />
  </div>
</template>

<script setup lang="ts">
import { topPlaylist } from "@/api/playlist";
import type { CoverType } from "@/types/main";
import { formatCoverList } from "@/utils/format";
import { useSettingStore } from "@/stores";
import { trSetting } from "@/utils/i18nSettings";

const settingStore = useSettingStore();

// 排行榜数据
const topListData = ref<{
  selected: CoverType[];
}>({
  selected: [],
});

// 国际模式榜单关键词（原名匹配）
const GLOBAL_CHART_KEYWORDS = [
  "欧美",
  "Billboard",
  "UK",
  "英国",
  "法国",
  "NRJ",
  "全球",
  "美国",
  "Spotify",
  "iTunes",
  "Apple Music",
  "Beatport",
];

// 国际模式：仅保留国际榜单并排在前面
const sortChartsWesternFirst = (list: CoverType[]): CoverType[] => {
  if (settingStore.homeContentStyle === "all") return list;
  const isGlobal = (name: string) => GLOBAL_CHART_KEYWORDS.some((k) => name.includes(k));
  return list.filter((v) => isGlobal(v.name));
};

// 获取排行榜数据
const getTopPlaylistData = async () => {
  const result = await topPlaylist();
  // 仅保留全球榜
  const selected = formatCoverList(result.list?.filter((v: any) => v.ToplistType === undefined));
  topListData.value = { selected: sortChartsWesternFirst(selected) };
};

onMounted(getTopPlaylistData);
</script>

<style lang="scss" scoped>
.discover-toplists {
}
</style>
