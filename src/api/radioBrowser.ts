// Radio Browser API 客户端
import axios from "axios";

// 广播电台接口类型
export interface RadioStation {
  changeuuid: string;
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  votes: number;
  codec: string;
  bitrate: number;
  clickcount: number;
}

// 常用国家列表配置
export interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

export const POPULAR_COUNTRIES: CountryOption[] = [
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "US", name: "États-Unis", flag: "🇺🇸" },
  { code: "GB", name: "Royaume-Uni", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "BE", name: "Belgique", flag: "🇧🇪" },
  { code: "CH", name: "Suisse", flag: "🇨🇭" },
  { code: "DE", name: "Allemagne", flag: "🇩🇪" },
  { code: "ES", name: "Espagne", flag: "🇪🇸" },
  { code: "IT", name: "Italie", flag: "🇮🇹" },
  { code: "CN", name: "Chine", flag: "🇨🇳" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "NL", name: "Pays-Bas", flag: "🇳🇱" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "CD", name: "RD Congo", flag: "🇨🇩" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "GN", name: "Guinée", flag: "🇬🇳" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "BJ", name: "Bénin", flag: "🇧🇯" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "CG", name: "Congo", flag: "🇨🇬" },
  { code: "MG", name: "Madagascar", flag: "🇲🇬" },
  { code: "HT", name: "Haïti", flag: "🇭🇹" },
  { code: "MA", name: "Maroc", flag: "🇲🇦" },
  { code: "DZ", name: "Algérie", flag: "🇩🇿" },
  { code: "TN", name: "Tunisie", flag: "🇹🇳" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "EG", name: "Égypte", flag: "🇪🇬" },
  { code: "BR", name: "Brésil", flag: "🇧🇷" },
  { code: "MX", name: "Mexique", flag: "🇲🇽" },
  { code: "AR", name: "Argentine", flag: "🇦🇷" },
  { code: "CO", name: "Colombie", flag: "🇨🇴" },
  { code: "CL", name: "Chili", flag: "🇨🇱" },
  { code: "PE", name: "Pérou", flag: "🇵🇪" },
  { code: "JM", name: "Jamaïque", flag: "🇯🇲" },
  { code: "IE", name: "Irlande", flag: "🇮🇪" },
  { code: "SE", name: "Suède", flag: "🇸🇪" },
  { code: "NO", name: "Norvège", flag: "🇳🇴" },
  { code: "DK", name: "Danemark", flag: "🇩🇰" },
  { code: "FI", name: "Finlande", flag: "🇫🇮" },
  { code: "PL", name: "Pologne", flag: "🇵🇱" },
  { code: "AT", name: "Autriche", flag: "🇦🇹" },
  { code: "GR", name: "Grèce", flag: "🇬🇷" },
  { code: "TR", name: "Turquie", flag: "🇹🇷" },
  { code: "JP", name: "Japon", flag: "🇯🇵" },
  { code: "KR", name: "Corée du Sud", flag: "🇰🇷" },
  { code: "IN", name: "Inde", flag: "🇮🇳" },
  { code: "AU", name: "Australie", flag: "🇦🇺" },
  { code: "NZ", name: "Nouvelle-Zélande", flag: "🇳🇿" },
];

const API_HOSTS = [
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://at1.api.radio-browser.info",
];

// 获取指定国家的广播电台列表
export const getStationsByCountry = async (
  countryCode: string,
  limit: number = 80,
): Promise<RadioStation[]> => {
  let lastError: any = null;

  for (const host of API_HOSTS) {
    try {
      const url = `${host}/json/stations/bycountrycodeexact/${encodeURIComponent(
        countryCode.toUpperCase(),
      )}?order=clickcount&reverse=true&limit=${limit}&hidebroken=true`;

      const response = await axios.get<RadioStation[]>(url, {
        timeout: 8000,
        headers: {
          "User-Agent": "MusicBoxPlayer/3.0.0",
        },
      });

      if (Array.isArray(response.data)) {
        // 过滤无有效流地址或 HLS m3u8 的电台，确保原生 HTML5 音频直接兼容播放
        return response.data.filter((item) => {
          const stream = (item.url_resolved || item.url || "").toLowerCase();
          return stream && !stream.includes(".m3u8");
        });
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
};
