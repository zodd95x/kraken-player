<!-- 全局配置 -->
<template>
  <n-config-provider
    :locale="currentLocale"
    :date-locale="currentDateLocale"
    :theme="theme"
    :theme-overrides="themeOverrides"
    abstract
    inline-theme-disabled
    preflight-style-disabled
  >
    <n-global-style />
    <n-loading-bar-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-message-provider :max="1" placement="bottom">
            <n-modal-provider>
              <slot />
              <NaiveProviderContent />
            </n-modal-provider>
          </n-message-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import {
  zhCN,
  dateZhCN,
  enUS,
  dateEnUS,
  frFR,
  dateFrFR,
  darkTheme,
  useOsTheme,
  useLoadingBar,
  useModal,
  useDialog,
  useMessage,
  useNotification,
  GlobalThemeOverrides,
} from "naive-ui";
import { useI18n } from "vue-i18n";
import { useSettingStore, useStatusStore } from "@/stores";
import { setColorSchemes, MONOTONOUS_THEME, sendTaskbarCoverColor } from "@/utils/color";
import { useCustomCode } from "@/composables/useCustomCode";
// import { rgbToHex } from "@imsyy/color-utils";
import themeColor from "@/assets/data/themeColor.json";
import { trSetting } from "@/utils/i18nSettings";
import { setupLegacyTextLocalization } from "@/utils/legacyTextLocalization";

const statusStore = useStatusStore();
const settingStore = useSettingStore();
const { locale } = useI18n();
let refreshLegacyText: (() => void) | undefined;
let stopLegacyText: (() => void) | undefined;

// 语言本地化
const currentLocale = computed(() => {
  if (settingStore.language === "en") return enUS;
  if (settingStore.language === "zh") return zhCN;
  return frFR;
});

const currentDateLocale = computed(() => {
  if (settingStore.language === "en") return dateEnUS;
  if (settingStore.language === "zh") return dateZhCN;
  return dateFrFR;
});

// 同步 i18n 语言设置
watch(
  () => settingStore.language,
  (lang) => {
    if (lang) {
      locale.value = lang;
      nextTick(() => refreshLegacyText?.());
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send("language-change", lang);
      }
    }
  },
  { immediate: true },
);

// 操作系统主题
const osTheme = useOsTheme();

// 全局主题
const themeOverrides = shallowRef<GlobalThemeOverrides>({});
// 轻量的 rgba 构造器
const toRGBA = (rgb: string, alpha: number) => `rgba(${rgb}, ${alpha})`;
// 主题缓存键
let lastThemeCacheKey: string | null = null;

// 获取明暗模式
const theme = computed(() => {
  // 图片模式强制深色
  if (statusStore.isCustomBackground) return darkTheme;
  return settingStore.themeMode === "auto"
    ? // 跟随系统
      osTheme.value === "dark"
      ? darkTheme
      : null
    : // 自定义
      settingStore.themeMode === "dark"
      ? darkTheme
      : null;
});

// 获取当前主题色数据
const getThemeMainColor = () => {
  const themeType = theme.value ? "dark" : "light";
  // 背景图模式
  if (statusStore.isCustomBackground) {
    const { themeColor, useCustomColor, customColor, isSolid } = statusStore.backgroundConfig;
    // 纯色覆盖
    if (isSolid) return setColorSchemes(MONOTONOUS_THEME, themeType);
    const color = useCustomColor ? customColor : themeColor;
    // 强制使用 dark 模式生成
    if (color) return setColorSchemes(color, "dark");
  }
  // 封面模式
  if (settingStore.themeFollowCover && statusStore.songCoverTheme) {
    const coverColor = statusStore.songCoverTheme;
    if (!coverColor) return {};
    return setColorSchemes(coverColor, themeType);
  } else if (settingStore.themeColorType === "solid") {
    // 纯色预设
    return setColorSchemes(MONOTONOUS_THEME, themeType);
  } else if (settingStore.themeColorType !== "custom") {
    // 预设模式
    const preset = themeColor[settingStore.themeColorType] || themeColor.default;
    return setColorSchemes(preset.color, themeType);
  } else {
    // 自定义模式
    return setColorSchemes(settingStore.themeCustomColor, themeType);
  }
};

