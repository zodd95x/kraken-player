<template>
  <div class="like">
    <!-- 头部区域 -->
    <div class="header">
      <div class="title-row">
        <n-text class="keyword">{{ t("nav.import_playlists") }}</n-text>
        <n-tag :bordered="false" round size="small" type="primary" class="count-tag">
          {{ playlistData.length }} playlists
        </n-tag>
      </div>
    </div>

    <!-- Spotify 导入区域 -->
    <n-card class="spotify-card" :bordered="false">
      <div class="spotify-header">
        <div class="spotify-title-row">
          <div class="spotify-icon-box">
            <SvgIcon name="AddList" :size="20" />
          </div>
          <div class="spotify-text-group">
            <n-text class="spotify-title">{{ t("spotify_import.title") }}</n-text>
            <n-text depth="3" class="spotify-desc">
              {{ t("spotify_import.subtitle") }}
            </n-text>
          </div>
        </div>
      </div>

      <div class="spotify-input-row">
        <n-input
          v-model:value="spotifyUrl"
          round
          clearable
          size="medium"
          :disabled="isImporting"
          :placeholder="t('spotify_import.placeholder')"
          class="spotify-input"
          @keydown.enter="handleImport"
        >
          <template #prefix>
            <SvgIcon name="Link" />
          </template>
        </n-input>
        <n-button
          type="primary"
          round
          size="medium"
          :loading="isImporting"
          :disabled="!spotifyUrl.trim()"
          class="spotify-btn"
          @click="handleImport"
        >
          <template #icon>
            <SvgIcon name="AddList" />
          </template>
          {{ t("spotify_import.btn_import") }}
        </n-button>
      </div>

      <!-- 导入进度与状态 -->
      <!-- 导入进度与状态 -->
      <div v-if="isImporting" class="import-progress-wrap">
        <n-progress
          type="line"
          :percentage="progressPercent"
          :processing="true"
          indicator-placement="inside"
        />
        <n-text depth="3" class="progress-label">
          {{ progressText }}
        </n-text>
      </div>
    </n-card>

    <!-- 歌单列表内容 -->
    <div class="playlists-content">
      <div class="section-header">
        <n-h3 class="section-title">{{ t("nav.playlists") }}</n-h3>
      </div>
      <Transition name="fade" mode="out-in">
        <CoverList
          v-if="playlistData.length > 0"
          :data="playlistData"
          type="playlist"
          :hiddenCover="settingStore.hiddenCovers.like"
        />
        <n-empty v-else :description="t('common.no_data')" style="margin-top: 60px" size="large">
          <template #icon>
            <SvgIcon name="PlayList" />
          </template>
        </n-empty>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useDataStore, useLocalStore, useSettingStore } from "@/stores";
import { importSpotifyPlaylist, type ImportProgress } from "@/api/spotifyImport";
import type { CoverType } from "@/types/main";
import CoverList from "@/components/List/CoverList.vue";

const { t } = useI18n();

const router = useRouter();
const dataStore = useDataStore();
const localStore = useLocalStore();
const settingStore = useSettingStore();

// Spotify 导入状态
const spotifyUrl = ref<string>("");
const isImporting = ref<boolean>(false);
const progressPercent = ref<number>(0);
const progressText = ref<string>("");

// 歌单数据（合并本地导入歌单与收藏歌单）
const playlistData = computed<CoverType[]>(() => {
  const localList: CoverType[] = (localStore.localPlaylists || []).map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    cover: playlist.cover || "/images/album.jpg?asset",
    description: playlist.description,
    count: playlist.songs.length,
    createTime: playlist.createTime,
    updateTime: playlist.updateTime,
  }));
  const onlineList = dataStore.userLikeData.playlists || [];
  return [...localList, ...onlineList];
});

// 处理 Spotify 导入
const handleImport = async () => {
  const url = spotifyUrl.value.trim();
  if (!url || isImporting.value) return;

  isImporting.value = true;
  progressPercent.value = 5;
  progressText.value = t("spotify_import.extracting");

  try {
    const result = await importSpotifyPlaylist(url, (progress: ImportProgress) => {
      progressPercent.value = Math.min(99, Math.round((progress.current / progress.total) * 100));
      progressText.value = `${t("spotify_import.searching", { current: progress.current, total: progress.total })}: ${progress.trackTitle}`;
    });

    progressPercent.value = 100;
    progressText.value = "";
    spotifyUrl.value = "";

    if (result.matched === 0) {
      window.$message.warning(t("spotify_import.no_matches"));
    } else {
      window.$message.success(
        t("spotify_import.success", {
          title: result.title,
          matched: result.matched,
          total: result.total,
        }),
      );
    }

    // 跳转至新导入的歌单详情
    router.push({
      name: "playlist",
      query: { id: result.playlistId },
    });
  } catch (err: any) {
    console.error("Import failed:", err);
    window.$message.error(err?.message || t("spotify_import.error_fetch"));
  } finally {
    isImporting.value = false;
  }
};
</script>
<style lang="scss" scoped>
.like {
  display: flex;
  flex-direction: column;
  .header {
    display: flex;
    align-items: center;
    margin-top: 12px;
    margin-bottom: 16px;
    height: 40px;
    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      .keyword {
        font-size: 30px;
        font-weight: bold;
        line-height: normal;
      }
      .count-tag {
        font-weight: 500;
      }
    }
  }

  // Spotify 导入卡片
  .spotify-card {
    background-color: var(--card-color);
    border-radius: 12px;
    padding: 6px 4px;
    margin-bottom: 24px;
    transition: box-shadow 0.3s ease;

    .spotify-header {
      margin-bottom: 12px;
      .spotify-title-row {
        display: flex;
        align-items: center;
        gap: 10px;
        .spotify-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(var(--primary), 0.12);
          color: var(--primary-hex);
        }
        .spotify-text-group {
          display: flex;
          flex-direction: column;
          .spotify-title {
            font-size: 16px;
            font-weight: bold;
            line-height: 1.2;
          }
          .spotify-desc {
            font-size: 13px;
            margin-top: 2px;
          }
        }
      }
    }

    .spotify-input-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-right: 16px;
      .spotify-input {
        flex: 1;
      }
      .spotify-btn {
        flex-shrink: 0;
        font-weight: 500;
      }
    }

    .import-progress-wrap {
      margin-top: 12px;
      .progress-label {
        display: block;
        font-size: 12px;
        margin-top: 6px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  .playlists-content {
    .section-header {
      margin-bottom: 16px;
      .section-title {
        font-size: 20px;
        font-weight: bold;
        margin: 0;
      }
    }
  }

  @media (max-width: 512px) {
    .spotify-input-row {
      flex-direction: column;
      align-items: stretch;
      .spotify-btn {
        width: 100%;
      }
    }
  }
}
</style>
