import { pickRandomAd } from '@/constants/ads';
import colors from '@/constants/colors';
import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import CustomPostsSection from './CustomPostsSection';
import { useTheme } from './ThemeContext';

interface CategoryContentProps {
    activeCategory: string;
    posts: any[];
    refreshing: boolean;
    onRefresh: () => void;
    onPostPress: (postId: number, categoryName: string) => void;
    loadingNav: boolean;
}

const CategoryContent: React.FC<CategoryContentProps> = ({
    activeCategory,
    posts,
    refreshing,
    onRefresh,
    onPostPress,
    loadingNav,
}) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    if (posts.length === 0) {
        return (
            <View className="flex-1 items-center justify-center px-4">
                <Text
                    className="text-center"
                    style={{
                        color: isDark ? colors.grey : colors.black,
                        fontFamily: 'Roboto-Regular',
                    }}
                >
                    Nema objava za ovu kategoriju.
                </Text>
            </View>
        );
    }

    const categoryEndAd = pickRandomAd();

    return (
        <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <CustomPostsSection
                categoryName={activeCategory}
                posts={posts}
                onPostPress={onPostPress}
                loadingNav={loadingNav}
                adAtEnd
                adUrl={categoryEndAd.url}
                adImageUrl={categoryEndAd.imageSrc}
            />
        </ScrollView>
    );
};

export default CategoryContent;