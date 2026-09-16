import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    // Expose store API via preload
    contextBridge.exposeInMainWorld("api", {
      store: {
        get: (key: string) => ipcRenderer.invoke("store-get", key),
        set: (key: string, value: unknown) => ipcRenderer.invoke("store-set", key, value),
        has: (key: string) => ipcRenderer.invoke("store-has", key),
        delete: (key: string) => ipcRenderer.invoke("store-delete", key),
        reset: (keys?: string[]) => ipcRenderer.invoke("store-reset", keys),
        export: (data: any) => ipcRenderer.invoke("store-export", data),
        import: () => ipcRenderer.invoke("store-import"),
      },
      mcp: {
        getStatus: () => ipcRenderer.invoke("mcp:get-status"),
        restart: () => ipcRenderer.invoke("mcp:restart"),
        toggle: (enabled: boolean) => ipcRenderer.invoke("mcp:toggle", enabled),
        getClientConfigParams: () => ipcRenderer.invoke("mcp:get-client-config"),
        detectAgents: () => ipcRenderer.invoke("mcp:detect-agents"),
        injectAgentConfig: (agentId: string, params: any) =>
          ipcRenderer.invoke("mcp:inject-agent", agentId, params),
        onStatus: (callback: (status: any) => void) => {
          const subscription = (_event: any, value: any) => callback(value);
          ipcRenderer.on("mcp:status", subscription);
          return () => ipcRenderer.removeListener("mcp:status", subscription);
        },
      },
      spotify: {
        fetchText: (url: string) =>
          ipcRenderer.invoke("spotify-fetch", url) as Promise<
            { success: true; text: string } | { success: false; error: string }
          >,
      },
    });
    // Expose logger API via preload
    contextBridge.exposeInMainWorld("logger", {
      info: (message: string, ...args: unknown[]) =>
        ipcRenderer.send("renderer-log", "info", message, args),
      warn: (message: string, ...args: unknown[]) =>
        ipcRenderer.send("renderer-log", "warn", message, args),
      error: (message: string, ...args: unknown[]) =>
        ipcRenderer.send("renderer-log", "error", message, args),
      debug: (message: string, ...args: unknown[]) =>
        ipcRenderer.send("renderer-log", "debug", message, args),
    });
  } catch (error) {
    console.error(error);
  }
}
