import {
    View,
    Image,
    TouchableOpacity,
    Animated,
    Dimensions,
    Text,
    FlatList,
    TextInput, ScrollView,
} from 'react-native';
import React, {useRef, useState} from 'react';
import {usePathname, useRouter} from 'expo-router';
import images from '@/constants/images';
import icons from '@/constants/icons';
import colors from "@/constants/colors";

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

type CustomHeaderProps = {
    onMenuToggle?: (visible: boolean) => void;
};

const CustomHeader: React.FC<CustomHeaderProps> = ({onMenuToggle}) => {
    const router = useRouter();
    const pathname = usePathname();
    const isRoot = pathname === '/';

    const spinAnim = useRef(new Animated.Value(0)).current;

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const [menuVisible, setMenuVisible] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>('Naslovna');
    const slideAnim = useRef(new Animated.Value(-Dimensions.get('window').width * 0.8)).current;

    const openMenu = () => {
        setMenuVisible(true);
        onMenuToggle?.(true);
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: false,
        }).start();
    };

    const spinAndClose = () => {
        Animated.timing(spinAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            spinAnim.setValue(0);
            closeMenu();
        });
    };

    const closeMenu = () => {
        Animated.timing(slideAnim, {
            toValue: -Dimensions.get('window').width * 0.8,
            duration: 250,
            useNativeDriver: false,
        }).start(() => {
            setMenuVisible(false);
            onMenuToggle?.(false);
        });
    };

    const renderCategory = ({item}: { item: string }) => {
        const isActive = item === activeCategory;

        return (
            <TouchableOpacity
                key={item}
                onPress={() => setActiveCategory(item)}
                className="px-4 py-3"
            >
                <Text
                    className={`text-base font-bold ${
                        isActive ? 'text-[#FA0A0F]' : 'text-white'
                    }`}
                >
                    {item}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View className="w-full h-[90px] relative">
            <Image
                source={images.header}
                className="w-full h-full"
                resizeMode="cover"
            />

            {/* Now the center part is only clickable*/}
            <TouchableOpacity
                onPress={() => router.replace('/')}
                className="absolute top-0 bottom-0 left-1/3 right-1/3 z-10"
            >
                {/* Optional-  a transparent view that fills the area */}
                <View className="w-full h-full"/>
            </TouchableOpacity>

            {!isRoot && (
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute left-4 top-11 -translate-y-1/2 z-10"
                >
                    <Image
                        source={icons.backArrow}
                        className="w-5 h-5"
                        tintColor="white"
                        resizeMode="contain"
                    />
                </TouchableOpacity>
            )}

            <TouchableOpacity
                onPress={openMenu}
                className="absolute right-4 top-11 -translate-y-1/2 z-10"
            >
                <Image
                    source={icons.menu}
                    className="w-6 h-6"
                    tintColor="white"
                    resizeMode="contain"
                />
            </TouchableOpacity>

            {/* Slide-In Drawer Menu */}
            {menuVisible && (
                <View className="absolute top-0 left-0 w-full h-screen flex-row z-50">
                    {/* Animated Black Panel (80%) */}
                    <Animated.View
                        style={{
                            width: '80%',
                            height: '100%',
                            backgroundColor: colors.black,
                            transform: [{translateX: slideAnim}],
                        }}
                    >
                        {/* Search Bar */}
                        <View className="flex-row items-center bg-[#1a1a1a] px-4 py-3 mt-10 mx-2 rounded-2xl">
                            <TextInput
                                placeholder="Pretraga..."
                                placeholderTextColor="#999"
                                className="flex-1 text-white text-sm"
                            />
                            <Image source={icons.search} className="w-4 h-4 ml-2" tintColor="#999"/>
                        </View>

                        {/* separates search and categories*/}
                        <View className="h-[1px] bg-gray-700 mt-5 mb-5"/>

                        {/* scrollable categories */}
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 40 }}
                        >
                            {/* mapping over available categories */}
                            {categories.map((item) => renderCategory({ item }))}

                            {/* Social Icons */}
                            <View className="flex-row justify-around items-center mt-10">
                                {[icons.facebook, icons.twitter, icons.youtube, icons.instagram, icons.linkedin, icons.tiktok, icons.wifi].map(
                                    (icon, index) => (
                                        <TouchableOpacity key={index} onPress={() => {}}>
                                            <Image source={icon} className="w-5 h-5" tintColor="white" />
                                        </TouchableOpacity>
                                    )
                                )}
                            </View>

                            <View className="mt-10 px-4 pb-10">
                                <Text className="text-white text-xs flex-wrap leading-5">
                                    © 2022{' '}
                                    <Text
                                        className="underline text-white"
                                        onPress={() => console.log('PostInfo pressed')}
                                    >
                                        POSTINFO
                                    </Text>{' '}
                                    - Sva prava zadržava{' '}
                                    <Text
                                        className="underline text-white"
                                        onPress={() => console.log('Digital Thinking pressed')}
                                    >
                                        Digital Thinking d.o.o.
                                    </Text>
                                </Text>
                            </View>
                        </ScrollView>
                    </Animated.View>

                    {/* Gray Overlay (20%) */}
                    <TouchableOpacity
                        className="flex-1 bg-gray-200 opacity-80"
                        activeOpacity={1}
                        onPress={spinAndClose}
                    >
                        {/* Close (X) Icon */}
                        <Animated.View
                            style={{
                                transform: [{rotate: spin}],
                                position: 'absolute',
                                top: 40,
                                right: 24,
                            }}
                        >
                            <Image source={icons.close} className="w-5 h-5" tintColor="black"/>
                        </Animated.View>
                    </TouchableOpacity>
                </View>
            )}

        </View>
    );
};

export default CustomHeader;
