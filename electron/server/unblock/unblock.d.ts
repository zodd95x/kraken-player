export type SongUrlResult = {
  code: number;
  url: string | null;
};

/** 用于校验搜索结果的原曲信息 */
export type SongMatchInfo = {
  keyword: string;
  songName: string;
  artist: string;
};
