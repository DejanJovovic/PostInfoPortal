import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import icons from '@/constants/icons';
import { router, usePathname } from 'expo-router';

const navItems = [
    { key: 'home', label: 'Naslovna', icon: icons.home },
    { key: 'new', label: 'Najnovije', icon: icons.bell },
    { key: 'favorites', label: 'Moje kategorije', icon: icons.add },
    { key: 'categories', label: 'Sve kategorije', icon: icons.allCategories },
    { key: 'search', label: 'Pretraga', icon: icons.search },
];

type CustomFooterProps = {
    onSearchPress?: () => void;
};

const CustomFooter: React.FC<CustomFooterProps> = ({ onSearchPress }) => {
    const pathname = usePathname();

    const active = useMemo(() => {
        if (pathname === '/') return 'home';
        if (pathname === '/favorites') return 'favorites';
        if (pathname === '/search') return 'search';
        if (pathname === '/categories') return 'categories';
        return '';
    }, [pathname]);

    const handlePress = (key: string) => {
        if (key === active) return;

        switch (key) {
            case 'home':
                router.push('/');
                break;
            case 'favorites':
                router.push('/favorites');
                break;
            case 'categories':
                router.push('/categories');
                break;
            case 'search':
                if (onSearchPress) onSearchPress();
                break;
        }
    };

    return (
        <View className="absolute bottom-0 w-full mb-5 bg-[#201F5B] rounded-3xl flex-row justify-between items-center px-2 py-3 z-50">
            {navItems.map((item) => {
                const isActive = active === item.key;
                const tintColor = isActive ? '#FA0A0F' : '#FFFFFF';

                return (
                    <TouchableOpacity
                        key={item.key}
                        onPress={() => handlePress(item.key)}
                        className="flex-1 items-center"
                    >
                        <Image
                            source={item.icon}
                            style={{ width: 24, height: 24, tintColor }}
                        />
                        <Text style={{ color: tintColor }} className="text-[8px] mt-1">
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export default CustomFooter;