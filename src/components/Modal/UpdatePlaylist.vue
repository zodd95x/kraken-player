<template>
  <div class="update-playlist">
    <n-form ref="updateFormRef" :model="updateFormData" :rules="updateFormRules">
      <n-form-item label="Nom de la playlist" path="name">
        <n-input
          v-model:value="updateFormData.name"
          :disabled="isLiked"
          placeholder="Entrez le nom de la playlist"
        />
      </n-form-item>
      <n-form-item label="Description" path="desc">
        <n-input
          v-model:value="updateFormData.desc"
          :autosize="{
            minRows: 3,
            maxRows: 6,
          }"
          :maxlength="800"
          placeholder="Entrez la description de la playlist"
          type="textarea"
          show-count
          clearable
        />
      </n-form-item>
      <n-form-item v-if="!isLocal" label="Catégories" path="tags">
        <n-select
          v-model:value="updateFormData.tags"
          :options="tagList"
          placeholder="Sélectionnez des tags"
          filterable
          multiple
          @update:value="checkTags"
        />
      </n-form-item>
    </n-form>
    <n-button class="create" type="primary" @click="toUpdatePlaylist"> Modifier </n-button>
  </div>
</template>

<script setup lang="ts">
import type { CoverType } from "@/types/main";
import type { FormInst, FormRules, SelectOption } from "naive-ui";
import { textRule } from "@/utils/rules";
import { useDataStore, useLocalStore } from "@/stores";
import { debounce, isEmpty, size } from "lodash-es";
import { updatePlaylist } from "@/api/playlist";
import { updateUserLikePlaylist } from "@/utils/auth";

// 表单类型
interface UpdateFormType {
  name: string;
  desc?: string;
  tags?: string[];
}

const props = defineProps<{
  id: number;
  data: CoverType;
  /** 是否为本地歌单 */
  isLocal?: boolean;
}>();

const emit = defineEmits<{ success: [] }>();

const dataStore = useDataStore();
const localStore = useLocalStore();

// 是否为我喜欢
const isLiked = computed(() => dataStore.userLikeData.playlists?.[0]?.id === props.id);

// 表单数据
const updateFormRef = ref<FormInst | null>(null);
const updateFormData = ref<UpdateFormType>({
  name: isLiked.value ? "Titres likés" : props.data.name,
  desc: props.data.description,
  tags: props.data.tags,
});
const updateFormRules: FormRules = { name: textRule };

// 歌单分类数据
const tagList = computed<SelectOption[]>(() => {
  if (isEmpty(dataStore.catData?.cats)) return [];
  return Object.keys(dataStore.catData?.type).map((key) => ({
    type: "group",
    key,
    label: dataStore.catData?.type[key],
    children: dataStore.catData?.cats
      ?.filter((cat) => cat.category === Number(key))
      .map((cat) => ({
        label: cat.name,
        value: cat.name,
      })),
  }));
});

// 检查标签
const checkTags = (tags: string[]) => {
  if (size(tags) > 3) {
    updateFormData.value.tags = tags.slice(0, 3);
    window.$message.warning("Vous ne pouvez sélectionner que 3 tags au maximum");
  }
};

// 更新歌单
const toUpdatePlaylist = debounce(
  async (e: MouseEvent) => {
    e.preventDefault();
    // 是否输入
    await updateFormRef.value?.validate((errors) => errors);

    // 本地歌单
    if (props.isLocal) {
      const success = await localStore.updateLocalPlaylist(props.id, {
        name: updateFormData.value.name,
        description: updateFormData.value.desc,
      });
      if (success) {
        emit("success");
        window.$message.success("Playlist locale modifiée avec succès");
      } else {
        window.$message.error("Échec de la modification de la playlist locale");
      }
      return;
    }

    // 在线歌单
    const result = await updatePlaylist(
      props.id,
      updateFormData.value.name,
      updateFormData.value.desc ?? "",
      updateFormData.value.tags ?? [],
    );
    if (result.code === 200) {
      emit("success");
      window.$message.success("Playlist modifiée avec succès");
      await updateUserLikePlaylist();
    } else {
      window.$message.error(result.message || "Échec de la modification, veuillez réessayer");
    }
  },
  300,
  { leading: true, trailing: false },
);

onMounted(() => dataStore.getPlaylistCatList());
</script>

<style lang="scss" scoped>
.update-playlist {
  .create {
    width: 100%;
  }
}
</style>