// 更改全局主题
const changeGlobalTheme = () => {
  applyThemeBackgroundMode();
  try {
    // 获取配色方案
    const colorSchemes = getThemeMainColor();
    if (!colorSchemes || Object.keys(colorSchemes).length === 0) {
      themeOverrides.value = {};
      return;
    }
    // 构造主题缓存 Key
    const themeModeLabel = theme.value ? "dark" : "light";
    const themeCacheKey = `${themeModeLabel}|${settingStore.themeGlobalColor ? 1 : 0}|${settingStore.globalFont}|${colorSchemes.primary}|${colorSchemes.background}|${colorSchemes["surface-container"]}`;
    if (lastThemeCacheKey === themeCacheKey) return;
    lastThemeCacheKey = themeCacheKey;

    // 关键颜色
    const primaryRGB = colorSchemes.primary as string;
    const surfaceContainerRGB = colorSchemes["surface-container"] as string;

    // 全局字体
    const fontFamily = `${settingStore.globalFont === "default" ? "v-sans" : settingStore.globalFont}, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`;

    // 预计算颜色值
    const colors = {
      primary: `rgb(${primaryRGB})`,
      primary78: toRGBA(primaryRGB, 0.78),
      primary58: toRGBA(primaryRGB, 0.58),
      primary52: toRGBA(primaryRGB, 0.52),
      primary20: toRGBA(primaryRGB, 0.2),
      primary12: toRGBA(primaryRGB, 0.12),
      primary09: toRGBA(primaryRGB, 0.09),
      primary08: toRGBA(primaryRGB, 0.08),
      surface: `rgb(${surfaceContainerRGB})`,
    };

    // 通用样式基座
    const commonBase = {
      fontFamily,
      primaryColor: colors.primary,
      primaryColorHover: colors.primary78,
      primaryColorPressed: toRGBA(primaryRGB, 0.26),
      primaryColorSuppl: colors.primary12,
    } as GlobalThemeOverrides["common"];

    /**
     * 获取组件样式
     * @param isGlobal 是否全局着色
     */
    const getComponentStyles = (isGlobal: boolean) => ({
      Slider: {
        handleColor: colors.primary,
        fillColor: colors.primary,
        fillColorHover: colors.primary,
        railColor: colors.primary20,
        railColorHover: toRGBA(primaryRGB, 0.3),
        indicatorColor: colors.surface,
        indicatorTextColor: colors.primary,
      },
      Icon: {
        color: colors.primary,
      },
      Tooltip: {
        color: colors.surface,
        textColor: colors.primary,
      },
      Tabs: {
        colorSegment: colors.surface,
        tabColorSegment: colors.primary12,
      },
      ...(isGlobal
        ? {
            Card: { borderColor: colors.primary09 },
            Button: {
              textColorHover: colors.primary78,
              textColorFocus: colors.primary58,
              colorPrimary: toRGBA(primaryRGB, 0.9),
              colorHoverPrimary: colors.primary,
              colorPressedPrimary: toRGBA(primaryRGB, 0.8),
              colorFocusPrimary: colors.primary,
            },
            Switch: { railColorActive: toRGBA(primaryRGB, 0.8) },
            Input: {
              color: toRGBA(primaryRGB, 0.1),
              colorFocus: colors.surface,
              placeholderColor: colors.primary58,
              border: `1px solid ${toRGBA(primaryRGB, 0.1)}`,
              clearColor: toRGBA(primaryRGB, 0.38),
              clearColorHover: toRGBA(primaryRGB, 0.48),
              clearColorPressed: toRGBA(primaryRGB, 0.3),
            },
            Empty: { textColor: toRGBA(primaryRGB, 0.38) },
            Divider: { color: colors.primary09 },
            Dropdown: { dividerColor: colors.primary09 },
            Layout: { siderBorderColor: colors.primary09 },
            Tabs: {
              colorSegment: colors.primary08,
              tabColorSegment: colors.primary12,
            },
            Drawer: {
              headerBorderBottom: `1px solid ${colors.primary09}`,
              footerBorderTop: `1px solid ${colors.primary09}`,
            },
            Menu: { dividerColor: colors.primary09 },
            Progress: { railColor: toRGBA(primaryRGB, 0.16) },
            Popover: {
              color: colors.surface,
            },
          }
        : {}),
    });

    // 获取组件样式
    const specificStyles = getComponentStyles(settingStore.themeGlobalColor);

    if (settingStore.themeGlobalColor) {
      themeOverrides.value = {
        common: {
          ...commonBase,
          textColorBase: primaryRGB,
          textColor1: colors.primary,
          textColor2: toRGBA(primaryRGB, 0.82),
          textColor3: colors.primary52,
          bodyColor: `rgb(${colorSchemes.background})`,
          cardColor: colors.surface,
          tagColor: colors.surface,
          modalColor: colors.surface,
          popoverColor: colors.surface,
          buttonColor2: colors.primary08,
          buttonColor2Hover: colors.primary12,
          buttonColor2Pressed: colors.primary08,
          iconColor: colors.primary,
          iconColorHover: toRGBA(primaryRGB, 0.475),
          closeIconColor: colors.primary58,
          hoverColor: colors.primary09,
          borderColor: colors.primary09,
          textColorDisabled: toRGBA(primaryRGB, 0.3),
          placeholderColorDisabled: toRGBA(primaryRGB, 0.3),
          iconColorDisabled: toRGBA(primaryRGB, 0.3),
        },
        ...specificStyles,
      };
    } else {
      themeOverrides.value = {
        common: commonBase,
        ...specificStyles,
      };
    }
  } catch (error) {
    themeOverrides.value = {};
    console.error("切换主题色出现错误：", error);
    window.$message.error("切换主题色出现错误，已使用默认配置");
  }
  sendTaskbarCoverColor();
};

