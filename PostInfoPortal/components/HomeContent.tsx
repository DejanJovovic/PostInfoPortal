import { WPPost } from "@/types/wp";
import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import CustomPostsSection from "./CustomPostsSection";
import NewestMainCarousel from "./NewestMainAnimatedPosts";
import RotatingAdBanner from "./RotatingAdBanner";
import NewestPostsTicker from "./TrendingPosts";

interface HomeContentProps {
  homeGroupedPosts: Record<string, WPPost[]>;
  homeCategoryOrder: string[];
  refreshing: boolean;
  onRefresh: () => void;
  onPostPress: (postId: number, categoryName: string) => void;
  loadingNav: boolean;
  todayPosts?: WPPost[];
  mainPosts?: WPPost[];
  dailyCirclesPosts?: WPPost[];
}

const HomeContent: React.FC<HomeContentProps> = ({
  homeGroupedPosts,
  homeCategoryOrder,
  refreshing,
  onRefresh,
  onPostPress,
  loadingNav,
  todayPosts,
  mainPosts,
  dailyCirclesPosts,
}) => {
  const hasTodayPosts = Boolean(todayPosts && todayPosts.length > 0);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* {dailyCirclesPosts && dailyCirclesPosts.length > 0 && (
        <DailyCircles posts={dailyCirclesPosts} />
      )} */}
      {hasTodayPosts && (
        <View style={{ marginTop: 1 }}>
          <NewestPostsTicker
            posts={todayPosts ?? []}
            onPostPress={onPostPress}
            loadingNav={loadingNav}
          />
        </View>
      )}
      {mainPosts && mainPosts.length > 0 && (
        <>
          <View style={{ marginTop: hasTodayPosts ? 6 : 4 }}>
            <NewestMainCarousel
              posts={mainPosts}
              onPostPress={onPostPress}
              loadingNav={loadingNav}
            />
          </View>
          <RotatingAdBanner containerStyle={{ marginTop: -6, marginBottom: 6 }} />
        </>
      )}
      {homeCategoryOrder.map((categoryName, idx) => {
        const categoryPosts = homeGroupedPosts[categoryName] || [];
        if (!categoryPosts.length) return null;

        const isLastVisibleCategoryBanner = homeCategoryOrder
          .slice(idx + 1)
          .every(
            (nextCategoryName) =>
              (homeGroupedPosts[nextCategoryName] || []).length === 0,
          );

        return (
          <React.Fragment key={categoryName}>
            <CustomPostsSection
              categoryName={categoryName}
              posts={categoryPosts}
              isHome
              onPostPress={onPostPress}
              loadingNav={loadingNav}
            />
            <View
              style={{ marginBottom: isLastVisibleCategoryBanner ? 115 : 0 }}
            >
              <RotatingAdBanner />
            </View>
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
};

export default HomeContent;
