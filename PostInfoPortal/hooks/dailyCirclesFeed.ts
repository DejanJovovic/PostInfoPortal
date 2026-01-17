import { WPPost } from "@/types/wp";
import { getPostsByDateRange } from "@/utils/wpApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveDailyCirclesToCache } from "./postsCache";
import {
  buildLastDayKeys,
  formatDateKey,
  toLocalIsoNoTz,
  uniqById,
} from "./postsUtils";

export const loadDailyCirclesFromCache = async (opts: {
  days: number;
}): Promise<{ posts: WPPost[]; hasAllDays: boolean }> => {
  try {
    const dailyRaw = await AsyncStorage.getItem("dailyCirclesCache");
    if (!dailyRaw) return { posts: [], hasAllDays: false };

    const parsed = JSON.parse(dailyRaw);
    const data = (parsed?.data || parsed) as WPPost[];
    if (!Array.isArray(data) || data.length === 0)
      return { posts: [], hasAllDays: false };

    const expectedKeys = buildLastDayKeys(new Date(), opts.days);
    const present = new Set(
      (data || [])
        .filter((p) => p?.date)
        .map((p) => formatDateKey(new Date(p.date))),
    );
    const hasAllDays = expectedKeys.every((k) => present.has(k));
    return { posts: data, hasAllDays };
  } catch {
    return { posts: [], hasAllDays: false };
  }
};

export const fetchDailyCirclesFromServer = async (opts: {
  baseToday: Date;
  days: number;
  postsPerDay: number;
  concurrency?: number;
}): Promise<WPPost[]> => {
  const dayKeys = buildLastDayKeys(opts.baseToday, opts.days);
  const base = new Date(
    opts.baseToday.getFullYear(),
    opts.baseToday.getMonth(),
    opts.baseToday.getDate(),
    0,
    0,
    0,
  );

  const jobs = dayKeys.map((key, i) => {
    const start = new Date(base);
    start.setDate(base.getDate() - i);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const afterIso = toLocalIsoNoTz(start);
    const beforeIso = toLocalIsoNoTz(end);

    return async () => {
      const res = (await getPostsByDateRange(
        afterIso,
        beforeIso,
        1,
        opts.postsPerDay,
      )) as WPPost[];

      const arr = Array.isArray(res) ? res : [];
      const filtered = arr
        .filter((p) => p?.date)
        .filter((p) => formatDateKey(new Date(p.date)) === key)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
        .slice(0, opts.postsPerDay);

      return { key, posts: filtered };
    };
  });

  const results: { key: string; posts: WPPost[] }[] = [];
  const concurrency = opts.concurrency ?? 3;
  const queue = [...jobs];
  const running: Promise<void>[] = [];

  const runNext = async (
    fn: () => Promise<{ key: string; posts: WPPost[] }>,
  ) => {
    try {
      const out = await fn();
      results.push(out);
    } catch {}
  };

  while (queue.length || running.length) {
    while (running.length < concurrency && queue.length) {
      const fn = queue.shift() as () => Promise<{
        key: string;
        posts: WPPost[];
      }>;
      const p = runNext(fn).finally(() => {
        const idx = running.indexOf(p);
        if (idx >= 0) running.splice(idx, 1);
      });
      running.push(p);
    }
    if (running.length) await Promise.race(running);
  }

  const byKey = new Map(results.map((r) => [r.key, r.posts]));
  const flat: WPPost[] = [];
  for (const key of dayKeys) {
    flat.push(...(byKey.get(key) || []));
  }

  return uniqById(flat);
};

export const refreshDailyCircles = async (opts: {
  baseToday: Date;
  days: number;
  postsPerDay: number;
}): Promise<WPPost[]> => {
  const flat = await fetchDailyCirclesFromServer({
    baseToday: opts.baseToday,
    days: opts.days,
    postsPerDay: opts.postsPerDay,
  });
  await saveDailyCirclesToCache(flat);
  return flat;
};
