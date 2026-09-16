<template>
  <div class="discover-artists">
    <div class="menu">
      <!-- 字母分类 -->
      <n-flex class="initial">
        <n-tag
          v-for="(item, index) in artistInitials"
          :key="index"
          :type="item.key === artistInitialChoose ? 'primary' : 'default'"
          :bordered="false"
          round
          @click="artistQueryChange(item.key, artistTypeNamesChoose)"
        >
          {{ item.value }}
        </n-tag>
      </n-flex>
      <!-- 地区分类 -->
      <n-flex class="category">
        <n-tag
          v-for="(item, index) in artistTypeNames"
          :key="item"
          :type="index === artistTypeNamesChoose ? 'primary' : 'default'"
          :bordered="false"
          round
          @click="artistQueryChange(artistInitialChoose, index)"
        >
          {{ item }}
        </n-tag>
      </n-flex>
    </div>
    <ArtistList
      :data="artistsData"
      :loading="loading"
      :loadMore="hasMore"
      :hiddenCover="settingStore.hiddenCovers.artist"
      @loadMore="loadMore"
    />
  </div>
</template>

<script setup lang="ts">
import type { ArtistType } from "@/types/main";
import { artistTypeList } from "@/api/artist";
import { formatArtistsList } from "@/utils/format";
import { useSettingStore } from "@/stores";

import { trSetting } from "@/utils/i18nSettings";

const router = useRouter();
const settingStore = useSettingStore();

// 歌手标签数据
const artistInitials = computed(() => [
  { key: -1, value: trSetting("热门") },
  ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(i + 65)).map((v) => ({
    key: v,
    value: v,
  })),
  { key: 0, value: "#" },
]);
const artistInitialChoose = ref<number | string>(
  (router.currentRoute.value.query?.initial as string) || -1,
);

// 歌手分类数据
const artistTypeNames = computed(() => {
  const areas = [
    { zh: "华语", fr: "Chinois", en: "Chinese" },
    { zh: "欧美", fr: "Internationale", en: "International" },
    { zh: "日本", fr: "Japonais", en: "Japanese" },
    { zh: "韩国", fr: "Coréen", en: "Korean" },
  ];
  const lang = settingStore.language;
  const allLabel = lang === "zh" ? "全部" : lang === "en" ? "All" : "Tous";
  const otherLabel = lang === "zh" ? "其他" : lang === "en" ? "Other" : "Autre";
  const male = lang === "zh" ? "男歌手" : lang === "en" ? "Male" : "Homme";
  const female = lang === "zh" ? "女歌手" : lang === "en" ? "Femme" : "Femme";
  const band = lang === "zh" ? "乐队组合" : lang === "en" ? "Band/Group" : "Groupe";

  return [
    allLabel,
    ...areas.flatMap((area) => {
      const areaName = lang === "zh" ? area.zh : lang === "en" ? area.en : area.fr;
      return [
        areaName,
        `${areaName} - ${male}`,
        `${areaName} - ${female}`,
        `${areaName} - ${band}`,
      ];
    }),
    otherLabel,
  ];
});
const artistType = [-1, -1, 1, 2, 3, -1, 1, 2, 3, -1, 1, 2, 3, -1, 1, 2, 3, -1];
const artistArea = [-1, 7, 7, 7, 7, 96, 96, 96, 96, 8, 8, 8, 8, 16, 16, 16, 16, 0];
const defaultArtistType =
  settingStore.homeContentStyle !== "all" || settingStore.language !== "zh" ? 5 : 0;
const artistTypeNamesChoose = ref<number>(
  router.currentRoute.value.query?.type !== undefined
    ? Number(router.currentRoute.value.query?.type as string)
    : defaultArtistType,
);

// 歌手数据
const hasMore = ref<boolean>(true);
const loading = ref<boolean>(true);
const artistsOffset = ref<number>(0);
const artistsData = ref<ArtistType[]>([]);

// 获取歌手数据
const getArtistListData = async () => {
  // 获取数据
  loading.value = true;
  const result = await artistTypeList(
    // 类型
    artistType[artistTypeNamesChoose.value] || -1,
    // 地区
    artistArea[artistTypeNamesChoose.value] || -1,
    // 首字母索引
    artistInitialChoose.value,
    artistsOffset.value,
    50,
  );
  // 是否还有
  hasMore.value = result?.more;
  // 处理数据
  const arData = formatArtistsList(result.artists);
  artistsData.value = artistsData.value?.concat(arData);
  loading.value = false;
};

// 参数变化
const artistQueryChange = (initial: number | string, type: number) => {
  artistsOffset.value = 0;
  router.push({
    name: "discover-artists",
    query: { initial, type },
  });
};

// 加载更多
const loadMore = () => {
  artistsOffset.value += 50;
  getArtistListData();
};

// 参数变化
onBeforeRouteUpdate((to) => {
  if (to.name !== "discover-artists") return;
  // 更新参数
  artistInitialChoose.value = (to.query?.initial as string) || artistInitials[0].key;
  artistTypeNamesChoose.value = Number(to.query?.type as string) || 0;
  // 获取歌单
  loading.value = true;
  artistsData.value = [];
  getArtistListData();
});

onMounted(getArtistListData);
</script>

<style lang="scss" scoped>
.discover-artists {
  .menu {
    margin-top: 20px;
    .initial {
      margin-bottom: 20px;
    }
  }
}
</style>
