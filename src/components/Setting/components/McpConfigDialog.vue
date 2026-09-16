<template>
  <div class="mcp-config-dialog-trigger">
    <n-button type="primary" secondary size="small" :loading="opening" @click="handleOpen">
      {{ t("settings.mcp_configure") }}
    </n-button>

    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="t('settings.mcp_client_config')"
      class="mcp-modal"
      style="width: 620px; max-width: 90vw"
      :segmented="{ content: 'soft', footer: 'soft' }"
    >
      <div class="modal-content">
        <!-- 配置预览 -->
        <div class="config-preview">
          <pre class="code-block"><code>{{ clientConfig }}</code></pre>
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button class="copy-btn" quaternary circle size="small" @click="handleCopyConfig">
                <template #icon>
                  <SvgIcon name="Copy" :size="16" />
                </template>
              </n-button>
            </template>
            {{ t("common.copy") }}
          </n-tooltip>
        </div>

        <!-- 本地检测到的 AI 客户端 -->
        <div v-if="agents.length > 0" class="detected-agents">
          <n-text class="detect-title" strong :depth="2">
            {{ t("settings.mcp_detect_hint") }}
          </n-text>
          <div class="agent-list">
            <n-card v-for="agent in agents" :key="agent.id" size="small" class="agent-card">
              <div class="agent-info">
                <n-text class="agent-name" strong>{{ agent.name }}</n-text>
                <n-text class="agent-path" :depth="3" :title="agent.configPath">
                  {{ agent.configPath }}
                </n-text>
              </div>
              <n-button
                size="small"
                :type="agent.configured ? 'default' : 'primary'"
                :secondary="!agent.configured"
                :disabled="agent.configured || !agent.injectable"
                :loading="injecting[agent.id]"
                @click="handleInject(agent)"
              >
                {{
                  !agent.injectable
                    ? t("settings.mcp_not_supported")
                    : agent.configured
                      ? t("settings.mcp_injected")
                      : t("settings.mcp_inject")
                }}
              </n-button>
            </n-card>
          </div>
        </div>
      </div>

      <template #footer>
        <n-flex justify="end">
          <n-button type="primary" @click="showModal = false">
            {{ t("common.close") }}
          </n-button>
        </n-flex>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRaw } from "vue";
import { useI18n } from "vue-i18n";
import { useSettingStore } from "@/stores";
import { copyData } from "@/utils/helper";
import { isElectron } from "@/utils/env";
import type { McpAgentApp, McpClientConfigParams } from "@shared";

const { t } = useI18n();
const settingStore = useSettingStore();

const showModal = ref(false);
const opening = ref(false);
const params = ref<McpClientConfigParams>({
  port: settingStore.mcp.port ?? 14559,
  accessKey: "********************************",
});
const agents = ref<McpAgentApp[]>([]);
const injecting = ref<Record<string, boolean>>({});

// 生成的标准客户端配置 JSON
const clientConfig = computed(() =>
  JSON.stringify(
    {
      mcpServers: {
        "kraken-player": {
          type: "http",
          url: `http://127.0.0.1:${params.value.port}/mcp`,
          headers: { "X-MCP-Key": params.value.accessKey },
        },
      },
    },
    null,
    2,
  ),
);

// 打开弹窗并加载参数与检测列表
const handleOpen = async () => {
  if (!isElectron || opening.value) return;
  opening.value = true;
  try {
    const [nextParams, nextAgents] = await Promise.all([
      window.api.mcp.getClientConfigParams(),
      window.api.mcp.detectAgents(),
    ]);
    params.value = nextParams;
    agents.value = nextAgents;
    showModal.value = true;
  } catch (err: any) {
    window.$message.error(err.message || String(err));
  } finally {
    opening.value = false;
  }
};

// 复制配置 JSON
const handleCopyConfig = () => {
  copyData(clientConfig.value, t("common.copySuccess") || "已复制配置");
};

// 一键注入到客户端
const handleInject = async (agent: McpAgentApp) => {
  if (agent.configured || !agent.injectable) return;
  injecting.value[agent.id] = true;
  try {
    await window.api.mcp.injectAgentConfig(agent.id, toRaw(params.value));
    agent.configured = true;
    window.$message.success(t("settings.mcp_inject_success"));
  } catch (err: any) {
    window.$message.error(err.message || String(err));
  } finally {
    injecting.value[agent.id] = false;
  }
};
</script>

<style scoped lang="scss">
.modal-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-preview {
  position: relative;
  border-radius: 8px;
  background-color: var(--n-input-color, rgba(0, 0, 0, 0.05));
  border: 1px solid var(--n-border-color, rgba(255, 255, 255, 0.08));
  overflow: hidden;

  .code-block {
    margin: 0;
    padding: 14px;
    padding-right: 48px;
    font-family: monospace;
    font-size: 13px;
    line-height: 1.5;
    overflow-x: auto;
    color: var(--n-text-color, inherit);
  }

  .copy-btn {
    position: absolute;
    top: 8px;
    right: 8px;
  }
}

.detected-agents {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .detect-title {
    font-size: 13px;
  }

  .agent-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .agent-card {
    border-radius: 8px;

    :deep(.n-card__content) {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
    }

    .agent-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;

      .agent-name {
        font-size: 14px;
      }

      .agent-path {
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}
</style>
