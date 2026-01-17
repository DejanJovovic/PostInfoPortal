const BASE_URL = "https://www.postinfo.rs/wp-json/wp/v2";

const LIST_FIELDS = ["id", "date", "title", "excerpt", "featured_media"].join(
  ",",
);

export const getCategories = async () => {
  const res = await fetch(
    `${BASE_URL}/categories?per_page=100&_fields=id,name,slug,count,parent`,
  );
  return await res.json();
};

export const getCategoryBySlug = async (slug: string) => {
  const res = await fetch(
    `${BASE_URL}/categories?slug=${encodeURIComponent(slug)}&_fields=id,name,slug,count,parent`,
  );
  return await res.json();
};

export const getPostsByCategoryId = async (
  categoryId: number,
  page: number = 1,
  perPage: number = 12,
) => {
  const params = new URLSearchParams({
    categories: String(categoryId),
    page: String(page),
    per_page: String(perPage),
    _embed: "1",
    orderby: "date",
    order: "desc",
  });
  const res = await fetch(`${BASE_URL}/posts?${params.toString()}`);
  return await res.json();
};

export const getLatestPosts = async (
  page: number = 1,
  perPage: number = 10,
) => {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    _embed: "1",
    orderby: "date",
    order: "desc",
  });
  const res = await fetch(`${BASE_URL}/posts?${params.toString()}`);
  return await res.json();
};

export const getPostsByDateRange = async (
  afterIso: string,
  beforeIso: string,
  page: number = 1,
  perPage: number = 5,
) => {
  const params = new URLSearchParams({
    after: afterIso,
    before: beforeIso,
    page: String(page),
    per_page: String(perPage),
    _embed: "1",
    orderby: "date",
    order: "desc",
  });
  const res = await fetch(`${BASE_URL}/posts?${params.toString()}`);
  return await res.json();
};

export const getPostsBySearch = async (
  query: string,
  page: number = 1,
  perPage: number = 12,
) => {
  const params = new URLSearchParams({
    search: encodeURIComponent(query),
    page: String(page),
    per_page: String(perPage),
    _embed: "1",
    orderby: "date",
    order: "desc",
  });
  const res = await fetch(`${BASE_URL}/posts?${params.toString()}`);
  return await res.json();
};

export const getPostByIdFull = async (id: number) => {
  const res = await fetch(`${BASE_URL}/posts/${id}?_embed=1`);
  return await res.json();
};
