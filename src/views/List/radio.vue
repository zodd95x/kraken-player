<!-- 播客列表 -->
<template>
  <div class="radio-list">
    <ListDetail
      :detail-data="detailData"
      :list-data="listData"
      :loading="showLoading"
      :list-scrolling="listScrolling"
      :search-value="searchValue"
      :config="listConfig"
      :play-button-text="playButtonText"
      :more-options="moreOptions"
      @update:search-value="handleSearchUpdate"
      @play-all="playAllSongs"
      @tab-change="handleTabChange"
    >
      <template #action-buttons>
        <n-button
          :focusable="false"
          strong
          secondary
          round
          @click="toSubRadio(radioId, !isLikeRadio)"
        >
          <template #icon>
            <SvgIcon :name="isLikeRadio ? 'Favorite' : 'FavoriteBorder'" />
          </template>
          {{ isLikeRadio ? trSetting("取消订阅") : trSetting("订阅") }}
        </n-button>
      </template>
    </ListDetail>
    <!-- 歌曲列表 -->
    <template v-if="currentTab === 'songs'">
      <SongList
        v-if="!searchValue || searchData?.length"
        :data="displayData"
        :loading="loading"
        :height="songListHeight"
        :radioId="radioId"
        :doubleClickAction="searchData?.length ? 'add' : 'all'"
        type="radio"
        @scroll="handleListScroll"
      />
      <n-empty
        v-else
        :description="`${trSetting('抱歉，未找到相关歌曲')} « ${searchValue} »`"
        style="margin-top: 60px"
        size="large"
      >
        <template #icon>
          <SvgIcon name="SearchOff" />
        </template>
      </n-empty>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { DropdownOption, MessageReactive } from "naive-ui";
import { formatCoverList, formatSongsList } from "@/utils/format";
import { renderIcon, copyData, getShareUrl } from "@/utils/helper";
import { useDataStore } from "@/stores";
import { radioAllProgram, radioDetail } from "@/api/radio";
import { getPodcastDetailAndEpisodes, parseCustomRssFeed } from "@/api/podcast";
import { useListDetail } from "@/composables/List/useListDetail";
import { useListSearch } from "@/composables/List/useListSearch";
import { useListScroll } from "@/composables/List/useListScroll";
import { useListActions } from "@/composables/List/useListActions";
import { toSubRadio } from "@/utils/auth";
import { useListDataCache, type ListCacheData } from "@/composables/List/useListDataCache";
import { trSetting } from "@/utils/i18nSettings";

const router = useRouter();
const dataStore = useDataStore();

const {
  detailData,
  listData,
  loading,
  getSongListHeight,
  setDetailData,
  setListData,
  appendListData,
  setLoading,
} = useListDetail();
const { searchValue, searchData, displayData, clearSearch, performSearch } =
  useListSearch(listData);
const { listScrolling, handleListScroll } = useListScroll();
const { playAllSongs: playAllSongsAction } = useListActions();
const { saveCache, loadCache, checkNeedsUpdate } = useListDataCache();

// 电台 ID 与 RSS 链接
const oldRadioId = ref<number>(0);
const radioId = computed<number>(() => Number(router.currentRoute.value.query.id as string) || 0);
const feedUrl = computed<string>(() => (router.currentRoute.value.query.feedUrl as string) || "");

// 当前正在请求的播客 ID，用于防止竞态条件
const currentRequestId = ref<number>(0);

// 加载提示
const loadingMsg = ref<MessageReactive | null>(null);

// 列表高度
const songListHeight = computed(() => getSongListHeight(listScrolling.value));

// 当前 tab
const currentTab = ref<"songs" | "comments">("songs");

// 是否处于收藏播客
const isLikeRadio = computed(() => {
  return dataStore.userLikeData.djs.some((radio) => radio.id === detailData.value?.id);
});

// 是否处于播客页面
const isPlaylistPage = computed<boolean>(() => router.currentRoute.value.name === "radio");

// 是否为相同播客
const isSamePlaylist = computed<boolean>(() => oldRadioId.value === radioId.value);

// 列表配置
const listConfig = {
  titleType: "normal" as const,
  showCoverMask: false,
  showPlayCount: false,
  showArtist: false,
  showCreator: true,
  showCount: true,
};

// 是否显示加载状态
const showLoading = computed(() => listData.value.length === 0 && loading.value);

// 播放按钮文本
const playButtonText = computed(() => {
  if (showLoading.value) {
    if (isSamePlaylist.value) {
      return trSetting("更新中...");
    }
    const loaded =
      listData.value.length === (detailData.value?.count || 0) ? 0 : listData.value.length;
    return `${trSetting("加载中...")} (${loaded}/${detailData.value?.count || 0})`;
  }
  return trSetting("播放全部");
});

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: trSetting("刷新缓存"),
    key: "refresh-cache",
    props: {
      onClick: () => getRadioDetail(radioId.value, true),
    },
    icon: renderIcon("Refresh"),
  },
  {
    label: trSetting("刷新播客"),
    key: "refresh",
    props: {
      onClick: () => getRadioDetail(radioId.value),
    },
    icon: renderIcon("Refresh"),
  },
  {
    label: trSetting("复制分享链接"),
    key: "copy",
    props: {
      onClick: () =>
        copyData(getShareUrl("djradio", radioId.value), trSetting("分享链接已复制到剪贴板")),
    },
    icon: renderIcon("Share"),
  },
]);

