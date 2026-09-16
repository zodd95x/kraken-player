<template>
  <div class="podcast-hot">
    <!-- 头部区域 -->
    <div class="podcast-header">
      <div class="header-left">
        <div class="title-row">
          <div class="icon-wrap">
            <SvgIcon name="Record" :size="28" />
          </div>
          <n-h2 class="title">{{ t("podcast.title") }}</n-h2>
          <n-tag :bordered="false" round size="small" type="primary" class="count-tag">
            {{ podcastData.length }} {{ t("podcast.episodes_count") }}
          </n-tag>
        </div>
        <n-text depth="3" class="subtitle">
          {{ t("podcast.subtitle") }}
        </n-text>
      </div>

      <!-- 右侧控制区：国家选择与添加 RSS -->
      <div class="header-actions">
        <CountrySelectDropdown v-model="selectedCountry" />
        <n-button strong secondary round size="small" type="primary" @click="showRssModal = true">
          <template #icon>
            <SvgIcon name="Link" />
          </template>
          {{ t("podcast.add_rss") }}
        </n-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar-wrap">
      <n-input
        v-model:value="searchKeyword"
        clearable
        round
        size="large"
        :placeholder="t('podcast.search_placeholder')"
        class="search-input"
        @update:value="handleSearchInput"
      >
        <template #prefix>
          <SvgIcon name="Search" />
        </template>
      </n-input>
    </div>

    <!-- 分类快捷标签 -->
    <div class="category-pills">
      <n-space size="small">
        <n-button
          v-for="cat in PODCAST_CATEGORIES"
          :key="cat.id"
          size="small"
          round
          :type="selectedCategory === cat.id ? 'primary' : 'default'"
          :secondary="selectedCategory !== cat.id"
          @click="selectCategory(cat.id)"
        >
          {{ getCategoryDisplayName(cat) }}
        </n-button>
      </n-space>
    </div>

    <!-- 播客列表展示 -->
    <Transition name="fade" mode="out-in">
      <div v-if="loading" class="loading-wrap">
        <n-grid cols="2 480:3 768:4 1024:5 1280:6" :x-gap="16" :y-gap="20">
          <n-gi v-for="n in 12" :key="n">
            <n-card class="skeleton-card" hoverable>
              <n-skeleton height="150px" style="border-radius: 8px" />
              <n-skeleton text round style="margin-top: 10px; width: 80%" />
              <n-skeleton text round style="margin-top: 6px; width: 50%" />
            </n-card>
          </n-gi>
        </n-grid>
      </div>
      <div v-else-if="podcastData.length > 0" class="podcasts-grid">
        <CoverList
          :data="podcastData"
          :loading="false"
          type="podcast"
          :hiddenCover="settingStore.hiddenCovers.radio"
        />
      </div>
      <n-empty v-else :description="t('podcast.no_episodes')" style="margin-top: 60px" size="large">
        <template #icon>
          <SvgIcon name="SearchOff" />
        </template>
      </n-empty>
    </Transition>

    <!-- 添加自定义 RSS 弹窗 -->
    <n-modal
      v-model:show="showRssModal"
      preset="card"
      :title="t('podcast.rss_modal_title')"
      style="width: 500px; max-width: 90vw"
      :bordered="false"
    >
      <n-space vertical size="large">
        <n-text depth="3">
          {{ t("podcast.rss_description") }}
        </n-text>
        <n-input
          v-model:value="customRssUrl"
          type="textarea"
          :placeholder="t('podcast.rss_input_placeholder')"
          :autosize="{ minRows: 2, maxRows: 4 }"
        />
        <n-flex justify="end">
          <n-button secondary @click="showRssModal = false">{{ t("common.cancel") }}</n-button>
          <n-button type="primary" :loading="rssLoading" @click="handleLoadCustomRss">
            {{ t("podcast.rss_load_button") }}
          </n-button>
        </n-flex>
      </n-space>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { debounce } from "lodash-es";
import type { CoverType } from "@/types/main";
import { useSettingStore } from "@/stores";
import CoverList from "@/components/List/CoverList.vue";
import SvgIcon from "@/components/Global/SvgIcon.vue";
import CountrySelectDropdown from "@/components/UI/CountrySelectDropdown.vue";
import { ALL_WORLD_COUNTRIES } from "@/constants/countries";
import {
  PODCAST_CATEGORIES,
  searchCountrySpotlight,
  searchPodcasts,
  getPopularPodcasts,
  parseCustomRssFeed,
} from "@/api/podcast";

const { t } = useI18n();
const router = useRouter();
const settingStore = useSettingStore();

const getDefaultCountry = (lang: string): string => {
  if (lang === "en") return "US";
  if (lang === "zh") return "CN";
  return "FR";
};

// 国家与状态（手动选择存入设置，下次打开保留）
const selectedCountry = ref<string>(
  settingStore.podcastCountry || getDefaultCountry(settingStore.language),
);

watch(
  () => settingStore.language,
  (newLang) => {
    if (!settingStore.podcastCountry) {
      selectedCountry.value = getDefaultCountry(newLang);
    }
  },
);
const selectedCategory = ref<string>("all");
const searchKeyword = ref<string>("");
const loading = ref<boolean>(true);
const podcastData = ref<CoverType[]>([]);

