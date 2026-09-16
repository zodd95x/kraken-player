import { mediaSessionManager } from "@/core/player/MediaSessionManager";
import { usePlayerController } from "@/core/player/PlayerController";
import { sendTaskbarSpectrumThrottled } from "@/core/player/PlayerIpc";
import { useDownloadManager } from "@/core/resource/DownloadManager";
import { useDataStore, useSettingStore, useShortcutStore, useStatusStore } from "@/stores";
import { TASKBAR_IPC_CHANNELS, TASKBAR_SPECTRUM_BARS } from "@/types/shared";
import { isElectron, isMac, checkIsolationSupport } from "@/utils/env";
import { printVersion } from "@/utils/log";
import { openUserAgreement } from "@/utils/modal";
import { useEventListener } from "@vueuse/core";
import { debounce } from "lodash-es";
import { onMounted, onUnmounted, watch } from "vue";

/** 频谱转发间隔（毫秒，提高到 20fps 更跟手） */
const SPECTRUM_FORWARD_MS = 50;

/**
 * 下采样频谱到固定柱数（对数映射 + 增益，贴近任务栏部件观感）
 */
const downsampleSpectrum = (raw: Uint8Array, bars: number): number[] => {
  if (raw.length === 0) return [];
  // 取有效频段（低频能量集中在前段，丢弃直流和高频噪声）
  const lo = 2;
  const hi = Math.min(raw.length, 120);
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    // 对数映射：低频密、高频疏，能量更均匀
    const t0 = i / bars;
    const t1 = (i + 1) / bars;
    const b0 = Math.floor(lo + (hi - lo) * (t0 * t0 * 0.6 + t0 * 0.4));
    const b1 = Math.max(b0 + 1, Math.floor(lo + (hi - lo) * (t1 * t1 * 0.6 + t1 * 0.4)));
    let peak = 0;
    let sum = 0;
    let count = 0;
    for (let b = b0; b < b1 && b < raw.length; b++) {
      const v = raw[b] ?? 0;
      sum += v;
      if (v > peak) peak = v;
      count++;
    }
    const avg = count > 0 ? sum / count : 0;
    // 峰值和均值混合 + 轻增益，保留动态（增益过大柱体全部顶满）
    const mixed = avg * 0.5 + peak * 0.5;
    // 轻门限 + 小增益：弱信号可见，强信号不削顶
    const boosted = (mixed - 6) * 1.0;
    out.push(Math.max(0, Math.min(255, Math.round(boosted))));
  }
  return out;
};

/**
 * 启动任务栏频谱转发
 */
const initTaskbarSpectrumForward = () => {
  if (!isElectron) return () => {};
  const win = window as unknown as { __spectrumFwdTimer?: number };
  // 单例：热更新重跑时先清旧循环，避免新旧增益叠加推送
  if (win.__spectrumFwdTimer) window.clearInterval(win.__spectrumFwdTimer);
  const player = usePlayerController();
  const statusStore = useStatusStore();
  const settingStore = useSettingStore();
  // 诊断探针：F12 控制台输入 window.__taskbarSpectrumDebug 查看
  const debug = {
    playbackEngine: "",
    audioEngine: "",
    showTaskbarLyric: true,
    rawMax: 0,
    sentMax: 0,
    zeroStreakSec: 0,
  };
  (window as unknown as { __taskbarSpectrumDebug?: typeof debug }).__taskbarSpectrumDebug = debug;
  let zeroSince = 0;
  let warned = false;
  const timer = window.setInterval(() => {
    try {
      // 只看播放状态：窗口显隐由主进程管理（窗口不存在时转发自动跳过），
      // 不能再用 showTaskbarLyric 设门——该标记与窗口实际显隐会脱钩（持久化残留 false 时频谱永久死亡）
      if (!statusStore.playStatus) {
        zeroSince = 0;
        return;
      }
      const raw = player.getSpectrumData();
      if (!raw || raw.length === 0) return;
      let peak = 0;
      for (let i = 0; i < raw.length; i++) {
        const v = raw[i] ?? 0;
        if (v > peak) peak = v;
      }
      const out = downsampleSpectrum(raw, TASKBAR_SPECTRUM_BARS);
      let outPeak = 0;
      for (const v of out) if (v > outPeak) outPeak = v;
      // 刷新探针
      debug.playbackEngine = settingStore.playbackEngine;
      debug.audioEngine = settingStore.audioEngine;
      debug.showTaskbarLyric = statusStore.showTaskbarLyric;
      debug.rawMax = peak;
      debug.sentMax = outPeak;
      if (peak <= 0) {
        if (!zeroSince) zeroSince = Date.now();
        debug.zeroStreakSec = Math.round((Date.now() - zeroSince) / 1000);
        // 播放中但长期无数据：只警告一次，指向引擎问题
        if (!warned && Date.now() - zeroSince > 3000) {
          warned = true;
          console.warn(
            `[taskbar-spectrum] 播放中但频谱全零 engine=${settingStore.playbackEngine}/${settingStore.audioEngine}，MPV 引擎无频谱数据，请切回 Web-Audio`,
          );
        }
      } else {
        zeroSince = 0;
        warned = false;
        debug.zeroStreakSec = 0;
      }
      sendTaskbarSpectrumThrottled(out);
    } catch {
      // 忽略单帧异常，保持转发循环
    }
  }, SPECTRUM_FORWARD_MS);
  win.__spectrumFwdTimer = timer;
  return () => window.clearInterval(timer);
};

