<template>
  <div class="streaming-server-config">
    <n-form
      ref="formRef"
      :model="serverForm"
      :rules="formRules"
      label-placement="left"
      label-width="auto"
      require-mark-placement="right-hanging"
    >
      <n-form-item label="Type de service" path="type">
        <n-select
          v-model:value="serverForm.type"
          :options="serverTypeOptions"
          placeholder="Sélectionner le type de service"
        />
      </n-form-item>
      <n-form-item label="Nom du serveur" path="name">
        <n-input v-model:value="serverForm.name" placeholder="Ex : Ma Bibliothèque Musicale" />
      </n-form-item>
      <n-form-item label="Adresse du serveur" path="url">
        <n-input v-model:value="serverForm.url" placeholder="http://127.0.0.1:4533" />
      </n-form-item>
      <n-form-item label="Nom d'utilisateur" path="username">
        <n-input v-model:value="serverForm.username" placeholder="Entrez le nom d'utilisateur" />
      </n-form-item>
      <n-form-item label="Mot de passe" path="password">
        <n-input
          v-model:value="serverForm.password"
          type="password"
          show-password-on="click"
          placeholder="Entrez le mot de passe"
        />
      </n-form-item>
    </n-form>
    <n-flex justify="end" style="margin-top: 12px">
      <n-button @click="handleCancel">Annuler</n-button>
      <n-button type="primary" :loading="loading" @click="handleSave">
        {{ isEditing ? "Enregistrer" : "Ajouter" }}
      </n-button>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import type { StreamingServerConfig, StreamingServerType } from "@/types/streaming";
import type { FormInst, FormRules } from "naive-ui";

const props = defineProps<{
  server?: StreamingServerConfig | null;
}>();

const emit = defineEmits<{
  /** 保存成功 */
  save: [config: Omit<StreamingServerConfig, "id">];
  /** 取消 */
  cancel: [];
}>();

const loading = ref<boolean>(false);
const formRef = ref<FormInst | null>(null);
// 是否为编辑
const isEditing = computed(() => !!props.server);

// 服务器表单
const serverForm = reactive({
  type: "navidrome" as StreamingServerType,
  name: "",
  url: "",
  username: "",
  password: "",
});

// 服务器类型选项
const serverTypeOptions = [
  { label: "Navidrome", value: "navidrome" },
  { label: "Jellyfin", value: "jellyfin" },
  { label: "Emby", value: "emby" },
  { label: "Subsonic", value: "subsonic" },
  { label: "OpenSubsonic", value: "opensubsonic" },
];

// 表单验证规则
const formRules: FormRules = {
  type: { required: true, message: "Veuillez sélectionner le type de service", trigger: "change" },
  name: { required: true, message: "Veuillez entrer le nom du serveur", trigger: "blur" },
  url: { required: true, message: "Veuillez entrer l'adresse du serveur", trigger: "blur" },
  username: { required: true, message: "Veuillez entrer le nom d'utilisateur", trigger: "blur" },
  password: { required: true, message: "Veuillez entrer le mot de passe", trigger: "blur" },
};

// 用服务器数据填充表单
const fillForm = (server: StreamingServerConfig) => {
  serverForm.type = server.type;
  serverForm.name = server.name;
  serverForm.url = server.url;
  serverForm.username = server.username;
  serverForm.password = server.password;
};

// 保存
const handleSave = async () => {
  try {
    await formRef.value?.validate();
    loading.value = true;

    emit("save", {
      type: serverForm.type,
      name: serverForm.name,
      url: serverForm.url,
      username: serverForm.username,
      password: serverForm.password,
    });
  } catch {
    // 验证失败
  } finally {
    loading.value = false;
  }
};

// 取消
const handleCancel = () => emit("cancel");

// 监听服务器变化
watch(
  () => props.server,
  (server) => {
    if (server) {
      fillForm(server);
    }
  },
  { immediate: true },
);
</script>
