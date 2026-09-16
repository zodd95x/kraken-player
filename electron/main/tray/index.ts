import type { RepeatModeType, ShuffleModeType } from "@shared";
import {
  app,
  type BrowserWindow,
  Menu,
  type MenuItemConstructorOptions,
  nativeImage,
  NativeImage,
  nativeTheme,
  Tray,
} from "electron";
import { join } from "path";
import { trayLog } from "../logger";
import { useStore } from "../store";
import { appName, isMac, isWin } from "../utils/config";
import lyricWindow from "../windows/lyric-window";

// 播放模式
type PlayState = "play" | "pause" | "loading";

let repeatMode: RepeatModeType = "list";
let shuffleMode: ShuffleModeType = "off";

// 全局数据
let playState: PlayState = "pause";
let playName: string = "未播放歌曲";
let likeSong: boolean = false;
let desktopLyricShow: boolean = false;
let desktopLyricLock: boolean = false;
let taskbarLyricShow: boolean = false;
let currentLanguage: string = "en";

// 托盘多语言文本
const trayI18n: Record<string, Record<string, string>> = {
  zh: {
    noSong: "未播放歌曲",
    removeFromFavorites: "从我喜欢中移除",
    addToFavorites: "添加到我喜欢",
    heartbeatMode: "心动模式",
    shuffle: "随机播放",
    repeatList: "列表循环",
    repeatOne: "单曲循环",
    repeatOff: "不循环",
    repeatOffLabel: "关闭循环",
    prev: "上一曲",
    play: "播放",
    pause: "暂停",
    next: "下一曲",
    enableDesktopLyric: "开启桌面歌词",
    disableDesktopLyric: "关闭桌面歌词",
    lockDesktopLyric: "锁定桌面歌词",
    unlockDesktopLyric: "解锁桌面歌词",
    enableTaskbarLyric: "开启任务栏歌词",
    disableTaskbarLyric: "关闭任务栏歌词",
    enableStatusBarLyric: "开启状态栏歌词",
    disableStatusBarLyric: "关闭状态栏歌词",
    settings: "全局设置",
    exit: "退出",
  },
  en: {
    noSong: "No track playing",
    removeFromFavorites: "Remove from Favorites",
    addToFavorites: "Add to Favorites",
    heartbeatMode: "Heartbeat Mode",
    shuffle: "Shuffle",
    repeatList: "Repeat All",
    repeatOne: "Repeat One",
    repeatOff: "No Repeat",
    repeatOffLabel: "Repeat Off",
    prev: "Previous",
    play: "Play",
    pause: "Pause",
    next: "Next",
    enableDesktopLyric: "Show Desktop Lyrics",
    disableDesktopLyric: "Hide Desktop Lyrics",
    lockDesktopLyric: "Lock Desktop Lyrics",
    unlockDesktopLyric: "Unlock Desktop Lyrics",
    enableTaskbarLyric: "Show Taskbar Lyrics",
    disableTaskbarLyric: "Hide Taskbar Lyrics",
    enableStatusBarLyric: "Show Status Bar Lyrics",
    disableStatusBarLyric: "Hide Status Bar Lyrics",
    settings: "Settings",
    exit: "Quit",
  },
  fr: {
    noSong: "Aucun morceau en cours",
    removeFromFavorites: "Retirer des favoris",
    addToFavorites: "Ajouter aux favoris",
    heartbeatMode: "Mode coup de cœur",
    shuffle: "Lecture aléatoire",
    repeatList: "Répéter la liste",
    repeatOne: "Répéter le titre",
    repeatOff: "Ne pas répéter",
    repeatOffLabel: "Désactiver la répétition",
    prev: "Précédent",
    play: "Lecture",
    pause: "Pause",
    next: "Suivant",
    enableDesktopLyric: "Afficher les paroles de bureau",
    disableDesktopLyric: "Masquer les paroles de bureau",
    lockDesktopLyric: "Verrouiller les paroles de bureau",
    unlockDesktopLyric: "Déverrouiller les paroles de bureau",
    enableTaskbarLyric: "Afficher les paroles de la barre des tâches",
    disableTaskbarLyric: "Masquer les paroles de la barre des tâches",
    enableStatusBarLyric: "Afficher les paroles de la barre d'état",
    disableStatusBarLyric: "Masquer les paroles de la barre d'état",
    settings: "Paramètres",
    exit: "Quitter",
  },
};

