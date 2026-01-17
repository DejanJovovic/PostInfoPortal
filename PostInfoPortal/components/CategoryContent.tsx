import { pickRandomAd } from "@/constants/ads";
import colors from "@/constants/colors";
import React from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import CustomBanner from "./CustomBanner";
import CustomPostsSection from "./CustomPostsSection";
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

  const categoryEndAd = pickRandomAd();

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

      <CustomBanner
        url={categoryEndAd.url}
        imageSrc={categoryEndAd.imageSrc}
        videoSrc={categoryEndAd.videoSrc}
      />
    </ScrollView>
  );
};

export default CategoryContent;
