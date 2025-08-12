import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    View,
    Text,
    FlatList,
    Animated,
    RefreshControl,
    Alert,
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
import {router} from "expo-router";

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

    const animationRefs = useRef<Animated.Value[]>([]);

    useEffect(() => {
        animationRefs.current = filteredPosts.map(() => new Animated.Value(0));
        runAnimations();
    }, [filteredPosts]);

    const runAnimations = () => {
        const animations = animationRefs.current.map((anim, index) =>
            Animated.timing(anim, {
                toValue: 1,
                duration: 400,
                delay: index * 100,
                useNativeDriver: true,
            })
        );
        Animated.stagger(100, animations).start();
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setSelectedCategory('');
        setSelectedDate({});
        setFilteredPosts([]);
        setIsFilterApplied(false);
        setSearchQuery('');
        setIsSearchActive(false);
        setRefreshing(false);
    }, []);

    const handleFooterSearch = () => {
        if (!isFilterApplied) {
            Alert.alert(
                'Pretraga nije dostupna',
                'Molimo vas da prvo primenite filter da biste omogućili pretragu.'
            );
            return;
        }
        setSearchQuery('');
        setIsSearchActive(true);
        setTriggerSearchOpen(true);
    };

    const searchFromFilteredCache = (query: string): WPPost[] => {
        if (!isFilterApplied) return [];
        const lower = query.toLowerCase();
        return filteredPosts.filter((p) =>
            p.title.rendered.toLowerCase().includes(lower)
        );
    };

    const highlightSearchTerm = (text: string, term: string) => {
        if (!term) return (
            <Text className="text-xl font-semibold mb-1" style={{color: isDark ? 'white' : 'black'}}>
                {text}
            </Text>
        );

        const parts = text.split(new RegExp(`(${term})`, 'gi'));

        return (
            <Text className="text-xl font-semibold mb-1" style={{color: isDark ? 'white' : 'black'}}>
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

    const renderItem = ({item, index}: { item: WPPost; index: number }) => {
        const animStyle = {
            opacity: animationRefs.current[index] || new Animated.Value(1),
            transform: [
                {
                    translateY: (animationRefs.current[index] || new Animated.Value(1)).interpolate({
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
                            params: {postId: item.id.toString(), category: selectedCategory || ''}
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
                                <Animated.Image
                                    source={{uri: image}}
                                    className="w-full h-48 rounded-xl"
                                    resizeMode="cover"
                                />
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
    };

    return (
        <SafeAreaView className="flex-1" style={{backgroundColor: isDark ? '#000' : '#fff'}}>
            <CustomHeader
                showMenu={false}
                activeCategory=""
                onCategorySelected={() => {
                }}
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
                    data={searchFromFilteredCache(searchQuery)}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
                    contentContainerStyle={{paddingBottom: 100}}
                    ListEmptyComponent={
                        <View className="px-4 mt-10">
                            <Text className="text-base text-center font-semibold"
                                  style={{color: isDark ? '#fff' : '#000'}}>
                                Nema rezultata za prikaz.
                            </Text>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={isFilterApplied ? filteredPosts : []}
                    ListHeaderComponent={
                        <CustomCategoryFilter
                            selectedCategory={selectedCategory}
                            onCategorySelect={setSelectedCategory}
                            selectedDate={selectedDate}
                            setSelectedDate={setSelectedDate}
                            groupedPostsCache={groupedPosts}
                            filteredPosts={filteredPosts}
                            setFilteredPosts={setFilteredPosts}
                            isFilterApplied={isFilterApplied}
                            setIsFilterApplied={setIsFilterApplied}
                        />
                    }
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
                    contentContainerStyle={{paddingBottom: 100}}
                    ListEmptyComponent={
                        isFilterApplied ? (
                            <View className="px-4 mt-10">
                                <Text className="text-base text-center font-semibold"
                                      style={{color: isDark ? '#fff' : '#000'}}>
                                    Nema rezultata za prikaz.
                                </Text>
                            </View>
                        ) : null
                    }
                />
            )}

            <CustomFooter onSearchPress={handleFooterSearch}/>
        </SafeAreaView>
    );
};

export default Categories;