import { computed, markRaw } from "vue";
import { useI18n } from "vue-i18n";
import { useSettingStore } from "@/stores";
import { isElectron } from "@/utils/env";
import type { SettingConfig } from "@/types/settings";
import McpStatusCard from "../components/McpStatusCard.vue";
import McpConfigDialog from "../components/McpConfigDialog.vue";

export const useMcpSettings = (): SettingConfig => {
  const { t } = useI18n();
  const settingStore = useSettingStore();

  // 启停切换
  const handleToggle = async (value: boolean) => {
    settingStore.mcp.enabled = value;
    if (isElectron && window.api?.mcp) {
      await window.api.mcp.toggle(value);
      if (value) {
        window.$message.success(t("settings.mcp_running"));
      } else {
        window.$message.info(t("settings.mcp_stopped"));
      }
    }
  };

  // 端口更新
  const handlePortChange = async (port: number) => {
    settingStore.mcp.port = port;
    if (isElectron && window.api?.mcp && settingStore.mcp.enabled) {
      const res = await window.api.mcp.restart();
      if (res.listening) {
        window.$message.success(t("settings.mcp_restarted"));
      } else if (res.error) {
        window.$message.error(res.error.message);
      }
    }
  };

  return {
    groups: [
      {
        title: "MCP",
        tags: [{ text: "Beta", type: "info" }],
        items: [
          {
            key: "mcpStatusCard",
            label: () => "MCP",
            type: "custom",
            noWrapper: true,
            component: markRaw(McpStatusCard),
          },
          {
            key: "mcpEnabled",
            label: () => t("settings.mcp_enable"),
            type: "switch",
            description: () => t("settings.mcp_desc"),
            value: computed({
              get: () => settingStore.mcp.enabled,
              set: (v) => handleToggle(v),
            }),
            children: [
              {
                key: "mcpPort",
                label: () => t("settings.mcp_port"),
                type: "input-number",
                description: () => t("settings.mcp_port_desc"),
                componentProps: {
                  min: 1024,
                  max: 65535,
                  showButton: false,
                  placeholder: "14559",
                },
                value: computed({
                  get: () => settingStore.mcp.port,
                  set: (v) => handlePortChange(v || 14559),
                }),
              },
              {
                key: "mcpConfigDetails",
                label: () => t("settings.mcp_client_config"),
                type: "custom",
                description: () => t("settings.mcp_client_config_desc"),
                component: markRaw(McpConfigDialog),
              },
            ],
          },
        ],
      },
    ],
  };
};