const getTrayText = (key: string): string => {
  const dict = trayI18n[currentLanguage] || trayI18n["en"] || trayI18n["zh"];
  return dict[key] || trayI18n["zh"][key] || key;
};

export interface MainTray {
  setTitle(title: string): void;
  setPlayMode(repeat: RepeatModeType, shuffle: ShuffleModeType): void;
  setLikeState(like: boolean): void;
  setPlayState(state: PlayState): void;
  setPlayName(name: string): void;
  setDesktopLyricShow(show: boolean): void;
  setDesktopLyricLock(lock: boolean): void;
  setTaskbarLyricShow(show: boolean): void;
  setLanguage(lang: string): void;
  initTrayMenu(): void;
  destroyTray(): void;
}

// 托盘单例
let mainTrayInstance: MainTray | null = null;

/**
 * macOS 托盘图标获取函数
 * 使用模板图像实现自动颜色适配
 */
const getTrayIcon = (): NativeImage | null => {
  if (!isMac) return null;
  const filename = "tray-light.png";
  const iconPath = join(__dirname, `../../public/icons/tray/${filename}`);
  const fallbackIconPath = join(__dirname, `../../resources/icon.png`);

  try {
    let image = nativeImage.createFromPath(iconPath);

    image = image.resize({ width: 19, height: 19 });

    image.setTemplateImage(true);

    return image;
  } catch (error) {
    trayLog.error(`获取托盘图标失败: ${error}`);
    try {
      let fallbackImage = nativeImage.createFromPath(fallbackIconPath);
      fallbackImage = fallbackImage.resize({ width: 19, height: 19 });
      fallbackImage.setTemplateImage(true);
      return fallbackImage;
    } catch (fallbackError) {
      trayLog.error(`备用托盘图标加载也失败: ${fallbackError}`);
      return null;
    }
  }
};

/**
 * 获取 macOS 菜单图标
 * 根据系统主题选择合适的图标
 */
const getMenuIcon = (iconName: string): NativeImage | undefined => {
  const isDark = nativeTheme.shouldUseDarkColors;
  const suffix = isDark ? "dark" : "light";
  const iconPath = join(__dirname, `../../public/icons/tray/${iconName}-${suffix}.png`);
  try {
    const image = nativeImage.createFromPath(iconPath);
    return image.resize({ width: 16, height: 16 });
  } catch (error) {
    trayLog.warn(`无法加载菜单图标: ${iconPath}`, error);
    // 后备方案：尝试加载默认图标
    const defaultPath = join(__dirname, `../../public/icons/tray/${iconName}-dark.png`);
    try {
      const image = nativeImage.createFromPath(defaultPath);
      return image.resize({ width: 16, height: 16 });
    } catch (fallbackError) {
      trayLog.error(`无法加载菜单图标后备方案: ${defaultPath}`, fallbackError);
      return undefined;
    }
  }
};

