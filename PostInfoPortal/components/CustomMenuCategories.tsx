import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import { menuData } from '@/types/menuData';

const CustomMenuCategories = () => {
    const [active, setActive] = useState("Naslovna");

    const categories = menuData.map((item) =>
        typeof item === 'string' ? item : item.title
    );

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
                        onPress={() => setActive(category)}
                        className="mr-4"
                    >
                        <Text
                            className={`uppercase font-bold ${
                                active === category ? ' text-[#FA0A0F]' : 'text-black'
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