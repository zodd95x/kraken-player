<template>
  <div class="like-type">
    <Transition name="fade" mode="out-in">
      <CoverList :data="listData" type="playlist" :hiddenCover="settingStore.hiddenCovers.like" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { CoverType } from "@/types/main";
import { useDataStore, useLocalStore, useSettingStore } from "@/stores";

const dataStore = useDataStore();
const localStore = useLocalStore();
const settingStore = useSettingStore();

// 歌单列表内容（本地/导入歌单与收藏歌单）
const listData = computed<CoverType[]>(() => {
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
</script>

<style lang="scss" scoped>
.type {
  margin-top: 20px;
  .n-tag {
    font-size: 14px;
    padding: 0 16px;
    &.choose {
      background-color: rgba(var(--primary), 0.14);
    }
  }
}
</style>
