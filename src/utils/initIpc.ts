import { usePlayerController } from "@/core/player/PlayerController";
import { useAudioManager } from "@/core/player/AudioManager";
import * as playerIpc from "@/core/player/PlayerIpc";
import { useDataStore, useLocalStore, useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import type { SettingType, SongType } from "@/types/main";
import { TASKBAR_IPC_CHANNELS, type TaskbarLyricSettings } from "@/types/shared";
import { handleProtocolUrl } from "@/utils/protocol";
import { cloneDeep } from "lodash-es";
import { toRaw } from "vue";
import { toLikeSong } from "./auth";
import { sendTaskbarCoverColor, resolveTaskbarThemeColor } from "./color";
import { isElectron, isMac } from "./env";
import { getPlayerInfoObj, formatSongsList } from "./format";
import { searchResult } from "@/api/search";
import { songDetail } from "@/api/song";
import { openSetting } from "./modal";

// 全局 IPC 事件
const initIpc = () => {
  try {
    if (!isElectron) return;
    const player = usePlayerController();
    const settingStore = useSettingStore();

    // 同步语言设置至主进程托盘
    window.electron.ipcRenderer.send("language-change", settingStore.language || "en");

    // 初始化默认下载目录
    if (!settingStore.downloadPath) {
      window.electron.ipcRenderer
        .invoke("get-default-download-dir")
        .then((defaultPath: string) => {
          if (defaultPath && !settingStore.downloadPath) {
            settingStore.downloadPath = defaultPath;
          }
        })
        .catch((err) => {
          console.error("获取默认下载目录失败:", err);
        });
    }

    // 播放
    window.electron.ipcRenderer.on("play", () => player.play());
    // 暂停
    window.electron.ipcRenderer.on("pause", () => player.pause());
    // 播放或暂停
    window.electron.ipcRenderer.on("playOrPause", () => player.playOrPause());
    // 上一曲
    window.electron.ipcRenderer.on("playPrev", () => player.nextOrPrev("prev"));
    // 下一曲
    window.electron.ipcRenderer.on("playNext", () => player.nextOrPrev("next"));
    // 音量加
    window.electron.ipcRenderer.on("volumeUp", () => player.setVolume("up"));
    // 音量减
    window.electron.ipcRenderer.on("volumeDown", () => player.setVolume("down"));
    // 精确设置音量
    window.electron.ipcRenderer.on("setVolume", (_, volume: number) => {
      if (typeof volume === "number" && !isNaN(volume)) {
        player.setVolume(volume);
      }
    });
    // 精确跳转进度 (毫秒)
    window.electron.ipcRenderer.on("seekTo", (_, positionMs: number) => {
      if (typeof positionMs === "number" && !isNaN(positionMs)) {
        player.setSeek(positionMs);
      }
    });
    // 快进 / 快退
    window.electron.ipcRenderer.on("seekForward", () => player.seekBy(5000));
    window.electron.ipcRenderer.on("seekBackward", () => player.seekBy(-5000));
    // 播放模式切换
    window.electron.ipcRenderer.on("changeRepeat", (_, mode) => player.toggleRepeat(mode));
    window.electron.ipcRenderer.on("toggleShuffle", (_, mode) => player.toggleShuffle(mode));
    // 喜欢歌曲
    window.electron.ipcRenderer.on("toggle-like-song", async () => {
      const dataStore = useDataStore();
      const musicStore = useMusicStore();
      await toLikeSong(musicStore.playSong, !dataStore.isLikeSong(musicStore.playSong.id));
    });
    // 开启设置
    window.electron.ipcRenderer.on("openSetting", (_, type: SettingType, scrollTo?: string) =>
      openSetting(type, scrollTo),
    );
    // 桌面歌词开关
    window.electron.ipcRenderer.on("desktop-lyric:toggle", () => player.toggleDesktopLyric());
    // 显式关闭桌面歌词
    window.electron.ipcRenderer.on("desktop-lyric:close", () => player.setDesktopLyricShow(false));
    // 任务栏歌词开关
    window.electron.ipcRenderer.on("toggle-taskbar-lyric", async () => {
      if (isMac) {
        const currentMacLyricEnabled = await window.electron.ipcRenderer.invoke(
          "store-get",
          "macos.statusBarLyric.enabled",
        );
        const newState = !currentMacLyricEnabled;
        window.electron.ipcRenderer.send("macos-lyric:toggle", newState);
        const message = `${newState ? "已开启" : "已关闭"}状态栏歌词`;
        window.$message.success(message);
      } else {
        player.toggleTaskbarLyric();
      }
    });

    // 监听主进程发来的 macOS 状态栏歌词启用状态更新
    window.electron.ipcRenderer.on(
      "setting:update-macos-lyric-enabled",
      (_event, enabled: boolean) => {
        const settingStore = useSettingStore();
        settingStore.macos.statusBarLyric.enabled = enabled;
      },
    );

    // 给任务栏歌词初始数据（默认空歌曲 id 为 0，按空处理避免僵尸残留）
    window.electron.ipcRenderer.on(TASKBAR_IPC_CHANNELS.REQUEST_DATA, async () => {
      const musicStore = useMusicStore();
      const statusStore = useStatusStore();

      const hasRealSong = !!musicStore.playSong?.id;
      const { name, artist } = getPlayerInfoObj() || {};
      const cover = musicStore.getSongCover("s") || "";

      const configPayload: TaskbarLyricSettings =
        (await window.electron.ipcRenderer.invoke(TASKBAR_IPC_CHANNELS.GET_OPTION)) ?? {};

      const hasYrc = (musicStore.songLyric.yrcData?.length ?? 0) > 0;
      const lyricsPayload = {
        lines: toRaw(hasYrc ? musicStore.songLyric.yrcData : musicStore.songLyric.lrcData) ?? [],
        type: (hasYrc ? "word" : "line") as "line" | "word",
      };

      playerIpc.broadcastTaskbarState({
        type: "full-hydration",
        data: {
          track: {
            title: hasRealSong ? name || "" : "",
            artist: hasRealSong ? artist || "" : "",
            cover: hasRealSong ? cover : "",
          },
          language: settingStore.language || "en",
          lyrics: lyricsPayload,
          lyricLoading: statusStore.lyricLoading,
          playback: {
            isPlaying: statusStore.playStatus,
            tick: [
              statusStore.currentTime,
              statusStore.duration,
              statusStore.getSongOffset(musicStore.playSong?.id),
            ],
          },
          config: configPayload,
          themeColor: resolveTaskbarThemeColor(),
        },
      });

      // macOS 状态栏歌词进度数据
      window.electron.ipcRenderer.send("mac-statusbar:update-progress", {
        currentTime: statusStore.currentTime,
        duration: statusStore.duration,
        offset: statusStore.getSongOffset(musicStore.playSong?.id),
      });
      // 发送封面颜色
      sendTaskbarCoverColor();
    });

    // 请求歌词数据
    window.electron.ipcRenderer.on("desktop-lyric:request-data", () => {
      const musicStore = useMusicStore();
      const statusStore = useStatusStore();
      if (player) {
        const { name, artist } = getPlayerInfoObj() || {};
        const songLyric = statusStore.lyricLoading
          ? { lrcData: [], yrcData: [] }
          : toRaw(musicStore.songLyric);
        window.electron.ipcRenderer.send(
          "desktop-lyric:update-data",
          cloneDeep({
            playStatus: statusStore.playStatus,
            playName: name,
            artistName: artist,
            currentTime: statusStore.currentTime,
            songId: musicStore.playSong?.id,
            songOffset: statusStore.getSongOffset(musicStore.playSong?.id),
            lrcData: songLyric.lrcData ?? [],
            yrcData: songLyric.yrcData ?? [],
            lyricIndex: statusStore.lyricIndex,
            lyricLoading: statusStore.lyricLoading,
          }),
        );
      }
    });
    // 协议数据
    window.electron.ipcRenderer.on("protocol-url", (_, url) => {
      handleProtocolUrl(url);
    });
    // 请求播放信息
    window.electron.ipcRenderer.on("request-track-info", () => {
      const musicStore = useMusicStore();
      const statusStore = useStatusStore();
      const { name, artist, album } = getPlayerInfoObj() || {};
      // 获取原始对象
      const playSong = toRaw(musicStore.playSong);
      const songLyric = statusStore.lyricLoading
        ? { lrcData: [], yrcData: [] }
        : toRaw(musicStore.songLyric);
      // 诊断：引擎原始时长与 store 时长（字符串化以保留 Infinity/NaN）
      let engineDuration = "unknown";
      try {
        engineDuration = String(useAudioManager().duration);
      } catch {
        // 忽略探针异常
      }
      window.electron.ipcRenderer.send(
        "return-track-info",
        cloneDeep({
          playStatus: statusStore.playStatus,
          playName: name,
          artistName: artist,
          albumName: album,
          currentTime: statusStore.currentTime,
          storeDuration: String(statusStore.duration),
          engineDuration,
          songDuration: String(playSong?.duration ?? "none"),
          // 音量及播放速率
          volume: statusStore.playVolume,
          playRate: statusStore.playRate,
          ...playSong,
          // 歌词及加载状态
          lyricLoading: statusStore.lyricLoading,
          lyricIndex: statusStore.lyricIndex,
          ...songLyric,
        }),
      );
    });

    // MCP: 搜索并立即播放
    window.electron.ipcRenderer.on(
      "mcp:search-and-play",
      async (_, { requestId, keyword }: { requestId: string; keyword: string }) => {
        try {
          const result = await searchResult(keyword, 10, 0, 1);
          const rawSongs = result.result?.songs || [];
          const songs = formatSongsList(rawSongs);
          if (songs.length === 0) {
            window.electron.ipcRenderer.send("mcp:search-and-play-response", {
              requestId,
              success: false,
              message: `未找到与 "${keyword}" 相关的歌曲`,
            });
            return;
          }
          const targetSong = songs[0];
          void player.addNextSong(targetSong, true);
          const meta = getPlayerInfoObj(targetSong);
          window.electron.ipcRenderer.send("mcp:search-and-play-response", {
            requestId,
            success: true,
            song: {
              id: targetSong.id,
              name: meta?.name || targetSong.name,
              artist: meta?.artist || "未知歌手",
              album: meta?.album || "",
              durationMs: Math.round((targetSong.duration || 0) * 1000),
            },
          });
        } catch (err: any) {
          window.electron.ipcRenderer.send("mcp:search-and-play-response", {
            requestId,
            success: false,
            message: err?.message || String(err),
          });
        }
      },
    );

    // MCP: 搜索歌曲列表
    window.electron.ipcRenderer.on(
      "mcp:search-songs",
      async (
        _,
        { requestId, keyword, limit = 10 }: { requestId: string; keyword: string; limit?: number },
      ) => {
        try {
          const result = await searchResult(keyword, limit, 0, 1);
          const rawSongs = result.result?.songs || [];
          const songs = formatSongsList(rawSongs);
          window.electron.ipcRenderer.send("mcp:search-songs-response", {
            requestId,
            success: true,
            songs: songs.map((s) => {
              const meta = getPlayerInfoObj(s);
              return {
                id: s.id,
                name: meta?.name || s.name,
                artist: meta?.artist || "未知歌手",
                album: meta?.album || "",
                durationMs: Math.round((s.duration || 0) * 1000),
              };
            }),
          });
        } catch (err: any) {
          window.electron.ipcRenderer.send("mcp:search-songs-response", {
            requestId,
            success: false,
            message: err?.message || String(err),
          });
        }
      },
    );

    // MCP: 根据歌曲 ID 播放
    window.electron.ipcRenderer.on(
      "mcp:play-track-by-id",
      async (_, { requestId, id }: { requestId: string; id: number | string }) => {
        try {
          const result = await songDetail(Number(id));
          const songs = formatSongsList(result.songs || []);
          if (songs.length === 0) {
            window.electron.ipcRenderer.send("mcp:play-track-by-id-response", {
              requestId,
              success: false,
              message: `未找到 ID 为 ${id} 的歌曲详情`,
            });
            return;
          }
          const targetSong = songs[0];
          void player.addNextSong(targetSong, true);
          const meta = getPlayerInfoObj(targetSong);
          window.electron.ipcRenderer.send("mcp:play-track-by-id-response", {
            requestId,
            success: true,
            song: {
              id: targetSong.id,
              name: meta?.name || targetSong.name,
              artist: meta?.artist || "未知歌手",
              album: meta?.album || "",
              durationMs: Math.round((targetSong.duration || 0) * 1000),
            },
          });
        } catch (err: any) {
          window.electron.ipcRenderer.send("mcp:play-track-by-id-response", {
            requestId,
            success: false,
            message: err?.message || String(err),
          });
        }
      },
    );

    // MCP: create a local playlist (IDs travel as strings, see tools.ts)
    window.electron.ipcRenderer.on(
      "mcp:create-playlist",
      async (
        _,
        { requestId, name, description }: { requestId: string; name: string; description?: string },
      ) => {
        try {
          const localStore = useLocalStore();
          const playlist = await localStore.createLocalPlaylist(name, description);
          window.electron.ipcRenderer.send("mcp:create-playlist-response", {
            requestId,
            success: true,
            playlist: { id: String(playlist.id), name: playlist.name, songCount: 0 },
          });
        } catch (err: any) {
          window.electron.ipcRenderer.send("mcp:create-playlist-response", {
            requestId,
            success: false,
            message: err?.message || String(err),
          });
        }
      },
    );

    // MCP: add songs to a local playlist
    window.electron.ipcRenderer.on(
      "mcp:add-songs-to-playlist",
      async (
        _,
        {
          requestId,
          playlistId,
          songIds,
        }: { requestId: string; playlistId: string | number; songIds: (number | string)[] },
      ) => {
        try {
          const localStore = useLocalStore();
          const target = localStore.localPlaylists.find(
            (p) => String(p.id) === String(playlistId),
          );
          if (!target) {
            window.electron.ipcRenderer.send("mcp:add-songs-to-playlist-response", {
              requestId,
              success: false,
              message: `Playlist ${playlistId} not found`,
            });
            return;
          }
          // Resolve full song objects (covers/metadata cache), skip failures
          const resolved: SongType[] = [];
          for (const rawId of songIds) {
            try {
              const result = await songDetail(Number(rawId));
              const songs = formatSongsList(result.songs || []);
              if (songs.length > 0) resolved.push(songs[0]);
            } catch {
              // skip unresolvable IDs
            }
          }
          if (resolved.length === 0) {
            window.electron.ipcRenderer.send("mcp:add-songs-to-playlist-response", {
              requestId,
              success: false,
              message: "No valid songs to add",
            });
            return;
          }
          const { addedCount } = await localStore.addSongsToLocalPlaylist(
            Number(playlistId),
            resolved.map((s) => String(s.id)),
            resolved,
          );
          window.electron.ipcRenderer.send("mcp:add-songs-to-playlist-response", {
            requestId,
            success: true,
            addedCount,
          });
        } catch (err: any) {
          window.electron.ipcRenderer.send("mcp:add-songs-to-playlist-response", {
            requestId,
            success: false,
            message: err?.message || String(err),
          });
        }
      },
    );

    // MCP: list local playlists
    window.electron.ipcRenderer.on(
      "mcp:list-playlists",
      (_, { requestId }: { requestId: string }) => {
        try {
          const localStore = useLocalStore();
          window.electron.ipcRenderer.send("mcp:list-playlists-response", {
            requestId,
            success: true,
            playlists: localStore.localPlaylists.map((p) => ({
              id: String(p.id),
              name: p.name,
              songCount: p.songs.length,
            })),
          });
        } catch (err: any) {
          window.electron.ipcRenderer.send("mcp:list-playlists-response", {
            requestId,
            success: false,
            message: err?.message || String(err),
          });
        }
      },
    );
  } catch (error) {
    console.error(error);
  }
};

export default initIpc;
