// @neteasecloudmusicapienhanced/api 部分内部模块未导出类型声明，此处补充

// generateConfig：注册匿名 token 并获取 xeapi 公钥
declare module "@neteasecloudmusicapienhanced/api/generateConfig.js" {
  const generateConfig: () => Promise<void>;
  export default generateConfig;
}

// server.js：服务层导出
declare module "@neteasecloudmusicapienhanced/api/server.js" {
  const serverModule: Record<string, unknown>;
  export default serverModule;
}
