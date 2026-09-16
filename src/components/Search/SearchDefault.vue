<template>
  <Transition name="fadeDown" mode="out-in" @before-enter="getSearchHotData">
    <n-card v-if="isShow" class="search-default" content-style="padding: 0">
      <n-scrollbar class="scrollbar">
        <!-- 搜索历史 -->
        <div v-if="isShowSearchHistory" class="history">
          <div class="title">
            <SvgIcon name="History" />
            <n-text class="name">{{ trSetting("搜索历史") }}</n-text>
            <SvgIcon class="delete" name="Delete" @click.stop="deleteSearchHistory" />
          </div>
          <n-flex class="history-list">
            <n-tag
              v-for="(item, index) in dataStore.searchHistory"
              :key="index"
              :bordered="false"
              round
              @click="emit('toSearch', item)"
            >
              {{ item.length > 10 ? item.slice(0, 10) + "..." : item }}
            </n-tag>
          </n-flex>
        </div>
        <!-- 热搜榜 -->
        <div v-if="isShowHotSearch" class="hot-list">
          <div class="title">
            <SvgIcon name="Fire" />
            <n-text class="name">{{ trSetting("热搜榜") }}</n-text>
          </div>
          <div
            v-for="(item, index) in searchHotData"
            :key="index"
            class="hot-item"
            @click="emit('toSearch', item?.searchWord)"
          >
            <n-text class="num" depth="3">{{ index + 1 }}</n-text>
            <div class="data">
              <div class="name">
                <n-text class="text">{{ item?.searchWord }}</n-text>
                <n-tag
                  v-if="item.iconUrl || item.iconType"
                  :type="item.iconType == 1 ? 'error' : 'warning'"
                  :bordered="false"
                  size="small"
                  round
                >
                  {{ item.iconType === 1 ? "HOT" : "UP" }}
                </n-tag>
              </div>
              <n-text class="content" depth="3">{{ item.content }}</n-text>
            </div>
            <div class="hot">
              <SvgIcon name="Fire" />
              <n-text class="hot-num">{{ item.score }} </n-text>
            </div>
          </div>
        </div>
      </n-scrollbar>
    </n-card>
  </Transition>
</template>

<script setup lang="ts">
import { searchHot } from "@/api/search";
import { playlistAllSongs } from "@/api/playlist";
import { getCacheData } from "@/utils/cache";
import { useSettingStore, useStatusStore, useDataStore } from "@/stores";
import { trSetting } from "@/utils/i18nSettings";

interface SearchHotItem {
  searchWord: string;
  score: number;
  content: string;
  iconUrl?: string;
  iconType?: number;
}

const emit = defineEmits<{
  toSearch: [keyword: string];
}>();

const dataStore = useDataStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

const searchHotData = ref<SearchHotItem[]>([]);

// 默认国际热搜备选榜单
const globalHotFallback: SearchHotItem[] = [
  { searchWord: "Die With A Smile", content: "Lady Gaga & Bruno Mars", score: 98500, iconType: 1 },
  { searchWord: "Birds of a Feather", content: "Billie Eilish", score: 95400, iconType: 1 },
  { searchWord: "Espresso", content: "Sabrina Carpenter", score: 92800, iconType: 1 },
  { searchWord: "Taste", content: "Sabrina Carpenter", score: 88700, iconType: 2 },
  { searchWord: "Good Luck, Babe!", content: "Chappell Roan", score: 85200, iconType: 2 },
  { searchWord: "Beautiful Things", content: "Benson Boone", score: 82100, iconType: 2 },
  { searchWord: "Lose Control", content: "Teddy Swims", score: 79500 },
  { searchWord: "Blinding Lights", content: "The Weeknd", score: 76800 },
  { searchWord: "As It Was", content: "Harry Styles", score: 74200 },
  { searchWord: "Cruel Summer", content: "Taylor Swift", score: 71000 },
  { searchWord: "Starboy", content: "The Weeknd", score: 68400 },
  { searchWord: "Flowers", content: "Miley Cyrus", score: 65900 },
  { searchWord: "Stay", content: "The Kid LAROI & Justin Bieber", score: 63100 },
  { searchWord: "Greedy", content: "Tate McRae", score: 60800 },
];

