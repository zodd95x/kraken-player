/**
 * MCP 服务状态
 */
export interface McpStatus {
  /** 是否处于监听状态 */
  listening: boolean;
  /** 当前监听端口 */
  port: number | null;
  /** 错误信息 */
  error: { code: string; message: string } | null;
}

/**
 * MCP 客户端配置参数
 */
export interface McpClientConfigParams {
  /** 服务端口 */
  port: number;
  /** 访问密钥 */
  accessKey: string;
}

/**
 * 检测到的 AI 客户端应用信息
 */
export interface McpAgentApp {
  /** 客户端唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 配置文件路径 */
  configPath: string;
  /** 是否已配置 */
  configured: boolean;
  /** 是否支持自动注入配置 */
  injectable: boolean;
}
