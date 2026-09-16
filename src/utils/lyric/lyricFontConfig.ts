import { useSettingStore } from "@/stores";

export interface LyricFontConfig {
  name: string;
  keySetting: "LyricFont" | "japaneseLyricFont" | "englishLyricFont" | "koreanLyricFont";
  default: string;
  tip: string;
}

export interface LyricLangFontConfig extends LyricFontConfig {
  keyCss: string;
}

export const lyricLangFontConfigs: LyricLangFontConfig[] = [
  {
    name: "Police des paroles anglaises",
    keySetting: "englishLyricFont",
    keyCss: "--en-font-family",
    default: "follow",
    tip: "Police spécifique utilisée lorsque les paroles contiennent de l'anglais",
  },
  {
    name: "Police des paroles japonaises",
    keySetting: "japaneseLyricFont",
    keyCss: "--ja-font-family",
    default: "follow",
    tip: "Police spécifique utilisée lorsque les paroles contiennent du japonais",
  },
  {
    name: "Police des paroles coréennes",
    keySetting: "koreanLyricFont",
    keyCss: "--ko-font-family",
    default: "follow",
    tip: "Police spécifique utilisée lorsque les paroles contiennent du coréen",
  },
];

export const lyricFontConfigs: LyricFontConfig[] = [
  {
    name: "Police de la zone des paroles",
    keySetting: "LyricFont",
    default: "follow",
    tip: "Police de base pour la zone principale des paroles",
  },
  ...lyricLangFontConfigs,
];

export const lyricLangFontStyle = (settingStore = useSettingStore()) => {
  return Object.fromEntries(
    lyricLangFontConfigs.map((c) => {
      const settingValue = settingStore[c.keySetting];
      return [c.keyCss, settingValue !== c.default ? settingValue : ""];
    }),
  );
};
