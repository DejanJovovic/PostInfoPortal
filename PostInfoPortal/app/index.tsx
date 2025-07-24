import { View, Text, Image, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import React, {useEffect, useState} from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '@/components/CustomHeader';
import CustomMenuCategories from '@/components/CustomMenuCategories';
import CustomFooter from '@/components/CustomFooter';
import {useLocalSearchParams, useRouter} from 'expo-router';
import { WPPost } from '@/types/wp';
import { usePostsByCategory } from '@/hooks/usePostsByCategory';

const Index = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Naslovna');
    const { selectedCategory } = useLocalSearchParams();

    const { posts, loading, fetchPostsForCategory } = usePostsByCategory();
    const router = useRouter();

    useEffect(() => {
        if (selectedCategory && typeof selectedCategory === 'string') {
            fetchPostsForCategory(selectedCategory);
            setActiveCategory(selectedCategory);
        }
    }, [selectedCategory]);

    const handleCategorySelect = (categoryName: string) => {
        if (categoryName === 'Latin | Ćirilica') return;
        setActiveCategory(categoryName);
        fetchPostsForCategory(categoryName);
        setMenuOpen(false); // closes menu if the category is selected
    };

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

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/*selected categories are marked on both menuCategories (below header) and inside the menuDrawer*/}
            <CustomHeader
                onMenuToggle={(visible) => setMenuOpen(visible)}
                onCategorySelected={handleCategorySelect}
                activeCategory={activeCategory}
            />
            <CustomMenuCategories
                onSelectCategory={handleCategorySelect}
                activeCategory={activeCategory}
            />

            {/*i should also add some text if there is no posts for a certain category!!!*/}

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#201F5B" />
                </View>
            ) : (
                <FlatList
                    data={posts}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 90 }}
                    className="flex-1"
                />
            )}

            {!menuOpen && <CustomFooter />}
        </SafeAreaView>
    );
};

export default Index;