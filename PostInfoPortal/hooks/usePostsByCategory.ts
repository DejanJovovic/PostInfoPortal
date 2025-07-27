import { useEffect, useState } from 'react';
import { getCategories, getPostsByCategoryId, getPostsBySearch } from '@/utils/wpApi';
import { nameToSlugMap } from '@/constants/nameToSlugMap';
import { WPPost } from '@/types/wp';
import { menuData } from '@/types/menuData';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const usePostsByCategory = () => {
    const [categories, setCategories] = useState<{ id: number; name: string; slug: string }[]>([]);
    // used to save all available categories from api (naziv, id i slug)
    const [posts, setPosts] = useState([]);
    const [groupedPosts, setGroupedPosts] = useState<Record<string, WPPost[]>>({});
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [slugToId, setSlugToId] = useState<Record<string, number>>({});


    // simplifies post so it can be stored in cache (only title and picture) and use less space
    const simplifyPost = (post: WPPost): Partial<WPPost> => ({
        id: post.id,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        _embedded: {
            'wp:featuredmedia': post._embedded?.['wp:featuredmedia']
        }
    });

    // used to get all categories from WordPress and it creates a map slugToId
    const fetchCategories = async () => {
        const data = await getCategories();
        setCategories(data);
        const map: Record<string, number> = {};
        data.forEach((c: { slug: string; id: number }) => {
            map[c.slug] = c.id;
        });
        setSlugToId(map);
    };

    // saves lightweight posts to Async storage under "groupedPostsCache" key
    // timestamp is there also, so i can check if the cache is out of date
    const saveGroupedPostsToCache = async (grouped: Record<string, WPPost[]>) => {
        try {
            const lightweight = Object.fromEntries(
                Object.entries(grouped).map(([key, posts]) => [key, posts.map(simplifyPost)])
            );
            const payload = {
                data: lightweight,
                timestamp: Date.now()
            };
            await AsyncStorage.setItem('groupedPostsCache', JSON.stringify(payload));
        } catch (error) {
            console.error('Greška prilikom snimanja cache-a:', error);
        }
    };

    // recursively goes through menuData and extracts all category/subcategory names
    const extractCategoryNames = (data: any[]): string[] => {
        let names: string[] = [];

        for (const item of data) {
            if (typeof item === 'string') {
                if (item !== 'Latin | Ćirilica') names.push(item);
            } else if (typeof item === 'object' && item.title) {
                if (item.title !== 'Latin | Ćirilica') names.push(item.title);
                if (item.children && Array.isArray(item.children)) {
                    names = names.concat(extractCategoryNames(item.children));
                }
            }
        }

        return names;
    };

    // for "Naslovna", loops through all categories from menuData, and uses getPostsByCategoryId for each
    //  result is grouped by category name and saved in groupedPosts and cache
    const fetchAllPosts = async () => {
        setLoading(true);
        const grouped: Record<string, WPPost[]> = {};
        try {
            const categoriesToFetch = extractCategoryNames(menuData);

            for (const name of categoriesToFetch) {
                const slug = nameToSlugMap[name];
                const categoryId = slugToId[slug];
                if (categoryId) {
                    const posts = await getPostsByCategoryId(categoryId);
                    grouped[name] = posts;
                }
            }

            setGroupedPosts(grouped);
            await saveGroupedPostsToCache(grouped);
            setPosts([]);
        } catch (err) {
            console.error('Greška pri dohvatanju svih postova za Naslovnu:', err);
            setGroupedPosts({});
        } finally {
            setLoading(false);
        }
    };

    const fetchPostsForCategory = async (categoryName: string) => {
        setLoading(true);

        // if its on "Naslovna" tries to load "groupedPosts" from cache, and if it timed out - calls fetchAllPosts
        if (categoryName.toLowerCase() === 'naslovna') {
            if (Object.keys(groupedPosts).length > 0) {
                setLoading(false);
                return;
            }
            // checks for cached groupedPosts[categoryName] and uses that if it can
            const cacheRaw = await AsyncStorage.getItem('groupedPostsCache');
            if (cacheRaw) {
                const { data, timestamp } = JSON.parse(cacheRaw);
                const oneDay = 24 * 60 * 60 * 1000;
                if (Date.now() - timestamp < oneDay) {
                    setGroupedPosts(data);
                    setLoading(false);
                    return;
                }
            }

            await fetchAllPosts();
            return;
        }

        const cachedGrouped = await AsyncStorage.getItem('groupedPostsCache');
        if (cachedGrouped) {
            const { data } = JSON.parse(cachedGrouped);
            if (data[categoryName]) {
                setPosts(data[categoryName]);
                setLoading(false);
                return;
            }
        }

        // fallback if its not in cache
        const slug = nameToSlugMap[categoryName];
        const categoryId = slugToId[slug];

        // if it doesnt exist, it makes an API call by ID or looks for a fallback via text search
        if (categoryId) {
            try {
                const posts = await getPostsByCategoryId(categoryId);
                setPosts(posts);
            } catch (err) {
                console.error('Error while fetching posts by ID:', err);
                setPosts([]);
            }
        } else {
            try {
                const fallbackPosts = await getPostsBySearch(categoryName);
                setPosts(fallbackPosts);
            } catch (error) {
                console.error('Error with fallback search:', error);
                setPosts([]);
            }
        }
        setLoading(false);
    };

    // function that does an api search (/wp-json/wp/v2/posts?search=) and then locally filters results that contain the keyword in the title
    // result then sets in posts
    const searchPosts = async (query: string) => {
        setSearchLoading(true);
        try {
            const response = await fetch(
                `https://www.postinfo.rs/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}&_embed&per_page=100`
            );
            const allResults = await response.json();
            const filtered = allResults.filter((post: any) =>
                post.title?.rendered?.toLowerCase().includes(query.toLowerCase())
            );
            setPosts(filtered);
            return filtered;
        } catch (e) {
            console.error('Greška pri pretrazi:', e);
            setPosts([]);
            return [];
        } finally {
            setSearchLoading(false);
        }
    };

    // find "Lokal" from menuData and gets all subcategories
    const lokalItem = menuData.find(
        (item): item is { title: string; children: any[] } =>
            typeof item === 'object' && 'children' in item && item.title === 'Lokal'
    );
    const lokalNames = extractCategoryNames(lokalItem?.children || []);

    const generalGroupedPosts = Object.fromEntries(
        Object.entries(groupedPosts).filter(([key]) => !lokalNames.includes(key))
    );

    const lokalGroupedPosts = Object.fromEntries(
        Object.entries(groupedPosts).filter(([key]) => lokalNames.includes(key))
    );

    // function that finds children(subcategories) of "Lokal" and returns their names
    const findChildren = (title: string): string[] => {
        const lokalItem = menuData.find((item) => typeof item === 'object' && item.title === 'Lokal');
        if (!lokalItem || typeof lokalItem !== 'object') return [];

        const section = lokalItem.children?.find((child) =>
            typeof child === 'object' && child.title === title
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
            await fetchCategories();

            const cacheRaw = await AsyncStorage.getItem('groupedPostsCache');
            if (cacheRaw) {
                const { data, timestamp } = JSON.parse(cacheRaw);
                const oneDay = 24 * 60 * 60 * 1000;
                if (Date.now() - timestamp < oneDay) {
                    setGroupedPosts(data);
                    return;
                }
            }

            await fetchAllPosts();
        };

        init();
    }, []);

    return {
        categories,
        posts,
        loading,
        searchLoading,
        fetchPostsForCategory,
        searchPosts,
        setPosts,
        groupedPosts,
        lokalGroupedPosts,
        generalGroupedPosts,
        beogradGroupedPosts,
        gradoviGroupedPosts,
        okruziGroupedPosts,
    };
};