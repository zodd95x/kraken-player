<template>
  <div class="cover-manager">
    <n-scrollbar style="max-height: 400px">
      <div class="list">
        <n-card
          v-for="item in coverItems"
          :key="item.key"
          :content-style="{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
          }"
          class="item"
        >
          <n-text class="name">{{ item.name }}</n-text>
          <n-switch
            :value="!settingStore.hiddenCovers[item.key]"
            :round="false"
            @update:value="(val) => (settingStore.hiddenCovers[item.key] = !val)"
          />
        </n-card>
      </div>
    </n-scrollbar>
    <div class="footer">
      <n-button @click="toggleAll">
        {{ isAllHidden ? "Tout afficher" : "Tout masquer" }}
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSettingStore } from "@/stores";
import type { SettingState } from "@/stores/setting";
import { NScrollbar, NButton } from "naive-ui";

const settingStore = useSettingStore();

type CoverItem = {
  key: keyof SettingState["hiddenCovers"];
  name: string;
};

// 翻译封面项列表
const coverItems: CoverItem[] = [
  { key: "home", name: "Recommandations" },
  { key: "playlist", name: "Playlists" },
  { key: "toplist", name: "Classements" },
  { key: "artist", name: "Artistes" },
  { key: "new", name: "Nouveautés" },
  { key: "personalFM", name: "Radio personnelle" },
  { key: "player", name: "Lecteur" },
  { key: "list", name: "Détails de playlist / Liste de morceaux" },
  { key: "artistDetail", name: "Détails de l'artiste" },
  { key: "radio", name: "Podcasts et radios" },
  { key: "album", name: "Albums" },
  { key: "like", name: "Mes favoris" },
  { key: "video", name: "Vidéos" },
  { key: "videoDetail", name: "Détails de la vidéo" },
];

const isAllHidden = computed(() => {
  return coverItems.every((item) => settingStore.hiddenCovers[item.key]);
});

const toggleAll = () => {
  const target = !isAllHidden.value;
  coverItems.forEach((item) => {
    settingStore.hiddenCovers[item.key] = target;
  });
};
</script>

<style scoped lang="scss">
.cover-manager {
  display: flex;
  flex-direction: column;
  .list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-right: 12px;
    .item {
      border-radius: 8px;
      .name {
        font-size: 16px;
        line-height: normal;
      }
      .n-switch {
        margin-left: auto;
      }
    }
  }
  .footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
