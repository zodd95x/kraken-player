<template>
  <div class="discover-playlists">
    <CoverList
      v-if="playlistCount > 0"
      :data="playlistData"
      :loading="loading"
      :loadMore="hasMore"
      type="playlist"
      :hiddenCover="settingStore.hiddenCovers.playlist"
      @loadMore="loadMore"
    />
  </div>
</template>

<script setup lang="ts">
import type { CoverType } from "@/types/main";
import { useSettingStore } from "@/stores";
import { allCatlistPlaylist } from "@/api/playlist";
import { formatCoverList } from "@/utils/format";

const router = useRouter();
const settingStore = useSettingStore();

// 歌单分类（国际模式默认欧美）
const defaultCat =
  settingStore.homeContentStyle !== "all" || settingStore.language !== "zh" ? "欧美" : "全部歌单";
const catName = ref<string>((router.currentRoute.value.query?.cat as string) || defaultCat);

// 歌单数据
const hasMore = ref<boolean>(true);
const loading = ref<boolean>(true);
const playlistOffset = ref<number>(0);
const playlistCount = ref<number>(1);
const playlistData = ref<CoverType[]>([]);

// 获取歌单数据
const getAllCatlistPlaylist = async () => {
  // before
  const before = playlistData.value?.at(-1)?.updateTime ?? undefined;
  // 获取数据
  loading.value = true;
  const result = await allCatlistPlaylist(catName.value, 50, playlistOffset.value, false, before);
  // 是否还有
  playlistCount.value = result?.total;
  hasMore.value = result.more || result?.total > playlistOffset.value + 50;
  // 处理数据
  const listData = formatCoverList(result.playlists);
  playlistData.value = playlistData.value?.concat(listData);
  loading.value = false;
};

// 加载更多
const loadMore = () => {
  playlistOffset.value += 50;
  getAllCatlistPlaylist();
};

// 参数变化
onBeforeRouteUpdate((to) => {
  if (to.name !== "discover-playlists") return;
  catName.value = (to.query?.cat as string) || defaultCat;
  playlistData.value = [];
  // 获取歌单
  getAllCatlistPlaylist();
});

onMounted(() => {
  // 获取歌单
  getAllCatlistPlaylist();
});
</script>

<style lang="scss" scoped>
.discover-playlists {
  width: 100%;
}
</style>
