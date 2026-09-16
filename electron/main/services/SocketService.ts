import { WebSocketServer, type WebSocket } from "ws";
import { createServer } from "net";
import { socketLog } from "../logger";
import { useStore } from "../store";
import { getTrackInfoFromRenderer } from "../utils/track-info";
import mainWindow from "../windows/main-window";

/**
 * WebSocket 主服务
 */
export class SocketService {
  private static instance: SocketService;

  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private currentPort: number | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * 当前是否已启动 WebSocket 服务
   */
  public isRunning(): boolean {
    return this.wss !== null;
  }

  /**
   * 获取当前监听端口
   */
  public getPort(): number | null {
    return this.currentPort;
  }

  /**
   * 启动 WebSocket 服务
   * @param portOverride 可选端口
   * @param forceRestart 是否强制重启
   */
  public async start(
    portOverride?: number,
    forceRestart: boolean = false,
  ): Promise<{ port: number }> {
    const store = useStore();
    const websocketConfig = store.get("websocket");
    const portFromStore = websocketConfig?.port;
    const port = portOverride ?? portFromStore ?? 25885;

    // 如果服务已在运行
    if (this.wss && this.currentPort !== null) {
      // 如果端口相同，直接返回
      if (this.currentPort === port) {
        return { port: this.currentPort };
      }
      // 如果端口不同且需要强制重启，先停止再启动
      if (forceRestart) {
        await this.stop();
      } else {
        // 否则返回当前端口
        return { port: this.currentPort };
      }
    }

    socketLog.info(`🔌 Trying to start WebSocket server on port ${port}`);

    // 先验证端口是否可用
    const isAvailable = await this.testPort(port);
    if (!isAvailable) throw new Error(`端口 ${port} 不可用`);

    return new Promise<{ port: number }>((resolve, reject) => {
      try {
        const wss = new WebSocketServer({ port });
        this.wss = wss;
        this.currentPort = port;

        wss.on("connection", (socket: WebSocket) => {
          this.handleClientConnection(socket);
        });

        wss.once("listening", () => {
          socketLog.info(`✅ WebSocket server started on port ${port}`);
          resolve({ port });
        });

        wss.once("error", (error: Error) => {
          socketLog.error("❌ WebSocket server failed to start:", error);
          this.cleanupServer();
          reject(error);
        });
      } catch (error) {
        socketLog.error("❌ WebSocket server creation error:", error);
        this.cleanupServer();
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * 测试 socket 端口是否可用（可以绑定）
   * @param port 要测试的端口
   * @returns 如果端口可用返回 true，否则返回 false
   */
  public async testPort(port: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const server = createServer();

      server.once("error", (error: NodeJS.ErrnoException) => {
        // 端口被占用或权限不足
        if (error.code === "EADDRINUSE" || error.code === "EACCES") {
          resolve(false);
        } else {
          resolve(false);
        }
      });

      server.once("listening", () => {
        // 端口可用，立即关闭测试服务器
        server.close(() => {
          resolve(true);
        });
      });

      try {
        server.listen(port, "127.0.0.1");
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * 尝试自动启动
   */
  public async tryAutoStart(): Promise<void> {
    const store = useStore();
    try {
      const websocketConfig = store.get("websocket");
      if (!websocketConfig?.enabled) return;
      const { port } = await this.start(websocketConfig.port, false);
      socketLog.info(`🔌 Auto-start WebSocket server on port ${port}`);
      store.set("websocket", { enabled: true, port });
    } catch (error) {
      socketLog.error("❌ Error while auto-starting WebSocket server from store:", error);
      store.set("websocket.enabled", false);
    }
  }

  /**
   * 关闭 WebSocket 服务
   */
  public async stop(): Promise<void> {
    if (!this.wss) return;

    const server = this.wss;
    socketLog.info("🛑 Stopping WebSocket server...");

    // 关闭所有客户端
    for (const client of this.clients) {
      try {
        client.close();
      } catch {
        // ignore
      }
    }
    this.clients.clear();

    await new Promise<void>((resolve) => {
      server.close(() => {
        socketLog.info("✅ WebSocket server stopped");
        resolve();
      });
    });

    this.cleanupServer();
  }

  /**
   * 处理客户端连接
   * @param socket WebSocket 客户端连接
   */
  private handleClientConnection(socket: WebSocket): void {
    // 检查服务是否已开启
    if (!this.isRunning()) {
      socketLog.warn("⚠️ Cannot handle connection: WebSocket service is not running");
      socket.close();
      return;
    }

    // 检查 socket 是否存在
    if (!socket) {
      socketLog.warn("⚠️ Cannot handle connection: socket is null or undefined");
      return;
    }

    this.clients.add(socket);
    socketLog.info("🔗 WebSocket client connected");

    // 发送欢迎消息
    this.sendWelcome(socket);

    // 监听消息
    socket.on("message", (data: Buffer) => {
      try {
        const message = data.toString();
        this.handleMessage(socket, message);
      } catch (error) {
        socketLog.error("⚠️ Error parsing message:", error);
      }
    });

    // 监听关闭
    socket.on("close", () => {
      this.clients.delete(socket);
      socketLog.info("🔌 WebSocket client disconnected");
    });

    // 监听错误
    socket.on("error", (error: Error) => {
      socketLog.error("⚠️ WebSocket client error:", error);
    });
  }

  /**
   * 处理接收到的消息
   * @param socket WebSocket 客户端连接
   * @param message 接收到的消息字符串
   */
  private handleMessage(socket: WebSocket, message: string): void {
    // 检查服务是否已开启
    if (!this.isRunning()) return;

    // 检查 socket 是否存在且在客户端集合中
    if (!socket || !this.clients.has(socket)) {
      socketLog.warn("⚠️ Cannot handle message: socket is invalid or not in clients set");
      return;
    }

    // 处理 WebSocket 协议消息
    const trimmedMessage = message.trim().toUpperCase();
    // 自动回复 PONG
    if (trimmedMessage === "PING") {
      try {
        if (socket.readyState === socket.OPEN) {
          socket.send("PONG");
        }
      } catch {
        // ignore
      }
      return;
    }
    // 解析 JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      this.sendToClient(socket, {
        type: "error",
        data: {
          message: "消息格式错误，请发送有效的 JSON 格式消息",
          received: message.substring(0, 100),
        },
      });
      return;
    }
    // 解析对象结构
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      socketLog.warn("⚠️ Invalid message structure: not an object");
      this.sendToClient(socket, {
        type: "error",
        data: { message: "消息格式错误，根对象必须是对象类型" },
      });
      return;
    }

    const messageObj = parsed as { type?: string; data?: unknown };
    if (!messageObj.type) {
      socketLog.warn("⚠️ Missing message type");
      this.sendToClient(socket, {
        type: "error",
        data: { message: "消息格式错误，缺少 type 字段" },
      });
      return;
    }
    socketLog.log(`📨 Received message type: ${messageObj.type}`);
    // 根据消息类型进行处理
    if (messageObj.type === "control") {
      this.handleControlCommand(socket, messageObj.data as { command?: string });
    } else if (messageObj.type === "get-song-info") {
      this.handleGetSongInfo(socket);
    } else {
      // 未知的消息类型
      socketLog.warn(`⚠️ Unknown message type: ${messageObj.type}`);
      this.sendToClient(socket, {
        type: "error",
        data: { message: `未知的消息类型: ${messageObj.type}` },
      });
    }
  }

  /**
   * 处理获取当前播放信息请求
   * @param socket WebSocket 客户端连接
   */
  private async handleGetSongInfo(socket: WebSocket): Promise<void> {
    try {
      const trackInfo = await getTrackInfoFromRenderer();
      this.sendToClient(socket, {
        type: "song-info",
        data: trackInfo,
      });
    } catch (error) {
      socketLog.error("❌ Error getting current track info:", error);
      this.sendToClient(socket, {
        type: "error",
        data: { message: "获取当前播放信息失败" },
      });
    }
  }

  /**
   * 向指定客户端发送消息
   * @param socket WebSocket 客户端连接
   * @param message 要发送的消息
   * @returns 发送成功返回 true，失败返回 false
   */
  public sendToClient(socket: WebSocket, message: unknown): boolean {
    // 检查服务是否已开启
    if (!this.isRunning()) return false;

    // 检查 socket 是否存在
    if (!socket) {
      socketLog.warn("⚠️ Cannot send message: socket is null or undefined");
      return false;
    }

    // 检查 socket 是否在客户端集合中
    if (!this.clients.has(socket)) {
      socketLog.warn("⚠️ Cannot send message: socket is not in clients set");
      return false;
    }

    // 检查 socket 连接状态
    if (socket.readyState !== socket.OPEN) {
      socketLog.warn("⚠️ Cannot send message: socket is not open");
      return false;
    }

    try {
      const jsonMessage = JSON.stringify(message);
      socket.send(jsonMessage);
      return true;
    } catch (error) {
      socketLog.error("⚠️ Error sending message to client:", error);
      return false;
    }
  }

  /**
   * 向所有连接的客户端广播消息
   * @param message 要广播的消息
   */
  public broadcast(message: unknown): void {
    // 检查服务是否已开启
    if (!this.isRunning() || this.clients.size === 0) return;

    const jsonMessage = JSON.stringify(message);
    let successCount = 0;
    let failCount = 0;

    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        try {
          client.send(jsonMessage);
          successCount++;
        } catch (error) {
          socketLog.error("⚠️ Error broadcasting to client:", error);
          failCount++;
        }
      } else {
        failCount++;
      }
    }
    if (successCount > 0) {
      socketLog.log(`📢 Broadcast message: ${successCount} success, ${failCount} failed`);
    }
  }

