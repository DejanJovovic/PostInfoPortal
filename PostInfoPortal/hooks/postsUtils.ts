import { WPPost } from "@/types/wp";

export const isSameLocalDate = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const uniqById = (arr: WPPost[]) => {
  const map = new Map<number, WPPost>();
  for (const p of arr || [])
    if (p && typeof p.id === "number") map.set(p.id, p);
  return Array.from(map.values());
};

export const formatDateKey = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

export const buildLastDayKeys = (today: Date, days: number) => {
  const keys: string[] = [];
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    keys.push(formatDateKey(d));
  }
  return keys;
};

export const toLocalIsoNoTz = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
};

export const normalizeText = (text: string) =>
  text
    .replace(/<[^>]+>/g, "")
    .replace(/&[^;]+;/g, "")
    .toLowerCase()
    .trim();

const decodeHtmlEntity = (entity: string) => {
  // numeric: &#8211; or &#x2013;
  const num = entity.match(/^&#(\d+);$/);
  if (num) {
    const code = Number(num[1]);
    if (Number.isFinite(code) && code >= 0 && code <= 0x10ffff) {
      try {
        return String.fromCodePoint(code);
      } catch {}
    }
  }
  const hex = entity.match(/^&#x([0-9a-fA-F]+);$/);
  if (hex) {
    const code = Number.parseInt(hex[1], 16);
    if (Number.isFinite(code) && code >= 0 && code <= 0x10ffff) {
      try {
        return String.fromCodePoint(code);
      } catch {}
    }
  }

  const named = entity.match(/^&([a-zA-Z]+);$/);
  if (named) {
    const map: Record<string, string> = {
      nbsp: " ",
      amp: "&",
      quot: '"',
      apos: "'",
      lt: "<",
      gt: ">",
      rsquo: "’",
      lsquo: "‘",
      rdquo: "”",
      ldquo: "“",
      laquo: "«",
      raquo: "»",
      ndash: "–",
      mdash: "—",
      hellip: "…",
      bull: "•",
      middot: "·",
      copy: "©",
      reg: "®",
      trade: "™",
      euro: "€",
      pound: "£",
      deg: "°",
      shy: "",
    };
    map.rsquo = "’";
    map.lsquo = "‘";
    map.rdquo = "”";
    map.ldquo = "“";
    map.laquo = "«";
    map.raquo = "»";
    map.ndash = "–";
    map.mdash = "—";
    map.hellip = "…";
    map.bull = "•";
    map.middot = "·";
    map.copy = "©";
    map.reg = "®";
    map.trade = "™";
    map.euro = "€";
    map.pound = "£";
    map.deg = "°";
    return map[named[1]] ?? entity;
  }

  return entity;
};

export const cleanWpRenderedText = (html?: string) => {
  if (!html) return "";

  // Strip tags but keep word boundaries.
  let text = String(html)
    .replace(/<\s*br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, " ");

  // Decode entities we commonly see from WP.
  text = text.replace(/&#x?[0-9a-fA-F]+;|&[a-zA-Z]+;/g, (m) =>
    decodeHtmlEntity(m),
  );

  // Normalize spaces and remove leading junk like "&nbsp;" / "&#8211;" (en-dash).
  text = text.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
  text = text.replace(/^(?:[-–—]\s*)+/, "").trim();

  return text;
};

export const getFeaturedMediaCaptionText = (post?: WPPost) => {
  const media: any = post?._embedded?.["wp:featuredmedia"]?.[0];
  const caption = media?.caption;
  const rendered =
    typeof caption === "string" ? caption : (caption?.rendered as string);
  return cleanWpRenderedText(rendered);
};

export const getPostAuthorNameText = (post?: WPPost) => {
  const name = post?._embedded?.author?.[0]?.name;
  return cleanWpRenderedText(name).toUpperCase();
};

export const getPostTitleText = (post?: WPPost) => {
  const title = post?.title?.rendered;
  return cleanWpRenderedText(title);
};
