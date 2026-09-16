<template>
  <div class="song-wiki">
    <Transition name="fade" mode="out-in">
      <div v-if="!loading && currentSong" class="wiki-container" key="content">
        <div class="header">
          <div class="cover">
            <n-image
              :src="currentSong.cover"
              class="cover-img"
              object-fit="cover"
              :previewed-img-props="{ style: { borderRadius: '8px' } }"
              :render-toolbar="renderToolbar"
            />
            <n-image
              class="cover-shadow"
              preview-disabled
              :src="currentSong.cover"
              object-fit="cover"
            />
          </div>
          <div class="data">
            <n-h2 class="name text-hidden">{{ displaySongText(currentSong.name) }}</n-h2>
            <div class="meta">
              <div class="item">
                <SvgIcon name="Person" :depth="3" />
                <div class="artists text-hidden">
                  <template v-if="Array.isArray(currentSong.artists)">
                    <n-text
                      v-for="(ar, index) in currentSong.artists"
                      class="clickable-text"
                      :key="ar.id"
                      @click="$router.push({ name: 'artist', query: { id: ar.id } })"
                    >
                      {{ displaySongText(ar.name) }}
                      <span v-if="index < currentSong.artists.length - 1"> / </span>
                    </n-text>
                  </template>
                  <n-text v-else>{{ displaySongText(currentSong.artists) }}</n-text>
                </div>
              </div>
              <div class="item" v-if="currentSong.album">
                <SvgIcon name="Album" :depth="3" />
                <n-text
                  v-if="typeof currentSong.album !== 'string'"
                  class="text-hidden clickable-text"
                  @click="$router.push({ name: 'album', query: { id: currentSong.album.id } })"
                >
                  {{ displaySongText(currentSong.album.name) }}
                </n-text>
                <n-text v-else class="text-hidden">{{ displaySongText(currentSong.album) }}</n-text>
              </div>
              <div class="item" v-if="publishTime" title="Date de sortie">
                <SvgIcon name="Time" :depth="3" />
                <n-text class="text-hidden">{{ publishTime }}</n-text>
              </div>
            </div>
            <n-flex class="actions">
              <n-button
                type="primary"
                strong
                secondary
                round
                :focusable="false"
                @click="handlePlay"
              >
                <template #icon>
                  <SvgIcon name="Play" />
                </template>
                Lecture
              </n-button>
              <n-dropdown
                :options="currentSong ? getMenuOptions(currentSong) : []"
                trigger="click"
                placement="bottom-start"
              >
                <n-button :focusable="false" class="more" circle strong secondary>
                  <template #icon>
                    <SvgIcon name="List" />
                  </template>
                </n-button>
              </n-dropdown>
            </n-flex>
          </div>
        </div>
        <!-- 数据展示区域 -->
        <div v-if="viewModel" class="wiki-content">
          <!-- 音乐故事 -->
          <div v-if="viewModel.story" class="section">
            <n-h3 prefix="bar">Histoire musicale</n-h3>
            <n-grid x-gap="16" y-gap="16" cols="1 s:2 m:3" responsive="screen">
              <n-gi v-if="viewModel.story.firstListen">
                <n-card
                  title="Première écoute"
                  size="small"
                  embedded
                  :bordered="false"
                  style="border-radius: 8px; height: 100%"
                >
                  <template #header-extra>
                    <n-text depth="3" style="font-size: 12px">
                      {{ viewModel.story.firstListen.season }}
                    </n-text>
                  </template>
                  <div class="card-content main-text">
                    {{ viewModel.story.firstListen.period }} ·
                    {{ viewModel.story.firstListen.date }}
                  </div>
                  <template #footer v-if="viewModel.story.firstListen.meetDurationDesc">
                    <n-text depth="3" style="font-size: 12px">
                      {{ viewModel.story.firstListen.meetDurationDesc }}
                    </n-text>
                  </template>
                </n-card>
              </n-gi>
              <n-gi v-if="viewModel.story.totalPlay">
                <n-card
                  title="Nombre d'écoutes"
                  size="small"
                  embedded
                  :bordered="false"
                  style="border-radius: 8px; height: 100%"
                >
                  <div class="card-content main-text">
                    Écouté {{ viewModel.story.totalPlay.playCount }} fois au total
                  </div>
                  <template #footer>
                    <n-text depth="3" style="font-size: 12px">{{
                      viewModel.story.totalPlay.text
                    }}</n-text>
                  </template>
                </n-card>
              </n-gi>
              <n-gi v-if="viewModel.story.likeSong && viewModel.story.likeSong.like">
                <n-card
                  title="Coup de cœur"
                  size="small"
                  embedded
                  :bordered="false"
                  style="border-radius: 8px; height: 100%"
                >
                  <div class="card-content main-text">{{ viewModel.story.likeSong.text }}</div>
                  <template #footer v-if="viewModel.story.likeSong.redDesc">
                    <n-text depth="3" style="font-size: 12px">{{
                      viewModel.story.likeSong.redDesc
                    }}</n-text>
                  </template>
                </n-card>
              </n-gi>
            </n-grid>
          </div>
          <!-- 音乐简介 -->
          <div v-if="viewModel.basicInfo.length > 0" class="section">
            <n-h3 prefix="bar">Présentation</n-h3>
            <n-grid x-gap="16" y-gap="16" cols="1 s:2 m:3 l:4" responsive="screen">
              <n-gi v-for="(item, index) in viewModel.basicInfo" :key="index">
                <n-card
                  :title="trSetting(item.label)"
                  size="small"
                  embedded
                  :bordered="false"
                  style="border-radius: 8px; height: 100%"
                >
                  <n-flex v-if="item.tags && item.tags.length" size="small">
                    <n-tag v-for="tag in item.tags" :key="tag" :bordered="false" round size="small">
                      {{ trSetting(tag) }}
                    </n-tag>
                  </n-flex>
                  <n-text v-else class="value-text">{{ trSetting(item.value || "-") }}</n-text>
                </n-card>
              </n-gi>
            </n-grid>
          </div>
          <!-- 乐谱 -->
          <div v-if="viewModel.sheets.length > 0" class="section">
            <n-h3 prefix="bar">Partitions</n-h3>
            <n-collapse @item-header-click="handleSheetExpand">
              <n-collapse-item
                v-for="(sheet, index) in viewModel.sheets"
                :title="
                  sheet.playVersion
                    ? `${sheet.name} · ${sheet.playVersion}`
                    : sheet.name || `Partition ${index + 1}`
                "
                :name="index"
                :key="sheet.id"
              >
                <div v-if="sheetLoading[sheet.id]" class="loading-container">
                  <n-spin size="small" />
                </div>
                <n-image-group
                  v-else-if="sheet.images && sheet.images.length > 0"
                  :render-toolbar="renderToolbar"
                >
                  <n-grid x-gap="16" y-gap="16" cols="2 s:3 m:4 l:5" responsive="screen">
                    <n-gi v-for="(img, idx) in sheet.images" :key="idx">
                      <n-image
                        :src="img"
                        width="100%"
                        lazy
                        object-fit="contain"
                        style="border-radius: 8px"
                      />
                    </n-gi>
                  </n-grid>
                </n-image-group>
                <n-empty v-else :description="trSetting('暂无预览')" />
              </n-collapse-item>
            </n-collapse>
          </div>
          <!-- 获奖与影视 -->
          <div
            v-if="viewModel.awards.length > 0 || viewModel.credentials.length > 0"
            class="section"
          >
            <n-h3 prefix="bar">{{ trSetting("获奖与影视") }}</n-h3>
            <n-grid x-gap="16" y-gap="16" cols="1 s:2 m:3" responsive="screen">
              <n-gi
                v-for="(res, index) in [...viewModel.awards, ...viewModel.credentials]"
                :key="index"
              >
                <n-card
                  size="small"
                  embedded
                  :bordered="false"
                  style="border-radius: 8px; height: 100%"
                >
                  <n-flex align="center">
                    <n-image
                      v-if="res.image"
                      :src="res.image"
                      width="48"
                      height="48"
                      lazy
                      style="border-radius: 6px"
                      :render-toolbar="renderToolbar"
                      :img-props="{ alt: res.title }"
                    />
                    <div style="overflow: hidden; flex: 1">
                      <n-text strong class="text-hidden" style="display: block">
                        {{ res.title }}
                      </n-text>
                      <n-text depth="3" size="small" class="text-hidden" style="display: block">
                        {{ res.subTitle }}
                      </n-text>
                    </div>
                  </n-flex>
                </n-card>
              </n-gi>
            </n-grid>
          </div>
          <!-- 相似歌曲 -->
          <div v-if="viewModel.similarSongs.length > 0" class="section">
            <n-h3 prefix="bar">Titres similaires</n-h3>
            <SongList :data="similarSongsList" height="auto" disabledSort />
          </div>
        </div>

        <div v-else class="empty-state">
          <n-empty description="Aucune information supplémentaire" style="margin-top: 48px" />
        </div>
      </div>
      <div v-else class="loading-skeleton" key="skeleton">
        <div class="header-skeleton">
          <n-skeleton height="204px" width="204px" style="border-radius: 8px" />
          <div class="info-skeleton">
            <n-skeleton text height="40px" width="60%" style="margin-bottom: 12px" />
            <n-skeleton :repeat="2" text height="20px" width="40%" style="margin-bottom: 8px" />
            <n-skeleton height="40px" width="120px" round style="margin-top: auto" />
          </div>
        </div>
        <n-grid x-gap="16" y-gap="16" cols="1 s:2 m:3" responsive="screen" style="margin-top: 32px">
          <n-gi v-for="i in 3" :key="i">
            <n-skeleton height="150px" style="border-radius: 8px" />
          </n-gi>
        </n-grid>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import type { WikiViewModel, UserRecord, SongWikiData, ListenData, SheetData } from "./types";
