import { useSettingStore } from "@/stores";
import { isElectron } from "@/utils/env";
import { SettingConfig } from "@/types/settings";
import { computed, ref, h, markRaw } from "vue";
import { debounce } from "lodash-es";
import { NA } from "naive-ui";
import { getAuthToken, getAuthUrl, getSession } from "@/api/lastfm";
import StreamingServerList from "../components/StreamingServerList.vue";

export const useNetworkSettings = (): SettingConfig => {
  const settingStore = useSettingStore();
  const testProxyLoading = ref<boolean>(false);

  // --- Network Proxy Logic (from other.ts) ---
  const proxyConfig = computed(() => ({
    protocol: settingStore.proxyProtocol,
    server: settingStore.proxyServe,
    port: settingStore.proxyPort,
  }));

  const setProxy = debounce(() => {
    if (
      settingStore.proxyProtocol === "off" ||
      !settingStore.proxyServe ||
      !settingStore.proxyPort
    ) {
      window.electron.ipcRenderer.send("remove-proxy");
      window.$message.success("成功关闭网络代理");
      return;
    }
    window.electron.ipcRenderer.send("set-proxy", proxyConfig.value);
    window.$message.success("网络代理配置完成，请重启软件");
  }, 300);

  const testProxy = async () => {
    testProxyLoading.value = true;
    const result = await window.electron.ipcRenderer.invoke("test-proxy", proxyConfig.value);
    if (result) {
      window.$message.success("该代理可正常使用");
    } else {
      window.$message.error("代理测试失败，请重试");
    }
    testProxyLoading.value = false;
  };

  // --- WebSocket Logic (from third.ts) ---
  const socketPort = ref(25885);
  const socketEnabled = ref(false);
  const socketPortSaved = ref<number | null>(null);

  const initSocketConfig = async () => {
    if (!isElectron) return;
    const wsOptions = await window.api.store.get("websocket");
    const portFromStore = wsOptions?.port ?? 25885;
    socketPort.value = portFromStore;
    socketPortSaved.value = portFromStore;
    socketEnabled.value = wsOptions?.enabled ?? false;
  };

  const saveSocketConfig = async () => {
    if (!isElectron) return;
    await window.api.store.set("websocket", {
      enabled: socketEnabled.value,
      port: socketPort.value,
    });
  };

  const handleSocketEnabledUpdate = async (value: boolean) => {
    if (!isElectron) {
      socketEnabled.value = value;
      await saveSocketConfig();
      return;
    }
    if (value) {
      if (socketPort.value !== socketPortSaved.value) {
        window.$message.warning("请先测试并保存端口配置后再启用 WebSocket");
        return;
      }
      const result = await window.electron.ipcRenderer.invoke("socket-start");
      if (result?.success) {
        socketEnabled.value = true;
        await saveSocketConfig();
        window.$message.success("WebSocket 服务已启动");
      } else {
        window.$message.error(result?.message ?? "WebSocket 启动失败");
        socketEnabled.value = false;
      }
    } else {
      const result = await window.electron.ipcRenderer.invoke("socket-stop");
      if (result?.success) {
        socketEnabled.value = false;
        await saveSocketConfig();
        window.$message.success("WebSocket 服务已关闭");
      } else {
        window.$message.error(result?.message ?? "WebSocket 关闭失败");
        socketEnabled.value = true;
      }
    }
  };

  const testSocketPort = async () => {
    if (!isElectron) return;
    if (!socketPort.value) {
      window.$message.error("请输入端口号");
      return;
    }
    try {
      const result = await window.electron.ipcRenderer.invoke("socket-test-port", socketPort.value);
      if (result?.success) {
        await saveSocketConfig();
        socketPortSaved.value = socketPort.value;
        window.$message.success("已保存 WebSocket 配置");
      } else {
        window.$message.error(result?.message ?? "该端口不可用，请更换端口");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Last.fm Logic (from third.ts) ---
  const lastfmAuthLoading = ref(false);

  const connectLastfm = async () => {
    try {
      lastfmAuthLoading.value = true;
      const tokenResponse = await getAuthToken();
      if (!tokenResponse.token) throw new Error("无法获取认证令牌");
      const token = tokenResponse.token;
      const authUrl = getAuthUrl(token);

      if (typeof window !== "undefined") {
        const authWindow = window.open(authUrl, "_blank", "width=800,height=600");
        const checkAuth = setInterval(async () => {
          if (authWindow?.closed) {
            clearInterval(checkAuth);
            if (lastfmAuthLoading.value) {
              lastfmAuthLoading.value = false;
              window.$message.warning("授权已取消");
            }
            return;
          }
          try {
            const sessionResponse = await getSession(token);
            if (sessionResponse.session) {
              clearInterval(checkAuth);
              authWindow?.close();
              settingStore.lastfm.sessionKey = sessionResponse.session.key;
              settingStore.lastfm.username = sessionResponse.session.name;
              window.$message.success(`已成功连接到 Last.fm 账号: ${sessionResponse.session.name}`);
              lastfmAuthLoading.value = false;
            }
          } catch {
            // 用户还未授权，继续等待
          }
        }, 2000);

        setTimeout(() => {
          clearInterval(checkAuth);
          if (lastfmAuthLoading.value) {
            lastfmAuthLoading.value = false;
            window.$message.warning("授权超时，请重试");
          }
        }, 30000);
      }
    } catch (error: any) {
      console.error("Last.fm 连接失败:", error);
      window.$message.error(`连接失败: ${error.message || "未知错误"}`);
      lastfmAuthLoading.value = false;
    }
  };

  const disconnectLastfm = () => {
    window.$dialog.warning({
      title: "断开连接",
      content: "确定要断开与 Last.fm 的连接吗？",
      positiveText: "确定",
      negativeText: "取消",
      onPositiveClick: () => {
        settingStore.lastfm.sessionKey = "";
        settingStore.lastfm.username = "";
        window.$message.success("已断开与 Last.fm 的连接");
      },
    });
  };

  const onActivate = () => {
    initSocketConfig();
  };

  return {
    onActivate,
    groups: [
      {
        title: "流媒体服务",
        items: [
          {
            key: "streamingEnabled",
            label: "启用流媒体",
            type: "switch",
            description: "开启后可使用并管理 Navidrome、Jellyfin 等流媒体服务",
            value: computed({
              get: () => settingStore.streamingEnabled,
              set: (v) => (settingStore.streamingEnabled = v),
            }),
          },
          {
            key: "serverList",
            label: "服务器管理",
            type: "custom",
            description: "在此添加和管理您的流媒体服务器",
            noWrapper: true,
            component: markRaw(StreamingServerList),
          },
        ],
      },
      {
        title: "网络代理",
        items: [
          {
            key: "proxyProtocol",
            label: "网络代理",
            show: isElectron,
            type: "select",
            description: "修改后请点击保存或重启软件以应用",
            options: [
              { label: "关闭代理", value: "off" },
              { label: "HTTP 代理", value: "HTTP" },
              { label: "HTTPS 代理", value: "HTTPS" },
            ],
            value: computed({
              get: () => settingStore.proxyProtocol,
              set: (v) => (settingStore.proxyProtocol = v),
            }),
            extraButton: {
              label: "保存并应用",
              action: setProxy,
              type: "primary",
              secondary: true,
              strong: true,
            },
          },
          {
            key: "proxyServe",
            label: "代理服务器地址",
            show: isElectron,
            type: "text-input",
            description: "请填写代理服务器地址，如 127.0.0.1",
            disabled: computed(() => settingStore.proxyProtocol === "off"),
            prefix: computed(() =>
              settingStore.proxyProtocol === "off" ? "-" : settingStore.proxyProtocol,
            ),
            componentProps: {
              placeholder: "请填写代理服务器地址",
            },
            value: computed({
              get: () => settingStore.proxyServe,
              set: (v) => (settingStore.proxyServe = v),
            }),
          },
          {
            key: "proxyPort",
            label: "代理服务器端口",
            show: isElectron,
            type: "input-number",
            description: "请填写代理服务器端口，如 80",
            disabled: computed(() => settingStore.proxyProtocol === "off"),
            componentProps: {
              min: 1,
              max: 65535,
              showButton: false,
              placeholder: "请填写代理服务器端口",
            },
            value: computed({
              get: () => settingStore.proxyPort,
              set: (v) => (settingStore.proxyPort = v),
            }),
          },
          {
            key: "proxyTest",
            label: "测试代理",
            show: isElectron,
            type: "button",
            description: "测试代理配置是否可正常连通",
            buttonLabel: "测试代理",
            action: testProxy,
            condition: () => settingStore.proxyProtocol !== "off",
            componentProps: computed(() => ({
              loading: testProxyLoading.value,
              type: "primary",
            })),
          },
          {
            key: "useRealIP",
            label: "使用真实 IP 地址",
            type: "switch",
            description: "在海外或部分地区可能会受到限制，可开启此处尝试解决",
            value: computed({
              get: () => settingStore.useRealIP,
              set: (v) => (settingStore.useRealIP = v),
            }),
          },
          {
            key: "realIP",
            label: "真实 IP 地址",
            type: "text-input",
            description: "可在此处输入国内 IP，不填写则为随机",
            disabled: computed(() => !settingStore.useRealIP),
            prefix: "IP",
            componentProps: { placeholder: "127.0.0.1" },
            value: computed({
              get: () => settingStore.realIP,
              set: (v) => (settingStore.realIP = v),
            }),
          },
        ],
      },
      {
        title: "第三方集成",
        items: [
          {
            key: "smtcOpen",
            label: isElectron ? "开启系统音频集成" : "开启浏览器媒体会话",
            type: "switch",
            description: isElectron
              ? "与系统集成以显示媒体元数据，支持高清封面显示"
              : "向浏览器发送 Media Session 媒体元数据",
            value: computed({
              get: () => settingStore.smtcOpen,
              set: (v) => (settingStore.smtcOpen = v),
            }),
          },
          {
            key: "lastfm_enabled",
            label: "启用 Last.fm",
            type: "switch",
            description: "开启后可记录播放历史到 Last.fm",
            value: computed({
              get: () => settingStore.lastfm.enabled,
              set: (v) => (settingStore.lastfm.enabled = v),
            }),
            children: [
              {
                key: "lastfm_apikey",
                label: "API Key",
                type: "text-input",
                description: () => {
                  const lang = settingStore.language || "en";
                  if (lang === "en") {
                    return h("div", null, [
                      h("div", null, [
                        "Obtain from ",
                        h(
                          NA,
                          {
                            href: "https://www.last.fm/api/account/create",
                            target: "_blank",
                          },
                          { default: () => "Create Last.fm Application" },
                        ),
                        "; only Application Name is required",
                      ]),
                      h("div", null, [
                        "If already created, view it at ",
                        h(
                          NA,
                          {
                            href: "https://www.last.fm/api/accounts",
                            target: "_blank",
                          },
                          { default: () => "Last.fm API Applications" },
                        ),
                      ]),
                    ]);
                  }
                  if (lang === "zh") {
                    return h("div", null, [
                      h("div", null, [
                        "在 ",
                        h(
                          NA,
                          {
                            href: "https://www.last.fm/zh/api/account/create",
                            target: "_blank",
                          },
                          { default: () => "Last.fm 创建应用" },
                        ),
                        " 获取，只有「程序名称」是必要的",
                      ]),
                      h("div", null, [
                        "如果已经创建过，则可以在 ",
                        h(
                          NA,
                          {
                            href: "https://www.last.fm/zh/api/accounts",
                            target: "_blank",
                          },
                          { default: () => "Last.fm API 应用程序" },
                        ),
                        " 处查看",
                      ]),
                    ]);
                  }
                  return h("div", null, [
                    h("div", null, [
                      "Obtenez-la sur ",
                      h(
                        NA,
                        {
                          href: "https://www.last.fm/api/account/create",
                          target: "_blank",
                        },
                        { default: () => "Créer une application Last.fm" },
                      ),
                      ", seul le nom de l'application est requis",
                    ]),
                    h("div", null, [
                      "Si vous l'avez déjà créée, consultez ",
                      h(
                        NA,
                        {
                          href: "https://www.last.fm/api/accounts",
                          target: "_blank",
                        },
                        { default: () => "Applications API Last.fm" },
                      ),
                    ]),
                  ]);
                },
                value: computed({
                  get: () => settingStore.lastfm.apiKey,
                  set: (v) => (settingStore.lastfm.apiKey = v),
                }),
              },
              {
                key: "lastfm_secret",
                label: "API Secret",
                type: "text-input",
                description: "Shared Secret，用于签名验证",
                componentProps: { type: "password", showPasswordOn: "click" },
                value: computed({
                  get: () => settingStore.lastfm.apiSecret,
                  set: (v) => (settingStore.lastfm.apiSecret = v),
                }),
              },
              {
                key: "lastfm_connect",
                label: computed(() =>
                  !settingStore.lastfm.sessionKey ? "连接 Last.fm 账号" : "已连接账号",
                ),
                type: "button",
                description: computed(() =>
                  !settingStore.lastfm.sessionKey
                    ? "首次使用需要授权连接"
                    : settingStore.lastfm.username,
                ),
                buttonLabel: computed(() =>
                  !settingStore.lastfm.sessionKey ? "连接账号" : "断开连接",
                ),
                action: () =>
                  !settingStore.lastfm.sessionKey ? connectLastfm() : disconnectLastfm(),
                componentProps: computed(() =>
                  !settingStore.lastfm.sessionKey
                    ? {
                        type: "primary",
                        loading: lastfmAuthLoading.value,
                        disabled: !settingStore.isLastfmConfigured,
                      }
                    : { type: "error" },
                ),
              },
              {
                key: "lastfm_scrobble",
                label: "Scrobble（播放记录）",
                type: "switch",
                description: "自动记录播放历史到 Last.fm",
                condition: () => !!settingStore.lastfm.sessionKey,
                value: computed({
                  get: () => settingStore.lastfm.scrobbleEnabled,
                  set: (v) => (settingStore.lastfm.scrobbleEnabled = v),
                }),
              },
              {
                key: "lastfm_nowplaying",
                label: "正在播放状态",
                type: "switch",
                description: "向 Last.fm 同步正在播放的歌曲",
                condition: () => !!settingStore.lastfm.sessionKey,
                value: computed({
                  get: () => settingStore.lastfm.nowPlayingEnabled,
                  set: (v) => (settingStore.lastfm.nowPlayingEnabled = v),
                }),
              },
            ],
          },
        ],
      },
      {
        title: "WebSocket 配置",
        show: isElectron,
        items: [
          {
            key: "socket_enabled",
            label: "启用 WebSocket",
            type: "switch",
            description: "开启后可通过 WebSocket 获取状态或控制播放器",
            value: computed({
              get: () => socketEnabled.value,
              set: (v) => handleSocketEnabledUpdate(v),
            }),
          },
          {
            key: "socket_port",
            label: "WebSocket 端口",
            type: "input-number",
            description: "更改后需要测试并保存才能生效",
            componentProps: { min: 1, max: 65535, showButton: false, placeholder: "请输入端口号" },
            disabled: computed(() => socketEnabled.value),
            value: computed({
              get: () => socketPort.value,
              set: (v) => (socketPort.value = v || 25885),
            }),
          },
          {
            key: "socket_test",
            label: "测试端口配置",
            type: "button",
            buttonLabel: "测试并保存",
            show: computed(() => socketPort.value !== socketPortSaved.value),
            action: testSocketPort,
            componentProps: { type: "primary" },
          },
        ],
      },
    ],
  };
};
