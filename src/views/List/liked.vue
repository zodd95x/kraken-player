<!-- 我喜欢的音乐 -->
<template>
  <div class="liked-list">
    <ListDetail
      :detail-data="detailData"
      :list-data="listData"
      :loading="showLoading"
      :list-scrolling="listScrolling"
      :search-value="searchValue"
      :config="listConfig"
      :play-button-text="playButtonText"
      :more-options="moreOptions"
      :title-text="t('home.liked_songs')"
      hide-comment-tab
      @update:search-value="handleSearchUpdate"
      @play-all="playAllSongs"
    />
    <Transition name="fade" mode="out-in">
      <SongList
        v-if="!searchValue || searchData?.length"
        :data="displayData"
        :loading="loading"
        :height="songListHeight"
        :playListId="playlistId"
        :draggable="canDragSort"
        :doubleClickAction="searchData?.length ? 'add' : 'all'"
        @scroll="handleListScroll"
        @removeSong="removeSong"
        @reorder="handleReorder"
      />
      <n-empty v-else :description="t('common.no_data')" style="margin-top: 60px" size="large">
        <template #icon>
          <SvgIcon name="SearchOff" />
        </template>
      </n-empty>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { DropdownOption } from "naive-ui";
import { useI18n } from "vue-i18n";
import { songDetail } from "@/api/song";
import { formatSongsList } from "@/utils/format";
import { renderIcon } from "@/utils/helper";
import { isObject } from "lodash-es";
import { useDataStore, useStatusStore } from "@/stores";
import { openBatchList } from "@/utils/modal";
import { useListDetail } from "@/composables/List/useListDetail";
import { useListSearch } from "@/composables/List/useListSearch";
import { useListScroll } from "@/composables/List/useListScroll";
import { useListActions } from "@/composables/List/useListActions";
import { trSetting } from "@/utils/i18nSettings";

const { t } = useI18n();
const dataStore = useDataStore();
const statusStore = useStatusStore();

// 是否激活
const isActivated = ref<boolean>(false);

const { detailData, listData, loading, getSongListHeight, setDetailData, setListData, setLoading } =
  useListDetail();
const { searchValue, searchData, displayData, clearSearch, performSearch } =
  useListSearch(listData);
const { listScrolling, handleListScroll } = useListScroll();
const { playAllSongs: playAllSongsAction } = useListActions();

// 歌单 ID
const playlistId = computed<number>(() => 0);

// 是否可拖拽排序
const canDragSort = computed(() => {
  return !searchValue.value && statusStore.listSortField === "default";
});

// 列表高度
const songListHeight = computed(() => getSongListHeight(listScrolling.value));

// 列表配置
const listConfig = {
  titleType: "normal" as const,
  showCoverMask: true,
  showPlayCount: false,
  showArtist: false,
  showCreator: false,
  showCount: true,
  searchAlign: "center" as const,
};

// 加载状态
const showLoading = computed(() => listData.value.length === 0 && loading.value);

// 播放按钮文本
const playButtonText = computed(() => {
  return t("player.play");
});

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: t("list.batch_operation"),
    key: "batch",
    props: {
      onClick: () => openBatchList(displayData.value, false, playlistId.value),
    },
    icon: renderIcon("Batch"),
  },
  {
    label: t("nav.refresh"),
    key: "refresh",
    props: {
      onClick: () => loadLocalLikedSongs(),
    },
    icon: renderIcon("Refresh"),
  },
]);

// 加载本地缓存
const loadLikedCache = () => {
  if (isObject(dataStore.likeSongsList.detail)) {
    setDetailData(dataStore.likeSongsList.detail);
  } else {
    setDetailData({
      id: 0,
      name: t("home.liked_songs"),
      cover: "/images/album.jpg?asset",
    });
  }
  if (dataStore.likeSongsList.data && dataStore.likeSongsList.data.length > 0) {
    setListData(dataStore.likeSongsList.data);
  }
};

// 加载本地喜欢歌曲
const loadLocalLikedSongs = async () => {
  setLoading(true);
  clearSearch();
  loadLikedCache();

  // 若存在未缓存的歌曲 ID，尝试联网补全歌曲信息
  const likeIds = dataStore.userLikeData.songs || [];
  const cachedList = listData.value || [];
  const cachedIds = new Set(cachedList.map((s) => s.id));
  const missingIds = likeIds.filter((id) => !cachedIds.has(id));

  if (missingIds.length > 0) {
    try {
      const result = await songDetail(missingIds.slice(0, 100));
      const newSongs = formatSongsList(result.songs);
      const mergedList = [...cachedList, ...newSongs];
      setListData(mergedList);
      await dataStore.setLikeSongsList(
        detailData.value || {
          id: 0,
          name: t("home.liked_songs"),
          cover: mergedList[0]?.cover || "/images/album.jpg?asset",
        },
        mergedList,
      );
    } catch (err) {
      console.warn("无法联网补全歌曲信息，仅显示本地缓存", err);
    }
  }

  // 更新封面和曲数
  if (listData.value.length > 0 && detailData.value) {
    detailData.value.cover = listData.value[0]?.cover || "/images/album.jpg?asset";
    detailData.value.count = listData.value.length;
  }

  setLoading(false);
};

// 搜索更新
const handleSearchUpdate = (val: string) => {
  searchValue.value = val;
  performSearch(val);
};

// 播放全部
const playAllSongs = useDebounceFn(() => {
  if (!displayData.value?.length) return;
  playAllSongsAction(displayData.value, playlistId.value);
}, 300);

// 删除歌曲
const removeSong = async (ids: number[]) => {
  if (!listData.value) return;
  const newList = listData.value.filter((song) => !ids.includes(song.id));
  setListData(newList);

  const newLikeIds = (dataStore.userLikeData.songs || []).filter((id) => !ids.includes(id));
  await dataStore.setUserLikeData("songs", newLikeIds);
  await dataStore.setLikeSongsList(
    detailData.value || {
      id: 0,
      name: t("home.liked_songs"),
      cover: newList[0]?.cover || "/images/album.jpg?asset",
    },
    newList,
  );
  window.$message.success(trSetting("已从我喜欢的音乐中移除"));
};

// 拖拽排序
const handleReorder = async (fromIndex: number, toIndex: number) => {
  if (fromIndex === toIndex) return;
  const newList = [...listData.value];
  const [moved] = newList.splice(fromIndex, 1);
  newList.splice(toIndex, 0, moved);
  setListData(newList);

  const newIds = newList.map((s) => s.id);
  await dataStore.setUserLikeData("songs", newIds);
  await dataStore.setLikeSongsList(
    detailData.value || {
      id: 0,
      name: t("home.liked_songs"),
      cover: newList[0]?.cover || "/images/album.jpg?asset",
    },
    newList,
  );
};

onActivated(async () => {
  if (!isActivated.value) {
    isActivated.value = true;
  } else {
    loadLocalLikedSongs();
  }
});

onMounted(async () => {
  await loadLocalLikedSongs();
});
</script>