import { usePlayerController } from "@/core/player/PlayerController";
import { renderToolbar } from "@/utils/meta";
import {
  songDetail,
  songWikiSummary,
  songSheetList,
  songSheetPreview,
  songFirstListenInfo,
} from "@/api/song";
import {
  containsChineseText,
  formatSongsList,
  removeBrackets,
  removeChineseBracketedContent,
} from "@/utils/format";
import { useSettingStore } from "@/stores";
import dayjs from "dayjs";
import { useSongMenu } from "@/composables/useSongMenu";
import { formatTimestamp } from "@/utils/time";
import { trSetting } from "@/utils/i18nSettings";

const route = useRoute();
const player = usePlayerController();
const settingStore = useSettingStore();

const { getMenuOptions } = useSongMenu();

const loading = ref(true);
const currentSongId = ref<number>(0);
const currentSong = ref<SongType | null>(null);
const viewModel = ref<WikiViewModel | null>(null);
const similarSongsList = ref<SongType[]>([]);
const sheetLoading = ref<Record<number, boolean>>({});
const currentRequestToken = ref(0);

const publishTime = computed(() => {
  const createTime = currentSong.value?.createTime;
  return typeof createTime === "number" ? formatTimestamp(createTime, "YYYY-MM-DD") : "";
});

