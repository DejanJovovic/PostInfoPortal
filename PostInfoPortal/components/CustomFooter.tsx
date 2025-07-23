import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import icons from '@/constants/icons';

const navItems = [
    { key: 'home', label: 'Naslovna', icon: icons.home },
    { key: 'bell', label: 'Najnovije', icon: icons.bell },
    { key: 'add', label: 'Moje kategorije', icon: icons.add },
    { key: 'all', label: 'Sve kategorije', icon: icons.allCategories },
    { key: 'search', label: 'Pretraga', icon: icons.search },
];

const CustomFooter = () => {
    const [active, setActive] = useState('home');

    return (
        <View className="absolute bottom-0 w-full mb-5 bg-[#201F5B] rounded-3xl flex-row justify-between items-center px-2 py-3 z-50">
            {navItems.map((item) => {
                const isActive = active === item.key;
                const tintColor = isActive ? '#FA0A0F' : '#FFFFFF';

                return (
                    <TouchableOpacity
                        key={item.key}
                        onPress={() => setActive(item.key)}
                        className="flex-1 items-center"
                    >
                        <Image
                            source={item.icon}
                            style={{ width: 24, height: 24, tintColor }}
                        />
                        <Text style={{ color: tintColor}}
                        className="text-[8px] mt-1">{item.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export default CustomFooter;