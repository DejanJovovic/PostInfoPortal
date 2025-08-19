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
import React, {useCallback, useEffect, useState} from 'react';
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
import colors from "@/constants/colors";

const LoadingOverlay = ({isDark, message}: { isDark: boolean; message: string }) => (
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
        <ActivityIndicator size="large" color={isDark ? '#F9F9F9' : '#000'}/>
        <Text
            style={{
                marginTop: 10,
                fontFamily: 'Roboto-SemiBold',
                color: isDark ? colors.grey : colors.black,
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

    const deriveCategoryName = (post: any): string | undefined => {
        const groups = post?._embedded?.['wp:term'];
        if (Array.isArray(groups)) {
            const flat = groups.flat().filter(Boolean);
            const cat = flat.find((t: any) => t?.taxonomy === 'category' && t?.name);
            if (cat?.name) return String(cat.name);
        }
        return undefined;
    };

    const uniqById = (arr: WPPost[]) => {
        const map = new Map<number, WPPost>();
        for (const p of arr || []) map.set(p.id, p);
        return Array.from(map.values());
    };

    const uniquePosts = React.useMemo(() => uniqById(posts), [posts]);

    const goToPost = (postId: number, categoryName?: string) => {
        if (isLoading) return;
        setIsLoading(true);

        const finalCategory =
            categoryName && categoryName.length > 0
                ? categoryName
                : activeCategory; // fallback

        requestAnimationFrame(() => {
            router.push({
                pathname: '/post-details',
                params: { postId: postId.toString(), category: finalCategory },
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
        // this does nothing for now because i removed latin and cir
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
        setPosts([]);

        const nextAttempt = searchAttemptCount + 1;
        setSearchAttemptCount(nextAttempt);

        const found = await searchPostsFromCache(query);
        if (found.length === 0) {
            if (nextAttempt === 1) {
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
    }, [isSearchActive, activeCategory, fetchPostsForCategory, setPosts]);

    const highlightSearchTerm = (text: string, term: string) => {
        if (!term)
            return (
                <Text style={{
                    color: isDark ? colors.grey : colors.black,
                    fontFamily: 'Roboto-Bold'
                }}>
                    {text}
                </Text>
            );

        const parts = text.split(new RegExp(`(${term})`, 'gi'));
        return (
            <Text style={{
                color: isDark ? '#fff' : '#000000',
                fontFamily: 'Roboto-ExtraBold'
            }}
                  numberOfLines={2}
            >
                {parts.map((part, i) => (
                    <Text key={i}
                          className={part.toLowerCase() === term.toLowerCase() ? 'font-bold text-[#FA0A0F]' : ''}>
                        {part}
                    </Text>
                ))}
            </Text>
        );
    };

    const renderItem = ({item}: { item: WPPost; index: number }) => {
        const image = item._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        const date = new Date(item.date).toLocaleDateString('sr-RS');
        const excerpt = item.excerpt.rendered.replace(/<[^>]+>/g, '');

        return (
            <View
                className="rounded-2xl shadow-md mb-6 mx-3 p-4 border"
                style={{
                    backgroundColor: isDark ? colors.black : colors.grey,
                    borderColor: isDark ? '#525050' : '#e5e7eb',
                }}
            >
                <TouchableOpacity onPress={() => goToPost(item.id, deriveCategoryName(item) || activeCategory)} disabled={isLoading}>
                    {image && (
                        <Image source={{uri: image}} className="w-full h-48 rounded-xl mb-3" resizeMode="cover"/>
                    )}
                    {highlightSearchTerm(item.title.rendered, searchQuery)}
                    <Text className="text-xs mt-1 mb-1" style={{
                        color: isDark ? colors.grey : colors.black,
                        fontFamily: 'YesevaOne-Regular'
                    }}>
                        {date}
                    </Text>
                    <Text className="text-sm" numberOfLines={3} style={{
                        color: isDark ? colors.grey : colors.black,
                        fontFamily: 'Roboto-Light'
                    }}>
                        {excerpt}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1" style={{backgroundColor: isDark ? colors.black : colors.grey}}>
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

            <CustomMenuCategories onSelectCategory={handleCategorySelect} activeCategory={activeCategory}/>

            {isSearchActive && (
                <View className="px-2 py-4">
                    <Text
                        className="mt-2 px-4"
                        style={{
                            color: isDark ? colors.grey : colors.black,
                            fontFamily: 'Roboto-Medium',
                        }}
                    >
                        {searchQuery.trim().length > 0 ? (
                            <>
                                Rezultati pretrage{" "}
                                <Text
                                    style={{
                                        color: colors.red,
                                        fontFamily: "Roboto-Bold",
                                    }}
                                >
                                    &#34;{searchQuery}&#34;
                                </Text>
                            </>
                        ) : (
                            "Unesite željenu reč za pretragu ispod"
                        )}
                    </Text>
                    <CustomSearchBar
                        key={searchQuery + searchAttemptCount}
                        query={searchQuery}
                        onSearch={handleSearch}
                        onReset={resetSearch}
                        backgroundColor={colors.blue}
                    />
                </View>
            )}

            {(loading || searchLoading) ? (
                <View className="flex-1 items-center justify-center">
                    <LoadingOverlay isDark={isDark} message="Učitavanje..."/>
                </View>
            ) : isSearchActive ? (
                posts.length === 0 && noSearchResults ? (
                    <View className="flex-1 items-center justify-center px-4">
                        <Text className="text-center" style={{
                            color: isDark ? colors.grey : colors.black,
                            fontFamily: 'Roboto-Regular'
                        }}>
                            Nema rezultata za prikaz.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={uniquePosts}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={{paddingBottom: 90}}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
                        ListHeaderComponent={
                            isSearchActive && noSearchResults ? (
                                <View className="px-4 mt-6 mb-10">
                                    <Text className="text-center"
                                          style={{
                                              color: isDark ? colors.grey : colors.black,
                                              fontFamily: 'Roboto-Regular'
                                          }}>
                                        Nema rezultata pretrage. Pogledajte neke od ovih objava.
                                    </Text>
                                </View>
                            ) : null
                        }
                    />
                )
            ) : activeCategory === 'Naslovna' && (!initialized || Object.keys(groupedPosts).length === 0) ? (
                <View className="flex-1 items-center justify-center">
                    <LoadingOverlay isDark={isDark} message="Učitavanje objava..."/>
                </View>
            ) : activeCategory === 'Naslovna' && Object.keys(groupedPosts).length > 0 ? (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{paddingBottom: 100}}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
                >
                    {Object.entries(generalGroupedPosts).map(([categoryName, categoryPosts]) => (
                        <CustomPostsSection key={categoryName} categoryName={categoryName} posts={categoryPosts}
                                            showFeaturedFirst
                                            onPostPress={(id) => goToPost(id, categoryName)}
                                            loadingNav={isLoading}/>
                    ))}

                    {Object.keys(beogradGroupedPosts).length > 0 && (
                        <CustomPostsSection
                            key="Beograd"
                            categoryName="Beograd"
                            posts={lokalGroupedPosts['Beograd'] || []}
                            showFeaturedFirst
                            onPostPress={(id) => goToPost(id, 'Beograd')}
                            loadingNav={isLoading}
                        />
                    )}
                    {Object.entries(beogradGroupedPosts).map(([categoryName, categoryPosts]) => (
                        <CustomPostsSection key={categoryName} categoryName={categoryName} posts={categoryPosts}
                                            showFeaturedFirst
                                            onPostPress={(id) => goToPost(id, categoryName)}
                                            loadingNav={isLoading}/>
                    ))}

                    <CustomPostsSection key="Gradovi" categoryName="Gradovi" posts={lokalGroupedPosts['Gradovi'] || []}
                                        showFeaturedFirst
                                        onPostPress={(id) => goToPost(id, 'Gradovi')}
                                        loadingNav={isLoading}/>

                    {Object.keys(okruziGroupedPosts).length > 0 && (
                        <CustomPostsSection
                            key="Okruzi"
                            categoryName="Okruzi"
                            posts={lokalGroupedPosts['Okruzi'] || []}
                            showFeaturedFirst
                            onPostPress={(id) => goToPost(id, 'Okruzi')}
                            loadingNav={isLoading}
                        />
                    )}
                    {Object.entries(okruziGroupedPosts).map(([categoryName, categoryPosts]) => (
                        <CustomPostsSection key={categoryName} categoryName={categoryName} posts={categoryPosts}
                                            showFeaturedFirst
                                            onPostPress={(id) => goToPost(id, categoryName)}
                                            loadingNav={isLoading}/>
                    ))}
                </ScrollView>
            ) : (
                <CustomPostsSection categoryName={activeCategory} posts={posts} gridAfterFirst
                                    onPostPress={(id) => goToPost(id, activeCategory)}
                                    loadingNav={isLoading}
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}/>
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
                    <ActivityIndicator size="large" color={isDark ? colors.grey : colors.black}/>
                    <Text
                        style={{
                            marginTop: 10,
                            fontWeight: '600',
                            fontFamily: 'Roboto-Regular',
                            color: isDark ? colors.grey : colors.black,
                            textAlign: 'center',
                        }}
                    >
                        Učitavanje objave...
                    </Text>
                </View>
            )}

            {!menuOpen && <CustomFooter onSearchPress={handleFooterSearch}/>}
        </SafeAreaView>
    );
};

export default Index;
