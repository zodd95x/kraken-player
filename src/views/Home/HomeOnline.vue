<template>
  <div class="home-online">
    <!-- 登录功能 -->
    <div v-if="isLogin()" class="main-rec">
      <div class="main-rec-grid">
        <n-flex :size="20" class="rec-list" justify="space-between" vertical>
          <!-- 每日推荐 -->
          <SongListCard
            :data="musicStore.dailySongsData.list"
            :title="dailySongsTitle"
            :height="90"
            :description="trSetting('根据你的音乐口味 · 每日更新')"
            size="small"
            :hiddenCover="settingStore.hiddenCovers.home"
            @click="router.push({ name: 'daily-songs' })"
          />
          <!-- 我喜欢的音乐 -->
          <SongListCard
            :data="dataStore.likeSongsList.data"
            :height="90"
            :title="t('home.liked_songs')"
            :description="t('home.liked_desc')"
            size="small"
            :hiddenCover="settingStore.hiddenCovers.home"
            @click="router.push({ name: 'like-songs' })"
          />
        </n-flex>
      </div>
    </div>
    <!-- 公共推荐 -->
    <div v-for="(item, index) in sortedRecData" :key="index" class="rec-public">
      <n-flex
        class="title"
        align="center"
        justify="space-between"
        @click="router.push({ path: item.path ?? undefined })"
      >
        <n-h3 prefix="bar">
          <n-text>{{ item.name }}</n-text>
          <SvgIcon v-if="item.path" :size="26" name="Right" />
        </n-h3>
      </n-flex>
      <!-- 列表 -->
      <ArtistList
        v-if="item.type === 'artist'"
        :data="item.list"
        :loading="true"
        :hiddenCover="settingStore.hiddenCovers.home"
      />
      <CoverList
        v-else
        :data="item.list"
        :type="item.type"
        :loading="true"
        :hiddenCover="settingStore.hiddenCovers.home"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ArtistType, CoverType } from "@/types/main";
import { NText } from "naive-ui";
import { useDataStore, useMusicStore, useSettingStore } from "@/stores";
import { newAlbumsAll, personalized, radarPlaylist, topArtists } from "@/api/rec";
import { allCatlistPlaylist } from "@/api/playlist";
import { artistTypeList } from "@/api/artist";
import { getPopularPodcasts } from "@/api/podcast";
import { getCacheData } from "@/utils/cache";
import { formatArtistsList, formatCoverList } from "@/utils/format";
import { sleep } from "@/utils/helper";
import { isLogin } from "@/utils/auth";
import { useI18n } from "vue-i18n";
import { trSetting } from "@/utils/i18nSettings";
import SvgIcon from "@/components/Global/SvgIcon.vue";

interface RecItemTypeBase {
  name: string;
  path?: string;
}

interface RecItemArtist extends RecItemTypeBase {
  type: "artist";
  list: ArtistType[];
}

interface RecItemCover extends RecItemTypeBase {
  type: "playlist" | "video" | "radio" | "album";
  list: CoverType[];
}

interface RecDataType {
  playlist: RecItemCover;
  radar: RecItemCover;
  artist: RecItemArtist;
  video: RecItemCover;
  radio: RecItemCover;
  album: RecItemCover;
}

const { t } = useI18n();
const router = useRouter();
const dataStore = useDataStore();
const musicStore = useMusicStore();
const settingStore = useSettingStore();

// 日推标题
const dailySongsTitle = computed(() => {
  if (settingStore.hiddenCovers.home) return trSetting("每日推荐");
  const day = new Date().getDate();
  return h("div", { class: "date" }, [
    h("div", { class: "date-icon" }, [
      h(SvgIcon, { name: "Calendar-Empty", size: 30, depth: 2 }),
      h(NText, null, () => day),
    ]),
    h(NText, { class: "name text-hidden" }, () => [trSetting("每日推荐")]),
  ]);
});

const isWestern = computed(() => settingStore.homeContentStyle !== "all");

// 栏目列表数据
const playlistList = ref<CoverType[]>([]);
const radarList = ref<CoverType[]>([]);
const artistList = ref<ArtistType[]>([]);
const videoList = ref<CoverType[]>([]);
const radioList = ref<CoverType[]>([]);
const albumList = ref<CoverType[]>([]);

// 推荐数据
const recData = computed<RecDataType>(() => ({
  playlist: {
    name: t("home.trending_playlists"),
    list: playlistList.value,
    type: "playlist",
    path: "/discover/playlists",
  },
  radar: {
    name: t("home.world_charts"),
    list: radarList.value,
    type: "playlist",
  },
  artist: {
    name: t("home.top_artists"),
    list: artistList.value,
    type: "artist",
    path: "/discover/artists",
  },
  video: {
    name: t("home.hot_videos"),
    list: videoList.value,
    type: "video",
  },
  radio: {
    name: t("home.podcasts"),
    list: radioList.value,
    type: "radio",
  },
  album: {
    name: t("home.new_albums"),
    list: albumList.value,
    type: "album",
    path: "/discover/new",
  },
}));

