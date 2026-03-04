import CustomBanner from "@/components/CustomBanner";
import CustomFooter from "@/components/CustomFooter";
import CustomHeader from "@/components/CustomHeader";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useTheme } from "@/components/ThemeContext";
import { pickRandomAd } from "@/constants/ads";
import colors from "@/constants/colors";
import { cleanWpRenderedText, getPostTitleText } from "@/hooks/postsUtils";
import { WPPost } from "@/types/wp";
import { getLatestPosts } from "@/utils/wpApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useNavigation, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PAGE_SIZE = 16;
const NEWEST_CACHE_KEY = "newest_posts_cache_v1";

const uniqueById = (posts: WPPost[]) => {
  const map = new Map<number, WPPost>();
  for (const post of posts || []) {
    map.set(post.id, post);
  }
  return Array.from(map.values());
};

const sortNewestFirst = (posts: WPPost[]) =>
  [...posts].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

const splitIntoGroups = (posts: WPPost[], size = 5) => {
  const groups: WPPost[][] = [];
  for (let index = 0; index < posts.length; index += size) {
    groups.push(posts.slice(index, index + size));
  }
  return groups;
};

const deriveCategoryName = (post: WPPost): string | undefined => {
  const groups = (post as any)?._embedded?.["wp:term"];
  if (!Array.isArray(groups)) return undefined;

  const flattened = groups.flat().filter(Boolean);
  const category = flattened.find(
    (term: any) => term?.taxonomy === "category" && term?.name,
  );
  return category?.name ? String(category.name) : undefined;
};

const getRelativeTimeLabel = (isoDate: string, nowMs: number) => {
  const postMs = new Date(isoDate).getTime();
  if (!Number.isFinite(postMs)) return "pre 1 min.";

  const diffMs = Math.max(0, nowMs - postMs);
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `pre ${diffMinutes} min.`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `pre ${diffHours} sat.`;

  const diffDays = Math.max(1, Math.floor(diffHours / 24));
  return `pre ${diffDays} dan.`;
};

const getPostImageUrl = (post: WPPost) => {
  const media = post?._embedded?.["wp:featuredmedia"]?.[0];
  if (!media) return undefined;

  const sizes = media.media_details?.sizes;
  return (
    sizes?.medium?.source_url ||
    sizes?.medium_large?.source_url ||
    sizes?.large?.source_url ||
    media.source_url
  );
};

type NewestCachePayload = {
  posts: WPPost[];
  page: number;
  hasMore: boolean;
  savedAt: number;
};

