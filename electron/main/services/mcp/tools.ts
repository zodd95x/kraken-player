import { ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import { getTrackInfoFromRenderer } from "../../utils/track-info";
import mainWindow from "../../windows/main-window";

/**
 * 向渲染进程发送请求并等待带有特定 requestId 的响应
 */
const invokeRendererAction = (
  requestChannel: string,
  responseChannel: string,
  payload: Record<string, any>,
  timeoutMs = 25000,
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const win = mainWindow.getWin();
    if (!win || win.isDestroyed() || win.webContents.isDestroyed()) {
      return reject(new Error("播放器主窗口不可用"));
    }
    const requestId = randomUUID();
    const timer = setTimeout(() => {
      ipcMain.removeListener(responseChannel, handler);
      reject(new Error("请求渲染进程超时"));
    }, timeoutMs);

    const handler = (_event: any, resp: any) => {
      if (resp?.requestId === requestId) {
        clearTimeout(timer);
        ipcMain.removeListener(responseChannel, handler);
        resolve(resp);
      }
    };

    ipcMain.on(responseChannel, handler);
    win.webContents.send(requestChannel, { requestId, ...payload });
  });
};

/**
 * MCP 工具定义列表
 */
export const getMcpToolsList = () => [
  {
    name: "get_now_playing",
    description:
      "获取当前正在播放的歌曲信息，包含标题、艺术家、专辑、时长、当前播放位置、播放状态及封面链接。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "get_playback_status",
    description: "获取播放器的播放状态，包含是否正在播放、当前进度、总时长、音量和播放速率。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "play",
    description: "继续或开始播放音乐。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "pause",
    description: "暂停当前正在播放的音乐。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "toggle_play",
    description: "切换播放或暂停状态。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "next_track",
    description: "播放下一首曲目。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "previous_track",
    description: "播放上一首曲目。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "set_volume",
    description: "设置播放器音量。可传入 0 到 1 之间的小数，或 0 到 100 之间的百分比数值。",
    inputSchema: {
      type: "object",
      properties: {
        volume: {
          type: "number",
          description: "目标音量值（0.0 - 1.0 或 0 - 100）",
        },
      },
      required: ["volume"],
    },
  },
  {
    name: "seek",
    description: "跳转当前歌曲播放进度。可传入毫秒（positionMs）或秒（seconds）。",
    inputSchema: {
      type: "object",
      properties: {
        positionMs: {
          type: "number",
          description: "目标跳转时间（毫秒）",
        },
        seconds: {
          type: "number",
          description: "目标跳转时间（秒）",
        },
      },
    },
  },
  {
    name: "search_and_play",
    description: "按关键词搜索歌曲并立即开始播放第一首匹配的歌曲。",
    inputSchema: {
      type: "object",
      properties: {
        keyword: {
          type: "string",
          description: "搜索关键词（歌曲名、歌手等）",
        },
      },
      required: ["keyword"],
    },
  },
  {
    name: "search_songs",
    description: "按关键词搜索歌曲，返回匹配的歌曲列表。",
    inputSchema: {
      type: "object",
      properties: {
        keyword: {
          type: "string",
          description: "搜索关键词（歌曲名、歌手等）",
        },
        limit: {
          type: "number",
          description: "返回的最大歌曲数量（默认 10）",
        },
      },
      required: ["keyword"],
    },
  },
  {
    name: "play_track_by_id",
    description: "根据歌曲 ID 播放指定歌曲。",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "number",
          description: "歌曲 ID",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "create_playlist",
    description: "Create a new local playlist with the given name.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Playlist name",
        },
        description: {
          type: "string",
          description: "Playlist description (optional)",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "add_songs_to_playlist",
    description: "Add songs (by ID) to a local playlist.",
    inputSchema: {
      type: "object",
      properties: {
        playlistId: {
          type: "string",
          description: "Local playlist ID exactly as returned by list_playlists (string, copy verbatim)",
        },
        songIds: {
          type: "array",
          items: { type: "number" },
          description: "Song IDs to add (see search_songs)",
        },
      },
      required: ["playlistId", "songIds"],
    },
  },
  {
    name: "list_playlists",
    description: "List local playlists with their song counts.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

/**
 * 执行指定 MCP 工具
 */
export const executeMcpTool = async (
  name: string,
  args: Record<string, any> = {},
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> => {
  const sendToRenderer = (channel: string, ...payload: any[]): boolean => {
    const win = mainWindow.getWin();
    if (!win || win.isDestroyed() || win.webContents.isDestroyed()) {
      throw new Error("播放器主窗口不可用");
    }
    win.webContents.send(channel, ...payload);
    return true;
  };

  switch (name) {
    case "get_now_playing": {
      try {
        const info = await getTrackInfoFromRenderer();
        const data = info
          ? {
              title: info.name || info.playName || "未知曲目",
              artist: info.artist || info.artistName || "未知歌手",
              album: info.album || info.albumName || "",
              durationMs: Math.round((info.duration || 0) * 1000),
              positionMs: Math.round((info.currentTime || 0) * 1000),
              isPlaying: !!info.playStatus,
              volume: info.volume ?? 1,
              coverUrl: info.picUrl || "",
            }
          : { isPlaying: false, message: "当前无正在播放的曲目" };
        return { content: [{ type: "text", text: JSON.stringify(data) }] };
      } catch {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ isPlaying: false, message: "未获取到播放信息或播放器未就绪" }),
            },
          ],
        };
      }
    }

    case "get_playback_status": {
      try {
        const info = await getTrackInfoFromRenderer();
        const status = {
          isPlaying: !!info?.playStatus,
          positionMs: Math.round((info?.currentTime || 0) * 1000),
          durationMs: Math.round((info?.duration || 0) * 1000),
          volume: info?.volume ?? 1,
          playRate: info?.playRate ?? 1,
        };
        return { content: [{ type: "text", text: JSON.stringify(status) }] };
      } catch {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ isPlaying: false, volume: 1, message: "播放器未就绪" }),
            },
          ],
        };
      }
    }

    case "play": {
      sendToRenderer("play");
      return { content: [{ type: "text", text: JSON.stringify({ ok: true, action: "play" }) }] };
    }

    case "pause": {
      sendToRenderer("pause");
      return { content: [{ type: "text", text: JSON.stringify({ ok: true, action: "pause" }) }] };
    }

    case "toggle_play": {
      sendToRenderer("playOrPause");
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: true, action: "toggle_play" }) }],
      };
    }

    case "next_track": {
      sendToRenderer("playNext");
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: true, action: "next_track" }) }],
      };
    }

    case "previous_track": {
      sendToRenderer("playPrev");
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: true, action: "previous_track" }) }],
      };
    }

    case "set_volume": {
      let vol = Number(args.volume);
      if (isNaN(vol)) {
        return {
          content: [{ type: "text", text: "无效的音量参数" }],
          isError: true,
        };
      }
      if (vol > 1) vol = vol / 100;
      vol = Math.max(0, Math.min(vol, 1));
      sendToRenderer("setVolume", vol);
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: true, volume: vol }) }],
      };
    }

    case "seek": {
      let ms: number;
      if (args.positionMs !== undefined) {
        ms = Number(args.positionMs);
      } else if (args.seconds !== undefined) {
        ms = Number(args.seconds) * 1000;
      } else {
        return {
          content: [{ type: "text", text: "请提供 positionMs 或 seconds 参数" }],
          isError: true,
        };
      }
      if (isNaN(ms) || ms < 0) {
        return {
          content: [{ type: "text", text: "无效的跳转位置参数" }],
          isError: true,
        };
      }
      sendToRenderer("seekTo", ms);
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: true, positionMs: ms }) }],
      };
    }

    case "search_and_play": {
      const keyword = String(args.keyword || "").trim();
      if (!keyword) {
        return {
          content: [{ type: "text", text: "请提供有效的 keyword 关键词" }],
          isError: true,
        };
      }
      try {
        const resp = await invokeRendererAction(
          "mcp:search-and-play",
          "mcp:search-and-play-response",
          { keyword },
        );
        if (!resp.success) {
          return {
            content: [{ type: "text", text: resp.message || "未找到相关歌曲" }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: true, song: resp.song }) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `搜索播放失败: ${err.message || String(err)}` }],
          isError: true,
        };
      }
    }

    case "search_songs": {
      const keyword = String(args.keyword || "").trim();
      if (!keyword) {
        return {
          content: [{ type: "text", text: "请提供有效的 keyword 关键词" }],
          isError: true,
        };
      }
      const limit = typeof args.limit === "number" ? args.limit : 10;
      try {
        const resp = await invokeRendererAction("mcp:search-songs", "mcp:search-songs-response", {
          keyword,
          limit,
        });
        if (!resp.success) {
          return {
            content: [{ type: "text", text: resp.message || "搜索失败" }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: true, songs: resp.songs }) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `搜索失败: ${err.message || String(err)}` }],
          isError: true,
        };
      }
    }

    case "play_track_by_id": {
      const id = args.id;
      if (!id) {
        return {
          content: [{ type: "text", text: "请提供有效的歌曲 id" }],
          isError: true,
        };
      }
      try {
        const resp = await invokeRendererAction(
          "mcp:play-track-by-id",
          "mcp:play-track-by-id-response",
          { id },
        );
        if (!resp.success) {
          return {
            content: [{ type: "text", text: resp.message || "播放失败" }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: true, song: resp.song }) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `播放失败: ${err.message || String(err)}` }],
          isError: true,
        };
      }
    }

    case "create_playlist": {
      const name = String(args.name || "").trim();
      if (!name) {
        return {
          content: [{ type: "text", text: "A non-empty playlist name is required" }],
          isError: true,
        };
      }
      try {
        const resp = await invokeRendererAction(
          "mcp:create-playlist",
          "mcp:create-playlist-response",
          { name, description: String(args.description || "") },
        );
        if (!resp.success) {
          return {
            content: [{ type: "text", text: resp.message || "Failed to create playlist" }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: true, playlist: resp.playlist }) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Failed to create playlist: ${err.message || String(err)}` }],
          isError: true,
        };
      }
    }

    case "add_songs_to_playlist": {
      // Playlist IDs are 16-digit numbers: keep them as strings end-to-end
      // so JSON transport never loses precision.
      const playlistId = String(args.playlistId || "").trim();
      const songIds = Array.isArray(args.songIds)
        ? args.songIds.map(Number).filter((id) => Number.isFinite(id))
        : [];
      if (!playlistId || songIds.length === 0) {
        return {
          content: [{ type: "text", text: "Valid playlistId and a non-empty songIds array are required" }],
          isError: true,
        };
      }
      try {
        const resp = await invokeRendererAction(
          "mcp:add-songs-to-playlist",
          "mcp:add-songs-to-playlist-response",
          { playlistId, songIds },
        );
        if (!resp.success) {
          return {
            content: [{ type: "text", text: resp.message || "Failed to add songs" }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ok: true, addedCount: resp.addedCount }),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Failed to add songs: ${err.message || String(err)}` }],
          isError: true,
        };
      }
    }

    case "list_playlists": {
      try {
        const resp = await invokeRendererAction(
          "mcp:list-playlists",
          "mcp:list-playlists-response",
          {},
        );
        if (!resp.success) {
          return {
            content: [{ type: "text", text: resp.message || "Failed to list playlists" }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: true, playlists: resp.playlists }) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Failed to list playlists: ${err.message || String(err)}` }],
          isError: true,
        };
      }
    }

    default:
      return {
        content: [{ type: "text", text: `未找到工具: ${name}` }],
        isError: true,
      };
  }
};