// 国家搜索名（按界面语言排序）
const countrySearchNames = (country: string): string[] => {
  const entry = ALL_WORLD_COUNTRIES.find((c) => c.code === country);
  const names =
    settingStore.language === "zh"
      ? [entry?.nameZh, entry?.nameEn]
      : settingStore.language === "en"
        ? [entry?.nameEn, entry?.name]
        : [entry?.name, entry?.nameEn];
  return names.filter((n): n is string => !!n);
};

// RSS 弹窗状态
const showRssModal = ref<boolean>(false);
const customRssUrl = ref<string>("");
const rssLoading = ref<boolean>(false);

// 获取分类显示名称 (根据语言自适应)
const getCategoryDisplayName = (cat: (typeof PODCAST_CATEGORIES)[number]) => {
  if (settingStore.language === "en") {
    const enMap: Record<string, string> = {
      all: "All",
      news: "News",
      comedy: "Comedy",
      culture: "Society & Culture",
      crime: "True Crime",
      tech: "Technology",
      history: "History",
      science: "Science",
      business: "Business",
      music: "Music",
    };
    return enMap[cat.id] || cat.name;
  }
  if (settingStore.language === "zh") {
    const zhMap: Record<string, string> = {
      all: "全部",
      news: "新闻",
      comedy: "喜剧",
      culture: "社会与文化",
      crime: "罪案侦查",
      tech: "科技前沿",
      history: "历史传奇",
      science: "科学探索",
      business: "商业财经",
      music: "音乐艺术",
    };
    return zhMap[cat.id] || cat.name;
  }
  return cat.name;
};

// 获取播客数据
const fetchPodcasts = async () => {
  loading.value = true;
  try {
    if (searchKeyword.value.trim()) {
      podcastData.value = await searchPodcasts(
        searchKeyword.value.trim(),
        selectedCountry.value,
        40,
      );
    } else {
      // 分类 ID 转搜索关键词（如 all -> podcast），直接传 ID 会按字面搜索
      const keyword =
        PODCAST_CATEGORIES.find((cat) => cat.id === selectedCategory.value)?.keyword || "podcast";
      // 本地内容与全目录并行加载，本地排在最前
      const [main, local] = await Promise.all([
        getPopularPodcasts(selectedCountry.value, keyword, 40),
        selectedCategory.value === "all"
          ? searchCountrySpotlight(
              selectedCountry.value,
              countrySearchNames(selectedCountry.value),
              15,
            )
          : Promise.resolve([] as CoverType[]),
      ]);
      const localIds = new Set(local.map((s) => s.id));
      podcastData.value = [...local, ...main.filter((s) => !localIds.has(s.id))];
    }
  } catch (err) {
    console.error("Failed to fetch podcasts:", err);
    podcastData.value = [];
  } finally {
    loading.value = false;
  }
};

// 搜索防抖
const handleSearchInput = debounce(() => {
  fetchPodcasts();
}, 400);

// 切换分类
const selectCategory = (catId: string) => {
  selectedCategory.value = catId;
  searchKeyword.value = "";
  fetchPodcasts();
};

// 监听国家切换
watch(selectedCountry, () => {
  settingStore.podcastCountry = selectedCountry.value;
  fetchPodcasts();
});

// 加载自定义 RSS
const handleLoadCustomRss = async () => {
  const url = customRssUrl.value.trim();
  if (!url) return;
  rssLoading.value = true;
  try {
    const { detail, episodes } = await parseCustomRssFeed(url);
    if (!detail || episodes.length === 0) {
      window.$message.error(t("podcast.rss_error"));
      return;
    }
    showRssModal.value = false;
    window.$message.success(t("podcast.rss_success"));
    router.push({
      name: "radio",
      query: { feedUrl: encodeURIComponent(url) },
    });
  } catch (err) {
    console.error("Failed to load RSS:", err);
    window.$message.error(t("podcast.rss_error"));
  } finally {
    rssLoading.value = false;
  }
};

onMounted(() => {
  fetchPodcasts();
});
</script>

<style lang="scss" scoped>
.podcast-hot {
  width: 100%;
  padding-bottom: 40px;

  .podcast-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;

    .header-left {
      .title-row {
        display: flex;
        align-items: center;
        gap: 10px;

        .icon-wrap {
          display: flex;
          align-items: center;
          color: var(--primary-color);
        }

        .title {
          margin: 0;
          font-size: 26px;
          font-weight: 700;
        }

        .count-tag {
          font-size: 12px;
        }
      }

      .subtitle {
        display: block;
        margin-top: 4px;
        font-size: 14px;
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }

  .search-bar-wrap {
    margin-bottom: 16px;
    .search-input {
      max-width: 600px;
    }
  }

  .category-pills {
    margin-bottom: 24px;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .loading-wrap {
    .skeleton-card {
      border-radius: 8px;
    }
  }

  .podcasts-grid {
    width: 100%;
  }
}
</style>
