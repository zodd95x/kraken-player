// 歌单标题本地化映射，重复键以后者为准
import { useSettingStore } from "@/stores";

// 知名网易云官方/精选策展人本地化映射
const CREATOR_DICT_EN: Record<string, string> = {
  云音乐欧美星球: "NetEase International Pop",
  云音乐热点君: "NetEase Music Trends",
  云音乐官方歌单: "NetEase Official",
  云音乐RnB星球: "NetEase R&B",
  云村专属推荐: "NetEase Daily Picks",
  云音乐艺人精选: "Artist Spotlight",
  云音乐ACG音乐榜: "NetEase ACG & Anime",
  云音乐摇滚星球: "NetEase Rock",
  云音乐说唱星球: "NetEase Hip-Hop & Rap",
  云音乐民谣星球: "NetEase Folk & Acoustic",
  云音乐电音星球: "NetEase EDM & Dance",
  云音乐古典星球: "NetEase Classical",
  云音乐流行星球: "NetEase Pop Hits",
  网易云音乐: "NetEase Music",
  云音乐小秘书: "NetEase Assistant",
  "NetEase 全球热歌": "NetEase Global Hits",
  全球热歌: "Global Hits",
};

const CREATOR_DICT_FR: Record<string, string> = {
  云音乐欧美星球: "Pop Internationale",
  云音乐热点君: "Tendances Musicales",
  云音乐官方歌单: "Sélection Officielle",
  云音乐RnB星球: "R&B International",
  云村专属推荐: "Sélection Spéciale",
  云音乐艺人精选: "Sélection Artistes",
  云音乐ACG音乐榜: "Hits ACG & Anime",
  云音乐摇滚星球: "Rock International",
  云音乐说唱星球: "Hip-Hop International",
  云音乐民谣星球: "Folk & Acoustique",
  云音乐电音星球: "Électro & Club",
  云音乐古典星球: "Musique Classique",
  云音乐流行星球: "Pop Mondiale",
  网易云音乐: "NetEase Music",
  云音乐小秘书: "Assistant NetEase",
  "NetEase 全球热歌": "Hits Mondiaux NetEase",
  全球热歌: "Hits Mondiaux",
};

