import { DialogApi, LoadingBarApi, MessageApi, ModalApi, NotificationApi } from "naive-ui";

declare global {
  interface Window {
    // naiveui
    $message: MessageApi;
    $dialog: DialogApi;
    $notification: NotificationApi;
    $loadingBar: LoadingBarApi;
    $modal: ModalApi;
    // electron
    api: {
      store: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: unknown) => Promise<boolean>;
        has: (key: string) => Promise<boolean>;
        delete: (key: string) => Promise<boolean>;
        reset: (keys?: string[]) => Promise<boolean>;
        export: (data: any) => Promise<{ success: boolean; path?: string; error?: string }>;
        import: () => Promise<{ success: boolean; data?: any; error?: string }>;
      };
      mcp: {
        getStatus: () => Promise<import("@shared").McpStatus>;
        restart: () => Promise<import("@shared").McpStatus>;
        toggle: (enabled: boolean) => Promise<import("@shared").McpStatus>;
        getClientConfigParams: () => Promise<import("@shared").McpClientConfigParams>;
        detectAgents: () => Promise<import("@shared").McpAgentApp[]>;
        injectAgentConfig: (
          agentId: string,
          params: import("@shared").McpClientConfigParams,
        ) => Promise<boolean>;
        onStatus: (callback: (status: import("@shared").McpStatus) => void) => () => void;
      };
      spotify: {
        fetchText: (
          url: string,
        ) => Promise<{ success: true; text: string } | { success: false; error: string }>;
      };
    };
    // logs
    logger: {
      info: (message: string, ...args: unknown[]) => void;
      warn: (message: string, ...args: unknown[]) => void;
      error: (message: string, ...args: unknown[]) => void;
      debug: (message: string, ...args: unknown[]) => void;
    };
  }
}
