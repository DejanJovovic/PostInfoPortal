import { HOME_CATEGORIES_ORDER } from "@/constants/homeCategoriesOrder";
import { nameToSlugMap } from "@/constants/nameToSlugMap";
import { WPPost } from "@/types/wp";
import {
  getCategories,
  getCategoryBySlug,
  getLatestPosts,
  getPostsByCategoryId,
  getPostsByCategoryIds,
  getPostsBySearch,
} from "@/utils/wpApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { refreshDailyCircles } from "./dailyCirclesFeed";
import { buildDanasFromList } from "./danasUtils";
import { createGroupedPostsCacheSaver } from "./postsCache";
import { isSameLocalDate, uniqById } from "./postsUtils";

const DANAS_KEY = "Danas";
const MAIN_NEWS_KEY = "Glavna vest";
const MAIN_NEWS_SLUG = "glavna-vest";

const HOME_PAGE_SIZE = 4;
const DANAS_PAGE_SIZE = 10;
const DANAS_SOURCE_PAGE_SIZE = 30;
const MAIN_NEWS_PAGE_SIZE = 7;
const MAX_DANAS_SOURCE_PAGES = 6;
const DAILY_CIRCLES_DAYS = 6;
const DAILY_CIRCLES_POSTS_PER_DAY = 5;
const LOKAL_ROOT_SLUGS = ["gradovi", "okruzi"] as const;

type FlatCategory = {
  id: number;
  name: string;
  slug: string;
  parent: number;
};

const normalizeCategoryName = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

let inFlight: Promise<void> | null = null;

const safeParseGroupedCache = (raw: string | null) => {
  if (!raw) return { data: {} as Record<string, WPPost[]>, timestamp: 0 };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.data) {
      return {
        data: (parsed.data || {}) as Record<string, WPPost[]>,
        timestamp: Number(parsed.timestamp || 0),
      };
    }
  } catch {}
  return { data: {} as Record<string, WPPost[]>, timestamp: 0 };
};

const hasNonEmpty = (grouped: Record<string, WPPost[]>, key: string) =>
  Array.isArray(grouped[key]) && grouped[key].length > 0;

