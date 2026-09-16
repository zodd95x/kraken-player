<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> {{ trSetting("关于软件") }} </n-h3>
      <n-card class="set-item">
        <n-flex align="center" class="about">
          <Logo :size="26" />
          <n-text class="logo-name">Kraken Player</n-text>
          <n-tag v-if="statusStore.isDeveloperMode" size="small" type="warning" round> DEV </n-tag>
          <n-tag size="small" type="primary" round @click="openDeveloperMode">
            {{ packageJson.version }}
          </n-tag>
        </n-flex>
        <n-flex v-if="isElectron">
          <n-button type="primary" strong secondary @click="handleOpenLog">
            {{ trSetting("打开日志") }}
          </n-button>
        </n-flex>
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> {{ trSetting("特别鸣谢") }} </n-h3>
      <n-flex vertical :size="12" style="margin-bottom: 12px">
        <n-text :depth="3" style="margin-left: 4px; font-size: 12px" class="tip">
          {{ trSetting("注：以下排名不分先后") }}
        </n-text>
        <n-card
          v-for="(item, index) in specialContributors"
          :key="index"
          class="special-contributor-item"
          hoverable
        >
          <n-flex justify="space-between" align="center" :wrap="false">
            <n-flex align="center" style="flex: 1; min-width: 0">
              <n-avatar
                round
                :size="48"
                :src="item.avatar"
                fallback-src="/images/avatar.jpg?asset"
              />
              <n-flex vertical :gap="4" style="flex: 1; min-width: 0">
                <n-text class="name" strong>{{ item.name }}</n-text>
                <n-text class="tip" :depth="3">{{ item.description }}</n-text>
              </n-flex>
            </n-flex>
            <n-button secondary strong @click="openLink(item.url)">
              {{ trSetting(item.buttonText) }}
            </n-button>
          </n-flex>
        </n-card>
        <n-text class="tip" :depth="3" style="margin-left: 4px; font-size: 12px">
          {{ trSetting("……以及所有其他 SPlayer 贡献者") }}
        </n-text>
      </n-flex>
      <n-flex :size="12" class="link">
        <n-card
          v-for="(item, index) in contributors"
          :key="index"
          class="link-item"
          hoverable
          @click="openLink(item.url)"
        >
          <n-flex vertical :gap="4">
            <n-text class="name" strong> {{ item.name }} </n-text>
            <n-text class="tip" :depth="3" style="font-size: 12px">
              {{ item.description }}
            </n-text>
          </n-flex>
        </n-card>
      </n-flex>
      <n-text class="project-origin" :depth="3">
        {{
          trSetting(
            "Kraken Player 是基于 SPlayer 的独立项目。原项目由 imsyy 及 SPlayer 贡献者开发。",
          )
        }}
      </n-text>
    </div>
  </div>
</template>

<script setup lang="ts">
import { openLink } from "@/utils/helper";
import { useStatusStore } from "@/stores";
import { isElectron } from "@/utils/env";
import packageJson from "@/../package.json";
import { trSetting } from "@/utils/i18nSettings";

const statusStore = useStatusStore();

// 打开日志文件
const handleOpenLog = () => {
  window.electron.ipcRenderer.send("open-log-file");
};

// 开发者模式点击次数
const developerModeClickCount = ref(0);

// 特别鸣谢
const contributors = [
  {
    name: "NeteaseCloudMusicApiEnhanced",
    url: "https://github.com/neteasecloudmusicapienhanced/api-enhanced",
    description: "网易云音乐 API 备份 + 增强",
  },
  {
    name: "applemusic-like-lyrics",
    url: "https://github.com/Steve-xmh/applemusic-like-lyrics",
    description: "类 Apple Music 歌词显示组件库",
  },
  {
    name: "NeteaseCloudMusicApi",
    url: "https://github.com/Binaryify/NeteaseCloudMusicApi",
    description: "网易云音乐 API",
  },
  {
    name: "UnblockNeteaseMusic",
    url: "https://github.com/UnblockNeteaseMusic/server",
    description: "Revive unavailable songs for Netease Cloud Music",
  },
];

// 贡献人员列表
const specialContributors = [
  {
    name: "zodd95x",
    description: "Kraken Player 创始人及维护者",
    avatar: "/images/avatar/zodd95x.png",
    buttonText: "GitHub",
    url: "https://github.com/zodd95x/kraken-player",
  },
  {
    name: "imsyy",
    description: "每天在屎山和 PR 之间徘徊的作者",
    avatar: "/images/avatar/imsyy.webp",
    buttonText: "个人主页",
    url: "https://imsyy.top",
  },
  {
    name: "Kazukokawagawa 池鱼鱼！",
    description:
      "这里是什么？万能的池鱼！在开发过程中找出了一堆没人能想得到的诡异Bug，有非同寻常的Bug体质，可以用2天写完别人一个月commit",
    avatar: "/images/avatar/chiyu.webp",
    buttonText: "个人博客",
    url: "https://chiyu.it/",
  },
  {
    name: "MoYingJi",
    description: "这个人一点都不神秘，虽然写了一点，但就像什么都没有写",
    avatar: "/images/avatar/moyingji.webp",
    buttonText: "GitHub",
    url: "https://github.com/MoYingJi",
  },
  {
    name: "apoint123",
    description: "Rustacean",
    avatar: "/images/avatar/apoint123.webp",
    buttonText: "GitHub",
    url: "https://github.com/apoint123",
  },
];

// 打开开发者模式
const openDeveloperMode = useThrottleFn(() => {
  developerModeClickCount.value++;
  const isEnabled = statusStore.developerMode;
  if (developerModeClickCount.value >= 5 && developerModeClickCount.value < 8) {
    const action = isEnabled ? "关闭" : "开启";
    window.$message.info(`再点击${8 - developerModeClickCount.value}次以${action}开发者模式`);
  } else if (developerModeClickCount.value >= 8) {
    developerModeClickCount.value = 0;
    statusStore.developerMode = !isEnabled;
    if (!isEnabled) {
      window.$message.warning("开发者模式已开启，请谨慎使用！");
    } else {
      window.$message.success("开发者模式已关闭");
    }
  }
}, 100);
</script>

<style lang="scss" scoped>
.about {
  .logo-name {
    font-size: 16px;
  }
  .n-tag {
    border-radius: 6px;
  }
}
.project-origin {
  display: block;
  margin: 8px 4px 0;
  font-size: 12px;
}
.link {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 12px !important;
}
.link-item {
  border-radius: 8px;
  cursor: pointer;
  :deep(.n-card__content) {
    display: flex;
    padding: 12px;
  }
  .n-icon {
    margin-right: 6px;
  }
}
.special-contributor-item {
  border-radius: 8px;
  cursor: default;
  :deep(.n-card__content) {
    padding: 12px 16px;
  }
}
</style>
