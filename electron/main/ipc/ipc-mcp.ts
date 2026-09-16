import { ipcMain } from "electron";
import {
  getMcpStatus,
  restartMcpServer,
  startMcpServer,
  stopMcpServer,
  getMcpClientConfigParams,
  detectMcpAgents,
  injectMcpAgentConfig,
} from "../services/mcp";
import { useStore } from "../store";

/**
 * 初始化 MCP 相关的 IPC 通信
 */
const initMcpIpc = (): void => {
  // 获取服务状态
  ipcMain.handle("mcp:get-status", async () => {
    return getMcpStatus();
  });

  // 重启服务
  ipcMain.handle("mcp:restart", async () => {
    return restartMcpServer();
  });

  // 启停切换
  ipcMain.handle("mcp:toggle", async (_event, enabled: boolean) => {
    const store = useStore();
    store.set("mcp.enabled" as any, enabled);
    if (enabled) {
      return startMcpServer();
    } else {
      await stopMcpServer();
      return getMcpStatus();
    }
  });

  // 获取客户端配置参数
  ipcMain.handle("mcp:get-client-config", async () => {
    return getMcpClientConfigParams();
  });

  // 探测本机 AI 客户端
  ipcMain.handle("mcp:detect-agents", async () => {
    return detectMcpAgents();
  });

  // 注入配置至目标 Agent
  ipcMain.handle("mcp:inject-agent", async (_event, agentId: string, params: any) => {
    return injectMcpAgentConfig(agentId, params);
  });
};

export default initMcpIpc;
