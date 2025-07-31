import React, {useState, useCallback} from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    ScrollView,
    RefreshControl, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect, useRouter} from 'expo-router';
import {WPPost} from '@/types/wp';
import {SafeAreaView} from 'react-native-safe-area-context';
import CustomHeader from '@/components/CustomHeader';
import CustomFooter from '@/components/CustomFooter';
import icons from '@/constants/icons';
import {useTheme} from "@/components/ThemeContext";

type FavoritePost = WPPost & { category: string };

const Favorites = () => {
    const [groupedFavorites, setGroupedFavorites] = useState<Record<string, WPPost[]>>({});
    const [activeCategory, setActiveCategory] = useState('Naslovna');
    const [menuOpen, setMenuOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const router = useRouter();

    const {theme} = useTheme();
    const isDark = theme === 'dark';

    const loadFavorites = async () => {
        const saved = await AsyncStorage.getItem('favorites');
        if (!saved) return;

        const parsed: (WPPost & { category: string })[] = JSON.parse(saved);
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

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadFavorites();
        setRefreshing(false);
    }, []);

    const handleCategorySelected = (category: string) => {
        setActiveCategory(category);
        router.replace({pathname: '/', params: {selectedCategory: category}});
    };

    const removePost = (postId: number) => {
        Alert.alert(
            'Brisanje objave',
            'Da li ste sigurni da želite da obrišete ovu objavu iz omiljenih?',
            [
                {
                    text: 'Ne',
                    style: 'cancel',
                },
                {
                    text: 'Da',
                    onPress: async () => {
                        const saved = await AsyncStorage.getItem('favorites');
                        if (!saved) return;

                        let parsed: FavoritePost[] = JSON.parse(saved);
                        parsed = parsed.filter((p) => p.id !== postId);
                        await AsyncStorage.setItem('favorites', JSON.stringify(parsed));
                        loadFavorites();
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    const removeCategory = (category: string) => {
        Alert.alert(
            'Brisanje kategorije',
            'Da li ste sigurni da želite da obrišete ovu kategoriju iz omiljenih?',
            [
                {
                    text: 'Ne',
                    style: 'cancel',
                },
                {
                    text: 'Da',
                    onPress: async () => {
                        const saved = await AsyncStorage.getItem('favorites');
                        if (!saved) return;

                        let parsed: FavoritePost[] = JSON.parse(saved);
                        parsed = parsed.filter((p) => p.category !== category);
                        await AsyncStorage.setItem('favorites', JSON.stringify(parsed));
                        loadFavorites();
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    const renderPost = ({item}: { item: WPPost }) => {
        const image = item._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        const date = new Date(item.date).toLocaleDateString('sr-RS');
        const excerpt = item.excerpt.rendered.replace(/<[^>]+>/g, '');
        const title = item.title.rendered;

        return (
            <View className="w-[260px] mr-3">
                <View
                    className="rounded-2xl shadow-md p-3 border"
                    style={{
                        backgroundColor: isDark ? '#1b1b1b' : 'white',
                        borderColor: isDark ? '#333' : '#e5e7eb',
                    }}
                >
                    <TouchableOpacity
                        onPress={() =>
                            router.push({
                                pathname: '/post-details',
                                params: {post: JSON.stringify(item)},
                            })
                        }
                    >
                        {image && (
                            <Image
                                source={{uri: image}}
                                className="w-full h-[110px] rounded-xl mb-2"
                                resizeMode="cover"
                            />
                        )}
                        <Text className="text-base font-semibold mb-1"
                              style={{color: isDark ? 'white' : 'black'}}
                              numberOfLines={2}>
                            {title}
                        </Text>

                        <View className="flex-row justify-between items-center mb-1">
                            <Text className="text-xs"
                                  style={{color: isDark ? '#9ca3af' : '#6b7280'}}>
                                {date}
                            </Text>

                            <TouchableOpacity onPress={() => removePost(item.id)}>
                                <Image
                                    source={icons.close}
                                    style={{
                                        width: 20,
                                        height: 20,
                                        tintColor: isDark ? 'white' : 'black'
                                    }}
                                />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-sm" numberOfLines={2}
                              style={{color: isDark ? '#686c75' : '#b9babe'}}>
                            {excerpt}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1"
                      style={{backgroundColor: isDark ? '#000000' : 'white'}}>
            <CustomHeader
                onMenuToggle={(visible) => setMenuOpen(visible)}
                onCategorySelected={handleCategorySelected}
                activeCategory={activeCategory}
                showMenu={false}
            />
            <ScrollView
                contentContainerStyle={{paddingBottom: 100}}
                className="px-4 pt-4"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
            >
                {Object.entries(groupedFavorites).length === 0 ? (
                    <Text className="text-center  mt-10"
                    style={{color: isDark ? "white" : "black"}}>
                        Nema sačuvanih omiljenih objava.
                    </Text>
                ) : (
                    Object.entries(groupedFavorites).map(([category, posts]) => (
                        <View key={category} className="mb-6">
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-xl font-bold  mt-5 mb-5"
                                      style={{color: isDark ? '#FFFFFF' : '#000000'}}>{category}</Text>
                                <TouchableOpacity onPress={() => removeCategory(category)}>
                                    <Image
                                        source={icons.close}
                                        style={{width: 20, height: 20, tintColor: isDark ? 'white' : 'black'}}
                                    />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={posts}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({item}) => renderPost({item})}
                            />
                            <View className="h-[1px] mt-5"
                                  style={{backgroundColor: isDark ? '#FFFFFF' : '#1a1a1a'}}/>
                        </View>
                    ))
                )}
            </ScrollView>

            {!menuOpen && <CustomFooter/>}
        </SafeAreaView>
    );
};

export default Favorites;
