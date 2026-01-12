import React, {useCallback, useEffect, useRef, useState} from 'react';
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
    StyleSheet, Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useRouter, useNavigation} from 'expo-router';
import CustomHeader from '@/components/CustomHeader';
import CustomFooter from '@/components/CustomFooter';
import CustomSearchBar from '@/components/CustomSearchBar';
import {useTheme} from '@/components/ThemeContext';
import {
    getInbox,
    clearInbox,
    markRead,
    type InboxItem,
} from '@/types/notificationInbox';
import icons from '@/constants/icons';
import colors from "@/constants/colors";
import {pickRandomAd} from "@/constants/ads";
import CustomBanner from "@/components/CustomBanner";

const Notifications = () => {
    const router = useRouter();
    const navigation = useNavigation();
    const {theme} = useTheme();
    const isDark = theme === 'dark';

    const [items, setItems] = useState<InboxItem[] | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [triggerSearchOpen, setTriggerSearchOpen] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    const load = async () => {
        try {
            const data = await getInbox();
            const sorted = [...data].sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0));
            setItems(sorted);
        } catch (e) {
            console.error('Greška pri čitanju inbox-a:', e);
            setItems([]);
        }
    };

    const [bottomAdVisible, setBottomAdVisible] = useState(false);
    const [bottomAd, setBottomAd] = useState(() => pickRandomAd());

    const adTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearAdTimer = () => {
        if (adTimerRef.current) {
            clearTimeout(adTimerRef.current);
            adTimerRef.current = null;
        }
    };

    const scheduleAd = (ms: number) => {
        clearAdTimer();
        adTimerRef.current = setTimeout(() => {
            setBottomAd(pickRandomAd());
            setBottomAdVisible(true);
        }, ms);
    };

    const dismissBottomAd = () => {
        setBottomAdVisible(false);
        scheduleAd(10000);
    };

    useFocusEffect(
        useCallback(() => {
            load();
        }, [])
    );

    useEffect(() => {
        scheduleAd(5000);
        return () => clearAdTimer();
    }, []);

    useEffect(() => {
        const unsub = navigation.addListener('blur', () => setIsLoading(false));
        return unsub;
    }, [navigation]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
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
                [{text: 'U redu'}]
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
                {text: 'Ne', style: 'cancel'},
                {
                    text: 'Da',
                    style: 'destructive',
                    onPress: async () => {
                        await clearInbox();
                        await load();
                    },
                },
            ],
            {cancelable: true}
        );
    };

    const highlightSearchTerm = (text?: string, term?: string) => {
        const safe = text ?? '';
        const t = term ?? '';
        if (!t.trim()) {
            return (
                <Text
                    style={{
                        color: isDark ? colors.grey : colors.black,
                        fontFamily: 'Roboto-Bold'
                    }}
                    numberOfLines={2}
                >
                    {safe}
                </Text>
            );
        }
        const parts = safe.split(new RegExp(`(${t})`, 'gi'));
        return (
            <Text
                style={{
                    color: isDark ? colors.grey : colors.black,
                    fontFamily: 'Roboto-Bold'
                }}
                numberOfLines={2}
            >
                {parts.map((part, i) => (
                    <Text
                        key={i}
                        className={part.toLowerCase() === t.toLowerCase() ? 'text-[#FA0A0F]' : ''}
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

    const handleBackWithLoading = () => {
        if (isLoading) return;
        setIsLoading(true);
        requestAnimationFrame(() => {
            router.back();
        });
    };

    const onOpenItem = async (item: InboxItem) => {
        if (item.postId) {
            try {
                await markRead?.(item.oneSignalId);
            } catch {
            }
            setItems((prev) =>
                (prev ?? []).map((i) => (i.oneSignalId === item.oneSignalId ? {...i, read: true} : i))
            );

            if (isLoading) return;
            setIsLoading(true);
            requestAnimationFrame(() => {
                router.push({
                    pathname: '/post-details',
                    params: {
                        postId: String(item.postId),
                        ...(item as any).categoryName ? {category: (item as any).categoryName} : {},
                    },
                });
            });
            return;
        }

        if (item.deepLinkUrl) {
            try {
                await markRead?.(item.oneSignalId);
            } catch {
            }
            setItems((prev) =>
                (prev ?? []).map((i) => (i.oneSignalId === item.oneSignalId ? {...i, read: true} : i))
            );
            await Linking.openURL(item.deepLinkUrl);
            return;
        }

        Alert.alert('Nije moguće otvoriti', 'Ovo obaveštenje nema ID objave ili link.');
    };

    const renderItem = ({item}: { item: InboxItem }) => (
        <TouchableOpacity
            onPress={() => onOpenItem(item)}
            disabled={isLoading}
            className="px-4 py-3 border-b"
            style={{
                backgroundColor: isDark ? colors.black : colors.grey,
                borderColor: isDark ? '#525050' : '#e5e7eb',
                overflow: 'hidden',
                ...(Platform.OS === 'ios'
                    ? {
                        shadowColor: 'transparent',
                        shadowOpacity: 0,
                        shadowRadius: 0,
                        shadowOffset: { width: 0, height: 0 },
                    }
                    : {
                        elevation: 0,
                    }),
            }}
        >
            <View className="flex-row items-start">
                <View
                    className="w-2 h-2 mt-1 rounded-full mr-3"
                    style={{backgroundColor: item.read ? 'transparent' : colors.red}}
                />
                <View className="flex-1">
                    {isSearchActive
                        ? highlightSearchTerm(item.title || 'Nova objava', searchQuery)
                        : (
                            <Text
                                style={{
                                    color: isDark ? colors.grey : colors.black,
                                    fontFamily: 'Roboto-Bold'
                                }}
                                numberOfLines={2}
                            >
                                {item.title || 'Nova objava'}
                            </Text>
                        )
                    }

                    {!!item.message && (
                        <Text
                            className="text-sm mt-1"
                            numberOfLines={2}
                            style={{
                                color: colors.grey,
                                fontFamily: 'Roboto-Bold'
                            }}
                        >
                            {isSearchActive ? (
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
                        style={{
                            color: isDark ? colors.grey : colors.black,
                            fontFamily: 'Roboto-Regular'
                        }}
                    >
                        {new Date(item.receivedAt).toLocaleString('sr-RS')}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const HeaderBar = () => {
        const canClear = (items?.length ?? 0) > 0;

        return (
            <View
                className="flex-row items-center justify-between px-4 py-3 border-b"
                style={{
                    backgroundColor: isDark ? colors.black : colors.grey,
                    borderColor: isDark ? '#525050' : '#e5e7eb',
                }}
            >
                <Text
                    className="text-lg"
                    style={{ color: isDark ? colors.grey : colors.black, fontFamily: 'YesevaOne-Regular' }}
                >
                    Obaveštenja
                </Text>

                {canClear && (
                    <TouchableOpacity
                        onPress={confirmClearAll}
                        className="py-1 pl-3"
                        disabled={isLoading}
                    >
                        <Image
                            source={icons.close}
                            style={{ width: 20, height: 20, opacity: isLoading ? 0.5 : 1 }}
                            tintColor={colors.red}
                        />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const filtered = getFilteredItems();

    return (
        <SafeAreaView
            className="flex-1"
            style={{backgroundColor: isDark ? colors.black : colors.grey}}
        >
            <CustomHeader
                onMenuToggle={() => {
                }}
                onCategorySelected={() => {
                }}
                activeCategory="Naslovna"
                showMenu={false}
                triggerSearchOpen={triggerSearchOpen}
                onSearchQuery={setSearchQuery}
                onBackPress={handleBackWithLoading}
                loadingNav={isLoading}
            />

            {/* Search header area */}
            {isSearchActive && (
                <View className="px-2 py-4">
                    <View className="flex-row items-center justify-between px-2 mt-2">
                        <Text
                            className="mt-2 px-4"
                            style={{
                                color: isDark ? colors.grey : colors.black,
                                fontFamily: 'Roboto-Medium',
                            }}
                        >
                            {searchQuery.trim().length > 0 ? (
                                <>
                                    Rezultati pretrage{" "}
                                    <Text
                                        style={{
                                            color: colors.red,
                                            fontFamily: "Roboto-Bold",
                                        }}
                                    >
                                        &#34;{searchQuery}&#34;
                                    </Text>
                                </>
                            ) : (
                                "Unesite željenu reč za pretragu ispod"
                            )}
                        </Text>

                        {searchQuery.trim().length > 0 && (
                            <Text
                                onPress={() => {
                                    setSearchQuery('');
                                    setIsSearchActive(false);
                                    setTriggerSearchOpen(false);
                                }}
                                className="ml-3"
                                style={{color: colors.red}}
                            >
                                ✕
                            </Text>
                        )}
                    </View>

                    <CustomSearchBar
                        key={searchQuery}
                        query={searchQuery}
                        onSearch={setSearchQuery}
                        onReset={() => {
                            setSearchQuery('');
                            setIsSearchActive(false);
                            setTriggerSearchOpen(false);
                        }}
                        backgroundColor={colors.blue}
                    />
                </View>
            )}

            <HeaderBar/>

            {items === null ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={isDark ? colors.grey : colors.black}/>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(i, idx) => i.oneSignalId || i.id || String(idx)}
                    renderItem={renderItem}
                    contentContainerStyle={{paddingBottom: 100}}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center mt-12">
                            <Text style={{
                                color: isDark ? colors.grey : colors.black,
                                fontFamily: 'Roboto-Medium'
                            }}>
                                {isSearchActive && searchQuery.trim().length > 0
                                    ? 'Nema rezultata za prikaz.'
                                    : 'Nema obaveštenja'}
                            </Text>
                        </View>
                    }
                    scrollEnabled={!isLoading}
                />
            )}
            {isLoading && (
                <View
                    style={[
                        StyleSheet.absoluteFillObject,
                        {
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.7)',
                            zIndex: 9999,
                            elevation: 9999,
                        },
                    ]}
                    pointerEvents="auto"
                >
                    <ActivityIndicator size="large" color={isDark ? colors.grey : colors.black}/>
                    <Text
                        style={{
                            marginTop: 10,
                            fontFamily: 'Roboto-SemiBold',
                            color: isDark ? colors.grey : colors.black,
                            textAlign: 'center',
                        }}
                    >
                        Učitavanje...
                    </Text>
                </View>
            )}

            <CustomFooter onSearchPress={handleFooterSearch}/>

            {bottomAdVisible && (
                <View
                    pointerEvents="box-none"
                    style={[
                        StyleSheet.absoluteFillObject,
                        { justifyContent: 'flex-end', alignItems: 'center' },
                    ]}
                >
                    <View style={{ width: '100%', paddingHorizontal: 8, marginBottom: 84}}>
                        <CustomBanner
                            url={bottomAd.url}
                            imageSrc={bottomAd.imageSrc}
                            onClose={dismissBottomAd}
                        />
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

export default Notifications;