const Newest = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [posts, setPosts] = React.useState<WPPost[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [loadingInitial, setLoadingInitial] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadingNav, setLoadingNav] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [bottomAd] = React.useState(() => pickRandomAd());
  const [nowMs, setNowMs] = React.useState(Date.now());
  const postsRef = React.useRef<WPPost[]>([]);

  React.useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const persistNewestCache = React.useCallback(
    async (nextPosts: WPPost[], nextPage: number, nextHasMore: boolean) => {
      try {
        const payload: NewestCachePayload = {
          posts: nextPosts,
          page: nextPage,
          hasMore: nextHasMore,
          savedAt: Date.now(),
        };
        await AsyncStorage.setItem(NEWEST_CACHE_KEY, JSON.stringify(payload));
      } catch (error) {
        console.warn("Failed to cache newest posts:", error);
      }
    },
    [],
  );

  const hydrateFromCache = React.useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(NEWEST_CACHE_KEY);
      if (!raw) return false;

      const parsed = JSON.parse(raw) as Partial<NewestCachePayload>;
      const cachedPosts = Array.isArray(parsed?.posts)
        ? (parsed.posts as WPPost[])
        : [];
      if (cachedPosts.length === 0) return false;

      const normalized = sortNewestFirst(uniqueById(cachedPosts));
      setPosts(normalized);
      postsRef.current = normalized;
      setPage(
        typeof parsed.page === "number" && parsed.page > 0 ? parsed.page : 1,
      );
      setHasMore(Boolean(parsed.hasMore));
      return true;
    } catch (error) {
      console.warn("Failed to read newest posts cache:", error);
      return false;
    }
  }, []);

  const fetchNewestPosts = React.useCallback(
    async (targetPage: number, append: boolean) => {
      const response = await getLatestPosts(targetPage, PAGE_SIZE);
      const fetched = Array.isArray(response) ? (response as WPPost[]) : [];
      const nextHasMore = fetched.length === PAGE_SIZE;
      const merged = append
        ? sortNewestFirst(uniqueById([...postsRef.current, ...fetched]))
        : sortNewestFirst(uniqueById(fetched));

      setPosts(merged);
      postsRef.current = merged;
      setPage(targetPage);
      setHasMore(nextHasMore);
      await persistNewestCache(merged, targetPage, nextHasMore);
    },
    [persistNewestCache],
  );

  React.useEffect(() => {
    let mounted = true;

    const init = async () => {
      const hadCache = await hydrateFromCache();
      if (hadCache && mounted) setLoadingInitial(false);

      try {
        await fetchNewestPosts(1, false);
      } catch (error) {
        console.error("Failed to load newest posts:", error);
        if (mounted && !hadCache) {
          setPosts([]);
          postsRef.current = [];
          setHasMore(false);
        }
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [fetchNewestPosts, hydrateFromCache]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      setLoadingNav(false);
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchNewestPosts(1, false);
    } catch (error) {
      console.error("Failed to refresh newest posts:", error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchNewestPosts]);

  const loadMore = React.useCallback(async () => {
    if (!hasMore || loadingMore || loadingNav || loadingInitial) return;
    setLoadingMore(true);
    try {
      await fetchNewestPosts(page + 1, true);
    } catch (error) {
      console.error("Failed to load more newest posts:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [
    fetchNewestPosts,
    hasMore,
    loadingInitial,
    loadingMore,
    loadingNav,
    page,
  ]);

  const handleBackWithLoading = () => {
    if (loadingNav) return;
    setLoadingNav(true);
    requestAnimationFrame(() => {
      router.back();
    });
  };

  const openPost = (post: WPPost) => {
    if (loadingNav) return;
    setLoadingNav(true);
    requestAnimationFrame(() => {
      router.push({
        pathname: "/post-details",
        params: {
          postId: String(post.id),
          category: deriveCategoryName(post) || "Najnovije",
        },
      });
    });
  };

  const getMetaText = React.useCallback(
    (post: WPPost) => {
      const dateText = new Date(post.date).toLocaleDateString("sr-RS");
      return `${dateText} - ${getRelativeTimeLabel(post.date, nowMs)}`;
    },
    [nowMs],
  );

  const shadowNone = React.useMemo(
    () =>
      Platform.OS === "ios"
        ? {
            shadowColor: "transparent",
            shadowOpacity: 0,
            shadowRadius: 0,
            shadowOffset: { width: 0, height: 0 },
          }
        : { elevation: 0 },
    [],
  );

  const groups = React.useMemo(() => splitIntoGroups(posts, 5), [posts]);
  const groupAds = React.useMemo(
    () => groups.map(() => pickRandomAd()),
    [groups.length],
  );

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: isDark ? colors.black : colors.grey }}
    >
      <CustomHeader
        onMenuToggle={setMenuOpen}
        onCategorySelected={() => {}}
        activeCategory="Najnovije"
        onBackPress={handleBackWithLoading}
        loadingNav={loadingNav}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text
          style={{
            fontSize: 28,
            textAlign: "center",
            marginTop: 12,
            marginBottom: 12,
            color: isDark ? colors.grey : colors.black,
            fontFamily:
              Platform.OS === "android" ? "PlayfairDisplay-Bold" : "System",
          }}
        >
          Najnovije vesti
        </Text>

        {loadingInitial ? (
          <View style={{ minHeight: 280, justifyContent: "center" }}>
            <ActivityIndicator
              size="large"
              color={isDark ? colors.grey : colors.black}
            />
          </View>
        ) : groups.length === 0 ? (
          <View
            style={{ minHeight: 260, alignItems: "center", paddingTop: 32 }}
          >
            <Text
              style={{
                color: isDark ? colors.grey : colors.black,
                fontFamily: "Roboto-Regular",
              }}
            >
              Nema objava za prikaz.
            </Text>
          </View>
        ) : (
          groups.map((group, groupIndex) => {
            const featured = group[0];
            const compactItems = group.slice(1);

            return (
              <View key={`${featured?.id ?? groupIndex}-${groupIndex}`}>
                {featured && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={loadingNav}
                    onPress={() => openPost(featured)}
                    style={{ marginHorizontal: 12, marginTop: 10 }}
                  >
                    <View
                      style={[
                        {
                          borderWidth: 1,
                          borderRadius: 16,
                          padding: 12,
                          backgroundColor: isDark ? colors.black : colors.grey,
                          borderColor: isDark ? "#525050" : "#e5e7eb",
                          overflow: "hidden",
                        },
                        shadowNone,
                      ]}
                    >
                      {getPostImageUrl(featured) && (
                        <Image
                          source={{ uri: getPostImageUrl(featured)! }}
                          style={{
                            width: "100%",
                            height: 200,
                            borderRadius: 12,
                            marginBottom: 10,
                          }}
                          contentFit="cover"
                          cachePolicy="disk"
                          transition={150}
                        />
                      )}
                      <Text
                        numberOfLines={2}
                        style={{
                          color: isDark ? colors.grey : colors.black,
                          fontFamily: "Roboto-ExtraBold",
                        }}
                      >
                        {getPostTitleText(featured)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          marginTop: 4,
                          color: colors.darkerGray,
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {getMetaText(featured)}
                      </Text>
                      <Text
                        numberOfLines={3}
                        style={{
                          marginTop: 2,
                          color: isDark ? colors.grey : colors.black,
                          fontFamily: "Roboto-Light",
                        }}
                      >
                        {cleanWpRenderedText(featured.excerpt?.rendered)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {compactItems.map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    activeOpacity={0.85}
                    disabled={loadingNav}
                    onPress={() => openPost(post)}
                    style={{ marginHorizontal: 12, marginTop: 10 }}
                  >
                    <View
                      style={[
                        {
                          borderWidth: 1,
                          borderRadius: 16,
                          padding: 10,
                          backgroundColor: isDark ? colors.black : colors.grey,
                          borderColor: isDark ? "#525050" : "#e5e7eb",
                          overflow: "hidden",
                        },
                        shadowNone,
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-start",
                          gap: 10,
                        }}
                      >
                        {getPostImageUrl(post) ? (
                          <Image
                            source={{ uri: getPostImageUrl(post)! }}
                            style={{
                              flex: 3,
                              alignSelf: "stretch",
                              borderRadius: 10,
                            }}
                            contentFit="cover"
                            cachePolicy="disk"
                            transition={150}
                          />
                        ) : (
                          <View
                            style={{
                              flex: 3,
                              alignSelf: "stretch",
                              backgroundColor: "#ddd",
                              borderRadius: 10,
                            }}
                          />
                        )}

                        <View style={{ flex: 7 }}>
                          <Text
                            numberOfLines={2}
                            style={{
                              color: isDark ? colors.grey : colors.black,
                              fontFamily: "Roboto-ExtraBold",
                            }}
                          >
                            {getPostTitleText(post)}
                          </Text>
                          <Text
                            style={{
                              marginTop: 4,
                              color: colors.darkerGray,
                              fontSize: 12,
                            }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {getMetaText(post)}
                          </Text>
                          <Text
                            numberOfLines={3}
                            style={{
                              marginTop: 2,
                              color: isDark ? colors.grey : colors.black,
                              fontFamily: "Roboto-Light",
                            }}
                          >
                            {cleanWpRenderedText(post.excerpt?.rendered)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}

                {group.length === 5 && groupAds[groupIndex] && (
                  <View style={{ marginTop: 10 }}>
                    <CustomBanner
                      url={groupAds[groupIndex].url}
                      imageSrc={groupAds[groupIndex].imageSrc}
                      videoSrc={groupAds[groupIndex].videoSrc}
                    />
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ paddingHorizontal: 12, marginTop: 4 }}>
          <TouchableOpacity
            onPress={loadMore}
            disabled={!hasMore || loadingMore || loadingNav || loadingInitial}
            style={{
              backgroundColor: colors.blue,
              alignSelf: "center",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              opacity:
                !hasMore || loadingMore || loadingNav || loadingInitial
                  ? 0.7
                  : 1,
            }}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontFamily: "Roboto-Bold" }}>
                Učitaj još
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 8 }}>
          <CustomBanner
            url={bottomAd.url}
            imageSrc={bottomAd.imageSrc}
            videoSrc={bottomAd.videoSrc}
          />
        </View>
      </ScrollView>

      {loadingNav && <LoadingOverlay isDark={isDark} message="Učitavanje..." />}

      {!menuOpen && <CustomFooter />}
    </SafeAreaView>
  );
};

export default Newest;
