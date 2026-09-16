<template>
  <div class="country-select-dropdown" :class="{ 'is-open': isOpen }">
    <!-- 胶囊触发按钮 -->
    <div class="country-pill" :class="{ active: isOpen }" @click.stop="toggleOpen">
      <div class="pill-content">
        <SvgIcon name="Earth" :size="16" class="earth-icon" />
        <span class="country-name text-hidden">{{ currentCountryName }}</span>
        <span class="country-code">{{ modelValue }}</span>
      </div>
      <SvgIcon
        name="DropDown"
        :size="16"
        class="dropdown-arrow"
        :class="{ 'rotate-180': isOpen }"
      />
    </div>

    <!-- 全屏磨砂模糊背景遮罩 -->
    <Transition name="fade">
      <div v-if="isOpen" class="country-mask" @click.stop="closeDropdown" />
    </Transition>

    <!-- 下拉面板长卡片 (采用搜索栏深色长面板风格) -->
    <Transition name="fadeDown">
      <n-card
        v-if="isOpen"
        class="country-dropdown-panel"
        content-style="padding: 12px 14px;"
        :bordered="false"
        @click.stop
        @wheel="handlePanelWheel"
      >
        <!-- 顶部搜索框 -->
        <div class="panel-search">
          <n-input
            ref="searchInputRef"
            v-model:value="searchQuery"
            round
            clearable
            size="small"
            :placeholder="searchPlaceholder"
          >
            <template #prefix>
              <SvgIcon name="Search" :size="16" />
            </template>
          </n-input>
        </div>

        <n-scrollbar class="panel-scroll" style="max-height: 380px">
          <!-- 热门国家标签区 -->
          <div v-if="!searchQuery.trim()" class="section-group popular-group">
            <div class="section-title">
              <SvgIcon name="Fire" :size="15" />
              <n-text depth="3" class="title-text">{{ popularTitle }}</n-text>
            </div>
            <n-flex size="small" class="tags-container">
              <n-tag
                v-for="item in popularCountries"
                :key="item.code"
                round
                :bordered="false"
                :type="modelValue === item.code ? 'primary' : 'default'"
                class="popular-tag"
                @click="selectCountry(item.code)"
              >
                {{ item.name }}
              </n-tag>
            </n-flex>
          </div>

          <!-- 全部国家列表 -->
          <div class="section-group all-group">
            <div class="section-title">
              <SvgIcon name="Earth" :size="15" />
              <n-text depth="3" class="title-text">
                {{ allCountriesTitle }} ({{ filteredCountries.length }})
              </n-text>
            </div>
            <div class="country-list">
              <div
                v-for="country in filteredCountries"
                :key="country.code"
                class="country-item"
                :class="{ active: modelValue === country.code }"
                @click="selectCountry(country.code)"
              >
                <div class="item-info">
                  <span class="country-badge">{{ country.code }}</span>
                  <span class="item-name">{{ country.name }}</span>
                </div>
                <SvgIcon
                  v-if="modelValue === country.code"
                  name="Check"
                  :size="16"
                  class="check-icon"
                />
              </div>

              <!-- 无匹配结果 -->
              <div v-if="filteredCountries.length === 0" class="empty-state">
                <n-text depth="3">{{ emptyText }}</n-text>
              </div>
            </div>
          </div>
        </n-scrollbar>
      </n-card>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useSettingStore } from "@/stores";
import { getFormattedWorldCountries, getCountryNameByCode } from "@/constants/countries";
import SvgIcon from "@/components/Global/SvgIcon.vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    popularCodes?: string[];
  }>(),
  {
    popularCodes: () => ["FR", "US", "GB", "CA", "BE", "CH", "DE", "ES", "IT", "CN"],
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  change: [value: string];
}>();

const settingStore = useSettingStore();
const isOpen = ref<boolean>(false);
const searchQuery = ref<string>("");
const searchInputRef = ref<any>(null);

// 国际化文本
const searchPlaceholder = computed(() => {
  if (settingStore.language === "zh") return "搜索国家或地区...";
  if (settingStore.language === "en") return "Search a country...";
  return "Rechercher un pays...";
});

const popularTitle = computed(() => {
  if (settingStore.language === "zh") return "热门国家";
  if (settingStore.language === "en") return "Popular Countries";
  return "Pays populaires";
});

const allCountriesTitle = computed(() => {
  if (settingStore.language === "zh") return "所有国家与地区";
  if (settingStore.language === "en") return "All Countries";
  return "Tous les pays";
});

const emptyText = computed(() => {
  if (settingStore.language === "zh") return "未找到匹配国家";
  if (settingStore.language === "en") return "No country found";
  return "Aucun pays trouvé";
});

// 当前国家名称
const currentCountryName = computed(() => {
  return (
    getCountryNameByCode(props.modelValue, settingStore.language) || props.modelValue || "France"
  );
});

// 全球国家列表
const allCountries = computed(() => {
  return getFormattedWorldCountries(settingStore.language);
});

