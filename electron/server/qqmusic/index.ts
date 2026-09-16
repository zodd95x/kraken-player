import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import axios from "axios";
import { serverLog } from "../../main/logger";
import { decryptQrc } from "./qrc";

/**
 * QQ 音乐移动端 API 配置
 * 参考 LDDC 项目的 QMAPI 实现
 */
const QM_API_URL = "https://u.y.qq.com/cgi-bin/musicu.fcg";

/**
 * 默认请求头 - 模拟 QQ 音乐移动端
 */
const QM_HEADERS = {
  "Content-Type": "application/json",
  "Accept-Encoding": "gzip",
  "User-Agent": "okhttp/3.14.9",
  Cookie: "tmeLoginType=-1;",
};

/**
 * 公共请求参数
 */
const getCommonParams = () => ({
  ct: 11,
  cv: "1003006",
  v: "1003006",
  os_ver: "15",
  phonetype: "24122RKC7C",
  tmeAppID: "qqmusiclight",
  nettype: "NETWORK_WIFI",
  udid: "0",
});

/**
 * 会话信息缓存
 */
let sessionCache: {
  uid?: string;
  sid?: string;
  userip?: string;
  expireTime?: number;
} = {};

/**
 * 初始化会话
 */
async function initSession(): Promise<void> {
  // 检查缓存是否有效（1小时过期）
  if (sessionCache.uid && sessionCache.expireTime && Date.now() < sessionCache.expireTime) {
    return;
  }

  try {
    const response = await axios.post(
      QM_API_URL,
      {
        comm: getCommonParams(),
        request: {
          method: "GetSession",
          module: "music.getSession.session",
          param: { caller: 0, uid: "0", vkey: 0 },
        },
      },
      { headers: QM_HEADERS },
    );

    const data = response.data;
    if (data.code === 0 && data.request?.code === 0) {
      const session = data.request.data.session;
      sessionCache = {
        uid: session.uid,
        sid: session.sid,
        userip: session.userip,
        expireTime: Date.now() + 3600000, // 1小时后过期
      };
      serverLog.log("🔑 QQ 音乐会话初始化成功");
    }
  } catch {
    serverLog.warn("⚠️ QQ 音乐会话初始化失败，将使用默认参数");
  }
}

/**
 * 发送 QQ 音乐 API 请求
 */
async function qmRequest(method: string, module: string, param: Record<string, any>): Promise<any> {
  await initSession();

  const comm = {
    ...getCommonParams(),
    ...(sessionCache.uid ? { uid: sessionCache.uid } : {}),
    ...(sessionCache.sid ? { sid: sessionCache.sid } : {}),
    ...(sessionCache.userip ? { userip: sessionCache.userip } : {}),
  };

  const response = await axios.post(
    QM_API_URL,
    {
      comm,
      request: { method, module, param },
    },
    { headers: QM_HEADERS },
  );

  const data = response.data;
  if (data.code !== 0 || data.request?.code !== 0) {
    throw new Error(`QM API 错误: ${data.code || data.request?.code}`);
  }

  return data.request.data;
}

/**
 * 歌词响应数据
 */
interface LyricResponse {
  code: number;
  /** LRC 格式歌词 */
  lrc?: string;
  /** 逐字歌词原始内容（QRC 格式） */
  qrc?: string;
  /** 翻译歌词 */
  trans?: string;
  /** 罗马音歌词 */
  roma?: string;
  /** 错误信息 */
  message?: string;
}

/**
 * 搜索响应数据
 */
interface SearchResponse {
  code: number;
  songs?: Array<{
    id: string;
    mid: string;
    name: string;
    artist: string;
    album: string;
    duration: number;
  }>;
  total?: number;
  message?: string;
}

/**
 * 获取 QQ 音乐歌词
 *
 * @param songId - 歌曲 ID（数字ID）
 * @param songName - 歌曲名称（用于请求参数）
 * @param singerName - 歌手名称（用于请求参数）
 * @param albumName - 专辑名称（用于请求参数）
 * @param duration - 歌曲时长（秒）
 * @returns 歌词数据
 */