// 挂载 naive 组件
const setupNaiveTools = () => {
  // 进度条
  window.$loadingBar = useLoadingBar();
  // 通知
  window.$notification = useNotification();
  // 信息（支持动态多语言拦截）
  const rawMessage = useMessage();
  const wrapMsg = (fn: any) => (content: any, options?: any) => {
    if (typeof content === "string") {
      return fn(trSetting(content), options);
    }
    return fn(content, options);
  };
  window.$message = {
    ...rawMessage,
    info: wrapMsg(rawMessage.info),
    success: wrapMsg(rawMessage.success),
    warning: wrapMsg(rawMessage.warning),
    error: wrapMsg(rawMessage.error),
    loading: wrapMsg(rawMessage.loading),
  };
  // 对话框（支持动态多语言拦截）
  const rawDialog = useDialog();
  const wrapDialog = (fn: any) => (options: any) => {
    if (options && typeof options === "object") {
      const localized = { ...options };
      if (typeof localized.title === "string") localized.title = trSetting(localized.title);
      if (typeof localized.content === "string") localized.content = trSetting(localized.content);
      if (typeof localized.positiveText === "string")
        localized.positiveText = trSetting(localized.positiveText);
      if (typeof localized.negativeText === "string")
        localized.negativeText = trSetting(localized.negativeText);
      return fn(localized);
    }
    return fn(options);
  };
  window.$dialog = {
    ...rawDialog,
    info: wrapDialog(rawDialog.info),
    success: wrapDialog(rawDialog.success),
    warning: wrapDialog(rawDialog.warning),
    error: wrapDialog(rawDialog.error),
  };
  // 模态框
  const rawModal = useModal();
  window.$modal = {
    ...rawModal,
    create: (options: any) =>
      rawModal.create({
        ...options,
        title: typeof options?.title === "string" ? trSetting(options.title) : options?.title,
      }),
  };
};

// 挂载工具
const NaiveProviderContent = defineComponent({
  setup() {
    setupNaiveTools();
  },
  render() {
    return h("div", { className: "main-tools" });
  },
});

// 应用背景模式类名
const applyThemeBackgroundMode = () => {
  if (statusStore.isCustomBackground) {
    document.documentElement.classList.add("image");
  } else {
    document.documentElement.classList.remove("image");
  }
};

// 监听设置更改
watch(
  () => [
    settingStore.themeColorType,
    settingStore.themeFollowCover,
    settingStore.themeGlobalColor,
    settingStore.themeVariant,
    settingStore.globalFont,
    statusStore.songCoverTheme?.main,
    statusStore.themeBackgroundMode,
    statusStore.backgroundConfig.themeColor,
    statusStore.backgroundConfig.useCustomColor,
    statusStore.backgroundConfig.customColor,
    statusStore.backgroundConfig.isSolid,
    theme.value,
  ],
  () => changeGlobalTheme(),
);

// 自定义颜色更改
watchDebounced(
  () => settingStore.themeCustomColor,
  () => {
    changeGlobalTheme();
  },
  { debounce: 500, maxWait: 1000 },
);

onMounted(() => {
  const legacyTextLocalization = setupLegacyTextLocalization();
  refreshLegacyText = legacyTextLocalization.refresh;
  stopLegacyText = legacyTextLocalization.stop;
  changeGlobalTheme();
  // 自定义代码注入
  useCustomCode();
});

onBeforeUnmount(() => {
  refreshLegacyText = undefined;
  stopLegacyText?.();
  stopLegacyText = undefined;
});
</script>
