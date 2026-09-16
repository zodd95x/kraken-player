<template>
  <n-flex vertical size="large">
    <n-alert :show-icon="false" type="warning">
      {{ trSetting("如果您不确定此配置，请勿修改此值。") }}
    </n-alert>

    <n-text>
      {{ trSetting("请确保地址有效且包含") }} <span class="replace-part">%s</span> ({{
        trSetting("用于替换歌曲ID")
      }})
    </n-text>

    <n-input
      v-model:value="serverUrl"
      :status="inputStatus"
      :allow-input="noSideSpace"
      :placeholder="trSetting('请输入 AMLL TTML DB 地址')"
    />

    <n-text depth="3">
      {{ trSetting("更多信息请参阅仓库") }}
      <n-a @click="openLink('https://github.com/Steve-xmh/amll-ttml-db')"> AMLL TTML DB </n-a>
    </n-text>

    <n-flex justify="end">
      <n-button @click="props.onClose()">{{ trSetting("取消") }}</n-button>
      <n-button type="primary" @click="handleConfirm">{{ trSetting("确认") }}</n-button>
    </n-flex>
  </n-flex>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { isValidURL } from "@/utils/validate";
import { useSettingStore } from "@/stores";
import { openLink } from "@/utils/helper";
import { trSetting } from "@/utils/i18nSettings";

const props = defineProps<{ onClose: () => void }>();

const settingStore = useSettingStore();
const serverUrl = ref(settingStore.amllDbServer);
const inputStatus = ref<"success" | "error" | "warning">("success");

const noSideSpace = (value: string) => value.trim() === value;

const isValidServer = (url: string) => isValidURL(url) && url.includes("%s");

// 点击确认
const handleConfirm = async () => {
  const url = serverUrl.value;
  // 验证 URL 格式和 %s
  if (isValidServer(url)) {
    await window.api.store.set("amllDbServer", url);
    settingStore.amllDbServer = url;
    window.$message.success("Adresse AMLL TTML DB mise à jour");
    props.onClose();
  } else {
    window.$message.error("Veuillez saisir une URL valide contenant %s");
  }
};

// 输入变动时向输入框反馈
watch(serverUrl, (url: string) => {
  inputStatus.value = isValidServer(url) ? "success" : "error";
});
</script>

<style scoped lang="scss">
.servers-collapse {
  .n-card {
    cursor: pointer;
    &:hover {
      border-color: rgba(var(--primary), 0.58);
    }
  }
  .server-url {
    font-size: 12px;
    margin-top: 4px;
    padding: 4px 8px;
    background: var(--n-code-color);
    border-radius: 4px;
    word-break: break-all;

    :deep(.replace-part) {
      color: var(--n-color-target);
    }
  }
}

.replace-part {
  color: var(--n-color-target);
}
</style>