/** 一键修复标记（每版只弹一次） */
const MPV_VISUALIZER_HINT_KEY = "mpv-visualizer-hint-v2";

/**
 * MPV 引擎无频谱数据，部件只能显示圆点
 * 检测到开着部件频谱时弹一次窗，一键切回 web-audio 并重启
 */
const checkMpvVisualizerOnce = (taskbarConfig: any) => {
  try {
    const settingStore = useSettingStore();
    if (settingStore.playbackEngine !== "mpv") return;
    if ((taskbarConfig?.displayMode ?? "lyric") !== "widget") return;
    if ((taskbarConfig?.showVisualizer ?? true) === false) return;
    if (localStorage.getItem(MPV_VISUALIZER_HINT_KEY)) return;
    localStorage.setItem(MPV_VISUALIZER_HINT_KEY, "1");
    // 三语提示
    const lang = settingStore.language;
    const text =
      lang === "fr"
        ? {
            title: "Spectre indisponible",
            content:
              "Le moteur MPV ne fournit pas de spectre audio : le widget ne peut afficher que des points. Basculer vers Web-Audio et redémarrer ? Le spectre deviendra réel.",
            positiveText: "Basculer et redémarrer",
            negativeText: "Garder MPV",
          }
        : lang === "en"
          ? {
              title: "No spectrum data",
              content:
                "The MPV engine provides no audio spectrum, so the widget can only show dots. Switch to the Web-Audio engine and restart? The spectrum will then be real.",
              positiveText: "Switch & restart",
              negativeText: "Keep MPV",
            }
          : {
              title: "任务栏频谱无数据",
              content:
                "当前为 MPV 引擎，该引擎不提供音频频谱，任务栏部件只能显示小圆点。是否一键切换到 Web-Audio 引擎并重启？切换后频谱即为真实播放数据。",
              positiveText: "一键切换并重启",
              negativeText: "保持 MPV",
            };
    window.$dialog.warning({
      ...text,
      onPositiveClick: () => {
        settingStore.playDevice = "default";
        settingStore.playbackEngine = "web-audio";
        settingStore.audioEngine = checkIsolationSupport() ? "ffmpeg" : "element";
        window.electron.ipcRenderer.send("win-restart");
      },
    });
  } catch {
    // 提示失败不影响主流程
  }
};

/** 最终聚焦主窗口的延迟时间（毫秒） */
const FINAL_FOCUS_DELAY_MS = 500;

/**
 * 应用初始化时需要执行的操作
 */
