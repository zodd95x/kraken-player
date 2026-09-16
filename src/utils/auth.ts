import { getCookie, removeCookie, setCookies } from "./cookie";
import type { CoverType, ArtistType, SongType } from "@/types/main";
import {
  userAccount,
  userDetail,
  userSubcount,
  userLike,
  userDj,
  userMv,
  userArtist,
  userAlbum,
  userPlaylist,
} from "@/api/user";
import { formatCoverList, formatArtistsList, formatSongsList } from "@/utils/format";
import { useDataStore, useMusicStore, useLocalStore } from "@/stores";
import { logout, refreshLogin } from "@/api/login";
import { debounce, isFunction, type DebouncedFunc } from "lodash-es";
import { isBeforeSixAM } from "./time";
import { dailyRecommend } from "@/api/rec";
import { isElectron } from "./env";
import { playlistTracks } from "@/api/playlist";
import router from "@/router";
import { trSetting } from "./i18nSettings";

/**
 * 用户是否登录
 * @returns 0 - 未登录 / 1 - 正常登录 / 2 - UID 登录
 */
export const isLogin = (): 0 | 1 | 2 => {
  const dataStore = useDataStore();
  if (!dataStore.userLoginStatus) return 0;
  if (dataStore.loginType === "uid") return 2;
  return getCookie("MUSIC_U") ? 1 : 0;
};

// 退出登录
export const toLogout = async (clearUserList = false): Promise<void> => {
  const dataStore = useDataStore();
  await logout();
  // 去除 cookie
  removeCookie("MUSIC_U");
  // 清除用户信息
  await dataStore.clearUserData();
  if (clearUserList) {
    dataStore.userList = [];
  }
  // 跳转首页
  router.push("/");
  window.$message.success(trSetting("退出登录成功"));
};

// 刷新登录
export const refreshLoginData = async () => {
  // lastLoginTime 是否超过 3 天
  const lastLoginTime = localStorage.getItem("lastLoginTime");
  // 超时时长
  const timeout = 3 * 24 * 60 * 60 * 1000;
  if (lastLoginTime && Date.now() - Number(lastLoginTime) > timeout) {
    // 刷新登录
    const result = await refreshLogin();
    if (result?.code === 200) {
      setCookies(result.cookie);
      localStorage.setItem("lastLoginTime", Date.now().toString());
    }
    return result;
  }
};

/**
 * 获取原始 Cookie 值 (不解码)
 */
const getRawCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return localStorage.getItem(`cookie-${name}`);
};

/**
 * 保存当前账号
 */
export const saveCurrentAccount = () => {
  const dataStore = useDataStore();
  if (!isLogin()) return;

  const { userId, name, avatarUrl } = dataStore.userData;
  const loginType = dataStore.loginType;

  // 校验：如果必须信息缺失，不保存
  if (!userId || !name || name === "未知用户名") {
    console.warn("用户信息不完整，无法保存");
    return;
  }

  // 获取关键 Cookies
  const cookies: Record<string, string> = {};
  const cookieKeys = ["MUSIC_U", "__csrf", "NMTID"];
  cookieKeys.forEach((key) => {
    // 获取原始值
    const val = getRawCookie(key);
    if (val) cookies[key] = val;
  });

  // 如果没有 MUSIC_U，无法保存
  if (!cookies["MUSIC_U"]) return;

  const newAccount = {
    userId,
    name,
    avatarUrl: avatarUrl || "",
    cookies,
    loginType,
    lastLoginTime: Date.now(),
  };

  // 查找是否存在
  const index = dataStore.userList.findIndex((u) => u.userId === userId);
  if (index !== -1) {
    // 更新
    dataStore.userList[index] = newAccount;
  } else {
    // 新增
    dataStore.userList.push(newAccount);
  }
};

/**
 * 切换账号
 * @param userId 用户ID
 */
