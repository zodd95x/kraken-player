import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { app } from "electron";
import type { McpAgentApp, McpClientConfigParams } from "@shared";
import { serverLog } from "../../logger";
import { isWin } from "../../utils/config";

interface AgentDefinition {
  id: string;
  name: string;
  getConfigPath: () => string;
  getInstallPaths: () => string[];
  format?: "json" | "toml" | "antigravity";
  injectable?: boolean;
}

const getAppDataPath = () => app.getPath("appData");
const MCP_SERVER_NAME = "kraken-player";
const LEGACY_MCP_SERVER_NAME = "splayer";

const SUPPORTED_AGENTS: AgentDefinition[] = [
  {
    id: "cursor",
    name: "Cursor",
    getConfigPath: () => path.join(os.homedir(), ".cursor", "mcp.json"),
    getInstallPaths: () => [
      path.join(os.homedir(), ".cursor"),
      ...(isWin ? [path.join(getAppDataPath(), "..", "Local", "Programs", "cursor")] : []),
    ],
  },
  {
    id: "antigravity",
    name: "Antigravity IDE / CLI",
    getConfigPath: () => path.join(os.homedir(), ".gemini", "config", "mcp_config.json"),
    getInstallPaths: () => [
      path.join(os.homedir(), ".gemini", "antigravity"),
      path.join(os.homedir(), ".gemini"),
    ],
    format: "antigravity",
  },
  {
    id: "claudedesktop",
    name: "Claude Desktop",
    getConfigPath: () => {
      if (isWin) {
        return path.join(getAppDataPath(), "Claude", "claude_desktop_config.json");
      }
      return path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json",
      );
    },
    getInstallPaths: () => [
      isWin
        ? path.join(getAppDataPath(), "Claude")
        : path.join(os.homedir(), "Library", "Application Support", "Claude"),
    ],
    injectable: true,
  },
  {
    id: "claudecode",
    name: "Claude Code",
    getConfigPath: () => path.join(os.homedir(), ".claude.json"),
    getInstallPaths: () => [path.join(os.homedir(), ".claude")],
  },
  {
    id: "codex",
    name: "Codex",
    getConfigPath: () => path.join(os.homedir(), ".codex", "config.toml"),
    getInstallPaths: () => [
      path.join(os.homedir(), ".codex"),
      ...(isWin ? [path.join(getAppDataPath(), "..", "Local", "OpenAI", "Codex")] : []),
    ],
    format: "toml",
  },
];

/**
 * 探测本地已安装的 AI Agent 及配置状态
 */
export const detectMcpAgents = async (): Promise<McpAgentApp[]> => {
  const detected: McpAgentApp[] = [];

  for (const agent of SUPPORTED_AGENTS) {
    const configPath = agent.getConfigPath();
    const candidatePaths = [configPath, ...agent.getInstallPaths()];

    let installed = false;
    for (const p of candidatePaths) {
      try {
        await fs.access(p);
        installed = true;
        break;
      } catch {
        // 文件或目录不存在
      }
    }

    if (!installed) continue;

    let configured = false;
    try {
      const content = await fs.readFile(configPath, "utf-8");
      if (agent.format === "toml") {
        configured = new RegExp(
          `^\\s*\\[mcp_servers\\.(?:${MCP_SERVER_NAME}|${LEGACY_MCP_SERVER_NAME})\\]\\s*$`,
          "m",
        ).test(content);
      } else {
        const json = JSON.parse(content || "{}");
        configured =
          !!json?.mcpServers?.[MCP_SERVER_NAME] || !!json?.mcpServers?.[LEGACY_MCP_SERVER_NAME];
      }
    } catch {
      configured = false;
    }

    detected.push({
      id: agent.id,
      name: agent.name,
      configPath,
      configured,
      injectable: agent.injectable !== false,
    });
  }

  return detected;
};

/**
 * 将 Kraken Player 的 MCP 配置注入到目标 Agent 中
 */
export const injectMcpAgentConfig = async (
  agentId: string,
  params: McpClientConfigParams,
): Promise<boolean> => {
  const agent = SUPPORTED_AGENTS.find((a) => a.id === agentId);
  if (!agent) {
    throw new Error(`不支持的客户端: ${agentId}`);
  }
  if (agent.injectable === false) {
    throw new Error(`${agent.name} 暂不支持自动注入`);
  }

  const configPath = agent.getConfigPath();

  if (agent.format === "toml") {
    let content = "";
    try {
      content = await fs.readFile(configPath, "utf-8");
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
    }

    if (
      new RegExp(
        `^\\s*\\[mcp_servers\\.(?:${MCP_SERVER_NAME}|${LEGACY_MCP_SERVER_NAME})\\]\\s*$`,
        "m",
      ).test(content)
    ) {
      return true;
    }

    const section = [
      `[mcp_servers.${MCP_SERVER_NAME}]`,
      `url = "http://127.0.0.1:${params.port}/mcp"`,
      `http_headers = { "X-MCP-Key" = ${JSON.stringify(params.accessKey)} }`,
    ].join("\n");
    const nextContent = `${content.trimEnd()}${content.trim() ? "\n\n" : ""}${section}\n`;

    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, nextContent, "utf-8");
    serverLog.info(`已成功注入配置到 ${agent.name} (${configPath})`);
    return true;
  }

  let json: Record<string, any> = {};
  try {
    const content = await fs.readFile(configPath, "utf-8");
    json = JSON.parse(content || "{}");
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      serverLog.warn(`解析配置文件失败，将重新创建: ${err.message}`);
    }
    json = {};
  }

  if (!json.mcpServers || typeof json.mcpServers !== "object") {
    json.mcpServers = {};
  }

  if (agent.format === "antigravity") {
    json.mcpServers[MCP_SERVER_NAME] = {
      serverUrl: `http://127.0.0.1:${params.port}/mcp`,
      headers: { "X-MCP-Key": params.accessKey },
    };
  } else {
    json.mcpServers[MCP_SERVER_NAME] = {
      type: "http",
      url: `http://127.0.0.1:${params.port}/mcp`,
      headers: { "X-MCP-Key": params.accessKey },
    };
  }

  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(json, null, 2), "utf-8");
  serverLog.info(`已成功注入配置到 ${agent.name} (${configPath})`);

  return true;
};
