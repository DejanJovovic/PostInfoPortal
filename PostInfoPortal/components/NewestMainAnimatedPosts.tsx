import colors from "@/constants/colors";
import { getPostTitleText } from "@/hooks/postsUtils";
import { WPPost } from "@/types/wp";
import { getPostByIdFull } from "@/utils/wpApi";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "./ThemeContext";

type NewestMainCarouselProps = {
  posts: WPPost[];
  onPostPress?: (postId: number, categoryName: string) => void;
  loadingNav?: boolean;
};

const AUTO_ADVANCE_MS = 6000;
const MAX_NEWEST = 7;
const THUMBS_VISIBLE = 4;
const MAIN_NEWS_CATEGORY_NAME = "Glavna vest";
const MAIN_NEWS_LABEL = "GLAVNA VEST";
const FALLBACK_CATEGORY_NAMES = new Set(["nekategorizovano", "uncategorized"]);

const getFirstImageFromContent = (html?: string) => {
  if (!html) return undefined;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : undefined;
};

const deriveCategoryName = (post: WPPost): string | undefined => {
  const groups = (post as any)?._embedded?.["wp:term"];
  if (!Array.isArray(groups)) return undefined;

  const flat = groups.flat().filter(Boolean);
  const cats = flat
    .filter((t: any) => t?.taxonomy === "category" && t?.name)
    .map((t: any) => String(t.name).trim())
    .filter((name: string) => {
      if (!name) return false;
      return !FALLBACK_CATEGORY_NAMES.has(name.toLowerCase());
    });

  const preferred =
    cats.find(
      (n) => n.trim().toLowerCase() !== MAIN_NEWS_CATEGORY_NAME.toLowerCase(),
    ) ?? cats[0];

  return preferred ? preferred : undefined;
};

const getImg = (p: WPPost) => {
  const media = p?._embedded?.["wp:featuredmedia"]?.[0];
  if (media) {
    const sizes = media.media_details?.sizes;
    const featured =
      sizes?.medium?.source_url ||
      sizes?.medium_large?.source_url ||
      sizes?.large?.source_url ||
      media.source_url;
    if (featured) return featured;
  }
  const yoast = (p as any)?.yoast_head_json?.og_image?.[0]?.url;
  if (yoast) return String(yoast);
  return getFirstImageFromContent(p?.content?.rendered);
};