export const switchAccount = async (userId: number) => {
  const dataStore = useDataStore();
  const account = dataStore.userList.find((u) => u.userId === userId);
  if (!account) {
    window.$message.error(trSetting("未找到账号"));
    return;
  }
  // 保存当前（如果已登录且不是要切换的同一个）
  if (isLogin() && dataStore.userData.userId !== userId) {
    saveCurrentAccount();
  }
  // 清除当前状态 (但不清除 userList)
  removeCookie("MUSIC_U");
  removeCookie("__csrf");
  await dataStore.clearUserData();
  // 设置新 Cookies
  Object.entries(account.cookies).forEach(([key, value]) => {
    // 直接写入 document.cookie 以保持原始值 (类似 cookie.ts 的 setCookies)
    const date = new Date();
    date.setFullYear(date.getFullYear() + 50);
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${key}=${value}; ${expires}; path=/`;
    // 同步到 localStorage
    localStorage.setItem(`cookie-${key}`, value as string);
  });
  //  更新 Store
  dataStore.loginType = account.loginType;
  dataStore.userLoginStatus = true; // 预设为 true
  // 预先填充部分用户信息，避免刷新后因数据空被重定向回首页
  dataStore.userData.userId = account.userId;
  dataStore.userData.name = account.name;
  dataStore.userData.avatarUrl = account.avatarUrl;

  // 刷新页面
  // window.location.reload();
  // 重新获取用户数据
  window.$message.loading(trSetting("正在切换账号..."));
  try {
    // 恢复上次登录时间
    if (account.lastLoginTime) {
      localStorage.setItem("lastLoginTime", account.lastLoginTime.toString());
    }
    await refreshLoginData();
    await updateUserData();
    window.$message.success(trSetting("切换账号成功"));
    // 跳转首页
    router.push("/");
  } catch (error) {
    console.error("Failed to switch account:", error);
    window.$message.error(trSetting("切换账号失败"));
    // 回滚或踢出
    dataStore.userLoginStatus = false;
    router.push("/");
  }
};

/**
 * 移除账号
 * @param userId 用户ID
 */
export const removeAccount = (userId: number) => {
  const dataStore = useDataStore();
  const index = dataStore.userList.findIndex((u) => u.userId === userId);
  if (index !== -1) {
    dataStore.userList.splice(index, 1);
    window.$message.success(trSetting("账号已移除"));
  }
};

// 更新用户信息
export const updateUserData = async () => {
  try {
    if (!isLogin()) return;
    const dataStore = useDataStore();
    // userId
    const { profile } = await userAccount();
    const userId = profile.userId;
    // 获取用户信息
    const userDetailData = await userDetail(userId);
    const userData = Object.assign(profile, userDetailData);

    // 获取用户订阅信息
    const subcountData = await userSubcount();
    // 获取用户 VIP 信息

    // 更改用户信息
    dataStore.userData = {
      userId,
      userType: userData.userType,
      vipType: userData.vipType,

      name: userData.nickname,
      level: userData.level,
      avatarUrl: userData.avatarUrl,
      backgroundUrl: userData.backgroundUrl,
      createTime: userData.createTime,
      createDays: userData.createDays,
      artistCount: subcountData.artistCount,
      djRadioCount: subcountData.djRadioCount,
      mvCount: subcountData.mvCount,
      subPlaylistCount: subcountData.subPlaylistCount,
      createdPlaylistCount: subcountData.createdPlaylistCount,
    };
    // 获取用户喜欢数据
    const allUserLikeResult = await Promise.allSettled([
      updateUserLikeSongs(),
      updateUserLikePlaylist(),
      updateUserLikeArtists(),
      updateUserLikeAlbums(),
      updateUserLikeMvs(),
      updateUserLikeDjs(),
      // 每日推荐
      updateDailySongsData(),
    ]);
    // 若部分失败
    const hasFailed = allUserLikeResult.some((result) => result.status === "rejected");
    if (hasFailed) throw new Error("Failed to update some user data");
  } catch (error) {
    console.error("❌ Error updating user data:", error);
    throw error;
  }
};

// 更新用户信息 - 特殊登录模式
export const updateSpecialUserData = async (userData?: any) => {
  try {
    const dataStore = useDataStore();
    if (!userData) {
      const result = await userDetail(dataStore.userData.userId);
      userData = result?.profile;
    }
    // 更改用户信息
    dataStore.userData = {
      userId: userData.userId,
      userType: userData.userType,
      vipType: userData.vipType,
      name: userData.nickname,
      level: userData.level,
      avatarUrl: userData.avatarUrl,
      backgroundUrl: userData.backgroundUrl,
      createTime: userData.createTime,
      createDays: userData.createDays,
    };
    // 获取用户喜欢数据
    await updateUserLikePlaylist();
  } catch (error) {
    console.error("❌ Error updating special user data:", error);
    throw error;
  }
};

// 更新用户喜欢歌曲
export const updateUserLikeSongs = async () => {
  const dataStore = useDataStore();
  if (!isLogin() || !dataStore.userData.userId) return;
  const result = await userLike(dataStore.userData.userId);
  dataStore.setUserLikeData("songs", result.ids);
};

// 更新用户喜欢歌单
export const updateUserLikePlaylist = async () => {
  const dataStore = useDataStore();
  const userId = dataStore.userData.userId;
  if (!isLogin() || !userId) return;
  if (dataStore.loginType === "uid") {
    const result = await userPlaylist(30, 0, userId);
    await dataStore.setUserLikeData("playlists", formatCoverList(result.playlist));
    return;
  }
  // 计算数量
  const { createdPlaylistCount, subPlaylistCount } = dataStore.userData;
  const number = (createdPlaylistCount || 0) + (subPlaylistCount || 0) || 50;
  const result = await userPlaylist(number, 0, userId);
  await dataStore.setUserLikeData("playlists", formatCoverList(result.playlist));
};

// 更新用户喜欢歌手
export const updateUserLikeArtists = async () => {
  await setUserLikeDataLoop(userArtist, formatArtistsList, "artists");
};

// 更新用户喜欢专辑
export const updateUserLikeAlbums = async () => {
  await setUserLikeDataLoop(userAlbum, formatCoverList, "albums");
};

// 更新用户喜欢电台
export const updateUserLikeDjs = async () => {
  await setUserLikeDataLoop(userDj, formatCoverList, "djs");
};

// 更新用户喜欢MV
export const updateUserLikeMvs = async () => {
  await setUserLikeDataLoop(userMv, formatCoverList, "mvs");
};

// 喜欢歌曲
export const toLikeSong: DebouncedFunc<(song: SongType, like: boolean) => Promise<void>> = debounce(
  async (song: SongType, like: boolean): Promise<void> => {
    try {
      if (!song || !song.id) return;
      const dataStore = useDataStore();
      const id = song.id;
      const likeList = [...(dataStore.userLikeData.songs || [])];
      const exists = likeList.includes(id);

      // 本地缓存的喜欢歌曲列表
      let cachedSongs = [...(dataStore.likeSongsList.data || [])];

      if (like && !exists) {
        likeList.unshift(id);
        if (!cachedSongs.some((s) => s.id === id)) {
          cachedSongs.unshift(song);
        }
        window.$message.success(trSetting("已添加到我喜欢的音乐"));
      } else if (!like && exists) {
        const index = likeList.indexOf(id);
        if (index !== -1) likeList.splice(index, 1);
        cachedSongs = cachedSongs.filter((s) => s.id !== id);
        window.$message.success(trSetting("已从我喜欢的音乐中移除"));
      } else if (like && exists) {
        window.$message.info(trSetting("已在喜欢列表中"));
      }

      // 更新并持久化存储
      await dataStore.setUserLikeData("songs", likeList);
      await dataStore.setLikeSongsList(
        {
          id: 0,
          name: trSetting("我喜欢的音乐"),
          cover: cachedSongs[0]?.cover || "/images/album.jpg?asset",
        },
        cachedSongs,
      );

      // 通知主进程
      if (isElectron) window.electron.ipcRenderer.send("like-status-change", like);
    } catch (error) {
      window.$message.error(trSetting("更新喜欢状态失败"));
      console.error("❌ 更新喜欢歌曲失败:", error);
    }
  },
  300,
  { leading: true, trailing: false },
);

// 收藏歌单
export const toLikePlaylist: DebouncedFunc<
  (id: number, like: boolean, detail?: CoverType) => Promise<void>
> = debounce(
  async (id: number, like: boolean, detail?: CoverType): Promise<void> => {
    if (!id) return;
    const dataStore = useDataStore();
    const list = [...(dataStore.userLikeData.playlists || [])];
    const existsIndex = list.findIndex((item) => item.id === id);

    if (like && existsIndex === -1) {
      const itemToSave = detail || { id, name: "Playlist", cover: "/images/album.jpg?asset" };
      list.unshift(itemToSave);
      window.$message.success(trSetting("歌单已添加至收藏"));
    } else if (!like && existsIndex !== -1) {
      list.splice(existsIndex, 1);
      window.$message.success(trSetting("歌单已取消收藏"));
    }
    await dataStore.setUserLikeData("playlists", list);
  },
  300,
  { leading: true, trailing: false },
);

// 收藏专辑
export const toLikeAlbum: DebouncedFunc<
  (id: number, like: boolean, detail?: CoverType) => Promise<void>
> = debounce(
  async (id: number, like: boolean, detail?: CoverType): Promise<void> => {
    if (!id) return;
    const dataStore = useDataStore();
    const list = [...(dataStore.userLikeData.albums || [])];
    const existsIndex = list.findIndex((item) => item.id === id);

    if (like && existsIndex === -1) {
      const itemToSave = detail || { id, name: "Album", cover: "/images/album.jpg?asset" };
      list.unshift(itemToSave);
      window.$message.success(trSetting("专辑已添加至收藏"));
    } else if (!like && existsIndex !== -1) {
      list.splice(existsIndex, 1);
      window.$message.success(trSetting("专辑已取消收藏"));
    }
    await dataStore.setUserLikeData("albums", list);
  },
  300,
  { leading: true, trailing: false },
);

// 收藏歌手
export const toLikeArtist: DebouncedFunc<
  (id: number, like: boolean, detail?: ArtistType) => Promise<void>
> = debounce(
  async (id: number, like: boolean, detail?: ArtistType): Promise<void> => {
    if (!id) return;
    const dataStore = useDataStore();
    const list = [...(dataStore.userLikeData.artists || [])];
    const existsIndex = list.findIndex((item) => item.id === id);

    if (like && existsIndex === -1) {
      const itemToSave = detail || { id, name: "Artiste", cover: "/images/artist.jpg?asset" };
      list.unshift(itemToSave);
      window.$message.success(trSetting("歌手已添加至收藏"));
    } else if (!like && existsIndex !== -1) {
      list.splice(existsIndex, 1);
      window.$message.success(trSetting("歌手已取消收藏"));
    }
    await dataStore.setUserLikeData("artists", list);
  },
  300,
  { leading: true, trailing: false },
);

// 订阅播客
export const toSubRadio = async (id: number, like: boolean) => {
  if (!id) return;
  const dataStore = useDataStore();
  const list = [...(dataStore.userLikeData.djs || [])];
  const existsIndex = list.findIndex((item) => item.id === id);
  if (like && existsIndex === -1) {
    list.unshift({ id, name: "Podcast", cover: "/images/album.jpg?asset" });
    window.$message.success(trSetting("播客订阅成功"));
  } else if (!like && existsIndex !== -1) {
    list.splice(existsIndex, 1);
    window.$message.success(trSetting("播客已取消订阅"));
  }
  await dataStore.setUserLikeData("djs", list);
};

// 循环获取用户喜欢数据
const setUserLikeDataLoop = async <T>(
  apiFunction: (limit: number, offset: number) => Promise<any>,
  formatFunction: (data: any[]) => T[],
  key: "playlists" | "artists" | "albums" | "mvs" | "djs",
) => {
  const dataStore = useDataStore();
  const userId = dataStore.userData.userId;
  if (!isLogin() || !userId) return;

  let offset = 0;
  const allData: T[] = [];
  const limit = 50; // 限制每页50条

  while (true) {
    try {
      const result = await apiFunction(limit, offset);
      // 根据不同 API 提取数据字段
      let data: any[] = [];
      if (key === "djs") {
        data = result.djRadios || [];
      } else if (key === "playlists") {
        data = result.playlist || [];
      } else {
        data = result.data || [];
      }

      if (!Array.isArray(data) || data.length === 0) {
        break; // 没有更多数据
      }

      // 格式化并合并数据
      const formattedData = formatFunction(data);
      allData.push(...formattedData);

      // 数据少于分页大小，说明已是最后一页
      if (data.length < limit) {
        break;
      }

      offset += limit;
    } catch (error) {
      console.error(`Error fetching ${key} data at offset ${offset}:`, error);
      break;
    }
  }
  // 保存数据
  if (key === "artists") {
    await dataStore.setUserLikeData(key, allData as ArtistType[]);
  } else if (key === "playlists" || key === "albums" || key === "mvs" || key === "djs") {
    await dataStore.setUserLikeData(key, allData as CoverType[]);
  }

  return allData;
};

/**
 * 更新每日推荐
 * @param refresh 是否强制刷新
 */
export const updateDailySongsData = async (refresh = false) => {
  try {
    const musicStore = useMusicStore();
    if (!isLogin()) {
      musicStore.dailySongsData = { timestamp: null, list: [] };
      return;
    }
    const { timestamp, list } = musicStore.dailySongsData;
    // 是否需要刷新
    if (!refresh && list.length > 0 && timestamp && !isBeforeSixAM(timestamp)) return;
    // 获取每日推荐
    const result = await dailyRecommend("songs");
    const songsData = formatSongsList(result.data.dailySongs);
    // 更新数据
    musicStore.dailySongsData = { timestamp: Date.now(), list: songsData };
    if (refresh) window.$message.success(trSetting("每日推荐已更新"));
  } catch (error) {
    console.error("❌ Error updating daily songs data:", error);
    throw error;
  }
};

/**
 * 删除歌曲
 * @param pid 歌单id
 * @param ids 要删除的歌曲id
 */
export const deleteSongs = async (
  pid: number,
  ids: number[],
  options: { callback?: () => void; songName?: string } = {},
) => {
  const { callback, songName } = options;
  try {
    window.$dialog.warning({
      title: trSetting("从歌单中删除"),
      content:
        ids?.length > 1
          ? trSetting("确定要从歌单中删除所选歌曲吗？")
          : songName
            ? `${trSetting("确定要从歌单中删除此歌曲吗？")} (${songName})`
            : trSetting("确定要从歌单中删除此歌曲吗？"),
      positiveText: trSetting("删除"),
      negativeText: trSetting("取消"),
      onPositiveClick: async () => {
        // 本地歌单
        if (pid.toString().length === 16) {
          const localStore = useLocalStore();
          const success = await localStore.removeSongsFromLocalPlaylist(
            pid,
            ids.map((id) => id.toString()),
          );
          if (success) {
            if (isFunction(callback)) callback();
            window.$message.success(trSetting("删除成功"));
          } else {
            window.$message.error(trSetting("删除失败"));
          }
          return;
        }
        // 在线歌单
        const result = await playlistTracks(pid, ids, "del");
        if (result.status === 200) {
          if (result.body?.code !== 200) {
            window.$message.error(trSetting(result.body?.message || "删除失败，请重试"));
            return;
          }
          if (isFunction(callback)) callback();
          window.$message.success(trSetting("删除成功"));
        } else {
          window.$message.error(trSetting(result?.message || "删除失败，请重试"));
        }
      },
    });
  } catch (error) {
    console.error("❌ Error deleting songs:", error);
    throw error;
  }
};
