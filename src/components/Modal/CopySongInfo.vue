<template>
  <div class="copy-song-info">
    <n-spin :show="loading" description="Récupération des détails...">
      <n-scrollbar style="max-height: 70vh">
        <n-form :size="'small'" ref="formRef">
          <n-form-item label="Titre">
            <n-input-group>
              <n-input :value="songInfo?.name" readonly placeholder="Aucun titre" />
              <n-button type="primary" strong secondary @click="copyText(songInfo?.name, 'Titre')">
                <template #icon>
                  <SvgIcon name="Copy" />
                </template>
              </n-button>
            </n-input-group>
          </n-form-item>
          <n-form-item label="Alias" v-if="songInfo?.alia">
            <n-input-group>
              <n-input :value="songInfo?.alia" readonly placeholder="Aucun alias" />
              <n-button type="primary" strong secondary @click="copyText(songInfo?.alia, 'Alias')">
                <template #icon>
                  <SvgIcon name="Copy" />
                </template>
              </n-button>
            </n-input-group>
          </n-form-item>
          <n-divider class="divider"> Artistes et crédits </n-divider>
          <template v-for="(artist, index) in artistsList" :key="index">
            <n-grid :cols="24" :x-gap="12">
              <n-form-item-gi
                :span="14"
                :label="artistsList.length > 1 ? `Artiste ${index + 1}` : 'Artiste'"
              >
                <n-input-group>
                  <n-input :value="artist.name" readonly />
                  <n-button
                    type="primary"
                    strong
                    secondary
                    @click="copyText(artist.name, 'Nom de l\'artiste')"
                  >
                    <template #icon>
                      <SvgIcon name="Copy" />
                    </template>
                  </n-button>
                </n-input-group>
              </n-form-item-gi>
              <n-form-item-gi :span="10" label="ID" v-if="artist.id">
                <n-input-group>
                  <n-input :value="String(artist.id)" readonly />
                  <n-button
                    type="primary"
                    strong
                    secondary
                    @click="copyText(String(artist.id), 'ID de l\'artiste')"
                  >
                    <template #icon>
                      <SvgIcon name="Copy" />
                    </template>
                  </n-button>
                </n-input-group>
              </n-form-item-gi>
            </n-grid>
          </template>
          <n-grid :cols="24" :x-gap="12" v-if="albumData">
            <n-form-item-gi :span="14" label="Album">
              <n-input-group>
                <n-input :value="albumData.name" readonly placeholder="Aucun album" />
                <n-button
                  type="primary"
                  strong
                  secondary
                  @click="copyText(albumData.name, 'Nom de l\'album')"
                >
                  <template #icon>
                    <SvgIcon name="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item-gi>
            <n-form-item-gi :span="10" label="ID" v-if="albumData.id">
              <n-input-group>
                <n-input :value="String(albumData.id)" readonly />
                <n-button
                  type="primary"
                  strong
                  secondary
                  @click="copyText(String(albumData.id), 'ID de l\'album')"
                >
                  <template #icon>
                    <SvgIcon name="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item-gi>
          </n-grid>
          <n-divider class="divider"> Informations du titre </n-divider>
          <n-grid :cols="24" :x-gap="12">
            <n-form-item-gi :span="12" label="ID du titre">
              <n-input-group>
                <n-input :value="String(songInfo?.id || '')" readonly />
                <n-button
                  type="primary"
                  strong
                  secondary
                  @click="copyText(String(songInfo?.id), 'ID du titre')"
                >
                  <template #icon>
                    <SvgIcon name="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item-gi>
            <n-form-item-gi :span="12" label="Durée">
              <n-input-group>
                <n-input :value="duration" readonly />
                <n-button type="primary" strong secondary @click="copyText(duration, 'Durée')">
                  <template #icon>
                    <SvgIcon name="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item-gi>
          </n-grid>
          <n-grid :cols="24" :x-gap="12">
            <n-form-item-gi :span="24" label="Date de sortie" v-if="publishTime">
              <n-input-group>
                <n-input :value="publishTime" readonly />
                <n-button
                  type="primary"
                  strong
                  secondary
                  @click="copyText(publishTime, 'Date de sortie')"
                >
                  <template #icon>
                    <SvgIcon name="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item-gi>
          </n-grid>
          <n-form-item label="Lien du titre">
            <n-input-group>
              <n-input :value="songLink" readonly placeholder="Aucun lien" />
              <n-button type="primary" strong secondary @click="copyText(songLink, 'Lien')">
                <template #icon>
                  <SvgIcon name="Copy" />
                </template>
              </n-button>
            </n-input-group>
          </n-form-item>
        </n-form>
      </n-scrollbar>
    </n-spin>
    <n-button block @click="handleCopyAll" :disabled="!songInfo" type="primary" secondary>
      Copier toutes les informations
    </n-button>
  </div>
