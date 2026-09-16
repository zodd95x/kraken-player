<template>
  <div class="download">
    <div class="title">
      <n-text class="keyword">{{ t("download.title") }}</n-text>
      <n-flex class="status">
        <n-text class="item">
          <SvgIcon name="Music" :depth="3" />
          <n-number-animation :from="0" :to="listData.length" />
          <span style="margin-left: 4px">{{ t("download.downloaded") }}</span>
        </n-text>
        <n-text v-if="dataStore.downloadingSongs.length > 0" class="item" depth="3">
          <SvgIcon name="Download" :depth="3" />
          <n-number-animation :from="0" :to="dataStore.downloadingSongs.length" />
          <span style="margin-left: 4px">{{ t("download.downloading") }}</span>
        </n-text>
      </n-flex>
    </div>

    <n-flex class="menu" justify="space-between">
      <n-flex class="left" align="flex-end">
        <n-button
          :focusable="false"
          :disabled="listData.length === 0"
          type="primary"
          strong
          secondary
          round
          @click="handlePlayAll"
        >
          <template #icon>
            <SvgIcon name="Play" />
          </template>
          {{ t("common.play") }}
        </n-button>
        <n-button
          :focusable="false"
          :loading="loading"
          class="more"
          strong
          secondary
          circle
          @click="() => getDownloadMusic(true)"
        >
          <template #icon>
            <SvgIcon name="Refresh" />
          </template>
        </n-button>
      </n-flex>
    </n-flex>

    <!-- 正在下载模块（当有任务时展示） -->
    <Transition name="fade">
      <div v-if="dataStore.downloadingSongs.length > 0" class="downloading-container">
        <div class="section-header">
          <n-flex align="center" justify="space-between">
            <n-flex align="center" :size="8">
              <SvgIcon name="Download" :depth="2" />
              <n-text strong style="font-size: 15px">
                {{ t("download.downloading") }} ({{ dataStore.downloadingSongs.length }})
              </n-text>
            </n-flex>
            <n-button
              v-if="hasFailedDownloads"
              size="small"
              secondary
              round
              @click="downloadManager.retryAllDownloads()"
            >
              <template #icon>
                <SvgIcon name="Refresh" />
              </template>
              {{ t("common.retry") || "Réessayer tout" }}
            </n-button>
          </n-flex>
        </div>

        <n-scrollbar style="max-height: 200px" class="downloading-scroll">
          <div
            v-for="(item, index) in sortedDownloadingSongs"
            :key="item.song.id"
            class="download-item"
          >
            <!-- 序号 -->
            <div class="num">
              <n-text depth="3">{{ index + 1 }}</n-text>
            </div>
            <!-- 标题 (封面 + 信息) -->
            <div class="song-title">
              <s-image :src="item.song.coverSize?.s || item.song.cover" class="cover" />
              <div class="info">
                <div class="name">
                  <n-text class="name-text" ellipsis>{{ item.song.name }}</n-text>
                </div>
                <div class="artists text-hidden">
                  <n-text depth="3">
                    {{
                      Array.isArray(item.song.artists)
                        ? item.song.artists.map((a) => a.name).join(" / ")
                        : item.song.artists
                    }}
                  </n-text>
                </div>
              </div>
            </div>
            <!-- 状态与进度条 -->
            <div class="progress-col">
              <n-flex vertical :size="4" style="width: 100%">
                <n-flex justify="space-between">
                  <n-text
                    :type="item.status === 'failed' ? 'error' : undefined"
                    :depth="item.status === 'failed' ? undefined : '3'"
                    style="font-size: 12px"
                  >
                    {{
                      item.status === "downloading"
                        ? `${item.progress}%`
                        : item.status === "waiting"
                          ? "En attente..."
                          : "Échec du téléchargement"
                    }}
                  </n-text>
                  <n-text v-if="item.status === 'downloading'" depth="3" style="font-size: 12px">
                    {{ item.transferred }} / {{ item.totalSize }}
                  </n-text>
                </n-flex>
                <n-progress
                  type="line"
                  :percentage="item.status === 'downloading' ? item.progress : 0"
                  :show-indicator="false"
                  :status="item.status === 'failed' ? 'error' : undefined"
                  :class="item.status === 'downloading' ? 'downloading-progress' : ''"
                  style="height: 4px"
                />
              </n-flex>
            </div>
            <!-- 操作按钮 -->
            <n-flex align="center" justify="center" class="actions">
              <n-button
                v-if="item.status === 'failed'"
                type="primary"
                secondary
                strong
                @click="downloadManager.retryDownload(item.song.id)"
              >
                <template #icon>
                  <SvgIcon name="Refresh" />
                </template>
              </n-button>
              <n-button type="error" secondary strong @click="handleRemoveDownload(item.song.id)">
                <template #icon>
                  <SvgIcon name="Close" />
                </template>
              </n-button>
            </n-flex>
          </div>
        </n-scrollbar>
      </div>
    </Transition>

    <!-- 已下载歌曲列表 -->
    <div class="downloaded-list-wrapper">
      <SongList :data="listData" :loading="loading" @removeSong="() => getDownloadMusic()" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore, useDataStore } from "@/stores";
import type { SongType } from "@/types/main";
import { formatSongsList } from "@/utils/format";
import { usePlayerController } from "@/core/player/PlayerController";
import type { MessageReactive } from "naive-ui";
import { useDownloadManager } from "@/core/resource/DownloadManager";
import SongList from "@/components/List/SongList.vue";
import { useI18n } from "vue-i18n";
import { trSetting } from "@/utils/i18nSettings";

const { t } = useI18n();
const dataStore = useDataStore();
const settingStore = useSettingStore();
const player = usePlayerController();
const downloadManager = useDownloadManager();

