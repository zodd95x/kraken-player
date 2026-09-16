<template>
  <div class="create-playlist">
    <!-- 在线歌单表单 -->
    <template v-if="!isLocal">
      <n-form ref="onlineFormRef" :model="onlineFormData" :rules="onlineFormRules">
        <n-form-item label="Nom de la playlist" path="name">
          <n-input v-model:value="onlineFormData.name" placeholder="Entrez le nom de la playlist" />
        </n-form-item>
        <n-form-item label="Type de playlist" path="type">
          <n-select v-model:value="onlineFormData.type" :options="onlinePlaylistType" />
        </n-form-item>
        <n-form-item label="Playlist privée" path="privacy" label-placement="left">
          <n-switch v-model:value="onlineFormData.privacy" />
        </n-form-item>
      </n-form>
    </template>
    <!-- 本地歌单表单 -->
    <template v-else>
      <n-form ref="localFormRef" :model="localFormData" :rules="localFormRules">
        <n-form-item label="Nom de la playlist" path="name">
          <n-input v-model:value="localFormData.name" placeholder="Entrez le nom de la playlist" />
        </n-form-item>
        <n-form-item label="Description" path="description">
          <n-input
            v-model:value="localFormData.description"
            type="textarea"
            placeholder="Entrez une description (optionnel)"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
        </n-form-item>
      </n-form>
    </template>
    <n-button class="create" type="primary" @click="toCreatePlaylist"> Créer </n-button>
  </div>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui";
import { useDataStore, useLocalStore } from "@/stores";
import { textRule } from "@/utils/rules";
import { debounce } from "lodash-es";
import { createPlaylist } from "@/api/playlist";
import { updateUserLikePlaylist } from "@/utils/auth";

const props = withDefaults(
  defineProps<{
    /** 是否为本地歌单模式 */
    isLocal?: boolean;
  }>(),
  { isLocal: true },
);

const emit = defineEmits<{ close: [] }>();

// 表单类型
interface OnlineFormType {
  name: string;
  type: "NORMAL" | "VIDEO" | "SHARED";
  privacy?: boolean;
}

interface LocalFormType {
  name: string;
  description?: string;
}

const dataStore = useDataStore();
const localStore = useLocalStore();

// 在线歌单数据
const onlineFormRef = ref<FormInst | null>(null);
const onlineFormData = ref<OnlineFormType>({ name: "", type: "NORMAL", privacy: false });
const onlineFormRules: FormRules = { name: textRule };

// 本地歌单数据
const localFormRef = ref<FormInst | null>(null);
const localFormData = ref<LocalFormType>({ name: "", description: "" });
const localFormRules: FormRules = { name: textRule };

// 在线歌单类型
const onlinePlaylistType: SelectOption[] = [
  {
    label: "Playlist standard",
    value: "NORMAL",
  },
  {
    label: "Playlist vidéo",
    disabled: true,
    value: "VIDEO",
  },
  {
    label: "Playlist partagée",
    disabled: true,
    value: "SHARED",
  },
];

// 新建歌单
const toCreatePlaylist = debounce(
  async (e: MouseEvent) => {
    e.preventDefault();
    if (!props.isLocal) {
      // 在线歌单
      await onlineFormRef.value?.validate((errors) => errors);
      const result = await createPlaylist(
        onlineFormData.value.name,
        onlineFormData.value.privacy,
        onlineFormData.value.type,
      );
      if (result.code === 200) {
        emit("close");
        window.$message.success("Playlist créée avec succès");
        if (dataStore.userData.createdPlaylistCount) {
          dataStore.userData.createdPlaylistCount++;
        }
        await updateUserLikePlaylist();
      } else {
        window.$message.error(
          result.message || "Échec de la création de la playlist, veuillez réessayer",
        );
      }
    } else {
      // 本地歌单
      try {
        await localFormRef.value?.validate();
        await localStore.createLocalPlaylist(
          localFormData.value.name,
          localFormData.value.description,
        );
        emit("close");
        window.$message.success("Playlist créée avec succès");
      } catch (error) {
        if (error) {
          // 验证失败，不做处理
          return;
        }
        window.$message.error("Échec de la création de la playlist, veuillez réessayer");
      }
    }
  },
  300,
  { leading: true, trailing: false },
);
</script>

<style lang="scss" scoped>
.create-playlist {
  .n-form {
    margin-top: 12px;
  }
  .create {
    width: 100%;
  }
  .n-empty {
    padding: 40px 0;
  }
}
</style>
