import type {
  JsRect,
  JsTaskbarLayout,
  RegistryWatcher,
  TaskbarCreatedWatcher,
  TaskbarService,
  TrayWatcher,
  UiaWatcher,
} from "@native/taskbar-lyric";
import { TASKBAR_IPC_CHANNELS, type TaskbarLyricPosition } from "@shared";
import { BrowserWindow, screen } from "electron";
import { join } from "node:path";
import { processLog } from "../logger";
import { useStore } from "../store";
import { getMainTray } from "../tray";
import { isDev } from "../utils/config";
import { isAppQuitting } from "../utils/lifecycle";
import { loadNativeModule } from "../utils/native-loader";
import { createWindow } from "./index";

type TaskbarLyricNative = typeof import("@native/taskbar-lyric");

const REG_SUBKEY_EXPLORER_ADVANCED =
  "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced";
const REG_SUBKEY_PERSONALIZE = "Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize";

type AnchorSide = "left" | "right";

interface PickedSpace {
  rect: JsRect;
  anchor: AnchorSide;
}

let taskbarLyricWindow: BrowserWindow | null = null;
let nativeModule: TaskbarLyricNative | null = null;
let service: TaskbarService | null = null;
let advancedRegWatcher: RegistryWatcher | null = null;
let themeRegWatcher: RegistryWatcher | null = null;
let uiaWatcher: UiaWatcher | null = null;
let trayWatcher: TrayWatcher | null = null;
let taskbarCreatedWatcher: TaskbarCreatedWatcher | null = null;

/** 从设置读取当前歌词宽度（Win10 据此从 tasklist 划空间，Win11 忽略） */
const resolveLyricWidth = (): number => {
  const width = useStore().get("taskbarLyric").maxWidth;
  return typeof width === "number" && width > 0 ? width : 400;
};

/**
 * 初始窗口尺寸——故意设大，覆盖任何可能的任务栏宽度/高度。
 * 关键原因：Electron BrowserWindow 在 transparent:true + SetParent 到任务栏后，
 * Chromium 视口（layered window 的 compositor surface）不会随 setBounds 扩大，
 * 只会收缩。初始尺寸小于后续 setBounds 目标时，超出初始尺寸的区域像素 alpha=0，
 * 按像素 alpha 命中测试会吞掉鼠标事件。解决方法：初始尺寸开到足够大，后续 setBounds 只做缩小。
 */
const INITIAL_WIDTH = 3000;
const INITIAL_HEIGHT = 200;

/**
 * 可显示的最小宽度（DIP）。任务栏挤满 / 居中且两侧仅余几十像素时，强行塞会变成挤压的几个字符，
 * 视觉很糟，直接隐藏窗口；空间回升后再 show。
 */
const MIN_LYRIC_WIDTH_DIP = 120;

const TASKBAR_LYRIC_URL =
  isDev && process.env.ELECTRON_RENDERER_URL
    ? `${process.env.ELECTRON_RENDERER_URL}/windows/taskbar-lyric/index.html`
    : "";

/** 获取任务栏歌词窗口实例（未创建或已销毁时返回 null） */
export const getTaskbarLyricWindow = (): BrowserWindow | null =>
  taskbarLyricWindow && !taskbarLyricWindow.isDestroyed() ? taskbarLyricWindow : null;

/** 根据设置和任务栏对齐方式选择使用哪侧空间以及锚定方向 */
const pickSpace = (layout: JsTaskbarLayout): PickedSpace | null => {
  const position: TaskbarLyricPosition = useStore().get("taskbarLyric").position ?? "auto";
  const { left, right } = layout.space;
  const isCentered = layout.extra.isCentered;

  if (position === "left" && left.width > 0) return { rect: left, anchor: "left" };
  if (position === "right" && right.width > 0) return { rect: right, anchor: "right" };

  if (position === "auto") {
    if (isCentered) {
      if (left.width >= right.width) return { rect: left, anchor: "left" };
      return { rect: right, anchor: "right" };
    }
    return right.width > 0 ? { rect: right, anchor: "right" } : { rect: left, anchor: "left" };
  }

  if (right.width > 0) return { rect: right, anchor: "right" };
  if (left.width > 0) return { rect: left, anchor: "left" };
  return null;
};

/** 首次 applyLayout 成功后才 show 窗口——避免初始 3000x200 大窗口闪现 */
let firstLayoutDone = false;

/** 是否有可展示的曲目内容（空标题时保持隐藏，避免清空列表后残留/复活） */
let hasTrackContent = false;

/** 更新内容标记：空标题隐藏窗口，有标题允许显示 */
export const setTaskbarLyricHasContent = (hasContent: boolean): void => {
  hasTrackContent = hasContent;
};

/** 空间不足时安静隐藏窗口，避免残留旧位置的歌词残影 */
const hideIfVisible = (win: BrowserWindow): void => {
  if (win.isVisible()) win.hide();
};

