import { app } from "electron";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";

const APP_NAME = "Kraken Player";
const MIGRATION_FILE = ".kraken-player-migration.json";
const LEGACY_APP_NAMES = ["SPlayer", "splayer"];
const PROFILE_ENTRIES = [
  "config.json",
  "Cookies",
  "IndexedDB",
  "Local Storage",
  "Network/Cookies",
  "Preferences",
  "Session Storage",
];

/** 配置 Kraken Player 数据目录 */
export const configureUserDataPath = () => {
  app.setName(APP_NAME);

  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    const portablePath = join(process.env.PORTABLE_EXECUTABLE_DIR, "UserData");
    mkdirSync(portablePath, { recursive: true });
    app.setPath("userData", portablePath);
    return;
  }

  app.setPath("userData", join(app.getPath("appData"), APP_NAME));
};

/** 查找旧版用户数据目录 */
const getLegacyDataPath = (targetPath: string) => {
  const appDataPath = app.getPath("appData");
  return LEGACY_APP_NAMES.map((name) => join(appDataPath, name)).find(
    (path) => existsSync(path) && resolve(path) !== resolve(targetPath),
  );
};

/** 获取可复用的旧版缓存目录 */
export const getLegacyCachePath = (): string | null => {
  const sourcePath = getLegacyDataPath(app.getPath("userData"));
  if (!sourcePath) return null;

  const legacyCachePath = join(sourcePath, "DataCache");
  return existsSync(legacyCachePath) ? legacyCachePath : null;
};

/** 修正旧缓存默认目录 */
const updateDefaultCachePath = (sourcePath: string, targetPath: string) => {
  const configPath = join(targetPath, "config.json");
  if (!existsSync(configPath)) return;

  try {
    const config = JSON.parse(readFileSync(configPath, "utf-8")) as { cachePath?: string };
    if (config.cachePath === join(sourcePath, "DataCache")) {
      config.cachePath = join(targetPath, "DataCache");
      writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    }
  } catch {
    // 忽略无效配置
  }
};

/** 复制旧版用户配置 */
export const migrateLegacyUserData = () => {
  const targetPath = app.getPath("userData");
  const markerPath = join(targetPath, MIGRATION_FILE);
  if (existsSync(markerPath)) return;

  mkdirSync(targetPath, { recursive: true });
  const sourcePath = getLegacyDataPath(targetPath);
  const copied: string[] = [];

  if (sourcePath) {
    for (const entry of PROFILE_ENTRIES) {
      const sourceEntry = join(sourcePath, entry);
      const targetEntry = join(targetPath, entry);
      if (!existsSync(sourceEntry) || existsSync(targetEntry)) continue;

      mkdirSync(dirname(targetEntry), { recursive: true });
      cpSync(sourceEntry, targetEntry, { errorOnExist: true, force: false, recursive: true });
      copied.push(entry);
    }
    updateDefaultCachePath(sourcePath, targetPath);
  }

  writeFileSync(
    markerPath,
    JSON.stringify({
      copied,
      migratedAt: new Date().toISOString(),
      sourcePath: sourcePath ?? null,
    }),
    "utf-8",
  );
};
