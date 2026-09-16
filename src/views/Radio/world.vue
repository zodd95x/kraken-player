<template>
  <div class="world-radio-page">
    <!-- 头部区域 -->
    <div class="radio-header">
      <div class="header-left">
        <div class="title-row">
          <div class="icon-wrap">
            <SvgIcon name="Radio" :size="28" />
          </div>
          <n-h2 class="title">{{ t("radio.title") }}</n-h2>
          <n-tag :bordered="false" round size="small" type="primary" class="count-tag">
            {{ stations.length }} {{ t("radio.stations_count") }}
          </n-tag>
        </div>
        <n-text depth="3" class="subtitle">
          {{ t("radio.subtitle") }}
        </n-text>
      </div>

      <!-- 国家选择下拉面板 (深色长卡片风格) -->
      <div class="header-right">
        <CountrySelectDropdown v-model="selectedCountry" />
      </div>
    </div>

    <!-- 快捷国家推荐胶囊 -->
    <div class="quick-countries">
      <n-space size="small">
        <n-button
          v-for="country in topCountries"
          :key="country.code"
          size="small"
          round
          :type="selectedCountry === country.code ? 'primary' : 'default'"
          :secondary="selectedCountry !== country.code"
          @click="selectedCountry = country.code"
        >
          <span>{{ getCountryDisplayName(country.code) }}</span>
        </n-button>
      </n-space>
    </div>

    <!-- 电台卡片网格 -->
    <Transition name="fade" mode="out-in">
      <!-- 加载骨架屏 -->
      <div v-if="loading" class="radio-grid-wrap">
        <n-grid cols="2 480:3 768:4 1024:5 1280:6" :x-gap="16" :y-gap="20">
          <n-gi v-for="n in 18" :key="n">
            <div class="station-skeleton">
              <n-skeleton class="skeleton-cover" />
              <n-skeleton text round style="margin-top: 10px; width: 80%" />
              <n-skeleton text round style="margin-top: 6px; width: 50%" />
            </div>
          </n-gi>
        </n-grid>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error && stations.length === 0" class="empty-wrap">
        <n-empty :description="t('radio.error_loading')">
          <template #extra>
            <n-button round secondary @click="fetchStations">
              {{ t("common.reset") }}
            </n-button>
          </template>
        </n-empty>
      </div>

      <!-- 电台列表 -->
      <div v-else-if="stations.length > 0" class="radio-grid-wrap">
        <n-grid cols="2 480:3 768:4 1024:5 1280:6" :x-gap="16" :y-gap="20">
          <n-gi v-for="station in stations" :key="station.stationuuid">
            <div
              :class="['station-card', { 'is-playing': isCurrentStation(station) }]"
              @click="handleStationClick(station)"
            >
              <!-- 封面与徽章 -->
              <div class="cover-wrapper">
                <s-image
                  :src="station.favicon"
                  default-src="/images/album.jpg?asset"
                  class="cover-img"
                  object-fit="cover"
                />

                <!-- 实时直播标识 -->
                <div class="live-badge">
                  <span class="live-dot" />
                  <span>{{ t("radio.live") }}</span>
                </div>
                <!-- 播放操作按钮 -->
                <div class="play-action-btn" @click.stop="handleStationClick(station)">
                  <n-button circle type="primary" class="action-btn">
                    <template #icon>
                      <SvgIcon
                        :size="20"
                        :name="isCurrentStation(station) && isPlaying ? 'Pause' : 'Play'"
                      />
                    </template>
                  </n-button>
                </div>
              </div>

              <!-- 电台信息 -->
              <div class="info-wrapper">
                <n-text strong class="station-name text-hidden">
                  {{ station.name }}
                </n-text>
                <div class="station-meta text-hidden">
                  <n-text depth="3" class="meta-item">
                    {{ getCountryDisplayName(station.countrycode) }}
                  </n-text>
                  <n-text v-if="station.codec" depth="3" class="codec-tag">
                    {{ station.codec }}
                  </n-text>
                </div>
              </div>
            </div>
          </n-gi>
        </n-grid>
      </div>

      <!-- 空数据状态 -->
      <div v-else class="empty-wrap">
        <n-empty :description="t('common.empty')" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import {
  POPULAR_COUNTRIES,
  getStationsByCountry,
  type RadioStation,
  type CountryOption,
} from "@/api/radioBrowser";
import { getCountryNameByCode } from "@/constants/countries";
import CountrySelectDropdown from "@/components/UI/CountrySelectDropdown.vue";
import { usePlayerController } from "@/core/player/PlayerController";
import { useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { QualityType, type SongType } from "@/types/main";
import SvgIcon from "@/components/Global/SvgIcon.vue";

const { t } = useI18n();
const player = usePlayerController();
const musicStore = useMusicStore();
const settingStore = useSettingStore();
const statusStore = useStatusStore();

// 当前选中的国家（手动选择存入设置，下次打开保留，默认法国）
const selectedCountry = ref<string>(settingStore.radioCountry || "FR");
const stations = ref<RadioStation[]>([]);
const loading = ref<boolean>(false);
const error = ref<boolean>(false);

// 快捷展示的前 8 个热门国家
const topCountries = computed<CountryOption[]>(() => POPULAR_COUNTRIES.slice(0, 8));

// 获取国家显示名称
const getCountryDisplayName = (code: string): string => {
  return getCountryNameByCode(code, settingStore.language);
};

// 判断指定电台是否为当前正在播放的项目
const isCurrentStation = (station: RadioStation): boolean => {
  const stationUrl = station.url_resolved || station.url;
  return musicStore.playSong?.streamUrl === stationUrl;
};

// 当前播放器播放状态
const isPlaying = computed<boolean>(() => statusStore.playStatus);

// 将电台转换为播放器规范的 SongType
const transformToSong = (station: RadioStation): SongType => {
  const stationUrl = station.url_resolved || station.url;
  // 基于 stationuuid 生成正整数 ID
  let numericId = 0;
  for (let i = 0; i < station.stationuuid.length; i++) {
    numericId = (numericId << 5) - numericId + station.stationuuid.charCodeAt(i);
    numericId |= 0;
  }
  numericId = Math.abs(numericId) || Date.now();

  return {
    id: numericId,
    name: station.name.trim(),
    artists: getCountryDisplayName(station.countrycode),
    album: t("radio.title"),
    cover: station.favicon || "/images/record.png?asset",
    duration: 0,
    free: 0,
    mv: null,
    type: "streaming",
    streamUrl: stationUrl,
    quality: QualityType.SQ,
  };
};

// 获取电台数据
const fetchStations = async () => {
  loading.value = true;
  error.value = false;
  try {
    const list = await getStationsByCountry(selectedCountry.value, 80);
    stations.value = list;
  } catch (err) {
    console.error("Failed to load stations:", err);
    error.value = true;
    stations.value = [];
  } finally {
    loading.value = false;
  }
};

// 监听国家切换并自动加载
watch(selectedCountry, () => {
  settingStore.radioCountry = selectedCountry.value;
  fetchStations();
});

// 点击电台播放
const handleStationClick = async (station: RadioStation) => {
  const stationUrl = station.url_resolved || station.url;
  if (!stationUrl) {
    window.$message.error(t("radio.error_loading"));
    return;
  }

  // 如果已经在播放，切换播放/暂停
  if (isCurrentStation(station)) {
    player.playOrPause();
    return;
  }

  const targetSong = transformToSong(station);
  // 转换全部电台为播放列表以支持切歌
  const songList = stations.value.map(transformToSong);

  // 更新播放列表并立即播放
  await player.updatePlayList(songList, targetSong, 888888, {
    showTip: true,
    play: true,
  });
};

onMounted(() => {
  fetchStations();
});
</script>

<style lang="scss" scoped>
.world-radio-page {
  width: 100%;
  padding-bottom: 40px;

  .radio-header {
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
        margin-top: 6px;
        display: block;
        font-size: 13px;
      }
    }

    .header-right {
      display: flex;
      align-items: center;
    }
  }

  .quick-countries {
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .radio-grid-wrap {
    width: 100%;
  }

  .station-card {
    cursor: pointer;
    border-radius: 12px;
    padding: 12px;
    transition: background-color 0.25s ease;
    position: relative;

    &:hover {
      background-color: var(--card-color);

      .play-action-btn {
        opacity: 1;
        transform: translateY(0);
      }
    }

    &.is-playing {
      background-color: var(--card-color);
    }

    .cover-wrapper {
      position: relative;
      width: 100%;
      aspect-ratio: 1 / 1;
      border-radius: 12px;
      overflow: hidden;
      background-color: var(--cover-color);

      .cover-img {
        width: 100%;
        height: 100%;
      }

      .live-badge {
        position: absolute;
        left: 8px;
        top: 8px;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 20px;
        background-color: rgba(239, 68, 68, 0.9);
        color: #fff;
        font-size: 11px;
        z-index: 2;
        .live-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: #fff;
          animation: pulse 1.5s infinite;
        }
      }

      .play-action-btn {
        position: absolute;
        right: 10px;
        bottom: 10px;
        opacity: 0;
        transform: translateY(6px);
        transition: all 0.25s ease-in-out;
        z-index: 3;

        .action-btn {
          width: 40px;
          height: 40px;
          background-color: var(--primary-color);
          color: #fff;
          border: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

          :deep(.n-icon) {
            color: #fff;
          }
        }
      }
    }

    .info-wrapper {
      margin-top: 10px;

      .station-name {
        display: block;
        font-size: 14px;
        line-height: 1.4;
      }

      .station-meta {
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;

        .codec-tag {
          text-transform: uppercase;
          opacity: 0.7;
        }
      }
    }
  }

  .station-skeleton {
    .skeleton-cover {
      width: 100%;
      aspect-ratio: 1 / 1;
      border-radius: 12px;
    }
  }

  .empty-wrap {
    padding: 60px 0;
    display: flex;
    justify-content: center;
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
