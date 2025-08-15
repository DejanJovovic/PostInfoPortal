import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    View,
    Text,
    FlatList,
    Animated,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import CustomHeader from '@/components/CustomHeader';
import CustomFooter from '@/components/CustomFooter';
import {useTheme} from '@/components/ThemeContext';
import CustomCategoryFilter from '@/components/CustomCategoryFilter';
import CustomSearchBar from '@/components/CustomSearchBar';
import {usePostsByCategory} from '@/hooks/usePostsByCategory';
import {WPPost} from '@/types/wp';
import {router} from 'expo-router';
import {ChevronDown, ChevronUp} from 'lucide-react-native';

const PAGE_SIZE = 5;
const ALL_EXCLUDE = new Set(['Naslovna', 'Danas']);

const Categories = () => {
    const {theme} = useTheme();
    const isDark = theme === 'dark';

    const {groupedPosts} = usePostsByCategory();

    const [filteredPosts, setFilteredPosts] = useState<WPPost[]>([]);
    const [isFilterApplied, setIsFilterApplied] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<{ month?: number; year?: number }>({});
    const [refreshing, setRefreshing] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [triggerSearchOpen, setTriggerSearchOpen] = useState(false);

    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    // global sorting state
    const [globalSort, setGlobalSort] = useState<'desc' | 'asc'>('desc');

    const uniqById = (arr: WPPost[]) => {
        const map: Record<number, WPPost> = {};
        for (const p of arr || []) map[p.id] = p;
        return Object.values(map);
    };

    const flattenAllPosts = (groups: Record<string, WPPost[]>) => {
        const merged = Object.entries(groups)
            .filter(([k]) => !ALL_EXCLUDE.has(k))
            .flatMap(([, arr]) => arr || []);
        const unique = uniqById(merged);
        return unique.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    };

    // base posts are displayed when the categories is opened
    const basePosts = useMemo(() => {
        if (selectedCategory && groupedPosts[selectedCategory]) {
            const unique = uniqById(groupedPosts[selectedCategory]);
            return unique.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        }
        return flattenAllPosts(groupedPosts);
    }, [selectedCategory, groupedPosts]);

    const activeDataset = useMemo(() => {
        return isFilterApplied ? filteredPosts : basePosts;
    }, [isFilterApplied, filteredPosts, basePosts]);

    // global sorting
    const sortedActiveDataset = useMemo(() => {
        const arr = [...activeDataset];
        if (globalSort === 'asc') {
            return arr.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        }
        return arr.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }, [activeDataset, globalSort]);

    // "Vidljivi" deo liste (paginacija)
    const visibleData = useMemo(() => {
        return sortedActiveDataset.slice(0, visibleCount);
    }, [sortedActiveDataset, visibleCount]);

    // reset paginacije kad se promeni kategorija ili datum filter
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [selectedCategory, isFilterApplied, selectedDate.month, selectedDate.year, groupedPosts]);

    const toggleGlobalSort = () => {
        setGlobalSort(prev => (prev === 'desc' ? 'asc' : 'desc'));
        setVisibleCount(PAGE_SIZE); // reset na početak novog poretka
    };

    // search works for everything
    const searchFromActive = (query: string): WPPost[] => {
        const q = query.toLowerCase().trim();
        if (!q) return activeDataset;
        return activeDataset.filter(p => p.title.rendered.toLowerCase().includes(q));
    };

    const searchResults = useMemo(() => {
        if (!isSearchActive) return [];
        const res = searchFromActive(searchQuery);
        return [...res].sort((a, b) =>
            globalSort === 'asc'
                ? (a.date || '').localeCompare(b.date || '')
                : (b.date || '').localeCompare(a.date || '')
        );
    }, [isSearchActive, searchQuery, activeDataset, globalSort]);

    const animationRefs = useRef<Animated.Value[]>([]);
    const listForAnimations = isSearchActive ? searchResults : visibleData;

    useEffect(() => {
        animationRefs.current = listForAnimations.map(() => new Animated.Value(0));
        const anims = animationRefs.current.map((anim, index) =>
            Animated.timing(anim, {
                toValue: 1,
                duration: 400,
                delay: index * 80,
                useNativeDriver: true,
            })
        );
        Animated.stagger(80, anims).start();
    }, [listForAnimations]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setSelectedDate({});
        setIsFilterApplied(false);
        setFilteredPosts([]);
        setSearchQuery('');
        setIsSearchActive(false);
        setVisibleCount(PAGE_SIZE);
        setRefreshing(false);
    }, []);

    const handleFooterSearch = () => {
        setSearchQuery('');
        setIsSearchActive(true);
        setTriggerSearchOpen(true);
    };

    const highlightSearchTerm = (text: string, term: string) => {
        if (!term)
            return (
                <Text className="text-xl font-semibold mb-1" style={{color: isDark ? 'white' : 'black'}}>
                    {text}
                </Text>
            );
        const parts = text.split(new RegExp(`(${term})`, 'gi'));
        return (
            <Text className="text-xl font-semibold mb-1" style={{color: isDark ? 'white' : 'black'}}>
                {parts.map((part, i) => (
                    <Text
                        key={`${part}-${i}`}
                        className={part.toLowerCase() === term.toLowerCase() ? 'font-bold text-[#FA0A0F]' : ''}
                    >
                        {part}
                    </Text>
                ))}
            </Text>
        );
    };

    // MEMO renderItem – less re-renders
    const renderItem = useCallback(
        ({item, index}: { item: WPPost; index: number }) => {
            const animVal = animationRefs.current[index] || new Animated.Value(1);
            const animStyle = {
                opacity: animVal,
                transform: [
                    {
                        translateY: animVal.interpolate({
                            inputRange: [0, 1],
                            outputRange: [30, 0],
                        }),
                    },
                ],
            };

            const image = item._embedded?.['wp:featuredmedia']?.[0]?.source_url;
            const date = new Date(item.date).toLocaleDateString('sr-RS');
            const excerpt = item.excerpt?.rendered.replace(/<[^>]+>/g, '');

            return (
                <Animated.View style={animStyle}>
                    <TouchableOpacity
                        onPress={() =>
                            router.push({
                                pathname: '/post-details',
                                params: {postId: item.id.toString(), category: selectedCategory || ''},
                            })
                        }
                    >
                        <View
                            className="rounded-2xl shadow-md mb-6 mx-3 p-4 border"
                            style={{
                                backgroundColor: isDark ? '#1b1b1b' : 'white',
                                borderColor: isDark ? '#333' : '#e5e7eb',
                            }}
                        >
                            {image && (
                                <View className="mb-3">
                                    <Animated.Image source={{uri: image}} className="w-full h-48 rounded-xl" resizeMode="cover" />
                                </View>
                            )}
                            {highlightSearchTerm(item.title.rendered, searchQuery)}
                            <Text className="text-xs mb-1" style={{color: isDark ? '#9ca3af' : '#6b7280'}}>
                                {date}
                            </Text>
                            <Text className="text-sm" numberOfLines={3} style={{color: isDark ? '#8f939a' : '#999ea1'}}>
                                {excerpt}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            );
        },
        [isDark, searchQuery, selectedCategory]
    );

    const loadMore = () => {
        setVisibleCount((c) => Math.min(c + PAGE_SIZE, sortedActiveDataset.length));
    };

    return (
        <SafeAreaView className="flex-1" style={{backgroundColor: isDark ? '#000' : '#fff'}}>
            <CustomHeader
                showMenu={false}
                activeCategory=""
                onCategorySelected={() => {}}
                onMenuToggle={(visible) => {
                    setTriggerSearchOpen(visible);
                    if (!visible) setTriggerSearchOpen(false);
                }}
                onSearchQuery={setSearchQuery}
                triggerSearchOpen={triggerSearchOpen}
            />

            {isSearchActive && (
                <View className="px-2 py-4">
                    <View className="flex-row items-center justify-between px-2 mt-2">
                        <Text className="text-base font-bold flex-1" style={{color: isDark ? '#F9F9F9' : '#1f2937'}}>
                            {searchQuery.trim().length > 0
                                ? `Rezultati pretrage "${searchQuery}"`
                                : 'Unesite željenu reč za pretragu ispod'}
                        </Text>

                        {searchQuery.trim().length > 0 && (
                            <Text
                                onPress={() => {
                                    setSearchQuery('');
                                    setIsSearchActive(false);
                                }}
                                className="ml-3 text-lg font-bold"
                                style={{color: '#FA0A0F'}}
                            >
                                ✕
                            </Text>
                        )}
                    </View>

                    <CustomSearchBar
                        key={searchQuery}
                        query={searchQuery}
                        onSearch={setSearchQuery}
                        onReset={() => {
                            setSearchQuery('');
                            setIsSearchActive(false);
                        }}
                        backgroundColor="#201F5B"
                    />
                </View>
            )}

            {isSearchActive ? (
                <FlatList
                    data={searchResults}
                    renderItem={renderItem}
                    keyExtractor={(item) => String(item.id)}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={{paddingBottom: 100}}
                    ListEmptyComponent={
                        <View className="px-4 mt-10">
                            <Text className="text-base text-center font-semibold" style={{color: isDark ? '#fff' : '#000'}}>
                                Nema rezultata za prikaz.
                            </Text>
                        </View>
                    }
                    removeClippedSubviews
                    initialNumToRender={5}
                    maxToRenderPerBatch={8}
                    windowSize={7}
                />
            ) : (
                <FlatList
                    data={visibleData}
                    ListHeaderComponent={() => (
                        <>
                            <CustomCategoryFilter
                                selectedCategory={selectedCategory}
                                onCategorySelect={setSelectedCategory}
                                selectedDate={selectedDate}
                                setSelectedDate={setSelectedDate}
                                groupedPostsCache={groupedPosts}
                                filteredPosts={filteredPosts}
                                setFilteredPosts={(posts) => {
                                    setVisibleCount(PAGE_SIZE);
                                    setFilteredPosts(uniqById(posts));
                                }}
                                isFilterApplied={isFilterApplied}
                                setIsFilterApplied={(v) => {
                                    setVisibleCount(PAGE_SIZE);
                                    setIsFilterApplied(v);
                                }}
                            />

                            {/* Globalni sort (always visible) */}
                            <View className="flex-row justify-end items-center mb-3 pr-4">
                                <TouchableOpacity onPress={toggleGlobalSort} className="flex-row items-center">
                                    <Text className="text-sm font-semibold mr-6" style={{ color: isDark ? '#fff' : '#000' }}>
                                        {globalSort === 'desc' ? 'Najnoviji' : 'Najstariji'}
                                    </Text>
                                    {globalSort === 'desc' ? (
                                        <ChevronDown size={18} color={isDark ? '#fff' : '#000'} />
                                    ) : (
                                        <ChevronUp size={18} color={isDark ? '#fff' : '#000'} />
                                    )}
                                </TouchableOpacity>
                            </View>

                            {selectedCategory && !isFilterApplied && (
                                <View className="px-4 mb-2">
                                    <Text
                                        className="text-center font-medium text-base"
                                        style={{ color: isDark ? '#ffffff' : '#1f2937' }}
                                    >
                                        Prikazuju se postovi za kategoriju: <Text className="font-bold">{selectedCategory}</Text>
                                    </Text>
                                </View>
                            )}
                        </>
                    )}
                    ListFooterComponent={
                        sortedActiveDataset.length > visibleData.length ? (
                            <View className="px-4 mt-2 mb-16">
                                <TouchableOpacity
                                    onPress={loadMore}
                                    className="rounded-xl py-3"
                                    style={{backgroundColor: '#201F5B'}}
                                >
                                    <View className="flex-row items-center justify-center">
                                        <Text className="text-center text-white font-semibold mr-2">
                                            Prikaži još
                                        </Text>
                                        <ChevronDown color="white" size={18} />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        ) : null
                    }
                    renderItem={renderItem}
                    keyExtractor={(item) => String(item.id)}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={{paddingBottom: 100}}
                    ListEmptyComponent={
                        sortedActiveDataset.length === 0 ? (
                            <View className="px-4 mt-10">
                                <Text className="text-base text-center font-semibold" style={{color: isDark ? '#fff' : '#000'}}>
                                    Nema rezultata za prikaz.
                                </Text>
                            </View>
                        ) : null
                    }
                    removeClippedSubviews
                    initialNumToRender={5}
                    maxToRenderPerBatch={8}
                    windowSize={7}
                />
            )}

            <CustomFooter onSearchPress={handleFooterSearch} />
        </SafeAreaView>
    );
};

export default Categories;