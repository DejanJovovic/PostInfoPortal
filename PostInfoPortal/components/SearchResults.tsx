import { useTheme } from "@/components/ThemeContext";
import colors from "@/constants/colors";
import { WPPost } from "@/types/wp";
import React from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    Text,
    View,
} from "react-native";

interface SearchResultsProps {
  posts: WPPost[];
  searchQuery: string;
  noSearchResults: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onPostPress: (postId: number) => void;
  loadingNav: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  renderItem: ({ item }: { item: WPPost }) => React.ReactElement;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  posts,
  searchQuery,
  noSearchResults,
  refreshing,
  onRefresh,
  onPostPress,
  loadingNav,
  hasMore,
  loadingMore,
  onLoadMore,
  renderItem,
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (posts.length === 0 && noSearchResults) {
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
      onEndReached={() => {
        if (hasMore && !loadingMore) {
          onLoadMore();
        }
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator
            size="small"
            color={isDark ? colors.grey : colors.black}
          />
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
              Nema rezultata pretrage. Pogledajte neke od ovih objava.
            </Text>
          </View>
        ) : null
      }
    />
  );
};

export default SearchResults;
