<template>
  <n-result
    status="403"
    title="Accès refusé"
    description="Vous n'avez pas l'autorisation d'accéder à cette page"
  >
    <template #footer>
      <n-button type="primary" @click="router.go(-1)"> Retour </n-button>
    </template>
  </n-result>
</template>

<script setup lang="ts">
const router = useRouter();
</script>