// 热门歌单标题精准映射
const PLAYLIST_DICT_EN: Record<string, string> = {
  "网络请求超时，请检查网络连接": "Network request timed out, please check your connection",
  网络请求超时: "Network request timed out",
  请检查网络连接: "Please check your network connection",
  美国Billboard榜: "Billboard Hot 100",
  UK排行榜周榜: "UK Official Singles Chart",
  "法国 NRJ Vos Hits 周榜": "France NRJ Vos Hits",
  网易云欧美热歌榜: "Top International Hits",
  网易云欧美新歌榜: "New International Releases",
  "欧美R&B榜": "International R&B Top Hits",
  网易云全球说唱榜: "Global Hip-Hop & Rap",
  网易云电音榜: "EDM & Electronic Dance",
  网易云古典榜: "Classical Music Hits",
  网易云摇滚榜: "Rock & Alternative",
  网易云民谣榜: "Folk & Acoustic",
  "俄罗斯top hit流行音乐榜": "Top Hit Russia Pop Chart",
  日本Oricon榜: "Japan Oricon Chart",
  飙升榜: "Fast Rising Chart",
  新歌榜: "New Songs Chart",
  原创榜: "Original Indie Chart",
  热歌榜: "Top Popular Hits",
  网易云ACG榜: "Anime & Gaming Soundtracks",
  网易云韩语榜: "K-Pop Chart",
  网易云日语榜: "J-Pop Chart",
  实时分享榜: "Trending Social Shares",
  潮流风向榜: "Viral Music Trends",
  "宝藏集结地 | 好听不火的冷门小众单曲": "Hidden Gems | Underrated Indie Singles",
  宝藏集结地: "Hidden Gems & Indie Picks",
  好听不火的冷门小众单曲: "Underrated Indie Singles",
  "Sad 2000s | 千禧年代的心碎点滴": "Sad 2000s | 2000s Heartbreak Nostalgia",
  "R&B舒适沐浴 | 沉溺于氤氲水汽": "Chill R&B Bath | Warm Relaxing Vibes",
  "咖啡店BGM精选 | 超放松欧美节奏 营造轻松氛围":
    "Coffee Shop Chill BGM | Relaxing International Beats",
  "咖啡店BGM精选 | 超放松欧美节奏 营造...": "Coffee Shop Chill BGM | Relaxing International Beats",
  "R&B孤独时刻 | 当R&B成为深夜唯一的听众": "Late Night R&B | Midnight Solitude",
  "回忆里的旋律依然动听 | E.T.": "Timeless Melodies | Katy Perry - E.T. & Classics",
  "听·Sia热门精选|Titanium": "Sia Essentials | Titanium & Top Hits",
  "60年代欧美热播 | 与Neil Diamond共赴196...": "60s International Hits | Neil Diamond Classics",
  "60年代欧美热播": "60s International Golden Hits",
  "唤醒多巴胺 | 元气满格 解锁活力欧美模式": "Dopamine Pop Boost | High Energy International Beats",
  "夏日拉丁热歌精选 | 异域色彩点燃热辣夏日": "Summer Latin Hits | Hot Tropical Heat",
  "RNB新歌到 | Victoria Monét, Lucky Daye等...": "New R&B Arrivals | Victoria Monét, Lucky Daye",
  "R&B入耳即醉 | 陷的浪漫旋律": "Intoxicating R&B | Romantic Smooth Melodies",
  "90s 欧美金曲": "90s International Golden Classics",
  欧美金曲: "International Golden Hits",
  云音乐欧美热歌榜: "Top International Hits Chart",
  云音乐欧美新歌榜: "New International Releases Chart",
  Billboard热歌榜: "Billboard Hot 100",
  英国UK榜: "UK Official Singles Chart",
  "法国 NRJ Vos Hits": "France NRJ Vos Hits",
  Beatport全球电子舞曲榜: "Beatport Global Dance Chart",
  云音乐热歌榜: "Top Trending Hits Chart",
  云音乐新歌榜: "New Releases Chart",
  云音乐飙升榜: "Fast Rising Trending Chart",
  原创音乐榜: "Original Music Chart",
  KTV唛榜: "Karaoke Top Hits",
  iTunes榜: "iTunes Top 100",
  Spotify全球榜: "Spotify Global Top 50",
  "Apple Music全球榜": "Apple Music Global Top 100",
};

