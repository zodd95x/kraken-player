import { createI18n } from "vue-i18n";
import fr from "@/locales/fr.json";
import en from "@/locales/en.json";
import zh from "@/locales/zh.json";

// 读取存储的语言设置
const savedSetting = localStorage.getItem("setting-store");
let defaultLang = "en";
if (savedSetting) {
  try {
    const parsed = JSON.parse(savedSetting);
    if (parsed.language) defaultLang = parsed.language;
  } catch {
    // 默认英语
  }
}

const i18n = createI18n({
  legacy: false,
  locale: defaultLang,
  fallbackLocale: defaultLang === "zh" ? "zh" : defaultLang === "fr" ? "fr" : "en",
  messages: {
    fr,
    en,
    zh,
  },
});

export default i18n;