async function getQQMusicLyric(
  songId: number,
  songName: string = "",
  singerName: string = "",
  albumName: string = "",
  duration: number = 0,
): Promise<LyricResponse> {
  try {
    // Base64 编码参数
    const b64encode = (str: string) => Buffer.from(str, "utf8").toString("base64");

    const param = {
      albumName: b64encode(albumName),
      crypt: 1,
      ct: 19,
      cv: 2111,
      interval: duration,
      lrc_t: 0,
      qrc: 1,
      qrc_t: 0,
      roma: 1,
      roma_t: 0,
      singerName: b64encode(singerName),
      songID: songId,
      songName: b64encode(songName),
      trans: 1,
      trans_t: 0,
      type: 0,
    };

    const response = await qmRequest(
      "GetPlayLyricInfo",
      "music.musichallSong.PlayLyricInfo",
      param,
    );

    const result: LyricResponse = { code: 200 };

    // 处理主歌词（QRC 逐字歌词）
    const lyric = response.lyric;
    if (lyric && lyric.length > 0) {
      try {
        const decrypted = decryptQrc(lyric);
        // 直接输出原始 QRC 内容
        result.qrc = decrypted;
      } catch (error: any) {
        serverLog.error("QRC 歌词解密失败:", error.message);
      }
    }

    // 如果 qrc_t 为 0，则 lyric 字段返回的是 LRC 格式
    // 否则需要单独请求 LRC（设置 qrc=0）
    if (response.qrc_t === 0 && lyric) {
      // lyric 就是 LRC 格式
      try {
        result.lrc = decryptQrc(lyric);
      } catch {
        // LRC 解密失败，忽略
      }
    } else {
      // 单独请求 LRC 格式歌词
      try {
        const lrcParam = {
          ...param,
          qrc: 0, // 不要 QRC，只要 LRC
          qrc_t: 0,
        };
        const lrcResponse = await qmRequest(
          "GetPlayLyricInfo",
          "music.musichallSong.PlayLyricInfo",
          lrcParam,
        );
        if (lrcResponse.lyric && lrcResponse.lyric.length > 0) {
          result.lrc = decryptQrc(lrcResponse.lyric);
        }
      } catch {
        // LRC 获取失败，忽略
      }
    }

    // 处理翻译歌词
    const trans = response.trans;
    if (trans && trans.length > 0) {
      try {
        const decrypted = decryptQrc(trans);
        result.trans = decrypted;
      } catch {
        // 翻译歌词解密失败，忽略
      }
    }

    // 处理罗马音歌词
    const roma = response.roma;
    if (roma && roma.length > 0) {
      try {
        const decrypted = decryptQrc(roma);
        result.roma = decrypted;
      } catch {
        // 罗马音歌词解密失败，忽略
      }
    }

    return result;
  } catch (error: any) {
    serverLog.error("QQ 音乐歌词获取失败:", error.message);
    return {
      code: 500,
      message: error.message || "服务器错误",
    };
  }
}

/**
 * 搜索 QQ 音乐歌曲
 *
 * @param keyword - 搜索关键词
 * @param page - 页码（从1开始）
 * @param pageSize - 每页数量
 * @returns 搜索结果
 */
