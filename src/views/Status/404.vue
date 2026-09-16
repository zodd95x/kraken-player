<template>
  <n-result
    status="404"
    title="Page introuvable"
    description="Cette page n'existe pas ou a été déplacée"
  >
    <template #footer>
      <n-button type="primary" @click="router.go(-1)"> Retour </n-button>
    </template>
  </n-result>
</template>

<script setup lang="ts">
const router = useRouter();
</script>
