<template>
  <span
    class="kraken-logo"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="img"
    aria-label="Kraken Player"
  />
</template>

<script setup lang="ts">
defineProps({
  size: {
    type: Number,
    default: 36,
  },
});
</script>

<style lang="scss" scoped>
.kraken-logo {
  display: inline-block;
  flex: 0 0 auto;
  background-color: var(--primary-hex);
  mask: url("@/assets/icons/Kraken.png") center / contain no-repeat;
  -webkit-mask: url("@/assets/icons/Kraken.png") center / contain no-repeat;
}
</style>
