import { appVersion } from "../../utils/config";
import { serverLog } from "../../logger";
import { executeMcpTool, getMcpToolsList } from "./tools";

/**
 * 处理单条 JSON-RPC 请求
 */
export const handleSingleRpc = async (rpc: any): Promise<any> => {
  if (!rpc || typeof rpc !== "object") {
    return {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600, message: "Invalid Request: expected object" },
    };
  }

  const { id, method, params } = rpc;

  // 通知类请求（无 id，不返回响应）
  if (id === undefined || id === null) {
    if (method === "notifications/initialized") {
      serverLog.info("MCP 客户端连接已完成初始化");
    }
    return null;
  }

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: { listChanged: false },
          },
          serverInfo: {
            name: "kraken-player",
            version: appVersion,
          },
        },
      };

    case "ping":
      return {
        jsonrpc: "2.0",
        id,
        result: {},
      };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: getMcpToolsList(),
        },
      };

    case "tools/call": {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      if (!toolName || typeof toolName !== "string") {
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Invalid params: name is required" },
        };
      }

      try {
        const result = await executeMcpTool(toolName, toolArgs);
        return {
          jsonrpc: "2.0",
          id,
          result,
        };
      } catch (err: any) {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: `工具执行异常: ${err.message || String(err)}` }],
            isError: true,
          },
        };
      }
    }

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
  }
};

/**
 * 分发并处理 JSON-RPC 请求（支持单条及批处理）
 */
export const dispatchMcpRpc = async (body: any): Promise<any> => {
  if (Array.isArray(body)) {
    const responses = await Promise.all(body.map((item) => handleSingleRpc(item)));
    return responses.filter((res) => res !== null);
  }
  return handleSingleRpc(body);
};
