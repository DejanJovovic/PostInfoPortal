import React from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from './ThemeContext';
import { WPPost } from '@/types/wp';

interface Props {
    categoryName: string;
    posts: WPPost[];
    /** Naslovna posts UI */
    showFeaturedFirst?: boolean;
    /** posts UI for other categories */
    gridAfterFirst?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
}

const CustomPostsSection: React.FC<Props> = ({
                                                 categoryName,
                                                 posts,
                                                 showFeaturedFirst = false,
                                                 gridAfterFirst = false,
                                                 refreshing,
                                                 onRefresh,
                                             }) => {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const goToPost = (postId: number) =>
        router.push({
            pathname: '/post-details',
            params: { postId: postId.toString(), category: categoryName },
        });

    const Card = ({ item }: { item: WPPost }) => {
        const image = item._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        const date = new Date(item.date).toLocaleDateString('sr-RS');
        const excerpt = item.excerpt?.rendered?.replace(/<[^>]+>/g, '') || '';
        const postTitle = item.title?.rendered || '';

        return (
            <View
                className="rounded-2xl shadow-md p-3 border"
                style={{
                    backgroundColor: isDark ? '#1b1b1b' : 'white',
                    borderColor: isDark ? '#333' : '#e5e7eb',
                }}
            >
                {image && (
                    <Image source={{ uri: image }} className="w-full h-[110px] rounded-xl mb-2" resizeMode="cover" />
                )}
                <Text
                    className="text-base font-semibold mb-1"
                    style={{ color: isDark ? 'white' : 'black' }}
                    numberOfLines={2}
                >
                    {postTitle}
                </Text>
                <Text className="text-xs mb-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    {date}
                </Text>
                <Text className="text-sm" numberOfLines={2} style={{ color: isDark ? '#959898' : '#999a9b' }}>
                    {excerpt}
                </Text>
            </View>
        );
    };

    const FeaturedCard = ({ item }: { item: WPPost }) => {
        const image = item._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        const date = new Date(item.date).toLocaleDateString('sr-RS');
        const excerpt = item.excerpt?.rendered?.replace(/<[^>]+>/g, '') || '';
        const postTitle = item.title?.rendered || '';

        return (
            <View
                className="rounded-2xl shadow-md mb-4 mx-4 p-4 border"
                style={{
                    backgroundColor: isDark ? '#1b1b1b' : 'white',
                    borderColor: isDark ? '#333' : '#e5e7eb',
                }}
            >
                {image && <Image source={{ uri: image }} className="w-full h-48 rounded-xl mb-3" resizeMode="cover" />}
                <Text className="font-bold text-base" style={{ color: isDark ? '#fff' : '#000000' }} numberOfLines={2}>
                    {postTitle}
                </Text>
                <Text className="text-xs mb-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    {date}
                </Text>
                <Text className="text-sm" numberOfLines={3} style={{ color: isDark ? '#959898' : '#999a9b' }}>
                    {excerpt}
                </Text>
            </View>
        );
    };

    if (gridAfterFirst) {
        const rest = posts.slice(1);

        return (
            <ScrollView
                contentContainerStyle={{ paddingBottom: 8 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    refreshing !== undefined && onRefresh
                        ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        : undefined
                }
            >
                {posts.length > 0 && (
                    <TouchableOpacity onPress={() => goToPost(posts[0].id)}>
                        <FeaturedCard item={posts[0]} />
                    </TouchableOpacity>
                )}

                {rest.length > 0 && (
                    <View style={{ paddingHorizontal: 12 }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                justifyContent: 'space-between',
                            }}
                        >
                            {rest.map((item) => (
                                <View key={item.id} style={{ width: '48%', marginBottom: 12 }}>
                                    <TouchableOpacity onPress={() => goToPost(item.id)}>
                                        <Card item={item} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        );
    }

    const horizontalData = showFeaturedFirst ? posts.slice(1) : posts;

    return (
        <View className="mb-6">
            <Text className="text-xl font-extrabold px-4 mb-3" style={{ color: isDark ? '#fff' : '#000' }}>
                {categoryName}
            </Text>

            {showFeaturedFirst && posts.length > 0 && (
                <TouchableOpacity onPress={() => goToPost(posts[0].id)}>
                    <FeaturedCard item={posts[0]} />
                </TouchableOpacity>
            )}

            {horizontalData.length > 0 && (
                <FlatList
                    data={horizontalData}
                    renderItem={({ item }) => (
                        <TouchableOpacity className="w-[240px] mr-3" onPress={() => goToPost(item.id)}>
                            <Card item={item} />
                        </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.id.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                    removeClippedSubviews
                    initialNumToRender={3}
                    maxToRenderPerBatch={4}
                    windowSize={5}
                />
            )}
        </View>
    );
};

export default CustomPostsSection;