const displaySongText = (text: string | undefined): string => {
  const withoutBrackets = settingStore.hideBracketedContent ? removeBrackets(text) : text || "";
  return settingStore.language === "zh"
    ? withoutBrackets
    : removeChineseBracketedContent(withoutBrackets);
};

const displayWikiText = (text: string | undefined): string => {
  const cleaned = displaySongText(text);
  return settingStore.language === "zh" || !containsChineseText(cleaned) ? cleaned : "";
};

const sanitizeSimilarSong = (song: SongType): SongType => {
  if (settingStore.language === "zh") return song;

  const cleanMetaName = (name: string) => (containsChineseText(name) ? "" : displaySongText(name));
  const album =
    typeof song.album === "string"
      ? cleanMetaName(song.album)
      : { ...song.album, name: cleanMetaName(song.album.name) };
  const artists = Array.isArray(song.artists)
    ? song.artists
        .map((artist) => ({ ...artist, name: cleanMetaName(artist.name) }))
        .filter((artist) => artist.name)
    : cleanMetaName(song.artists);

  return {
    ...song,
    name: displaySongText(song.name),
    artists,
    album,
    alia: displaySongText(song.alia),
  };
};

// 简单的转换逻辑，避免过多判断
const normalizeWikiData = (
  wiki: SongWikiData | null,
  listen: ListenData | null,
  sheets: SheetData | null,
): WikiViewModel => {
  const model: WikiViewModel = {
    basicInfo: [],
    sheets: [],
    awards: [],
    credentials: [],
    similarSongs: [],
  };

  const record: UserRecord = {};
  const firstDto = listen?.musicFirstListenDto || wiki?.musicFirstListenDto;
  if (firstDto) {
    const listenDate = firstDto.date
      ? firstDto.date
      : firstDto.listenTime
        ? dayjs(firstDto.listenTime).format("YYYY.MM.DD")
        : "";

    record.firstListen = {
      season: displayWikiText(firstDto.season),
      period: displayWikiText(firstDto.period),
      date: listenDate,
      meetDurationDesc: displayWikiText(firstDto.meetDurationDesc),
      sceneText: displayWikiText(firstDto.sceneText),
    };
  }
  const totalDto = listen?.musicTotalPlayDto || wiki?.musicTotalPlayDto;
  if (totalDto)
    record.totalPlay = { playCount: totalDto.playCount, text: displayWikiText(totalDto.text) };

  const likeDto = listen?.musicLikeSongDto || wiki?.musicLikeSongDto;
  if (likeDto)
    record.likeSong = {
      like: likeDto.like,
      text: displayWikiText(likeDto.text),
      redDesc: displayWikiText(likeDto.redDesc),
    };

  if (Object.keys(record).length) model.story = record;

  const sheetList = sheets?.musicSheetSimpleInfoVOS;
  if (Array.isArray(sheetList)) {
    model.sheets = sheetList
      .map((s) => ({
        id: s.id,
        name: displayWikiText(s.name),
        playVersion: displayWikiText(s.playVersion),
        coverImageUrl: s.coverImageUrl,
        images: [],
      }))
      .filter((sheet) => sheet.name || sheet.playVersion);
  }

  const blocks = wiki?.blocks || [];
  for (const block of blocks) {
    if (!block.creatives) continue;

    if (block.code === "SONG_PLAY_ABOUT_SONG_BASIC") {
      for (const creative of block.creatives) {
        const title = creative.uiElement?.mainTitle?.title;
        if (!title) continue;

        const type = creative.creativeType;
        if (["songTag", "songBizTag"].includes(type) && creative.resources) {
          const tags = creative.resources
            .map((r) => displayWikiText(r.uiElement?.mainTitle?.title))
            .filter(Boolean);
          if (tags.length)
            model.basicInfo.push({ label: displayWikiText(title), type: "tags", tags });
        } else if (["language", "bpm"].includes(type)) {
          const text = displayWikiText(creative.uiElement?.textLinks?.[0]?.text);
          if (text)
            model.basicInfo.push({ label: displayWikiText(title), type: "text", value: text });
        } else if (["songAward", "entertainment"].includes(type)) {
          const items =
            creative.resources
              ?.map((r) => ({
                title: displayWikiText(r.uiElement?.mainTitle?.title),
                subTitle: displayWikiText(r.uiElement?.subTitles?.map((s) => s.title).join("/")),
                image: r.uiElement?.images?.[0]?.imageUrl,
              }))
              .filter((item) => item.title || item.subTitle) || [];
          if (type === "songAward") model.awards.push(...items);
          else model.credentials.push(...items);
        }
      }
    } else if (block.code === "SONG_PLAY_ABOUT_SIMILAR_SONG") {
      for (const creative of block.creatives) {
        creative.resources?.forEach((r) => {
          if (r.resourceId) model.similarSongs.push(Number(r.resourceId));
        });
      }
    }
  }

  return model;
};

