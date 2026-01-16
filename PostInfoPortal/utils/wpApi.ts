const BASE_URL = 'https://www.postinfo.rs/wp-json/wp/v2';

// Minimal fields for list cards (omit heavy fields)
const LIST_FIELDS = [
    'id',
    'date',
    'title',
    'excerpt',
    'featured_media',
].join(',');

// all available categories (trim fields)
export const getCategories = async () => {
    const res = await fetch(`${BASE_URL}/categories?per_page=100&_fields=id,name,slug,count,parent`);
    return await res.json();
};

// getting posts by category ID (paginated, lean fields)
export const getPostsByCategoryId = async (categoryId: number, page: number = 1, perPage: number = 12) => {
    const params = new URLSearchParams({
        categories: String(categoryId),
        page: String(page),
        per_page: String(perPage),
        _embed: '1',
        orderby: 'date',
        order: 'desc',
    });
    const res = await fetch(`${BASE_URL}/posts?${params.toString()}`);
    return await res.json();
};

// Getting posts by search using fallback (lean fields + pagination)
export const getPostsBySearch = async (query: string, page: number = 1, perPage: number = 12) => {
    const params = new URLSearchParams({
        search: encodeURIComponent(query),
        page: String(page),
        per_page: String(perPage),
        _embed: '1',
        orderby: 'date',
        order: 'desc',
    });
    const res = await fetch(`${BASE_URL}/posts?${params.toString()}`);
    return await res.json();
};

// Full post (details screen only)
export const getPostByIdFull = async (id: number) => {
    const res = await fetch(`${BASE_URL}/posts/${id}?_embed=1`);
    return await res.json();
};
