import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { SongUrlResult } from "./unblock";
import { serverLog } from "../../main/logger";
import axios from "axios";
import getKuwoSongUrl from "./kuwo";
import getBodianSongUrl from "./bodian";

/**
 * 直接获取 网易云云盘 链接
 * Thank @939163156
 * Power by GD音乐台(music.gdstudio.xyz)
 */
const getNeteaseSongUrl = async (
  id: number | string,
  br: number | string = "320",
): Promise<SongUrlResult> => {
  try {
    if (!id) return { code: 404, url: null };
    const baseUrl = "https://music-api.gdstudio.xyz/api.php";
    const result = await axios.get(baseUrl, {
      params: { types: "url", id, br },
    });
    const songUrl = result.data.url;
    serverLog.log("🔗 NeteaseSongUrl URL:", songUrl);
    return { code: 200, url: songUrl };
  } catch (error) {
    serverLog.error("❌ Get NeteaseSongUrl Error:", error);
    return { code: 404, url: null };
  }
};

// 初始化 UnblockAPI
export const initUnblockAPI = async (fastify: FastifyInstance) => {
  // 主信息
  fastify.get("/unblock", (_, reply) => {
    reply.send({
      name: "UnblockAPI",
      description: "Kraken Player UnblockAPI service",
      author: "Kraken Player contributors",
      content:
        "部分接口采用 @939163156 by GD音乐台(music.gdstudio.xyz)，仅供本人学习使用，不可传播下载内容，不可用于商业用途。",
    });
  });
  // netease
  fastify.get(
    "/unblock/netease",
    async (
      req: FastifyRequest<{ Querystring: { [key: string]: string } }>,
      reply: FastifyReply,
    ) => {
      const { id, br } = req.query;
      const result = await getNeteaseSongUrl(id, br || "320");
      return reply.send(result);
    },
  );
  // 构造匹配信息（fallback 用 lastIndexOf 兼容歌名含连字符的情况）
  const buildMatchInfo = (query: { [key: string]: string }) => {
    let songName = query.songName || "";
    let artist = query.artist || "";
    if (!songName && query.keyword) {
      const lastIdx = query.keyword.lastIndexOf("-");
      if (lastIdx > 0) {
        songName = query.keyword.slice(0, lastIdx).trim();
        artist = artist || query.keyword.slice(lastIdx + 1).trim();
      } else {
        songName = query.keyword.trim();
      }
    }
    return { keyword: query.keyword || "", songName, artist };
  };
  // kuwo
  fastify.get(
    "/unblock/kuwo",
    async (
      req: FastifyRequest<{ Querystring: { [key: string]: string } }>,
      reply: FastifyReply,
    ) => {
      const result = await getKuwoSongUrl(buildMatchInfo(req.query));
      return reply.send(result);
    },
  );
  // bodian
  fastify.get(
    "/unblock/bodian",
    async (
      req: FastifyRequest<{ Querystring: { [key: string]: string } }>,
      reply: FastifyReply,
    ) => {
      const result = await getBodianSongUrl(buildMatchInfo(req.query));
      return reply.send(result);
    },
  );
  serverLog.info("🌐 Register UnblockAPI successfully");
};