</template>

<script setup lang="ts">
import type { SongType, MetaData } from "@/types/main";
import { songDetail } from "@/api/song";
import { formatSongsList } from "@/utils/format";
import { copyData, getShareUrl } from "@/utils/helper";
import { msToTime, formatTimestamp } from "@/utils/time";
import { trSetting } from "@/utils/i18nSettings";

const props = defineProps<{ songId: number; onClose: () => void }>();

const loading = ref(true);
const songInfo = ref<SongType | null>(null);

const artistsList = computed<MetaData[]>(() => {
  if (!songInfo.value) return [];
  if (Array.isArray(songInfo.value.artists)) return songInfo.value.artists;
  if (typeof songInfo.value.artists === "string") {
    return [{ name: songInfo.value.artists, id: 0 }];
  }
  return [];
});

const albumData = computed<MetaData | null>(() => {
  if (!songInfo.value) return null;
  if (typeof songInfo.value.album === "object") return songInfo.value.album;
  if (typeof songInfo.value.album === "string") {
    return { name: songInfo.value.album, id: 0 };
  }
  return null;
});

const duration = computed(() => {
  return songInfo.value?.duration ? msToTime(songInfo.value.duration) : "";
});

const publishTime = computed(() => {
  const createTime = songInfo.value?.createTime;
  return typeof createTime === "number" ? formatTimestamp(createTime, "YYYY-MM-DD", true) : "";
});

const songLink = computed(() => {
  return songInfo.value?.id ? getShareUrl("song", songInfo.value.id) : "";
});

// 获取歌曲详情
const fetchSongDetail = async () => {
  try {
    loading.value = true;
    const result = await songDetail(props.songId);
    const songs = formatSongsList(result?.songs);
    if (!songs || songs.length === 0) {
      window.$message.error("Échec de la récupération des détails du titre");
      return;
    }
    songInfo.value = songs[0];
  } catch (error) {
    console.error("获取歌曲详情失败：", error);
    window.$message.error("Échec de la récupération des détails du titre");
  } finally {
    loading.value = false;
  }
};

const copyText = (text: string | undefined, label: string) => {
  if (text) copyData(text, trSetting(`${label} copié`));
};

// 复制全部
const handleCopyAll = () => {
  if (!songInfo.value) return;
  const lines = [
    `Titre : ${songInfo.value.name}`,
    songInfo.value.alia ? `Alias : ${songInfo.value.alia}` : "",
    `Artiste(s) : ${artistsList.value.map((a) => `${a.name}${a.id ? ` (ID: ${a.id})` : ""}`).join(" / ")}`,
    albumData.value
      ? `Album : ${albumData.value.name}${albumData.value.id ? ` (ID: ${albumData.value.id})` : ""}`
      : "",
    `ID du titre : ${songInfo.value.id}`,
    duration.value ? `Durée : ${duration.value}` : "",
    publishTime.value ? `Date de sortie : ${publishTime.value}` : "",
    `Lien : ${songLink.value}`,
  ].filter((line) => line);

  copyData(lines, "Toutes les informations ont été copiées");
};

onMounted(() => {
  fetchSongDetail();
});
</script>

<style lang="scss" scoped>
.copy-song-info {
  display: flex;
  flex-direction: column;
  width: 100%;
  .divider {
    font-size: 14px;
    margin: 16px 0 12px 0;
  }
}
</style>
