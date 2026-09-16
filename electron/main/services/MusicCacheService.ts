import { existsSync, createReadStream, createWriteStream } from "fs";
import { copyFile, readdir, rename, stat, unlink } from "fs/promises";
import { createHash } from "crypto";
import { join } from "path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { cacheLog } from "../logger";
import { useStore } from "../store";
import { loadNativeModule } from "../utils/native-loader";
import { getLegacyCachePath } from "../utils/user-data-migration";
import { CacheService } from "./CacheService";

type toolModule = typeof import("@native/tools");
const tools: toolModule = loadNativeModule("tools.node", "tools");

export class MusicCacheService {
  private static instance: MusicCacheService;
  private cacheService: CacheService;
  private downloadingTasks: Map<string, Promise<string>> = new Map();
  /** 音质优先级 */
  private readonly qualityPriority: Record<string, number> = {
    master: 100,
    dolby: 95,
    spatial: 90,
    surround: 85,
    "hi-res": 80,
    sq: 70,
    hq: 60,
    mq: 50,
    lq: 40,
    standard: 40,
  };

  private constructor() {
    this.cacheService = CacheService.getInstance();
  }

  public static getInstance(): MusicCacheService {
    if (!MusicCacheService.instance) {
      MusicCacheService.instance = new MusicCacheService();
    }
    return MusicCacheService.instance;
  }

  /**
   * 获取音乐缓存路径
   * @param id 歌曲ID
   * @param quality 音质
   */
  private getCacheKey(id: number | string, quality: string): string {
    return `${id}_${quality}.sc`;
  }

  /**
   * 从缓存文件名中提取音质标识
   */
  private getQualityFromKey(id: number | string, key: string): string | null {
    const prefix = `${id}_`;
    if (!key.startsWith(prefix) || !key.endsWith(".sc")) {
      return null;
    }
    return key.slice(prefix.length, -3);
  }

  /**
   * 获取音质权重
   */
  private getQualityWeight(quality: string): number {
    return this.qualityPriority[quality.toLowerCase()] ?? 0;
  }

  /**
   * 按音质优先级和最近修改时间筛选候选缓存
   */
  private async pickCandidates(
    id: number | string,
  ): Promise<Array<{ filePath: string; quality: string }>> {
    const items = await this.cacheService.list("music");
    const result: Array<{ filePath: string; quality: string; weight: number; mtime: number }> = [];
    for (const item of items) {
      const quality = this.getQualityFromKey(id, item.key);
      if (!quality) {
        continue;
      }
      const filePath = this.cacheService.getFilePath("music", item.key);
      result.push({
        filePath,
        quality,
        weight: this.getQualityWeight(quality),
        mtime: item.mtime,
      });
    }
    result.sort((a, b) => {
      if (b.weight !== a.weight) {
        return b.weight - a.weight;
      }
      return b.mtime - a.mtime;
    });
    return result.map(({ filePath, quality }) => ({ filePath, quality }));
  }

