import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import icons from '@/constants/icons';
import {router, useFocusEffect, usePathname} from 'expo-router';
import {getUnreadCount, inboxSubscribe} from '@/types/notificationInbox';
import colors from "@/constants/colors";
import {useTheme} from "@/components/ThemeContext";

const navItems = [
    {key: 'home', label: 'Naslovna', icon: icons.home},
    {key: 'notifications', label: 'Najnovije', icon: icons.bell},
    {key: 'favorites', label: 'Moje kategorije', icon: icons.add},
    {key: 'categories', label: 'Sve kategorije', icon: icons.allCategories},
    {key: 'search', label: 'Pretraga', icon: icons.search},
];

type CustomFooterProps = {
    onSearchPress?: () => void;
};

// for router.push
type RouteTarget = '/' | '/notifications' | '/favorites' | '/categories';

const CustomFooter: React.FC<CustomFooterProps> = ({onSearchPress}) => {
    const pathname = usePathname();
    const [unread, setUnread] = useState<number>(0);
    const {theme} = useTheme();
    const isDark = theme === 'dark';

    const [isLoading, setIsLoading] = useState(false);

    // when the route changes, hide the loader
    useEffect(() => {
        if (isLoading) setIsLoading(false);
    }, [pathname, isLoading]);

    useFocusEffect(
        useCallback(() => {
            let mounted = true;

            const load = async () => {
                const c = await getUnreadCount();
                if (mounted) setUnread(c);
            };
            load();

            const unsub = inboxSubscribe(() => {
                getUnreadCount().then((c) => mounted && setUnread(c));
            });

            return () => {
                mounted = false;
                unsub();
            };
        }, [])
    );

    const active = useMemo(() => {
        if (pathname === '/') return 'home';
        if (pathname === '/notifications') return 'notifications';
        if (pathname === '/favorites') return 'favorites';
        if (pathname === '/search') return 'search';
        if (pathname === '/categories') return 'categories';
        return '';
    }, [pathname]);

    const navigateWithLoader = (target: RouteTarget) => {
        if (isLoading) return;
        setIsLoading(true);
        requestAnimationFrame(() => {
            router.push(target);
        });
    };

    const handlePress = (key: string) => {
        if (key === active) return;

        switch (key) {
            case 'home':
                navigateWithLoader('/');
                break;
            case 'notifications':
                navigateWithLoader('/notifications');
                break;
            case 'favorites':
                navigateWithLoader('/favorites');
                break;
            case 'categories':
                navigateWithLoader('/categories');
                break;
            case 'search':
                onSearchPress?.();
                break;
        }
    };

    const renderCount = (count: number) => {
        if (!count) return null;
        const text = count > 99 ? '99+' : String(count);
        return (
            <View
                style={{
                    position: 'absolute',
                    top: -6,
                    right: -10,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 4,
                    borderRadius: 8,
                    backgroundColor: colors.red,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Text style={{
                    color: colors.grey,
                    fontSize: 10,
                    fontWeight: '700',
                    fontFamily: 'YesevaOne-Regular'
                }}>{text}</Text>
            </View>
        );
    };

    return (
        <>
            <View
                className="absolute bottom-0 w-full mb-5 bg-[#201F5B] rounded-3xl flex-row justify-between items-center px-2 py-3 z-50">
                {navItems.map((item) => {
                    const isActive = active === item.key;
                    const tintColor = isActive ? colors.red : colors.grey;

                    const iconWithBadge =
                        item.key === 'notifications' ? (
                            <View style={{position: 'relative'}}>
                                <Image source={item.icon} style={{width: 24, height: 24, tintColor}}/>
                                {renderCount(unread)}
                            </View>
                        ) : (
                            <Image source={item.icon} style={{width: 24, height: 24, tintColor}}/>
                        );

                    return (
                        <TouchableOpacity
                            key={item.key}
                            onPress={() => handlePress(item.key)}
                            className="flex-1 items-center"
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            {iconWithBadge}
                            <Text style={{color: tintColor, fontFamily: 'YesevaOne-Regular'}}
                                  className="text-[8px] mt-1">
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            {isLoading && (
                <View
                    style={[
                        StyleSheet.absoluteFillObject,
                        {
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: 'rgba(0,0,0,0.35)',
                            zIndex: 9999,
                            elevation: 9999,
                        },
                    ]}
                    pointerEvents="auto"
                >
                    <ActivityIndicator size="large" color={isDark ? colors.grey : colors.black}/>
                    <Text style={{
                        marginTop: 10,
                        color: isDark ? colors.grey : colors.black,
                        fontWeight: '600',
                        fontFamily: 'Roboto-Regular'
                    }}>Učitavanje...</Text>
                </View>
            )}
        </>
    );
};

export default CustomFooter;