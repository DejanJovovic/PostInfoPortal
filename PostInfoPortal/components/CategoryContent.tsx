import colors from "@/constants/colors";
import { getPostTitleText } from "@/hooks/postsUtils";
import { WPPost } from "@/types/wp";
import { getLatestPosts } from "@/utils/wpApi";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CustomPostsSection from "./CustomPostsSection";
import RotatingAdBanner from "./RotatingAdBanner";
import { useTheme } from "./ThemeContext";

interface CategoryContentProps {
  activeCategory: string;
  posts: any[];
  refreshing: boolean;
  onRefresh: () => void;
  onPostPress: (postId: number, categoryName: string) => void;
  loadingNav: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

const CategoryContent: React.FC<CategoryContentProps> = ({
  activeCategory,
  posts,
  refreshing,
  onRefresh,
  onPostPress,
  loadingNav,
  hasMore,
  loadingMore,
  onLoadMore,
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [popularPosts, setPopularPosts] = useState<WPPost[]>([]);
  const [hoveredPopularId, setHoveredPopularId] = useState<number | null>(null);
  const [pressedPopularId, setPressedPopularId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPopular = async () => {
      try {
        const latest = await getLatestPosts(1, 5);
        if (!cancelled) {
          setPopularPosts(Array.isArray(latest) ? latest : []);
        }
      } catch {
        if (!cancelled) {
          setPopularPosts([]);
        }
      }
    };

    loadPopular();

    return () => {
      cancelled = true;
    };
  }, [activeCategory]);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 140 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {posts.length === 0 ? (
        <View
          className="flex-1 items-center justify-center px-4"
          style={{ paddingTop: 24 }}
        >
          <Text
            className="text-center"
            style={{
              color: isDark ? colors.grey : colors.black,
              fontFamily: "Roboto-Regular",
            }}
          >
            Nema objava za ovu kategoriju.
          </Text>
        </View>
      ) : (
        <CustomPostsSection
          categoryName={activeCategory}
          posts={posts}
          onPostPress={onPostPress}
          loadingNav={loadingNav}
        />
      )}

      <View style={{ paddingHorizontal: 12, marginTop: 0 }}>
        <TouchableOpacity
          onPress={onLoadMore}
          disabled={!hasMore || loadingMore || loadingNav}
          style={{
            backgroundColor: colors.blue,
            alignSelf: "center",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            opacity: !hasMore || loadingMore || loadingNav ? 0.7 : 1,
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

      {popularPosts.length > 0 && (
        <View style={{ paddingHorizontal: 12, marginTop: 26 }}>
          <Text
            style={{
              fontSize: 28,
              color: isDark ? colors.grey : colors.black,
              fontFamily: Platform.OS === "android" ? "sans-serif" : "System",
              fontWeight: "700",
              marginBottom: 18,
            }}
          >
            Popularno
          </Text>
          {popularPosts.map((post) => {
            const isHighlighted =
              hoveredPopularId === post.id || pressedPopularId === post.id;
            return (
              <Pressable
                key={post.id}
                onPress={() => onPostPress(post.id, activeCategory)} // check later if its supposed to actually be activeCategory
                onPressIn={() => setPressedPopularId(post.id)}
                onPressOut={() => setPressedPopularId(null)}
                onHoverIn={() => setHoveredPopularId(post.id)}
                onHoverOut={() => setHoveredPopularId(null)}
                disabled={loadingNav}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? "#3f3f3f" : "#e5e7eb",
                }}
              >
                <Text
                  style={{
                    color: isHighlighted
                      ? colors.red
                      : isDark
                        ? colors.grey
                        : colors.black,
                    fontFamily: "Roboto-Bold",
                    fontSize: 16,
                    lineHeight: 22,
                  }}
                >
                  {getPostTitleText(post)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <RotatingAdBanner />
    </ScrollView>
  );
};

export default CategoryContent;
