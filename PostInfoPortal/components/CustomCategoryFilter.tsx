import React, {Dispatch, SetStateAction, useEffect, useState} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
} from 'react-native';
import {ChevronDown, ChevronUp} from 'lucide-react-native';
import {WPPost} from '@/types/wp';
import {useTheme} from './ThemeContext';
import {menuData} from '@/types/menuData';
import colors from '@/constants/colors';
import {nameToSlugMap} from "@/constants/nameToSlugMap";

interface Props {
    selectedCategory: string;
    onCategorySelect: (cat: string) => void;
    selectedDate: { month?: number; year?: number };
    setSelectedDate: Dispatch<SetStateAction<{ month?: number; year?: number }>>;
    groupedPostsCache: Record<string, WPPost[]>;
    filteredPosts: WPPost[];
    setFilteredPosts: (posts: WPPost[]) => void;
    setIsFilterApplied: Dispatch<SetStateAction<boolean>>;
    isFilterApplied: boolean;
}

type FlatCategory = {
    title: string;
    slug: string;
};

const months = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];
const years = Array.from({length: 10}, (_, i) => new Date().getFullYear() - i);

const extractFlatCategories = (data: any[]): FlatCategory[] => {
    let categories: FlatCategory[] = [];

    for (const item of data) {
        if (typeof item === 'string' && item !== 'Latin | Ćirilica' && item !== 'Naslovna' && item !== 'Danas') {
            categories.push({
                title: item,
                slug: nameToSlugMap[item] || item.toLowerCase().replace(/\s+/g, '-'),
            });
        } else if (typeof item === 'object' && item.title) {
            if (item.title !== 'Latin | Ćirilica' && item.title !== 'Naslovna' && item.title !== 'Danas') {
                categories.push({
                    title: item.title,
                    slug: nameToSlugMap[item.title] || item.title.toLowerCase().replace(/\s+/g, '-'),
                });
            }
            if (Array.isArray(item.children)) {
                categories = categories.concat(extractFlatCategories(item.children));
            }
        }
    }

    return categories.sort((a, b) => a.title.localeCompare(b.title, 'sr'));
};

