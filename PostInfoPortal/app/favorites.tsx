import React, { useState, useCallback } from 'react';
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
import { WPPost } from '@/types/wp';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '@/components/CustomHeader';
import CustomFooter from '@/components/CustomFooter';
import icons from '@/constants/icons';

type FavoritePost = WPPost & { category: string };

const Favorites = () => {
    const [groupedFavorites, setGroupedFavorites] = useState<Record<string, WPPost[]>>({});
    const [activeCategory, setActiveCategory] = useState('Naslovna');
    const [menuOpen, setMenuOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const router = useRouter();

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
        router.replace({ pathname: '/', params: { selectedCategory: category } });
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

    const renderPost = ({ item }: { item: WPPost }, category: string) => {
        const image = item._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        const date = new Date(item.date).toLocaleDateString('sr-RS');

        return (
            <View className="w-[240px] mr-3">
                <TouchableOpacity
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
                            className="h-32 w-full rounded-md"
                            resizeMode="cover"
                        />
                    )}
                    <Text className="text-black font-bold mt-2" numberOfLines={2}>
                        {item.title.rendered}
                    </Text>
                </TouchableOpacity>
                <View className="flex-row justify-between items-center mt-1">
                    <Text className="text-gray-500 text-xs">{date}</Text>
                    <TouchableOpacity onPress={() => removePost(item.id)}>
                        <View className="p-1 rounded-lg border border-black">
                            <Image
                                source={icons.close}
                                style={{ width: 20, height: 20, tintColor: '#FA0A0F' }}
                                className="rounded-xl"
                            />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <CustomHeader
                onMenuToggle={(visible) => setMenuOpen(visible)}
                onCategorySelected={handleCategorySelected}
                activeCategory={activeCategory}
                showMenu={false}
            />
            <ScrollView
                contentContainerStyle={{ paddingBottom: 100 }}
                className="px-4 pt-4"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {Object.entries(groupedFavorites).length === 0 ? (
                    <Text className="text-center text-gray-500 mt-10">
                        Nema sačuvanih omiljenih objava.
                    </Text>
                ) : (
                    Object.entries(groupedFavorites).map(([category, posts]) => (
                        <View key={category} className="mb-6">
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-xl font-bold text-black mt-5 mb-5">{category}</Text>
                                <TouchableOpacity onPress={() => removeCategory(category)}>
                                    <View className="p-1 rounded-lg border border-black">
                                        <Image
                                            source={icons.close}
                                            style={{ width: 20, height: 20, tintColor: '#FA0A0F' }}
                                            className="rounded-xl"
                                        />
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={posts}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => renderPost({ item }, category)}
                            />
                            <View className="h-[1px] bg-gray-700 mt-5"/>
                        </View>
                    ))
                )}
            </ScrollView>

            {!menuOpen && <CustomFooter />}
        </SafeAreaView>
    );
};

export default Favorites;
