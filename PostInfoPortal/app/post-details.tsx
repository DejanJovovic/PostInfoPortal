import { Text, Image, ScrollView, useWindowDimensions } from 'react-native';
import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CustomHeader from '@/components/CustomHeader';
import CustomMenuCategories from '@/components/CustomMenuCategories';
import CustomFooter from '@/components/CustomFooter';
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';

const PostDetails = () => {
    const { width } = useWindowDimensions();
    const { post } = useLocalSearchParams();
    const router = useRouter();

    const [activeCategory, setActiveCategory] = useState('Naslovna');
    const [menuOpen, setMenuOpen] = useState(false);

    if (!post) return null;

    const postData = JSON.parse(Array.isArray(post) ? post[0] : post);
    const image = postData._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    const title = postData.title?.rendered;
    const content = postData.content?.rendered;

    // when clicked on one of the categories from this screen, just go back to index and mark the selected category
    const handleCategorySelected = (category: string) => {
        setActiveCategory(category);
        router.replace({ pathname: '/', params: { selectedCategory: category } });
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <CustomHeader
                onMenuToggle={(visible) => setMenuOpen(visible)}
                onCategorySelected={handleCategorySelected}
                activeCategory={activeCategory}
            />
            <CustomMenuCategories
                onSelectCategory={handleCategorySelected}
                activeCategory={activeCategory}
            />
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-4 py-4">
                {image && (
                    <Image
                        source={{ uri: image }}
                        className="w-full h-60 rounded-md mb-4"
                        resizeMode="cover"
                    />
                )}
                <Text className="text-xl font-bold mb-2 text-black">{title}</Text>
                <RenderHTML contentWidth={width} source={{ html: content }} />
            </ScrollView>
            {!menuOpen && <CustomFooter />}
        </SafeAreaView>
    );
};

export default PostDetails;