const CustomCategoryFilter: React.FC<Props> = ({
                                                   selectedCategory,
                                                   onCategorySelect,
                                                   selectedDate,
                                                   setSelectedDate,
                                                   groupedPostsCache,
                                                   filteredPosts,
                                                   setFilteredPosts,
                                                   setIsFilterApplied,
                                                   isFilterApplied
                                               }) => {
    const [expanded, setExpanded] = useState(true);
    const [showDateModal, setShowDateModal] = useState(false);
    const [tempDate, setTempDate] = useState(selectedDate);
    const {theme} = useTheme();
    const isDark = theme === 'dark';

    const allCategories = extractFlatCategories(menuData)
        .filter((cat) => cat.title !== 'Naslovna' && cat.title !== 'Danas');

    const [showAll, setShowAll] = useState(false);
    const categoriesToShow = showAll ? allCategories : allCategories.slice(0, 8);

    useEffect(() => {
        if (showDateModal) setTempDate(selectedDate);
    }, [showDateModal, selectedDate]);

    const handleCategoryPress = (cat: string) => {
        if (selectedCategory === cat) {
            onCategorySelect('');
        } else {
            onCategorySelect(cat);
        }
        // reduce the category list automatically
        setExpanded(false);

        setIsFilterApplied(false);
        setFilteredPosts([]);
        setSelectedDate({});
    };

    const resetFilter = () => {
        setSelectedDate({});
        setIsFilterApplied(false);
        setFilteredPosts([]);
    };

    const getYear = (iso: string) => {
        const m = (iso || '').match(/^(\d{4})/);
        return m ? Number(m[1]) : NaN;
    };
    const getMonth = (iso: string) => {
        const m = (iso || '').match(/^\d{4}-(\d{2})/);
        return m ? Number(m[1]) : NaN; // 1..12
    };

    const applyFilter = () => {
        if (typeof tempDate.month !== 'number' || typeof tempDate.year !== 'number') return;

        let base: WPPost[] = [];
        if (selectedCategory && groupedPostsCache[selectedCategory]) {
            base = groupedPostsCache[selectedCategory];
        } else {
            base = Object.values(groupedPostsCache || {}).filter(Boolean).flat();
        }

        const filtered = base.filter((post) => {
            const y = getYear(post.date);
            const m = getMonth(post.date);
            return y === tempDate.year && m === tempDate.month;
        });

        setSelectedDate(tempDate);
        setFilteredPosts(filtered);
        setIsFilterApplied(true);
        setShowDateModal(false);

    };

    return (
        <View className="px-4">
            <TouchableOpacity onPress={() => setExpanded(!expanded)} className="flex-row items-center mt-4 mb-4">
                <Text className="text-lg font-bold mr-2" style={{color: isDark ? 'white' : 'black'}}>Kategorije</Text>
                {expanded ? <ChevronUp color={isDark ? 'white' : 'black'} size={20}/> :
                    <ChevronDown color={isDark ? 'white' : 'black'} size={20}/>}
            </TouchableOpacity>

            {expanded && (
                <>
                    <View className="flex flex-wrap flex-row justify-between mb-4">
                        {categoriesToShow.map((cat) => {
                            const isActive = selectedCategory === cat.title;
                            return (
                                <TouchableOpacity
                                    key={cat.slug}
                                    onPress={() => handleCategoryPress(cat.title)}
                                    className={`w-[48%] mb-4 rounded-xl p-4 border ${
                                        isActive
                                            ? 'bg-[#FA0A0F] border-[#FA0A0F]'
                                            : isDark
                                                ? 'bg-[#222] border-gray-600'
                                                : 'bg-gray-100 border-gray-300'
                                    }`}
                                >
                                    <Text
                                        className={`text-center text-base font-semibold ${isActive ? 'text-white' : isDark ? 'text-white' : 'text-black'}`}>
                                        {cat.title}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {allCategories.length > 8 && (
                        <TouchableOpacity
                            onPress={() => setShowAll(!showAll)}
                            className="mb-4 self-center flex-row items-center"
                        >
                            {showAll ? (
                                <ChevronUp color={isDark ? 'white' : 'black'} size={20}/>
                            ) : (
                                <ChevronDown color={isDark ? 'white' : 'black'} size={20}/>
                            )}
                        </TouchableOpacity>
                    )}
                </>
            )}

            <TouchableOpacity onPress={() => setShowDateModal(true)} className="rounded-xl px-4 py-3 mb-5"
                              style={{backgroundColor: colors.blue}}>
                <Text className="text-white text-center font-semibold">Filtriraj po datumu</Text>
            </TouchableOpacity>

            {filteredPosts.length > 0 && (
                <TouchableOpacity onPress={resetFilter} className="rounded-xl px-4 py-3 mb-3"
                                  style={{backgroundColor: colors.red}}>
                    <Text className="text-white text-center font-semibold">Resetuj filter</Text>
                </TouchableOpacity>
            )}

            {isFilterApplied && selectedDate.month && selectedDate.year && (
                <View className="mb-3 mt-5">
                    <Text
                        className="text-center font-medium text-base"
                        style={{color: isDark ? '#ffffff' : '#1f2937'}}
                    >
                        {filteredPosts.length > 0
                            ? `Rezultati pretrage za ${selectedCategory || 'sve kategorije'} za ${months[selectedDate.month - 1].toLowerCase()} ${selectedDate.year}.`
                            : 'Nema rezultata za izabrane filtere.'}
                    </Text>
                </View>
            )}

            {showDateModal && (
                <Modal visible transparent animationType="fade">
                    <View style={{flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)'}}>
                        <View className="rounded-t-3xl px-5 pt-5 pb-8"
                              style={{backgroundColor: isDark ? 'black' : 'white'}}>
                            <Text
                                className={`text-center text-lg font-bold mb-5 ${isDark ? 'text-white' : 'text-black'}`}>Izaberite
                                datum</Text>
                            <View className="flex-row justify-between mb-6">
                                <View className="w-[48%]">
                                    <Text className={`mb-2 font-medium ${isDark ? 'text-white' : 'text-black'}`}>Mesec</Text>
                                    <ScrollView className="h-48 rounded-xl p-2" style={{
                                        backgroundColor: isDark ? '#1f2937' : colors.grey,
                                        maxHeight: 200
                                    }}>
                                        {months.map((month, i) => (
                                            <TouchableOpacity
                                                key={month}
                                                onPress={() => setTempDate((prev) => ({...prev, month: i + 1}))}
                                                className={`py-2 px-3 rounded-md mb-2 ${tempDate.month === i + 1 ? 'bg-[#201F5B]' : 'bg-transparent'}`}
                                            >
                                                <Text className={`${tempDate.month === i + 1 ? 'text-white' : isDark ? 'text-white' : 'text-black'}`}>{month}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                                <View className="w-[48%]">
                                    <Text className={`mb-2 font-medium ${isDark ? 'text-white' : 'text-black'}`}>Godina</Text>
                                    <ScrollView className="h-48 rounded-xl p-2" style={{
                                        backgroundColor: isDark ? '#1f2937' : colors.grey,
                                        maxHeight: 200
                                    }}>
                                        {years.map((year) => (
                                            <TouchableOpacity
                                                key={year}
                                                onPress={() => setTempDate((prev) => ({...prev, year}))}
                                                className={`py-2 px-3 rounded-md mb-1 ${tempDate.year === year ? 'bg-[#201F5B]' : 'bg-transparent'}`}
                                            >
                                                <Text className={`${tempDate.year === year ? 'text-white' : isDark ? 'text-white' : 'text-black'}`}>{year}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>

                            <View className="flex-row justify-around">
                                <TouchableOpacity
                                    onPress={() => {
                                        setTempDate(selectedDate);
                                        setShowDateModal(false);
                                    }}
                                >
                                    <Text className="font-bold text-base" style={{color: colors.red}}>Otkaži</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={applyFilter} disabled={!(tempDate.month && tempDate.year)}>
                                    <Text
                                        className={`font-bold text-base ${tempDate.month && tempDate.year ? (isDark ? 'text-white' : 'text-black') : 'text-gray-700'}`}>Primeni</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
};

export default CustomCategoryFilter;
