<!-- 添加到歌单 -->
<template>
  <div class="playlist-add">
    <!-- 在线歌单 (仅在已登录网易云时可用) -->
    <template v-if="!isLocal && dataStore.userLoginStatus">
      <n-scrollbar style="max-height: 70vh">
        <n-list class="playlists-list" hoverable clickable>
          <!-- 新建歌单 -->
          <n-list-item class="playlist add" @click="openCreatePlaylist">
            <template #prefix>
              <SvgIcon name="Add" :size="20" />
            </template>
            <n-thing title="Créer une nouvelle playlist" />
          </n-list-item>
          <!-- 已有歌单 -->
          <n-list-item
            v-for="(item, index) in onlinePlaylists"
            :key="index"
            class="playlist"
            @click="addToOnlinePlaylist(Number(item?.id), index)"
          >
            <template #prefix>
              <n-image
                :src="item?.coverSize?.s || '/images/album.jpg?asset'"
                class="cover"
                preview-disabled
                lazy
                @load="coverLoaded"
              >
                <template #placeholder>
                  <div class="cover-loading">
                    <img class="loading-img" src="/images/album.jpg?asset" alt="loading-img" />
                  </div>
                </template>
              </n-image>
            </template>
            <n-thing :title="index === 0 ? 'Titres likés' : item.name">
              <template #description>
                <n-text depth="3" class="size">{{ item.count }} titre(s)</n-text>
              </template>
            </n-thing>
          </n-list-item>
        </n-list>
      </n-scrollbar>
    </template>
    <!-- 本地歌曲只能添加到本地歌单 -->
    <template v-else>
      <n-scrollbar style="max-height: 70vh">
        <n-list class="playlists-list" hoverable clickable>
          <!-- 新建本地歌单 -->
          <n-list-item class="playlist add" @click="openCreatePlaylist(true)">
            <template #prefix>
              <SvgIcon name="Add" :size="20" />
            </template>
            <n-thing title="Créer une nouvelle playlist" />
          </n-list-item>
          <!-- 本地歌单列表 -->
          <template v-if="localPlaylists.length > 0">
            <n-list-item
              v-for="item in localPlaylists"
              :key="item.id"
              class="playlist"
              @click="addToLocalPlaylist(item.id)"
            >
              <template #prefix>
                <n-image
                  :src="item.cover || '/images/album.jpg?asset'"
                  class="cover"
                  preview-disabled
                  lazy
                  @load="coverLoaded"
                >
                  <template #placeholder>
                    <div class="cover-loading">
                      <img class="loading-img" src="/images/album.jpg?asset" alt="loading-img" />
                    </div>
                  </template>
                </n-image>
              </template>
              <n-thing :title="item.name">
                <template #description>
                  <n-text depth="3" class="size">{{ item.songs.length }} titre(s)</n-text>
                </template>
              </n-thing>
            </n-list-item>
          </template>
          <n-empty v-else description="Aucune playlist locale" style="padding: 40px 0" />
        </n-list>
      </n-scrollbar>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import type { MessageReactive } from "naive-ui";
import { useDataStore, useLocalStore } from "@/stores";
import { coverLoaded } from "@/utils/helper";
import { playlistTracks } from "@/api/playlist";
import { debounce } from "lodash-es";
import { isLogin, updateUserLikePlaylist, updateUserLikeSongs } from "@/utils/auth";
import { openCreatePlaylist } from "@/utils/modal";

const props = defineProps<{
  data: SongType[];
  isLocal: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const dataStore = useDataStore();
const localStore = useLocalStore();

// 加载提示
const loadingMsg = ref<MessageReactive>();

// 在线歌单
const onlinePlaylists = computed(() => {
  return (
    dataStore.userLikeData.playlists.filter(
      (playlist) => playlist.userId === dataStore.userData?.userId,
    ) || []
  );
});

// 本地歌单
const localPlaylists = computed(() => localStore.localPlaylists);

// 添加到在线歌单
const addToOnlinePlaylist = debounce(
  async (id: number, index: number) => {
    if (isLogin() === 2) {
      window.$message.warning("Cette opération n'est pas supportée dans ce mode");
      return;
    }
    loadingMsg.value = window.$message.loading("Ajout des titres à la playlist...", {
      duration: 0,
    });
    const ids = props.data.map((item) => item.id).filter((item) => item !== 0);
    const result = await playlistTracks(id, ids);
    if (loadingMsg.value) loadingMsg.value.destroy();
    if (result.status === 200) {
      if (result.body?.code !== 200) {
        window.$message.error(result.body?.message || "Échec de l'ajout, veuillez réessayer");
        return;
      }
      emit("close");
      window.$message.success("Titres ajoutés à la playlist");
      if (index === 0) await updateUserLikeSongs();
      await updateUserLikePlaylist();
    } else {
      window.$message.error(result?.message || "Échec de l'ajout, veuillez réessayer");
    }
  },
  500,
  { leading: true, trailing: false },
);

// 添加到本地歌单
const addToLocalPlaylist = debounce(
  async (playlistId: number) => {
    loadingMsg.value = window.$message.loading("Ajout des titres à la playlist locale...", {
      duration: 0,
    });
    try {
      // 本地歌曲使用 id 的字符串形式
      const songIds = props.data.map((item) => item.id.toString());
      const result = await localStore.addSongsToLocalPlaylist(playlistId, songIds, props.data);
      if (loadingMsg.value) loadingMsg.value.destroy();
      if (result.success) {
        emit("close");
        if (result.addedCount > 0) {
          window.$message.success(`${result.addedCount} titre(s) ajouté(s) à la playlist locale`);
        } else {
          window.$message.info("Les titres sélectionnés sont déjà dans la playlist");
        }
      } else {
        window.$message.error("Échec de l'ajout, la playlist n'existe pas");
      }
    } catch (error) {
      if (loadingMsg.value) loadingMsg.value.destroy();
      window.$message.error("Échec de l'ajout, veuillez réessayer");
    }
  },
  500,
  { leading: true, trailing: false },
);
</script>

<style lang="scss" scoped>
.playlists-list {
  .playlist {
    border-radius: 8px;
    :deep(.n-list-item__prefix) {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 50px;
      height: 50px;
      border-radius: 8px;
      background-color: var(--n-border-color);
      overflow: hidden;
      transition: background-color 0.3s;
    }
  }
}
.n-empty {
  padding: 40px 0;
}
</style>
