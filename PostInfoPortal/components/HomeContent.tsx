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
  rememberedScrollY?: number;
  onScrollYChange?: (y: number) => void;
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
  rememberedScrollY = 0,
  onScrollYChange,
}) => {
  const hasTodayPosts = Boolean(todayPosts && todayPosts.length > 0);
  const scrollRef = React.useRef<ScrollView>(null);
  const restoredRef = React.useRef(false);

  const restoreScrollPosition = React.useCallback(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (rememberedScrollY <= 0) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: rememberedScrollY, animated: false });
    });
  }, [rememberedScrollY]);

  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onContentSizeChange={restoreScrollPosition}
      onScroll={(e) => {
        const y = Math.max(0, e.nativeEvent.contentOffset.y || 0);
        onScrollYChange?.(y);
      }}
      scrollEventThrottle={16}
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
          <RotatingAdBanner
            containerStyle={{ marginTop: -6, marginBottom: 6 }}
          />
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
