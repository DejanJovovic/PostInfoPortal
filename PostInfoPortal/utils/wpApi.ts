const BASE_URL = 'https://www.postinfo.rs/wp-json/wp/v2';

// all available categories
export const getCategories = async () => {
    const res = await fetch(`${BASE_URL}/categories?per_page=100`);
    return await res.json();
};

// getting posts by category ID
export const getPostsByCategoryId = async (categoryId: number) => {
    const res = await fetch(`${BASE_URL}/posts?categories=${categoryId}&_embed`);
    return await res.json();
};

// Getting posts by search using fallback(fallback kada ne postoji prava kategorija)
export const getPostsBySearch = async (query: string) => {
    const res = await fetch(`${BASE_URL}/posts?search=${encodeURIComponent(query)}&_embed`);
    return await res.json();
};

// function for search by title of the post
export const searchPostsByTitle = async (query: string) => {
    const res = await fetch(`${BASE_URL}/posts?search=${encodeURIComponent(query)}&_embed`);
    return await res.json();
};
