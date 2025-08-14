import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Image,
    Alert,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import CustomHeader from '@/components/CustomHeader';
import CustomFooter from '@/components/CustomFooter';
import CustomSearchBar from '@/components/CustomSearchBar';
import { useTheme } from '@/components/ThemeContext';
import {
    getInbox,
    clearInbox,
    markRead,
    type InboxItem,
} from '@/types/notificationInbox';
import icons from '@/constants/icons';

const Notifications = () => {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [items, setItems] = useState<InboxItem[] | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [triggerSearchOpen, setTriggerSearchOpen] = useState(false);

    const load = async () => {
        try {
            const data = await getInbox();
            // newest first (optional, helps search UX)
            const sorted = [...data].sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0));
            setItems(sorted);
        } catch (e) {
            console.error('Greška pri čitanju inbox-a:', e);
            setItems([]);
        }
    };

    useFocusEffect(
        useCallback(() => {
            load();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // reset search on pull-to-refresh
        setSearchQuery('');
        setIsSearchActive(false);
        setTriggerSearchOpen(false);
        await load();
        setRefreshing(false);
    }, []);

    const handleFooterSearch = () => {
        const count = (items ?? []).length;
        if (count === 0) {
            Alert.alert(
                'Nema obaveštenja',
                'Za pretragu je potrebno da postoji bar jedno obaveštenje.',
                [{ text: 'U redu' }]
            );
            return;
        }
        setSearchQuery('');
        setIsSearchActive(true);
        setTriggerSearchOpen(true);
    };

    const confirmClearAll = () => {
        Alert.alert(
            'Brisanje obaveštenja',
            'Da li ste sigurni da želite da obrišete sva obaveštenja?',
            [
                { text: 'Ne', style: 'cancel' },
                {
                    text: 'Da',
                    style: 'destructive',
                    onPress: async () => {
                        await clearInbox();
                        await load();
                    },
                },
            ],
            { cancelable: true }
        );
    };

    const highlightSearchTerm = (text?: string, term?: string) => {
        const safe = text ?? '';
        const t = term ?? '';
        if (!t.trim()) {
            return (
                <Text
                    className="text-base font-semibold"
                    style={{ color: isDark ? '#fff' : '#000' }}
                    numberOfLines={2}
                >
                    {safe}
                </Text>
            );
        }
        const parts = safe.split(new RegExp(`(${t})`, 'gi'));
        return (
            <Text
                className="text-base font-semibold"
                style={{ color: isDark ? '#fff' : '#000' }}
                numberOfLines={2}
            >
                {parts.map((part, i) => (
                    <Text
                        key={i}
                        className={part.toLowerCase() === t.toLowerCase() ? 'font-bold text-[#FA0A0F]' : ''}
                    >
                        {part}
                    </Text>
                ))}
            </Text>
        );
    };

    // Filter notifications by title OR message
    const getFilteredItems = (): InboxItem[] => {
        if (!searchQuery.trim()) return items ?? [];
        const q = searchQuery.toLowerCase();
        return (items ?? []).filter((i) => {
            const title = (i.title ?? '').toLowerCase();
            const body = (i.message ?? '').toLowerCase();
            return title.includes(q) || body.includes(q);
        });
    };

    const onOpenItem = async (item: InboxItem) => {
        if (item.postId) {
            try {
                await markRead?.(item.oneSignalId);
            } catch {}
            setItems((prev) =>
                (prev ?? []).map((i) => (i.oneSignalId === item.oneSignalId ? { ...i, read: true } : i))
            );
            router.push({
                pathname: '/post-details',
                params: {
                    postId: String(item.postId),
                    ...(item as any).categoryName ? { category: (item as any).categoryName } : {},
                },
            });
            return;
        }

        if (item.deepLinkUrl) {
            try {
                await markRead?.(item.oneSignalId);
            } catch {}
            setItems((prev) =>
                (prev ?? []).map((i) => (i.oneSignalId === item.oneSignalId ? { ...i, read: true } : i))
            );
            await Linking.openURL(item.deepLinkUrl);
            return;
        }

        Alert.alert('Nije moguće otvoriti', 'Ovo obaveštenje nema ID objave ili link.');
    };

    const renderItem = ({ item }: { item: InboxItem }) => (
        <TouchableOpacity
            onPress={() => onOpenItem(item)}
            className="px-4 py-3 border-b"
            style={{
                borderColor: isDark ? '#333' : '#e5e7eb',
                backgroundColor: isDark ? '#000' : '#fff',
            }}
        >
            <View className="flex-row items-start">
                <View
                    className="w-2 h-2 mt-1 rounded-full mr-3"
                    style={{ backgroundColor: item.read ? 'transparent' : '#FA0A0F' }}
                />
                <View className="flex-1">
                    {/* Title with highlight when searching */}
                    {isSearchActive
                        ? highlightSearchTerm(item.title || 'Nova objava', searchQuery)
                        : (
                            <Text
                                className="text-base font-semibold"
                                numberOfLines={2}
                                style={{ color: isDark ? '#fff' : '#000' }}
                            >
                                {item.title || 'Nova objava'}
                            </Text>
                        )
                    }

                    {!!item.message && (
                        <Text
                            className="text-sm mt-1"
                            numberOfLines={2}
                            style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                        >
                            {isSearchActive ? (
                                // lightweight highlight for body too
                                <Text>
                                    {item.message.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) => (
                                        <Text
                                            key={i}
                                            className={part.toLowerCase() === searchQuery.toLowerCase() ? 'font-bold text-[#FA0A0F]' : ''}
                                        >
                                            {part}
                                        </Text>
                                    ))}
                                </Text>
                            ) : (
                                item.message
                            )}
                        </Text>
                    )}

                    <Text
                        className="text-[11px] mt-2"
                        style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
                    >
                        {new Date(item.receivedAt).toLocaleString('sr-RS')}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const HeaderBar = () => (
        <View
            className="flex-row items-center justify-between px-4 py-3 border-b"
            style={{
                borderColor: isDark ? '#333' : '#e5e7eb',
                backgroundColor: isDark ? '#000' : '#fff',
            }}
        >
            <Text className="text-lg font-bold" style={{ color: isDark ? '#fff' : '#000' }}>
                Obaveštenja
            </Text>

            <TouchableOpacity onPress={confirmClearAll} className="py-1 pl-3">
                <Image source={icons.close} style={{ width: 20, height: 20 }} tintColor={'#FA0A0F'} />
            </TouchableOpacity>
        </View>
    );

    const filtered = getFilteredItems();

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: isDark ? '#000000' : 'white' }}
        >
            <CustomHeader
                onMenuToggle={() => {}}
                onCategorySelected={() => {}}
                activeCategory="Naslovna"
                showMenu={false}
                triggerSearchOpen={triggerSearchOpen}
                onSearchQuery={setSearchQuery}
            />

            {/* Search header area */}
            {isSearchActive && (
                <View className="px-2 py-4">
                    <View className="flex-row items-center justify-between px-2 mt-2">
                        <Text className="text-base font-bold flex-1" style={{ color: isDark ? '#F9F9F9' : '#1f2937' }}>
                            {searchQuery.trim().length > 0
                                ? `Rezultati pretrage "${searchQuery}"`
                                : 'Unesite željenu reč za pretragu ispod'}
                        </Text>

                        {searchQuery.trim().length > 0 && (
                            <Text
                                onPress={() => {
                                    setSearchQuery('');
                                    setIsSearchActive(false);
                                    setTriggerSearchOpen(false);
                                }}
                                className="ml-3 text-lg font-bold"
                                style={{ color: '#FA0A0F' }}
                            >
                                ✕
                            </Text>
                        )}
                    </View>

                    <CustomSearchBar
                        key={searchQuery} // to reset input on clear
                        query={searchQuery}
                        onSearch={setSearchQuery}
                        onReset={() => {
                            setSearchQuery('');
                            setIsSearchActive(false);
                            setTriggerSearchOpen(false);
                        }}
                        backgroundColor="#201F5B"
                    />
                </View>
            )}

            <HeaderBar />

            {items === null ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={isDark ? '#fff' : '#201F5B'} />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(i, idx) => i.oneSignalId || i.id || String(idx)}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center mt-12">
                            <Text style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                                {isSearchActive && searchQuery.trim().length > 0
                                    ? 'Nema rezultata za prikaz.'
                                    : 'Nema obaveštenja'}
                            </Text>
                        </View>
                    }
                />
            )}

            <CustomFooter onSearchPress={handleFooterSearch} />
        </SafeAreaView>
    );
};

export default Notifications;