  /**
   * 处理播放器控制命令
   * @param socket WebSocket 客户端连接
   * @param data 控制命令数据
   */
  private handleControlCommand(socket: WebSocket, data: { command?: string }): void {
    const mainWin = mainWindow.getWin();
    if (!mainWin || mainWin.isDestroyed() || mainWin.webContents.isDestroyed()) {
      this.sendToClient(socket, {
        type: "error",
        data: { message: "应用程序未找到或已销毁" },
      });
      return;
    }

    const command = data?.command;
    if (!command) {
      this.sendToClient(socket, {
        type: "error",
        data: { message: "缺少 command 参数" },
      });
      return;
    }

    // 根据命令发送相应的 IPC 事件到渲染进程
    let ipcEvent: string | null = null;
    let commandName: string = "";

    switch (command) {
      case "toggle":
        ipcEvent = "playOrPause";
        commandName = "播放/暂停切换";
        break;
      case "play":
        ipcEvent = "play";
        commandName = "播放";
        break;
      case "pause":
        ipcEvent = "pause";
        commandName = "暂停";
        break;
      case "next":
        ipcEvent = "playNext";
        commandName = "下一曲";
        break;
      case "prev":
        ipcEvent = "playPrev";
        commandName = "上一曲";
        break;
      default:
        this.sendToClient(socket, {
          type: "error",
          data: { message: `未知的控制命令: ${command}` },
        });
        return;
    }

    // 发送 IPC 事件到渲染进程
    try {
      mainWin.webContents.send(ipcEvent);
      socketLog.log(`🎮 Control command executed: ${commandName} (${command})`);
      // 返回成功响应
      this.sendToClient(socket, {
        type: "control-response",
        data: {
          success: true,
          command,
          message: `${commandName}命令已执行`,
        },
      });
    } catch (error) {
      socketLog.error(`❌ Error executing control command ${command}:`, error);
      this.sendToClient(socket, {
        type: "error",
        data: { message: `执行${commandName}命令失败` },
      });
    }
  }

  /**
   * 发送欢迎消息给新连接的客户端
   * @param socket WebSocket 客户端连接
   */
  private sendWelcome(socket: WebSocket): void {
    // 检查服务是否已开启
    if (!this.isRunning() || !socket) return;

    const welcomeMessage = {
      type: "welcome",
      data: {
        message: "欢迎连接到 Kraken Player WebSocket 服务",
        timestamp: Date.now(),
      },
    };
    this.sendToClient(socket, welcomeMessage);
  }

  /**
   * 清理 WebSocket 服务
   */
  private cleanupServer(): void {
    this.wss = null;
    this.currentPort = null;
    this.clients.clear();
  }

  /**
   * 便于主进程调用自动启动
   */
  public static async tryAutoStart(): Promise<void> {
    const instance = SocketService.getInstance();
    await instance.tryAutoStart();
  }
}
