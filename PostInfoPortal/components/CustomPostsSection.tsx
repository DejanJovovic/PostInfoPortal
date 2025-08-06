import React from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from './ThemeContext';
import { WPPost } from '@/types/wp';

interface Props {
    categoryName: string;
    posts: WPPost[];
}

const CustomPostsSection: React.FC<Props> = ({ categoryName, posts }) => {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const renderItem = ({ item }: { item: WPPost }) => {
        const image = item._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        const date = new Date(item.date).toLocaleDateString('sr-RS');
        const excerpt = item.excerpt?.rendered?.replace(/<[^>]+>/g, '') || '';
        const postTitle = item.title?.rendered || '';

        return (
            <TouchableOpacity
                className="w-[240px] mr-3"
                onPress={() =>
                    router.push({
                        pathname: '/post-details',
                        params: {
                            postId: item.id.toString(),
                            category: categoryName
                        }
                    })
                }
            >
                <View
                    className="rounded-2xl shadow-md p-3 border"
                    style={{
                        backgroundColor: isDark ? '#1b1b1b' : 'white',
                        borderColor: isDark ? '#333' : '#e5e7eb',
                    }}
                >
                    {image && (
                        <Image
                            source={{ uri: image }}
                            className="w-full h-[110px] rounded-xl mb-2"
                            resizeMode="cover"
                        />
                    )}
                    <Text
                        className="text-base font-semibold mb-1"
                        style={{ color: isDark ? 'white' : 'black' }}
                        numberOfLines={2}
                    >
                        {postTitle}
                    </Text>
                    <Text
                        className="text-xs mb-1"
                        style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                    >
                        {date}
                    </Text>
                    <Text
                        className="text-sm"
                        numberOfLines={2}
                        style={{ color: isDark ? '#959898' : '#999a9b' }}
                    >
                        {excerpt}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="mb-6">
            <Text
                className="text-xl font-extrabold px-4 mb-3"
                style={{ color: isDark ? '#fff' : '#000' }}
            >
                {categoryName}
            </Text>
            <FlatList
                data={posts}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                removeClippedSubviews
                initialNumToRender={3}
                maxToRenderPerBatch={4}
                windowSize={5}
            />
        </View>
    );
};

export default CustomPostsSection;