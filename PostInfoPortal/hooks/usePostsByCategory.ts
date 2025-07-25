import { useEffect, useState } from 'react';
import {getCategories, getPostsByCategoryId, getPostsBySearch} from '@/utils/wpApi';
import axios from 'axios';
import { nameToSlugMap } from '@/constants/nameToSlugMap';

export const usePostsByCategory = () => {
    const [categories, setCategories] = useState<{ id: number; name: string; slug: string }[]>([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [slugToId, setSlugToId] = useState<Record<string, number>>({});

    const fetchCategories = async () => {
        const data = await getCategories();
        setCategories(data);
        const map: Record<string, number> = {};
        data.forEach((c: { slug: string | number; id: number; }) => map[c.slug] = c.id);
        setSlugToId(map);

        console.log("Categories with slugs:", data.map((c: { id: any; name: any; slug: any; }) => ({
            id: c.id,
            name: c.name,
            slug: c.slug
        })));
    };

    const fetchAllPosts = async () => {
        setLoading(true);
        try {
            const res = await axios.get('https://www.postinfo.rs/wp-json/wp/v2/posts?_embed');
            setPosts(res.data);
        } catch (err) {
            console.error('Error while trying to get all posts:', err);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPostsForCategory = async (categoryName: string) => {
        setLoading(true);

        console.log('Looking for posts for a certain category:', categoryName);

        if (categoryName.toLowerCase() === 'naslovna') {
            await fetchAllPosts();
            return;
        }

        const slug = nameToSlugMap[categoryName];
        const categoryId = slugToId[slug];

        if (categoryId) {
            try {
                const posts = await getPostsByCategoryId(categoryId);
                setPosts(posts);
                console.log(`Found ${posts.length} posts for '${categoryName}' this category by ID.`);
            } catch (err) {
                console.error('Error while fetching posts by ID:', err);
                setPosts([]);
            }
        } else {
            // if there is no ID, try to find posts by the name of category (search)
            try {
                const fallbackPosts = await getPostsBySearch(categoryName);
                setPosts(fallbackPosts);
                console.warn(`Fallback used to search for a category'${categoryName}' – found ${fallbackPosts.length} posts.`);
            } catch (error) {
                console.error('Error with fallback search:', error);
                setPosts([]);
            }
        }

        setLoading(false);
    };

    const searchPosts = async (query: string) => {
        setSearchLoading(true);
        try {
            const response = await fetch(`https://www.postinfo.rs/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}&_embed&per_page=100`);
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

    useEffect(() => {
        fetchCategories();
        fetchAllPosts();
    }, []);

    return {
        categories,
        posts,
        loading,
        searchLoading,
        fetchPostsForCategory,
        searchPosts,
        setPosts
    };
};