const collectDescendantCategoryIds = (
  allCategories: FlatCategory[],
  rootIds: number[],
) => {
  const ids = new Set(rootIds.filter((id) => Number.isInteger(id) && id > 0));
  let changed = true;

  while (changed) {
    changed = false;
    for (const category of allCategories) {
      const parentId = Number(category.parent || 0);
      if (parentId > 0 && ids.has(parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        changed = true;
      }
    }
  }

  return Array.from(ids);
};

const getCategoryFetchIds = async ({
  categoryName,
  allCategories,
  slugMap,
  nameMap,
}: {
  categoryName: string;
  allCategories: FlatCategory[];
  slugMap: Record<string, number>;
  nameMap: Record<string, number>;
}) => {
  if (categoryName === "Lokal" && allCategories.length > 0) {
    const rootIds = allCategories
      .filter((category) =>
        LOKAL_ROOT_SLUGS.includes(
          category.slug as (typeof LOKAL_ROOT_SLUGS)[number],
        ),
      )
      .map((category) => category.id);

    if (rootIds.length > 0) {
      return collectDescendantCategoryIds(allCategories, rootIds);
    }
  }

  const slug = nameToSlugMap[categoryName];
  let id: number | undefined;

  if (slug) {
    id = slugMap[slug];
    if (!id) {
      const bySlug = await getCategoryBySlug(slug);
      if (Array.isArray(bySlug) && bySlug.length > 0 && bySlug[0]?.id) {
        id = bySlug[0].id as number;
      }
    }
  }

  if (!id) {
    id = nameMap[normalizeCategoryName(categoryName)];
  }

  return typeof id === "number" ? [id] : [];
};

export const prefetchNaslovnaStartupPayload = () => {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const existingRaw = await AsyncStorage.getItem("groupedPostsCache");
    const existing = safeParseGroupedCache(existingRaw).data;

    const save = createGroupedPostsCacheSaver({
      danasKey: DANAS_KEY,
      homeCategories: HOME_CATEGORIES_ORDER,
      homePageSize: HOME_PAGE_SIZE,
      extraLimits: {
        [MAIN_NEWS_KEY]: MAIN_NEWS_PAGE_SIZE,
        Kolumne: 1,
        Događaji: 1,
      },
    });

    const merged: Record<string, WPPost[]> = { ...existing };
    const mergeAndSave = async (key: string, arr: WPPost[] | undefined) => {
      if (!Array.isArray(arr) || arr.length === 0) return;
      merged[key] = arr;
      await save(merged);
    };

    let slugMap: Record<string, number> = {};
    let nameMap: Record<string, number> = {};
    let allCategories: FlatCategory[] = [];
    try {
      const categories = await getCategories();
      if (Array.isArray(categories)) {
        allCategories = categories
          .filter(
            (c: any) =>
              typeof c?.id === "number" && typeof c?.slug === "string",
          )
          .map((c: any) => ({
            id: Number(c.id),
            name: String(c.name || ""),
            slug: String(c.slug || ""),
            parent: Number(c.parent || 0),
          }));

        slugMap = Object.fromEntries(
          allCategories.map((c) => [String(c.slug), Number(c.id)]),
        );
        nameMap = Object.fromEntries(
          allCategories.map((c) => [
            normalizeCategoryName(String(c.name)),
            Number(c.id),
          ]),
        );
        await AsyncStorage.setItem("slugToIdCache", JSON.stringify(slugMap));
      }
    } catch {
      const cached = await AsyncStorage.getItem("slugToIdCache");
      if (cached) {
        try {
          slugMap = JSON.parse(cached) as Record<string, number>;
        } catch {}
      }
    }

    const dailyPromise = refreshDailyCircles({
      baseToday: new Date(),
      days: DAILY_CIRCLES_DAYS,
      postsPerDay: DAILY_CIRCLES_POSTS_PER_DAY,
    }).catch(() => []);

    try {
      const today = new Date();
      const isPostToday = (p: WPPost) => {
        const d = p?.date ? new Date(p.date) : null;
        return d ? isSameLocalDate(d, today) : false;
      };

      let sourcePage = 1;
      let collectedAll: WPPost[] = [];
      let collectedToday: WPPost[] = [];
      let sawToday = false;

      while (sourcePage <= MAX_DANAS_SOURCE_PAGES) {
        const latest = (await getLatestPosts(
          sourcePage,
          DANAS_SOURCE_PAGE_SIZE,
        )) as WPPost[];

        if (!Array.isArray(latest) || latest.length === 0) break;

        collectedAll = uniqById([...collectedAll, ...latest]);
        const todayOnPage = latest.filter(isPostToday);
        if (todayOnPage.length) {
          collectedToday = uniqById([...collectedToday, ...todayOnPage]);
          sawToday = true;
        } else if (sawToday) {
          break;
        }

        const filled = collectedToday.length
          ? collectedToday.length >= DANAS_PAGE_SIZE
          : collectedAll.length >= DANAS_PAGE_SIZE;
        if (filled) break;

        sourcePage += 1;
      }

      const base = collectedToday.length ? collectedToday : collectedAll;
      const { posts: danasInitial } = buildDanasFromList(base, DANAS_PAGE_SIZE);
      await mergeAndSave(DANAS_KEY, danasInitial);
    } catch {}

    try {
      let id = slugMap[MAIN_NEWS_SLUG];
      if (!id) {
        const bySlug = await getCategoryBySlug(MAIN_NEWS_SLUG);
        if (Array.isArray(bySlug) && bySlug.length > 0 && bySlug[0]?.id) {
          id = bySlug[0].id as number;
        }
      }

      if (id) {
        const list = (await getPostsByCategoryId(
          id,
          1,
          MAIN_NEWS_PAGE_SIZE,
        )) as WPPost[] | unknown;
        await mergeAndSave(MAIN_NEWS_KEY, Array.isArray(list) ? list : []);
      }
    } catch {}
    for (const name of HOME_CATEGORIES_ORDER) {
      try {
        const pageSize =
          name === "Kolumne" || name === "Događaji" ? 1 : HOME_PAGE_SIZE;
        const categoryIds = await getCategoryFetchIds({
          categoryName: name,
          allCategories,
          slugMap,
          nameMap,
        });

        let list: WPPost[] | unknown = [];
        if (categoryIds.length > 0) {
          list =
            categoryIds.length === 1
              ? ((await getPostsByCategoryId(categoryIds[0], 1, pageSize)) as
                  | WPPost[]
                  | unknown)
              : ((await getPostsByCategoryIds(categoryIds, 1, pageSize)) as
                  | WPPost[]
                  | unknown);
        } else {
          list = (await getPostsBySearch(name, 1, pageSize)) as
            | WPPost[]
            | unknown;
        }

        await mergeAndSave(name, Array.isArray(list) ? list : []);
      } catch {}
    }

    const hasAny =
      Object.values(merged).some(
        (arr) => Array.isArray(arr) && arr.length > 0,
      ) ||
      HOME_CATEGORIES_ORDER.some((k) => hasNonEmpty(merged, k)) ||
      hasNonEmpty(merged, DANAS_KEY) ||
      hasNonEmpty(merged, MAIN_NEWS_KEY);

    if (!hasAny) return;

    await save(merged);

    await Promise.race([dailyPromise, new Promise((r) => setTimeout(r, 4000))]);
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
};
