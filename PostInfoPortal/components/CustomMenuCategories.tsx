import React, { useEffect, useRef } from 'react';
import {
    View,
    ScrollView,
    Text,
    TouchableOpacity,
    findNodeHandle,
    View as RNView, UIManager,
} from 'react-native';
import { menuData } from '@/types/menuData';
import {useTheme} from "@/components/ThemeContext";

type Props = {
    onSelectCategory: (categoryName: string) => void;
    activeCategory: string;
};

const CustomMenuCategories: React.FC<Props> = ({ onSelectCategory, activeCategory }) => {
    const categories = menuData
        .map((item) => (typeof item === 'string' ? item : item.title))
        .filter((category) => category !== 'Latin | Ćirilica');

    const scrollViewRef = useRef<ScrollView>(null);
    const categoryRefs = useRef<Record<string, RNView | null>>({});

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        const node = categoryRefs.current[activeCategory];
        const scrollNode = scrollViewRef.current;

        if (node && scrollNode) {
            const handle = findNodeHandle(node);
            const scrollHandle = findNodeHandle(scrollNode);

            if (handle && scrollHandle) {
                UIManager.measureLayout(
                    handle,
                    scrollHandle,
                    () => console.warn('Greška pri pomeranju na kategoriju.'),
                    (x: number) => {
                        scrollNode.scrollTo({ x: x - 16, animated: true });
                    }
                );
            }
        }
    }, [activeCategory]);

    return (
        <View className="h-[60px] w-full"
              style={{ backgroundColor: isDark ? '#000000' : 'white' }}>
            <ScrollView
                ref={scrollViewRef}
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
                        ref={(el: RNView | null) => {
                            categoryRefs.current[category] = el;
                        }}
                    >
                        <Text
                            className={`uppercase font-bold ${
                                activeCategory === category
                                    ? 'text-[#FA0A0F]'
                                    : isDark
                                        ? 'text-white'
                                        : 'text-black'
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