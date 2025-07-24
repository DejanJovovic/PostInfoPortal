import React, {useState} from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image } from 'react-native';
import { menuData } from '@/types/menuData';
import MenuCategoryItem from './MenuCategoryItem';
import icons from '@/constants/icons';

const MenuDrawer = () => {

    const [activeCategory, setActiveCategory] = useState('Naslovna');

    const handleCategoryPress = (title: string) => {
        setActiveCategory(title);
    };

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            className="bg-black"
        >
            {menuData.map((item) => (
                <MenuCategoryItem
                    key={typeof item === 'string' ? item : item.title}
                    item={item}
                    onPress={handleCategoryPress}
                    activeCategory={activeCategory}
                />
            ))}
            <View className="flex-row justify-around items-center mt-6 px-4">
                {[icons.facebook, icons.twitter, icons.youtube, icons.instagram, icons.linkedin, icons.tiktok, icons.wifi].map(
                    (icon, index) => (
                        <TouchableOpacity key={index} onPress={() => console.log('Social icon pressed')}>
                            <Image source={icon} className="w-5 h-5" tintColor="white" />
                        </TouchableOpacity>
                    )
                )}
            </View>

            <View className="mt-6 px-4 pb-10">
                <Text className="text-white text-xs flex-wrap leading-5">
                    © 2022{' '}
                    <Text className="underline text-white" onPress={() => console.log('PostInfo pressed')}>
                        POSTINFO
                    </Text>{' '}
                    - Sva prava zadržava{' '}
                    <Text className="underline text-white" onPress={() => console.log('Digital Thinking pressed')}>
                        Digital Thinking d.o.o.
                    </Text>
                </Text>
            </View>
        </ScrollView>
    );
};

export default MenuDrawer;
