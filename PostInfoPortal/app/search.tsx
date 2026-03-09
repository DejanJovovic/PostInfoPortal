import CustomFooter from "@/components/CustomFooter";
import CustomHeader from "@/components/CustomHeader";
import CustomSearchBar from "@/components/CustomSearchBar";
import LoadingOverlay from "@/components/LoadingOverlay";
import SearchResults from "@/components/SearchResults";
import { useTheme } from "@/components/ThemeContext";
import colors from "@/constants/colors";
import { cleanWpRenderedText, getPostTitleText } from "@/hooks/postsUtils";
import { usePostsByCategory } from "@/hooks/usePostsByCategory";
import { WPPost } from "@/types/wp";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const AUTO_SEARCH_DEBOUNCE_MS = 220;

const SearchScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { query } = useLocalSearchParams<{ query?: string }>();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const searchFieldBackground = isDark ? "#222" : "#e5e7eb";
  const searchFieldTextColor = isDark ? colors.grey : colors.black;
  const searchFieldPlaceholder = isDark ? "#9ca3af" : "#6b7280";
  const searchFieldIconColor = isDark ? "#9ca3af" : "#4b5563";

  const [searchQuery, setSearchQuery] = React.useState("");
  const [noSearchResults, setNoSearchResults] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadingNav, setLoadingNav] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const requestIdRef = React.useRef(0);
  const hydratedFromParamRef = React.useRef(false);

  const {
    posts,
    searchLoading,
    searchPostsFromCache,
    setPosts,
    loadMoreSearchPosts,
    resetSearchPagination,
    searchHasMore,
    searchLoadingMore,
  } = usePostsByCategory();

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      setLoadingNav(false);
    });
    return unsubscribe;
  }, [navigation]);

  const deriveCategoryName = (post: WPPost): string | undefined => {
    const groups = (post as any)?._embedded?.["wp:term"];
    if (!Array.isArray(groups)) return undefined;

    const flattened = groups.flat().filter(Boolean);
    const category = flattened.find(
      (term: any) => term?.taxonomy === "category" && term?.name,
    );

    return category?.name ? String(category.name) : undefined;
  };

  const highlightSearchTerm = (text: string, term: string) => {
    const normalizedTerm = term.trim();
    if (!normalizedTerm) {
      return (
        <Text
          style={{
            color: isDark ? colors.grey : colors.black,
            fontFamily: "Roboto-ExtraBold",
          }}
          numberOfLines={2}
        >
          {text}
        </Text>
      );
    }

    const parts = text.split(new RegExp(`(${normalizedTerm})`, "gi"));
    return (
      <Text
        style={{
          color: isDark ? colors.grey : colors.black,
          fontFamily: "Roboto-ExtraBold",
        }}
        numberOfLines={2}
      >
        {parts.map((part, index) => (
          <Text
            key={`${part}-${index}`}
            style={
              part.toLowerCase() === normalizedTerm.toLowerCase()
                ? { color: colors.red }
                : undefined
            }
          >
            {part}
          </Text>
        ))}
      </Text>
    );
  };

  const performSearch = React.useCallback(
    async (rawQuery: string) => {
      const trimmed = String(rawQuery || "").trim();
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (!trimmed) {
        resetSearchPagination();
        setPosts([]);
        setNoSearchResults(false);
        return;
      }

      const found = await searchPostsFromCache(trimmed);
      if (requestIdRef.current !== requestId) return;
      setNoSearchResults(found.length === 0);
    },
    [resetSearchPagination, searchPostsFromCache, setPosts],
  );

  const scheduleSearch = React.useCallback(
    (rawQuery: string, delay = AUTO_SEARCH_DEBOUNCE_MS) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        performSearch(rawQuery).catch((error) => {
          console.error("Search failed:", error);
        });
      }, delay);
    },
    [performSearch],
  );

  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (hydratedFromParamRef.current) return;
    if (typeof query !== "string" || !query.trim()) return;

    hydratedFromParamRef.current = true;
    const initialValue = decodeURIComponent(query);
    setSearchQuery(initialValue);
    scheduleSearch(initialValue, 0);
  }, [query, scheduleSearch]);

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    scheduleSearch(value);
  };

  const handleSearchSubmit = (value: string) => {
    const normalized = value.trim();
    setSearchQuery(normalized);
    scheduleSearch(normalized, 0);
  };

  const handleSearchReset = () => {
    requestIdRef.current += 1;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSearchQuery("");
    setPosts([]);
    setNoSearchResults(false);
    resetSearchPagination();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await performSearch(searchQuery);
    } finally {
      setRefreshing(false);
    }
  };

  const handleBackWithLoading = () => {
    if (loadingNav) return;
    setLoadingNav(true);
    requestAnimationFrame(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    });
  };

  const handleDrawerCategorySelect = (categoryName: string) => {
    if (!categoryName || categoryName === "Latin | Ćirilica" || loadingNav) return;
    setLoadingNav(true);
    requestAnimationFrame(() => {
      router.replace({ pathname: "/", params: { selectedCategory: categoryName } });
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
          category: encodeURIComponent(deriveCategoryName(post) || "Pretraga"),
        },
      });
    });
  };

  const renderSearchPost = ({ item }: { item: WPPost }) => {
    const media = item._embedded?.["wp:featuredmedia"]?.[0];
    const sizes = media?.media_details?.sizes;
    const image =
      sizes?.medium?.source_url ||
      sizes?.medium_large?.source_url ||
      sizes?.large?.source_url ||
      media?.source_url;

    const date = new Date(item.date).toLocaleDateString("sr-RS");

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
            : { elevation: 0 }),
        }}
      >
        <TouchableOpacity
          onPress={() => openPost(item)}
          disabled={loadingNav}
          activeOpacity={0.85}
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
          />

          {highlightSearchTerm(getPostTitleText(item), searchQuery)}

          <Text
            className="text-xs mt-1 mb-1"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ color: colors.darkerGray, fontSize: 12 }}
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
            {cleanWpRenderedText(item.excerpt?.rendered)}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const hasQuery = searchQuery.trim().length > 0;

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: isDark ? colors.black : colors.grey }}
    >
      <CustomHeader
        onMenuToggle={setMenuOpen}
        onCategorySelected={handleDrawerCategorySelect}
        activeCategory="Pretraga"
        onSearchQuery={handleSearchSubmit}
        onBackPress={handleBackWithLoading}
        loadingNav={loadingNav}
      />

      <View className="px-2 pt-2 pb-3">
        {hasQuery && (
          <Text
            style={{
              fontSize: 24,
              color: isDark ? colors.grey : colors.black,
              fontFamily: Platform.OS === "android" ? "Roboto-Bold" : "System",
              marginHorizontal: 12,
              paddingTop: 8,
              paddingBottom: 8,
            }}
          >
            Rezultati pretrage za:{" "}
            <Text style={{ color: colors.red, fontFamily: "Roboto-Bold" }}>
              &quot;{searchQuery.trim()}&quot;
            </Text>
          </Text>
        )}

        <CustomSearchBar
          query={searchQuery}
          onSearch={handleSearchSubmit}
          onQueryChange={handleSearchInputChange}
          onReset={handleSearchReset}
          backgroundColor={searchFieldBackground}
          inputTextColor={searchFieldTextColor}
          placeholderColor={searchFieldPlaceholder}
          iconColor={searchFieldIconColor}
          containerStyle={{ marginTop: 4 }}
          autoFocus
        />
      </View>

      {searchLoading && searchQuery.trim().length > 0 && (
        <View style={{ paddingVertical: 8, alignItems: "center" }}>
          <ActivityIndicator
            size="small"
            color={isDark ? colors.grey : colors.black}
          />
        </View>
      )}

      <SearchResults
        posts={posts}
        noSearchResults={noSearchResults}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        loadingNav={loadingNav}
        hasMore={searchHasMore}
        loadingMore={searchLoadingMore}
        onLoadMore={loadMoreSearchPosts}
        renderItem={renderSearchPost}
      />

      {loadingNav && <LoadingOverlay isDark={isDark} message="Učitavanje..." />}

      {!menuOpen && <CustomFooter />}
    </SafeAreaView>
  );
};

export default SearchScreen;