const loading = ref<boolean>(false);
const loadingMsg = ref<MessageReactive | null>(null);
const listData = ref<SongType[]>([]);

// 播放全部已下载歌曲
const handlePlayAll = () => {
  if (listData.value.length > 0) {
    player.updatePlayList(listData.value);
  }
};

// 排序正在下载的歌曲
const sortedDownloadingSongs = computed(() => {
  return [...dataStore.downloadingSongs].sort((a, b) => {
    const getPriority = (status: string) => {
      if (status === "downloading") return 1;
      if (status === "waiting") return 2;
      return 3;
    };
    return getPriority(a.status) - getPriority(b.status);
  });
});

// 是否存在失败的任务
const hasFailedDownloads = computed(() => {
  return dataStore.downloadingSongs.some((item) => item.status === "failed");
});

// 取消/移除下载
const handleRemoveDownload = (id: number) => {
  downloadManager.removeDownload(id);
  window.$message.success(trSetting("已取消下载任务"));
};

/**
 * 获取下载音乐
 * @param showTip 是否展示加载提示
 */
const getDownloadMusic = async (showTip: boolean = false) => {
  try {
    let path = settingStore.downloadPath;
    if (!path && window.electron?.ipcRenderer) {
      try {
        const defaultPath = await window.electron.ipcRenderer.invoke("get-default-download-dir");
        if (defaultPath) {
          settingStore.downloadPath = defaultPath;
          path = defaultPath;
        }
      } catch (err) {
        console.warn("获取默认下载目录失败:", err);
      }
    }

    if (!path) {
      if (showTip) window.$message.warning(trSetting("未配置下载目录"));
      return;
    }

    if (showTip) {
      loadingMsg.value = window.$message.loading(trSetting("正在读取下载列表..."), {
        duration: 0,
      });
    }

    loading.value = true;
    const result = await downloadManager.getDownloadedSongs();

    if (result) {
      listData.value = formatSongsList(result);
      if (showTip) {
        if (settingStore.language === "zh") {
          window.$message.success(`已找到 ${listData.value.length} 首歌曲`);
        } else if (settingStore.language === "en") {
          window.$message.success(`Found ${listData.value.length} track(s)`);
        } else {
          window.$message.success(`${listData.value.length} morceau(x) trouvé(s)`);
        }
      }
    } else {
      listData.value = [];
    }
  } catch (error) {
    console.error("Échec du chargement des téléchargements:", error);
    window.$message.error(trSetting("读取下载列表失败"));
  } finally {
    loading.value = false;
    loadingMsg.value?.destroy();
    loadingMsg.value = null;
  }
};

// 响应下载完成事件
const onDownloadCompleted = () => {
  getDownloadMusic(false);
};

// 刷新列表提供给子组件
provide("getDownloadMusic", () => getDownloadMusic(false));

onMounted(() => {
  getDownloadMusic();
  window.addEventListener("download-completed", onDownloadCompleted);
});

onActivated(() => {
  getDownloadMusic();
});

onUnmounted(() => {
  window.removeEventListener("download-completed", onDownloadCompleted);
});
</script>

<style lang="scss" scoped>
.download {
  display: flex;
  flex-direction: column;
  height: 100%;

  .title {
    display: flex;
    align-items: flex-end;
    line-height: normal;
    margin-top: 12px;
    margin-bottom: 20px;
    height: 40px;

    .keyword {
      font-size: 30px;
      font-weight: bold;
      margin-right: 12px;
      line-height: normal;
    }

    .status {
      font-size: 15px;
      font-weight: normal;
      line-height: 30px;

      .item {
        display: flex;
        align-items: center;
        opacity: 0.9;
        margin-right: 12px;

        .n-icon {
          margin-right: 4px;
        }
      }
    }
  }

  .menu {
    width: 100%;
    margin-bottom: 16px;
    height: 40px;

    .n-button {
      height: 40px;
      transition: all 0.3s var(--n-bezier);
    }

    .more {
      width: 40px;
    }
  }

  .downloading-container {
    margin-bottom: 20px;
    padding: 12px 16px;
    border-radius: 12px;
    background-color: rgba(var(--primary), 0.05);
    border: 1px solid rgba(var(--primary), 0.15);

    .section-header {
      margin-bottom: 10px;
    }

    .downloading-scroll {
      .download-item {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        border-radius: 10px;
        background-color: var(--surface-container-hex);
        margin-bottom: 8px;
        border: 1px solid rgba(var(--primary), 0.1);
        transition: border-color 0.2s ease;

        &:hover {
          border-color: rgba(var(--primary), 0.35);
        }

        .num {
          width: 32px;
          min-width: 32px;
          text-align: center;
        }

        .song-title {
          flex: 1;
          display: flex;
          align-items: center;
          overflow: hidden;
          padding: 0 12px;

          .cover {
            width: 42px;
            height: 42px;
            min-width: 42px;
            border-radius: 6px;
            overflow: hidden;
            margin-right: 10px;
          }

          .info {
            display: flex;
            flex-direction: column;
            overflow: hidden;
            flex: 1;

            .name {
              display: flex;
              align-items: center;

              .name-text {
                font-size: 14px;
                font-weight: 500;
              }
            }

            .artists {
              font-size: 12px;
            }
          }
        }

        .progress-col {
          flex: 1;
          max-width: 350px;
          padding: 0 16px;

          .downloading-progress {
            --n-fill-color: rgb(var(--primary));
          }
        }

        .actions {
          width: 80px;
          min-width: 80px;

          .n-button {
            border-radius: 6px;
          }
        }
      }
    }
  }

  .downloaded-list-wrapper {
    flex: 1;
    overflow: hidden;
    max-height: calc((var(--layout-height) - 132) * 1px);
  }
}
</style>