// 获取播客基础信息
const getRadioDetail = async (id: number, refresh: boolean = false) => {
  // 设置加载状态
  setLoading(true);
  // 清空数据
  clearSearch();

  // 自定义 RSS 链接处理
  if (feedUrl.value) {
    try {
      const decodedUrl = decodeURIComponent(feedUrl.value);
      const { detail, episodes } = await parseCustomRssFeed(decodedUrl);
      if (detail && episodes.length > 0) {
        setDetailData(detail);
        setListData(episodes);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error("Custom RSS loading failed", e);
    }
  }

  if (!id) {
    setLoading(false);
    return;
  }
  // 设置当前请求的播客 ID
  currentRequestId.value = id;

  // 尝试读取缓存
  if (!refresh) {
    const cached = await loadCache("radio", id);
    if (cached) {
      setDetailData(cached.detail);
      setListData(cached.songs);
      setLoading(false);

      // 后台检查更新
      backgroundCheck(id, cached);
      return;
    }
  }

  // 获取播客详情
  if (detailData.value?.id !== id || refresh) {
    setDetailData(null);
    setListData([]);
  }

  // 优先请求 Apple Podcasts 国际源
  try {
    const { detail: appleDetail, episodes: appleEpisodes } = await getPodcastDetailAndEpisodes(id);
    if (appleDetail && appleEpisodes.length > 0) {
      if (currentRequestId.value !== id) return;
      setDetailData(appleDetail);
      setListData(appleEpisodes);
      saveCache("radio", id, appleDetail, appleEpisodes);
      setLoading(false);
      return;
    }
  } catch (err) {
    console.warn("Apple podcasts lookup fallback to NetEase", err);
  }

  // 回退至网易云电台接口
  try {
    const detail = await radioDetail(id);
    if (currentRequestId.value !== id) return;
    setDetailData(formatCoverList(detail.data)[0]);
    // 获取全部节目
    await getRadioAllProgram(id, detailData.value?.count as number);
  } catch (err) {
    console.error("Radio detail fetch error", err);
    setLoading(false);
  }
};

// 后台检查更新
const backgroundCheck = async (id: number, cached: ListCacheData) => {
  try {
    const detail = await radioDetail(id);
    if (currentRequestId.value !== id) return;

    const latestDetail = formatCoverList(detail.data)[0];

    if (checkNeedsUpdate(cached, latestDetail)) {
      getRadioDetail(id, true);
    }
  } catch (e) {
    console.error("Radio background check failed", e);
  }
};

// 获取播客全部歌曲
const getRadioAllProgram = async (id: number, count: number) => {
  if (!id || !count) return;
  setLoading(true);
  // 加载提示
  if (count > 500) loadingMsgShow();
  // 强制清空列表，防止重复
  setListData([]);
  // 循环获取
  let offset: number = 0;
  const limit: number = 500;
  do {
    if (currentRequestId.value !== id) {
      loadingMsgShow(false);
      return;
    }
    const result = await radioAllProgram(id, limit, offset);
    if (currentRequestId.value !== id) {
      loadingMsgShow(false);
      return;
    }
    const songData = formatSongsList(result.programs);
    appendListData(songData);
    // 更新数据
    offset += limit;
  } while (offset < count && isPlaylistPage.value && currentRequestId.value === id);
  if (currentRequestId.value !== id) {
    loadingMsgShow(false);
    return;
  }
  // 保存缓存
  if (detailData.value && listData.value.length > 0) {
    saveCache("radio", id, detailData.value, listData.value);
  }

  // 关闭加载
  loadingMsgShow(false);
};

// 处理搜索更新
const handleSearchUpdate = (val: string) => {
  searchValue.value = val;
  performSearch(val);
};

// 处理 tab 切换
const handleTabChange = (value: "songs" | "comments") => {
  currentTab.value = value;
};

// 播放全部歌曲
const playAllSongs = useDebounceFn(() => {
  if (!detailData.value || !listData.value?.length) return;
  playAllSongsAction(listData.value, radioId.value);
}, 300);

// 加载提示
const loadingMsgShow = (show: boolean = true) => {
  if (show) {
    loadingMsg.value?.destroy();
    loadingMsg.value = window.$message.loading(trSetting("该播客包含较多节目，请稍候..."), {
      duration: 0,
      closable: true,
    });
  } else {
    setLoading(false);
    loadingMsg.value?.destroy();
    loadingMsg.value = null;
  }
};

onBeforeRouteUpdate((to) => {
  const id = Number(to.query.id as string) || 0;
  const feed = (to.query.feedUrl as string) || "";
  if (id || feed) {
    currentTab.value = "songs";
    oldRadioId.value = id;
    getRadioDetail(id);
  }
});

onActivated(() => {
  // 是否为首次进入
  if (oldRadioId.value === 0) {
    oldRadioId.value = radioId.value;
  } else {
    oldRadioId.value = radioId.value;
    getRadioDetail(radioId.value, false);
  }
});

onDeactivated(() => loadingMsgShow(false));
onUnmounted(() => loadingMsgShow(false));
onMounted(() => getRadioDetail(radioId.value));
</script>
