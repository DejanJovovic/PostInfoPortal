import React from 'react';
import {View, FlatList, TouchableOpacity, Image, Text} from 'react-native';
import {WPPost} from '@/types/wp';
import {router} from "expo-router";
import colors from "@/constants/colors";

type Props = {
    categoryName: string;
    posts: WPPost[];
    title?: string;
};

const CustomPostsSection: React.FC<Props> = ({categoryName, posts, title}) => {
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
                            params: {post: JSON.stringify(fullPost)},
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
                <Text className="text-sm mt-1 w-[140px]" numberOfLines={2}>
                    {postTitle}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View className="mb-6 px-4 mt-5">
            <Text className="text-xl font-bold mb-2" style={{color: colors.black}}>{title || categoryName}</Text>
            <View className="h-[1px] bg-gray-700 mt-4 mb-2"/>
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