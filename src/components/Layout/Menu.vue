<!-- 主菜单 -->
<template>
  <n-menu
    ref="menuRef"
    v-model:value="menuActiveKey"
    v-model:expanded-keys="settingStore.menuExpandedKeys"
    :class="{ cover: settingStore.menuShowCover }"
    :indent="0"
    :root-indent="26"
    :collapsed="statusStore.menuCollapsed && isDesktop"
    :collapsed-width="64"
    :collapsed-icon-size="22"
    :options="menuOptions"
    :render-label="renderMenuLabel"
    @update:value="menuUpdate"
  />
</template>

<script setup lang="ts">
import { useMobile } from "@/composables/useMobile";
import { usePlayerController } from "@/core/player/PlayerController";
import {
  useDataStore,
  useLocalStore,
  useMusicStore,
  useSettingStore,
  useStatusStore,
} from "@/stores";
import { isElectron } from "@/utils/env";
import { renderIcon } from "@/utils/helper";
import { openCreatePlaylist } from "@/utils/modal";
import {
  type MenuGroupOption,
  type MenuInst,
  type MenuOption,
  NAvatar,
  NBadge,
  NButton,
  NEllipsis,
  NText,
} from "naive-ui";
import { RouterLink, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

const emit = defineEmits<{ (e: "menu-click", key: string): void }>();

const { t } = useI18n();
const router = useRouter();
const dataStore = useDataStore();
const localStore = useLocalStore();
const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();
const player = usePlayerController();

const { isDesktop } = useMobile();

// 菜单数据
const menuRef = ref<MenuInst | null>(null);
const menuActiveKey = ref<string | number>((router.currentRoute.value.name as string) || "home");

// 菜单内容
const menuOptions = computed<MenuOption[] | MenuGroupOption[]>(() => {
  return settingStore.useOnlineService
    ? [
        {
          key: "home",
          link: "home",
          label: () => t("nav.home"),
          icon: renderIcon("Home", {
            style: {
              transform: "translateY(-1px)",
            },
          }),
        },
        {
          key: "discover",
          link: "discover",
          label: () => t("nav.discover"),
          show: !settingStore.sidebarHide.hideDiscover,
          icon: renderIcon("Discover", {
            style: {
              transform: "translateY(-1px)",
            },
          }),
        },
        {
          key: "radio-hot",
          link: "radio-hot",
          label: () => t("home.podcasts"),
          show: !settingStore.sidebarHide.hideRadioHot,
          icon: renderIcon("Record", {
            style: {
              transform: "translateY(-1px)",
            },
          }),
        },
        {
          key: "radio-world",
          link: "radio-world",
          label: () => t("nav.world_radio"),
          icon: renderIcon("Radio", {
            style: {
              transform: "translateY(-1px)",
            },
          }),
        },
        {
          key: "divider",
          type: "divider",
        },
        {
          key: "like-songs",
          link: "like-songs",
          label: () => t("home.liked_songs"),
          icon: renderIcon("Favorite"),
        },
        {
          key: "like",
          link: "like",
          label: () => t("nav.import_playlists"),
          show: !settingStore.sidebarHide.hideLike,
          icon: renderIcon("AddList"),
        },
        {
          key: "download",
          label: () =>
            h(
              NBadge,
              {
                show: dataStore.downloadingSongs.length > 0,
                value: dataStore.downloadingSongs.length,
                offset: [22, 13],
              },
              () => t("nav.downloads"),
            ),
          show: isElectron && !settingStore.sidebarHide.hideDownload,
          icon: renderIcon("Download"),
        },
        {
          key: "streaming",
          link: "streaming",
          label: "Web Stream",
          show: settingStore.streamingEnabled,
          icon: renderIcon("Stream"),
        },
        {
          key: "local",
          link: "local",
          label: () => t("nav.local"),
          show: isElectron && !settingStore.sidebarHide.hideLocal,
          icon: renderIcon("FolderMusic"),
        },
        {
          key: "history",
          link: "history",
          label: () => t("nav.history"),
          show: !settingStore.sidebarHide.hideHistory,
          icon: renderIcon("History"),
        },
        {
          key: "divider-two",
          type: "divider",
        },
        {
          key: "user-playlists",
          show: !settingStore.sidebarHide.hideUserPlaylists,
          icon: statusStore.menuCollapsed ? renderIcon("PlaylistAdd") : undefined,
          label: () =>
            h("div", { class: "user-list" }, [
              h(NText, { depth: 3 }, () => t("nav.playlists")),
              h(NButton, {
                type: "tertiary",
                round: true,
                strong: true,
                secondary: true,
                renderIcon: renderIcon("Add"),
                onclick: (event: Event) => {
                  event.stopPropagation();
                  openCreatePlaylist(true);
                },
              }),
            ]),
          children: [...localPlaylistMenu.value],
        },
      ]
    : [
        {
          key: "local",
          link: "local",
          label: () => t("nav.local"),
          show: isElectron,
          icon: renderIcon("FolderMusic"),
        },
        {
          key: "local-albums",
          link: "local-albums",
          label: () => t("nav.newSongs"),
          show:
            isElectron &&
            (localStore.localSongs?.length > 0 || settingStore.localFilesPath?.length > 0),
          icon: renderIcon("Album"),
        },
        {
          key: "local-artists",
          link: "local-artists",
          label: () => t("nav.artists"),
          show:
            isElectron &&
            (localStore.localSongs?.length > 0 || settingStore.localFilesPath?.length > 0),
          icon: renderIcon("Person"),
        },
        {
          key: "divider",
          type: "divider",
          show: localPlaylistMenu.value.length > 0,
        },
        // 本地歌单
        {
          key: "local-playlists",
          show: localPlaylistMenu.value.length > 0,
          icon: statusStore.menuCollapsed ? renderIcon("PlaylistAdd") : undefined,
          label: () =>
            h("div", { class: "user-list" }, [
              h(NText, { depth: 3 }, () => "本地歌单"),
              h(NButton, {
                type: "tertiary",
                round: true,
                strong: true,
                secondary: true,
                renderIcon: renderIcon("Add"),
                onclick: (event: Event) => {
                  event.stopPropagation();
                  openCreatePlaylist(true);
                },
              }),
            ]),
          children: [...localPlaylistMenu.value],
        },
      ];
});

// 本地歌单菜单
const localPlaylistMenu = computed<MenuOption[]>(() => {
  const playlists = localStore.localPlaylists;
  if (!playlists || playlists.length === 0) return [];
  return playlists.map((playlist) => ({
    key: `local-${playlist.id}`,
    label: () =>
      settingStore.menuShowCover
        ? h("div", { class: "pl-cover" }, [
            h(NAvatar, {
              src: playlist.cover || "/images/album.jpg?asset",
              fallbackSrc: "/images/album.jpg?asset",
              lazy: true,
            }),
            h(NEllipsis, null, () => playlist.name),
          ])
        : h(NEllipsis, null, () => playlist.name),
    icon: settingStore.menuShowCover ? undefined : renderIcon("PlayList"),
  }));
});

// 渲染菜单路由
const renderMenuLabel = (option: MenuOption) => {
  const getLabel = () =>
    typeof option.label === "function" ? (option.label as () => any)() : option.label;
  // 路由链接
  if ("link" in option) {
    return h(RouterLink, { to: { name: option.link as string } }, getLabel);
  }
  return getLabel();
};

// 菜单项更改
const menuUpdate = (key: string, item: MenuOption) => {
  emit("menu-click", key);
  // 私人漫游
  if (key === "personal-fm") {
    if (!musicStore.personalFMSong?.id) {
      window.$message.error("开启私人漫游出错，请重试");
      return;
    }
    if (statusStore.personalFmMode) {
      player.play();
    } else {
      // 更改播放模式
      statusStore.personalFmMode = true;
      statusStore.shuffleMode = "off";
      player.playSong();
    }
    statusStore.showFullPlayer = true;
    window.$message.info("已开启私人漫游", { icon: renderIcon("Radio") });
    return;
  }
  if (typeof key === "number") {
    router.push({
      name: "playlist",
      query: { id: item.key },
    });
  } else if (typeof key === "string" && key.startsWith("local-")) {
    // 检查是否为本地歌单（16位数字ID）
    const localId = key.replace("local-", "");
    const isLocalPlaylist = localStore.isLocalPlaylist(localId);
    if (isLocalPlaylist) {
      router.push({
        name: "playlist",
        query: { id: localId },
      });
    }
  } else {
    switch (key) {
      case "like-songs":
        router.push({
          name: "like-songs",
        });
        break;
      // 下载管理
      case "download":
        router.push({
          name: "download",
        });
        break;
      default:
        break;
    }
  }
};

// 选中菜单项
const checkMenuItem = () => {
  // 当前路由名称
  let routerName =
    (router.currentRoute.value.matched?.[0]?.name as string) ||
    (router.currentRoute.value?.name as string);
  if (!routerName) return;
  // 处理路由名称
  const prefixMap = [
    { prefix: "discover-", name: "discover" },
    // 本地模式下不合并 local- 前缀的路由
    { prefix: "local-", name: "local", skipInLocalMode: true },
    { prefix: "like-", name: "like", exclude: "like-songs" },
    { prefix: "download-", name: "download" },
    { prefix: "streaming-", name: "streaming" },
  ];
  for (const item of prefixMap) {
    if (item.skipInLocalMode && !settingStore.useOnlineService) continue;
    if (routerName.startsWith(item.prefix) && (!item.exclude || routerName !== item.exclude)) {
      routerName = item.name;
      break;
    }
  }
  // 显示菜单
  menuRef.value?.showOption(routerName);
  // 本地模式下处理
  if (!settingStore.useOnlineService) {
    if (routerName === "local-songs" || routerName === "local-folders") {
      routerName = "local";
    }
  }
  // 高亮菜单
  switch (routerName) {
    case "playlist": {
      // 获取歌单 id
      const playlistId = Number(router.currentRoute.value.query.id || 0);
      // 是否处于用户歌单
      const isUserPlaylist = dataStore.userLikeData.playlists.some(
        (playlist) => playlist?.id === playlistId,
      );
      // 是否为本地歌单
      const isLocalPlaylist = localStore.isLocalPlaylist(playlistId);
      if (!playlistId) menuActiveKey.value = "home";
      if (isUserPlaylist) {
        menuActiveKey.value = Number(playlistId);
        menuRef.value?.showOption(playlistId);
      } else if (isLocalPlaylist) {
        menuActiveKey.value = `local-${playlistId}`;
        menuRef.value?.showOption(`local-${playlistId}`);
      } else {
        menuActiveKey.value = "home";
      }
      break;
    }
    default:
      menuActiveKey.value = routerName;
      break;
  }
};

// 本地模式下自动展开本地歌单
onMounted(() => {
  if (!settingStore.useOnlineService && localPlaylistMenu.value.length > 0) {
    if (!settingStore.menuExpandedKeys.includes("local-playlists")) {
      settingStore.menuExpandedKeys.push("local-playlists");
    }
  }
});

// 监听路由
watch(
  () => [router.currentRoute.value, dataStore.userLikeData.playlists],
  () => checkMenuItem(),
);
</script>

<style lang="scss" scoped>
.n-menu {
  padding-bottom: 14px;
  :deep(.n-menu-item) {
    .n-menu-item-content {
      &::before {
        border-left: 4px solid transparent;
        transition:
          border 0.3s var(--n-bezier),
          background-color 0.3s var(--n-bezier);
      }
      &.n-menu-item-content--selected {
        .n-text {
          color: var(--primary-hex);
        }
        &::before {
          border-left-color: var(--n-item-text-color-active);
        }
      }
    }
  }
  &.cover {
    :deep(.n-submenu-children) {
      --n-item-height: 50px;
    }
  }
}
</style>

<style lang="scss">
.user-liked {
  display: flex;
  align-items: center;
  justify-content: space-between;
  .n-button {
    margin-left: 12px;
    --n-height: 30px;
    --n-padding: 0 16px;
    --n-icon-size: 20px;
  }
}
.user-list {
  display: flex;
  align-items: center;
  gap: 8px;
  .n-text {
    font-size: 0.93em;
  }
  .n-button {
    --n-height: 22px;
    --n-padding: 0 12px;
    --n-icon-size: 12px;
  }
}
.pl-cover {
  display: flex;
  align-items: center;
  .n-avatar {
    width: 34px;
    height: 34px;
    min-width: 34px;
    margin-right: 12px;
    border-radius: 8px;
  }
}
.roaming-label {
  .n-button {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
  }
  &:hover {
    .n-button {
      opacity: 1;
      pointer-events: auto;
    }
  }
}
</style>
