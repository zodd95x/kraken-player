<template>
  <n-result
    status="500"
    title="Erreur serveur"
    description="Une erreur est survenue, veuillez réessayer ultérieurement"
  >
    <template #footer>
      <n-button type="primary" @click="router.go(0)"> Recharger </n-button>
    </template>
  </n-result>
</template>

<script setup lang="ts">
const router = useRouter();
</script>
