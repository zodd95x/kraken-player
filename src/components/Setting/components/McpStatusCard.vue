<template>
  <div class="mcp-status-card">
    <div class="status-indicator">
      <span class="status-dot" :class="{ active: status.listening }" />
      <n-text class="status-text" :depth="2">
        {{ status.listening ? t("settings.mcp_running") : t("settings.mcp_stopped") }}
      </n-text>
    </div>
    <div class="address-box" :title="address">
      <code>{{ address }}</code>
    </div>
    <div class="actions">
      <n-tooltip trigger="hover">
        <template #trigger>
          <n-button quaternary circle size="small" @click="handleCopy">
            <template #icon>
              <SvgIcon name="Copy" :size="16" />
            </template>
          </n-button>
        </template>
        {{ t("common.copy") }}
      </n-tooltip>
      <n-button
        type="primary"
        secondary
        size="small"
        :disabled="!settingStore.mcp.enabled"
        :loading="restarting"
        @click="handleRestart"
      >
        {{ t("settings.mcp_restart") }}
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { useSettingStore } from "@/stores";
import { copyData } from "@/utils/helper";
import { isElectron } from "@/utils/env";
import type { McpStatus } from "@shared";

const { t } = useI18n();
const settingStore = useSettingStore();

// 服务状态
const status = ref<McpStatus>({
  listening: false,
  port: null,
  error: null,
});

const restarting = ref(false);

// 当前服务地址
const address = computed(() => {
  const port = status.value.port ?? settingStore.mcp.port ?? 14559;
  return `http://127.0.0.1:${port}/mcp`;
});

// 复制服务地址
const handleCopy = () => {
  copyData(address.value, t("common.copySuccess") || "已复制地址");
};

// 重启服务
const handleRestart = async () => {
  if (!isElectron || !settingStore.mcp.enabled || restarting.value) return;
  restarting.value = true;
  try {
    const result = await window.api.mcp.restart();
    status.value = result;
    if (result.listening) {
      window.$message.success(t("settings.mcp_restarted"));
    } else if (result.error?.code === "EADDRINUSE") {
      window.$message.error(t("settings.mcp_port_in_use", { port: settingStore.mcp.port }));
    } else if (result.error) {
      window.$message.error(result.error.message);
    }
  } catch (err: any) {
    window.$message.error(err.message || String(err));
  } finally {
    restarting.value = false;
  }
};

let unsubscribe: (() => void) | undefined;

// 初始化状态监听
onMounted(async () => {
  if (!isElectron) return;
  try {
    status.value = await window.api.mcp.getStatus();
    unsubscribe = window.api.mcp.onStatus((newStatus) => {
      status.value = newStatus;
    });
  } catch (err) {
    console.error("获取 MCP 状态失败:", err);
  }
});

onBeforeUnmount(() => {
  if (unsubscribe) unsubscribe();
});
</script>

<style scoped lang="scss">
.mcp-status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
  border-radius: 12px;
  background-color: var(--n-card-color, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--n-border-color, rgba(255, 255, 255, 0.08));

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #ef4444;
      flex-shrink: 0;
      transition: all 0.3s ease;

      &.active {
        background-color: #10b981;
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
        animation: mcp-pulse 2s infinite;
      }
    }

    .status-text {
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
    }
  }

  .address-box {
    flex: 1;
    min-width: 0;
    padding: 6px 10px;
    border-radius: 6px;
    background-color: var(--n-input-color, rgba(0, 0, 0, 0.04));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    code {
      font-family: monospace;
      font-size: 13px;
      color: var(--n-text-color, inherit);
      opacity: 0.9;
    }
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}

@keyframes mcp-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}
</style>
