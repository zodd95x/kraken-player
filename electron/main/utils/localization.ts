type MainLanguage = "en" | "fr" | "zh";

const messages = {
  chooseFolder: {
    en: "Choose folder",
    fr: "Choisir un dossier",
    zh: "选择文件夹",
  },
  exportSettings: {
    en: "Export settings",
    fr: "Exporter les paramètres",
    zh: "导出设置",
  },
  importSettings: {
    en: "Import settings",
    fr: "Importer les paramètres",
    zh: "导入设置",
  },
} as const;

let currentLanguage: MainLanguage = "en";

export const setMainLanguage = (language: string): void => {
  currentLanguage = language === "fr" || language === "zh" ? language : "en";
};

export const getMainText = (key: keyof typeof messages): string => messages[key][currentLanguage];
