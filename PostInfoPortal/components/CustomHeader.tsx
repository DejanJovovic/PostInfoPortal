import {
    View,
    Image,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {usePathname, useRouter} from 'expo-router';
import images from '@/constants/images';
import icons from '@/constants/icons';
import colors from '@/constants/colors';
import MenuDrawer from './MenuDrawer';
import CustomSearchBar from "@/components/CustomSearchBar";

type CustomHeaderProps = {
    onMenuToggle?: (visible: boolean) => void;
    onCategorySelected?: (category: string) => void;
    activeCategory: string;
    onSearchQuery?: (query: string) => void;
    triggerSearchOpen?: boolean;
    showMenu?: boolean;
    onBackPress?: () => void;
    loadingNav?: boolean;
};

const CustomHeader: React.FC<CustomHeaderProps> = ({
                                                       onMenuToggle,
                                                       onCategorySelected,
                                                       activeCategory,
                                                       onSearchQuery,
                                                       triggerSearchOpen,
                                                       showMenu,
                                                       onBackPress,
                                                       loadingNav = false,
                                                   }) => {
    const router = useRouter();
    const pathname = usePathname();
    const isRoot = pathname === '/';

    const spinAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-Dimensions.get('window').width * 0.8)).current;

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const [menuVisible, setMenuVisible] = useState(false);

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

    useEffect(() => {
        if (triggerSearchOpen && !menuVisible) {
            openMenu();
        }
    }, [triggerSearchOpen]);

    return (
        <View className="w-full h-[90px] relative">
            <Image
                source={images.header}
                className="w-full h-full"
                resizeMode="cover"
            />

            {/* only center area is clickable */}
            <TouchableOpacity
                onPress={() => router.replace('/')}
                className="absolute top-0 bottom-0 left-1/3 right-1/3 z-10"
                activeOpacity={0.8}
            >
                <View className="w-full h-full"/>
            </TouchableOpacity>

            {/* Back arrow only works when not on root screen */}
            {!isRoot && (
                <TouchableOpacity
                    onPress={onBackPress ?? (() => router.back())}
                    disabled={loadingNav}
                    className="absolute left-4 top-11 -translate-y-1/2 z-10"
                    activeOpacity={0.8}
                    style={{opacity: loadingNav ? 0.5 : 1}}
                    hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
                >
                    <Image
                        source={icons.backArrow}
                        className="w-5 h-5"
                        tintColor="white"
                        resizeMode="contain"
                    />
                </TouchableOpacity>
            )}

            {showMenu !== false && (
                <TouchableOpacity onPress={openMenu} className="absolute right-4 top-11 -translate-y-1/2 z-10"
                                  activeOpacity={0.8}
                                  hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}>
                    <Image
                        source={icons.menu}
                        className="w-6 h-6"
                        tintColor="white"
                        resizeMode="contain"
                    />
                </TouchableOpacity>
            )}

            {/* Slide-In Drawer */}
            {menuVisible && showMenu !== false && (
                <View className="absolute top-0 left-0 w-full h-screen flex-row z-50">
                    {/* Left Drawer Panel */}
                    <Animated.View
                        style={{
                            width: '80%',
                            height: '100%',
                            backgroundColor: colors.black,
                            transform: [{translateX: slideAnim}],
                        }}
                    >
                        {/* Search Bar */}
                        <CustomSearchBar
                            onSearch={(query: string) => {
                                if (onCategorySelected) onCategorySelected('');
                                onSearchQuery?.(query);
                                closeMenu();
                            }}
                            autoFocus={triggerSearchOpen}
                        />

                        <View className="h-[1px] bg-gray-700 mt-4 mb-2 mx-2"/>
                        <MenuDrawer
                            onCategorySelect={(category) => {
                                onCategorySelected?.(category);
                                closeMenu();
                            }}
                            activeCategory={activeCategory}
                        />
                    </Animated.View>

                    {/* Right Overlay Backdrop */}
                    <TouchableOpacity
                        className="flex-1 bg-gray-200 opacity-80"
                        activeOpacity={1}
                        onPress={spinAndClose}
                    >
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