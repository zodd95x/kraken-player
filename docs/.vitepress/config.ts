import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Kraken Player",
  description: "A clean and simple music player",
  lang: "en-US",
  ignoreDeadLinks: true,
  head: [
    ["link", { rel: "icon", href: "/favicon.png" }],
    ["meta", { name: "author", content: "Kraken Player contributors" }],
    ["meta", { name: "keywords", content: "Kraken Player,music player,Electron,Vue3" }],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/favicon.png",
    siteTitle: "Kraken Player",
    nav: [
      { text: "Home", link: "/" },
      { text: "Download", link: "/download" },
      { text: "Guide", link: "/guide" },
      { text: "API", link: "/api" },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Download", link: "/download" },
          { text: "User guide", link: "/guide" },
          { text: "Streaming services", link: "/streaming" },
        ],
      },
      {
        text: "API",
        items: [
          { text: "HTTP API reference", link: "/api" },
          { text: "WebSocket API", link: "/socket" },
        ],
      },
      {
        text: "Development",
        items: [
          { text: "Native plugins", link: "/native" },
          { text: "Contributing", link: "/contributing" },
        ],
      },
      {
        text: "Troubleshooting",
        items: [
          { text: "Debug mode", link: "/troubleshooting/debug" },
          { text: "macOS FAQ", link: "/troubleshooting/macos" },
          { text: "Mac app shows as damaged", link: "/troubleshooting/macos-damaged" },
          { text: "API fails on macOS ARM", link: "/troubleshooting/macos-arm-api" },
          { text: "Windows 7 compatibility", link: "/troubleshooting/windows7" },
          { text: "Ubuntu sandbox failure", link: "/troubleshooting/ubuntu-sandbox" },
        ],
      },
    ],

    outline: {
      level: [2, 3],
      label: "On this page",
    },

    footer: {
      message: "Released under the AGPL-3.0 license",
      copyright: "Copyright © Kraken Player contributors",
    },

    lastUpdated: {
      text: "Last updated",
      formatOptions: {
        dateStyle: "short",
        timeStyle: "medium",
      },
    },
  },
});
