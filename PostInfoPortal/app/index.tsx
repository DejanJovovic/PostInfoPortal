import CategoryContent from "@/components/CategoryContent";
import CustomBanner from "@/components/CustomBanner";
import CustomFooter from "@/components/CustomFooter";
import CustomHeader from "@/components/CustomHeader";
import CustomMenuCategories from "@/components/CustomMenuCategories";
import CustomSearchBar from "@/components/CustomSearchBar";
import HomeContent from "@/components/HomeContent";
import SearchResults from "@/components/SearchResults";
import { useTheme } from "@/components/ThemeContext";
import { pickRandomAd } from "@/constants/ads";
import colors from "@/constants/colors";
import { usePostsByCategory } from "@/hooks/usePostsByCategory";
import { WPPost } from "@/types/wp";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LoadingOverlay = ({
  isDark,
  message,
}: {
  isDark: boolean;
  message: string;
}) => (
  <View
    style={[
      StyleSheet.absoluteFillObject,
      {
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: isDark ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.7)",
        zIndex: 9999,
        elevation: 9999,
      },
    ]}
    pointerEvents="auto"
  >
    <ActivityIndicator size="large" color={isDark ? "#F9F9F9" : "#000"} />
    <Text
      style={{
        marginTop: 10,
        fontFamily: "Roboto-SemiBold",
        color: isDark ? colors.grey : colors.black,
        textAlign: "center",
      }}
    >
      {message}
    </Text>
  </View>
);

