import CategoryContent from "@/components/CategoryContent";
import CustomBanner from "@/components/CustomBanner";
import CustomFooter from "@/components/CustomFooter";
import CustomHeader from "@/components/CustomHeader";
import CustomMenuCategories from "@/components/CustomMenuCategories";
import HomeContent from "@/components/HomeContent";
import { useTheme } from "@/components/ThemeContext";
import { pickRandomAd } from "@/constants/ads";
import colors from "@/constants/colors";
import { prefetchNaslovnaStartupPayload } from "@/hooks/startupPrefetch";
import { usePostsByCategory } from "@/hooks/usePostsByCategory";
import { globalSearch } from "@/utils/searchNavigation";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
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
  const [activeCategory, setActiveCategory] = useState("Naslovna");
  const [refreshing, setRefreshing] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isLoading, setIsLoading] = useState(false);
  const startupGateCompletedRef = useRef(false);
  const scrollOffsetsRef = useRef<Record<string, number>>({});
  const appliedSelectedCategoryRef = useRef<string | null>(null);

  const { selectedCategory } = useLocalSearchParams<{
    selectedCategory?: string | string[];
  }>();
  const selectedCategoryParam = React.useMemo(() => {
    const raw = Array.isArray(selectedCategory)
      ? selectedCategory[0]
      : selectedCategory;
    if (typeof raw !== "string") return "";
    const trimmed = raw.trim();
    if (!trimmed) return "";
    try {
      return decodeURIComponent(trimmed);
    } catch {
      return trimmed;
    }
  }, [selectedCategory]);
  const {
    posts,
    loading,
    fetchPostsForCategory,
    refreshHome,
    refreshDanas,
    initialized,
    groupedPosts,
    homeGroupedPosts,
    homeCategoryOrder,
    categories,
    loadMorePosts,
    loadingMore,
    hasMore,
  } = usePostsByCategory();
  const fetchPostsForCategoryRef = useRef(fetchPostsForCategory);

  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    fetchPostsForCategoryRef.current = fetchPostsForCategory;
  }, [fetchPostsForCategory]);

  useEffect(() => {
    const unsub = navigation.addListener("blur", () => {
      setTimeout(() => setIsLoading(false), 500);
    });
    return unsub;
  }, [navigation]);

  useEffect(() => {
    if (!selectedCategoryParam) {
      appliedSelectedCategoryRef.current = null;
      return;
    }

    if (appliedSelectedCategoryRef.current === selectedCategoryParam) return;
    appliedSelectedCategoryRef.current = selectedCategoryParam;

    fetchPostsForCategoryRef.current(selectedCategoryParam);
    setActiveCategory(selectedCategoryParam);
  }, [selectedCategoryParam]);

  useEffect(() => {
    if (!selectedCategoryParam && activeCategory === "Naslovna" && initialized) {
      fetchPostsForCategoryRef.current("Naslovna");
    }
  }, [selectedCategoryParam, activeCategory, initialized]);

  const [bottomAdVisible, setBottomAdVisible] = useState(false);
  const [bottomAd, setBottomAd] = useState(() => pickRandomAd());

  const adTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBottomAd = React.useCallback(() => {
    if (isLoading) return;
    if (menuOpen) return;
    if (loading) return;

    setBottomAd(pickRandomAd());
    setBottomAdVisible(true);
  }, [isLoading, menuOpen, loading]);

  const dismissBottomAd = React.useCallback(() => {
    setBottomAdVisible(false);
    const nextIn = 10000 + Math.random() * 10000;
    if (adTimerRef.current) clearTimeout(adTimerRef.current);
    adTimerRef.current = setTimeout(showBottomAd, nextIn);
  }, [showBottomAd]);

  const hasNaslovnaContent = React.useMemo(() => {
    const hasHomeSections = (homeCategoryOrder || []).some(
      (categoryName) => (homeGroupedPosts[categoryName] || []).length > 0,
    );
    const hasDanas = (groupedPosts["Danas"] || []).length > 0;
    const hasMainNews = (groupedPosts["Glavna vest"] || []).length > 0;
    return hasHomeSections || hasDanas || hasMainNews;
  }, [groupedPosts, homeCategoryOrder, homeGroupedPosts]);
  const hasMainCarouselPosts = (groupedPosts["Glavna vest"] || []).length > 0;
  const hasOrderedHomePosts = (homeCategoryOrder || []).some(
    (categoryName) => (homeGroupedPosts[categoryName] || []).length > 0,
  );
  const hasHomeStartupFeedReady =
    hasMainCarouselPosts && hasOrderedHomePosts && hasNaslovnaContent;
  const shouldGateNaslovnaStartup =
    activeCategory === "Naslovna" &&
    !selectedCategoryParam &&
    !startupGateCompletedRef.current;
  const showNaslovnaStartupLoading =
    shouldGateNaslovnaStartup && !hasHomeStartupFeedReady;
  const activeCategoryPosts = React.useMemo(() => {
    if (activeCategory === "Naslovna") return [];

    if (Object.prototype.hasOwnProperty.call(groupedPosts, activeCategory)) {
      return groupedPosts[activeCategory] || [];
    }

    return posts || [];
  }, [activeCategory, groupedPosts, posts]);

  useEffect(() => {
    if (!shouldGateNaslovnaStartup) return;

    prefetchNaslovnaStartupPayload().catch(() => {});
  }, [shouldGateNaslovnaStartup]);

  useEffect(() => {
    if (!shouldGateNaslovnaStartup) return;
    if (!hasHomeStartupFeedReady) return;

    startupGateCompletedRef.current = true;
  }, [hasHomeStartupFeedReady, shouldGateNaslovnaStartup]);

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
    if (menuOpen || isLoading || loading) {
      setBottomAdVisible(false);
      if (adTimerRef.current) clearTimeout(adTimerRef.current);
    } else if (!bottomAdVisible && !adTimerRef.current) {
      const inMs = 15000;
      adTimerRef.current = setTimeout(showBottomAd, inMs);
    }
  }, [menuOpen, isLoading, loading, bottomAdVisible, showBottomAd]);

  const handleBackWithLoading = () => {
    if (isLoading) return;
    setIsLoading(true);
    requestAnimationFrame(() => {
      router.back();
    });
  };

  const handleCategorySelect = (categoryName: string) => {
    if (categoryName === "Latin | \u0106irilica") return;
    setActiveCategory(categoryName);
    fetchPostsForCategory(categoryName);
    if (categoryName === "Naslovna") {
      refreshHome().catch(() => {});
    } else if (categoryName === "Danas") {
      refreshDanas().catch(() => {});
    }
    setMenuOpen(false);
  };

  const handleGlobalSearch = (query?: string) => {
    if (isLoading) return;
    setIsLoading(true);
    requestAnimationFrame(() => {
      router.replace(globalSearch(query));
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    const cat = activeCategory || "Naslovna";
    if (cat === "Naslovna") {
      await refreshHome();
    } else if (cat === "Danas") {
      await refreshDanas();
    } else {
      await fetchPostsForCategory(cat, 1, false, true);
    }

    setRefreshing(false);
  }, [activeCategory, fetchPostsForCategory, refreshHome, refreshDanas]);

  const getRememberedScrollY = useCallback(
    (categoryName: string) => scrollOffsetsRef.current[categoryName] || 0,
    [],
  );

  const handleScrollYChange = useCallback((categoryName: string, y: number) => {
    scrollOffsetsRef.current[categoryName] = y;
  }, []);

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: isDark ? colors.black : colors.grey }}
    >
      <CustomHeader
        onMenuToggle={(visible) => setMenuOpen(visible)}
        onCategorySelected={handleCategorySelect}
        activeCategory={activeCategory}
        onSearchQuery={handleGlobalSearch}
        onBackPress={handleBackWithLoading}
        loadingNav={isLoading}
      />

      <View style={{ marginTop: -8 }}>
        <CustomMenuCategories
          onSelectCategory={handleCategorySelect}
          activeCategory={activeCategory}
          extraCategories={(categories || []).map((c) => c.name)}
        />
      </View>

      {loading || showNaslovnaStartupLoading ? (
        <View className="flex-1 items-center justify-center">
          <LoadingOverlay isDark={isDark} message={"Učitavanje..."} />
        </View>
      ) : activeCategory === "Naslovna" &&
        (!initialized || !hasNaslovnaContent) ? (
        <View className="flex-1 items-center justify-center">
          <LoadingOverlay isDark={isDark} message={"Učitavanje objava..."} />
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
          mainPosts={(groupedPosts["Glavna vest"] || []).slice(0, 7)}
          rememberedScrollY={getRememberedScrollY("Naslovna")}
          onScrollYChange={(y) => handleScrollYChange("Naslovna", y)}
        />
      ) : (
        <CategoryContent
          key={activeCategory}
          activeCategory={activeCategory}
          posts={activeCategoryPosts}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onPostPress={(id, category) => goToPost(id, category)}
          loadingNav={isLoading}
          hasMore={hasMore[activeCategory] || false}
          loadingMore={loadingMore}
          onLoadMore={() => loadMorePosts(activeCategory)}
          rememberedScrollY={getRememberedScrollY(activeCategory)}
          onScrollYChange={(y) => handleScrollYChange(activeCategory, y)}
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
            {"Učitavanje objave..."}
          </Text>
        </View>
      )}

      {!menuOpen && <CustomFooter />}

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
