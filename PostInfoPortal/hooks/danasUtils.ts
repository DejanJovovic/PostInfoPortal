import { WPPost } from "@/types/wp";
import { isSameLocalDate, uniqById } from "./postsUtils";

export const buildDanasForToday = (
  all: Record<string, WPPost[]>,
  limit = 50,
): WPPost[] => {
  const today = new Date();
  const mergedAll = Object.entries(all)
    .filter(([name]) => name !== "Naslovna" && name !== "Danas")
    .flatMap(([, posts]) => posts || []);

  const merged = uniqById(mergedAll);

  const filtered = merged.filter((p) => {
    const d = p?.date ? new Date(p.date) : null;
    return d ? isSameLocalDate(d, today) : false;
  });

  const source = filtered.length ? filtered : merged;
  source.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return source.slice(0, limit);
};

export const buildDanasFromList = (
  list: WPPost[],
  limit: number,
): { posts: WPPost[]; mode: "today" | "fallback" } => {
  const today = new Date();
  const unique = uniqById(list || []);

  const todayOnly = unique.filter((p) => {
    const d = p?.date ? new Date(p.date) : null;
    return d ? isSameLocalDate(d, today) : false;
  });

  const mode: "today" | "fallback" = todayOnly.length ? "today" : "fallback";
  const source = (todayOnly.length ? todayOnly : unique).slice();
  source.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return { posts: source.slice(0, limit), mode };
};