const Index = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [triggerSearchOpen, setTriggerSearchOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Naslovna");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [noSearchResults, setNoSearchResults] = useState(false);
  const [searchAttemptCount, setSearchAttemptCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isLoading, setIsLoading] = useState(false);

  const { selectedCategory, openSearch } = useLocalSearchParams<{
    selectedCategory?: string;
    openSearch?: string;
  }>();
  const {
    posts,
    loading,
    searchLoading,
    fetchPostsForCategory,
    refreshHome,
    refreshDanas,
    searchPostsFromCache,
    setPosts,
    initialized,
    groupedPosts,
    homeGroupedPosts,
    homeCategoryOrder,
    dailyCirclesPosts,
    categories,
    loadMorePosts,
    loadingMore,
    hasMore,
  } = usePostsByCategory();

  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    const unsub = navigation.addListener("blur", () => {
      setTimeout(() => setIsLoading(false), 500);
    });
    return unsub;
  }, [navigation]);

  useEffect(() => {
    if (selectedCategory && typeof selectedCategory === "string") {
      fetchPostsForCategory(selectedCategory);
      setActiveCategory(selectedCategory);
      setSearchQuery("");
      setIsSearchActive(false);
      setNoSearchResults(false);
      setSearchAttemptCount(0);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedCategory && activeCategory === "Naslovna" && initialized) {
      fetchPostsForCategory("Naslovna");
    }
  }, [selectedCategory, activeCategory, initialized]);

  useEffect(() => {
    if (openSearch === "1") {
      setSearchQuery("");
      setIsSearchActive(true);
      setNoSearchResults(true);
      setSearchAttemptCount(0);
      setTriggerSearchOpen(true);
    }
  }, [openSearch]);

  const [bottomAdVisible, setBottomAdVisible] = useState(false);
  const [bottomAd, setBottomAd] = useState(pickRandomAd());

  const adTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBottomAd = React.useCallback(() => {
    if (isLoading) return;
    if (menuOpen) return;
    if (loading || searchLoading) return;

    setBottomAd(pickRandomAd());
    setBottomAdVisible(true);
  }, [isLoading, menuOpen, loading, searchLoading]);

  const dismissBottomAd = React.useCallback(() => {
    setBottomAdVisible(false);
    const nextIn = 10000 + Math.random() * 10000;
    if (adTimerRef.current) clearTimeout(adTimerRef.current);
    adTimerRef.current = setTimeout(showBottomAd, nextIn);
  }, [showBottomAd]);

  const deriveCategoryName = (post: any): string | undefined => {
    const groups = post?._embedded?.["wp:term"];
    if (Array.isArray(groups)) {
      const flat = groups.flat().filter(Boolean);
      const cat = flat.find((t: any) => t?.taxonomy === "category" && t?.name);
      if (cat?.name) return String(cat.name);
    }
    return undefined;
  };

  const uniqById = (arr: WPPost[]) => {
    const map = new Map<number, WPPost>();
    for (const p of arr || []) map.set(p.id, p);
    return Array.from(map.values());
  };

  const uniquePosts = React.useMemo(() => uniqById(posts), [posts]);

  const goToPost = (postId: number, categoryName?: string) => {
    if (isLoading) return;
    setIsLoading(true);

    const finalCategory =
      categoryName && categoryName.length > 0 ? categoryName : activeCategory; // fallback

    try {
      router.push({
        pathname: "/post-details",
        params: {
          postId: postId.toString(),
          category: encodeURIComponent(finalCategory),
        },
      });
    } catch (error) {
      console.error("Navigation error:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const firstIn = 8000 + Math.random() * 7000;
    if (adTimerRef.current) clearTimeout(adTimerRef.current);
    adTimerRef.current = setTimeout(showBottomAd, firstIn);

    return () => {
      if (adTimerRef.current) clearTimeout(adTimerRef.current);
    };
  }, [showBottomAd]);

  useEffect(() => {
    if (menuOpen || isLoading || loading || searchLoading) {
      setBottomAdVisible(false);
      if (adTimerRef.current) clearTimeout(adTimerRef.current);
    } else if (!bottomAdVisible && !adTimerRef.current) {
      const inMs = 15000;
      adTimerRef.current = setTimeout(showBottomAd, inMs);
    }
  }, [
    menuOpen,
    isLoading,
    loading,
    searchLoading,
    bottomAdVisible,
    showBottomAd,
  ]);

  const handleBackWithLoading = () => {
    if (isLoading) return;
    setIsLoading(true);
    requestAnimationFrame(() => {
      router.back();
    });
  };

  const handleCategorySelect = (categoryName: string) => {
    if (categoryName === "Latin | Ćirilica") return;
    setSearchQuery("");
    setIsSearchActive(false);
    setNoSearchResults(false);
    setSearchAttemptCount(0);
    setActiveCategory(categoryName);
    fetchPostsForCategory(categoryName);
    if (categoryName === "Naslovna") {
      refreshHome().catch(() => {});
    } else if (categoryName === "Danas") {
      refreshDanas().catch(() => {});
    }
    setMenuOpen(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearchActive(true);
    setNoSearchResults(false);
    setPosts([]);

    const nextAttempt = searchAttemptCount + 1;
    setSearchAttemptCount(nextAttempt);

    const found = await searchPostsFromCache(query);
    if (found.length === 0) {
      if (nextAttempt === 1) {
        setNoSearchResults(true);
        await fetchPostsForCategory("Naslovna");
      } else {
        setPosts([]);
        setNoSearchResults(true);
      }
    }
  };

  const resetSearch = async () => {
    setSearchQuery("");
    setIsSearchActive(false);
    setNoSearchResults(false);
    setSearchAttemptCount(0);
    setActiveCategory("Naslovna");
    await fetchPostsForCategory("Naslovna");
  };

  const handleFooterSearch = () => {
    setSearchQuery("");
    setIsSearchActive(true);
    setNoSearchResults(true);
    setSearchAttemptCount(0);
    setTriggerSearchOpen(true);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    if (isSearchActive) {
      setSearchQuery("");
      setPosts([]);
      setNoSearchResults(true);
      setSearchAttemptCount(0);
    } else {
      const cat = activeCategory || "Naslovna";
      if (cat === "Naslovna") {
        await refreshHome();
      } else if (cat === "Danas") {
        await refreshDanas();
      } else {
        await fetchPostsForCategory(cat, 1, false, true);
      }
    }

    setRefreshing(false);
  }, [
    isSearchActive,
    activeCategory,
    fetchPostsForCategory,
    refreshHome,
    refreshDanas,
    setPosts,
  ]);

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term)
      return (
        <Text
          style={{
            color: isDark ? colors.grey : colors.black,
            fontFamily: "Roboto-Bold",
          }}
        >
          {text}
        </Text>
      );

    const parts = text.split(new RegExp(`(${term})`, "gi"));
    return (
      <Text
        style={{
          color: isDark ? colors.grey : colors.black,
          fontFamily: "Roboto-ExtraBold",
        }}
        numberOfLines={2}
      >
        {parts.map((part, i) => (
          <Text
            key={i}
            className={
              part.toLowerCase() === term.toLowerCase() ? " text-[#FA0A0F]" : ""
            }
          >
            {part}
          </Text>
        ))}
      </Text>
    );
  };

  const renderItem = ({ item }: { item: WPPost }) => {
    const getImg = (p: WPPost) => {
      const media = p._embedded?.["wp:featuredmedia"]?.[0];
      if (!media) {
        console.log("No featured media for post:", p.id, p.title.rendered);
        return undefined;
      }
      const sizes = media.media_details?.sizes;
      const imgUrl =
        sizes?.medium?.source_url ||
        sizes?.medium_large?.source_url ||
        sizes?.large?.source_url ||
        media.source_url;
      if (!imgUrl) {
        console.log("No image URL found for post:", p.id, "media:", media);
      }
      return imgUrl;
    };

    const image = getImg(item);
    const date = new Date(item.date).toLocaleDateString("sr-RS");
    const excerpt = item.excerpt.rendered.replace(/<[^>]+>/g, "");

    return (
      <View
        className="rounded-2xl mb-6 mx-3 p-4 border"
        style={{
          backgroundColor: isDark ? colors.black : colors.grey,
          borderColor: isDark ? "#525050" : "#e5e7eb",
          overflow: "hidden",
          ...(Platform.OS === "ios"
            ? {
                shadowColor: "transparent",
                shadowOpacity: 0,
                shadowRadius: 0,
                shadowOffset: { width: 0, height: 0 },
              }
            : {
                elevation: 0,
              }),
        }}
      >
        <TouchableOpacity
          onPress={() =>
            goToPost(item.id, deriveCategoryName(item) || activeCategory)
          }
          disabled={isLoading}
        >
          <Image
            source={{
              uri:
                image ||
                "https://via.placeholder.com/400x200/e5e7eb/666666?text=No+Image",
            }}
            style={{
              width: "100%",
              height: 128,
              borderRadius: 12,
              marginBottom: 12,
            }}
            contentFit="cover"
            cachePolicy="disk"
            onError={(error) => {
              console.warn(
                "Image failed to load:",
                error,
                "for post:",
                item.id,
                "URL:",
                image,
              );
            }}
          />
          {highlightSearchTerm(item.title.rendered, searchQuery)}
          <Text
            className="text-xs mt-1 mb-1"
            style={{
              color: colors.darkerGray,
              fontSize: 12,
            }}
          >
            {date}
          </Text>
          <Text
            className="text-sm"
            numberOfLines={3}
            style={{
              color: isDark ? colors.grey : colors.black,
              fontFamily: "Roboto-Light",
            }}
          >
            {excerpt}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: isDark ? colors.black : colors.grey }}
    >
      <CustomHeader
        onMenuToggle={(visible) => {
          setMenuOpen(visible);
          if (!visible) setTriggerSearchOpen(false);
        }}
        onCategorySelected={handleCategorySelect}
        activeCategory={activeCategory}
        onSearchQuery={handleSearch}
        triggerSearchOpen={triggerSearchOpen}
        onBackPress={handleBackWithLoading}
        loadingNav={isLoading}
      />

      <CustomMenuCategories
        onSelectCategory={handleCategorySelect}
        activeCategory={activeCategory}
        extraCategories={(categories || []).map((c) => c.name)}
      />

      {isSearchActive && (
        <View className="px-2 py-4">
          <Text
            className="mt-2 px-4"
            style={{
              color: isDark ? colors.grey : colors.black,
              fontFamily: "Roboto-Medium",
            }}
          >
            {searchQuery.trim().length > 0 ? (
              <>
                Rezultati pretrage{" "}
                <Text
                  style={{
                    color: colors.red,
                    fontFamily: "Roboto-Bold",
                  }}
                >
                  &#34;{searchQuery}&#34;
                </Text>
              </>
            ) : (
              "Unesite željenu reč za pretragu ispod"
            )}
          </Text>
          <CustomSearchBar
            key={searchQuery + searchAttemptCount}
            query={searchQuery}
            onSearch={handleSearch}
            onReset={resetSearch}
            backgroundColor={colors.blue}
          />
        </View>
      )}

      {loading || searchLoading ? (
        <View className="flex-1 items-center justify-center">
          <LoadingOverlay isDark={isDark} message="Učitavanje..." />
        </View>
      ) : isSearchActive ? (
        <SearchResults
          posts={uniquePosts}
          searchQuery={searchQuery}
          noSearchResults={noSearchResults}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onPostPress={(id) =>
            goToPost(
              id,
              deriveCategoryName(
                uniquePosts.find((p) => p.id === id) || ({} as WPPost),
              ) || activeCategory,
            )
          }
          loadingNav={isLoading}
          hasMore={hasMore[activeCategory] || false}
          loadingMore={loadingMore}
          onLoadMore={() => loadMorePosts(activeCategory)}
          renderItem={renderItem}
        />
      ) : activeCategory === "Naslovna" && !initialized ? (
        <View className="flex-1 items-center justify-center">
          <LoadingOverlay isDark={isDark} message="Učitavanje objava..." />
        </View>
      ) : activeCategory === "Naslovna" ? (
        <HomeContent
          homeGroupedPosts={homeGroupedPosts}
          homeCategoryOrder={homeCategoryOrder}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onPostPress={(id, category) => goToPost(id, category)}
          loadingNav={isLoading}
          todayPosts={(groupedPosts["Danas"] || []).slice(0, 10)}
          dailyCirclesPosts={dailyCirclesPosts}
        />
      ) : (
        <CategoryContent
          activeCategory={activeCategory}
          posts={posts}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onPostPress={(id, category) => goToPost(id, category)}
          loadingNav={isLoading}
          hasMore={hasMore[activeCategory] || false}
          loadingMore={loadingMore}
          onLoadMore={() => loadMorePosts(activeCategory)}
        />
      )}
      {isLoading && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: isDark
                ? "rgba(0,0,0,0.45)"
                : "rgba(255,255,255,0.7)",
              zIndex: 9999,
              elevation: 9999,
            },
          ]}
          pointerEvents="auto"
        >
          <ActivityIndicator
            size="large"
            color={isDark ? colors.grey : colors.black}
          />
          <Text
            style={{
              marginTop: 10,
              fontFamily: "Roboto-SemiBold",
              color: isDark ? colors.grey : colors.black,
              textAlign: "center",
            }}
          >
            Učitavanje objave...
          </Text>
        </View>
      )}

      {!menuOpen && <CustomFooter onSearchPress={handleFooterSearch} />}

      {bottomAdVisible && (
        <View
          pointerEvents="box-none"
          style={[
            StyleSheet.absoluteFillObject,
            { justifyContent: "flex-end", alignItems: "center", zIndex: 10000 },
          ]}
        >
          <View
            style={{ width: "100%", paddingHorizontal: 8, marginBottom: 84 }}
          >
            <CustomBanner
              url={bottomAd.url}
              imageSrc={bottomAd.imageSrc}
              videoSrc={bottomAd.videoSrc}
              onClose={dismissBottomAd}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default Index;
