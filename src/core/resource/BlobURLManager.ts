type BlobInputData = Buffer | Uint8Array | ArrayBuffer;

class BlobURLManager {
  /** Blob URL 存储 Map (Key -> BlobURL) */
  private blobURLs: Map<string, string>;
  /** 最大缓存数量限制 */
  private readonly maxCacheSize: number;

  /**
   * @param maxCacheSize - 最大缓存数量
   */
  constructor(maxCacheSize = 50) {
    this.blobURLs = new Map();
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * 从给定的 Buffer 数据生成 Blob URL
   * @param data - 要转换为 Blob 的二进制数据
   * @param format - 数据的 MIME 类型（'image/jpeg'）
   * @param key - 用于标识 Blob URL 的唯一键（文件路径）
   * @returns Blob URL
   */
  createBlobURL(data: BlobInputData, format: string, key: string): string {
    try {
      if (this.blobURLs.has(key)) {
        const existingUrl = this.blobURLs.get(key)!;
        // 既然刚才被访问了，说明它是“热数据”
        // 先删除再重新 set，将其移到 Map 的末尾（代表最近使用）
        this.blobURLs.delete(key);
        this.blobURLs.set(key, existingUrl);
        return existingUrl;
      }
      // 检查容量是否超标，进行清理
      this.enforceCacheLimit();
      // 创建新的 Blob
      const blob = new Blob([data as BlobPart], { type: format });
      const blobURL = URL.createObjectURL(blob);
      // 存储 Blob URL
      this.blobURLs.set(key, blobURL);
      return blobURL;
    } catch (error) {
      console.error("❌ Error creating Blob URL:", error);
      return "";
    }
  }

  /**
   * 强制执行缓存限制 (LRU 核心逻辑)
   * Map 的 keys() 迭代器是按插入顺序排列的，第一个就是最早插入（最久未访问）的
   */
  private enforceCacheLimit(): void {
    if (this.blobURLs.size >= this.maxCacheSize) {
      // 获取 Map 中的第一个键（即最老的数据）
      const oldestKey = this.blobURLs.keys().next().value;
      if (oldestKey) {
        this.revokeBlobURL(oldestKey);
      }
    }
  }

  /**
   * 检查 Blob URL 是否存在
   * @param key - 要检查的键
   * @returns 是否存在
   */
  hasBlobURL(key: string): boolean {
    return this.blobURLs.has(key);
  }

  /**
   * 获取 Blob URL
   * @param key - 要获取的键
   * @returns Blob URL
   */
  getBlobURL(key: string): string | null {
    return this.blobURLs.get(key) || null;
  }

  /**
   * 清理 Blob URL
   * @param key - 要清理的 Blob URL 对应的键
   */
  revokeBlobURL(key: string): void {
    const blobURL = this.blobURLs.get(key);
    if (blobURL) {
      URL.revokeObjectURL(blobURL);
      this.blobURLs.delete(key);
    }
  }

  /**
   * 清理所有 Blob URL
   */
  revokeAllBlobURLs(): void {
    try {
      for (const blobURL of this.blobURLs.values()) {
        URL.revokeObjectURL(blobURL);
      }
      this.blobURLs.clear();
    } catch (error) {
      console.error("❌ Error revoking all Blob URLs:", error);
    }
  }
}

let instance: BlobURLManager | null = null;

/**
 * 获取 BlobURLManager 实例
 * @returns BlobURLManager
 */
export const useBlobURLManager = (): BlobURLManager => {
  if (!instance) instance = new BlobURLManager();
  return instance;
};
