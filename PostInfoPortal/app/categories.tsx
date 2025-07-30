import React, {useCallback, useRef, useState} from 'react';
import {
    View,
    Text,
    Animated,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Easing, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/components/ThemeContext';
import CustomHeader from '@/components/CustomHeader';
import CustomFilterModal from '@/components/CustomFilterModal';
import { usePostsByCategory } from '@/hooks/usePostsByCategory';
import { WPPost } from '@/types/wp';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import CustomFooter from "@/components/CustomFooter";
import { ChevronDown, ChevronUp } from 'lucide-react-native';

const Categories = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const router = useRouter();

    const { groupedPosts, loading } = usePostsByCategory();
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<{ month?: number; year?: number }>({});
    const [filteredPosts, setFilteredPosts] = useState<WPPost[]>([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Naslovna');
    const [showDateModal, setShowDateModal] = useState(false);
    const [filterLoading, setFilterLoading] = useState(false);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const isFilterActive = selectedCategory !== '' || selectedDate.month || selectedDate.year;
    const [refreshing, setRefreshing] = useState(false);


    const animationRefs = useRef<Animated.Value[]>([]);
    const categoryList = Object.keys(groupedPosts);

    const onRefresh = useCallback(() => {
        setRefreshing(true);

        setSelectedCategory('');
        setSelectedDate({});
        setFilteredPosts([]);
        
        applyFilterWithCategory('', {});

        setRefreshing(false);
    }, []);

    const toggleSortOrder = () => {
        setFilteredPosts((prev) => [...prev].reverse());
        setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    };

    const handleApplyFilter = (
        overrideCategory?: string,
        overrideDate?: { month?: number; year?: number }
    ) => {
        const categoryToUse = overrideCategory ?? selectedCategory;
        const dateToUse = overrideDate ?? selectedDate;

        setSelectedCategory(categoryToUse);
        setSelectedDate(dateToUse);

        applyFilterWithCategory(categoryToUse, dateToUse);
    };

    const runAnimations = () => {
        const animations = animationRefs.current.map((anim, index) =>
            Animated.timing(anim, {
                toValue: 1,
                duration: 400,
                delay: index * 100,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            })
        );
        Animated.stagger(100, animations).start();
    };

    const handleCategorySelected = (category: string) => {
        const isAlreadySelected = selectedCategory === category;
        const newSelectedCategory = isAlreadySelected ? '' : category;

        setSelectedCategory(newSelectedCategory);
        setActiveCategory(newSelectedCategory);

        if (selectedDate.month && selectedDate.year) {
            applyFilterWithCategory(newSelectedCategory, selectedDate);
        } else {
            if (newSelectedCategory) {
                const posts = groupedPosts[newSelectedCategory] || [];
                const sorted = posts.sort((a, b) =>
                    sortOrder === 'desc'
                        ? new Date(b.date).getTime() - new Date(a.date).getTime()
                        : new Date(a.date).getTime() - new Date(b.date).getTime()
                );
                animationRefs.current = sorted.map(() => new Animated.Value(0));
                setFilteredPosts(sorted);
                runAnimations();
            } else {
                setFilteredPosts([]);
            }

            router.replace({ pathname: '/', params: { selectedCategory: newSelectedCategory } });
        }
    };

    const applyFilterWithCategory = (
        category: string,
        date: { month?: number; year?: number }
    ) => {
        const isFilterActive = category !== '' || date.month || date.year;

        if (!isFilterActive) {
            setFilteredPosts([]);
            return;
        }

        setFilterLoading(true);
        setFilteredPosts([]);

        let allPosts: WPPost[] = [];

        if (category) {
            allPosts = groupedPosts[category] || [];
        } else {
            Object.values(groupedPosts).forEach((posts) => {
                allPosts.push(...posts);
            });
        }

        const filtered = allPosts.filter((post) => {
            const postDate = new Date(post.date);
            const matchesMonth = date.month ? (postDate.getMonth() + 1) === date.month : true;
            const matchesYear = date.year ? postDate.getFullYear() === date.year : true;
            return matchesMonth && matchesYear;
        });

        const sorted = filtered.sort((a, b) =>
            sortOrder === 'desc'
                ? new Date(b.date).getTime() - new Date(a.date).getTime()
                : new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        animationRefs.current = sorted.map(() => new Animated.Value(0));

        setTimeout(() => {
            setFilteredPosts(sorted);
            runAnimations();
            setFilterLoading(false);
        }, 600);
    };

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
                    <TouchableOpacity
                        onPress={() =>
                            router.push({
                                pathname: '/post-details',
                                params: { post: JSON.stringify(item), category: selectedCategory }
                            })
                        }
                    >
                        {image && (
                            <Image
                                source={{ uri: image }}
                                className="w-full h-48 rounded-xl mb-3"
                                resizeMode="cover"
                            />
                        )}
                        <Text className="text-xl font-semibold mb-1"
                        style={{color: isDark ? 'white' : 'black'}}>
                            {item.title.rendered}
                        </Text>
                        <Text className="text-xs mb-1"
                        style={{color: isDark ? '#9ca3af' : '#6b7280'}}>{date}</Text>
                        <Text className="text-sm" numberOfLines={3}
                              style={{color: isDark ? '#374151' : '#d1d5db'}}>
                            {excerpt}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    };

    const renderHeader = () => (
        <View className="px-4 mt-4">
            <CustomFilterModal
                categories={categoryList}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                onApply={handleApplyFilter}
                showDateModal={showDateModal}
                setShowDateModal={setShowDateModal}
                filteredPosts={filteredPosts}
                setFilteredPosts={setFilteredPosts}
            />

            {isFilterActive && filteredPosts.length > 0 && (
                <>
                    <View className="flex-row justify-end items-center mr-1 mb-2">
                        <TouchableOpacity onPress={toggleSortOrder} className="flex-row items-center">
                            <Text className="text-sm font-semibold mr-1"
                                  style={{color: isDark ? 'white' : 'black'}}>
                                {sortOrder === 'desc' ? 'Najnoviji' : 'Najstariji'}
                            </Text>
                            {sortOrder === 'desc' ? (
                                <ChevronDown size={18} color={isDark ? 'white' : 'black'} />
                            ) : (
                                <ChevronUp size={18} color={isDark ? 'white' : 'black'} />
                            )}
                        </TouchableOpacity>
                    </View>

                    <Text className="text-center my-4 text-base font-bold"
                          style={{color: isDark ? 'white' : 'black'}}>
                        Rezultat pretrage za {selectedCategory || 'sve kategorije'}{' '}
                        {String(selectedDate.month).padStart(2, '0')}/{selectedDate.year}
                    </Text>
                </>
            )}
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: isDark ? '#000' : '#fff',
                }}
            >
                <ActivityIndicator size="large" color={isDark ? colors.red : colors.blue} />
            </SafeAreaView>
        );
    }

    const showLoading = categoryList.length === 0 || filterLoading;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
            <CustomHeader
                onMenuToggle={(visible) => setMenuOpen(visible)}
                onCategorySelected={handleCategorySelected}
                activeCategory={activeCategory}
                showMenu={false}
            />

            {showLoading ? (
                <View className="flex-1 justify-center items-center mt-10">
                    <ActivityIndicator size="large" color={isDark ? colors.red : colors.blue} />
                </View>
            ) : (
                <Animated.FlatList
                    data={filteredPosts}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    ListHeaderComponent={renderHeader}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        selectedDate.month && selectedDate.year ? (
                            <Text className="text-center mt-10 font-bold text-base"
                                  style={{color: isDark ? '#9ca3af' : '#6b7280'}}>
                                Nema rezultata za prikaz za {selectedCategory || 'sve kategorije'}{' '}
                                {String(selectedDate.month).padStart(2, '0')}/{selectedDate.year}.
                            </Text>
                        ) : (
                            <Text className="text-center mt-10 text-base font-bold text-gray-500 dark:text-gray-400"
                                  style={{color: isDark ? '#9ca3af' : '#6b7280'}}>
                                Izaberite datum i/ili kategoriju za filtriranje.
                            </Text>
                        )
                    }
                    contentContainerStyle={{ paddingBottom: 100 }}
                />
            )}

            {!menuOpen && <CustomFooter />}
        </SafeAreaView>
    );
};

export default Categories;