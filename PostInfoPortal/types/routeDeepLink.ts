export type RouteTarget = { pathname: string; params?: Record<string, string> };

export const parseAppUrl = (url: string): RouteTarget | undefined => {
  if (!url) return;
  const [, rest = ""] = url.split("://");
  const [pathPart = "", query = ""] = rest.split("?");
  const pathname = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  const params: Record<string, string> = {};
  if (query) {
    for (const kv of query.split("&")) {
      if (!kv) continue;
      const [k, v = ""] = kv.split("=");
      params[decodeURIComponent(k)] = decodeURIComponent(v);
    }
  }
  return { pathname, params };
};

export const routeFromUrl = (
  url: string,
  navigate: (to: RouteTarget) => void,
  dedupeKey?: { current: string | null },
) => {
  if (!url) return;
  if (dedupeKey && dedupeKey.current === url) return;
  if (dedupeKey) dedupeKey.current = url;

  const target = parseAppUrl(url);
  if (target) navigate(target);
};
