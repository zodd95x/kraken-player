// 封装对 @neteasecloudmusicapienhanced/api 内部模块的依赖
// 该包未对外导出 generateConfig / server 的稳定接口，此处集中处理「伸进内部文件」的耦合
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { serverLog } from "../../main/logger";
import generateConfig from "@neteasecloudmusicapienhanced/api/generateConfig.js";
import ncmServerExports from "@neteasecloudmusicapienhanced/api/server.js";

// 包 server.js 的导出（serveNcmApi、getModulesDefinitions 等）会被合并到主入口对象上，
// 它们不是网易云接口模块，必须从动态路由中排除，避免被当作 HTTP 接口调用（如 /netease/serve-ncm-api）。
export const NON_API_EXPORTS = new Set<string>([
  ...Object.keys(ncmServerExports ?? {}),
  "server", // 主入口对象上的 server getter
]);

// xeapi 公钥缓存文件路径（由 generateConfig 写入系统临时目录）
const xeapiPublicKeyPath = join(tmpdir(), "xeapi_public_key");

let ncmConfigReady = false;
let ncmConfigPromise: Promise<void> | null = null;

/**
 * 确保 NcmAPI 配置就绪
 *
 * 新版本 @neteasecloudmusicapienhanced/api 的 song/url/v1 等接口改用 xeapi 加密，
 * 必须先调用 generateConfig 注册匿名 token 并获取 xeapi 公钥，
 * 否则请求会抛出 "xeapi public key is missing"。
 *
 * 不阻塞服务启动；失败时不锁死状态，下次调用会自动重试。
 */
export const ensureNcmConfig = (): Promise<void> => {
  if (ncmConfigReady) return Promise.resolve();
  if (!ncmConfigPromise) {
    ncmConfigPromise = generateConfig()
      .then(() => {
        if (existsSync(xeapiPublicKeyPath)) {
          ncmConfigReady = true;
          serverLog.info("🔑 NcmAPI xeapi 公钥初始化完成");
        } else {
          serverLog.error("❌ NcmAPI xeapi 公钥生成失败，下次请求将重试");
        }
      })
      .catch((error: unknown) => {
        serverLog.error("❌ NcmAPI 配置初始化失败:", error);
      })
      .finally(() => {
        // 释放，未成功时允许后续请求重新尝试
        ncmConfigPromise = null;
      });
  }
  return ncmConfigPromise;
};