// 根据设置过滤和排序推荐数据
const sortedRecData = computed(() => {
  const sections = settingStore.homePageSections
    .filter((section) => section.visible && section.key !== "video")
    .sort((a, b) => a.order - b.order)
    .map((section) => {
      const key = section.key as keyof RecDataType;
      return recData.value[key];
    })
    .filter((item) => item);
  return sections;
});

// 获取全部推荐
const getAllRecData = async () => {
  try {
    // 延时
    await sleep(300);

    // 歌单
    try {
      if (isWestern.value) {
        const playlistRes = await getCacheData(
          allCatlistPlaylist,
          { key: "playlistWesternRec", time: 15 },
          "欧美",
          isLogin() ? 21 : 20,
        );
        playlistList.value = formatCoverList(playlistRes.playlists);
      } else {
        const playlistRes = await getCacheData(
          personalized,
          { key: "playlistRec", time: 10 },
          "playlist",
          isLogin() ? 21 : 20,
        );
        playlistList.value = formatCoverList(
          playlistRes.result?.filter((pl: any) => !pl.name.includes("私人雷达")),
        );
      }
    } catch (error) {
      console.error("Error getting playlist:", error);
    }

    // 排行榜/雷达 (包含全球 Billboard, UK, France NRJ, Beatport, Rap, Pop)
    try {
      const radarRes = await getCacheData(radarPlaylist, { key: "radarRec", time: 30 });
      radarList.value = formatCoverList(radarRes);
    } catch (error) {
      console.error("Error getting radar:", error);
    }

    // 歌手
    try {
      if (isWestern.value) {
        const artistRes = await getCacheData(
          artistTypeList,
          { key: "artistWesternRec", time: 15 },
          -1,
          96,
          -1,
          0,
          6,
        );
        artistList.value = formatArtistsList(artistRes.artists);
      } else {
        const artistRes = await getCacheData(topArtists, { key: "artistRec", time: 10 }, 6);
        artistList.value = formatArtistsList(artistRes.artists);
      }
    } catch (error) {
      console.error("Error getting artist:", error);
    }

    // 禁用视频板块，不请求 MV 数据
    videoList.value = [];

    // 播客
    if (settingStore.homePageSections.find((s) => s.key === "radio" && s.visible)) {
      try {
        const podcastRes = await getCacheData(
          getPopularPodcasts,
          { key: "podcastRec_FR", time: 30 },
          "FR",
          "podcast",
          12,
        );
        radioList.value = podcastRes || [];
      } catch (error) {
        console.error("Error getting radio:", error);
      }
    }

    // 新碟
    try {
      const cat = isWestern.value ? "EA" : "ALL";
      const albumRes = await getCacheData(
        newAlbumsAll,
        { key: `albumRec_${cat}`, time: 15 },
        cat,
        20,
      );
      albumList.value = formatCoverList(albumRes.albums);
    } catch (error) {
      console.error("Error getting album:", error);
    }
  } catch (error) {
    window.$message.error(t("common.error"));
    console.error("Error getting personalized data:", error);
  }
};

watch(
  () => settingStore.homeContentStyle,
  () => {
    getAllRecData();
  },
);

onActivated(getAllRecData);

onMounted(() => {
  getAllRecData();
});
</script>

<style lang="scss" scoped>
.main-rec {
  .main-rec-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
  .date {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    .date-icon {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 4px;
      .n-text {
        position: absolute;
        font-size: 12px;
        color: var(--primary-hex);
        line-height: normal;
        margin-top: 4px;
        transform: scale(0.8);
      }
    }
    .name {
      font-size: 18px;
      font-weight: bold;
    }
  }
  @media (max-width: 768px) {
    .main-rec-grid {
      grid-template-columns: repeat(1, 1fr);
    }
    .rec-list {
      display: grid !important;
      grid-template-columns: repeat(2, 1fr);
    }
  }
}
.title {
  margin-top: 28px;
  padding: 0 4px;
  width: max-content;
  .n-h {
    margin: 0;
    display: flex;
    align-items: center;
    cursor: pointer;
    .n-icon {
      opacity: 0;
      transform: translateX(4px);
      transition:
        opacity 0.3s,
        transform 0.3s;
    }
    &:hover {
      .n-icon {
        opacity: 1;
        transform: translateX(0);
      }
    }
  }
}
</style>
