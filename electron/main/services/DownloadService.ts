import type { SongMetadata } from "@native/tools";
import { app, BrowserWindow } from "electron";
import { createWriteStream } from "node:fs";
import { mkdir, access, writeFile, readFile, rename, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ipcLog } from "../logger";
import { useStore } from "../store";
import { loadNativeModule } from "../utils/native-loader";
import { getArtistNames } from "../utils/format";

type toolModule = typeof import("@native/tools");
const tools: toolModule = loadNativeModule("tools.node", "tools");

// 纯 JS 下载器降级方案
async function downloadWithNodeFetch(
  url: string,
  destPath: string,
  signal: AbortSignal,
  onProgress?: (data: { percent: number; transferredBytes: number; totalBytes: number }) => void,
  headers?: Record<string, string>,
): Promise<void> {
  const response = await fetch(url, {
    signal,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ...headers,
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentLength = Number(response.headers.get("content-length")) || 0;
  let transferredBytes = 0;

  const fileStream = createWriteStream(destPath);
  const reader = response.body.getReader();

  const nodeReadable = new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          transferredBytes += value.length;
          if (onProgress && contentLength > 0) {
            onProgress({
              percent: transferredBytes / contentLength,
              transferredBytes,
              totalBytes: contentLength,
            });
          }
          this.push(Buffer.from(value));
        }
      } catch (err) {
        this.destroy(err as Error);
      }
    },
  });

  await pipeline(nodeReadable, fileStream, { signal });
}

export class DownloadService {
  /** 存储活动下载任务：ID -> DownloadTask 实例 */
  private activeDownloads = new Map<number, any>();