const PLAYLIST_DICT_FR: Record<string, string> = {
  "网络请求超时，请检查网络连接":
    "Délai de requête réseau dépassé, veuillez vérifier votre connexion",
  网络请求超时: "Délai de requête réseau dépassé",
  请检查网络连接: "Veuillez vérifier votre connexion réseau",
  美国Billboard榜: "Billboard Hot 100 US",
  UK排行榜周榜: "Classement Officiel UK",
  "法国 NRJ Vos Hits 周榜": "France NRJ Vos Hits",
  网易云欧美热歌榜: "Top Hits Internationaux",
  网易云欧美新歌榜: "Nouveautés Internationales",
  "欧美R&B榜": "R&B International",
  网易云全球说唱榜: "Hip-Hop & Rap Mondial",
  网易云电音榜: "Électro & Clubbing",
  网易云古典榜: "Musique Classique",
  网易云摇滚榜: "Rock & Alternatif",
  网易云民谣榜: "Folk & Acoustique",
  "俄罗斯top hit流行音乐榜": "Top Hit Russie Pop",
  日本Oricon榜: "Classement Oricon Japon",
  飙升榜: "Titres en Forte Progression",
  新歌榜: "Nouveaux Titres",
  原创榜: "Compositions Originales",
  热歌榜: "Grands Hits du Moment",
  网易云ACG榜: "Bandes Originales Anime & Jeux",
  网易云韩语榜: "Classement K-Pop",
  网易云日语榜: "Classement J-Pop",
  实时分享榜: "Tendances Partages",
  潮流风向榜: "Tendances Virales",
  "宝藏集结地 | 好听不火的冷门小众单曲": "Pépites Cachées | Singles Indé Méconnus",
  宝藏集结地: "Pépites Cachées & Indé",
  好听不火的冷门小众单曲: "Singles Indé Méconnus",
  "Sad 2000s | 千禧年代的心碎点滴": "Sad 2000s | Nostalgie des Années 2000",
  "R&B舒适沐浴 | 沉溺于氤氲水汽": "Bain R&B Relaxant | Douceur & Vapeur",
  "咖啡店BGM精选 | 超放松欧美节奏 营造轻松氛围": "Café & Détente BGM | Rythmes Doux et Relaxants",
  "咖啡店BGM精选 | 超放松欧美节奏 营造...": "Café & Détente BGM | Rythmes Doux et Relaxants",
  "R&B孤独时刻 | 当R&B成为深夜唯一的听众": "R&B Nocturne | Moments de Solitude",
  "回忆里的旋律依然动听 | E.T.": "Mélodies Intemporelles | Katy Perry - E.T. & Hits",
  "听·Sia热门精选|Titanium": "L'Essentiel de Sia | Titanium & Meilleurs Titres",
  "60年代欧美热播 | 与Neil Diamond共赴196...": "Hits Internationaux des Années 60 | Neil Diamond",
  "60年代欧美热播": "Grands Hits Internationaux des Années 60",
  "唤醒多巴胺 | 元气满格 解锁活力欧美模式": "Boost Dopamine | Énergie & Hits Internationaux",
  "夏日拉丁热歌精选 | 异域色彩点燃热辣夏日": "Hits Latino d'Été | Chaleur Tropicale",
  "RNB新歌到 | Victoria Monét, Lucky Daye等...": "Nouveautés R&B | Victoria Monét, Lucky Daye",
  "R&B入耳即醉 | 陷的浪漫旋律": "R&B Envoûtant | Mélodies Douces & Romantiques",
  "90s 欧美金曲": "Classiques Internationaux des Années 90",
  欧美金曲: "Grands Classiques Internationaux",
  云音乐欧美热歌榜: "Classement des Hits Internationaux",
  云音乐欧美新歌榜: "Nouveautés Internationales",
  Billboard热歌榜: "Billboard Hot 100",
  英国UK榜: "Classement Officiel UK",
  "法国 NRJ Vos Hits": "France NRJ Vos Hits",
  Beatport全球电子舞曲榜: "Beatport Global Dance",
  云音乐热歌榜: "Hits du Moment",
  云音乐新歌榜: "Nouveaux Titres",
  云音乐飙升榜: "Titres en Forte Tendance",
  原创音乐榜: "Musique Originale",
  KTV唛榜: "Hits Karaoké",
  iTunes榜: "iTunes Top 100",
  Spotify全球榜: "Spotify Top 50 Monde",
  "Apple Music全球榜": "Apple Music Top 100 Monde",
};

// 常见音乐风格/词汇替换规则
const PHRASE_REPLACEMENTS_EN: [RegExp, string][] = [
  [/欧美/g, "International"],
  [/精选/g, "Essentials"],
  [/热歌/g, "Top Hits"],
  [/新歌/g, "New Releases"],
  [/经典/g, "Classics"],
  [/金曲/g, "Golden Hits"],
  [/宝藏/g, "Hidden Gems"],
  [/冷门小众/g, "Underrated Indie"],
  [/小众/g, "Indie"],
  [/单曲/g, "Tracks"],
  [/舒适/g, "Chill"],
  [/沐浴/g, "Bath Session"],
  [/咖啡店|咖啡馆/g, "Coffee Shop"],
  [/孤独时刻/g, "Late Night Solitude"],
  [/回忆里的旋律依然动听/g, "Timeless Nostalgic Melodies"],
  [/多巴胺/g, "Dopamine Energy"],
  [/夏日/g, "Summer"],
  [/拉丁/g, "Latin"],
  [/入耳即醉/g, "Smooth & Intoxicating"],
  [/浪漫旋律/g, "Romantic Melodies"],
  [/流行/g, "Pop"],
  [/摇滚/g, "Rock"],
  [/说唱/g, "Hip-Hop"],
  [/民谣/g, "Acoustic Folk"],
  [/电音|电子/g, "Electronic & EDM"],
  [/纯音乐|轻音乐/g, "Instrumental"],
  [/放松/g, "Relax"],
  [/元气满格/g, "Full Energy"],
  [/解锁活力/g, "High Energy"],
  [/异域色彩/g, "Tropical Vibes"],
  [/点燃热辣/g, "Hot Summer"],
  [/千禧年代/g, "2000s Era"],
  [/心碎点滴/g, "Heartbreak Memories"],
  [/沉溺于氤氲水汽/g, "Warm Steam Chill"],
  [/超放松/g, "Ultra Relaxing"],
  [/节奏/g, "Beats"],
  [/营造轻松氛围/g, "Relaxing Atmosphere"],
  [/营造/g, "Vibes"],
  [/当R&B成为深夜唯一的听众/g, "Midnight R&B Solitude"],
  [/深夜/g, "Late Night"],
  [/听·/g, ""],
  [/共赴/g, "with "],
  [/集结地/g, "Collection"],
  [/热播/g, "Hits"],
  [/年代/g, "s "],
];

