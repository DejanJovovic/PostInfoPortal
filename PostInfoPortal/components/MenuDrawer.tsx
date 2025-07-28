import React from 'react';
import {ScrollView, View, Text, TouchableOpacity, Image, Switch} from 'react-native';
import { menuData } from '@/types/menuData';
import MenuCategoryItem from './MenuCategoryItem';
import icons from '@/constants/icons';
import { Feather } from '@expo/vector-icons';
import {useTheme} from "@/components/ThemeContext";

type MenuDrawerProps = {
    onCategorySelect: (categoryName: string) => void;
    activeCategory: string;
};

const MenuDrawer: React.FC<MenuDrawerProps> = ({ onCategorySelect, activeCategory }) => {
    const { theme, toggleTheme } = useTheme();

    const isDarkMode = theme === 'dark';

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
                    onPress={onCategorySelect}
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

            <View className="flex-row items-center justify-between px-4 mt-6">
                <View className="flex-row items-center gap-2">
                    <Feather name="sun" size={20} color={isDarkMode ? '#aaa' : '#333'} />
                    <Switch
                        value={isDarkMode}
                        onValueChange={toggleTheme}
                        trackColor={{ false: '#ccc', true: '#666' }}
                        thumbColor={isDarkMode ? '#fff' : '#000'}
                    />
                    <Feather name="moon" size={20} color={isDarkMode ? '#fff' : '#888'} />
                </View>
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