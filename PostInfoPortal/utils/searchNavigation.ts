import { Href } from "expo-router";

export const globalSearch = (query?: string): Href => {
  const trimmed = String(query || "").trim();
  if (!trimmed) return "/search" as Href;

  return {
    pathname: "/search" as any,
    params: { query: trimmed },
  } as Href;
};