const PHRASE_REPLACEMENTS_FR: [RegExp, string][] = [
  [/欧美/g, "Internationale"],
  [/精选/g, "Sélection"],
  [/热歌/g, "Grands Hits"],
  [/新歌/g, "Nouveautés"],
  [/经典/g, "Classiques"],
  [/金曲/g, "Hits d'Or"],
  [/宝藏/g, "Pépites"],
  [/冷门小众/g, "Indé Méconnu"],
  [/小众/g, "Indé"],
  [/单曲/g, "Titres"],
  [/舒适/g, "Doux"],
  [/沐浴/g, "Bain & Détente"],
  [/咖啡店|咖啡馆/g, "Café & Détente"],
  [/孤独时刻/g, "Solitude Nocturne"],
  [/回忆里的旋律依然动听/g, "Mélodies Intemporelles"],
  [/多巴胺/g, "Dopamine & Énergie"],
  [/夏日/g, "Été"],
  [/拉丁/g, "Latino"],
  [/入耳即醉/g, "Envoûtant & Doux"],
  [/浪漫旋律/g, "Mélodies Romantiques"],
  [/流行/g, "Pop"],
  [/摇滚/g, "Rock"],
  [/说唱/g, "Hip-Hop"],
  [/民谣/g, "Folk Acoustique"],
  [/电音|电子/g, "Électro"],
  [/纯音乐|轻音乐/g, "Instrumental"],
  [/放松/g, "Relax"],
  [/元气满格/g, "Plein d'Énergie"],
  [/解锁活力/g, "Énergie & Vitalité"],
  [/异域色彩/g, "Ambiance Tropicale"],
  [/点燃热辣/g, "Chaleur d'Été"],
  [/千禧年代/g, "Années 2000"],
  [/心碎点滴/g, "Nostalgie"],
  [/沉溺于氤氲水汽/g, "Douceur & Vapeur"],
  [/超放松/g, "Ultra Relaxant"],
  [/节奏/g, "Rythmes"],
  [/营造轻松氛围/g, "Ambiance Apaisante"],
  [/营造/g, "Ambiance"],
  [/当R&B成为深夜唯一的听众/g, "R&B au Cœur de la Nuit"],
  [/深夜/g, "Nocturne"],
  [/听·/g, ""],
  [/共赴/g, "avec "],
  [/集结地/g, "Sélection"],
  [/热播/g, "Hits"],
  [/年代/g, "s "],
];

/**
 * 本地化歌单或封面标题
 */
