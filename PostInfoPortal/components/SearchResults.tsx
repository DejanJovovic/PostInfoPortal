import { useTheme } from "@/components/ThemeContext";
import colors from "@/constants/colors";
import { WPPost } from "@/types/wp";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface SearchResultsProps {
  posts: WPPost[];
  noSearchResults: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  loadingNav: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  renderItem: ({ item }: { item: WPPost }) => React.ReactElement;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  posts,
  noSearchResults,
  refreshing,
  onRefresh,
  loadingNav,
  hasMore,
  loadingMore,
  onLoadMore,
  renderItem,
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (posts.length === 0 && noSearchResults && !hasMore && !loadingMore) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text
          className="text-center"
          style={{
            color: isDark ? colors.grey : colors.black,
            fontFamily: "Roboto-Regular",
          }}
        >
          Nema rezultata za prikaz.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={{ paddingBottom: 90 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListFooterComponent={
        hasMore || loadingMore ? (
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
        ) : null
      }
      ListHeaderComponent={
        noSearchResults ? (
          <View className="px-4 mt-6 mb-10">
            <Text
              className="text-center"
              style={{
                color: isDark ? colors.grey : colors.black,
                fontFamily: "Roboto-Regular",
              }}
            >
              Nema rezultata pretrage.
            </Text>
          </View>
        ) : null
      }
    />
  );
};

export default SearchResults;