// 托盘菜单
const createTrayMenu = (win: BrowserWindow): MenuItemConstructorOptions[] => {
  const store = useStore();
  /**
   * 获取 {@linkcode RepeatModeType} 对应的显示字符串
   * @param mode 重复模式
   * @returns 对应的显示字符串
   */
  const getRepeatLabel = (mode: RepeatModeType): string => {
    switch (mode) {
      case "one":
        return getTrayText("repeatOne");
      case "off":
        return getTrayText("repeatOff");
      case "list":
      default:
        return getTrayText("repeatList");
    }
  };

  const isMacosLyricEnabled = store.get("macos.statusBarLyric.enabled") ?? false;

  // 菜单
  const menu: MenuItemConstructorOptions[] = [
    {
      id: "name",
      label: playName === "未播放歌曲" ? getTrayText("noSong") : playName,
      icon: getMenuIcon("music"),
      click: () => {
        win.show();
        win.focus();
      },
    },
    {
      type: "separator",
    },
    {
      id: "toggle-like-song",
      label: likeSong ? getTrayText("removeFromFavorites") : getTrayText("addToFavorites"),
      icon: getMenuIcon(likeSong ? "like" : "unlike"),
      click: () => win.webContents.send("toggle-like-song"),
    },
    {
      id: "shuffle",
      label: shuffleMode === "heartbeat" ? getTrayText("heartbeatMode") : getTrayText("shuffle"),
      icon: getMenuIcon("shuffle"),
      type: "checkbox",
      checked: shuffleMode !== "off",
      click: () => win.webContents.send("toggleShuffle"),
    },
    {
      id: "repeatMode",
      label: getRepeatLabel(repeatMode),
      icon: getMenuIcon(repeatMode === "one" ? "repeat-once" : "repeat"),
      submenu: [
        {
          label: getTrayText("repeatList"),
          icon: getMenuIcon("repeat"),
          type: "radio",
          checked: repeatMode === "list",
          click: () => win.webContents.send("changeRepeat", "list"),
        },
        {
          label: getTrayText("repeatOne"),
          icon: getMenuIcon("repeat-once"),
          type: "radio",
          checked: repeatMode === "one",
          click: () => win.webContents.send("changeRepeat", "one"),
        },
        {
          label: getTrayText("repeatOffLabel"),
          icon: getMenuIcon("repeat"),
          type: "radio",
          checked: repeatMode === "off",
          click: () => win.webContents.send("changeRepeat", "off"),
        },
      ],
    },
    {
      type: "separator",
    },
    {
      id: "playNext",
      label: getTrayText("prev"),
      icon: getMenuIcon("prev"),
      click: () => win.webContents.send("playPrev"),
    },
    {
      id: "playOrPause",
      label: playState === "pause" ? getTrayText("play") : getTrayText("pause"),
      icon: getMenuIcon(playState === "pause" ? "play" : "pause"),
      click: () => win.webContents.send(playState === "pause" ? "play" : "pause"),
    },
    {
      id: "playNext",
      label: getTrayText("next"),
      icon: getMenuIcon("next"),
      click: () => win.webContents.send("playNext"),
    },
    {
      type: "separator",
    },
    {
      id: "toggle-desktop-lyric",
      label: desktopLyricShow
        ? getTrayText("disableDesktopLyric")
        : getTrayText("enableDesktopLyric"),
      icon: getMenuIcon("lyric"),
      click: () => win.webContents.send("desktop-lyric:toggle"),
    },
    {
      id: "toggle-desktop-lyric-lock",
      label: desktopLyricLock ? getTrayText("unlockDesktopLyric") : getTrayText("lockDesktopLyric"),
      icon: getMenuIcon(desktopLyricLock ? "lock" : "unlock"),
      visible: desktopLyricShow,
      click: () => {
        const store = useStore();
        store.set("lyric.config", { ...store.get("lyric.config"), isLock: !desktopLyricLock });
        const config = store.get("lyric.config");
        const lyricWin = lyricWindow.getWin();
        if (!lyricWin) return;
        lyricWin.webContents.send("desktop-lyric:update-option", config);
      },
    },
    {
      id: "toggle-taskbar-lyric",
      label: isMac
        ? isMacosLyricEnabled
          ? getTrayText("disableStatusBarLyric")
          : getTrayText("enableStatusBarLyric")
        : taskbarLyricShow
          ? getTrayText("disableTaskbarLyric")
          : getTrayText("enableTaskbarLyric"),
      icon: getMenuIcon("lyric"),
      visible: isWin || isMac,
      click: () => win.webContents.send("toggle-taskbar-lyric"),
    },
    {
      type: "separator",
    },
    {
      id: "setting",
      label: getTrayText("settings"),
      icon: getMenuIcon("setting"),
      click: () => {
        win.show();
        win.focus();
        win.webContents.send("openSetting");
      },
    },
    {
      type: "separator",
    },
    {
      id: "exit",
      label: getTrayText("exit"),
      icon: getMenuIcon("power"),
      click: () => {
        app.quit();
      },
    },
  ];
  return menu;
};

// 创建托盘
class CreateTray implements MainTray {
  // 窗口
  private _win: BrowserWindow;
  // 托盘
  private _tray: Tray;
  // 菜单
  private _menu: MenuItemConstructorOptions[];
  private _contextMenu: Menu;

