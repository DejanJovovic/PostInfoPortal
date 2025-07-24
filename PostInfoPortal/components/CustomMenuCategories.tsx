import React from 'react';
import { View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { menuData } from '@/types/menuData';

type Props = {
    onSelectCategory: (categoryName: string) => void;
    activeCategory: string;
};

const CustomMenuCategories: React.FC<Props> = ({ onSelectCategory, activeCategory }) => {
    const categories = menuData
        .map((item) => (typeof item === 'string' ? item : item.title))
        .filter((category) => category !== 'Latin | Ćirilica');
    // Latin | Ćirilica is left out because it doenst contain any posts, as it should only change text (will be implemented later)

    return (
        <View className="h-[60px] w-full bg-white">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
                className="flex-row"
            >
                {categories.map((category) => (
                    <TouchableOpacity
                        key={category}
                        onPress={() => onSelectCategory(category)}
                        className="mr-4"
                    >
                        <Text
                            className={`uppercase font-bold ${
                                activeCategory === category ? 'text-[#FA0A0F]' : 'text-black'
                            }`}
                        >
                            {category}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

export default CustomMenuCategories;