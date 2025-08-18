import {
    View,
    Text,
    Image,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    ScrollView,
    RefreshControl,
    StyleSheet,
} from 'react-native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import CustomHeader from '@/components/CustomHeader';
import CustomMenuCategories from '@/components/CustomMenuCategories';
import CustomFooter from '@/components/CustomFooter';
import {useLocalSearchParams, useNavigation, useRouter} from 'expo-router';
import {WPPost} from '@/types/wp';
import {usePostsByCategory} from '@/hooks/usePostsByCategory';
import CustomSearchBar from '@/components/CustomSearchBar';
import CustomPostsSection from '@/components/CustomPostsSection';
import {useTheme} from '@/components/ThemeContext';

const LoadingOverlay = ({ isDark, message }: { isDark: boolean; message: string }) => (
    <View
        style={[
            StyleSheet.absoluteFillObject,
            {
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.7)',
                zIndex: 9999,
                elevation: 9999,
            },
        ]}
        pointerEvents="auto"
    >
        <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
        <Text
            style={{
                marginTop: 10,
                fontWeight: '600',
                color: isDark ? '#fff' : '#000',
                textAlign: 'center',
            }}
        >
            {message}
        </Text>
    </View>
);

const Index = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [triggerSearchOpen, setTriggerSearchOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Naslovna');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [noSearchResults, setNoSearchResults] = useState(false);
    const [searchAttemptCount, setSearchAttemptCount] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const {theme} = useTheme();
    const isDark = theme === 'dark';
    const [isLoading, setIsLoading] = useState(false);

    const {selectedCategory, openSearch} =
        useLocalSearchParams<{ selectedCategory?: string; openSearch?: string }>();

    const {
        posts,
        loading,
        searchLoading,
        fetchPostsForCategory,
        searchPostsFromCache,
        setPosts,
        initialized,
        groupedPosts,
        lokalGroupedPosts,
        generalGroupedPosts,
        beogradGroupedPosts,
        okruziGroupedPosts,
    } = usePostsByCategory();

    const router = useRouter();
    const navigation = useNavigation();

    useEffect(() => {
        const unsub = navigation.addListener('blur', () => setIsLoading(false));
        return unsub;
    }, [navigation]);

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
        if (!selectedCategory && activeCategory === 'Naslovna' && initialized) {
            fetchPostsForCategory('Naslovna');
        }
    }, [selectedCategory, activeCategory, initialized]);

    useEffect(() => {
        if (openSearch === '1') {
            setSearchQuery('');
            setIsSearchActive(true);
            setNoSearchResults(true);
            setSearchAttemptCount(0);
            setTriggerSearchOpen(true);
        }
    }, [openSearch]);

    const uniqById = (arr: WPPost[]) => {
        const map = new Map<number, WPPost>();
        for (const p of arr || []) map.set(p.id, p);
        return Array.from(map.values());
    };

    const uniquePosts = React.useMemo(() => uniqById(posts), [posts]);

    const goToPost = (postId: number) => {
        if (isLoading) return;
        setIsLoading(true);

        requestAnimationFrame(() => {
            router.push({
                pathname: '/post-details',
                params: { postId: postId.toString(), category: activeCategory },
            });
        });
    };

    const handleBackWithLoading = () => {
        if (isLoading) return;
        setIsLoading(true);
        requestAnimationFrame(() => {
            router.back();
        });
    };

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
        const found = await searchPostsFromCache(query);
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

    const handleFooterSearch = () => {
        setSearchQuery('');
        setIsSearchActive(true);
        setNoSearchResults(true);
        setSearchAttemptCount(0);
        setTriggerSearchOpen(true);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        if (isSearchActive) {
            setSearchQuery('');
            setPosts([]);
            setNoSearchResults(true);
            setSearchAttemptCount(0);
        } else {
            await fetchPostsForCategory(activeCategory || 'Naslovna');
        }

        setRefreshing(false);
    }, [isSearchActive, activeCategory]);

    const highlightSearchTerm = (text: string, term: string) => {
        if (!term)
            return (
                <Text className="font-bold text-base" style={{ color: isDark ? '#fff' : '#000000' }}>
                    {text}
                </Text>
            );

        const parts = text.split(new RegExp(`(${term})`, 'gi'));
        return (
            <Text className="font-bold text-base" style={{ color: isDark ? '#fff' : '#000000' }} numberOfLines={2}>
                {parts.map((part, i) => (
                    <Text key={i} className={part.toLowerCase() === term.toLowerCase() ? 'font-bold text-[#FA0A0F]' : ''}>
                        {part}
                    </Text>
                ))}
            </Text>
        );
    };

    const renderItem = ({ item }: { item: WPPost; index: number }) => {
        const image = item._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        const date = new Date(item.date).toLocaleDateString('sr-RS');
        const excerpt = item.excerpt.rendered.replace(/<[^>]+>/g, '');

        return (
            <View
                className="rounded-2xl shadow-md mb-6 mx-3 p-4 border"
                style={{
                    backgroundColor: isDark ? '#1b1b1b' : 'white',
                    borderColor: isDark ? '#333' : '#e5e7eb',
                }}
            >
                <TouchableOpacity onPress={() => goToPost(item.id)} disabled={isLoading}>
                    {image && (
                        <Image source={{ uri: image }} className="w-full h-48 rounded-xl mb-3" resizeMode="cover" />
                    )}
                    {highlightSearchTerm(item.title.rendered, searchQuery)}
                    <Text className="text-xs mb-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                        {date}
                    </Text>
                    <Text className="text-sm" numberOfLines={3} style={{ color: isDark ? '#959898' : '#999a9b' }}>
                        {excerpt}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: isDark ? '#000000' : 'white' }}>
            <CustomHeader
                onMenuToggle={(visible) => {
                    setMenuOpen(visible);
                    if (!visible) setTriggerSearchOpen(false);
                }}
                onCategorySelected={handleCategorySelect}
                activeCategory={activeCategory}
                onSearchQuery={handleSearch}
                triggerSearchOpen={triggerSearchOpen}
                onBackPress={handleBackWithLoading}
                loadingNav={isLoading}
            />

            <CustomMenuCategories onSelectCategory={handleCategorySelect} activeCategory={activeCategory} />

            {isSearchActive && (
                <View className="px-2 py-4">
                    <Text className="text-base font-bold mt-2 px-4" style={{ color: isDark ? '#F9F9F9' : '#1f2937' }}>
                        {searchQuery.trim().length > 0
                            ? `Rezultati pretrage "${searchQuery}"`
                            : 'Unesite željenu reč za pretragu ispod'}
                    </Text>
                    <CustomSearchBar
                        key={searchQuery + searchAttemptCount}
                        query={searchQuery}
                        onSearch={handleSearch}
                        onReset={resetSearch}
                        backgroundColor="#201F5B"
                    />
                </View>
            )}

            {(loading || searchLoading) ? (
                <View className="flex-1 items-center justify-center">
                    <LoadingOverlay isDark={isDark} message="Učitavanje..." />
                </View>
            ) : isSearchActive ? (
                posts.length === 0 && noSearchResults ? (
                    <View className="flex-1 items-center justify-center px-4">
                        <Text className="text-center text-base" style={{ color: isDark ? '#F9F9F9' : '#1f2937' }}>
                            Nema rezultata za prikaz.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={uniquePosts}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={{ paddingBottom: 90 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        ListHeaderComponent={
                            isSearchActive && noSearchResults ? (
                                <View className="px-4 mt-6 mb-10">
                                    <Text className="text-center font-bold" style={{ color: isDark ? '#F9F9F9' : 'white' }}>
                                        Nema rezultata pretrage. Pogledajte neke od ovih objava.
                                    </Text>
                                </View>
                            ) : null
                        }
                    />
                )
            ) : activeCategory === 'Naslovna' && (!initialized || Object.keys(groupedPosts).length === 0) ? (
                <View className="flex-1 items-center justify-center">
                    <LoadingOverlay isDark={isDark} message="Učitavanje objava..." />
                </View>
            ) : activeCategory === 'Naslovna' && Object.keys(groupedPosts).length > 0 ? (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {Object.entries(generalGroupedPosts).map(([categoryName, categoryPosts]) => (
                        <CustomPostsSection key={categoryName} categoryName={categoryName} posts={categoryPosts} showFeaturedFirst
                                            onPostPress={goToPost}
                                            loadingNav={isLoading}/>
                    ))}

                    {Object.keys(beogradGroupedPosts).length > 0 && (
                        <CustomPostsSection
                            key="Beograd"
                            categoryName="Beograd"
                            posts={lokalGroupedPosts['Beograd'] || []}
                            showFeaturedFirst
                            onPostPress={goToPost}
                            loadingNav={isLoading}
                        />
                    )}
                    {Object.entries(beogradGroupedPosts).map(([categoryName, categoryPosts]) => (
                        <CustomPostsSection key={categoryName} categoryName={categoryName} posts={categoryPosts} showFeaturedFirst
                                            onPostPress={goToPost}
                                            loadingNav={isLoading}/>
                    ))}

                    <CustomPostsSection key="Gradovi" categoryName="Gradovi" posts={lokalGroupedPosts['Gradovi'] || []} showFeaturedFirst
                                        onPostPress={goToPost}
                                        loadingNav={isLoading}/>

                    {Object.keys(okruziGroupedPosts).length > 0 && (
                        <CustomPostsSection
                            key="Okruzi"
                            categoryName="Okruzi"
                            posts={lokalGroupedPosts['Okruzi'] || []}
                            showFeaturedFirst
                            onPostPress={goToPost}
                            loadingNav={isLoading}
                        />
                    )}
                    {Object.entries(okruziGroupedPosts).map(([categoryName, categoryPosts]) => (
                        <CustomPostsSection key={categoryName} categoryName={categoryName} posts={categoryPosts} showFeaturedFirst
                                            onPostPress={goToPost}
                                            loadingNav={isLoading}/>
                    ))}
                </ScrollView>
            ) : (
                <CustomPostsSection categoryName={activeCategory} posts={posts} gridAfterFirst
                                    onPostPress={goToPost}
                                    loadingNav={isLoading}/>
            )}

            {isLoading && (
                <View
                    style={[
                        StyleSheet.absoluteFillObject,
                        {
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.7)',
                            zIndex: 9999,
                            elevation: 9999,
                        },
                    ]}
                    pointerEvents="auto"
                >
                    <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
                    <Text
                        style={{
                            marginTop: 10,
                            fontWeight: '600',
                            color: isDark ? '#fff' : '#000',
                            textAlign: 'center',
                        }}
                    >
                        Učitavanje objave...
                    </Text>
                </View>
            )}

            {!menuOpen && <CustomFooter onSearchPress={handleFooterSearch} />}
        </SafeAreaView>
    );
};

export default Index;
