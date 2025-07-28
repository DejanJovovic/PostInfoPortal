import {
    View,
    Text,
    Image,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    ScrollView,
    RefreshControl
} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import CustomHeader from '@/components/CustomHeader';
import CustomMenuCategories from '@/components/CustomMenuCategories';
import CustomFooter from '@/components/CustomFooter';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {WPPost} from '@/types/wp';
import {usePostsByCategory} from '@/hooks/usePostsByCategory';
import CustomSearchBar from "@/components/CustomSearchBar";
import CustomPostsSection from "@/components/CustomPostsSection";

const Index = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [triggerSearchOpen, setTriggerSearchOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Naslovna');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [noSearchResults, setNoSearchResults] = useState(false);
    const [searchAttemptCount, setSearchAttemptCount] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const {selectedCategory} = useLocalSearchParams();
    const {
        posts,
        loading,
        searchLoading,
        fetchPostsForCategory,
        searchPosts,
        setPosts,
        groupedPosts,
        lokalGroupedPosts,
        generalGroupedPosts,
        okruziGroupedPosts,
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

    useEffect(() => {
        if (!selectedCategory && activeCategory === 'Naslovna') {
            fetchPostsForCategory('Naslovna');
        }
    }, []);

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

    // function that opens up search in MenuDrawer from footer
    const handleFooterSearch = () => {
        setSearchQuery('');
        setIsSearchActive(true);
        setNoSearchResults(true);
        setSearchAttemptCount(0);
        setPosts([]);
        setTriggerSearchOpen(true);
    };

    // refresh function, works for
    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        if (isSearchActive) {
            // resets search state and displays the other message
            setSearchQuery('');
            setPosts([]); // clear results
            setNoSearchResults(true); // show message
            setSearchAttemptCount(0);
        } else {
            await fetchPostsForCategory(activeCategory || 'Naslovna');
        }

        setRefreshing(false);
    }, [isSearchActive, activeCategory]);

    // function that highlights search term in post title
    const highlightSearchTerm = (text: string, term: string) => {
        if (!term) return <Text className="font-bold text-base text-black">{text}</Text>;

        const parts = text.split(new RegExp(`(${term})`, 'gi'));

        return (
            <Text className="font-bold text-base text-black" numberOfLines={2}>
                {parts.map((part, i) => (
                    <Text
                        key={i}
                        className={part.toLowerCase() === term.toLowerCase() ? 'font-bold text-[#FA0A0F]' : ''}
                    >
                        {part}
                    </Text>
                ))}
            </Text>
        );
    };

    const renderItem = ({item}: { item: WPPost }) => {
        const image = item._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        const title = item.title.rendered;
        const excerpt = item.excerpt.rendered.replace(/<[^>]+>/g, '');
        const date = new Date(item.date).toLocaleDateString('sr-RS', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
        });


        return (
            <TouchableOpacity
                className="flex-row items-start gap-3 p-4 border-b border-gray-200"
                onPress={() =>
                    router.push({
                        pathname: '/post-details',
                        params: {
                            post: JSON.stringify(item),
                            category: activeCategory
                        }
                    })
                }
            >
                {image && (
                    <Image
                        source={{uri: image}}
                        className="w-[90px] h-[90px] rounded-md"
                        resizeMode="cover"
                    />
                )}
                <View className="flex-1">
                    {highlightSearchTerm(title, searchQuery)}
                    <Text className="text-gray-400 text-xs mt-1">{date}</Text>
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
                onMenuToggle={(visible) => {
                    setMenuOpen(visible);
                    if (!visible) setTriggerSearchOpen(false);
                }}
                onCategorySelected={handleCategorySelect}
                activeCategory={activeCategory}
                onSearchQuery={handleSearch}
                triggerSearchOpen={triggerSearchOpen}
            />

            <CustomMenuCategories
                onSelectCategory={handleCategorySelect}
                activeCategory={activeCategory}
            />

            {isSearchActive && (
                <View className="px-2 py-4">
                    <Text className="text-base font-bold text-gray-800 px-4">
                        {searchQuery.trim().length > 0
                            ? `Rezultati pretrage "${searchQuery}"`
                            : 'Unesite željenu reč za pretragu ispod'}
                    </Text>
                    <CustomSearchBar
                        key={searchQuery + searchAttemptCount} // resets component if the query changes
                        query={searchQuery}
                        onSearch={handleSearch}
                        onReset={resetSearch}
                        backgroundColor="#201F5B"
                    />
                </View>
            )}

            {(loading || searchLoading) ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#201F5B"/>
                </View>
            ) : isSearchActive ? (
                posts.length === 0 && noSearchResults ? (
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
                        contentContainerStyle={{paddingBottom: 90}}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        ListHeaderComponent={
                            isSearchActive && noSearchResults ? (
                                <View className="px-4 mt-6 mb-10">
                                    <Text className="text-center text-gray-600 font-bold">
                                        Nema rezultata pretrage. Pogledajte neke od ovih objava.
                                    </Text>
                                </View>
                            ) : null
                        }
                    />
                )
            ) : activeCategory === 'Naslovna' && Object.keys(groupedPosts).length > 0 ? (
                <ScrollView className="flex-1" contentContainerStyle={{paddingBottom: 100}}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>
                            }>
                    {Object.entries(generalGroupedPosts).map(([categoryName, categoryPosts]) => (
                        <CustomPostsSection
                            key={categoryName}
                            categoryName={categoryName}
                            posts={categoryPosts}
                        />
                    ))}

                    {Object.keys(lokalGroupedPosts).length > 0 && (
                        <Text className="text-xl font-extrabold text-black px-4 mt-6 mb-2">Lokal</Text>
                    )}
                    {Object.entries(lokalGroupedPosts).map(([categoryName, categoryPosts]) => (
                        <CustomPostsSection
                            key={categoryName}
                            categoryName={categoryName}
                            posts={categoryPosts}
                        />
                    ))}

                    {Object.keys(okruziGroupedPosts).length > 0 && (
                        <Text className="text-xl font-extrabold text-black px-4 mt-6 mb-2">Okruzi</Text>
                    )}
                    {Object.entries(okruziGroupedPosts).map(([categoryName, categoryPosts]) => (
                        <CustomPostsSection
                            key={categoryName}
                            categoryName={categoryName}
                            posts={categoryPosts}
                        />
                    ))}
                </ScrollView>
            ) : (
                <FlatList
                    data={posts}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{paddingBottom: 100}}
                    className="flex-1"
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>
                    }
                />
            )}

            {!menuOpen && <CustomFooter onSearchPress={handleFooterSearch}/>}
        </SafeAreaView>
    );
};

export default Index;