// 热门国家列表
const popularCountries = computed(() => {
  const codes = props.popularCodes;
  return codes
    .map((code) => allCountries.value.find((c) => c.code === code))
    .filter(Boolean) as Array<{ code: string; name: string; flag: string }>;
});

// 筛选后的国家列表
const filteredCountries = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return allCountries.value;
  return allCountries.value.filter(
    (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
  );
});

const handlePanelWheel = (event: WheelEvent) => {
  event.stopPropagation();
  const scrollContainer = (event.target as HTMLElement).closest(".n-scrollbar-container");
  if (!scrollContainer) return;

  const reachedTop = scrollContainer.scrollTop <= 0;
  const reachedBottom =
    Math.ceil(scrollContainer.scrollTop + scrollContainer.clientHeight) >=
    scrollContainer.scrollHeight;

  if ((event.deltaY < 0 && reachedTop) || (event.deltaY > 0 && reachedBottom)) {
    event.preventDefault();
  }
};

// 切换下拉框显示状态
const toggleOpen = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    nextTick(() => {
      searchInputRef.value?.focus();
    });
  } else {
    searchQuery.value = "";
  }
};

// 关闭下拉面板
const closeDropdown = () => {
  isOpen.value = false;
  searchQuery.value = "";
};

// 选中指定国家
const selectCountry = (code: string) => {
  emit("update:modelValue", code);
  emit("change", code);
  closeDropdown();
};
</script>

<style lang="scss" scoped>
.country-select-dropdown {
  position: relative;
  z-index: 10;

  &.is-open {
    z-index: 101;
  }

  .country-pill {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 145px;
    height: 34px;
    padding: 0 10px;
    border-radius: 50px;
    background-color: var(--n-color, rgba(255, 255, 255, 0.08));
    border: 1px solid var(--n-border-color, rgba(255, 255, 255, 0.15));
    cursor: pointer;
    transition: all 0.25s ease;
    user-select: none;
    position: relative;
    z-index: 101;

    &:hover {
      border-color: var(--primary-color);
      background-color: var(--n-color-hover, rgba(255, 255, 255, 0.12));
    }

    &.active {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px rgba(var(--primary-rgb, 239, 68, 68), 0.2);
    }
    .pill-content {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;
      flex: 1;

      .earth-icon {
        color: var(--primary-color);
        flex-shrink: 0;
      }

      .country-name {
        font-size: 13px;
        font-weight: 500;
        line-height: 1;
      }

      .country-code {
        font-size: 10px;
        opacity: 0.6;
        font-family: monospace;
        font-weight: bold;
        flex-shrink: 0;
      }
    }

    .dropdown-arrow {
      flex-shrink: 0;
      margin-left: 4px;
      opacity: 0.7;
      transition: transform 0.25s ease;

      &.rotate-180 {
        transform: rotate(180deg);
      }
    }
  }

  .country-mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 100;
    background-color: #00000040;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    -webkit-app-region: no-drag;
    cursor: default;
  }

  .country-dropdown-panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 320px;
    border-radius: 14px;
    z-index: 101;
    background-color: var(--modal-color, #18181c);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);

    .panel-search {
      margin-bottom: 12px;
    }

    // 列表滚动到底/顶时不带动背后页面（防滚进空白）
    .panel-scroll {
      overscroll-behavior: contain;
      overscroll-behavior-y: contain;

      :deep(.n-scrollbar-container) {
        overscroll-behavior: contain;
        overscroll-behavior-y: contain;
      }
    }

    .section-group {
      margin-bottom: 16px;

      &:last-child {
        margin-bottom: 0;
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 600;

        .title-text {
          font-size: 12px;
        }
      }
    }

    .popular-group {
      .tags-container {
        .popular-tag {
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            opacity: 0.85;
            transform: translateY(-1px);
          }
        }
      }
    }

    .all-group {
      .country-list {
        .country-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border-radius: 8px;
          margin-bottom: 4px;
          cursor: pointer;
          transition:
            background-color 0.2s ease,
            color 0.2s ease;

          &:hover {
            background-color: rgba(var(--primary, 239, 68, 68), 0.12);
          }

          &.active {
            background-color: rgba(var(--primary, 239, 68, 68), 0.18);
            color: var(--primary-color);
            font-weight: 600;

            .country-badge {
              background-color: var(--primary-color);
              color: #fff;
            }
          }

          .item-info {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            overflow: hidden;

            .country-badge {
              font-size: 10px;
              font-weight: 700;
              font-family: monospace;
              padding: 2px 6px;
              border-radius: 4px;
              background-color: rgba(255, 255, 255, 0.08);
              flex-shrink: 0;
              letter-spacing: 0.5px;
            }

            .item-name {
              font-size: 13px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }

          .check-icon {
            color: var(--primary-color);
            flex-shrink: 0;
          }
        }

        .empty-state {
          padding: 24px 0;
          text-align: center;
          font-size: 13px;
        }
      }
    }
  }
}
</style>
