<template>
  <n-flex :wrap="false" align="center" style="width: 460px; justify-content: flex-end">
    <!-- 本地/页面内快捷键 -->
    <n-popover trigger="focus">
      <template #trigger>
        <n-input
          :value="formatShortcutDisplay(shortcutItem.shortcut)"
          :placeholder="trSetting('未设置')"
          readonly
          class="shortcut-input"
          @focus="onFocus(false)"
          @blur="onBlur"
          @keydown.stop="onKeyDown"
          @keyup="keyHandled = ''"
        />
      </template>
      <n-text>{{ trSetting("正在设置快捷键，按 Backspace 删除快捷键") }}</n-text>
    </n-popover>
    <!-- 全局快捷键 -->
    <n-popover trigger="focus" v-if="allowGlobal">
      <template #trigger>
        <n-input
          :value="formatShortcutDisplay(shortcutItem.globalShortcut)"
          :disabled="!shortcutStore.globalOpen"
          :status="shortcutItem.globalShortcut && shortcutItem.isRegistered ? 'error' : undefined"
          :placeholder="trSetting('未设置')"
          readonly
          class="shortcut-input"
          @focus="onFocus(true)"
          @blur="onBlur"
          @keydown.stop="onKeyDown"
          @keyup="keyHandled = ''"
        >
          <template #prefix>
            <n-text :depth="3">{{ trSetting("全局") }}</n-text>
          </template>
        </n-input>
      </template>
      <n-text>{{ trSetting("正在设置快捷键，按 Backspace 删除快捷键") }}</n-text>
    </n-popover>
  </n-flex>
</template>

<script setup lang="ts">
import { useShortcutStore } from "@/stores";
import { formatForGlobalShortcut } from "@/utils/helper";
import { trSetting } from "@/utils/i18nSettings";
import { includes, some } from "lodash-es";
import { ref, computed } from "vue";

const props = defineProps<{
  shortcutKey: string;
  allowGlobal?: boolean;
}>();

const shortcutStore = useShortcutStore();
const shortcutItem = computed(() => shortcutStore.shortcutList[props.shortcutKey]);

// 格式化快捷键显示
const formatShortcutDisplay = (shortcut?: string): string => {
  if (!shortcut || !shortcut.trim()) return "";
  const isMac = typeof navigator !== "undefined" && /macintosh|mac os x/i.test(navigator.userAgent);

  const keyMap: Record<string, string> = {
    CmdOrCtrl: isMac ? "⌘" : "Ctrl",
    Command: "⌘",
    Cmd: "⌘",
    Ctrl: "Ctrl",
    Control: "Ctrl",
    Shift: isMac ? "⇧" : "Shift",
    Alt: isMac ? "⌥" : "Alt",
    Option: isMac ? "⌥" : "Alt",
    ArrowLeft: "←",
    Left: "←",
    ArrowRight: "→",
    Right: "→",
    ArrowUp: "↑",
    Up: "↑",
    ArrowDown: "↓",
    Down: "↓",
    Space: "Space",
    Escape: "Esc",
    Esc: "Esc",
    Enter: "Enter",
    Return: "Enter",
    Backspace: "Backspace",
    Delete: "Del",
  };

  return shortcut
    .split("+")
    .map((part) => {
      const trimmed = part.trim();
      if (keyMap[trimmed]) return keyMap[trimmed];
      if (trimmed.startsWith("Key")) return trimmed.replace("Key", "");
      if (trimmed.startsWith("Digit")) return trimmed.replace("Digit", "");
      if (trimmed.startsWith("Numpad")) return "Num " + trimmed.replace("Numpad", "");
      return trimmed;
    })
    .join(" + ");
};

// 选中状态
const isFocus = ref(false);
const isGlobalFocus = ref(false);

// 按键标志位
const keyHandled = ref<string>("");

// 获取按下的快捷键
const getShortcut = (e: KeyboardEvent): string => {
  const allowedCodes = [
    // 字母 a-z
    "KeyA",
    "KeyB",
    "KeyC",
    "KeyD",
    "KeyE",
    "KeyF",
    "KeyG",
    "KeyH",
    "KeyI",
    "KeyJ",
    "KeyK",
    "KeyL",
    "KeyM",
    "KeyN",
    "KeyO",
    "KeyP",
    "KeyQ",
    "KeyR",
    "KeyS",
    "KeyT",
    "KeyU",
    "KeyV",
    "KeyW",
    "KeyX",
    "KeyY",
    "KeyZ",
    // 数字 0-9
    "Digit0",
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
    "Digit9",
    "Numpad0",
    "Numpad1",
    "Numpad2",
    "Numpad3",
    "Numpad4",
    "Numpad5",
    "Numpad6",
    "Numpad7",
    "Numpad8",
    "Numpad9",
    // 功能键
    "Space",
    "ArrowLeft",
    "ArrowUp",
    "ArrowRight",
    "ArrowDown",
    "Escape",
    // Funtion keys
    "F1",
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
    "F9",
    "F10",
    "F11",
    "F12",
  ];
  if (!allowedCodes.includes(e.code)) return "";
  return e.code;
};

