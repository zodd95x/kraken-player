<!-- 侧边栏 -->
<template>
  <div class="sider-all">
    <!-- Logo -->
    <div :class="['logo', { collapsed: statusStore.menuCollapsed }]" @click="router.push('/')">
      <Logo :size="54" />
      <div class="brand-name">
        <span class="brand-name-main">Kraken</span>
        <span class="brand-name-sub">Player</span>
      </div>
    </div>
    <n-scrollbar
      :style="{
        maxHeight: `calc(100vh - ${musicStore.isHasPlayer && statusStore.showPlayBar ? 150 : 70}px)`,
      }"
    >
      <Menu />
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { useStatusStore, useMusicStore } from "@/stores";

const router = useRouter();
const musicStore = useMusicStore();
const statusStore = useStatusStore();
</script>

<style lang="scss" scoped>
.sider-all {
  display: flex;
  flex-direction: column;
  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 82px;
    padding: 0 1rem;
    cursor: pointer;
    .brand-name {
      position: relative;
      width: 112px;
      height: 46px;
      margin-left: 8px;
      overflow: hidden;
      transition:
        width 0.3s,
        opacity 0.3s,
        margin 0.3s;

      .brand-name-main {
        display: block;
        color: var(--n-text-color);
        font-family: "Pirata One", serif;
        font-size: 29px;
        line-height: 34px;
      }

      .brand-name-sub {
        position: absolute;
        right: 2px;
        bottom: 2px;
        color: var(--primary-hex);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.16em;
        line-height: 1;
        text-transform: uppercase;
      }
    }
    &.collapsed {
      .brand-name {
        width: 0;
        opacity: 0;
        margin-left: 0;
      }
    }
  }
}
</style>
