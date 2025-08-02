import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    Animated,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '@/components/CustomHeader';
import CustomFooter from '@/components/CustomFooter';
import { useTheme } from '@/components/ThemeContext';
import { usePostsByCategory } from '@/hooks/usePostsByCategory';
import { WPPost } from '@/types/wp';
import CustomCategoryFilter from '@/components/CustomCategoryFilter';

const Categories = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const {
        groupedPosts,
    } = usePostsByCategory();

    const [filteredPosts, setFilteredPosts] = useState<WPPost[]>([]);
    const [isFilterApplied, setIsFilterApplied] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<{ month?: number; year?: number }>({});
    const [refreshing, setRefreshing] = useState(false);

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

    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        // resets all filters
        setSelectedCategory('');
        setSelectedDate({});
        setFilteredPosts([]);
        setIsFilterApplied(false);
        setRefreshing(false);
    }, []);

    const renderItem = ({ item, index }: { item: WPPost; index: number }) => {
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
        const excerpt = item.excerpt.rendered.replace(/<[^>]+>/g, '');

        return (
            <Animated.View style={animStyle}>
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
                                source={{ uri: image }}
                                className="w-full h-48 rounded-xl"
                                resizeMode="cover"
                            />
                        </View>
                    )}
                    <Text className="text-xl font-semibold mb-1" style={{ color: isDark ? 'white' : 'black' }}>
                        {item.title.rendered}
                    </Text>
                    <Text className="text-xs mb-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                        {date}
                    </Text>
                    <Text className="text-sm" numberOfLines={3} style={{ color: isDark ? '#8f939a' : '#999ea1' }}>
                        {excerpt}
                    </Text>
                </View>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: isDark ? '#000' : '#fff' }}>
            <CustomHeader
                showMenu={false}
                activeCategory=""
                onCategorySelected={() => {}}
                onMenuToggle={() => {}}
            />

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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListEmptyComponent={
                    isFilterApplied ? (
                        <View className="px-4 mt-10">
                            <Text className="text-base text-center font-semibold" style={{ color: isDark ? '#fff' : '#000' }}>
                                Nema rezultata za prikaz.
                            </Text>
                        </View>
                    ) : null
                }
            />

            <CustomFooter onSearchPress={() => {}} />
        </SafeAreaView>
    );
};

export default Categories;