const onFocus = (global: boolean) => {
  isFocus.value = true;
  isGlobalFocus.value = global;
  if (global) {
    window.electron.ipcRenderer.send("unregister-all-shortcut");
  }
};

const onBlur = async () => {
  if (isFocus.value) {
    if (isGlobalFocus.value) {
      const failedShortcuts = await shortcutStore.registerAllShortcuts();
      if (failedShortcuts) {
        // 更新所有快捷键的注册状态
        for (const key in shortcutStore.shortcutList) {
          // @ts-ignore
          const item = shortcutStore.shortcutList[key];
          // 如果该快捷键在失败列表中，标记为已注册（即冲突），否则为未注册（成功）
          // @ts-ignore
          shortcutStore.shortcutList[key].isRegistered =
            item.globalShortcut && failedShortcuts.includes(item.globalShortcut);
        }
      }
    }
  }
  isFocus.value = false;
  isGlobalFocus.value = false;
};

// 快捷键是否重复
const isRepeat = (shortcut: string): boolean => {
  return some(Object.values(shortcutStore.shortcutList), (item) => {
    return includes([item.shortcut, item.globalShortcut], shortcut);
  });
};

// 是否被占用
const checkRegistered = async (shortcut: string) => {
  try {
    if (!shortcut) return false;
    const isRegistered = await window.electron.ipcRenderer.invoke(
      "is-shortcut-registered",
      formatForGlobalShortcut(shortcut),
    );
    // 更新状态
    shortcutStore.shortcutList[props.shortcutKey].isRegistered = isRegistered;
    return isRegistered;
  } catch (error) {
    console.error("Error checking shortcut registration:", error);
    return false;
  }
};

const changeShortcut = async (shortcut: string) => {
  const targetKey = isGlobalFocus.value ? "globalShortcut" : "shortcut";
  shortcutStore.shortcutList[props.shortcutKey][targetKey] = shortcut;
};

const isSameShortcut = (shortcut: string) => {
  const targetKey = isGlobalFocus.value ? "globalShortcut" : "shortcut";
  return shortcutStore.shortcutList[props.shortcutKey][targetKey] === shortcut;
};

const onKeyDown = async (e: KeyboardEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (!isFocus.value) return;

  if (e.code === keyHandled.value) return;
  keyHandled.value = e.code;

  const blur = () => {
    keyHandled.value = "";
    const target = e.target;
    if (target instanceof HTMLElement) target.blur();
  };

  if (e.code === "Backspace") {
    changeShortcut("");
    window.$message.success(trSetting("快捷键已删除"));
    blur();
    return;
  }

  const isCtrl = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;
  const isAlt = e.altKey;

  const keyCode = getShortcut(e);
  if (!keyCode) return;

  const shortcut = [isCtrl && "CmdOrCtrl", isShift && "Shift", isAlt && "Alt", keyCode]
    .filter(Boolean)
    .join("+");

  const formattedShortcut = !isGlobalFocus.value
    ? shortcut
    : (() => {
        const key = isCtrl || isShift || isAlt ? shortcut : "CmdOrCtrl+Shift+" + keyCode;
        return formatForGlobalShortcut(key);
      })();

  if (isSameShortcut(formattedShortcut)) {
    window.$message.info(trSetting("快捷键相同"));
    blur();
    return;
  }

  if (isRepeat(formattedShortcut)) {
    window.$message.warning(trSetting("快捷键设置冲突"));
    blur();
    return;
  }

  if (isGlobalFocus.value) {
    // 检查占用
    const isRegistered = await checkRegistered(formattedShortcut);
    if (isRegistered) {
      window.$message.warning(trSetting("快捷键已被占用"));
    } else {
      window.$message.success(trSetting("快捷键设置成功"));
    }
    changeShortcut(formattedShortcut);
  } else {
    changeShortcut(shortcut);
    window.$message.success(trSetting("快捷键设置成功"));
  }

  blur();
};
</script>

<style scoped lang="scss">
.shortcut-input {
  flex: 1;
  text-align: center;
  :deep(input) {
    text-align: center;
  }
}
.n-flex {
  gap: 12px;
}
</style>
