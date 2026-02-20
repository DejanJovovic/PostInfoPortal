import { nameToSlugMap } from "@/constants/nameToSlugMap";
import { menuData } from "@/types/menuData";
import { WPPost } from "@/types/wp";
import { HOME_CATEGORIES_ORDER } from "@/constants/homeCategoriesOrder";
import {
  getCategories,
  getCategoryBySlug,
  getLatestPosts,
  getPostsByCategoryId,
  getPostsBySearch,
} from "@/utils/wpApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  loadDailyCirclesFromCache,
  refreshDailyCircles,
} from "./dailyCirclesFeed";
import { buildDanasForToday, buildDanasFromList } from "./danasUtils";
import { createGroupedPostsCacheSaver } from "./postsCache";
import {
  isSameLocalDate,
  matchesPostSearchQuery,
  sortPostsNewestFirst,
  uniqById,
} from "./postsUtils";
import { prefetchNaslovnaStartupPayload } from "./startupPrefetch";

export const usePostsByCategory = () => {
  const [categories, setCategories] = useState<
    { id: number; name: string; slug: string }[]
  >([]);
  const [posts, setPosts] = useState<WPPost[]>([]);
  const [groupedPosts, setGroupedPosts] = useState<Record<string, WPPost[]>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [slugToId, setSlugToId] = useState<Record<string, number>>({});
  const [initialized, setInitialized] = useState(false);
  const [currentPage, setCurrentPage] = useState<Record<string, number>>({});
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [dailyCirclesPosts, setDailyCirclesPosts] = useState<WPPost[]>([]);

  const DANAS_KEY = "Danas";
  const MAIN_NEWS_KEY = "Glavna vest";
  const MAIN_NEWS_SLUG = "glavna-vest";
  const MAIN_NEWS_PAGE_SIZE = 7;

  const HOME_PAGE_SIZE = 4;
  const CATEGORY_PAGE_SIZE = 10;
  const DANAS_PAGE_SIZE = 10;
  const DANAS_SOURCE_PAGE_SIZE = 30;
  const DAILY_CIRCLES_DAYS = 6;
  const DAILY_CIRCLES_POSTS_PER_DAY = 5;
  const SEARCH_PAGE_SIZE = 10;

  const normalizeCategoryName = (value: string) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const danasSourcePageRef = useRef(1);
  const danasModeRef = useRef<"today" | "fallback" | null>(null);
  const danasExhaustedRef = useRef(false);
  const searchQueryRef = useRef("");
  const searchLocalPoolRef = useRef<WPPost[]>([]);
  const searchLocalCursorRef = useRef(0);
  const searchRemotePageRef = useRef(1);
  const searchRemoteExhaustedRef = useRef(false);
  const searchSeenIdsRef = useRef<Set<number>>(new Set());

  const refreshDanasOnly = async ({ showLoader = false } = {}) => {
    if (showLoader) setLoading(true);
    try {
      const today = new Date();
      const isPostToday = (p: WPPost) => {
        const d = p?.date ? new Date(p.date) : null;
        return d ? isSameLocalDate(d, today) : false;
      };

      let sourcePage = 1;
      let lastFetchedPage = 0;
      let collectedAll: WPPost[] = [];
      let collectedToday: WPPost[] = [];
      let mode: "today" | "fallback" = "fallback";
      let exhausted = false;
      let sawToday = false;
      let boundaryReached = false;

      while (sourcePage <= 6) {
        const latest = (await getLatestPosts(
          sourcePage,
          DANAS_SOURCE_PAGE_SIZE,
        )) as WPPost[];

        if (!Array.isArray(latest) || latest.length === 0) {
          exhausted = true;
          break;
        }
        lastFetchedPage = sourcePage;

        collectedAll = uniqById([...collectedAll, ...latest]);
        const todayOnPage = latest.filter(isPostToday);
        if (todayOnPage.length) {
          collectedToday = uniqById([...collectedToday, ...todayOnPage]);
          mode = "today";
          sawToday = true;
        } else if (sawToday) {
          boundaryReached = true;
          break;
        }

        const filled =
          mode === "today"
            ? collectedToday.length >= DANAS_PAGE_SIZE
            : collectedAll.length >= DANAS_PAGE_SIZE;
        if (filled) break;

        sourcePage += 1;
      }

      const danasBase =
        mode === "today" && collectedToday.length
          ? collectedToday
          : collectedAll;
      const { posts: danasInitial, mode: computedMode } = buildDanasFromList(
        danasBase,
        DANAS_PAGE_SIZE,
      );
      mode = computedMode;

      danasModeRef.current = mode;
      danasSourcePageRef.current = (lastFetchedPage || 0) + 1;
      danasExhaustedRef.current =
        mode === "today" ? boundaryReached : exhausted;

      setGroupedPosts((prev) => {
        const updated = { ...prev, [DANAS_KEY]: danasInitial };
        saveGroupedPostsToCache(updated);
        return updated;
      });
      setCurrentPage((prev) => ({ ...prev, [DANAS_KEY]: 1 }));
      setHasMore((prev) => ({
        ...prev,
        [DANAS_KEY]: !danasExhaustedRef.current,
      }));

      const daily = await refreshDailyCircles({
        baseToday: today,
        days: DAILY_CIRCLES_DAYS,
        postsPerDay: DAILY_CIRCLES_POSTS_PER_DAY,
      });
      setDailyCirclesPosts(daily);

      return danasInitial;
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const saveGroupedPostsToCache = createGroupedPostsCacheSaver({
    danasKey: DANAS_KEY,
    homeCategories: HOME_CATEGORIES_ORDER,
    homePageSize: HOME_PAGE_SIZE,
    extraLimits: {
      [MAIN_NEWS_KEY]: MAIN_NEWS_PAGE_SIZE,
      Kolumne: 1,
      Događaji: 1,
    },
  });

  const TTL_MS = 15 * 60 * 1000;

  const extractCategoryNames = (data: any[]): string[] => {
    let names: string[] = [];
    for (const item of data) {
      if (typeof item === "string") {
        if (item !== "Latin | Ćirilica") names.push(item);
      } else if (typeof item === "object" && item?.title) {
        if (item.title !== "Latin | Ćirilica") names.push(item.title);
        if (Array.isArray(item.children)) {
          names = names.concat(extractCategoryNames(item.children));
        }
      }
    }
    return names;
  };

  const fetchCategories = async (): Promise<Record<string, number>> => {
    try {
      const data = await getCategories();
      setCategories(data);
      const map: Record<string, number> = {};
      data.forEach((c: { slug: string; id: number }) => {
        map[c.slug] = c.id;
      });
      setSlugToId(map);
      await AsyncStorage.setItem("slugToIdCache", JSON.stringify(map));
      return map;
    } catch (e) {
      console.warn("fetchCategories failed, using cached map if present:", e);
      const cached = await AsyncStorage.getItem("slugToIdCache");
      if (cached) {
        const map = JSON.parse(cached);
        setSlugToId(map);
        return map;
      }
    }
    return {};
  };

  const getCategoryId = async (
    categoryName: string,
    slugMapOverride?: Record<string, number>,
  ) => {
    const normalized = normalizeCategoryName(categoryName);

    const byNameInState = (categories || []).find(
      (c) => normalizeCategoryName(c?.name || "") === normalized,
    )?.id;
    if (typeof byNameInState === "number") return byNameInState;

    const slug = nameToSlugMap[categoryName];
    if (slug) {
      const effectiveSlugMap =
        slugMapOverride && Object.keys(slugMapOverride).length > 0
          ? slugMapOverride
          : slugToId;

      if (Object.keys(effectiveSlugMap).length === 0) {
        const map = await fetchCategories();
        const id = map[slug];
        if (typeof id === "number") return id;
      } else {
        const id = effectiveSlugMap[slug];
        if (typeof id === "number") return id;
      }

      try {
        const bySlug = await getCategoryBySlug(slug);
        if (Array.isArray(bySlug) && bySlug.length > 0 && bySlug[0]?.id) {
          return bySlug[0].id as number;
        }
      } catch {}
    }

    // Fallback for categories not in `nameToSlugMap` (or if the slug changed):
    // try to resolve by exact category name from the WP categories endpoint.
    try {
      const data = await getCategories();
      if (Array.isArray(data)) {
        const byName = data.find(
          (c: any) =>
            normalizeCategoryName(c?.name || "") === normalized &&
            typeof c?.id === "number",
        )?.id as number | undefined;
        if (typeof byName === "number") return byName;
      }
    } catch {}

    return undefined;
  };

  const getCategoryIdBySlug = async (categoryName: string) => {
    const slug = nameToSlugMap[categoryName];
    if (!slug) return undefined;
    try {
      const data = await getCategoryBySlug(slug);
      if (Array.isArray(data) && data.length > 0 && data[0]?.id) {
        return data[0].id as number;
      }
    } catch (e) {
      console.warn("getCategoryBySlug failed:", e);
    }
    return undefined;
  };

  const fetchCategoryFirstPage = async (
    categoryName: string,
    perPage: number,
    slugMapOverride?: Record<string, number>,
  ) => {
    const isTema = categoryName === "Crna hronika";
    const categoryId = isTema
      ? await getCategoryIdBySlug(categoryName)
      : await getCategoryId(categoryName, slugMapOverride);

    if (categoryId) {
      const fetched = await getPostsByCategoryId(categoryId, 1, perPage);
      if (Array.isArray(fetched)) return fetched as WPPost[];
    }

    const fallback = await getPostsBySearch(categoryName, 1, perPage);
    return Array.isArray(fallback) ? (fallback as WPPost[]) : [];
  };

  const fetchAllPosts = async ({ showLoader = true } = {}) => {
    if (showLoader) setLoading(true);
    try {
      const slugMap =
        Object.keys(slugToId).length > 0 ? slugToId : await fetchCategories();

      const today = new Date();
      const isPostToday = (p: WPPost) => {
        const d = p?.date ? new Date(p.date) : null;
        return d ? isSameLocalDate(d, today) : false;
      };

      let sourcePage = 1;
      let lastFetchedPage = 0;
      let collectedAll: WPPost[] = [];
      let collectedToday: WPPost[] = [];
      let mode: "today" | "fallback" = "fallback";
      let exhausted = false;
      let sawToday = false;
      let danasBoundaryReached = false;

      while (sourcePage <= 6) {
        const latest = (await getLatestPosts(
          sourcePage,
          DANAS_SOURCE_PAGE_SIZE,
        )) as WPPost[];

        if (!Array.isArray(latest) || latest.length === 0) {
          exhausted = true;
          break;
        }
        lastFetchedPage = sourcePage;

        collectedAll = uniqById([...collectedAll, ...latest]);
        const todayOnPage = latest.filter(isPostToday);
        if (todayOnPage.length) {
          collectedToday = uniqById([...collectedToday, ...todayOnPage]);
          mode = "today";
          sawToday = true;
        } else if (sawToday) {
          danasBoundaryReached = true;
          break;
        }

        const danasFilled =
          mode === "today"
            ? collectedToday.length >= DANAS_PAGE_SIZE
            : collectedAll.length >= DANAS_PAGE_SIZE;
        if (danasFilled) break;

        sourcePage += 1;
      }

      const danasBase =
        mode === "today" && collectedToday.length
          ? collectedToday
          : collectedAll;
      const { posts: danasInitial, mode: computedMode } = buildDanasFromList(
        danasBase,
        DANAS_PAGE_SIZE,
      );
      mode = computedMode;

      danasModeRef.current = mode;
      danasSourcePageRef.current = (lastFetchedPage || 0) + 1;
      danasExhaustedRef.current =
        mode === "today" ? danasBoundaryReached : exhausted;

      const dailyPromise = refreshDailyCircles({
        baseToday: today,
        days: DAILY_CIRCLES_DAYS,
        postsPerDay: DAILY_CIRCLES_POSTS_PER_DAY,
      })
        .then((flat) => {
          setDailyCirclesPosts(flat);
        })
        .catch(() => {});

      const fetchedByCategory: Record<string, WPPost[]> = {};

      const CONCURRENCY = 4;
      const queue = [...HOME_CATEGORIES_ORDER];
      const running: Promise<void>[] = [];

      const runNext = async (name: string) => {
        try {
          const pageSize =
            name === "Kolumne" || name === "Događaji" ? 1 : HOME_PAGE_SIZE;
          fetchedByCategory[name] = await fetchCategoryFirstPage(
            name,
            pageSize,
            slugMap,
          );
        } catch (err) {
          console.error(`Greška za kategoriju ${name}:`, err);
          fetchedByCategory[name] = [];
        }
      };

      while (queue.length || running.length) {
        while (running.length < CONCURRENCY && queue.length) {
          const name = queue.shift() as string;
          const p = runNext(name).finally(() => {
            const idx = running.indexOf(p);
            if (idx >= 0) running.splice(idx, 1);
          });
          running.push(p);
        }
        if (running.length) await Promise.race(running);
      }

      // "Glavna vest" (main headline) for the home carousel:
      // - If the newest post matches the cached newest post, keep cached list.
      // - If it differs, fetch a fresh list.
      try {
        let mainId = slugMap[MAIN_NEWS_SLUG];
        if (!mainId) {
          const bySlug = await getCategoryBySlug(MAIN_NEWS_SLUG);
          if (Array.isArray(bySlug) && bySlug.length > 0 && bySlug[0]?.id) {
            mainId = bySlug[0].id as number;
          }
        }

        if (mainId) {
          let cachedList = groupedPosts[MAIN_NEWS_KEY] || [];
          let cachedTopId = cachedList[0]?.id;
          if (!cachedTopId) {
            try {
              const cacheRaw = await AsyncStorage.getItem("groupedPostsCache");
              if (cacheRaw) {
                const { data } = JSON.parse(cacheRaw);
                if (data?.[MAIN_NEWS_KEY] && data[MAIN_NEWS_KEY].length) {
                  cachedList = data[MAIN_NEWS_KEY] as WPPost[];
                  cachedTopId = cachedList[0]?.id;
                }
              }
            } catch {}
          }
          const head = (await getPostsByCategoryId(mainId, 1, 1)) as WPPost[];
          const headId = Array.isArray(head) ? head[0]?.id : undefined;

          if (
            cachedTopId &&
            headId &&
            cachedTopId === headId &&
            cachedList.length >= MAIN_NEWS_PAGE_SIZE
          ) {
            fetchedByCategory[MAIN_NEWS_KEY] = cachedList;
          } else {
            const full = (await getPostsByCategoryId(
              mainId,
              1,
              MAIN_NEWS_PAGE_SIZE,
            )) as WPPost[];
            fetchedByCategory[MAIN_NEWS_KEY] = Array.isArray(full) ? full : [];
          }
        } else if (groupedPosts[MAIN_NEWS_KEY]) {
          fetchedByCategory[MAIN_NEWS_KEY] = groupedPosts[MAIN_NEWS_KEY] || [];
        }
      } catch (e) {
        console.warn(`[${MAIN_NEWS_KEY}] Failed to refresh:`, e);
        if (groupedPosts[MAIN_NEWS_KEY]) {
          fetchedByCategory[MAIN_NEWS_KEY] = groupedPosts[MAIN_NEWS_KEY] || [];
        }
      }

      await dailyPromise;

      setGroupedPosts((prev) => {
        const updated: Record<string, WPPost[]> = {
          ...prev,
          ...fetchedByCategory,
        };
        delete updated["Naslovna"];
        updated[DANAS_KEY] = danasInitial;
        saveGroupedPostsToCache(updated);
        return updated;
      });

      setCurrentPage((prev) => ({
        ...prev,
        ...Object.fromEntries(HOME_CATEGORIES_ORDER.map((n) => [n, 1])),
        [DANAS_KEY]: 1,
      }));
      setHasMore((prev) => ({
        ...prev,
        ...Object.fromEntries(HOME_CATEGORIES_ORDER.map((n) => [n, false])),
        [DANAS_KEY]: !danasExhaustedRef.current,
      }));

      setPosts([]);
    } catch (err) {
      console.error("Greška pri dohvatanju postova za Naslovna/Danas:", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const fetchPostsForCategory = async (
    categoryName: string,
    page: number = 1,
    append: boolean = false,
    forceRefresh: boolean = false,
  ) => {
    if (!categoryName) {
      return;
    }

    const isNaslovna = categoryName.toLowerCase() === "naslovna";
    if (page === 1 && !append && !forceRefresh && isNaslovna) {
      const hasAnyHomeContent =
        HOME_CATEGORIES_ORDER.some((n) => (groupedPosts[n]?.length || 0) > 0) ||
        (groupedPosts[DANAS_KEY]?.length || 0) > 0 ||
        (groupedPosts[MAIN_NEWS_KEY]?.length || 0) > 0;

      if (hasAnyHomeContent) {
        setPosts([]);
        setCurrentPage((prev) => ({ ...prev, [categoryName]: 1 }));
        setHasMore((prev) => ({ ...prev, [categoryName]: false }));
        return;
      }
    }

    if (page === 1) setLoading(true);
    else setLoadingMore(true);

    if (categoryName === DANAS_KEY) {
      if (page === 1 && !append) {
        console.log("[Danas] Kliknuto na kategoriju Danas");

        if (
          groupedPosts[DANAS_KEY] &&
          groupedPosts[DANAS_KEY].length &&
          !forceRefresh
        ) {
          setPosts(groupedPosts[DANAS_KEY]);
          setCurrentPage((prev) => ({ ...prev, [categoryName]: 1 }));
          setHasMore((prev) => ({
            ...prev,
            [categoryName]: prev[categoryName] ?? !danasExhaustedRef.current,
          }));
          setLoading(false);
          refreshDanasOnly({ showLoader: false })
            .then((fresh) => {
              const currentTopId = groupedPosts[DANAS_KEY]?.[0]?.id;
              const freshTopId = fresh?.[0]?.id;
              if (freshTopId && freshTopId !== currentTopId) {
                setPosts(fresh);
              }
            })
            .catch(() => {});
          return;
        }

        const cacheRaw = await AsyncStorage.getItem("groupedPostsCache");
        let loadedFromCache = false;
        if (cacheRaw && !forceRefresh) {
          try {
            const { data } = JSON.parse(cacheRaw);
            if (data[DANAS_KEY] && data[DANAS_KEY].length) {
              setGroupedPosts(data);
              setPosts(data[DANAS_KEY]);
              setCurrentPage((prev) => ({ ...prev, [categoryName]: 1 }));
              setHasMore((prev) => ({
                ...prev,
                [categoryName]: prev[categoryName] ?? true,
              }));
              setLoading(false);
              loadedFromCache = true;
              return;
            }
          } catch (cacheError) {
            console.warn("[Danas] Cache parsing failed:", cacheError);
            if (
              cacheError instanceof Error &&
              cacheError.message.includes(
                "Row too big to fit into CursorWindow",
              )
            ) {
              try {
                await AsyncStorage.removeItem("groupedPostsCache");
              } catch {}
            }
          }
        }

        if (!loadedFromCache || forceRefresh) {
          try {
            const fresh = await refreshDanasOnly({ showLoader: true });
            setPosts(fresh || []);
            setCurrentPage((prev) => ({ ...prev, [categoryName]: 1 }));
            setHasMore((prev) => ({
              ...prev,
              [categoryName]: prev[categoryName] ?? !danasExhaustedRef.current,
            }));
          } catch (err) {
            console.error("[Danas] Greška pri osvežavanju Danas:", err);
            try {
              await fetchAllPosts({ showLoader: true });
              const cacheAfter =
                await AsyncStorage.getItem("groupedPostsCache");
              if (cacheAfter) {
                const { data: afterData } = JSON.parse(cacheAfter);
                const danas = (afterData[DANAS_KEY] || []) as WPPost[];
                setPosts(danas);
                setGroupedPosts(afterData);
                setCurrentPage((prev) => ({ ...prev, [categoryName]: 1 }));
                setHasMore((prev) => ({
                  ...prev,
                  [categoryName]:
                    prev[categoryName] ?? !danasExhaustedRef.current,
                }));
              } else {
                setPosts([]);
                setHasMore((prev) => ({ ...prev, [categoryName]: false }));
              }
            } catch {
              setPosts([]);
              setHasMore((prev) => ({ ...prev, [categoryName]: false }));
            }
          }
          setLoading(false);
          return;
        }

        setLoading(false);
        return;
      }

      if (append) {
        try {
          const existing = (groupedPosts[DANAS_KEY] || []) as WPPost[];
          const existingIds = new Set(existing.map((p) => p.id));

          let sourcePage = danasSourcePageRef.current || 1;
          let exhausted = danasExhaustedRef.current;
          let mode = danasModeRef.current;

          if (!mode) {
            mode = existing.some((p) => {
              const d = p?.date ? new Date(p.date) : null;
              return d ? isSameLocalDate(d, new Date()) : false;
            })
              ? "today"
              : "fallback";
            danasModeRef.current = mode;
          }

          const todayNow = new Date();
          const isPostToday = (p: WPPost) => {
            const d = p?.date ? new Date(p.date) : null;
            return d ? isSameLocalDate(d, todayNow) : false;
          };

          const newPosts: WPPost[] = [];
          let safety = 0;
          while (
            !exhausted &&
            newPosts.length < DANAS_PAGE_SIZE &&
            safety < 8
          ) {
            safety += 1;
            const latest = (await getLatestPosts(
              sourcePage,
              DANAS_SOURCE_PAGE_SIZE,
            )) as WPPost[];

            if (!Array.isArray(latest) || latest.length === 0) {
              exhausted = true;
              break;
            }

            const candidates =
              mode === "today" ? latest.filter(isPostToday) : latest;

            if (mode === "today" && candidates.length === 0) {
              exhausted = true;
              break;
            }

            for (const p of candidates) {
              if (!p || typeof p.id !== "number") continue;
              if (existingIds.has(p.id)) continue;
              if (newPosts.some((x) => x.id === p.id)) continue;
              newPosts.push(p);
              if (newPosts.length >= DANAS_PAGE_SIZE) break;
            }

            sourcePage += 1;
          }

          danasSourcePageRef.current = sourcePage;
          danasExhaustedRef.current = exhausted;

          const combined = uniqById([...existing, ...newPosts]).sort((a, b) =>
            (b.date || "").localeCompare(a.date || ""),
          );

          setPosts(combined);
          setGroupedPosts((prev) => {
            const updated = { ...prev, [DANAS_KEY]: combined };
            saveGroupedPostsToCache(updated);
            return updated;
          });
          setCurrentPage((prev) => ({ ...prev, [categoryName]: page }));
          setHasMore((prev) => ({
            ...prev,
            [categoryName]: !exhausted && newPosts.length > 0,
          }));
        } catch (err) {
          console.error("[Danas] Greška pri učitavanju još:", err);
          setHasMore((prev) => ({ ...prev, [categoryName]: false }));
        } finally {
          setLoadingMore(false);
        }
        return;
      }
    }

    if (
      page === 1 &&
      (groupedPosts[categoryName]?.length || 0) >= CATEGORY_PAGE_SIZE &&
      !append &&
      !forceRefresh
    ) {
      setPosts(groupedPosts[categoryName]);
      setCurrentPage((prev) => ({ ...prev, [categoryName]: 1 }));
      setHasMore((prev) => ({
        ...prev,
        [categoryName]: prev[categoryName] ?? true,
      }));
      setLoading(false);

      void (async () => {
        const isTema = categoryName === "Crna hronika";
        const idBg = isTema
          ? await getCategoryIdBySlug(categoryName)
          : await getCategoryId(categoryName);
        const idResolved = idBg;
        if (!idResolved) return;
        const fetchFn = getPostsByCategoryId;
        fetchFn(idResolved, 1, CATEGORY_PAGE_SIZE)
          .then((fresh) => {
            if (!fresh || !Array.isArray(fresh)) return;
            const current = groupedPosts[categoryName] || [];
            const currentTopId = current[0]?.id;
            const freshTopId = fresh[0]?.id;
            if (freshTopId && freshTopId !== currentTopId) {
              setGroupedPosts((prev) => {
                const temp = { ...prev, [categoryName]: fresh } as Record<
                  string,
                  WPPost[]
                >;
                saveGroupedPostsToCache(temp);
                return temp;
              });
              setPosts(fresh);
            }
          })
          .catch(() => {});
      })();
      return;
    }

    if (categoryName.toLowerCase() === "naslovna") {
      if (page === 1) {
        const hasStartupInMemory =
          HOME_CATEGORIES_ORDER.every((n) =>
            Object.prototype.hasOwnProperty.call(groupedPosts, n),
          ) &&
          Object.prototype.hasOwnProperty.call(groupedPosts, DANAS_KEY) &&
          Object.prototype.hasOwnProperty.call(groupedPosts, MAIN_NEWS_KEY);

        if (hasStartupInMemory && !forceRefresh) {
          setPosts([]);
          setCurrentPage((prev) => ({ ...prev, [categoryName]: 1 }));
          setHasMore((prev) => ({ ...prev, [categoryName]: false }));
          setLoading(false);
          return;
        }

        const cacheRaw = await AsyncStorage.getItem("groupedPostsCache");
        let loadedFromCache = false;
        if (cacheRaw && !forceRefresh) {
          try {
            const { data } = JSON.parse(cacheRaw);
            setGroupedPosts(data);
            setPosts([]);
            setCurrentPage((prev) => ({ ...prev, [categoryName]: 1 }));
            setHasMore((prev) => ({ ...prev, [categoryName]: false }));
            setLoading(false);
            loadedFromCache = true;

            fetchAllPosts({ showLoader: false }).catch(() => {});
          } catch (cacheError) {
            console.warn("[Naslovna] Cache parsing failed:", cacheError);
            if (
              cacheError instanceof Error &&
              cacheError.message.includes(
                "Row too big to fit into CursorWindow",
              )
            ) {
              try {
                await AsyncStorage.removeItem("groupedPostsCache");
              } catch {}
            }
          }
        }

        if (!loadedFromCache) {
          try {
            await fetchAllPosts({ showLoader: true });
          } catch (err) {
            console.error("Error fetching startup payload:", err);
          }
          setPosts([]);
          setCurrentPage((prev) => ({ ...prev, [categoryName]: 1 }));
          setHasMore((prev) => ({ ...prev, [categoryName]: false }));
          setLoading(false);
        }
        return;
      }
    }

    const isTema = categoryName === "Crna hronika";
    const categoryId = isTema
      ? await getCategoryIdBySlug(categoryName)
      : await getCategoryId(categoryName);
    const resolvedId = categoryId;
    if (resolvedId) {
      try {
        const fetched = await getPostsByCategoryId(
          resolvedId,
          page,
          CATEGORY_PAGE_SIZE,
        );
        if (append) {
          setPosts((prev) => [...prev, ...(fetched || [])]);
          setGroupedPosts((prev) => {
            const updated = { ...prev };
            const existing = updated[categoryName] || [];
            updated[categoryName] = [...existing, ...(fetched || [])];
            saveGroupedPostsToCache(updated);
            return updated;
          });
        } else {
          setPosts(fetched || []);
          setGroupedPosts((prev) => {
            const updated = { ...prev, [categoryName]: fetched || [] };
            saveGroupedPostsToCache(updated);
            return updated;
          });
        }
        setCurrentPage((prev) => ({ ...prev, [categoryName]: page }));
        setHasMore((prev) => ({
          ...prev,
          [categoryName]: (fetched || []).length === CATEGORY_PAGE_SIZE,
        }));
      } catch (err) {
        console.error("Error while fetching posts by ID:", err);
        if (!append) setPosts([]);
        setHasMore((prev) => ({ ...prev, [categoryName]: false }));
      }
      if (page === 1) setLoading(false);
      else setLoadingMore(false);
      return;
    }

    try {
      const fallbackPosts = await getPostsBySearch(
        categoryName,
        page,
        CATEGORY_PAGE_SIZE,
      );
      if (append) {
        setPosts((prev) => [...prev, ...(fallbackPosts || [])]);
        setGroupedPosts((prev) => {
          const updated = { ...prev };
          const existing = updated[categoryName] || [];
          updated[categoryName] = [...existing, ...(fallbackPosts || [])];
          saveGroupedPostsToCache(updated);
          return updated;
        });
      } else {
        setPosts(fallbackPosts || []);
        setGroupedPosts((prev) => {
          const updated = { ...prev, [categoryName]: fallbackPosts || [] };
          saveGroupedPostsToCache(updated);
          return updated;
        });
      }
      setCurrentPage((prev) => ({ ...prev, [categoryName]: page }));
      setHasMore((prev) => ({
        ...prev,
        [categoryName]: (fallbackPosts || []).length === CATEGORY_PAGE_SIZE,
      }));
    } catch (error) {
      console.error("Error with fallback search:", error);
      if (!append) setPosts([]);
      setHasMore((prev) => ({ ...prev, [categoryName]: false }));
    }
    if (page === 1) setLoading(false);
    else setLoadingMore(false);
  };

  const loadMorePosts = async (categoryName: string) => {
    if (!categoryName || loadingMore || !hasMore[categoryName]) return;

    const nextPage = (currentPage[categoryName] || 1) + 1;
    await fetchPostsForCategory(categoryName, nextPage, true);
  };

  const resetSearchPagination = () => {
    searchQueryRef.current = "";
    searchLocalPoolRef.current = [];
    searchLocalCursorRef.current = 0;
    searchRemotePageRef.current = 1;
    searchRemoteExhaustedRef.current = false;
    searchSeenIdsRef.current = new Set();
    setSearchHasMore(false);
    setSearchLoadingMore(false);
  };

  const collectSearchSourcePosts = async (): Promise<WPPost[]> => {
    let allPosts = uniqById([
      ...(Object.values(groupedPosts).flat() as WPPost[]),
      ...(posts || []),
    ]);

    if (allPosts.length) return allPosts;

    const cacheRaw = await AsyncStorage.getItem("groupedPostsCache");
    if (!cacheRaw) return [];

    const { data } = JSON.parse(cacheRaw);
    allPosts = uniqById((Object.values(data) as WPPost[][]).flat());
    return allPosts;
  };

  const pullRemoteSearchBatch = async (
    query: string,
    maxCount: number,
  ): Promise<WPPost[]> => {
    const next: WPPost[] = [];
    let safety = 0;

    while (
      next.length < maxCount &&
      !searchRemoteExhaustedRef.current &&
      safety < 10
    ) {
      safety += 1;
      const page = searchRemotePageRef.current;
      let fetched: WPPost[] = [];

      try {
        const remote = await getPostsBySearch(query, page, SEARCH_PAGE_SIZE);
        fetched = Array.isArray(remote) ? (remote as WPPost[]) : [];
      } catch (error) {
        console.error("Search remote fetch failed:", error);
        searchRemoteExhaustedRef.current = true;
        break;
      }

      searchRemotePageRef.current = page + 1;

      if (fetched.length === 0) {
        searchRemoteExhaustedRef.current = true;
        break;
      }

      if (fetched.length < SEARCH_PAGE_SIZE) {
        searchRemoteExhaustedRef.current = true;
      }

      const filtered = sortPostsNewestFirst(
        fetched.filter(
          (post) =>
            Boolean(post) &&
            typeof post.id === "number" &&
            matchesPostSearchQuery(post, query),
        ),
      );

      for (const post of filtered) {
        if (searchSeenIdsRef.current.has(post.id)) continue;
        searchSeenIdsRef.current.add(post.id);
        next.push(post);
        if (next.length >= maxCount) break;
      }
    }

    return next;
  };

  const searchPostsFromCache = async (query: string): Promise<WPPost[]> => {
    const normalizedQuery = String(query || "").trim();
    resetSearchPagination();
    searchQueryRef.current = normalizedQuery;

    if (!normalizedQuery) {
      setPosts([]);
      return [];
    }

    setSearchLoading(true);
    try {
      const allPosts = await collectSearchSourcePosts();
      const localMatches = sortPostsNewestFirst(
        uniqById(
          allPosts.filter((post) => matchesPostSearchQuery(post, normalizedQuery)),
        ),
      );

      searchLocalPoolRef.current = localMatches;

      const initialLocal = localMatches.slice(0, SEARCH_PAGE_SIZE);
      searchLocalCursorRef.current = initialLocal.length;
      for (const post of initialLocal) {
        searchSeenIdsRef.current.add(post.id);
      }

      let initialResults = initialLocal;
      if (initialResults.length < SEARCH_PAGE_SIZE) {
        const remoteFill = await pullRemoteSearchBatch(
          normalizedQuery,
          SEARCH_PAGE_SIZE - initialResults.length,
        );
        initialResults = sortPostsNewestFirst(
          uniqById([...initialResults, ...remoteFill]),
        );
      }

      const hasLocalMore =
        searchLocalCursorRef.current < searchLocalPoolRef.current.length;
      const hasRemoteMore = !searchRemoteExhaustedRef.current;
      setSearchHasMore(hasLocalMore || hasRemoteMore);

      setPosts(initialResults);
      return initialResults;
    } catch (error) {
      console.error("Greška u searchPostsFromCache:", error);
      if (
        error instanceof Error &&
        error.message.includes("Row too big to fit into CursorWindow")
      ) {
        try {
          await AsyncStorage.removeItem("groupedPostsCache");
          console.log("Corrupted cache cleared during search");
        } catch (clearError) {
          console.warn(
            "Failed to clear corrupted cache during search:",
            clearError,
          );
        }
      }
      setPosts([]);
      setSearchHasMore(false);
      return [];
    } finally {
      setSearchLoading(false);
    }
  };

  const loadMoreSearchPosts = async (): Promise<WPPost[]> => {
    const query = searchQueryRef.current.trim();
    if (!query || searchLoadingMore || !searchHasMore) return [];

    setSearchLoadingMore(true);
    try {
      const nextBatch: WPPost[] = [];

      const start = searchLocalCursorRef.current;
      const end = start + SEARCH_PAGE_SIZE;
      const localSlice = searchLocalPoolRef.current.slice(start, end);
      searchLocalCursorRef.current = start + localSlice.length;

      for (const post of localSlice) {
        if (searchSeenIdsRef.current.has(post.id)) continue;
        searchSeenIdsRef.current.add(post.id);
        nextBatch.push(post);
      }

      if (nextBatch.length < SEARCH_PAGE_SIZE && !searchRemoteExhaustedRef.current) {
        const remoteFill = await pullRemoteSearchBatch(
          query,
          SEARCH_PAGE_SIZE - nextBatch.length,
        );
        nextBatch.push(...remoteFill);
      }

      if (nextBatch.length) {
        setPosts((prev) => sortPostsNewestFirst(uniqById([...prev, ...nextBatch])));
      }

      const hasLocalMore =
        searchLocalCursorRef.current < searchLocalPoolRef.current.length;
      const hasRemoteMore = !searchRemoteExhaustedRef.current;
      setSearchHasMore(hasLocalMore || hasRemoteMore);

      return nextBatch;
    } finally {
      setSearchLoadingMore(false);
    }
  };

  const lokalItem = menuData.find(
    (item): item is { title: string; children: any[] } =>
      typeof item === "object" && "children" in item && item.title === "Lokal",
  );
  const lokalNames = extractCategoryNames(lokalItem?.children || []);

  const homeGroupedPosts = Object.fromEntries(
    HOME_CATEGORIES_ORDER.map((name) => [
      name,
      (groupedPosts[name] || []).slice(
        0,
        name === "Kolumne" || name === "Događaji" ? 1 : HOME_PAGE_SIZE,
      ),
    ]),
  ) as Record<string, WPPost[]>;

  const generalGroupedPosts = Object.fromEntries(
    Object.entries(groupedPosts).filter(
      ([key]) =>
        key !== "Naslovna" && key !== DANAS_KEY && !lokalNames.includes(key),
    ),
  );

  const lokalGroupedPosts = Object.fromEntries(
    Object.entries(groupedPosts).filter(([key]) => lokalNames.includes(key)),
  );

  const findChildren = (title: string): string[] => {
    const lokal = menuData.find(
      (item) => typeof item === "object" && item.title === "Lokal",
    );
    if (!lokal || typeof lokal !== "object") return [];
    const section = (lokal.children || []).find(
      (child: any) => typeof child === "object" && child.title === title,
    ) as any;
    return section && section.children
      ? extractCategoryNames(section.children)
      : [];
  };

  const beogradNames = findChildren("Beograd");
  const okruziNames = findChildren("Okruzi");
  const gradoviNames = ["Gradovi"];

  const beogradGroupedPosts = Object.fromEntries(
    Object.entries(groupedPosts).filter(([key]) => beogradNames.includes(key)),
  );

  const okruziGroupedPosts = Object.fromEntries(
    Object.entries(groupedPosts).filter(([key]) => okruziNames.includes(key)),
  );

  const gradoviGroupedPosts = Object.fromEntries(
    Object.entries(groupedPosts).filter(([key]) => gradoviNames.includes(key)),
  );

  useEffect(() => {
    const init = async () => {
      let hasStartupPayload = false;
      let loadedDailyCircles = false;
      let hasAnyCachedPosts = false;

      const applyGroupedCache = async (cacheRaw: string) => {
        const { data, timestamp } = JSON.parse(cacheRaw);
        const updated = { ...data } as Record<string, WPPost[]>;

        if (!updated[DANAS_KEY] || updated[DANAS_KEY].length === 0) {
          const danas = buildDanasForToday(updated, DANAS_PAGE_SIZE);
          if (danas.length > 0) updated[DANAS_KEY] = danas;
          else delete updated[DANAS_KEY];
        }

        setGroupedPosts(updated);
        try {
          await saveGroupedPostsToCache(updated);
        } catch {}

        const hasHome = HOME_CATEGORIES_ORDER.every((n) =>
          Object.prototype.hasOwnProperty.call(updated, n),
        );
        const hasDanas = Object.prototype.hasOwnProperty.call(
          updated,
          DANAS_KEY,
        );
        const hasMainNews = Object.prototype.hasOwnProperty.call(
          updated,
          MAIN_NEWS_KEY,
        );
        hasStartupPayload = hasHome && hasDanas && hasMainNews;

        hasAnyCachedPosts = Object.values(updated).some(
          (arr) => Array.isArray(arr) && arr.length > 0,
        );

        const isStale = !timestamp || Date.now() - timestamp > TTL_MS;
        if (isStale) fetchAllPosts({ showLoader: false }).catch(() => {});

        if (hasAnyCachedPosts) setInitialized(true);
      };

      try {
        const cacheRaw = await AsyncStorage.getItem("groupedPostsCache");
        if (cacheRaw) await applyGroupedCache(cacheRaw);
      } catch (e) {
        console.warn("Failed to read groupedPostsCache:", e);
        if (
          e instanceof Error &&
          e.message.includes("Row too big to fit into CursorWindow")
        ) {
          console.warn("Cache is too large, clearing and refetching...");
          try {
            await AsyncStorage.removeItem("groupedPostsCache");
            console.log("Cache cleared successfully");
          } catch (clearError) {
            console.warn("Failed to clear corrupted cache:", clearError);
          }
        }
      }

      // If we didn't have anything cached, give the startup prefetch a short chance to populate the cache
      // (it may already be in-flight from `app/_layout.tsx`).
      if (!hasAnyCachedPosts) {
        try {
          await Promise.race([
            prefetchNaslovnaStartupPayload(),
            new Promise((r) => setTimeout(r, 1200)),
          ]);

          const cacheAfter = await AsyncStorage.getItem("groupedPostsCache");
          if (cacheAfter) await applyGroupedCache(cacheAfter);
        } catch {}
      }

      try {
        const { posts: daily, hasAllDays } = await loadDailyCirclesFromCache({
          days: DAILY_CIRCLES_DAYS,
        });
        if (daily.length) setDailyCirclesPosts(daily);
        loadedDailyCircles = hasAllDays;
      } catch (e) {
        console.warn("Failed to read dailyCirclesCache:", e);
      }

      await fetchCategories();

      try {
        if (!hasStartupPayload) {
          if (hasAnyCachedPosts) {
            fetchAllPosts({ showLoader: false }).catch(() => {});
            setInitialized(true);
          } else {
            await fetchAllPosts({ showLoader: true });
            setInitialized(true);
          }
        } else if (!loadedDailyCircles) {
          fetchAllPosts({ showLoader: false }).catch(() => {});
        }
      } catch (e) {
        console.warn("Prefetch skipped:", e);
        if (!hasStartupPayload) setInitialized(true);
      }
    };

    init();
  }, []);

  return {
    categories,
    posts,
    loading,
    searchLoading,
    fetchPostsForCategory,
    refreshHome: () => fetchAllPosts({ showLoader: false }),
    refreshDanas: () => refreshDanasOnly({ showLoader: false }),
    searchPostsFromCache,
    loadMoreSearchPosts,
    resetSearchPagination,
    searchHasMore,
    searchLoadingMore,
    setPosts,
    groupedPosts,
    homeGroupedPosts,
    homeCategoryOrder: [...HOME_CATEGORIES_ORDER],
    dailyCirclesPosts,
    lokalGroupedPosts,
    generalGroupedPosts,
    beogradGroupedPosts,
    gradoviGroupedPosts,
    okruziGroupedPosts,
    initialized,
    loadMorePosts,
    loadingMore,
    hasMore,
    currentPage,
  };
};
