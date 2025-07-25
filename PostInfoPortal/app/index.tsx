import { View, Text, Image, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '@/components/CustomHeader';
import CustomMenuCategories from '@/components/CustomMenuCategories';
import CustomFooter from '@/components/CustomFooter';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WPPost } from '@/types/wp';
import { usePostsByCategory } from '@/hooks/usePostsByCategory';
import CustomSearchBar from "@/components/CustomSearchBar";

const Index = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Naslovna');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [noSearchResults, setNoSearchResults] = useState(false);
    const [searchAttemptCount, setSearchAttemptCount] = useState(0);

    const { selectedCategory } = useLocalSearchParams();
    const {
        posts,
        loading,
        searchLoading,
        fetchPostsForCategory,
        searchPosts,
        setPosts,
    } = usePostsByCategory();

    const router = useRouter();

    useEffect(() => {
        if (selectedCategory && typeof selectedCategory === 'string') {
            fetchPostsForCategory(selectedCategory);
            setActiveCategory(selectedCategory);
            setSearchQuery('');
            setIsSearchActive(false);
            setNoSearchResults(false);
            setSearchAttemptCount(0);
        }
    }, [selectedCategory]);

    const handleCategorySelect = (categoryName: string) => {
        if (categoryName === 'Latin | Ćirilica') return;
        setSearchQuery('');
        setIsSearchActive(false);
        setNoSearchResults(false);
        setSearchAttemptCount(0);
        setActiveCategory(categoryName);
        fetchPostsForCategory(categoryName);
        setMenuOpen(false);
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        setIsSearchActive(true);
        setNoSearchResults(false);
        setSearchAttemptCount((prev) => prev + 1);
        setPosts([]);
        const found = await searchPosts(query);
        if (found.length === 0) {
            if (searchAttemptCount === 0) {
                setNoSearchResults(true);
                await fetchPostsForCategory('Naslovna');
            } else {
                setPosts([]);
                setNoSearchResults(true);
            }
        }
    };

    const resetSearch = async () => {
        setSearchQuery('');
        setIsSearchActive(false);
        setNoSearchResults(false);
        setSearchAttemptCount(0);
        setActiveCategory('Naslovna');
        await fetchPostsForCategory('Naslovna');
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
            <CustomHeader
                onMenuToggle={(visible) => setMenuOpen(visible)}
                onCategorySelected={handleCategorySelect}
                activeCategory={activeCategory}
                onSearchQuery={handleSearch}
            />

            <CustomMenuCategories
                onSelectCategory={handleCategorySelect}
                activeCategory={activeCategory}
            />

            {isSearchActive && (
                <View className="px-2 py-4">
                    <Text className="text-base font-bold text-gray-800 px-4">
                        Rezultati pretrage &quot;{searchQuery}&quot;
                    </Text>
                    <CustomSearchBar
                        query={searchQuery}
                        onSearch={handleSearch}
                        onReset={resetSearch}
                        backgroundColor="#201F5B"
                    />
                </View>
            )}

            {(loading || searchLoading) ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#201F5B" />
                </View>
            ) : posts.length === 0 && noSearchResults ? (
                <View className="flex-1 items-center justify-center px-4">
                    <Text className="text-center text-black text-base">
                        Nema rezultata za prikaz.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={posts}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 90 }}
                    className="flex-1"
                    //it activates only the first time the search fails, every other it display a different message without posts
                    ListHeaderComponent={
                        isSearchActive && noSearchResults && posts.length > 0 ? (
                            <View className="px-4 mt-6 mb-10">
                                <Text className="text-center text-gray-600 font-bold">
                                    Nema rezultata pretrage. Pogledajte neke od ovih objava.
                                </Text>
                            </View>
                        ) : null
                    }
                />
            )}

            {!menuOpen && <CustomFooter />}
        </SafeAreaView>
    );
};

export default Index;