export const localizePlaylistTitle = (title: string): string => {
  if (!title) return "";
  const settingStore = useSettingStore();
  const lang = settingStore.language || "zh";
  if (lang === "zh") return title;

  const trimmed = title.trim();

  // 1. 精确字典匹配
  if (lang === "en" && PLAYLIST_DICT_EN[trimmed]) return PLAYLIST_DICT_EN[trimmed];
  if (lang === "fr" && PLAYLIST_DICT_FR[trimmed]) return PLAYLIST_DICT_FR[trimmed];

  // 2. 如果不含中文字符，直接返回
  if (!/[\u4e00-\u9fa5]/.test(trimmed)) {
    return trimmed;
  }

  // 3. 处理带分隔符的复合标题，优先纯拉丁片段
  const delimiters = [" | ", "|", "｜", " - ", " — ", "：", ":"];
  for (const delim of delimiters) {
    if (trimmed.includes(delim)) {
      const parts = trimmed
        .split(delim)
        .map((p) => p.trim())
        .filter(Boolean);
      // 纯拉丁片段（无中文），取最长者
      const pureLatin = parts.filter((p) => !/[\u4e00-\u9fa5]/.test(p) && /[a-zA-Z]{2,}/.test(p));
      if (pureLatin.length > 0) {
        const best = pureLatin.sort((a, b) => b.length - a.length)[0];
        if (best.length >= 3) return best;
      }
      const latinParts = parts.filter((p) => /[a-zA-Z]{2,}/.test(p));
      const chineseParts = parts.filter((p) => /[\u4e00-\u9fa5]/.test(p));

      if (latinParts.length > 0 && chineseParts.length > 0) {
        const primaryLatin = latinParts.join(" - ");
        if (primaryLatin.length >= 5 && !chineseParts.some((c) => c.length > 15)) {
          const translatedSubs = chineseParts
            .map((c) => localizePlaylistTitle(c))
            .filter((c) => !/[\u4e00-\u9fa5]/.test(c));
          if (translatedSubs.length > 0) {
            return `${primaryLatin} | ${translatedSubs.join(" - ")}`;
          }
          return primaryLatin;
        }
      }
    }
  }

  // 4. 模式和关键词智能替换
  let result = trimmed;
  const replacements = lang === "fr" ? PHRASE_REPLACEMENTS_FR : PHRASE_REPLACEMENTS_EN;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  // 清除残余标点与首尾分隔符
  const stripEdges = (s: string): string =>
    s
      .replace(/[【】「」『』]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^[\s|｜\-—:：]+/, "")
      .replace(/[\s|｜\-—:：]+$/, "")
      .trim();
  result = stripEdges(result);

  // 避免生硬残余字符
  if (/[\u4e00-\u9fa5]/.test(result)) {
    const cleaned = stripEdges(result.replace(/[\u4e00-\u9fa5]/g, " "));
    if (cleaned.length >= 3) {
      return cleaned;
    }
    return lang === "fr" ? "Sélection Spéciale" : "Featured Playlist";
  }

  return result || (lang === "fr" ? "Sélection Spéciale" : "Featured Playlist");
};

/**
 * 本地化歌单创建者名称
 */
export const localizeCreatorName = (creator: any): string => {
  if (!creator) return "";
  const name = typeof creator === "string" ? creator : creator.name || "";
  if (!name) return "";

  const settingStore = useSettingStore();
  const lang = settingStore.language || "zh";
  if (lang === "zh") return name;

  const trimmed = name.trim();

  // 1. 精准策展人匹配
  if (lang === "en" && CREATOR_DICT_EN[trimmed]) return CREATOR_DICT_EN[trimmed];
  if (lang === "fr" && CREATOR_DICT_FR[trimmed]) return CREATOR_DICT_FR[trimmed];

  // 2. 如果不含中文字符，直接返回
  if (!/[\u4e00-\u9fa5]/.test(trimmed)) {
    return trimmed;
  }

  // 3. 常见网易云官方前缀处理，避免残留中文
  if (trimmed.startsWith("云音乐")) {
    const sub = trimmed
      .replace("云音乐", "")
      .replace(/[\u4e00-\u9fa5]/g, "")
      .trim();
    if (sub) return lang === "fr" ? `Sélection ${sub}` : `NetEase ${sub}`;
    return lang === "fr" ? "Sélection NetEase" : "NetEase Curator";
  }

  // 4. NetEase 前缀 + 中文后缀，避免原文透出
  if (/^NetEase\s+/i.test(trimmed)) {
    const sub = trimmed
      .replace(/^NetEase\s+/i, "")
      .replace(/[\u4e00-\u9fa5]/g, "")
      .trim();
    if (sub && /[a-zA-Z]{2,}/.test(sub)) return `NetEase ${sub}`;
    return lang === "fr" ? "Curateur NetEase" : "NetEase Curator";
  }

  return lang === "fr" ? "Curateur NetEase" : "NetEase Curator";
};
