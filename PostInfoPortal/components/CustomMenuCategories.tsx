import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';

const categories = [
  "Naslovna",
  "Politika",
  "Ekonomija",
  "Društvo",
  "Sport",
  "Lokal",
  "Region",
  "Planeta",
];

const CustomMenuCategories = () => {
  const [active, setActive] = useState("Naslovna");

  return (
    <View className="h-[60px] w-full bg-white">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
        className="flex-row"
  >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            onPress={() => setActive(category)}
            className="mr-4"
          >
            <Text className={`${active === category ? 'font-bold text-[#FA0A0F]' : 'text-black'}`}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default CustomMenuCategories;