/** Rust 布局回调：把物理像素空间转为 DIP，<阈值则隐藏，≥阈值则 setBounds 并 show */
const applyLayout = (layout: JsTaskbarLayout): void => {
  const win = getTaskbarLyricWindow();
  if (!win) return;

  // 无内容时保持隐藏：布局更新不得复活清空列表后隐藏的窗口
  if (!hasTrackContent) {
    hideIfVisible(win);
    return;
  }

  const picked = pickSpace(layout);
  if (!picked) {
    hideIfVisible(win);
    return;
  }
  const { rect, anchor } = picked;
  if (rect.width <= 0 || rect.height <= 0) {
    hideIfVisible(win);
    return;
  }

  // Rust 返回物理像素，setBounds 用 DIP，需按 scaleFactor 转换
  const dpi = screen.getPrimaryDisplay().scaleFactor;
  const availX = Math.round(rect.x / dpi);
  const availY = Math.round(rect.y / dpi);
  const availWidth = Math.round(rect.width / dpi);
  const availHeight = Math.round(rect.height / dpi);

  if (availWidth < MIN_LYRIC_WIDTH_DIP) {
    hideIfVisible(win);
    return;
  }

  const cfg = useStore().get("taskbarLyric");
  const windowWidth = cfg.autoMaxWidth ? availWidth : Math.min(cfg.maxWidth, availWidth);
  const windowX = anchor === "right" ? availX + availWidth - windowWidth : availX;

  win.setBounds({ x: windowX, y: availY, width: windowWidth, height: availHeight });

  if (!firstLayoutDone) {
    firstLayoutDone = true;
    win.showInactive();
  } else if (!win.isVisible()) {
    win.showInactive();
  }

  win.webContents.send(TASKBAR_IPC_CHANNELS.LAYOUT, {
    isCentered: layout.extra.isCentered,
    systemType: layout.extra.systemType,
    isLight: layout.extra.isLight,
    anchor,
  });
};

/** Watcher 回调——任何任务栏相关变化都回到这里重算布局 */
const onLayoutChange = (): void => {
  service?.update(resolveLyricWidth());
};

/** 安全创建原生 watcher，失败只 warn 不中断启动 */
const tryStart = <T>(name: string, factory: () => T): T | null => {
  try {
    return factory();
  } catch (error) {
    processLog.warn(`[TaskbarLyric] ${name} 启动失败`, error);
    return null;
  }
};

/** 启动布局相关的四个 watcher（UIA / Tray / 两个注册表） */
const startWatchers = (mod: TaskbarLyricNative): void => {
  advancedRegWatcher = tryStart(
    "RegistryWatcher(Advanced)",
    () => new mod.RegistryWatcher(REG_SUBKEY_EXPLORER_ADVANCED, onLayoutChange),
  );
  themeRegWatcher = tryStart(
    "RegistryWatcher(Personalize)",
    () => new mod.RegistryWatcher(REG_SUBKEY_PERSONALIZE, onLayoutChange),
  );
  uiaWatcher = tryStart("UiaWatcher", () => new mod.UiaWatcher(onLayoutChange));
  trayWatcher = tryStart("TrayWatcher", () => new mod.TrayWatcher(onLayoutChange));
};

/** 停止布局相关的四个 watcher（不包含 TaskbarCreatedWatcher） */
const stopLayoutWatchers = (): void => {
  advancedRegWatcher?.stop();
  advancedRegWatcher = null;
  themeRegWatcher?.stop();
  themeRegWatcher = null;
  uiaWatcher?.stop();
  uiaWatcher = null;
  trayWatcher?.stop();
  trayWatcher = null;
};

/**
 * explorer.exe 重启后调用：
 * 1. UIA / Tray watcher 绑定在旧 explorer 进程，必须整体重建
 * 2. 注册表 watcher 不绑定进程，但一并重建以简化状态
 * 3. service.reinit() 让 Rust 端重建策略并用记忆的 hwnd/width 恢复嵌入
 */
const onExplorerRestart = (): void => {
  processLog.info("[TaskbarLyric] 探测到 explorer 重启，重建 watcher 与嵌入");
  stopLayoutWatchers();
  service?.reinit();
  if (nativeModule) startWatchers(nativeModule);
};

/** 停止并清空所有 watcher 与 service */
const cleanupWatchers = (): void => {
  stopLayoutWatchers();
  taskbarCreatedWatcher?.stop();
  taskbarCreatedWatcher = null;
  service?.stop();
  service = null;
};

