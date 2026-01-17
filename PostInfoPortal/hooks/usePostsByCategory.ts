import { nameToSlugMap } from "@/constants/nameToSlugMap";
import { menuData } from "@/types/menuData";
import { WPPost } from "@/types/wp";
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
import { isSameLocalDate, normalizeText, uniqById } from "./postsUtils";

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
  const [dailyCirclesPosts, setDailyCirclesPosts] = useState<WPPost[]>([]);

  const DANAS_KEY = "Danas";

  const HOME_CATEGORIES_ORDER = [
    "Politika",
    "Svet",
    "Ekonomija",
    "Sport",
    "Crna hronika",
    "Beograd",
    "Lokal",
    "Region",
  ] as const;

  const HOME_PAGE_SIZE = 4;
  const CATEGORY_PAGE_SIZE = 10;
  const DANAS_PAGE_SIZE = 10;
  const DANAS_SOURCE_PAGE_SIZE = 30;
  const DAILY_CIRCLES_DAYS = 6;
  const DAILY_CIRCLES_POSTS_PER_DAY = 5;

  const danasSourcePageRef = useRef(1);
  const danasModeRef = useRef<"today" | "fallback" | null>(null);
  const danasExhaustedRef = useRef(false);

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

  const getCategoryId = async (categoryName: string) => {
    const slug = nameToSlugMap[categoryName];
    if (!slug) return undefined;
    if (Object.keys(slugToId).length === 0) {
      const map = await fetchCategories();
      return map[slug];
    }
    return slugToId[slug];
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
        const isTema = name === "Crna hronika";
        const slug = nameToSlugMap[name];
        const categoryId = isTema
          ? await getCategoryIdBySlug(name)
          : slug
            ? slugMap[slug]
            : undefined;

        if (!categoryId) return;
        try {
          const fetched = (await getPostsByCategoryId(
            categoryId,
            1,
            HOME_PAGE_SIZE,
          )) as WPPost[];
          fetchedByCategory[name] = Array.isArray(fetched) ? fetched : [];
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

    if (
      page === 1 &&
      !append &&
      !forceRefresh &&
      categoryName.toLowerCase() === "naslovna"
    ) {
      const hasStartupInMemory =
        HOME_CATEGORIES_ORDER.every((n) =>
          Object.prototype.hasOwnProperty.call(groupedPosts, n),
        ) && Object.prototype.hasOwnProperty.call(groupedPosts, DANAS_KEY);

      if (hasStartupInMemory) {
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
          ) && Object.prototype.hasOwnProperty.call(groupedPosts, DANAS_KEY);

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

  const searchPostsFromCache = async (query: string): Promise<WPPost[]> => {
    setSearchLoading(true);
    try {
      const normalizedQuery = normalizeText(query);
      let allPosts: WPPost[] = Object.values(groupedPosts).flat();
      if (!allPosts.length) {
        const cacheRaw = await AsyncStorage.getItem("groupedPostsCache");
        if (!cacheRaw) {
          setPosts([]);
          return [];
        }
        const { data } = JSON.parse(cacheRaw);
        allPosts = (Object.values(data) as WPPost[][]).flat();
      }
      const filtered = allPosts.filter((post) => {
        const title = normalizeText(post.title?.rendered || "");
        return title.includes(normalizedQuery);
      });

      setPosts(filtered);
      return filtered;
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
      return [];
    } finally {
      setSearchLoading(false);
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
      (groupedPosts[name] || []).slice(0, HOME_PAGE_SIZE),
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

      try {
        const cacheRaw = await AsyncStorage.getItem("groupedPostsCache");
        if (cacheRaw) {
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
          hasStartupPayload = hasHome && hasDanas;

          const isStale = !timestamp || Date.now() - timestamp > TTL_MS;
          if (isStale) {
            fetchAllPosts({ showLoader: false }).catch(() => {});
          }

          if (hasStartupPayload) setInitialized(true);
        }
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
          await fetchAllPosts({ showLoader: true });
          setInitialized(true);
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
