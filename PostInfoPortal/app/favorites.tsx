import React, {useState, useCallback, useEffect} from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    ScrollView,
    RefreshControl,
    Alert,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect, useRouter, useNavigation} from 'expo-router';
import {WPPost} from '@/types/wp';
import {SafeAreaView} from 'react-native-safe-area-context';
import CustomHeader from '@/components/CustomHeader';
import CustomFooter from '@/components/CustomFooter';
import CustomSearchBar from '@/components/CustomSearchBar';
import icons from '@/constants/icons';
import {useTheme} from '@/components/ThemeContext';

type FavoritePost = WPPost & { category: string };

const Favorites = () => {
    const [groupedFavorites, setGroupedFavorites] = useState<Record<string, WPPost[]>>({});
    const [activeCategory, setActiveCategory] = useState('Naslovna');
    const [refreshing, setRefreshing] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [triggerSearchOpen, setTriggerSearchOpen] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();
    const navigation = useNavigation();
    const {theme} = useTheme();
    const isDark = theme === 'dark';

    const loadFavorites = async () => {
        const saved = await AsyncStorage.getItem('favorites');
        if (!saved) {
            setGroupedFavorites({});
            return;
        }

        const parsed: FavoritePost[] = JSON.parse(saved);
        const grouped: Record<string, WPPost[]> = {};
        for (const post of parsed) {
            if (!grouped[post.category]) grouped[post.category] = [];
            grouped[post.category].push(post);
        }
        setGroupedFavorites(grouped);
    };

    useFocusEffect(
        useCallback(() => {
            loadFavorites();
        }, [])
    );

    useEffect(() => {
        const unsub = navigation.addListener('blur', () => setIsLoading(false));
        return unsub;
    }, [navigation]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        setSearchQuery('');
        setIsSearchActive(false);
        setTriggerSearchOpen(false);
        await loadFavorites();
        setRefreshing(false);
    }, []);

    const handleFooterSearch = () => {
        const hasFavorites = Object.values(groupedFavorites).flat().length > 0;
        if (!hasFavorites) {
            Alert.alert(
                'Nema omiljenih objava',
                'Dodajte bar jednu objavu u omiljene pre nego što pokrenete pretragu.',
                [{text: 'U redu'}]
            );
            return;
        }
        setSearchQuery('');
        setIsSearchActive(true);
        setTriggerSearchOpen(true);
    };

    const handleBackWithLoading = () => {
        if (isLoading) return;
        setIsLoading(true);
        requestAnimationFrame(() => {
            router.back();
        });
    };

    const goToPost = (postId: number) => {
        if (isLoading) return;
        setIsLoading(true);
        requestAnimationFrame(() => {
            router.push({
                pathname: '/post-details',
                params: {postId: String(postId), category: activeCategory},
            });
        });
    };

    const getFilteredFavorites = (): Record<string, WPPost[]> => {
        if (!searchQuery.trim()) return groupedFavorites;
        const result: Record<string, WPPost[]> = {};
        const lower = searchQuery.toLowerCase();
        for (const [category, posts] of Object.entries(groupedFavorites)) {
            const filtered = posts.filter(p => p.title.rendered.toLowerCase().includes(lower));
            if (filtered.length > 0) result[category] = filtered;
        }
        return result;
    };

    const removePost = (postId: number) => {
        Alert.alert('Brisanje objave', 'Da li ste sigurni da želite da obrišete ovu objavu iz omiljenih?', [
            {text: 'Ne', style: 'cancel'},
            {
                text: 'Da',
                style: 'destructive',
                onPress: async () => {
                    const saved = await AsyncStorage.getItem('favorites');
                    if (!saved) return;
                    let parsed: FavoritePost[] = JSON.parse(saved);
                    parsed = parsed.filter(p => p.id !== postId);
                    await AsyncStorage.setItem('favorites', JSON.stringify(parsed));
                    loadFavorites();
                },
            },
        ]);
    };

    const removeCategory = (category: string) => {
        Alert.alert('Brisanje kategorije', 'Da li ste sigurni da želite da obrišete ovu kategoriju iz omiljenih?', [
            {text: 'Ne', style: 'cancel'},
            {
                text: 'Da',
                style: 'destructive',
                onPress: async () => {
                    const saved = await AsyncStorage.getItem('favorites');
                    if (!saved) return;
                    let parsed: FavoritePost[] = JSON.parse(saved);
                    parsed = parsed.filter(p => p.category !== category);
                    await AsyncStorage.setItem('favorites', JSON.stringify(parsed));
                    loadFavorites();
                },
            },
        ]);
    };

    const highlightSearchTerm = (text: string, term: string) => {
        if (!term) {
            return (
                <Text className="text-base font-semibold mb-1" style={{color: isDark ? 'white' : 'black'}}>
                    {text}
                </Text>
            );
        }
        const parts = text.split(new RegExp(`(${term})`, 'gi'));
        return (
            <Text className="text-base font-semibold mb-1" style={{color: isDark ? 'white' : 'black'}}>
                {parts.map((part, i) => (
                    <Text key={i} className={part.toLowerCase() === term.toLowerCase() ? 'font-bold text-[#FA0A0F]' : ''}>
                        {part}
                    </Text>
                ))}
            </Text>
        );
    };

    const renderPost = ({item}: { item: WPPost }) => {
        const image = item._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        const date = new Date(item.date).toLocaleDateString('sr-RS');
        const excerpt = item.excerpt.rendered.replace(/<[^>]+>/g, '');

        return (
            <View className="w-[260px] mr-3">
                <View
                    className="rounded-2xl shadow-md p-3 border"
                    style={{
                        backgroundColor: isDark ? '#1b1b1b' : 'white',
                        borderColor: isDark ? '#333' : '#e5e7eb',
                        height: isSearchActive ? undefined : 250,
                    }}
                >
                    <TouchableOpacity onPress={() => goToPost(item.id)} disabled={isLoading}>
                        {image && (
                            <Image source={{uri: image}} className="w-full h-[110px] rounded-xl mb-2" resizeMode="cover" />
                        )}
                        <View>
                            {isSearchActive ? (
                                highlightSearchTerm(item.title.rendered, searchQuery)
                            ) : (
                                <Text
                                    numberOfLines={2}
                                    className="text-base font-semibold mb-1"
                                    style={{color: isDark ? 'white' : 'black'}}
                                >
                                    {item.title.rendered.replace(/<[^>]+>/g, '')}
                                </Text>
                            )}
                        </View>

                        <View className="flex-row justify-between items-center mb-1">
                            <Text className="text-xs" style={{color: isDark ? '#9ca3af' : '#6b7280'}}>
                                {date}
                            </Text>
                            <TouchableOpacity onPress={() => removePost(item.id)} disabled={isLoading}>
                                <Image source={icons.close} style={{width: 20, height: 20, tintColor: isDark ? 'white' : 'black'}} />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-sm" numberOfLines={2} style={{color: isDark ? '#686c75' : '#b9babe'}}>
                            {excerpt}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1" style={{backgroundColor: isDark ? '#000' : '#fff'}}>
            <CustomHeader
                onCategorySelected={() => {}}
                activeCategory={activeCategory}
                triggerSearchOpen={triggerSearchOpen}
                onSearchQuery={setSearchQuery}
                showMenu={false}
                onMenuToggle={() => {}}
                onBackPress={handleBackWithLoading}
                loadingNav={isLoading}
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
                                    setTriggerSearchOpen(false);
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
                            setTriggerSearchOpen(false);
                        }}
                        backgroundColor="#201F5B"
                    />
                </View>
            )}

            <ScrollView
                contentContainerStyle={{paddingBottom: 100}}
                className="px-4 pt-4"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {Object.entries(getFilteredFavorites()).length === 0 ? (
                    <Text className="text-center mt-10" style={{color: isDark ? 'white' : 'black'}}>
                        Nema sačuvanih omiljenih objava.
                    </Text>
                ) : (
                    Object.entries(getFilteredFavorites()).map(([category, posts]) => (
                        <View key={category} className="mb-6">
                            <View className="flex-row items-center justify-between mt-5 mb-3">
                                <Text className="text-xl font-bold" style={{color: isDark ? '#FFFFFF' : '#000000'}}>
                                    {category}
                                </Text>
                                <TouchableOpacity onPress={() => removeCategory(category)} disabled={isLoading}>
                                    <Image source={icons.close} style={{width: 20, height: 20, tintColor: isDark ? 'white' : 'black'}} />
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={posts}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={renderPost}
                                scrollEnabled={!isLoading}
                            />

                            <View className="h-[1px] mt-5" style={{backgroundColor: isDark ? '#FFFFFF' : '#1a1a1a'}} />
                        </View>
                    ))
                )}
            </ScrollView>

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
                        Učitavanje...
                    </Text>
                </View>
            )}

            <CustomFooter onSearchPress={handleFooterSearch} />
        </SafeAreaView>
    );
};

export default Favorites;