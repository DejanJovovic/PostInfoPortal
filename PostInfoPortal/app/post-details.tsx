import { Text, Image, ScrollView, useWindowDimensions, View, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CustomHeader from '@/components/CustomHeader';
import CustomMenuCategories from '@/components/CustomMenuCategories';
import CustomFooter from '@/components/CustomFooter';
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import icons from "@/constants/icons";

const PostDetails = () => {
    const { width } = useWindowDimensions();
    const { post, category } = useLocalSearchParams();
    const router = useRouter();

    const categoryParam = Array.isArray(category) ? category[0] : category;
    const [activeCategory, setActiveCategory] = useState(categoryParam || 'Naslovna');
    const [menuOpen, setMenuOpen] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);

    const postData = JSON.parse(Array.isArray(post) ? post[0] : post);
    const { id, title, content, date, _embedded } = postData;
    const image = _embedded?.['wp:featuredmedia']?.[0]?.source_url;
    const formattedDate = new Date(date).toLocaleDateString('sr-RS', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    });

    useEffect(() => {
        const checkIfBookmarked = async () => {
            const saved = await AsyncStorage.getItem('favorites');
            if (saved) {
                const parsed = JSON.parse(saved);
                setIsBookmarked(parsed.some((item: any) => item.id === id));
            }
        };
        checkIfBookmarked();
    }, [id]);

    const toggleBookmark = async () => {
        try {
            const saved = await AsyncStorage.getItem('favorites');
            let favorites = saved ? JSON.parse(saved) : [];

            if (isBookmarked) {
                favorites = favorites.filter((item: any) => item.id !== id);
            } else {
                favorites.push({ ...postData, category: activeCategory });
            }

            await AsyncStorage.setItem('favorites', JSON.stringify(favorites));
            setIsBookmarked(!isBookmarked);
        } catch (e) {
            console.error('Greška pri čuvanju omiljenih:', e);
        }
    };

    const handleCategorySelected = (category: string) => {
        setActiveCategory(category);
        router.replace({ pathname: '/', params: { selectedCategory: category } });
    };

    // this return comes before hooks
    if (!post) return null;

    return (
        <SafeAreaView className="flex-1 bg-white">
            <CustomHeader
                onMenuToggle={(visible) => setMenuOpen(visible)}
                onCategorySelected={handleCategorySelected}
                activeCategory={activeCategory}
                showMenu={false}
            />
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-4 py-4">
                {image && (
                    <Image
                        source={{ uri: image }}
                        className="w-full h-60 rounded-md mb-4"
                        resizeMode="cover"
                    />
                )}

                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-xl font-bold text-black flex-1 pr-4">{title?.rendered}</Text>
                    <TouchableOpacity onPress={toggleBookmark}>
                        <Image
                            source={icons.bookmark}
                            style={{ width: 24, height: 24, tintColor: isBookmarked ? 'red' : 'black' }}
                        />
                    </TouchableOpacity>
                </View>

                <Text className="text-gray-400 text-sm mb-3">{formattedDate}</Text>

                <RenderHTML contentWidth={width} source={{ html: content?.rendered }} />
            </ScrollView>
        </SafeAreaView>
    );
};

export default PostDetails;