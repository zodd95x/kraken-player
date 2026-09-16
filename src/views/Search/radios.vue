<template>
  <div class="search-type">
    <Transition name="fade" mode="out-in">
      <CoverList
        v-if="searchCount > 0"
        :data="searchResultData"
        :loading="loading"
        :loadMore="hasMore"
        type="podcast"
        :hiddenCover="settingStore.hiddenCovers.radio"
        @loadMore="loadMore"
      />
      <n-empty
        v-else
        :description="`Désolé, aucun podcast trouvé pour ${keyword}`"
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
import type { CoverType } from "@/types/main";
import { searchPodcasts } from "@/api/podcast";
import { useSettingStore } from "@/stores";

const props = defineProps<{
  keyword: string;
}>();

const settingStore = useSettingStore();

// 搜索数据
const hasMore = ref<boolean>(false);
const loading = ref<boolean>(true);
const searchCount = ref<number>(1);
const searchResultData = ref<CoverType[]>([]);

// 获取搜索结果
const getSearchResult = async () => {
  loading.value = true;
  try {
    const radioData = await searchPodcasts(props.keyword, "FR", 50);
    searchResultData.value = radioData;
    searchCount.value = radioData.length;
    hasMore.value = false;
  } catch (error) {
    console.error("Podcast search failed:", error);
    searchResultData.value = [];
    searchCount.value = 0;
  } finally {
    loading.value = false;
  }
};

// 加载更多
const loadMore = () => {};

onMounted(() => {
  getSearchResult();
});
</script>