/** 创建任务栏歌词窗口：加载原生模块、嵌入任务栏 HWND 并启动 watcher */
export const createTaskbarLyricWindow = (): BrowserWindow | null => {
  if (process.platform !== "win32") {
    processLog.warn("[TaskbarLyric] 任务栏歌词仅支持 Windows");
    return null;
  }

  if (taskbarLyricWindow && !taskbarLyricWindow.isDestroyed()) {
    taskbarLyricWindow.show();
    return taskbarLyricWindow;
  }

  if (!nativeModule) {
    nativeModule = loadNativeModule(
      "taskbar-lyric.node",
      "taskbar-lyric",
    ) as TaskbarLyricNative | null;
    if (!nativeModule) {
      processLog.error("[TaskbarLyric] 原生模块加载失败");
      return null;
    }
  }

  service = new nativeModule.TaskbarService(applyLayout);

  taskbarLyricWindow = createWindow({
    width: INITIAL_WIDTH,
    height: INITIAL_HEIGHT,
    // 覆盖默认 minWidth/minHeight，允许 setBounds 缩小到很小
    minWidth: 0,
    minHeight: 0,
    type: "toolbar",
    title: "Taskbar Lyric",
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    backgroundColor: "#00000000",
    webPreferences: {
      zoomFactor: 1.0,
      partition: "persist:taskbar-lyric",
    },
  });

  if (!taskbarLyricWindow) {
    processLog.error("[TaskbarLyric] 创建窗口失败");
    cleanupWatchers();
    return null;
  }

  if (TASKBAR_LYRIC_URL) {
    taskbarLyricWindow.loadURL(TASKBAR_LYRIC_URL);
  } else {
    taskbarLyricWindow.loadFile(join(__dirname, "../renderer/windows/taskbar-lyric/index.html"));
  }

  // 任务栏窗口很小，默认嵌入式开发者工具无法使用，监听 F12 以分离模式打开
  taskbarLyricWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F12" && input.type === "keyDown") {
      const wc = taskbarLyricWindow?.webContents;
      if (!wc) return;
      if (wc.isDevToolsOpened()) wc.closeDevTools();
      else wc.openDevTools({ mode: "detach" });
      event.preventDefault();
    }
  });

  taskbarLyricWindow.once("ready-to-show", () => {
    const win = taskbarLyricWindow;
    const svc = service;
    const mod = nativeModule;
    if (!win || !svc || !mod) return;

    // Windows 上 HWND 可能是 64 位值，先保留为 BigInt，避免直接转 number 产生静默精度丢失
    const hwndPtrBigInt = win.getNativeWindowHandle().readBigUInt64LE(0);
    if (hwndPtrBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
      processLog.error(
        `[TaskbarLyric] 嵌入窗口失败：hwnd=${hwndPtrBigInt.toString()} 超出 JS Number 安全整数范围`,
      );
      return;
    }
    const hwndPtr = Number(hwndPtrBigInt);
    processLog.info(`[TaskbarLyric] 嵌入窗口 hwnd=${hwndPtr}`);
    svc.embedWindowByPtr(hwndPtr);
    svc.update(resolveLyricWidth());

    startWatchers(mod);
    taskbarCreatedWatcher = tryStart(
      "TaskbarCreatedWatcher",
      () => new mod.TaskbarCreatedWatcher(onExplorerRestart),
    );
  });

  taskbarLyricWindow.on("closed", () => {
    taskbarLyricWindow = null;
    firstLayoutDone = false;
    cleanupWatchers();
    getMainTray()?.setTaskbarLyricShow(false);
    if (!isAppQuitting()) {
      useStore().set("windowStates.taskbarLyric.visible", false);
    }
  });

  getMainTray()?.setTaskbarLyricShow(true);
  useStore().set("windowStates.taskbarLyric.visible", true);
  return taskbarLyricWindow;
};

/** 请求关闭任务栏歌词窗口，实际清理由 "closed" 事件统一处理 */
export const closeTaskbarLyricWindow = (): void => {
  if (taskbarLyricWindow && !taskbarLyricWindow.isDestroyed()) {
    taskbarLyricWindow.close();
  }
};

/** 切换任务栏歌词窗口显隐，返回切换后是否打开（非 Windows 平台或创建失败返回 false） */
export const toggleTaskbarLyricWindow = (): boolean => {
  if (taskbarLyricWindow && !taskbarLyricWindow.isDestroyed()) {
    closeTaskbarLyricWindow();
    return false;
  }
  return createTaskbarLyricWindow() !== null;
};

/** 设置任务栏歌词窗口显隐 */
export const setTaskbarLyricVisible = (visible: boolean): void => {
  if (visible) createTaskbarLyricWindow();
  else closeTaskbarLyricWindow();
};

/** 触发一次布局重算（配置变更后调用） */
export const applyTaskbarLyricLayout = (): void => {
  service?.update(resolveLyricWidth());
};

/** 向任务栏歌词窗口转发消息 */
export const sendToTaskbarLyric = (channel: string, ...args: unknown[]): void => {
  const win = getTaskbarLyricWindow();
  if (win) win.webContents.send(channel, ...args);
};
