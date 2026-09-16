import { DropdownOption } from "naive-ui";
import { SongType } from "@/types/main";
import {
  useStatusStore,
  useDataStore,
  useMusicStore,
  useSettingStore,
  useLocalStore,
} from "@/stores";
import { useDownloadManager } from "@/core/resource/DownloadManager";
import { usePlayerController } from "@/core/player/PlayerController";
import { renderIcon, copyData, getShareUrl } from "@/utils/helper";
import { deleteCloudSong, importCloudSong } from "@/api/cloud";
import {
  openCloudMatch,
  openCopySongInfo,
  openDownloadSong,
  openPlaylistAdd,
  openSongInfoEditor,
} from "@/utils/modal";
import { deleteSongs, isLogin } from "@/utils/auth";
import { songUrl } from "@/api/song";
import { dailyRecommendDislike } from "@/api/rec";
import { formatSongsList } from "@/utils/format";
import { trSetting } from "@/utils/i18nSettings";

/** 歌曲菜单 */
export const useSongMenu = () => {
  const router = useRouter();
  const dataStore = useDataStore();
  const musicStore = useMusicStore();
  const statusStore = useStatusStore();
  const settingStore = useSettingStore();
  const player = usePlayerController();
  const downloadManager = useDownloadManager();
  const localStore = useLocalStore();

  // 删除本地歌曲
  const deleteLocalSong = (song: SongType, emit?: (event: "removeSong", args: any[]) => void) => {
    if (emit === undefined) return;
    if (!song.path) return;
    window.$dialog.warning({
      title: trSetting("确认删除"),
      content: () =>
        h("div", { style: { marginTop: "20px" } }, [
          h("div", { style: { marginBottom: "10px", opacity: 0.8, fontSize: "12px" } }, song.path),
          h("div", null, [
            settingStore.language === "zh"
              ? `确定要从本地磁盘删除 `
              : settingStore.language === "en"
                ? `Are you sure you want to delete `
                : `Voulez-vous vraiment supprimer `,
            h("strong", null, song.name),
            settingStore.language === "zh"
              ? ` 吗？此操作无法撤销。`
              : settingStore.language === "en"
                ? ` from local disk? This action cannot be undone.`
                : ` du disque local ? Cette action est irréversible.`,
          ]),
        ]),
      positiveText: trSetting("删除"),
      negativeText: trSetting("取消"),
      onPositiveClick: async () => {
        const result = await window.electron.ipcRenderer.invoke("delete-file", song.path);
        if (result) {
          emit("removeSong", [song.id]);
          const currentPlayList = dataStore.playList;
          const songToRemoveIndex = currentPlayList.findIndex(
            (playSong) => playSong.id === song.id,
          );
          if (songToRemoveIndex !== -1) {
            player.removeSongIndex(songToRemoveIndex);
          }
          window.$message.success(`${song.name} ${trSetting("删除成功")}`);
        } else {
          window.$message.error(`${song.name} ${trSetting("删除失败")}`);
        }
      },
    });
  };

  // 删除云盘歌曲
  const deleteCloudSongData = (song: SongType, index: number) => {
    window.$dialog.warning({
      title: trSetting("确认删除"),
      content:
        settingStore.language === "zh"
          ? `确定要从云盘删除 ${song.name} 吗？此操作无法撤销。`
          : settingStore.language === "en"
            ? `Are you sure you want to delete ${song.name} from Cloud? This action cannot be undone.`
            : `Voulez-vous vraiment supprimer ${song.name} du Cloud ? Cette action est irréversible.`,
      positiveText: trSetting("删除"),
      negativeText: trSetting("取消"),
      onPositiveClick: async () => {
        const result = await deleteCloudSong(song.id);
        if (result.code == 200) {
          dataStore.cloudPlayList.splice(index, 1);
          dataStore.setCloudPlayList(dataStore.cloudPlayList);
          const currentPlayList = dataStore.playList;
          const songToRemoveIndex = currentPlayList.findIndex(
            (playSong) => playSong.id === song.id,
          );
          if (songToRemoveIndex !== -1) {
            player.removeSongIndex(songToRemoveIndex);
          }
          window.$message.success(trSetting("删除成功"));
        } else {
          window.$message.error(trSetting("删除失败"));
        }
      },
    });
  };

  // 导入至云盘
  const importSongToCloud = async (song: SongType) => {
    if (!song?.id) return;
    const songData = await songUrl(song.id);
    const songDetail = songData?.data?.[0];
    if (!songDetail) {
      window.$message.error(trSetting("无法获取歌曲信息"));
      return;
    }
    const { id, type, size, br, md5 } = songDetail;
    const result = await importCloudSong(song?.name, type, size, Math.floor(br / 1000), md5, id);
    if (result.code === 200) {
      const failed = result?.data?.failed?.[0];
      if (failed?.code !== -200) {
        window.$message.success(trSetting("成功导入至云盘"));
      } else {
        window.$message.error(failed?.msg || trSetting("导入失败"));
      }
    } else {
      window.$message.error(trSetting("导入失败"));
    }
  };

  // 每日推荐 - 不感兴趣
  const dislikeSong = async (song: SongType, index: number) => {
    if (!song?.id) return;
    const loadingMessage = window.$message.loading(trSetting("处理中..."), { duration: 0 });
    try {
      const result = await dailyRecommendDislike(song.id);
      loadingMessage.destroy();
      if (result.code === 200) {
        const currentList = [...musicStore.dailySongsData.list];
        currentList.splice(index, 1);
        if (result.data) {
          const formattedSong = formatSongsList([result.data])[0];
          currentList.splice(index, 0, formattedSong);
        }
        musicStore.dailySongsData = {
          list: currentList,
          timestamp: Date.now(),
        };
        window.$message.success(trSetting("已移出每日推荐"));
      } else {
        window.$message.error(trSetting("操作失败"));
      }
    } catch (error) {
      loadingMessage.destroy();
      window.$message.error(trSetting("操作失败"));
      console.error("不感兴趣操作失败：", error);
    }
  };

  // 判断两首歌是否相同
  const isSameSong = (song1: SongType, song2: SongType): boolean => {
    if (song1.id != null && song2.id != null) {
      return song1.id === song2.id;
    }
    if (song1.path && song2.path) {
      return song1.path === song2.path;
    }
    return false;
  };

  // 生成菜单选项
  const getMenuOptions = (
    song: SongType,
    index: number = -1,
    playListId: number = 0,
    isDailyRecommend: boolean = false,
    emit?: (event: "removeSong", args: any[]) => void,
  ): DropdownOption[] => {
    const userPlaylistsData = dataStore.userLikeData.playlists?.filter(
      (pl) => pl.userId === dataStore.userData.userId,
    );
    const type = song.type || "song";
    const isCloud = router.currentRoute.value.name === "cloud";
    const isLocal = !!song?.path;
    const isLoginNormal = isLogin() === 1;
    const isCurrent = isSameSong(musicStore.playSong, song);
    const isLocalPlaylist = localStore.isLocalPlaylist(playListId);
    const isUserPlaylist =
      (!!playListId && userPlaylistsData.some((pl) => pl.id === playListId)) || isLocalPlaylist;
    const isDownloading = dataStore.downloadingSongs.some((item) => item.song.id === song.id);

    return [
      {
        key: "play",
        label: trSetting("立即播放"),
        show: settingStore.contextMenuOptions.play,
        props: {
          onClick: () => player.addNextSong(song, true),
        },
        icon: renderIcon("Play", { size: 18 }),
      },
      {
        key: "play-next",
        label: trSetting("下一首播放"),
        show: settingStore.contextMenuOptions.playNext && !isCurrent && !statusStore.personalFmMode,
        props: {
          onClick: () => player.addNextSong(song, false),
        },
        icon: renderIcon("PlayNext", { size: 18 }),
      },
      {
        key: "playlist-add",
        label: trSetting("添加到歌单"),
        show: settingStore.contextMenuOptions.addToPlaylist && type !== "streaming",
        props: {
          onClick: () => openPlaylistAdd([song], isLocal),
        },
        icon: renderIcon("AddList", { size: 18 }),
      },
      {
        key: "line-1",
        type: "divider",
        show:
          settingStore.contextMenuOptions.play ||
          settingStore.contextMenuOptions.playNext ||
          settingStore.contextMenuOptions.addToPlaylist,
      },
      {
        key: "dislike",
        label: trSetting("不感兴趣"),
        show: settingStore.contextMenuOptions.dislike && isDailyRecommend && isLoginNormal,
        props: {
          onClick: () => dislikeSong(song, index),
        },
        icon: renderIcon("HeartBroken"),
      },
      {
        key: "more",
        label: trSetting("更多操作"),
        show: settingStore.contextMenuOptions.more,
        icon: renderIcon("Menu", { size: 18 }),
        children: [
          {
            key: "code-name",
            label: trSetting(
              `复制${type === "song" ? "歌曲" : type === "streaming" ? "流媒体" : "节目"}名称`,
            ),
            show: settingStore.contextMenuOptions.copyName,
            props: {
              onClick: () => copyData(song.name),
            },
            icon: renderIcon("Copy", { size: 18 }),
          },
          {
            key: "code-id",
            label: trSetting(
              `复制${type === "song" ? "歌曲" : type === "streaming" ? "流媒体" : "节目"} ID`,
            ),
            show: !isLocal,
            props: {
              onClick: () => copyData(song.id),
            },
            icon: renderIcon("Copy", { size: 18 }),
          },
          {
            key: "copy-song-info",
            label: trSetting("复制更多信息"),
            show: !isLocal && type === "song",
            props: {
              onClick: () => openCopySongInfo(song.id),
            },
            icon: renderIcon("FormatList", { size: 18 }),
          },
          {
            key: "share",
            label: trSetting(`分享${type === "song" ? "歌曲" : "节目"}链接`),
            show: !isLocal && type !== "streaming",
            props: {
              onClick: () =>
                copyData(getShareUrl(type, song.id), trSetting("已复制分享链接到剪贴板")),
            },
            icon: renderIcon("Share", { size: 18 }),
          },
          {
            key: "line-2",
            type: "divider",
            show: settingStore.contextMenuOptions.musicTagEditor && isLocal,
          },
          {
            key: "meta-edit",
            label: trSetting("音乐标签编辑"),
            show: settingStore.contextMenuOptions.musicTagEditor && isLocal,
            props: {
              onClick: () => {
                if (song.path) openSongInfoEditor(song);
              },
            },
            icon: renderIcon("EditNote", { size: 20 }),
          },
        ],
      },
      {
        key: "line-two",
        type: "divider",
        show: settingStore.contextMenuOptions.dislike || settingStore.contextMenuOptions.more,
      },
      {
        key: "cloud-import",
        label: trSetting("导入至云盘"),
        show:
          settingStore.contextMenuOptions.cloudImport &&
          !isCloud &&
          isLoginNormal &&
          type === "song" &&
          !isLocal,
        props: {
          onClick: () => importSongToCloud(song),
        },
        icon: renderIcon("Cloud"),
      },
      {
        key: "delete-playlist",
        label: trSetting("从歌单中删除"),
        show:
          settingStore.contextMenuOptions.deleteFromPlaylist &&
          emit !== undefined &&
          isUserPlaylist &&
          (isLocalPlaylist || isLoginNormal) &&
          !isCloud,
        props: {
          onClick: () =>
            deleteSongs(playListId!, [song.id], {
              callback: () => emit?.("removeSong", [song.id]),
              songName: song.name,
            }),
        },
        icon: renderIcon("Delete"),
      },
      {
        key: "delete-cloud",
        label: trSetting("从云盘中删除"),
        show: settingStore.contextMenuOptions.deleteFromCloud && isCloud,
        props: {
          onClick: () => deleteCloudSongData(song, index),
        },
        icon: renderIcon("Delete"),
      },
      {
        key: "delete-local",
        label: trSetting("从本地磁盘中删除"),
        show:
          settingStore.contextMenuOptions.deleteFromLocal &&
          emit !== undefined &&
          isLocal &&
          !isCurrent,
        props: {
          onClick: () => deleteLocalSong(song, emit),
        },
        icon: renderIcon("Delete"),
      },
      {
        key: "open-folder",
        label: trSetting("打开歌曲所在目录"),
        show: settingStore.contextMenuOptions.openFolder && isLocal,
        props: {
          onClick: () => window.electron.ipcRenderer.send("open-folder", song.path),
        },
        icon: renderIcon("SnippetFolder"),
      },
      {
        key: "cloud-match",
        label: trSetting("云盘歌曲纠正"),
        show: settingStore.contextMenuOptions.cloudMatch && isCloud,
        props: {
          onClick: () => openCloudMatch(song?.id, index),
        },
        icon: renderIcon("AutoFix"),
      },
      {
        key: "wiki",
        label: trSetting("音乐百科"),
        show: settingStore.contextMenuOptions.wiki && type === "song" && !isLocal,
        props: {
          onClick: () => router.push({ name: "song-wiki", query: { id: song.id } }),
        },
        icon: renderIcon("Info"),
      },
      {
        key: "search",
        label: trSetting("同名搜索"),
        show: settingStore.contextMenuOptions.search && settingStore.useOnlineService,
        props: {
          onClick: () => router.push({ name: "search", query: { keyword: song.name } }),
        },
        icon: renderIcon("Search"),
      },
      {
        key: "download",
        label: trSetting("下载歌曲"),
        show:
          settingStore.contextMenuOptions.download && !isLocal && type === "song" && !isDownloading,
        props: { onClick: () => openDownloadSong(song) },
        icon: renderIcon("Download"),
      },
      {
        key: "retry-download",
        label: trSetting("重试下载"),
        show: settingStore.contextMenuOptions.download && isDownloading,
        props: { onClick: () => downloadManager.retryDownload(song.id) },
        icon: renderIcon("Refresh"),
      },
    ];
  };

  return { getMenuOptions };
};