// 获取歌曲信息
const fetchData = async (id?: number) => {
  id = id ?? Number(route.query.id);
  if (!id || id === currentSongId.value) return;
  const token = ++currentRequestToken.value;
  loading.value = true;
  currentSongId.value = id;
  viewModel.value = null;
  similarSongsList.value = [];
  sheetLoading.value = {};
  try {
    const detailRes = await songDetail(id);
    if (!detailRes.songs?.[0]) throw new Error("Song not found");
    if (token !== currentRequestToken.value) return;
    currentSong.value = formatSongsList(detailRes.songs)[0];
    const [wikiRes, listenRes, sheetRes] = await Promise.allSettled([
      songWikiSummary(id),
      songFirstListenInfo(id),
      songSheetList(id),
    ]);
    if (token !== currentRequestToken.value) return;
    // 获取歌曲信息
    const wikiData = wikiRes.status === "fulfilled" ? wikiRes.value.data || wikiRes.value : {};
    const listenData =
      listenRes.status === "fulfilled"
        ? listenRes.value.data?.data || listenRes.value.data || listenRes.value
        : {};
    const sheetData = sheetRes.status === "fulfilled" ? sheetRes.value.data || sheetRes.value : {};
    // 归一化数据
    viewModel.value = normalizeWikiData(wikiData, listenData, sheetData);
    // 获取相似歌曲
    if (viewModel.value.similarSongs.length > 0) {
      try {
        const sims = await songDetail(viewModel.value.similarSongs);
        if (token !== currentRequestToken.value) return;
        if (sims.songs)
          similarSongsList.value = formatSongsList(sims.songs).map(sanitizeSimilarSong);
      } catch (e) {
        console.warn("Failed to load similar songs", e);
      }
    }
  } catch (error) {
    console.error("Fetch wiki failed", error);
    window.$message.error(trSetting("获取信息失败"));
  } finally {
    if (token === currentRequestToken.value) {
      loading.value = false;
    }
  }
};

