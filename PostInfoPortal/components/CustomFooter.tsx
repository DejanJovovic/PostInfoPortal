import React, {useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import icons from '@/constants/icons';
import { router, useFocusEffect, usePathname } from 'expo-router';
import {getUnreadCount, inboxSubscribe} from '@/types/notificationInbox';

const navItems = [
    { key: 'home', label: 'Naslovna', icon: icons.home },
    { key: 'notifications', label: 'Najnovije', icon: icons.bell },
    { key: 'favorites', label: 'Moje kategorije', icon: icons.add },
    { key: 'categories', label: 'Sve kategorije', icon: icons.allCategories },
    { key: 'search', label: 'Pretraga', icon: icons.search },
];

type CustomFooterProps = {
    onSearchPress?: () => void;
};

const CustomFooter: React.FC<CustomFooterProps> = ({ onSearchPress }) => {
    const pathname = usePathname();
    const [unread, setUnread] = useState<number>(0);

    // Load unread count on focus + subscribe to inbox changes
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

    const handlePress = (key: string) => {
        if (key === active) return;

        switch (key) {
            case 'home':
                router.push('/');
                break;
            case 'notifications':
                router.push('/notifications');
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
                    backgroundColor: '#FA0A0F',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{text}</Text>
            </View>
        );
    };

    return (
        <View className="absolute bottom-0 w-full mb-5 bg-[#201F5B] rounded-3xl flex-row justify-between items-center px-2 py-3 z-50">
            {navItems.map((item) => {
                const isActive = active === item.key;
                const tintColor = isActive ? '#FA0A0F' : '#FFFFFF';

                const iconWithBadge =
                    item.key === 'notifications' ? (
                        <View style={{ position: 'relative' }}>
                            <Image source={item.icon} style={{ width: 24, height: 24, tintColor }} />
                            {renderCount(unread)}
                        </View>
                    ) : (
                        <Image source={item.icon} style={{ width: 24, height: 24, tintColor }} />
                    );

                return (
                    <TouchableOpacity
                        key={item.key}
                        onPress={() => handlePress(item.key)}
                        className="flex-1 items-center"
                    >
                        {iconWithBadge}
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