import { useEffect, useState } from 'react';
import { getCategories, getPostsByCategoryId, getPostsBySearch } from '@/utils/wpApi';
import { nameToSlugMap } from '@/constants/nameToSlugMap';
import { WPPost } from '@/types/wp';
import { menuData } from '@/types/menuData';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const usePostsByCategory = () => {
    const [categories, setCategories] = useState<{ id: number; name: string; slug: string }[]>([]);
    const [posts, setPosts] = useState<WPPost[]>([]);
    const [groupedPosts, setGroupedPosts] = useState<Record<string, WPPost[]>>({});
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [slugToId, setSlugToId] = useState<Record<string, number>>({});
    const [initialized, setInitialized] = useState(false);

    const DANAS_YEAR = 2025;
    const DANAS_KEY = 'Danas';

    const getPostYear = (post: WPPost): number | null => {
        const raw = (post?.date ?? '').toString();
        const m = raw.match(/^(\d{4})/);
        return m ? Number(m[1]) : null;
    };

    // merge all categories (except "Naslovna" and "Danas"), filter by year and sort newest first
    const buildDanasForYear = (
        all: Record<string, WPPost[]>,
        targetYear: number,
        limit = 50
    ): WPPost[] => {
        const merged = Object.entries(all)
            .filter(([name]) => name !== 'Naslovna' && name !== 'Danas')
            .flatMap(([, posts]) => posts || []);

        const filtered = merged.filter((p) => getPostYear(p) === targetYear);

        // if there is nothing for the year, make the "latest" fallback so that the UI is not empty
        const source = filtered.length ? filtered : merged;

        // sort from newest
        source.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        return source.slice(0, limit);
    };

    // simplifies post so it can be stored in cache (only title and picture) and use less space
    const simplifyPost = (post: WPPost): Partial<WPPost> => ({
        id: post.id,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
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
            await AsyncStorage.setItem('groupedPostsCache', JSON.stringify(payload));
        } catch (e) {
            console.error('Greška prilikom snimanja cache-a:', e);
        }
    };

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

            let earlyCount = 0;

            for (const name of categoriesToFetch) {
                const slug = nameToSlugMap[name];
                const categoryId = slugToId[slug];
                if (!categoryId) continue;

                getPostsByCategoryId(categoryId)
                    .then((fetched) => {
                        setGroupedPosts((prev) => {
                            const temp = { ...prev, [name]: fetched || [] };
                            const danas = buildDanasForYear(temp, DANAS_YEAR, 50);
                            if (danas.length > 0) temp[DANAS_KEY] = danas; else delete temp[DANAS_KEY];
                            saveGroupedPostsToCache(temp);
                            return temp;
                        });
                    })
                    .catch((err) => console.error(`Greška za kategoriju ${name}:`, err));

                if (earlyCount < 2) {
                    try {
                        const earlyPosts = await getPostsByCategoryId(categoryId);
                        earlyCount += 1;
                        setGroupedPosts((prev) => {
                            const temp = { ...prev, [name]: earlyPosts || [] };
                            const danas = buildDanasForYear(temp, DANAS_YEAR, 50);
                            if (danas.length > 0) temp[DANAS_KEY] = danas; else delete temp[DANAS_KEY];
                            saveGroupedPostsToCache(temp);
                            return temp;
                        });
                    } catch (e) {
                        console.error(`Early fetch greška za ${name}:`, e);
                    }
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


    const fetchPostsForCategory = async (categoryName: string) => {
        setLoading(true);

        if (!categoryName) {
            setLoading(false);
            return;
        }

        if (categoryName === 'Danas') {
            console.log('[Danas] Kliknuto na kategoriju Danas');
            setLoading(true);

            // if its in local memory
            console.log('[Danas] Proveravam groupedPosts iz memorije:', groupedPosts['Danas']?.length);
            if (groupedPosts['Danas'] && groupedPosts['Danas'].length) {
                console.log('[Danas] Pronađeno u memoriji');
                setPosts(groupedPosts['Danas']);
                setLoading(false);
                return;
            }

            // try from cache
            const cacheRaw = await AsyncStorage.getItem('groupedPostsCache');
            console.log('[Danas] cacheRaw postoji?', !!cacheRaw);

            if (cacheRaw) {
                const { data } = JSON.parse(cacheRaw);
                console.log('[Danas] Ključevi u kešu:', Object.keys(data));

                // if it exists in cache
                if (data['Danas'] && data['Danas'].length) {
                    console.log('[Danas] Pronađeno u kešu');
                    setGroupedPosts(data);
                    setPosts(data['Danas']);
                    setLoading(false);
                    return;
                }

                // currently tries to find posts for 2025 (there is none) then does fallback to 2024
                console.log('[Danas] Gradim listu postova iz 2025 iz keša');
                const danas = buildDanasForYear(data, DANAS_YEAR, 50);
                console.log('[Danas] Nađeno postova za 2025:', danas.length);
                setPosts(danas);

                const updated = { ...data };
                if (danas.length > 0) updated['Danas'] = danas;
                else delete updated['Danas'];

                setGroupedPosts(updated);
                await saveGroupedPostsToCache(updated);

                setLoading(false);
                return;
            }

            // fallback
            console.log('[Danas] Nema keša — radim fallback pretragu');
            try {
                const fallbackPosts = await getPostsBySearch('2025');
                console.log('[Danas] Fallback pretraga vratila', fallbackPosts.length, 'postova');
                setPosts(fallbackPosts);
            } catch (err) {
                console.error('[Danas] Greška u fallback pretrazi:', err);
                setPosts([]);
            }

            setLoading(false);
            return;
        }

        if (groupedPosts[categoryName]?.length) {
            setPosts(groupedPosts[categoryName]);
            setLoading(false);
            return;
        }

        if (categoryName.toLowerCase() === 'naslovna') {
            const cacheRaw = await AsyncStorage.getItem('groupedPostsCache');
            if (cacheRaw) {
                const { data } = JSON.parse(cacheRaw);
                setGroupedPosts(data);
                if (data['Naslovna']) setPosts(data['Naslovna']);
                setLoading(false);
                return;
            }
            await fetchAllPosts();
            setLoading(false);
            return;
        }

        const cacheRaw = await AsyncStorage.getItem('groupedPostsCache');
        if (cacheRaw) {
            const { data } = JSON.parse(cacheRaw);
            if (data[categoryName]?.length) {
                setPosts(data[categoryName]);
                setLoading(false);
                return;
            }
        }

        const slug = nameToSlugMap[categoryName];
        const categoryId = slugToId[slug];
        if (categoryId) {
            try {
                const fetched = await getPostsByCategoryId(categoryId);
                setPosts(fetched || []);
            } catch (err) {
                console.error('Error while fetching posts by ID:', err);
                setPosts([]);
            }
            setLoading(false);
            return;
        }

        try {
            const fallbackPosts = await getPostsBySearch(categoryName);
            setPosts(fallbackPosts || []);
        } catch (error) {
            console.error('Error with fallback search:', error);
            setPosts([]);
        }
        setLoading(false);
    };

    const normalizeText = (text: string) =>
        text.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, '').toLowerCase().trim();

    const searchPostsFromCache = async (query: string): Promise<WPPost[]> => {
        setSearchLoading(true);
        try {
            const cacheRaw = await AsyncStorage.getItem('groupedPostsCache');
            if (!cacheRaw) {
                setPosts([]);
                return [];
            }
            const { data } = JSON.parse(cacheRaw);
            const allPosts: WPPost[] = (Object.values(data) as WPPost[][]).flat();

            const normalizedQuery = normalizeText(query);
            const filtered = allPosts.filter((post) => {
                const title = normalizeText(post.title?.rendered || '');
                return title.includes(normalizedQuery);
            });

            setPosts(filtered);
            return filtered;
        } catch (error) {
            console.error('Greška u searchPostsFromCache:', error);
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
                    const { data } = JSON.parse(cacheRaw);
                    const danas = buildDanasForYear(data, DANAS_YEAR, 50);
                    const updated = { ...data };
                    if (danas.length > 0) updated[DANAS_KEY] = danas; else delete updated[DANAS_KEY];
                    setGroupedPosts(updated);
                    try { await saveGroupedPostsToCache(updated); } catch {}
                    hydratedFromCache = true;

                    setInitialized(true);
                }
            } catch (e) {
                console.warn('Failed to read groupedPostsCache:', e);
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
    };
};