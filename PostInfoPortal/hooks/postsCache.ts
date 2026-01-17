import { WPPost } from "@/types/wp";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const simplifyPost = (post: WPPost): Partial<WPPost> => ({
  id: post.id,
  title: post.title,
  excerpt: post.excerpt,
  date: post.date,
  _embedded: { "wp:featuredmedia": post._embedded?.["wp:featuredmedia"] },
});

export const createGroupedPostsCacheSaver = (opts: {
  danasKey: string;
  homeCategories: readonly string[];
  homePageSize: number;
  limitDefault?: number;
  limitDanas?: number;
}) => {
  const homeSet = new Set<string>(opts.homeCategories as unknown as string[]);
  const limitDefault = opts.limitDefault ?? 50;
  const limitDanas = opts.limitDanas ?? 60;

  return async (grouped: Record<string, WPPost[]>) => {
    try {
      const lightweight = Object.fromEntries(
        Object.entries(grouped).map(([k, arr]) => [
          k,
          (arr || [])
            .slice(
              0,
              k === opts.danasKey
                ? limitDanas
                : homeSet.has(k)
                  ? opts.homePageSize
                  : limitDefault,
            )
            .map(simplifyPost),
        ]),
      );
      const payload = { data: lightweight, timestamp: Date.now() };
      const jsonString = JSON.stringify(payload);

      if (jsonString.length > 1000000) {
        console.warn(
          "Cache data too large, skipping save to prevent corruption",
        );
        return;
      }

      await AsyncStorage.setItem("groupedPostsCache", jsonString);
    } catch (e) {
      console.error("Greška prilikom snimanja cache-a:", e);
      if (e instanceof Error && e.message.includes("Row too big")) {
        console.warn("Cache save failed due to size, clearing cache");
        try {
          await AsyncStorage.removeItem("groupedPostsCache");
        } catch (clearError) {
          console.warn("Failed to clear cache after size error:", clearError);
        }
      }
    }
  };
};

export const saveDailyCirclesToCache = async (items: WPPost[]) => {
  try {
    const lightweight = (items || []).map(simplifyPost);
    const payload = { data: lightweight, timestamp: Date.now() };
    await AsyncStorage.setItem("dailyCirclesCache", JSON.stringify(payload));
  } catch (e) {
    console.warn("Greška prilikom snimanja dailyCirclesCache:", e);
  }
};
