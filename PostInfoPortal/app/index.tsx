import { View, Text, Image, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '@/components/CustomHeader';
import CustomMenuCategories from '@/components/CustomMenuCategories';
import CustomFooter from '@/components/CustomFooter';
import axios from 'axios';
import {useRouter} from "expo-router";
import {WPPost} from "@/types/wp";

const Index = () => {
    const [posts, setPosts] = useState([]);
    // controls footer visibility
    const [menuOpen, setMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchPosts = async () => {
        try {
            const res = await axios.get('https://postinfo.rs/wp-json/wp/v2/posts?_embed');
            setPosts(res.data);
        } catch (err) {
            console.error('Greška pri preuzimanju vesti:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const renderItem = ({ item }: { item: WPPost }) => {
        const image = item._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        const title = item.title.rendered;
        const excerpt = item.excerpt.rendered.replace(/<[^>]+>/g, '');

        return (
            <TouchableOpacity
                className="flex-row items-start gap-3 p-4 border-b border-gray-200"
                onPress={() =>
                    router.push({
                        pathname: '/post-details',
                        params: { post: JSON.stringify(item) },
                    })
                }
            >
                {image && (
                    <Image
                        source={{ uri: image }}
                        className="w-[90px] h-[90px] rounded-md"
                        resizeMode="cover"
                    />
                )}
                <View className="flex-1">
                    <Text className="font-semibold text-base text-black" numberOfLines={2}>
                        {title}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1" numberOfLines={3}>
                        {excerpt}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#201F5B" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">

            <CustomHeader onMenuToggle={(visible) => setMenuOpen(visible)} />
            <CustomMenuCategories />
            <FlatList
                data={posts}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 90 }}
                className="flex-1"
            />
            {/*conditionally render CustomFooter if the sliding menu is open, to prevent overlaping*/}
            {!menuOpen && <CustomFooter />}
        </SafeAreaView>
    );
};

export default Index;