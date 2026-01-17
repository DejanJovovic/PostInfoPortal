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