  /**
   * 处理文件下载请求
   * @param event IPC 调用事件
   * @param url 下载链接
   * @param options 下载选项
   * @returns 下载结果状态
   */
  async downloadFile(
    event: Electron.IpcMainInvokeEvent,
    url: string,
    options: {
      fileName: string;
      fileType: string;
      path: string;
      downloadMeta?: boolean;
      downloadCover?: boolean;
      downloadLyric?: boolean;
      saveMetaFile?: boolean;
      lyric?: string;
      albumArtists?: string[];
      songData?: any;
      skipIfExist?: boolean;
      threadCount?: number;
      referer?: string;
      enableDownloadHttp2?: boolean;
    } = {
      fileName: "未知文件名",
      fileType: "mp3",
      path: app.getPath("downloads"),
    },
  ): Promise<{ status: "success" | "skipped" | "error" | "cancelled"; message?: string }> {
    try {
      // 获取窗口
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win || !win.webContents) return { status: "error", message: "Window not found" };
      // 获取配置
      const {
        fileName,
        fileType,
        path,
        lyric,
        albumArtists,
        downloadMeta,
        downloadCover,
        downloadLyric,
        songData,
        skipIfExist,
        referer,
      } = options;
      // 规范化路径
      const downloadPath = resolve(path);
      // 检查文件夹是否存在，不存在则自动递归创建
      try {
        await access(downloadPath);
      } catch {
        await mkdir(downloadPath, { recursive: true });
      }
      // 规范化文件名
      const finalFilePath = fileType
        ? join(downloadPath, `${fileName}.${fileType}`)
        : join(downloadPath, fileName);
      // 检查文件是否存在
      if (skipIfExist) {
        try {
          await access(finalFilePath);
          return { status: "skipped", message: "文件已存在" };
        } catch {
          // 文件不存在，继续下载
        }
      }
      // 使用隐藏的临时文件夹来避免扫描
      const tempDir = join(downloadPath, ".kraken-player_temp");
      try {
        await access(tempDir);
      } catch {
        await mkdir(tempDir, { recursive: true });
      }
      const tempFileName = fileType ? `${fileName}.${fileType}` : fileName;
      const tempFilePath = join(tempDir, tempFileName);
      // 准备元数据
      let metadata: SongMetadata | undefined | null = null;
      if (downloadMeta && songData) {
        const artistNames = getArtistNames(songData.artists);
        const artist = artistNames.join(", ") || "未知艺术家";
        const albumArtist = albumArtists?.join(", ");
        const coverUrl =
          downloadCover && (songData.coverSize?.l || songData.cover)
            ? songData.coverSize?.l || songData.cover
            : undefined;
        metadata = {
          title: songData.name || "未知曲目",
          artist: artist,
          album:
            (typeof songData.album === "string" ? songData.album : songData.album?.name) ||
            "未知专辑",
          albumArtist: albumArtist && albumArtist !== "" ? albumArtist : undefined,
          coverUrl: coverUrl,
          lyric: downloadLyric && lyric ? lyric : undefined,
          description: songData.alia || "",
        };
      }
      // 进度回调
      const onProgress = (...args: any[]) => {
        let progressData: any;
        // 处理 (err, value) 或 (value) 签名
        if (args.length > 1 && args[0] === null) {
          progressData = args[1];
        } else if (args.length > 0) {
          progressData = args[0];
        }
        // 处理进度数据
        try {
          if (!progressData) return;
          // 处理对象（新）和 JSON 字符串（旧/回退）
          if (typeof progressData === "string") {
            try {
              progressData = JSON.parse(progressData);
            } catch (e) {
              console.error("Failed to parse progress json", e);
              return;
            }
          }
          // 检查进度数据
          if (!progressData || typeof progressData !== "object") return;
          // 映射 snake_case（Rust）到 camelCase（JS）
          // Rust struct: { percent, transferred_bytes, total_bytes }
          const percent = progressData.percent;
          const transferredBytes =
            progressData.transferredBytes ?? progressData.transferred_bytes ?? 0;
          const totalBytes = progressData.totalBytes ?? progressData.total_bytes ?? 0;
          // 发送进度更新
          win.webContents.send("download-progress", {
            id: songData?.id,
            percent: percent,
            transferredBytes: transferredBytes,
            totalBytes: totalBytes,
          });
        } catch (e) {
          console.error("Error processing progress callback", e, "Args:", args);
        }
      };
      // 获取配置
      const store = useStore();
      // 使用 threadCount（如果可用），否则回退到 store
      const threadCount = options.threadCount || store.get("downloadThreadCount") || 8;
      // 使用 enableDownloadHttp2（如果可用），否则回退到 store
      const enableHttp2 = options.enableDownloadHttp2 ?? store.get("enableDownloadHttp2", true);
      // 如果启用了 HTTP/2，将 HTTP 升级到 HTTPS（HTTP/2 通常需要 HTTPS）
      let finalUrl = url;
      if (enableHttp2 && finalUrl.startsWith("http://")) {
        finalUrl = finalUrl.replace(/^http:\/\//, "https://");
        ipcLog.info(`🔒 Upgraded download URL to HTTPS for HTTP/2 support: ${finalUrl}`);
      }

      const downloadId = songData?.id || 0;
      const abortController = new AbortController();

      try {
        if (tools) {
          // 创建原生下载任务
          const task = new tools.DownloadTask();
          this.activeDownloads.set(downloadId, task);
          await task.download(
            finalUrl,
            tempFilePath,
            metadata,
            threadCount,
            referer,
            onProgress,
            enableHttp2,
          );
        } else {
          // 原生模块缺失时采用纯 JS 流式下载
          this.activeDownloads.set(downloadId, {
            cancel: () => abortController.abort(),
          });
          await downloadWithNodeFetch(
            finalUrl,
            tempFilePath,
            abortController.signal,
            (progress) => onProgress(progress),
            referer ? { Referer: referer } : undefined,
          );
        }
        // 下载完成后重命名为最终文件名
        await rename(tempFilePath, finalFilePath);

        // 下载保存封面图片
        let localCoverUrl: string | undefined;
        const coverUrl =
          metadata?.coverUrl ||
          songData?.coverSize?.l ||
          songData?.cover ||
          songData?.picUrl ||
          songData?.album?.picUrl;

        if (coverUrl) {
          try {
            const coverFilePath = join(downloadPath, `${fileName}.jpg`);
            const coverRes = await fetch(coverUrl);
            if (coverRes.ok) {
              const coverBuf = Buffer.from(await coverRes.arrayBuffer());
              await writeFile(coverFilePath, coverBuf);
              localCoverUrl = `file://${coverFilePath.replace(/\\/g, "/")}`;
            }
          } catch (covErr) {
            ipcLog.warn("保存封面失败:", covErr);
          }
        }

        // 保存或更新下载元信息索引
        try {
          const metaFilePath = join(downloadPath, ".kraken-player_metadata.json");
          let metaMap: Record<string, any> = {};
          try {
            const existing = await readFile(metaFilePath, "utf-8");
            metaMap = JSON.parse(existing);
          } catch {
            metaMap = {};
          }
          const baseFileName = fileType ? `${fileName}.${fileType}` : fileName;
          const albumVal =
            metadata?.album ||
            (typeof songData?.album === "string" ? songData?.album : songData?.album?.name) ||
            "";
          metaMap[baseFileName] = {
            id: songData?.id,
            name: metadata?.title || songData?.name,
            artist: metadata?.artist,
            artists: songData?.artists,
            album: albumVal,
            albumId: songData?.album?.id,
            cover: coverUrl,
            localCover: localCoverUrl,
            duration: songData?.duration,
            size: songData?.size,
          };
          await writeFile(metaFilePath, JSON.stringify(metaMap, null, 2), "utf-8");
        } catch (metaErr) {
          ipcLog.warn("保存元信息索引失败:", metaErr);
        }
      } catch (err) {
        // 下载失败或取消，尝试清理临时文件
        try {
          await unlink(tempFilePath);
        } catch {
          // 忽略清理错误
        }
        throw err;
      } finally {
        this.activeDownloads.delete(downloadId);
      }

      // 不再生成外部歌词文件，歌词仅内嵌
      return { status: "success" };
    } catch (error: any) {
      ipcLog.error("❌ Error downloading file:", error);
      if ((error.message && error.message.includes("cancelled")) || error.code === "Cancelled") {
        return { status: "cancelled", message: "下载已取消" };
      }
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * 取消下载
   * @param songId 歌曲ID
   * @returns 是否成功取消
   */
  cancelDownload(songId: number): boolean {
    const task = this.activeDownloads.get(songId);
    if (task) {
      task.cancel();
      return true;
    }
    return false;
  }
}