async function searchQQMusic(
  keyword: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<SearchResponse> {
  try {
    const param = {
      search_id: String(
        Math.floor(Math.random() * 20) * 18014398509481984 +
          Math.floor(Math.random() * 4194304) * 4294967296 +
          (Date.now() % 86400000),
      ),
      remoteplace: "search.android.keyboard",
      query: keyword,
      search_type: 0, // 搜索歌曲
      num_per_page: pageSize,
      page_num: page,
      highlight: 0,
      nqc_flag: 0,
      page_id: 1,
      grp: 1,
    };

    const response = await qmRequest(
      "DoSearchForQQMusicLite",
      "music.search.SearchCgiService",
      param,
    );

    const songList = response.body?.item_song || [];
    const songs = songList.map((song: any) => ({
      id: String(song.id),
      mid: song.mid,
      name: song.title,
      artist:
        song.singer
          ?.map((s: any) => s.name)
          .filter(Boolean)
          .join(" / ") || "未知歌手",
      album: song.album?.name || "",
      duration: (song.interval || 0) * 1000, // 转换为毫秒
    }));

    return {
      code: 200,
      songs,
      total: response.meta?.sum || songs.length,
    };
  } catch (error: any) {
    serverLog.error("QQ 音乐搜索失败:", error);
    return {
      code: 500,
      message: error.message || "服务器错误",
    };
  }
}

/**
 * 初始化 QQ 音乐 API 路由
 */
export const initQQMusicAPI = async (fastify: FastifyInstance) => {
  // 预初始化会话
  initSession().catch(() => {});

  // 主信息
  fastify.get("/qqmusic", (_, reply) => {
    reply.send({
      name: "QQMusicAPI",
      description: "QQ 音乐歌词获取 API（基于 LDDC 项目）",
      author: "Kraken Player contributors",
      routes: [
        {
          path: "/api/qqmusic/lyric",
          method: "GET",
          params: {
            id: "歌曲 ID（必须）",
            name: "歌曲名称（推荐）",
            artist: "歌手名称（推荐）",
            album: "专辑名称（可选）",
            duration: "时长秒数（可选）",
          },
          description: "获取歌词（LRC 和逐字歌词）",
        },
        {
          path: "/api/qqmusic/search",
          method: "GET",
          params: {
            keyword: "搜索关键词",
            page: "页码（可选，默认1）",
            pageSize: "每页数量（可选，默认20）",
          },
          description: "搜索歌曲",
        },
        {
          path: "/api/qqmusic/match",
          method: "GET",
          params: {
            keyword: "搜索关键词（歌曲名-歌手）",
          },
          description: "模糊匹配获取歌词（搜索并返回第一个匹配的歌词）",
        },
      ],
    });
  });

  // 获取歌词
  fastify.get(
    "/qqmusic/lyric",
    async (
      req: FastifyRequest<{
        Querystring: {
          id: string;
          name?: string;
          artist?: string;
          album?: string;
          duration?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { id, name = "", artist = "", album = "", duration = "0" } = req.query;

      if (!id) {
        return reply.status(400).send({
          code: 400,
          message: "id 参数是必须的",
        });
      }

      const songId = parseInt(id, 10);
      if (isNaN(songId)) {
        return reply.status(400).send({
          code: 400,
          message: "id 必须是有效的数字",
        });
      }

      const result = await getQQMusicLyric(
        songId,
        name,
        artist,
        album,
        parseInt(duration, 10) || 0,
      );
      return reply.send(result);
    },
  );

  // 搜索歌曲
  fastify.get(
    "/qqmusic/search",
    async (
      req: FastifyRequest<{
        Querystring: { keyword: string; page?: string; pageSize?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { keyword, page = "1", pageSize = "20" } = req.query;

      if (!keyword) {
        return reply.status(400).send({
          code: 400,
          message: "keyword 参数是必须的",
        });
      }

      const result = await searchQQMusic(
        keyword,
        parseInt(page, 10) || 1,
        parseInt(pageSize, 10) || 20,
      );
      return reply.send(result);
    },
  );

  // 模糊匹配获取歌词
  fastify.get(
    "/qqmusic/match",
    async (
      req: FastifyRequest<{
        Querystring: { keyword: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { keyword } = req.query;

      if (!keyword) {
        return reply.status(400).send({
          code: 400,
          message: "keyword 参数是必须的",
        });
      }

      // 搜索歌曲
      const searchResult = await searchQQMusic(keyword, 1, 1);

      if (!searchResult.songs || searchResult.songs.length === 0) {
        return reply.status(404).send({
          code: 404,
          message: "未找到匹配的歌曲",
        });
      }

      // 获取第一个匹配的歌曲
      const song = searchResult.songs[0];

      // 获取歌词
      const lyricResult = await getQQMusicLyric(
        parseInt(song.id, 10),
        song.name,
        song.artist,
        song.album,
        Math.floor(song.duration / 1000),
      );

      // 返回歌曲信息和歌词

      const { code: _code, ...lyrics } = lyricResult;
      return reply.send({
        code: 200,
        song: {
          id: song.id,
          mid: song.mid,
          name: song.name,
          artist: song.artist,
          album: song.album,
          duration: song.duration,
        },
        ...lyrics,
      });
    },
  );

  serverLog.info("🌐 Register QQMusicAPI successfully");
};