export default function NewestMainCarousel({
  posts,
  onPostPress,
  loadingNav,
}: NewestMainCarouselProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const anim = useRef(new Animated.Value(0)).current;
  const [thumbsViewportWidth, setThumbsViewportWidth] = useState(0);
  const thumbScrollRef = useRef<ScrollView | null>(null);
  const prevIndexRef = useRef(0);
  const [resolvedCategoryById, setResolvedCategoryById] = useState<
    Record<number, string>
  >({});
  const resolvingIdsRef = useRef(new Set<number>());

  const newestPosts = useMemo(() => {
    const cleaned = (posts || []).filter((p) => p && p.date);
    const sorted = [...cleaned].sort((a, b) =>
      (b.date || "").localeCompare(a.date || ""),
    );
    return sorted.slice(0, MAX_NEWEST);
  }, [posts]);

  const thumbsVisibleCount = useMemo(() => {
    return Math.min(THUMBS_VISIBLE, Math.max(1, newestPosts.length));
  }, [newestPosts.length]);

  const thumbsWindowStart = useMemo(() => {
    const maxStart = Math.max(0, newestPosts.length - thumbsVisibleCount);
    return Math.min(index, maxStart);
  }, [index, newestPosts.length, thumbsVisibleCount]);

  const thumbItemWidth = useMemo(() => {
    if (!thumbsViewportWidth) return 0;
    return thumbsViewportWidth / thumbsVisibleCount;
  }, [thumbsViewportWidth, thumbsVisibleCount]);

  useEffect(() => {
    if (newestPosts.length < 2) return;
    const id = setInterval(() => {
      setDirection(1);
      setIndex((prev) => (prev + 1) % newestPosts.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [newestPosts.length]);

  useEffect(() => {
    if (index >= newestPosts.length) setIndex(0);
  }, [index, newestPosts.length]);

  useEffect(() => {
    if (!thumbItemWidth) return;

    const toX = thumbsWindowStart * thumbItemWidth;
    const prevIndex = prevIndexRef.current;
    const lastIdx = newestPosts.length - 1;
    const isWrap =
      newestPosts.length > 0 &&
      prevIndex === lastIdx &&
      index === 0 &&
      direction === 1;

    thumbScrollRef.current?.scrollTo({ x: toX, animated: !isWrap });

    prevIndexRef.current = index;
  }, [direction, index, newestPosts.length, thumbItemWidth, thumbsWindowStart]);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [anim, index, direction]);

  useEffect(() => {
    let cancelled = false;

    const idsToResolve = newestPosts
      .filter((p) => p && typeof p.id === "number")
      .filter((p) => !deriveCategoryName(p))
      .map((p) => p.id)
      .filter(
        (id) => !resolvedCategoryById[id] && !resolvingIdsRef.current.has(id),
      );

    if (idsToResolve.length === 0) return;

    idsToResolve.forEach((id) => resolvingIdsRef.current.add(id));

    Promise.all(
      idsToResolve.map(async (id) => {
        try {
          const full = await getPostByIdFull(id);
          const name = deriveCategoryName(full as any);
          return [id, name] as const;
        } catch {
          return [id, undefined] as const;
        }
      }),
    )
      .then((pairs) => {
        if (cancelled) return;
        setResolvedCategoryById((prev) => {
          const next = { ...prev };
          for (const [id, name] of pairs) {
            if (typeof name === "string" && name.length > 0) next[id] = name;
          }
          return next;
        });
      })
      .finally(() => {
        idsToResolve.forEach((id) => resolvingIdsRef.current.delete(id));
      });

    return () => {
      cancelled = true;
    };
  }, [newestPosts, resolvedCategoryById]);

  if (newestPosts.length === 0) return null;

  const current = newestPosts[index];
  const image = current ? getImg(current) : undefined;
  const date = current?.date
    ? new Date(current.date).toLocaleDateString("sr-RS")
    : "";
  const derivedCategory =
    (current ? deriveCategoryName(current) : undefined) ||
    (current?.id ? resolvedCategoryById[current.id] : undefined);
  const meta = date;
  const categoryLabel =
    index === 0
      ? MAIN_NEWS_LABEL
      : (derivedCategory || MAIN_NEWS_LABEL).toUpperCase();
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [direction === 1 ? 18 : -18, 0],
  });

  const handlePrev = () => {
    setDirection(-1);
    setIndex((prev) => (prev - 1 + newestPosts.length) % newestPosts.length);
  };

  const handleNext = () => {
    setDirection(1);
    setIndex((prev) => (prev + 1) % newestPosts.length);
  };

  const handlePress = (post: WPPost) => {
    if (!onPostPress || loadingNav) return;
    onPostPress(
      post.id,
      deriveCategoryName(post) ||
        resolvedCategoryById[post.id] ||
        MAIN_NEWS_CATEGORY_NAME,
    );
  };

  const fallbackThumb =
    image || newestPosts.map((post) => getImg(post)).find(Boolean);

  const onThumbsLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== thumbsViewportWidth) setThumbsViewportWidth(w);
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          { backgroundColor: isDark ? "#1b1b1b" : "#ffffff" },
        ]}
      >
        <View style={styles.mainImageWrap}>
          <TouchableOpacity
            onPress={() => current && handlePress(current)}
            disabled={!current || loadingNav}
            activeOpacity={0.85}
          >
            {image ? (
              <Image
                source={{ uri: image }}
                style={styles.mainImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.mainImageFallback} />
            )}
            <View style={styles.mainOverlay}>
              {categoryLabel.length > 0 && (
                <View
                  style={[
                    styles.badge,
                    categoryLabel === MAIN_NEWS_LABEL && styles.mainNewsBadge,
                  ]}
                >
                  <Text style={styles.badgeText}>{categoryLabel}</Text>
                </View>
              )}
              <Animated.View
                style={{ transform: [{ translateX }], opacity: anim }}
              >
                <Text style={styles.mainTitle} numberOfLines={3}>
                  {getPostTitleText(current)}
                </Text>
              </Animated.View>
              <Text
                style={styles.dateText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {meta}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.arrowStack}>
            <TouchableOpacity
              style={styles.arrowButtonPrimary}
              onPress={handleNext}
              disabled={newestPosts.length < 2}
              activeOpacity={0.75}
            >
              <Image
                source={require("../assets/icons/right-arrow.png")}
                style={[styles.arrowIcon, styles.arrowIconLight]}
                contentFit="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.arrowButtonSecondary}
              onPress={handlePrev}
              disabled={newestPosts.length < 2}
              activeOpacity={0.75}
            >
              <Image
                source={require("../assets/icons/left-arrow.png")}
                style={[styles.arrowIcon, styles.arrowIconRed]}
                contentFit="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.thumbRow} onLayout={onThumbsLayout}>
        <ScrollView
          ref={thumbScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.thumbTrack}
        >
          {newestPosts.map((post, idx) => {
            const thumbUri = getImg(post) || fallbackThumb;
            const isActive = idx === index;
            return (
              <View
                key={post.id}
                style={[
                  styles.thumbItem,
                  thumbItemWidth
                    ? { width: thumbItemWidth }
                    : styles.thumbItem4,
                ]}
              >
                <TouchableOpacity
                  style={styles.thumbTouchable}
                  onPress={() => {
                    if (idx === index) {
                      handlePress(post);
                      return;
                    }
                    setDirection(idx >= index ? 1 : -1);
                    setIndex(idx);
                  }}
                  disabled={loadingNav}
                  activeOpacity={0.85}
                >
                  {thumbUri ? (
                    <Image
                      source={{ uri: thumbUri }}
                      style={styles.thumbImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.thumbImageFallback} />
                  )}
                </TouchableOpacity>
                {isActive && (
                  <View
                    style={[
                      styles.thumbPointer,
                      { borderTopColor: isDark ? colors.grey : colors.black },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
  },
  mainImageWrap: {
    position: "relative",
  },
  mainImage: {
    width: "100%",
    height: 220,
  },
  mainImageFallback: {
    width: "100%",
    height: 220,
    backgroundColor: "#1b1b1b",
  },
  mainOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#0f1b2d",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 8,
  },
  mainNewsBadge: {
    minWidth: 122,
    paddingHorizontal: 14,
  },
  badgeText: {
    color: "#ffffff",
    fontFamily: "Roboto-Bold",
    fontSize: 12,
    letterSpacing: 0.8,
  },
  mainTitle: {
    color: "#ffffff",
    fontFamily: "Roboto-ExtraBold",
    fontSize: 20,
    lineHeight: 26,
  },
  dateText: {
    color: "#ffffff",
    fontFamily: "Roboto-Medium",
    marginTop: 6,
  },
  arrowStack: {
    position: "absolute",
    right: 12,
    bottom: 16,
  },
  arrowButtonPrimary: {
    width: 46,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.red,
  },
  arrowButtonSecondary: {
    width: 46,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    marginTop: 8,
  },
  arrowIcon: {
    width: 16,
    height: 16,
  },
  arrowIconLight: {
    tintColor: "#ffffff",
  },
  arrowIconRed: {
    tintColor: colors.red,
  },
  thumbRow: {
    overflow: "hidden",
    marginTop: 2,
    paddingTop: 10,
    marginBottom: 6,
    width: "100%",
  },
  thumbTrack: {
    flexDirection: "row",
  },
  thumbItem: {
    alignItems: "center",
    position: "relative",
  },
  thumbItem4: {
    width: "25%",
  },
  thumbImage: {
    width: "92%",
    height: 62,
    borderRadius: 6,
    backgroundColor: "#f2f2f2",
    marginTop: 8,
    alignSelf: "center",
  },
  thumbImageFallback: {
    width: "92%",
    height: 62,
    borderRadius: 6,
    backgroundColor: "#d8d8d8",
    marginTop: 8,
    alignSelf: "center",
  },
  thumbTouchable: {
    width: "100%",
  },
  thumbPointer: {
    width: 0,
    height: 0,
    position: "absolute",
    top: 8,
    left: "50%",
    marginLeft: -8,
    zIndex: 2,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#000000",
  },
});