// 是否展示 SearchDefault
const isShow = computed(() => {
  return (
    !statusStore.searchInputValue &&
    statusStore.searchFocus &&
    (isShowHotSearch.value || isShowSearchHistory.value)
  );
});

// 是否展示搜索历史
const isShowSearchHistory = computed(() => {
  return settingStore.showSearchHistory && dataStore.searchHistory.length > 0;
});

// 是否展示热搜榜
const isShowHotSearch = computed(() => {
  return (
    settingStore.useOnlineService && settingStore.showHotSearch && searchHotData.value.length > 0
  );
});

// 获取热搜数据（国际榜单优先）
const getSearchHotData = async () => {
  if (!settingStore.useOnlineService || !settingStore.showHotSearch) return;

  // 全球国际模式：使用 Billboard 榜单作为热搜，不再使用国内中文热搜
  if (settingStore.homeContentStyle !== "all") {
    try {
      const result = await getCacheData(
        playlistAllSongs,
        {
          key: "searchHotGlobalBillboard",
          time: 30,
        },
        60198,
        20,
      );
      if (result?.songs && result.songs.length > 0) {
        searchHotData.value = result.songs.map((song: any, index: number) => {
          const artistName =
            song.ar?.map((a: any) => a.name).join(", ") ||
            song.artists?.map((a: any) => a.name).join(", ") ||
            "";
          return {
            searchWord: artistName ? `${song.name} ${artistName}` : song.name,
            content: artistName || "Billboard Hot 100",
            score: song.pop ? Math.round(song.pop * 1000) : Math.max(10000, 98000 - index * 3200),
            iconType: index < 3 ? 1 : 2,
          };
        });
        return;
      }
    } catch (error) {
      console.warn("Failed to fetch Billboard search trends, using curated global list", error);
    }
    searchHotData.value = globalHotFallback;
    return;
  }

  // 国内中文热搜榜
  try {
    const result = await getCacheData(searchHot, {
      key: "searchHotData",
      time: 10,
    });
    searchHotData.value = result.data;
  } catch (error) {
    console.error("Error fetching search hot:", error);
    searchHotData.value = globalHotFallback;
  }
};

// 删除搜索历史
const deleteSearchHistory = () => {
  window.$dialog.warning({
    title: trSetting("Effacer l'historique"),
    content: trSetting("Voulez-vous vraiment effacer tout l'historique de recherche ?"),
    positiveText: trSetting("Effacer"),
    negativeText: trSetting("Annuler"),
    onPositiveClick: () => {
      dataStore.searchHistory = [];
    },
  });
};

onMounted(() => {
  getSearchHotData();
});
</script>

<style lang="scss" scoped>
.search-default {
  position: absolute;
  left: 0;
  top: 50px;
  width: 300px;
  border-radius: 8px;
  z-index: 101;
  &.fadeDown-enter-to {
    transition-delay: 0.25s;
  }
  :deep(.scrollbar) {
    max-height: calc(100vh - 160px);
    .n-scrollbar-content {
      padding: 10px;
    }
  }
  @media (max-width: 768px) {
    width: 100%;
  }
  .title {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 12px;
    .n-icon {
      font-size: 18px;
      margin-right: 4px;
    }
  }
  .history {
    margin-bottom: 20px;
    .delete {
      margin-left: auto;
      opacity: 0.6;
      transition: opacity 0.3s;
      cursor: pointer;
      &:hover {
        opacity: 1;
      }
    }
  }
  .hot-list {
    .hot-item {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      border-radius: 8px;
      padding: 6px;
      transition: background-color 0.3s;
      cursor: pointer;
      .num {
        width: 30px;
        height: 30px;
        min-width: 30px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        margin-right: 8px;
      }
      .data {
        flex: 1;
        width: 100%;
        padding-right: 8px;
        .name {
          font-size: 16px;
          display: flex;
          flex-direction: row;
          align-items: center;
          .text {
            margin-right: 8px;
          }
        }
      }
      .n-tag {
        pointer-events: none;
      }
      .hot {
        display: flex;
        flex-direction: row;
        align-items: center;
        font-size: 12px;
        opacity: 0.6;
        .n-icon {
          font-size: 14px;
        }
      }
      &:last-child {
        margin-bottom: 0;
      }
      &:hover {
        background-color: rgba(var(--primary), 0.12);
      }
    }
  }
}
</style>
