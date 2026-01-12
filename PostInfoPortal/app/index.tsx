import {
    View,
    Text,
    Image,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    ScrollView,
    RefreshControl,
    StyleSheet, Platform,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomBanner from "@/components/CustomBanner";
import { pickRandomAd } from '@/constants/ads';

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

    const [bottomAdVisible, setBottomAdVisible] = useState(false);
    const [bottomAd, setBottomAd] = useState(pickRandomAd());
    const categoryEndAd = React.useMemo(() => pickRandomAd(), [activeCategory, posts.length]);

    const adTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

// Pokaži reklamu (ako nema search loadera / navigacije / menija)
    const showBottomAd = React.useCallback(() => {
        if (isLoading) return;
        if (menuOpen) return;
        if (loading || searchLoading) return;

        setBottomAd(pickRandomAd());
        setBottomAdVisible(true);
    }, [isLoading, menuOpen, loading, searchLoading]);

// Zatvori i zakaži sledeći pokušaj posle cooldown-a
    const dismissBottomAd = React.useCallback(() => {
        setBottomAdVisible(false);
        const nextIn = 10000 + Math.random() * 10000;
        if (adTimerRef.current) clearTimeout(adTimerRef.current);
        adTimerRef.current = setTimeout(showBottomAd, nextIn);
    }, [showBottomAd]);

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

    // Pokreni prvi pokušaj posle 8–15s od ulaska u ekran
    useEffect(() => {
        const firstIn = 8000 + Math.random() * 7000;
        if (adTimerRef.current) clearTimeout(adTimerRef.current);
        adTimerRef.current = setTimeout(showBottomAd, firstIn);

        return () => {
            if (adTimerRef.current) clearTimeout(adTimerRef.current);
        };
    }, [showBottomAd]);

// ako se otvori meni / uđe loader / search loader -> sakrij i pauziraj timer
    useEffect(() => {
        if (menuOpen || isLoading || loading || searchLoading) {
            setBottomAdVisible(false);
            if (adTimerRef.current) clearTimeout(adTimerRef.current);
        } else if (!bottomAdVisible && !adTimerRef.current) {
            // restart tajmera kad se “vrati” normalno stanje
            const inMs = 15000;
            adTimerRef.current = setTimeout(showBottomAd, inMs);
        }
    }, [menuOpen, isLoading, loading, searchLoading, bottomAdVisible, showBottomAd]);

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
                color: isDark ? colors.grey : colors.black,
                fontFamily: 'Roboto-ExtraBold'
            }}
                  numberOfLines={2}
            >
                {parts.map((part, i) => (
                    <Text key={i}
                          className={part.toLowerCase() === term.toLowerCase() ? ' text-[#FA0A0F]' : ''}>
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
                className="rounded-2xl mb-6 mx-3 p-4 border"
                style={{
                    backgroundColor: isDark ? colors.black : colors.grey,
                    borderColor: isDark ? '#525050' : '#e5e7eb',
                    overflow: 'hidden',
                    ...(Platform.OS === 'ios'
                        ? {
                            shadowColor: 'transparent',
                            shadowOpacity: 0,
                            shadowRadius: 0,
                            shadowOffset: { width: 0, height: 0 },
                        }
                        : {
                            elevation: 0,
                        }),
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
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {/* 1) General categories except Događaji/Lokal/Region/Planeta */}
                    {Object.entries(generalGroupedPosts)
                        .filter(([name]) => !['Događaji', 'Lokal', 'Region', 'Planeta'].includes(name))
                        .map(([categoryName, categoryPosts], idx) => {
                            const ad = pickRandomAd();
                            return (
                                <React.Fragment key={categoryName}>
                                    <CustomPostsSection
                                        categoryName={categoryName}
                                        posts={categoryPosts}
                                        isHome
                                        onPostPress={(id) => goToPost(id, categoryName)}
                                        loadingNav={isLoading}
                                    />
                                    <CustomBanner
                                        key={`ad-general-${idx}`}
                                        url={ad.url}
                                        imageSrc={ad.imageSrc}
                                    />
                                </React.Fragment>
                            );
                        })}

                    {/* 2) Događaji  */}
                    {(generalGroupedPosts['Događaji']?.length ?? 0) > 0 && (() => {
                        const ad = pickRandomAd();
                        return (
                            <>
                                <CustomPostsSection
                                    key="Događaji"
                                    categoryName="Događaji"
                                    posts={generalGroupedPosts['Događaji'] || []}
                                    isHome
                                    onPostPress={(id) => goToPost(id, 'Događaji')}
                                    loadingNav={isLoading}
                                />
                                <CustomBanner
                                    key="ad-dogadjaji"
                                    url={ad.url}
                                    imageSrc={ad.imageSrc}
                                />
                            </>
                        );
                    })()}

                    {/* 3) Lokal */}
                    {(generalGroupedPosts['Lokal']?.length ?? 0) > 0 && (() => {
                        const ad = pickRandomAd();
                        return (
                            <>
                                <CustomPostsSection
                                    key="Lokal"
                                    categoryName="Lokal"
                                    posts={generalGroupedPosts['Lokal'] || []}
                                    isHome
                                    onPostPress={(id) => goToPost(id, 'Lokal')}
                                    loadingNav={isLoading}
                                />
                                <CustomBanner
                                    key="ad-lokal"
                                    url={ad.url}
                                    imageSrc={ad.imageSrc}
                                />
                            </>
                        );
                    })()}

                    {/* 4) Beograd*/}
                    {(lokalGroupedPosts['Beograd']?.length ?? 0) > 0 && (() => {
                        const ad = pickRandomAd();
                        return (
                            <>
                                <CustomPostsSection
                                    key="Beograd"
                                    categoryName="Beograd"
                                    posts={lokalGroupedPosts['Beograd'] || []}
                                    isHome
                                    onPostPress={(id) => goToPost(id, 'Beograd')}
                                    loadingNav={isLoading}
                                />
                                <CustomBanner
                                    key="ad-beograd"
                                    url={ad.url}
                                    imageSrc={ad.imageSrc}
                                />
                            </>
                        );
                    })()}

                    {/* 5) Opštine Beograda*/}
                    {Object.entries(beogradGroupedPosts)
                        .filter(([, arr]) => (arr?.length ?? 0) > 0)
                        .map(([categoryName, categoryPosts], idx) => {
                            const ad = pickRandomAd();
                            return (
                                <React.Fragment key={categoryName}>
                                    <CustomPostsSection
                                        categoryName={categoryName}
                                        posts={categoryPosts}
                                        isHome
                                        onPostPress={(id) => goToPost(id, categoryName)}
                                        loadingNav={isLoading}
                                    />
                                    <CustomBanner
                                        key={`ad-beograd-sub-${idx}`}
                                        url={ad.url}
                                        imageSrc={ad.imageSrc}
                                    />
                                </React.Fragment>
                            );
                        })}

                    {/* 6) Gradovi  */}
                    {(lokalGroupedPosts['Gradovi']?.length ?? 0) > 0 && (() => {
                        const ad = pickRandomAd();
                        return (
                            <>
                                <CustomPostsSection
                                    key="Gradovi"
                                    categoryName="Gradovi"
                                    posts={lokalGroupedPosts['Gradovi'] || []}
                                    isHome
                                    onPostPress={(id) => goToPost(id, 'Gradovi')}
                                    loadingNav={isLoading}
                                />
                                <CustomBanner
                                    key="ad-gradovi"
                                    url={ad.url}
                                    imageSrc={ad.imageSrc}
                                />
                            </>
                        );
                    })()}

                    {/* 7) Okruzi*/}
                    {(lokalGroupedPosts['Okruzi']?.length ?? 0) > 0 && (() => {
                        const ad = pickRandomAd();
                        return (
                            <>
                                <CustomPostsSection
                                    key="Okruzi"
                                    categoryName="Okruzi"
                                    posts={lokalGroupedPosts['Okruzi'] || []}
                                    isHome
                                    onPostPress={(id) => goToPost(id, 'Okruzi')}
                                    loadingNav={isLoading}
                                />
                                <CustomBanner
                                    key="ad-okruzi"
                                    url={ad.url}
                                    imageSrc={ad.imageSrc}
                                />
                            </>
                        );
                    })()}

                    {/* 8) Podkategorije Okruga */}
                    {Object.entries(okruziGroupedPosts)
                        .filter(([, arr]) => (arr?.length ?? 0) > 0)
                        .map(([categoryName, categoryPosts], idx) => {
                            const ad = pickRandomAd();
                            return (
                                <React.Fragment key={categoryName}>
                                    <CustomPostsSection
                                        categoryName={categoryName}
                                        posts={categoryPosts}
                                        isHome
                                        onPostPress={(id) => goToPost(id, categoryName)}
                                        loadingNav={isLoading}
                                    />
                                    <CustomBanner
                                        key={`ad-okruzi-sub-${idx}`}
                                        url={ad.url}
                                        imageSrc={ad.imageSrc}
                                    />
                                </React.Fragment>
                            );
                        })}

                    {/* 9) Region i Planeta */}
                    {['Region', 'Planeta'].map((name, idx) =>
                        (generalGroupedPosts[name]?.length ?? 0) > 0 ? (() => {
                            const ad = pickRandomAd();
                            return (
                                <React.Fragment key={name}>
                                    <CustomPostsSection
                                        categoryName={name}
                                        posts={generalGroupedPosts[name] || []}
                                        isHome
                                        onPostPress={(id) => goToPost(id, name)}
                                        loadingNav={isLoading}
                                    />
                                    <CustomBanner
                                        key={`ad-${name}-${idx}`}
                                        url={ad.url}
                                        imageSrc={ad.imageSrc}
                                    />
                                </React.Fragment>
                            );
                        })() : null
                    )}
                </ScrollView>
            ) : (
                (!loading && !searchLoading && !isSearchActive && posts.length === 0) ? (
                    <View className="flex-1 items-center justify-center px-4">
                        <Text
                            className="text-center"
                            style={{
                                color: isDark ? colors.grey : colors.black,
                                fontFamily: 'Roboto-Regular',
                            }}
                        >
                            Nema objava za ovu kategoriju.
                        </Text>
                    </View>
                ) : (
                    <CustomPostsSection
                        categoryName={activeCategory}
                        posts={posts}
                        onPostPress={(id) => goToPost(id, activeCategory)}
                        loadingNav={isLoading}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        adAtEnd
                        adUrl={categoryEndAd.url}
                        adImageUrl={categoryEndAd.imageSrc}
                    />
                )
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
                            fontFamily: 'Roboto-SemiBold',
                            color: isDark ? colors.grey : colors.black,
                            textAlign: 'center',
                        }}
                    >
                        Učitavanje objave...
                    </Text>
                </View>
            )}

            {!menuOpen && <CustomFooter onSearchPress={handleFooterSearch}/>}

            {bottomAdVisible && (
                <View
                    pointerEvents="box-none"
                    style={[
                        StyleSheet.absoluteFillObject,
                        { justifyContent: 'flex-end', alignItems: 'center', zIndex: 10000 },
                    ]}
                >
                    <View style={{ width: '100%', paddingHorizontal: 8, marginBottom: 84 }}>
                        <CustomBanner
                            url={bottomAd.url}
                            imageSrc={bottomAd.imageSrc}
                            onClose={dismissBottomAd}
                        />
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

export default Index;
