import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Modal,
} from 'react-native';
import { useTheme } from '@/components/ThemeContext';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import colors from '@/constants/colors';
import { WPPost } from '@/types/wp';

type SelectedDate = {
    month?: number;
    year?: number;
};

type CustomFilterModalProps = {
    categories: string[];
    selectedCategory: string;
    onCategorySelect: (category: string) => void;
    selectedDate: SelectedDate;
    setSelectedDate: React.Dispatch<React.SetStateAction<SelectedDate>>;
    onApply: (categoryOverride?: string, dateOverride?: { month?: number; year?: number }) => void;
    showDateModal: boolean;
    setShowDateModal: (visible: boolean) => void;
    filteredPosts: WPPost[];
    setFilteredPosts: React.Dispatch<React.SetStateAction<WPPost[]>>;
};

const months: string[] = [
    'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
    'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
];

const years: number[] = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

const CustomFilterModal: React.FC<CustomFilterModalProps> = ({
                                                                 categories,
                                                                 selectedCategory,
                                                                 onCategorySelect,
                                                                 selectedDate,
                                                                 setSelectedDate,
                                                                 onApply,
                                                                 showDateModal,
                                                                 setShowDateModal,
                                                                 setFilteredPosts,
                                                             }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [showAllCategories, setShowAllCategories] = useState(false);
    const [tempDate, setTempDate] = useState<SelectedDate>(selectedDate);

    useEffect(() => {
        if (showDateModal) {
            setTempDate(selectedDate);
        }
    }, [showDateModal, selectedDate]);

    const isFilterActive =
        (selectedDate.month && selectedDate.year) ||
        (selectedCategory !== '' && selectedDate.month && selectedDate.year);

    const handleCategorySelect = (cat: string) => {
        const isAlreadySelected = selectedCategory === cat;
        const newCategory = isAlreadySelected ? '' : cat;

        onCategorySelect(newCategory);
        setShowAllCategories(false);

        if (selectedDate.month && selectedDate.year) {
            onApply(newCategory, selectedDate);
        }
    };

    const closeModal = () => {
        setShowDateModal(false);
    };

    return (
        <View className="mb-4">
            <View className="px-4 mt-10">
                <Text className="text-base font-bold mb-5"
                      style={{ color: isDark ? 'white' : 'black' }}>
                    Odaberite kategoriju
                </Text>
                <View className="flex flex-wrap flex-row justify-between">
                    {(showAllCategories ? categories : categories.slice(0, 4)).map((cat: string, idx: number) => (
                        <TouchableOpacity
                            key={idx}
                            onPress={() => handleCategorySelect(cat)}
                            className={`w-[48%] mb-4 rounded-xl p-4 border ${
                                selectedCategory === cat
                                    ? 'bg-[#FA0A0F] border-[#FA0A0F]'
                                    : isDark ? 'bg-[#222] border-gray-600' : 'bg-gray-100 border-gray-300'
                            }`}
                        >
                            <Text
                                className={`text-center text-base font-semibold ${
                                    selectedCategory === cat ? 'text-white' : isDark ? 'text-white' : 'text-black'
                                }`}
                            >
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {categories.length > 4 && (
                    <TouchableOpacity
                        onPress={() => setShowAllCategories((prev) => !prev)}
                        className="items-center mb-2"
                    >
                        {showAllCategories ? (
                            <ChevronUp size={24} color={isDark ? 'white' : 'black'} />
                        ) : (
                            <ChevronDown size={24} color={isDark ? 'white' : 'black'} />
                        )}
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    onPress={() => {
                        if (isFilterActive) {
                            const resetDate = {};
                            const resetCategory = '';
                            setSelectedDate(resetDate);
                            onCategorySelect(resetCategory);
                            setFilteredPosts([]);
                            onApply(resetCategory, resetDate);
                        } else {
                            setShowDateModal(true);
                        }
                    }}
                    className="mt-3 p-3 rounded-xl shadow"
                    style={{
                        backgroundColor: isFilterActive ? colors.red : colors.blue
                    }}
                >
                    <Text className="text-center font-bold" style={{ color: isDark ? "white" : colors.grey }}>
                        {isFilterActive
                            ? 'Resetuj filter'
                            : selectedDate.month && selectedDate.year
                                ? `${String(selectedDate.month).padStart(2, '0')}/${selectedDate.year}`
                                : 'Filtriraj po datumu'}
                    </Text>
                </TouchableOpacity>
            </View>

            {showDateModal && (
                <Modal visible transparent animationType="fade">
                    <View
                        style={{
                            flex: 1,
                            justifyContent: 'flex-end',
                            backgroundColor: 'rgba(0,0,0,0.4)',
                        }}
                    >
                        <View className="rounded-t-3xl px-5 pt-5 pb-8"
                              style={{ backgroundColor: isDark ? 'black' : 'white' }}>
                            <Text className={`text-center text-lg font-bold mb-5 ${isDark ? 'text-white' : 'text-black'}`}>
                                Izaberite datum
                            </Text>

                            <View className="flex-row justify-between mb-6">
                                <View className="w-[48%]">
                                    <Text className={`mb-2 font-medium ${isDark ? 'text-white' : 'text-black'}`}>Mesec</Text>
                                    <ScrollView className="h-48 rounded-xl p-2"
                                                style={{ backgroundColor: isDark ? '#1f2937' : colors.grey }}>
                                        {months.map((month, i) => (
                                            <TouchableOpacity
                                                key={month}
                                                onPress={() => setTempDate((prev) => ({ ...prev, month: i + 1 }))}
                                                className={`py-2 px-3 rounded-md mb-2 ${
                                                    tempDate.month === i + 1 ? 'bg-[#201F5B]' : 'bg-transparent'
                                                }`}
                                            >
                                                <Text
                                                    className={`${
                                                        tempDate.month === i + 1
                                                            ? 'text-white'
                                                            : isDark ? 'text-white' : 'text-black'
                                                    }`}
                                                >
                                                    {month}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                <View className="w-[48%]">
                                    <Text className={`mb-2 font-medium ${isDark ? 'text-white' : 'text-black'}`}>Godina</Text>
                                    <ScrollView className="h-48 rounded-xl p-2"
                                                style={{ backgroundColor: isDark ? '#1f2937' : colors.grey }}>
                                        {years.map((year: number) => (
                                            <TouchableOpacity
                                                key={year}
                                                onPress={() => setTempDate((prev) => ({ ...prev, year }))}
                                                className={`py-2 px-3 rounded-md mb-1 ${
                                                    tempDate.year === year ? 'bg-[#201F5B]' : 'bg-transparent'
                                                }`}
                                            >
                                                <Text
                                                    className={`${
                                                        tempDate.year === year
                                                            ? 'text-white'
                                                            : isDark ? 'text-white' : 'text-black'
                                                    }`}
                                                >
                                                    {year}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>

                            <View className="flex-row justify-around">
                                <TouchableOpacity onPress={closeModal}>
                                    <Text className="font-bold text-base" style={{ color: colors.red }}>
                                        Otkaži
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (tempDate.month && tempDate.year) {
                                            closeModal();
                                            setSelectedDate(tempDate);
                                            onApply(undefined, tempDate);
                                        }
                                    }}
                                    disabled={!(tempDate.month && tempDate.year)}
                                >
                                    <Text
                                        className={`font-bold text-base ${
                                            tempDate.month && tempDate.year
                                                ? isDark
                                                    ? 'text-white'
                                                    : 'text-black'
                                                : 'text-gray-700'
                                        }`}
                                    >
                                        Primeni
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
};

export default CustomFilterModal;