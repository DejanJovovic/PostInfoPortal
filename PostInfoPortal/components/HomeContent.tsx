import { pickRandomAd } from "@/constants/ads";
import { WPPost } from "@/types/wp";
import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import CustomBanner from "./CustomBanner";
import CustomPostsSection from "./CustomPostsSection";
import DailyCircles from "./DailyCircles";
import NewestMainCarousel from "./NewestMainAnimatedPosts";
import NewestPostsTicker from "./TrendingPosts";

interface HomeContentProps {
  homeGroupedPosts: Record<string, WPPost[]>;
  homeCategoryOrder: string[];
  refreshing: boolean;
  onRefresh: () => void;
  onPostPress: (postId: number, categoryName: string) => void;
  loadingNav: boolean;
  todayPosts?: WPPost[];
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
  dailyCirclesPosts,
}) => {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {dailyCirclesPosts && dailyCirclesPosts.length > 0 && (
        <DailyCircles posts={dailyCirclesPosts} />
      )}
      {todayPosts && todayPosts.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <NewestPostsTicker
            posts={todayPosts}
            onPostPress={onPostPress}
            loadingNav={loadingNav}
          />
        </View>
      )}
      {todayPosts && todayPosts.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <NewestMainCarousel
            posts={todayPosts}
            onPostPress={onPostPress}
            loadingNav={loadingNav}
          />
        </View>
      )}
      {homeCategoryOrder.map((categoryName, idx) => {
        const categoryPosts = homeGroupedPosts[categoryName] || [];
        if (!categoryPosts.length) return null;
        const ad = pickRandomAd();
        return (
          <React.Fragment key={categoryName}>
            <CustomPostsSection
              categoryName={categoryName}
              posts={categoryPosts}
              isHome
              onPostPress={onPostPress}
              loadingNav={loadingNav}
            />
            <CustomBanner
              key={`ad-home-${idx}`}
              url={ad.url}
              imageSrc={ad.imageSrc}
              videoSrc={ad.videoSrc}
            />
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
};

export default HomeContent;
