import { nameToSlugMap } from '@/constants/nameToSlugMap';
import { menuData } from '@/types/menuData';
import { WPPost } from '@/types/wp';
import { getCategories, getPostsByCategoryId, getPostsBySearch } from '@/utils/wpApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export const usePostsByCategory = () => {
    const [categories, setCategories] = useState<{ id: number; name: string; slug: string }[]>([]);
    const [posts, setPosts] = useState<WPPost[]>([]);
    const [groupedPosts, setGroupedPosts] = useState<Record<string, WPPost[]>>({});
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [slugToId, setSlugToId] = useState<Record<string, number>>({});
    const [initialized, setInitialized] = useState(false);
    const [currentPage, setCurrentPage] = useState<Record<string, number>>({});
    const [hasMore, setHasMore] = useState<Record<string, boolean>>({});
    const [loadingMore, setLoadingMore] = useState(false);

    const DANAS_YEAR = 2025;
    const DANAS_KEY = 'Danas';

    // Build "Danas" from posts whose local date equals today's local date
    const isSameLocalDate = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    const buildDanasForToday = (
        all: Record<string, WPPost[]>,
        limit = 50
    ): WPPost[] => {
        const today = new Date();
        // merge all posts except synthetic/home
        const mergedAll = Object.entries(all)
            .filter(([name]) => name !== 'Naslovna' && name !== 'Danas')
            .flatMap(([, posts]) => posts || []);

        // dedupe by ID to avoid duplicate keys and touch conflicts
        const mergedMap = new Map<number, WPPost>();
        for (const p of mergedAll) {
            if (p && typeof p.id === 'number') mergedMap.set(p.id, p);
        }
        const merged = Array.from(mergedMap.values());

        const filtered = merged.filter((p) => {
            const d = p?.date ? new Date(p.date) : null;
            return d ? isSameLocalDate(d, today) : false;
        });

        const source = filtered.length ? filtered : merged;
        // newest first 
        source.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        return source.slice(0, limit);
    };

    // simplifies post so it can be stored in cache (only title and picture) and use less space
    const simplifyPost = (post: WPPost): Partial<WPPost> => ({
        id: post.id,
        title: post.title,
        excerpt: post.excerpt, // keep short summary
        // omit heavy HTML content for list cache
        date: post.date,
        _embedded: { 'wp:featuredmedia': post._embedded?.['wp:featuredmedia'] }
    });

    // saves lightweight posts to Async storage under "groupedPostsCache" key
    // timestamp is there also, so i can check if the cache is out of date
    const saveGroupedPostsToCache = async (grouped: Record<string, WPPost[]>) => {
        try {
            const lightweight = Object.fromEntries(
                Object.entries(grouped).map(([k, arr]) => [k, (arr || []).map(simplifyPost)])
            );
            const payload = { data: lightweight, timestamp: Date.now() };
            const jsonString = JSON.stringify(payload);

            // Check if the JSON string is too large (rough estimate: 1MB limit for AsyncStorage)
            if (jsonString.length > 1000000) { // 1MB
                console.warn('Cache data too large, skipping save to prevent corruption');
                return;
            }

            await AsyncStorage.setItem('groupedPostsCache', jsonString);
        } catch (e) {
            console.error('Greška prilikom snimanja cache-a:', e);
            // If it's a storage size error, try to clear and save a smaller version
            if (e instanceof Error && e.message.includes('Row too big')) {
                console.warn('Cache save failed due to size, clearing cache');
                try {
                    await AsyncStorage.removeItem('groupedPostsCache');
                } catch (clearError) {
                    console.warn('Failed to clear cache after size error:', clearError);
                }
            }
        }
    };

    const TTL_MS = 15 * 60 * 1000; // 15 minutes

    // recursively goes through menuData and extracts all category/subcategory names
    const extractCategoryNames = (data: any[]): string[] => {
        let names: string[] = [];
        for (const item of data) {
            if (typeof item === 'string') {
                if (item !== 'Latin | Ćirilica') names.push(item);
            } else if (typeof item === 'object' && item?.title) {
                if (item.title !== 'Latin | Ćirilica') names.push(item.title);
                if (Array.isArray(item.children)) {
                    names = names.concat(extractCategoryNames(item.children));
                }
            }
        }
        return names;
    };

    // used to get all categories from WordPress and it creates a map slugToId
    const fetchCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(data);
            const map: Record<string, number> = {};
            data.forEach((c: { slug: string; id: number }) => { map[c.slug] = c.id; });
            setSlugToId(map);
            await AsyncStorage.setItem('slugToIdCache', JSON.stringify(map));
        } catch (e) {
            console.warn('fetchCategories failed, using cached map if present:', e);
            const cached = await AsyncStorage.getItem('slugToIdCache');
            if (cached) setSlugToId(JSON.parse(cached));
        }
    };

    const fetchAllPosts = async () => {
        setLoading(true);
        try {
            const categoriesToFetch = extractCategoryNames(menuData)
                .filter((n) => n !== 'Naslovna' && n !== DANAS_KEY); // "Danas" je synthetic

            const CONCURRENCY = 4;
            const queue = [...categoriesToFetch];
            const running: Promise<void>[] = [];

            const runNext = async (name: string) => {
                const slug = nameToSlugMap[name];
                const categoryId = slugToId[slug];
                if (!categoryId) return;
                try {
                    const fetched = await getPostsByCategoryId(categoryId, 1, 12);
                    setGroupedPosts((prev) => {
                        const temp = { ...prev, [name]: fetched || [] };
                        const danas = buildDanasForToday(temp, 50);
                        if (danas.length > 0) temp[DANAS_KEY] = danas; else delete temp[DANAS_KEY];
                        saveGroupedPostsToCache(temp);
                        return temp;
                    });
                } catch (err) {
                    console.error(`Greška za kategoriju ${name}:`, err);
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
                if (running.length) {
                    await Promise.race(running);
                }
            }

            setPosts([]);
        } catch (err) {
            console.error('Greška pri postepenom dohvatanju postova:', err);
            setGroupedPosts({});
        } finally {
            setLoading(false);
        }
    };


    const fetchPostsForCategory = async (categoryName: string, page: number = 1, append: boolean = false) => {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);

        if (!categoryName) {
            if (page === 1) setLoading(false);
            else setLoadingMore(false);
            return;
        }

        if (categoryName === 'Danas') {
            // For "Danas", we don't support pagination yet, just return all
            if (page === 1) {
                console.log('[Danas] Kliknuto na kategoriju Danas');
                setLoading(true);

                // if its in local memory
                console.log('[Danas] Proveravam groupedPosts iz memorije:', groupedPosts['Danas']?.length);
                if (groupedPosts['Danas'] && groupedPosts['Danas'].length) {
                    console.log('[Danas] Pronađeno u memoriji');
                    setPosts(groupedPosts['Danas']);
                    setCurrentPage(prev => ({ ...prev, [categoryName]: 1 }));
                    setHasMore(prev => ({ ...prev, [categoryName]: false })); // Danas doesn't paginate
                    setLoading(false);
                    return;
                }

                // try from cache
                const cacheRaw = await AsyncStorage.getItem('groupedPostsCache');
                console.log('[Danas] cacheRaw postoji?', !!cacheRaw);

                if (cacheRaw) {
                    try {
                        const { data } = JSON.parse(cacheRaw);
                        console.log('[Danas] Ključevi u kešu:', Object.keys(data));

                        // if it exists in cache
                        if (data['Danas'] && data['Danas'].length) {
                            console.log('[Danas] Pronađeno u kešu');
                            setGroupedPosts(data);
                            setPosts(data['Danas']);
                            setCurrentPage(prev => ({ ...prev, [categoryName]: 1 }));
                            setHasMore(prev => ({ ...prev, [categoryName]: false }));
                            setLoading(false);
                            return;
                        }

                        console.log('[Danas] Gradim listu postova za današnji datum iz keša');
                        const danas = buildDanasForToday(data, 50);
                        console.log('[Danas] Nađeno postova za danas:', danas.length);
                        setPosts(danas);

                        const updated = { ...data };
                        if (danas.length > 0) updated['Danas'] = danas; else delete updated['Danas'];

                        setGroupedPosts(updated);
                        await saveGroupedPostsToCache(updated);
                        setCurrentPage(prev => ({ ...prev, [categoryName]: 1 }));
                        setHasMore(prev => ({ ...prev, [categoryName]: false }));
                        setLoading(false);
                        return;
                    } catch (cacheError) {
                        console.warn('[Danas] Cache parsing failed:', cacheError);
                        // If cache is corrupted, clear it
                        if (cacheError instanceof Error && cacheError.message.includes('Row too big to fit into CursorWindow')) {
                            try {
                                await AsyncStorage.removeItem('groupedPostsCache');
                                console.log('[Danas] Corrupted cache cleared');
                            } catch (clearError) {
                                console.warn('[Danas] Failed to clear corrupted cache:', clearError);
                            }
                        }
                    }
                }

                // No cache: fetch latest categories then compute Danas from today's date
                console.log('[Danas] Nema keša — preuzimam sve kategorije pa računam Danas');
                try {
                    await fetchAllPosts();
                    // read from cache to be safe
                    const cacheAfter = await AsyncStorage.getItem('groupedPostsCache');
                    if (cacheAfter) {
                        const { data: afterData } = JSON.parse(cacheAfter);
                        const danas = buildDanasForToday(afterData, 50);
                        setPosts(danas);
                        const updated = { ...afterData };
                        if (danas.length > 0) updated['Danas'] = danas; else delete updated['Danas'];
                        setGroupedPosts(updated);
                        await saveGroupedPostsToCache(updated);
                        setCurrentPage(prev => ({ ...prev, [categoryName]: 1 }));
                        setHasMore(prev => ({ ...prev, [categoryName]: false }));
                    } else {
                        setPosts([]);
                    }
                } catch (err) {
                    console.error('[Danas] Greška pri preuzimanju za Danas:', err);
                    setPosts([]);
                }

                setLoading(false);
                return;
            }
        }

        if (page === 1 && groupedPosts[categoryName]?.length && !append) {
            // Serve from memory immediately for first page
            setPosts(groupedPosts[categoryName]);
            setCurrentPage(prev => ({ ...prev, [categoryName]: 1 }));
            setHasMore(prev => ({ ...prev, [categoryName]: true })); // Assume there might be more
            setLoading(false);
            // Background refresh to ensure newest
            const slugBg = nameToSlugMap[categoryName];
            const idBg = slugToId[slugBg];
            if (idBg) {
                getPostsByCategoryId(idBg, 1, 12).then((fresh) => {
                    if (!fresh || !Array.isArray(fresh)) return;
                    const current = groupedPosts[categoryName] || [];
                    const currentTopId = current[0]?.id;
                    const freshTopId = fresh[0]?.id;
                    if (freshTopId && freshTopId !== currentTopId) {
                        setGroupedPosts((prev) => {
                            const temp = { ...prev, [categoryName]: fresh } as Record<string, WPPost[]>;
                            const danas = buildDanasForToday(temp, 50);
                            if (danas.length > 0) temp[DANAS_KEY] = danas; else delete temp[DANAS_KEY];
                            saveGroupedPostsToCache(temp);
                            return temp;
                        });
                        setPosts(fresh);
                    }
                }).catch(()=>{});
            }
            return;
        }

        if (categoryName.toLowerCase() === 'naslovna') {
            if (page === 1) {
                const cacheRaw = await AsyncStorage.getItem('groupedPostsCache');
                if (cacheRaw) {
                    try {
                        const { data } = JSON.parse(cacheRaw);
                        setGroupedPosts(data);
                        if (data['Naslovna']) setPosts(data['Naslovna']);
                        setCurrentPage(prev => ({ ...prev, [categoryName]: 1 }));
                        setHasMore(prev => ({ ...prev, [categoryName]: false })); // Naslovna doesn't paginate
                        setLoading(false);
                        return;
                    } catch (cacheError) {
                        console.warn('[Naslovna] Cache parsing failed:', cacheError);
                        // If cache is corrupted, clear it
                        if (cacheError instanceof Error && cacheError.message.includes('Row too big to fit into CursorWindow')) {
                            try {
                                await AsyncStorage.removeItem('groupedPostsCache');
                                console.log('[Naslovna] Corrupted cache cleared');
                            } catch (clearError) {
                                console.warn('[Naslovna] Failed to clear corrupted cache:', clearError);
                            }
                        }
                    }
                }
                await fetchAllPosts();
                setCurrentPage(prev => ({ ...prev, [categoryName]: 1 }));
                setHasMore(prev => ({ ...prev, [categoryName]: false }));
                setLoading(false);
                return;
            }
        }

        // For pagination, fetch from API
        const slug = nameToSlugMap[categoryName];
        const categoryId = slugToId[slug];
        if (categoryId) {
            try {
                const fetched = await getPostsByCategoryId(categoryId, page, 12);
                if (append) {
                    setPosts(prev => [...prev, ...(fetched || [])]);
                    // Update groupedPosts for append case
                    setGroupedPosts(prev => {
                        const updated = { ...prev };
                        const existing = updated[categoryName] || [];
                        updated[categoryName] = [...existing, ...(fetched || [])];
                        saveGroupedPostsToCache(updated);
                        return updated;
                    });
                } else {
                    setPosts(fetched || []);
                    // Store in groupedPosts for future use
                    setGroupedPosts(prev => {
                        const updated = { ...prev, [categoryName]: fetched || [] };
                        const danas = buildDanasForToday(updated, 50);
                        if (danas.length > 0) updated[DANAS_KEY] = danas; else delete updated[DANAS_KEY];
                        saveGroupedPostsToCache(updated);
                        return updated;
                    });
                }
                setCurrentPage(prev => ({ ...prev, [categoryName]: page }));
                setHasMore(prev => ({ ...prev, [categoryName]: (fetched || []).length === 12 })); // If we got 12, there might be more
            } catch (err) {
                console.error('Error while fetching posts by ID:', err);
                if (!append) setPosts([]);
                setHasMore(prev => ({ ...prev, [categoryName]: false }));
            }
            if (page === 1) setLoading(false);
            else setLoadingMore(false);
            return;
        }

        // Fallback to search
        try {
            const fallbackPosts = await getPostsBySearch(categoryName, page, 12);
            if (append) {
                setPosts(prev => [...prev, ...(fallbackPosts || [])]);
                // Update groupedPosts for append case
                setGroupedPosts(prev => {
                    const updated = { ...prev };
                    const existing = updated[categoryName] || [];
                    updated[categoryName] = [...existing, ...(fallbackPosts || [])];
                    saveGroupedPostsToCache(updated);
                    return updated;
                });
            } else {
                setPosts(fallbackPosts || []);
                // Store in groupedPosts for future use
                setGroupedPosts(prev => {
                    const updated = { ...prev, [categoryName]: fallbackPosts || [] };
                    const danas = buildDanasForToday(updated, 50);
                    if (danas.length > 0) updated[DANAS_KEY] = danas; else delete updated[DANAS_KEY];
                    saveGroupedPostsToCache(updated);
                    return updated;
                });
            }
            setCurrentPage(prev => ({ ...prev, [categoryName]: page }));
            setHasMore(prev => ({ ...prev, [categoryName]: (fallbackPosts || []).length === 12 }));
        } catch (error) {
            console.error('Error with fallback search:', error);
            if (!append) setPosts([]);
            setHasMore(prev => ({ ...prev, [categoryName]: false }));
        }
        if (page === 1) setLoading(false);
        else setLoadingMore(false);
    };

    const loadMorePosts = async (categoryName: string) => {
        if (!categoryName || loadingMore || !hasMore[categoryName]) return;
        
        const nextPage = (currentPage[categoryName] || 1) + 1;
        await fetchPostsForCategory(categoryName, nextPage, true);
    };

    const normalizeText = (text: string) =>
        text.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, '').toLowerCase().trim();

    const searchPostsFromCache = async (query: string): Promise<WPPost[]> => {
        setSearchLoading(true);
        try {
            const normalizedQuery = normalizeText(query);
            let allPosts: WPPost[] = Object.values(groupedPosts).flat();
            if (!allPosts.length) {
                const cacheRaw = await AsyncStorage.getItem('groupedPostsCache');
                if (!cacheRaw) {
                    setPosts([]);
                    return [];
                }
                const { data } = JSON.parse(cacheRaw);
                allPosts = (Object.values(data) as WPPost[][]).flat();
            }
            const filtered = allPosts.filter((post) => {
                const title = normalizeText(post.title?.rendered || '');
                return title.includes(normalizedQuery);
            });

            setPosts(filtered);
            return filtered;
        } catch (error) {
            console.error('Greška u searchPostsFromCache:', error);
            // If cache is corrupted, clear it
            if (error instanceof Error && error.message.includes('Row too big to fit into CursorWindow')) {
                try {
                    await AsyncStorage.removeItem('groupedPostsCache');
                    console.log('Corrupted cache cleared during search');
                } catch (clearError) {
                    console.warn('Failed to clear corrupted cache during search:', clearError);
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
            typeof item === 'object' && 'children' in item && item.title === 'Lokal'
    );
    const lokalNames = extractCategoryNames(lokalItem?.children || []);

    const generalGroupedPosts = Object.fromEntries(
        Object.entries(groupedPosts).filter(
            ([key]) => key !== 'Naslovna' && key !== DANAS_KEY && !lokalNames.includes(key)
        )
    );

    const lokalGroupedPosts = Object.fromEntries(
        Object.entries(groupedPosts).filter(([key]) => lokalNames.includes(key))
    );

    const findChildren = (title: string): string[] => {
        const lokal = menuData.find((item) => typeof item === 'object' && item.title === 'Lokal');
        if (!lokal || typeof lokal !== 'object') return [];
        const section = (lokal.children || []).find(
            (child: any) => typeof child === 'object' && child.title === title
        ) as any;
        return section && section.children ? extractCategoryNames(section.children) : [];
    };

    const beogradNames = findChildren('Beograd');
    const okruziNames = findChildren('Okruzi');
    const gradoviNames = ['Gradovi'];

    const beogradGroupedPosts = Object.fromEntries(
        Object.entries(groupedPosts).filter(([key]) => beogradNames.includes(key))
    );

    const okruziGroupedPosts = Object.fromEntries(
        Object.entries(groupedPosts).filter(([key]) => okruziNames.includes(key))
    );

    const gradoviGroupedPosts = Object.fromEntries(
        Object.entries(groupedPosts).filter(([key]) => gradoviNames.includes(key))
    );

    // its called only once when the component is mounted.
    // then it tries to load groupedPosts from cache, or if timed it out calls fetchAllPosts().
    useEffect(() => {
        const init = async () => {
            let hydratedFromCache = false;

            // 1) Offline-first: try cache
            try {
                const cacheRaw = await AsyncStorage.getItem('groupedPostsCache');
                if (cacheRaw) {
                    const { data, timestamp } = JSON.parse(cacheRaw);
                    const danas = buildDanasForToday(data, 50);
                    const updated = { ...data };
                    if (danas.length > 0) updated[DANAS_KEY] = danas; else delete updated[DANAS_KEY];
                    setGroupedPosts(updated);
                    try { await saveGroupedPostsToCache(updated); } catch {}
                    hydratedFromCache = true;

                    // background refresh if stale
                    const isStale = !timestamp || (Date.now() - timestamp > TTL_MS);
                    if (isStale) {
                        fetchAllPosts().catch(() => {});
                    }

                    setInitialized(true);
                }
            } catch (e) {
                console.warn('Failed to read groupedPostsCache:', e);
                // If cache is corrupted (too large), clear it and refetch
                if (e instanceof Error && e.message.includes('Row too big to fit into CursorWindow')) {
                    console.warn('Cache is too large, clearing and refetching...');
                    try {
                        await AsyncStorage.removeItem('groupedPostsCache');
                        console.log('Cache cleared successfully');
                    } catch (clearError) {
                        console.warn('Failed to clear corrupted cache:', clearError);
                    }
                }
            }

            await fetchCategories();

            // if no cache, try to fetch
            try {
                if (!hydratedFromCache) {
                    await fetchAllPosts();
                    // initialize cache
                    setInitialized(true);
                }
            } catch (e) {
                console.warn('Prefetch skipped:', e);
                if (!hydratedFromCache) setInitialized(true);
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
        searchPostsFromCache,
        setPosts,
        groupedPosts,
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

