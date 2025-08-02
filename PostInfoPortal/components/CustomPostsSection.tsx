import React from 'react';
import {View, FlatList, TouchableOpacity, Image, Text} from 'react-native';
import {WPPost} from '@/types/wp';
import {router} from "expo-router";
import {useTheme} from "@/components/ThemeContext";

type Props = {
    categoryName: string;
    posts: WPPost[];
    title?: string;
    loading?: boolean;
};

const CustomPostsSection: React.FC<Props> = ({ categoryName, posts, title, loading }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const renderItem = ({ item }: { item: WPPost }) => {
        const image = item._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        const date = new Date(item.date).toLocaleDateString('sr-RS');
        const excerpt = item.excerpt.rendered.replace(/<[^>]+>/g, '');
        const postTitle = item.title.rendered;

        return (
            <TouchableOpacity
                className="w-[240px] mr-3"
                onPress={async () => {
                    try {
                        const fullPostRes = await fetch(`https://www.postinfo.rs/wp-json/wp/v2/posts/${item.id}?_embed`);
                        const fullPost = await fullPostRes.json();

                        router.push({
                            pathname: '/post-details',
                            params: { post: JSON.stringify(fullPost), category: categoryName },
                        });
                    } catch (error) {
                        console.error('Greška prilikom učitavanja detalja posta:', error);
                    }
                }}
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
                    <Text className="text-base font-semibold mb-1"
                          style={{ color: isDark ? 'white' : 'black' }}
                          numberOfLines={2}>
                        {postTitle}
                    </Text>
                    <Text className="text-xs mb-1"
                          style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                        {date}
                    </Text>
                    <Text className="text-sm"
                          numberOfLines={2}
                          style={{ color: isDark ? '#959898' : '#999a9b' }}>
                        {excerpt}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const SkeletonCard = () => (
        <View className="w-[240px] mr-3">
            <View
                className="rounded-2xl shadow-md p-3 border"
                style={{
                    backgroundColor: isDark ? '#1b1b1b' : 'white',
                    borderColor: isDark ? '#333' : '#e5e7eb',
                }}
            >
                <View className="w-full h-[110px] rounded-xl mb-2"
                      style={{ backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }}/>
                <View className="h-4 rounded mb-2"
                      style={{ backgroundColor: isDark ? '#3a3a3a' : '#d1d5db', width: '90%' }}/>
                <View className="h-3 rounded mb-2"
                      style={{ backgroundColor: isDark ? '#3a3a3a' : '#d1d5db', width: '40%' }}/>
                <View className="h-3 rounded"
                      style={{ backgroundColor: isDark ? '#3a3a3a' : '#d1d5db', width: '100%' }}/>
            </View>
        </View>
    );

    return (
        <View className="mb-6 px-4 mt-5">
            <Text className="text-xl font-bold mb-2"
                  style={{ color: isDark ? '#fff' : '#000000' }}>{title || categoryName}</Text>
            <View className="h-[1px] mt-4 mb-4"
                  style={{ backgroundColor: isDark ? '#F9F9F9' : '#000000' }}/>

            <FlatList
                data={loading ? Array(3).fill(null) : posts}
                renderItem={loading ? () => <SkeletonCard /> : renderItem}
                keyExtractor={(item, index) => (item ? item.id.toString() : `skeleton-${index}`)}
                horizontal
                showsHorizontalScrollIndicator={false}
            />
        </View>
    );
};

export default CustomPostsSection;