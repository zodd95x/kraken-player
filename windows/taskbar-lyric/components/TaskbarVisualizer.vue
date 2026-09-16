<script setup lang="ts">
import { TASKBAR_IPC_CHANNELS, TASKBAR_SPECTRUM_BARS, type SpectrumPayload } from "@shared";

const props = defineProps<{
  playing: boolean;
  theme: "light" | "dark";
  // 封面主题色（无色时回退白/灰）
  color?: string | null;
}>();

// 画布引用
const canvasRef = ref<HTMLCanvasElement | null>(null);
// 真实频谱目标值（无虚假正弦动画）
const target = ref<number[]>(new Array(TASKBAR_SPECTRUM_BARS).fill(0));
// 包络值（快攻慢放，贴近真实频谱观感）
const envelope = new Array(TASKBAR_SPECTRUM_BARS).fill(0);
let lastSpectrumAt = 0;
let rafId: number | null = null;
let lastDraw = 0;

// 接收主窗口转发的真实频谱
const onSpectrum = (_event: unknown, data: SpectrumPayload): void => {
  if (!Array.isArray(data) || data.length === 0) return;
  const next = new Array(TASKBAR_SPECTRUM_BARS).fill(0);
  for (let i = 0; i < TASKBAR_SPECTRUM_BARS; i++) {
    const v = data[i] ?? 0;
    next[i] = Math.max(0, Math.min(255, v));
  }
  target.value = next;
  lastSpectrumAt = performance.now();
};

// 绘制柱状条（仅真实数据 + 包络衰减，无呼吸假动画）
const draw = (now: number): void => {
  rafId = requestAnimationFrame(draw);
  // 限制约 30fps
  if (now - lastDraw < 33) return;
  lastDraw = now;
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 高分屏清晰度
  const dpr = window.devicePixelRatio || 1;
  const cssW = 96;
  const cssH = 30;
  if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = cssW;
  const h = cssH;
  ctx.clearRect(0, 0, w, h);
  // 主题色优先，回退任务栏明暗
  ctx.fillStyle =
    props.color ?? (props.theme === "light" ? "rgba(26,26,26,0.72)" : "rgba(255,255,255,0.85)");

  const hasRecent = now - lastSpectrumAt < 500 && props.playing;
  const n = TASKBAR_SPECTRUM_BARS;
  // 参考截图：窄柱 + 小间隙
  const gap = 3;
  const barW = (w - gap * (n - 1)) / n;
  // 参考截图：高柱，几乎顶满画布
  const maxH = h - 2;
  const minH = 3;

  for (let i = 0; i < n; i++) {
    // 有真实数据时归一化 + 轻提亮弱信号，无数据时目标为 0（指数过大柱体全部顶满）
    const raw = hasRecent ? (target.value[i] ?? 0) / 255 : 0;
    const goal = hasRecent ? Math.pow(raw, 0.65) : 0;
    const cur = envelope[i] ?? 0;
    // 快攻慢放：跟手但不粘顶，弱拍能回落
    const rate = goal > cur ? 0.6 : 0.3;
    const next = cur + (goal - cur) * rate;
    envelope[i] = next;
    const bh = Math.max(minH, next * maxH);
    const x = i * (barW + gap);
    // 底部对齐
    const y = h - bh;
    // 顶部圆角、底部直角（贴近参考截图）
    const r = Math.min(barW / 2, 2.5);
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + barW - r, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
    ctx.lineTo(x + barW, h);
    ctx.closePath();
    ctx.fill();
  }
};

onMounted(() => {
  const ipc = window.electron?.ipcRenderer;
  ipc?.on(TASKBAR_IPC_CHANNELS.SYNC_SPECTRUM, onSpectrum);
  rafId = requestAnimationFrame(draw);
});

onBeforeUnmount(() => {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
  window.electron?.ipcRenderer.removeListener(TASKBAR_IPC_CHANNELS.SYNC_SPECTRUM, onSpectrum);
});
</script>

<template>
  <canvas ref="canvasRef" class="visualizer" :data-playing="playing" width="96" height="30" />
</template>

<style scoped>
.visualizer {
  flex: 0 0 auto;
  width: 96px;
  height: 30px;
  opacity: 0.92;
  color: inherit;
}
.visualizer[data-playing="false"] {
  opacity: 0.35;
}
</style>