export const useInit = () => {
  // init pinia-data
  const dataStore = useDataStore();
  const statusStore = useStatusStore();
  const settingStore = useSettingStore();
  const shortcutStore = useShortcutStore();

  const player = usePlayerController();
  const downloadManager = useDownloadManager();

  // 事件监听
  initEventListener();
  // 频谱转发到任务栏
  const stopSpectrumForward = initTaskbarSpectrumForward();
  onUnmounted(() => stopSpectrumForward());

  onMounted(async () => {
    // 检查并执行设置迁移
    settingStore.checkAndMigrate();
    // 打印版本信息
    printVersion();
    // 用户协议
    openUserAgreement();
    // 加载数据
    await dataStore.loadData();
    // 初始化 MediaSession
    mediaSessionManager.init();
    // 初始化播放器
    player.playSong({
      autoPlay: settingStore.autoPlay,
      seek: settingStore.memoryLastSeek ? statusStore.currentTime : 0,
    });
    // 同步播放模式
    player.playModeSyncIpc();
    // 初始化自动关闭定时器
    if (statusStore.autoClose.enable) {
      const { endTime, time } = statusStore.autoClose;
      const now = Date.now();
      if (endTime > now) {
        // 计算真实剩余时间
        const realRemainTime = Math.ceil((endTime - now) / 1000);
        player.startAutoCloseTimer(time, realRemainTime);
      } else {
        // 定时器已过期，重置状态
        statusStore.autoClose.enable = false;
        statusStore.autoClose.remainTime = time * 60;
        statusStore.autoClose.endTime = 0;
      }
    }

    // 监听设置变化以更新 ReplayGain
    watch(
      () => [settingStore.enableReplayGain, settingStore.replayGainMode],
      () => player.applyReplayGain(),
    );

    if (isElectron) {
      // 注册全局快捷键
      shortcutStore.registerAllShortcuts();
      // 初始化下载管理器
      downloadManager.init();
      // 显示窗口
      window.electron.ipcRenderer.send("win-loaded");
      // 同步任务栏歌词状态（配置中无 enabled 字段时保持 store 现状，避免误关频谱转发）
      const taskbarConfig = await window.electron.ipcRenderer.invoke(
        TASKBAR_IPC_CHANNELS.GET_OPTION,
      );
      if (typeof taskbarConfig?.enabled === "boolean") {
        statusStore.showTaskbarLyric = taskbarConfig.enabled;
      }
      // MPV 无频谱：部件频谱开着也只能看到圆点，给一次一键切换机会
      checkMpvVisualizerOnce(taskbarConfig);
      // 显示桌面歌词
      window.electron.ipcRenderer.send("desktop-lyric:toggle", statusStore.showDesktopLyric);
      // 如果启用macOS歌词，发送初始数据
      if (isMac && settingStore.macos.statusBarLyric.enabled) {
        window.electron.ipcRenderer.send(TASKBAR_IPC_CHANNELS.REQUEST_DATA);
      }
      // 确保主窗口在最后获得焦点
      if (statusStore.showDesktopLyric) {
        setTimeout(() => {
          window.electron.ipcRenderer.send("win-show-main");
        }, FINAL_FOCUS_DELAY_MS);
      }
    }
  });
};

// 事件监听
const initEventListener = () => {
  // 键盘事件
  useEventListener(window, "keydown", keyDownEvent);
};

// 键盘事件
const keyDownEvent = debounce((event: KeyboardEvent) => {
  const player = usePlayerController();
  const shortcutStore = useShortcutStore();
  const statusStore = useStatusStore();
  const target = event.target as HTMLElement;
  // 排除元素
  const extendsDom = ["input", "textarea"];
  if (extendsDom.includes(target.tagName.toLowerCase())) return;
  event.preventDefault();
  event.stopPropagation();
  // 获取按键信息
  const key = event.code;
  const isCtrl = event.ctrlKey || event.metaKey;
  const isShift = event.shiftKey;
  const isAlt = event.altKey;
  // 循环注册快捷键
  for (const shortcutKey in shortcutStore.shortcutList) {
    const shortcut = shortcutStore.shortcutList[shortcutKey];
    const shortcutParts = shortcut.shortcut.split("+");
    // 标志位
    let match = true;
    // 检查是否包含修饰键
    const hasCmdOrCtrl = shortcutParts.includes("CmdOrCtrl");
    const hasShift = shortcutParts.includes("Shift");
    const hasAlt = shortcutParts.includes("Alt");
    // 检查修饰键匹配
    if (hasCmdOrCtrl && !isCtrl) match = false;
    if (hasShift && !isShift) match = false;
    if (hasAlt && !isAlt) match = false;
    // 如果快捷键定义中没有修饰键，确保没有按下任何修饰键
    if (!hasCmdOrCtrl && !hasShift && !hasAlt) {
      if (isCtrl || isShift || isAlt) match = false;
    }
    // 检查实际按键
    const mainKey = shortcutParts.find(
      (part: string) => part !== "CmdOrCtrl" && part !== "Shift" && part !== "Alt",
    );
    if (mainKey !== key) match = false;
    if (match && shortcutKey) {
      switch (shortcutKey) {
        case "playOrPause":
          player.playOrPause();
          break;
        case "playPrev":
          player.nextOrPrev("prev");
          break;
        case "playNext":
          player.nextOrPrev("next");
          break;
        case "seekForward":
          player.seekBy(5000);
          break;
        case "seekBackward":
          player.seekBy(-5000);
          break;
        case "volumeUp":
          player.setVolume("up");
          break;
        case "volumeDown":
          player.setVolume("down");
          break;
        case "toggle-desktop-lyric":
          player.toggleDesktopLyric();
          break;
        case "openPlayer":
          // 打开播放界面（任意界面）
          statusStore.showFullPlayer = true;
          break;
        case "closePlayer":
          // 关闭播放界面（仅在播放界面时）
          if (statusStore.showFullPlayer) {
            statusStore.showFullPlayer = false;
          }
          break;
        case "openPlayList":
          // 打开播放列表（任意界面）
          statusStore.playListShow = !statusStore.playListShow;
          break;
        default:
          break;
      }
    }
  }
}, 100);
