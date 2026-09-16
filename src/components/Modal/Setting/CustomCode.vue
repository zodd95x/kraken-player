<template>
  <n-scrollbar style="max-height: 70vh" class="custom-code">
    <n-alert type="error" title="Avertissement de sécurité">
      L'injection de code peut entraîner des dysfonctionnements de l'application (affichage altéré,
      anomalies, instabilités). À utiliser avec précaution !<br />
      N'insérez jamais de code non vérifié provenant de tiers. Du code malveillant peut compromettre
      vos données ou faire planter l'application.
    </n-alert>
    <div class="code-section">
      <n-h3 prefix="bar">CSS personnalisé</n-h3>
      <n-text :depth="3">
        Le style CSS sera injecté directement dans les pages de l'application
      </n-text>
      <n-input
        v-model:value="customCss"
        :autosize="{ minRows: 6, maxRows: 12 }"
        type="textarea"
        placeholder="/* Votre code CSS personnalisé */"
        style="font-family: monospace"
      />
    </div>
    <div class="code-section">
      <n-h3 prefix="bar">JavaScript personnalisé</n-h3>
      <n-text :depth="3">
        Le code JavaScript sera exécuté au démarrage de l'application (actif après redémarrage)
      </n-text>
      <n-input
        v-model:value="customJs"
        :autosize="{ minRows: 6, maxRows: 12 }"
        type="textarea"
        placeholder="// Votre code JavaScript personnalisé"
        style="font-family: monospace"
      />
    </div>
    <n-flex justify="end" style="margin-top: 16px">
      <n-button type="primary" strong @click="saveCode">Enregistrer</n-button>
    </n-flex>
  </n-scrollbar>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";

const settingStore = useSettingStore();

// 本地编辑状态
const customCss = ref(settingStore.customCss);
const customJs = ref(settingStore.customJs);

// 保存代码
const saveCode = () => {
  settingStore.customCss = customCss.value;
  settingStore.customJs = customJs.value;
  window.$message.success("Code personnalisé enregistré");
};

watch(
  () => settingStore.customCss,
  (val) => (customCss.value = val),
);
watch(
  () => settingStore.customJs,
  (val) => (customJs.value = val),
);
</script>

<style lang="scss" scoped>
.custom-code {
  .n-alert {
    margin-bottom: 16px;
  }
  .n-h3 {
    margin-bottom: 12px;
  }
  .n-text {
    display: block;
    margin-bottom: 8px;
  }
  .code-section {
    margin-bottom: 20px;
    &:last-of-type {
      margin-bottom: 0;
    }
  }
}
</style>
