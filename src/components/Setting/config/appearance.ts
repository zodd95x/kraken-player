import { usePlayerController } from "@/core/player/PlayerController";
import { useSettingStore, useStatusStore } from "@/stores";
import type { SettingConfig } from "@/types/settings";
import {
  DEFAULT_TASKBAR_LYRIC_SETTINGS,
  TASKBAR_IPC_CHANNELS,
  type TaskbarLyricSettings,
} from "@/types/shared";
import { isElectron, isWin } from "@/utils/env";
import {
  openFontManager,
  openCustomCode,
  openThemeConfig,
  openSidebarHideManager,
  openHomePageSectionManager,
  openPlaylistPageManager,
  openFullscreenPlayerManager,
  openCoverManager,
  openContextMenuManager,
} from "@/utils/modal";
import { cloneDeep } from "lodash-es";
import { computed, reactive, ref } from "vue";

export const useAppearanceSettings = (): SettingConfig => {
  const player = usePlayerController();
  const settingStore = useSettingStore();
  const statusStore = useStatusStore();

  // 任务栏部件配置
  const taskbarLyricConfig = reactive<TaskbarLyricSettings>({ ...DEFAULT_TASKBAR_LYRIC_SETTINGS });

  const getTaskbarLyricConfig = async () => {
    if (!isElectron) return;
    const config = await window.electron.ipcRenderer.invoke(TASKBAR_IPC_CHANNELS.GET_OPTION);
    if (config) Object.assign(taskbarLyricConfig, config);
  };

  const saveTaskbarLyricConfig = (patch?: Partial<TaskbarLyricSettings>) => {
    if (!isElectron) return;
    const toSave = cloneDeep(patch ? { ...taskbarLyricConfig, ...patch } : taskbarLyricConfig);
    window.electron.ipcRenderer.send(TASKBAR_IPC_CHANNELS.SET_OPTION, toSave, true);
  };

  const restoreTaskbarLyricConfig = () => {
    if (!isElectron) return;
    window.$dialog.warning({
      title: "警告",
      content: "此操作将恢复所有任务栏歌词配置为默认值，是否继续?",
      positiveText: "确定",
      negativeText: "取消",
      onPositiveClick: () => {
        Object.assign(taskbarLyricConfig, DEFAULT_TASKBAR_LYRIC_SETTINGS);
        window.electron.ipcRenderer.send(
          TASKBAR_IPC_CHANNELS.SET_OPTION,
          DEFAULT_TASKBAR_LYRIC_SETTINGS,
          true,
        );
        window.$message.success("任务栏歌词配置已恢复默认");
      },
    });
  };

  // --- Window / Borderless Logic (from general.ts) ---
  const useBorderless = ref(true);

  const handleBorderlessChange = async (val: boolean) => {
    if (!isElectron) return;
    const windowConfig = await window.api.store.get("window");
    window.api.store.set("window", {
      ...windowConfig,
      useBorderless: val,
    });
    window.$message.warning("设置已保存，重启软件后生效");
  };

  const onActivate = async () => {
    if (isElectron) {
      const windowConfig = await window.api.store.get("window");
      useBorderless.value = windowConfig?.useBorderless ?? true;
      getTaskbarLyricConfig();
    }
  };

  return {
    onActivate,
    groups: [
      {
        title: "主题与风格",
        items: [
          {
            key: "themeMode",
            label: "主题模式",
            type: "select",
            description: "调整全局主题明暗模式",
            options: [
              { label: "跟随系统", value: "auto" },
              { label: "浅色模式", value: "light" },
              { label: "深色模式", value: "dark" },
            ],
            value: computed({
              get: () => settingStore.themeMode,
              set: (v) => (settingStore.themeMode = v),
            }),
            forceIf: {
              condition: () => statusStore.isCustomBackground,
              forcedValue: "auto",
              forcedDescription: "请关闭自定义背景后调节",
            },
          },
          {
            key: "themeConfig",
            label: "主题配置",
            type: "button",
            description: "更改主题色或自定义图片",
            buttonLabel: "配置",
            action: openThemeConfig,
          },
          {
            key: "useBorderless",
            label: "无边框窗口模式",
            type: "switch",
            show: isElectron,
            description: "是否开启无边框窗口模式，关闭后将使用系统原生边框（需重启）",
            value: computed({
              get: () => useBorderless.value,
              set: (v) => {
                useBorderless.value = v;
                handleBorderlessChange(v);
              },
            }),
          },
          {
            key: "fontConfig",
            label: "全局字体",
            type: "button",
            description: "统一配置全局及歌词区域的字体",
            buttonLabel: "配置",
            action: openFontManager,
          },
          {
            key: "customCode",
            label: "自定义代码注入",
            type: "button",
            description: "注入自定义 CSS 和 JavaScript 代码",
            buttonLabel: "配置",
            action: openCustomCode,
            show: computed(() => statusStore.isDeveloperMode),
          },
        ],
      },
      {
        title: "界面布局",
        items: [
          {
            key: "sidebarHide",
            label: "侧边栏管理",
            type: "button",
            description: "配置需要在侧边栏显示的菜单项",
            buttonLabel: "配置",
            action: openSidebarHideManager,
          },
          {
            key: "homePageSection",
            label: "首页栏目",
            type: "button",
            description: "调整首页各栏目的显示顺序或隐藏不需要的栏目",
            buttonLabel: "配置",
            action: openHomePageSectionManager,
          },
          {
            key: "playlistPageElements",
            label: "歌单界面",
            type: "button",
            description: "自定义歌单界面的标签、拥有者、时间、描述显示",
            buttonLabel: "配置",
            action: openPlaylistPageManager,
          },
          {
            key: "fullscreenPlayer",
            label: "全屏播放器",
            type: "button",
            description: "自定义全屏播放器的显示元素（喜欢、下载、评论等）",
            buttonLabel: "配置",
            action: openFullscreenPlayerManager,
          },
          {
            key: "contextMenu",
            label: "右键菜单",
            type: "button",
            description: "自定义歌曲右键菜单的显示选项",
            buttonLabel: "配置",
            action: openContextMenuManager,
          },
          {
            key: "menuShowCover",
            label: "侧边栏显示歌单封面",
            type: "switch",
            description: "是否在侧边栏显示歌单的封面（如有）",
            value: computed({
              get: () => settingStore.menuShowCover,
              set: (v) => (settingStore.menuShowCover = v),
            }),
          },
          {
            key: "showPlaylistCount",
            label: "显示播放列表数量",
            type: "switch",
            description: "在右下角的播放列表按钮处显示播放列表的歌曲数量",
            value: computed({
              get: () => settingStore.showPlaylistCount,
              set: (v) => (settingStore.showPlaylistCount = v),
            }),
          },
          {
            key: "routeAnimation",
            label: "页面切换动画",
            type: "select",
            description: "选择页面切换时的动画效果",
            options: [
              { label: "无动画", value: "none" },
              { label: "淡入淡出", value: "fade" },
              { label: "缩放", value: "zoom" },
              { label: "滑动", value: "slide" },
              { label: "上浮", value: "up" },
              { label: "流体", value: "flow" },
              { label: "左右遮罩", value: "mask-left" },
              { label: "上下遮罩", value: "mask-top" },
            ],
            value: computed({
              get: () => settingStore.routeAnimation,
              set: (v) => (settingStore.routeAnimation = v),
            }),
          },
        ],
      },
      {
        title: "播放器外观",
        items: [
          {
            key: "playerType",
            label: "播放器样式",
            type: "select",
            description: "播放器主体样式",
            options: [
              { label: "封面模式", value: "cover" },
              { label: "唱片模式", value: "record" },
              { label: "全屏封面", value: "fullscreen" },
            ],
            value: computed({
              get: () => settingStore.playerType,
              set: (v) => (settingStore.playerType = v),
            }),
            condition: () => true,
            children: computed(() => {
              const type = settingStore.playerType;
              if (type === "cover" || type === "record") {
                return [
                  {
                    key: "playerStyleRatio",
                    label: "封面 / 歌词占比",
                    type: "slider",
                    description: "调整全屏播放器的封面与歌词的宽度比例",
                    min: 30,
                    max: 70,
                    step: 1,
                    marks: { 50: "默认" },
                    formatTooltip: (v) => `${v}%`,
                    value: computed({
                      get: () => settingStore.playerStyleRatio,
                      set: (v) => (settingStore.playerStyleRatio = v),
                    }),
                  },
                ];
              }
              if (type === "fullscreen") {
                return [
                  {
                    key: "playerFullscreenGradient",
                    label: "封面过渡位置",
                    type: "slider",
                    description: "调整全屏封面右侧的渐变过渡位置",
                    min: 0,
                    max: 100,
                    step: 1,
                    marks: { 15: "默认" },
                    formatTooltip: (v) => `${v}%`,
                    value: computed({
                      get: () => settingStore.playerFullscreenGradient,
                      set: (v) => (settingStore.playerFullscreenGradient = v),
                    }),
                  },
                ];
              }
              return [];
            }),
          },
          {
            key: "playerBackgroundType",
            label: "播放器背景样式",
            type: "select",
            description: "切换播放器背景类型",
            options: [
              { label: "流体效果", value: "animation" },
              { label: "封面模糊", value: "blur" },
              { label: "封面主色", value: "color" },
            ],
            value: computed({
              get: () => settingStore.playerBackgroundType,
              set: (v) => (settingStore.playerBackgroundType = v),
            }),
            condition: () => settingStore.playerBackgroundType === "animation",
            children: [
              {
                key: "playerBackgroundFps",
                label: "背景动画帧率",
                type: "input-number",
                description: "单位 fps，最小 24，最大 240",
                min: 24,
                max: 256,
                show: () => settingStore.playerBackgroundType === "animation",
                value: computed({
                  get: () => settingStore.playerBackgroundFps,
                  set: (v) => (settingStore.playerBackgroundFps = v),
                }),
              },
              {
                key: "playerBackgroundFlowSpeed",
                label: "背景动画流动速度",
                type: "input-number",
                description: "单位 倍数，最小 0.1，最大 10",
                min: 0.1,
                max: 10,
                show: () => settingStore.playerBackgroundType === "animation",
                value: computed({
                  get: () => settingStore.playerBackgroundFlowSpeed,
                  set: (v) => (settingStore.playerBackgroundFlowSpeed = v),
                }),
              },
              {
                key: "playerBackgroundRenderScale",
                label: "背景渲染缩放比例",
                type: "input-number",
                description:
                  "设置当前渲染缩放比例，默认 0.5。适当提高此值（如 1.0 或 1.5）可以减少分界线锯齿，让效果更好，但也会增加显卡压力",
                min: 0.1,
                max: 3,
                show: () => settingStore.playerBackgroundType === "animation",
                value: computed({
                  get: () => settingStore.playerBackgroundRenderScale,
                  set: (v) => (settingStore.playerBackgroundRenderScale = v),
                }),
              },
              {
                key: "playerBackgroundPause",
                label: "背景动画暂停时暂停",
                type: "switch",
                description: "在暂停时是否也暂停背景动画",
                show: () => settingStore.playerBackgroundType === "animation",
                value: computed({
                  get: () => settingStore.playerBackgroundPause,
                  set: (v) => (settingStore.playerBackgroundPause = v),
                }),
              },
              {
                key: "playerBackgroundLowFreqVolume",
                label: "背景跳动效果",
                type: "switch",
                description: "使流体背景根据音乐低频节拍产生脉动效果",
                show: () => settingStore.playerBackgroundType === "animation",
                value: computed({
                  get: () => settingStore.playerBackgroundLowFreqVolume,
                  set: (v) => (settingStore.playerBackgroundLowFreqVolume = v),
                }),
              },
            ],
          },
          {
            key: "playerExpandAnimation",
            label: "播放器展开动画",
            type: "select",
            description: "选择播放器展开时的动画效果",
            options: [
              { label: "上浮", value: "up" },
              { label: "流体", value: "flow" },
            ],
            value: computed({
              get: () => settingStore.playerExpandAnimation,
              set: (v) => (settingStore.playerExpandAnimation = v),
            }),
          },
          {
            key: "playerFollowCoverColor",
            label: "播放器主色跟随封面",
            type: "switch",
            description: "播放器主颜色是否跟随封面主色，下一曲生效",
            value: computed({
              get: () => settingStore.playerFollowCoverColor,
              set: (v) => (settingStore.playerFollowCoverColor = v),
            }),
          },
          {
            key: "dynamicCover",
            label: "动态封面",
            type: "switch",
            description: "可展示部分歌曲的动态封面，仅在封面模式有效",
            value: computed({
              get: () => settingStore.dynamicCover,
              set: (v) => (settingStore.dynamicCover = v),
            }),
          },
          {
            key: "showSpectrums",
            label: "音乐频谱",
            type: "switch",
            show: isElectron,
            description: "开启音乐频谱会影响性能或增加内存占用，如遇问题请关闭",
            value: computed({
              get: () => settingStore.showSpectrums,
              set: (v) => (settingStore.showSpectrums = v),
            }),
            forceIf: {
              condition: () => settingStore.playbackEngine === "mpv",
              forcedValue: false,
              forcedDescription: "MPV 引擎暂不支持显示音乐频谱",
            },
          },
        ],
      },
      {
        title: "任务栏歌词",
        show: isWin,
        items: [
          {
            key: "taskbarLyricEnabled",
            label: "开启任务栏部件",
            type: "switch",
            description: "开启后将在任务栏显示部件",
            value: computed({
              get: () => statusStore.showTaskbarLyric,
              set: (v) => player.setTaskbarLyricShow(v ?? false),
            }),
          },
          {
            key: "taskbarDisplayMode",
            label: "展示模式",
            type: "select",
            description: "歌词模式显示歌词，部件模式显示封面 + 标题 + 频谱（无按钮，更紧凑）",
            options: [
              { label: "歌词", value: "lyric" },
              { label: "紧凑部件", value: "widget" },
            ],
            value: computed({
              get: () => taskbarLyricConfig.displayMode ?? "lyric",
              set: (v) => {
                taskbarLyricConfig.displayMode = v ?? "lyric";
                saveTaskbarLyricConfig({ displayMode: taskbarLyricConfig.displayMode });
              },
            }),
          },
          {
            key: "taskbarShowVisualizer",
            label: "显示频谱",
            type: "switch",
            description: "部件模式下是否显示实时频谱（无数据时收起到小圆点）",
            show: () => (taskbarLyricConfig.displayMode ?? "lyric") === "widget",
            value: computed({
              get: () => taskbarLyricConfig.showVisualizer ?? true,
              set: (v) => {
                taskbarLyricConfig.showVisualizer = v ?? true;
                saveTaskbarLyricConfig({ showVisualizer: taskbarLyricConfig.showVisualizer });
              },
            }),
          },
          {
            key: "taskbarLyricColorMode",
            label: "配色模式",
            type: "select",
            description: "歌词文字配色，跟随任务栏时自动适应系统明暗",
            options: [
              { label: "跟随任务栏", value: "taskbar" },
              { label: "浅色", value: "light" },
              { label: "深色", value: "dark" },
            ],
            value: computed({
              get: () => taskbarLyricConfig.colorMode,
              set: (v) => {
                taskbarLyricConfig.colorMode = v ?? "taskbar";
                saveTaskbarLyricConfig({ colorMode: taskbarLyricConfig.colorMode });
              },
            }),
          },
          {
            key: "taskbarLyricDoubleLine",
            label: "双行显示",
            type: "switch",
            description: "显示主歌词 + 翻译 / 下一句",
            show: () => (taskbarLyricConfig.displayMode ?? "lyric") === "lyric",
            value: computed({
              get: () => taskbarLyricConfig.doubleLine,
              set: (v) => {
                taskbarLyricConfig.doubleLine = v ?? true;
                saveTaskbarLyricConfig({ doubleLine: taskbarLyricConfig.doubleLine });
              },
            }),
          },
          {
            key: "taskbarLyricWordByWord",
            label: "逐字歌词",
            type: "switch",
            description: "是否显示逐字（卡拉OK）效果",
            show: () => (taskbarLyricConfig.displayMode ?? "lyric") === "lyric",
            value: computed({
              get: () => taskbarLyricConfig.wordByWord,
              set: (v) => {
                taskbarLyricConfig.wordByWord = v ?? true;
                saveTaskbarLyricConfig({ wordByWord: taskbarLyricConfig.wordByWord });
              },
            }),
          },
          {
            key: "taskbarLyricShowCover",
            label: "显示封面",
            type: "switch",
            description: "是否在任务栏歌词中显示歌曲封面",
            value: computed({
              get: () => taskbarLyricConfig.showCover,
              set: (v) => {
                taskbarLyricConfig.showCover = v ?? true;
                saveTaskbarLyricConfig({ showCover: taskbarLyricConfig.showCover });
              },
            }),
          },
          {
            key: "taskbarLyricAutoMaxWidth",
            label: "宽度自动",
            type: "switch",
            description: "开启后占满任务栏的可用空间；关闭后按最大宽度限制",
            show: () => (taskbarLyricConfig.displayMode ?? "lyric") === "lyric",
            value: computed({
              get: () => taskbarLyricConfig.autoMaxWidth,
              set: (v) => {
                taskbarLyricConfig.autoMaxWidth = v ?? true;
                saveTaskbarLyricConfig({ autoMaxWidth: taskbarLyricConfig.autoMaxWidth });
              },
            }),
          },
          {
            key: "taskbarLyricMaxWidth",
            label: "最大宽度",
            type: "slider",
            description: "超出可用空间时仍以可用空间为准，避免挤占",
            show: () =>
              (taskbarLyricConfig.displayMode ?? "lyric") === "lyric" &&
              !taskbarLyricConfig.autoMaxWidth,
            min: 200,
            max: 800,
            step: 20,
            value: computed({
              get: () => taskbarLyricConfig.maxWidth,
              set: (v) => {
                taskbarLyricConfig.maxWidth = v ?? 400;
              },
            }),
            action: () => {
              saveTaskbarLyricConfig({ maxWidth: taskbarLyricConfig.maxWidth });
            },
            suffix: "px",
          },
          {
            key: "taskbarLyricPosition",
            label: "显示位置",
            type: "select",
            description: "任务栏歌词的显示位置（自动跟随任务栏对齐）",
            options: [
              { label: "自动", value: "auto" },
              { label: "左侧", value: "left" },
              { label: "右侧", value: "right" },
            ],
            value: computed({
              get: () => taskbarLyricConfig.position,
              set: (v) => {
                taskbarLyricConfig.position = v ?? "auto";
                saveTaskbarLyricConfig({ position: taskbarLyricConfig.position });
              },
            }),
          },
          {
            key: "taskbarLyricShowTranslation",
            label: "显示翻译",
            type: "switch",
            description: "双行显示时优先展示翻译",
            show: () =>
              (taskbarLyricConfig.displayMode ?? "lyric") === "lyric" &&
              taskbarLyricConfig.doubleLine,
            value: computed({
              get: () => taskbarLyricConfig.showTranslation,
              set: (v) => {
                taskbarLyricConfig.showTranslation = v ?? true;
                saveTaskbarLyricConfig({ showTranslation: taskbarLyricConfig.showTranslation });
              },
            }),
          },
          {
            key: "taskbarLyricRestore",
            label: "恢复默认配置",
            type: "button",
            description: "恢复默认任务栏歌词配置",
            buttonLabel: "恢复默认",
            action: restoreTaskbarLyricConfig,
          },
        ],
      },
      {
        title: "界面元素显示",
        items: [
          {
            key: "coverManager",
            label: "封面显示管理",
            type: "button",
            description: "配置各界面封面是否显示（如歌单广场、排行榜、播放器等）",
            buttonLabel: "配置",
            action: openCoverManager,
          },
          {
            key: "autoHidePlayerMeta",
            label: "播放器元素自动隐藏",
            type: "switch",
            description: "鼠标静止一段时间或者离开播放器时自动隐藏控制元素",
            value: computed({
              get: () => settingStore.autoHidePlayerMeta,
              set: (v) => (settingStore.autoHidePlayerMeta = v),
            }),
          },
          {
            key: "showPlayMeta",
            label: "展示播放状态信息",
            type: "switch",
            description: "展示当前歌曲及歌词的状态信息",
            value: computed({
              get: () => settingStore.showPlayMeta,
              set: (v) => (settingStore.showPlayMeta = v),
            }),
          },
          {
            key: "barLyricShow",
            label: "底栏显示歌词",
            type: "switch",
            description: "在播放时将歌手信息更改为歌词",
            value: computed({
              get: () => settingStore.barLyricShow,
              set: (v) => (settingStore.barLyricShow = v),
            }),
          },
          {
            key: "showSongQuality",
            label: "显示歌曲音质",
            type: "switch",
            description: "是否列表中显示歌曲音质",
            value: computed({
              get: () => settingStore.showSongQuality,
              set: (v) => (settingStore.showSongQuality = v),
            }),
          },
          {
            key: "showPlayerQuality",
            label: "显示播放器切换音质按钮",
            type: "switch",
            description: "是否在播放器显示切换音质按钮",
            value: computed({
              get: () => settingStore.showPlayerQuality,
              set: (v) => (settingStore.showPlayerQuality = v),
            }),
          },
          {
            key: "countDownShow",
            label: "显示前奏倒计时",
            type: "switch",
            description: "部分歌曲前奏可能存在显示错误",
            value: computed({
              get: () => settingStore.countDownShow,
              set: (v) => (settingStore.countDownShow = v),
            }),
          },
          {
            key: "timeFormat",
            label: "时间显示格式",
            type: "select",
            description: "底栏右侧和播放页面底部的时间如何显示（单击时间可以快速切换）",
            options: [
              { label: "播放时间 / 总时长", value: "current-total" },
              { label: "剩余时间 / 总时长", value: "remaining-total" },
              { label: "播放时间 / 剩余时间", value: "current-remaining" },
            ],
            value: computed({
              get: () => settingStore.timeFormat,
              set: (v) => (settingStore.timeFormat = v),
            }),
          },
        ],
      },
      {
        title: "歌曲列表显示",
        items: [
          {
            key: "showSongAlbum",
            label: "显示专辑",
            type: "switch",
            description: "在歌曲列表中显示专辑列",
            value: computed({
              get: () => settingStore.showSongAlbum,
              set: (v) => (settingStore.showSongAlbum = v),
            }),
          },
          {
            key: "showSongArtist",
            label: "显示歌手",
            type: "switch",
            description: "在歌曲列表中显示歌手信息",
            value: computed({
              get: () => settingStore.showSongArtist,
              set: (v) => (settingStore.showSongArtist = v),
            }),
          },
          {
            key: "showSongDuration",
            label: "显示时长",
            type: "switch",
            description: "在歌曲列表中显示时长列",
            value: computed({
              get: () => settingStore.showSongDuration,
              set: (v) => (settingStore.showSongDuration = v),
            }),
          },
          {
            key: "showSongOperations",
            label: "显示操作",
            type: "switch",
            description: "在歌曲列表中显示操作列（收藏等）",
            value: computed({
              get: () => settingStore.showSongOperations,
              set: (v) => (settingStore.showSongOperations = v),
            }),
          },
          {
            key: "showSongQuality",
            label: "显示歌曲音质",
            type: "switch",
            description: "是否列表中显示歌曲音质",
            value: computed({
              get: () => settingStore.showSongQuality,
              set: (v) => (settingStore.showSongQuality = v),
            }),
          },
          {
            key: "showSongPrivilegeTag",
            label: "显示特权标签",
            type: "switch",
            description: "是否显示如 VIP、EP 等特权标签",
            value: computed({
              get: () => settingStore.showSongPrivilegeTag,
              set: (v) => (settingStore.showSongPrivilegeTag = v),
            }),
          },
          {
            key: "showSongExplicitTag",
            label: "显示脏标",
            type: "switch",
            description: "是否显示歌曲脏标（🅴）",
            value: computed({
              get: () => settingStore.showSongExplicitTag,
              set: (v) => (settingStore.showSongExplicitTag = v),
            }),
          },
          {
            key: "showSongOriginalTag",
            label: "显示原唱翻唱标签",
            type: "switch",
            description: "是否显示歌曲原唱翻唱标签",
            value: computed({
              get: () => settingStore.showSongOriginalTag,
              set: (v) => (settingStore.showSongOriginalTag = v),
            }),
          },
          {
            key: "hideBracketedContent",
            label: "隐藏括号内容",
            type: "switch",
            description: "隐藏括号内的内容，如 (Live)、(伴奏) 等",
            value: computed({
              get: () => settingStore.hideBracketedContent,
              set: (v) => (settingStore.hideBracketedContent = v),
            }),
          },
        ],
      },
    ],
  };
};