// 展开乐谱
const handleSheetExpand = async ({ name, expanded }: { name: number; expanded: boolean }) => {
  if (!expanded || !viewModel.value) return;
  const sheet = viewModel.value.sheets[name];
  if (!sheet || sheet.images?.length) return;
  sheetLoading.value[sheet.id] = true;
  try {
    const res = await songSheetPreview(sheet.id);
    const data = res?.data ?? res;
    const rawList = Array.isArray(data) ? data : data.pageList || data.pages || [];
    sheet.images = rawList
      .map((item: any) => (typeof item === "string" ? item : item.pageImageUrl || item.url))
      .filter(Boolean);
  } catch (e) {
    window.$message.error("加载乐谱失败");
  } finally {
    sheetLoading.value[sheet.id] = false;
  }
};

// 播放歌曲
const handlePlay = () => {
  if (currentSong.value) player.addNextSong(currentSong.value, true);
};

onActivated(() => fetchData());

// 监听路由更新
onBeforeRouteUpdate((to) => {
  fetchData(Number(to.query.id));
});
</script>

<style scoped lang="scss">
.song-wiki {
  width: 100%;
  height: 100%;
  padding-bottom: 80px;
  .loading-skeleton {
    margin: 0 auto;
    padding-top: 12px;
    .header-skeleton {
      display: flex;
      height: 240px;
      margin-bottom: 32px;
      padding: 12px 0 24px 0;
      gap: 20px;
      .info-skeleton {
        flex: 1;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      @media (max-width: 600px) {
        flex-direction: column;
        height: auto;
        align-items: center;
        gap: 20px;
        .info-skeleton {
          width: 100%;
          align-items: center;
        }
      }
    }
  }
  .header {
    display: flex;
    margin-bottom: 32px;
    height: 240px;
    padding: 12px 0 24px 0;
    .cover {
      height: 100%;
      aspect-ratio: 1/1;
      width: auto;
      flex-shrink: 0;
      margin-right: 20px;
      position: relative;
      :deep(img) {
        width: 100%;
        height: 100%;
      }
      .cover-img {
        position: relative;
        z-index: 1;
        border-radius: 8px;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      .cover-shadow {
        position: absolute;
        top: 6px;
        left: 0;
        width: 100%;
        height: 100%;
        filter: blur(12px) opacity(0.6);
        transform: scale(0.92, 0.96);
        z-index: 0;
        border-radius: 8px;
        object-fit: cover;
      }
    }
    .data {
      display: flex;
      flex-direction: column;
      flex: 1;
      height: 100%;
      padding-right: 60px;
      .name {
        font-size: 30px;
        font-weight: bold;
        margin: 0 0 12px 0;
        line-height: 1.2;
      }
      .meta {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 14px;
        opacity: 0.8;
        .item {
          display: flex;
          align-items: center;
          flex-wrap: nowrap;
          .n-icon {
            font-size: 20px;
            margin-right: 4px;
            flex-shrink: 0;
          }
          .clickable-text {
            cursor: pointer;
            &:hover {
              color: var(--primary-hex);
            }
          }
        }
      }
      .actions {
        margin-top: auto;
        :deep(.n-button) {
          height: 40px;
          transition: all 0.3s var(--n-bezier);
        }
        .more {
          width: 40px;
        }
        @media (max-width: 768px) {
          :deep(.n-button) {
            height: 34px;
            font-size: 13px;
            padding: 0 14px;
            .n-icon {
              font-size: 16px;
            }
          }
        }
      }
    }
    @media (max-width: 600px) {
      flex-direction: column;
      height: auto;
      align-items: center;
      text-align: center;
      gap: 20px;
      .cover {
        margin-right: 0;
        max-width: calc(100% - 60%);
      }
      .data {
        padding-right: 0;
        align-items: center;
        .actions {
          margin-top: 12px;
        }
      }
    }
  }
  .wiki-content {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }
  .loading-container {
    display: flex;
    justify-content: center;
    padding: 20px;
  }
}
.text-hidden {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.main-text {
  font-size: 16px;
  font-weight: bold;
}
</style>