  constructor(win: BrowserWindow) {
    this._win = win;

    if (isWin) {
      const iconPath = join(__dirname, `../../public/icons/tray/tray.ico`);
      const icon = nativeImage.createFromPath(iconPath).resize({ height: 20, width: 20 });
      this._tray = new Tray(icon);
    } else if (isMac) {
      const icon = getTrayIcon();
      if (icon) {
        this._tray = new Tray(icon);
      } else {
        throw new Error("Failed to create tray icon for macOS");
      }
    } else {
      const iconPath = join(__dirname, `../../public/icons/tray/tray@32.png`);
      const icon = nativeImage.createFromPath(iconPath).resize({ height: 20, width: 20 });
      this._tray = new Tray(icon);
    }

    this._menu = createTrayMenu(this._win);
    this._contextMenu = Menu.buildFromTemplate(this._menu);
    this.initTrayMenu();
    this.initEvents();
    this._tray.setTitle(appName); // 仅设置托盘标题，不设置窗口标题
  }
  // 托盘菜单
  public initTrayMenu() {
    this._menu = createTrayMenu(this._win);
    this._contextMenu = Menu.buildFromTemplate(this._menu);
    this._tray.setContextMenu(this._contextMenu);
  }
  // 托盘事件
  private initEvents() {
    // 点击
    this._tray.on("click", () => this._win.show());

    // 监听系统主题变化，用于菜单图标的更新
    nativeTheme.addListener("updated", () => {
      this.initTrayMenu();
    });
  }

  // 设置标题
  /**
   * 设置标题
   * @param title 标题
   */
  setTitle(title: string) {
    this._tray.setTitle(title);
    this._tray.setToolTip(title);
  }
  /**
   * 设置播放名称
   * @param name 播放名称
   */
  setPlayName(name: string) {
    // 超长处理
    if (name.length > 20) name = name.slice(0, 20) + "...";
    playName = name;
    // 更新菜单
    this.initTrayMenu();
  }
  /**
   * 设置播放状态
   * @param state 播放状态
   */
  setPlayState(state: PlayState) {
    playState = state;
    // 更新菜单
    this.initTrayMenu();
  }
  /**
   * 设置播放模式
   * @param repeat 当前的重复播放模式
   * @param shuffle 当前的随机播放模式
   */
  setPlayMode(repeat: RepeatModeType, shuffle: ShuffleModeType) {
    repeatMode = repeat;
    shuffleMode = shuffle;
    // 更新菜单
    this.initTrayMenu();
  }
  /**
   * 设置喜欢状态
   * @param like 喜欢状态
   */
  setLikeState(like: boolean) {
    likeSong = like;
    // 更新菜单
    this.initTrayMenu();
  }
  /**
   * 桌面歌词开关
   * @param show 桌面歌词开关状态
   */
  setDesktopLyricShow(show: boolean) {
    desktopLyricShow = show;
    // 更新菜单
    this.initTrayMenu();
  }
  /**
   * 锁定桌面歌词
   * @param lock 锁定桌面歌词状态
   */
  setDesktopLyricLock(lock: boolean) {
    desktopLyricLock = lock;
    // 更新菜单
    this.initTrayMenu();
  }

  setTaskbarLyricShow(show: boolean) {
    taskbarLyricShow = show;
    // 更新菜单
    this.initTrayMenu();
  }

  /**
   * 设置语言
   * @param lang 语言代码 ('zh' | 'en' | 'fr')
   */
  setLanguage(lang: string) {
    if (lang && currentLanguage !== lang) {
      currentLanguage = lang;
      this.initTrayMenu();
    }
  }

  /**
   * 销毁托盘
   */
  destroyTray() {
    this._tray.destroy();
  }
}

/**
 * 初始化托盘
 * @param win 主窗口
 * @returns 托盘实例
 */
export const initTray = (win: BrowserWindow) => {
  try {
    trayLog.info("🚀 Tray Process Startup");
    const tray = new CreateTray(win);
    // 保存单例实例
    mainTrayInstance = tray;
    return tray;
  } catch (error) {
    trayLog.error("❌ Tray Process Error", error);
    return null;
  }
};

/**
 * 获取托盘实例
 * @returns 托盘实例
 */
export const getMainTray = (): MainTray | null => mainTrayInstance;
