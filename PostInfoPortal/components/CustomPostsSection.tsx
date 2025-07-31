import React from 'react';
import {View, FlatList, TouchableOpacity, Image, Text} from 'react-native';
import {WPPost} from '@/types/wp';
import {router} from "expo-router";
import {useTheme} from "@/components/ThemeContext";

type Props = {
    categoryName: string;
    posts: WPPost[];
    title?: string;
};

const CustomPostsSection: React.FC<Props> = ({categoryName, posts, title}) => {

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

    return (
        <View className="mb-6 px-4 mt-5">
            <Text className="text-xl font-bold mb-2"
                  style={{ color: isDark ? '#fff' : '#000000' }}>{title || categoryName}</Text>
            <View className="h-[1px] mt-4 mb-4"
                  style={{ backgroundColor: isDark ? '#F9F9F9' : '#000000' }}/>
            <FlatList
                data={posts}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
            />
        </View>
    );
};

export default CustomPostsSection;