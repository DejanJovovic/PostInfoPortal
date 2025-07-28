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

    const renderItem = ({item}: { item: WPPost }) => {
        const image = item._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        const postTitle = item.title.rendered;

        return (
            <TouchableOpacity
                className="mr-3 mt-5"
                onPress={async () => {
                    try {
                        const fullPostRes = await fetch(`https://www.postinfo.rs/wp-json/wp/v2/posts/${item.id}?_embed`);
                        const fullPost = await fullPostRes.json();

                        router.push({
                            pathname: '/post-details',
                            params: {post: JSON.stringify(fullPost), category: categoryName},
                        });
                    } catch (error) {
                        console.error('Greška prilikom učitavanja detalja posta:', error);
                    }
                }}
            >
                {image && (
                    <Image
                        source={{uri: image}}
                        className="w-[140px] h-[100px] rounded-md"
                        resizeMode="cover"
                    />
            )}
                <Text className="text-lg mt-1 w-[140px] font-semibold"
                      style={{ color: isDark ? '#F9F9F9' : '#000000' }}
                      numberOfLines={2}>
                    {postTitle}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View className="mb-6 px-4 mt-5">
            <Text className="text-xl font-bold mb-2"
                  style={{ color: isDark ? '#fff' : '#000000' }}>{title || categoryName}</Text>
            <View className="h-[1px] mt-4 mb-2"
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