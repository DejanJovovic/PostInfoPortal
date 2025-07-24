import {View, Text, ScrollView, TouchableOpacity} from 'react-native';
import React, {useState} from 'react';

const categories = [
    "Naslovna",
    "Danas",
    "Politika",
    "Energetika",
    "Privreda",
    "Bezbednost",
    "Ekonomija",
    "Društvo",
    "Obrazovanje",
    "Tehnologija",
    "Turizam",
    "Zdravstvo",
    "Sport",
    "Kultura",
    "Događaji",
    "Lokal",
    "Region",
    "Planeta",
    "Latin | Ćirilica",
];

const CustomMenuCategories = () => {
    const [active, setActive] = useState("Naslovna");

    return (
        <View className="h-[60px] w-full bg-white">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{paddingHorizontal: 16, alignItems: 'center'}}
                className="flex-row"
            >
                {categories.map((category) => (
                    <TouchableOpacity
                        key={category}
                        onPress={() => setActive(category)}
                        className="mr-4"
                    >
                        <Text className={`uppercase font-bold ${active === category ? ' text-[#FA0A0F]' : 'text-black'}`}>
                            {category}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

export default CustomMenuCategories;