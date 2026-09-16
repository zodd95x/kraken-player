import { useShortcutStore } from "@/stores";
import { SettingItem, SettingConfig } from "@/types/settings";
import { computed, markRaw } from "vue";
import ShortcutRecorder from "../components/ShortcutRecorder.vue";

export const useKeyboardSettings = (): SettingConfig => {
  const shortcutStore = useShortcutStore();

  const updateGlobalOpen = async (val: boolean) => {
    if (val) {
      await shortcutStore.registerAllShortcuts();
    } else {
      window.electron.ipcRenderer.send("unregister-all-shortcut");
      // 清除状态
      for (const key in shortcutStore.shortcutList) {
        shortcutStore.shortcutList[key as keyof typeof shortcutStore.shortcutList].isRegistered =
          false;
      }
    }
    shortcutStore.globalOpen = val;
  };

  // 规范化快捷键标题映射，确保多语言字典精准匹配
  const canonicalShortcutLabels: Record<string, string> = {
    playOrPause: "播放 / 暂停",
    playPrev: "上一曲",
    playNext: "下一曲",
    seekForward: "快进 5 秒",
    seekBackward: "快退 5 秒",
    volumeUp: "音量加",
    volumeDown: "音量减",
    "toggle-desktop-lyric": "桌面歌词",
    openPlayer: "打开播放界面",
    openPlayList: "打开播放列表",
    closePlayer: "关闭播放界面",
  };

  const createShortcutItems = (filterKeys: string[], allowGlobal: boolean): SettingItem[] => {
    return Object.entries(shortcutStore.shortcutList)
      .filter(([key]) => filterKeys.includes(key))
      .map(([key, item]) => ({
        key,
        label: canonicalShortcutLabels[key] || item.name,
        type: "custom",
        component: markRaw(ShortcutRecorder),
        componentProps: { shortcutKey: key, allowGlobal },
      }));
  };

  // 页面快捷键的 Key
  const pageShortcutKeys = ["openPlayer", "openPlayList", "closePlayer"];
  // 全局快捷键的 Key
  const globalShortcutKeys = Object.keys(shortcutStore.shortcutList).filter(
    (key) => !pageShortcutKeys.includes(key),
  );

  return {
    groups: [
      {
        title: "全局快捷键",
        items: [
          {
            key: "globalOpen",
            label: "开启全局快捷键",
            type: "switch",
            description: "可能会导致与其他软件相互冲突，请谨慎开启",
            value: computed({
              get: () => shortcutStore.globalOpen,
              set: (v) => updateGlobalOpen(v),
            }),
          },
        ],
      },
      {
        title: "全局快捷键更改",
        items: createShortcutItems(globalShortcutKeys, true),
      },
      {
        title: "恢复全局默认",
        items: [
          {
            key: "resetShortcut",
            label: "恢复默认全局快捷键",
            type: "button",
            buttonLabel: "恢复默认",
            action: () => {
              window.$dialog.warning({
                title: "重置快捷键",
                content: "确定重置当前快捷键配置？",
                positiveText: "重置",
                negativeText: "取消",
                onPositiveClick: () => {
                  shortcutStore.$reset();
                  window.$message.success("快捷键重置成功");
                },
              });
            },
          },
        ],
      },
      {
        title: "页面内快捷键",
        items: createShortcutItems(pageShortcutKeys, false),
      },
    ],
  };
};
