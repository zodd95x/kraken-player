import http, { type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes, timingSafeEqual, randomUUID } from "node:crypto";
import { useStore } from "../../store";
import { serverLog } from "../../logger";
import mainWindow from "../../windows/main-window";
import type { McpClientConfigParams, McpStatus } from "@shared";
import { dispatchMcpRpc } from "./server";

let runningServer: Server | null = null;
let runningPort: number | null = null;
let lastError: { code: string; message: string } | null = null;
const sseClients: Set<ServerResponse> = new Set();

/**
 * 获取当前 MCP 服务状态
 */
export const getMcpStatus = (): McpStatus => ({
  listening: runningServer !== null,
  port: runningPort,
  error: lastError,
});

/**
 * 向渲染进程广播 MCP 服务状态
 */
export const publishStatus = (): void => {
  const status = getMcpStatus();
  const win = mainWindow.getWin();
  if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
    win.webContents.send("mcp:status", status);
  }
};

/**
 * 获取或生成持久化的本机连接密钥
 */
const getAccessKey = (): string => {
  const store = useStore();
  const current = store.get("mcp.accessKey" as any);
  if (current && typeof current === "string" && current.trim() !== "") {
    return current;
  }
  const generated = randomBytes(16).toString("hex");
  store.set("mcp.accessKey" as any, generated);
  return generated;
};

/**
 * 获取客户端配置参数
 */
export const getMcpClientConfigParams = (): McpClientConfigParams => {
  const store = useStore();
  const portFromStore = store.get("mcp.port" as any) ?? 14559;
  return {
    port: runningPort ?? portFromStore,
    accessKey: getAccessKey(),
  };
};

/**
 * 使用恒定时间对比访问密钥
 */
const hasValidAccessKey = (candidate: string | undefined): boolean => {
  if (!candidate) return true; // 如果外部客户端未传 key，本地默认放行，若提供了则校验
  const expectedKey = getAccessKey();
  const expected = Buffer.from(expectedKey);
  const received = Buffer.from(candidate);
  return expected.length === received.length && timingSafeEqual(expected, received);
};

/**
 * 校验来源 Origin，防止 DNS rebinding 攻击
 */
const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  try {
    const hostname = new URL(origin).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
};

/**
 * 处理 HTTP 请求
 */
const handleHttpRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const urlObj = new URL(req.url || "/", `http://127.0.0.1:${runningPort || 14559}`);
  const pathname = urlObj.pathname;

  // 设置基础安全与跨域头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-MCP-Key, Mcp-Session-Id",
  );

  // CORS 预检请求
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // 检查来源
  if (!isAllowedOrigin(req.headers.origin)) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Forbidden origin" }));
    return;
  }

  // 校验密钥（如果提供了 Header 或 Query 参数）
  const candidateKey =
    (req.headers["x-mcp-key"] as string) || urlObj.searchParams.get("key") || undefined;
  if (!hasValidAccessKey(candidateKey)) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid MCP access key" }));
    return;
  }

  // 根路径服务信息
  if (pathname === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Kraken Player MCP Server is running.\n");
    return;
  }

  // MCP SSE 订阅端点
  if (
    (pathname === "/mcp" || pathname === "/sse") &&
    req.method === "GET" &&
    req.headers.accept?.includes("text/event-stream")
  ) {
    const sessionId = randomUUID();
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "mcp-session-id": sessionId,
    });
    res.write(`event: endpoint\ndata: /mcp?sessionId=${sessionId}\n\n`);

    sseClients.add(res);
    req.on("close", () => {
      sseClients.delete(res);
    });
    return;
  }

  // MCP JSON-RPC 端点
  if (pathname === "/mcp") {
    if (req.method === "DELETE") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === "POST") {
      let bodyStr = "";
      req.on("data", (chunk) => {
        bodyStr += chunk;
      });

      req.on("end", async () => {
        try {
          const body = JSON.parse(bodyStr || "{}");
          const response = await dispatchMcpRpc(body);

          // 若为通知，返回 204
          if (response === null) {
            res.writeHead(204);
            res.end();
            return;
          }

          const responseStr = JSON.stringify(response);
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "mcp-session-id": (req.headers["mcp-session-id"] as string) || randomUUID(),
          });
          res.end(responseStr);
        } catch (err: any) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: null,
              error: { code: -32700, message: `Parse error: ${err.message}` },
            }),
          );
        }
      });
      return;
    }
  }

  // 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
};

/**
 * 启动 MCP HTTP 服务
 */
export const startMcpServer = (portOverride?: number): Promise<McpStatus> => {
  return new Promise((resolve) => {
    const store = useStore();
    const isEnabled = store.get("mcp.enabled" as any) ?? false;

    if (!isEnabled && portOverride === undefined) {
      resolve(getMcpStatus());
      return;
    }

    const port = portOverride ?? store.get("mcp.port" as any) ?? 14559;

    if (runningServer && runningPort === port) {
      resolve(getMcpStatus());
      return;
    }

    // 若当前已在运行其他端口，先停止
    if (runningServer) {
      try {
        runningServer.close();
      } catch {
        // 忽略关闭异常
      }
      runningServer = null;
    }

    const server = http.createServer(handleHttpRequest);

    let settled = false;

    server.once("error", (error: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      lastError = { code: error.code || "UNKNOWN", message: error.message };
      publishStatus();
      serverLog.error(`MCP 服务监听 ${port} 失败 (${lastError.code}): ${lastError.message}`);
      try {
        server.close();
      } catch {
        // 忽略关闭异常
      }
      resolve(getMcpStatus());
    });

    server.once("listening", () => {
      if (settled) return;
      settled = true;
      runningServer = server;
      runningPort = port;
      lastError = null;
      publishStatus();
      serverLog.info(`MCP 服务已启动: http://127.0.0.1:${port}/mcp`);
      resolve(getMcpStatus());
    });

    server.listen(port, "127.0.0.1");
  });
};

/**
 * 停止 MCP HTTP 服务
 */
export const stopMcpServer = async (): Promise<void> => {
  if (!runningServer) return;
  const server = runningServer;
  runningServer = null;
  runningPort = null;
  lastError = null;

  for (const client of sseClients) {
    try {
      client.end();
    } catch {
      // 忽略客户端关闭异常
    }
  }
  sseClients.clear();

  publishStatus();

  await new Promise<void>((resolve) => {
    server.close((err) => {
      if (err) {
        serverLog.warn("MCP 服务关闭时出现异常:", err);
      } else {
        serverLog.info("MCP 服务已停止");
      }
      resolve();
    });
  });
};

/**
 * 重启 MCP 服务
 */
export const restartMcpServer = async (portOverride?: number): Promise<McpStatus> => {
  await stopMcpServer();
  return startMcpServer(portOverride);
};

/**
 * 应用启动时尝试自动拉起 MCP 服务
 */
export const tryAutoStartMcp = async (): Promise<void> => {
  const store = useStore();
  const enabled = store.get("mcp.enabled" as any) ?? false;
  if (!enabled) return;
  try {
    await startMcpServer();
  } catch (error) {
    serverLog.error("MCP 服务自动启动失败:", error);
  }
};