  /** 从迁移前的缓存中查找候选文件 */
  private async pickLegacyCandidates(
    id: number | string,
    quality?: string,
  ): Promise<Array<{ filePath: string; quality: string }>> {
    const legacyCachePath = getLegacyCachePath();
    if (!legacyCachePath) return [];

    const musicDir = join(legacyCachePath, "music");
    if (!existsSync(musicDir)) return [];

    if (quality) {
      const filePath = join(musicDir, this.getCacheKey(id, quality));
      return existsSync(filePath) ? [{ filePath, quality }] : [];
    }

    const entries = await readdir(musicDir, { withFileTypes: true });
    const result: Array<{ filePath: string; quality: string; weight: number; mtime: number }> = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const candidateQuality = this.getQualityFromKey(id, entry.name);
      if (!candidateQuality) continue;
      const filePath = join(musicDir, entry.name);
      const info = await stat(filePath);
      result.push({
        filePath,
        quality: candidateQuality,
        weight: this.getQualityWeight(candidateQuality),
        mtime: info.mtimeMs,
      });
    }
    result.sort((a, b) => b.weight - a.weight || b.mtime - a.mtime);
    return result.map(({ filePath, quality: candidateQuality }) => ({
      filePath,
      quality: candidateQuality,
    }));
  }

  /** 命中旧缓存后后台复制，避免启动时迁移整个缓存目录 */
  private copyLegacyCacheInBackground(
    sourcePath: string,
    id: number | string,
    quality: string,
  ): void {
    const key = this.getCacheKey(id, quality);
    void this.cacheService
      .init()
      .then(async () => {
        const targetPath = this.cacheService.getFilePath("music", key);
        if (existsSync(targetPath)) return;
        await copyFile(sourcePath, targetPath);
        await this.cacheService.notifyFileChange("music", key);
      })
      .catch((error) => {
        cacheLog.warn(`[MusicCache] 迁移旧缓存失败: ${key}`, error);
      });
  }

  /**
   * 计算文件 MD5
   */
  private async calculateMD5(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash("md5");
      const stream = createReadStream(filePath);
      stream.on("error", (err) => reject(err));
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
    });
  }

  /**
   * 检查缓存是否存在
   * 指定 quality 时仅检查目标音质
   * 未指定 quality 时按音质优先级和最近修改时间选择候选缓存
   * 提供 expectedMD5 时会校验文件哈希，不一致则删除旧缓存
   */
  public async hasCache(
    id: number | string,
    quality?: string,
    expectedMD5?: string,
  ): Promise<string | null> {
    const candidates: Array<{ filePath: string; quality: string }> = [];
    if (quality) {
      const key = this.getCacheKey(id, quality);
      try {
        const p = this.cacheService.getFilePath("music", key);
        if (existsSync(p)) {
          candidates.push({ filePath: p, quality });
        }
      } catch (e) {
        cacheLog.warn(`[MusicCache] 检查精确缓存失败，ID: ${id}, 音质: ${quality}:`, e);
      }
    } else {
      try {
        candidates.push(...(await this.pickCandidates(id)));
      } catch (e) {
        cacheLog.warn(`[MusicCache] 获取候选缓存失败，ID: ${id}:`, e);
      }
    }

    for (const candidate of candidates) {
      const { filePath, quality: candidateQuality } = candidate;
      // 无需校验哈希时，命中即返回
      if (!expectedMD5) {
        return filePath;
      }
      try {
        const fileMD5 = await this.calculateMD5(filePath);
        if (fileMD5.toLowerCase() !== expectedMD5.toLowerCase()) {
          cacheLog.info(
            `[MusicCache] 缓存 MD5 不匹配，删除旧缓存。ID: ${id}, 音质: ${candidateQuality}, 期望: ${expectedMD5}, 实际: ${fileMD5}`,
          );
          await unlink(filePath).catch(() => {});
          if (quality) {
            return null;
          }
          continue;
        }
        return filePath;
      } catch (error) {
        cacheLog.error(`[MusicCache] 校验缓存 MD5 失败，路径: ${filePath}:`, error);
        if (quality) {
          return null;
        }
      }
    }

    try {
      const legacyCandidates = await this.pickLegacyCandidates(id, quality);
      for (const candidate of legacyCandidates) {
        if (expectedMD5) {
          const fileMD5 = await this.calculateMD5(candidate.filePath);
          if (fileMD5.toLowerCase() !== expectedMD5.toLowerCase()) continue;
        }
        this.copyLegacyCacheInBackground(candidate.filePath, id, candidate.quality);
        return candidate.filePath;
      }
    } catch (error) {
      cacheLog.warn(`[MusicCache] 检查旧缓存失败，ID: ${id}:`, error);
    }

    return null;
  }

  /**
   * 缓存音乐
   * @param id 歌曲ID
   * @param url 音乐下载地址
   * @param quality 音质标识
   * @returns 缓存后的本地文件路径
   */
  public async cacheMusic(id: number | string, url: string, quality: string): Promise<string> {
    const key = this.getCacheKey(id, quality);
    // 检查是否已有相同的下载任务在进行中
    if (this.downloadingTasks.has(key)) {
      cacheLog.info(`[MusicCache] Reusing existing download task for: ${key}`);
      return this.downloadingTasks.get(key)!;
    }
    const downloadPromise = (async () => {
      const filePath = this.cacheService.getFilePath("music", key);
      const tempPath = `${filePath}.tmp`;

      // 确保目录存在
      await this.cacheService.init();

      // 检查并清理超限缓存
      await this.cacheService.checkAndCleanCache();

      // 下载并写入
      try {
        const store = useStore();
        const enableHttp2 = store.get("enableDownloadHttp2", true) as boolean;

        if (tools) {
          // 使用原生 Rust 下载器
          const task = new tools.DownloadTask();
          await task.download(
            url,
            tempPath,
            null, // No metadata for cache
            4, // Thread count
            null, // Referer
            () => {}, // No progress callback needed for cache currently
            enableHttp2,
          );
        } else {
          // 原生模块缺失时采用纯 JS 流式下载
          const response = await fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          });
          if (!response.ok || !response.body) {
            throw new Error(`Cache download HTTP ${response.status}`);
          }
          const fileStream = createWriteStream(tempPath);
          const reader = response.body.getReader();
          const nodeReadable = new Readable({
            async read() {
              try {
                const { done, value } = await reader.read();
                if (done) {
                  this.push(null);
                } else {
                  this.push(Buffer.from(value));
                }
              } catch (err) {
                this.destroy(err as Error);
              }
            },
          });
          await pipeline(nodeReadable, fileStream);
        }

        // 检查临时文件是否存在
        if (!existsSync(tempPath)) throw new Error("下载失败：临时文件未创建");

        // 检查文件大小，避免空文件
        const stats = await stat(tempPath);
        if (stats.size === 0) {
          await unlink(tempPath).catch(() => {});
          throw new Error("下载的文件为空");
        }

        // 下载成功后，将临时文件重命名为正式缓存文件
        await rename(tempPath, filePath);

        // 更新 CacheService 的大小记录
        await this.cacheService.notifyFileChange("music", key);

        return filePath;
      } catch (error) {
        // 下载失败，清理残余的临时文件
        if (existsSync(tempPath)) {
          await unlink(tempPath).catch(() => {});
        }
        cacheLog.error("Music download failed:", error);
        throw error;
      }
    })();

    // 记录此任务
    this.downloadingTasks.set(key, downloadPromise);

    // 任务完成后（无论成功失败）从 Map 中移除
    downloadPromise.finally(() => {
      this.downloadingTasks.delete(key);
    });

    return downloadPromise;
  }
}
