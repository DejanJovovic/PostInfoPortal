import React, {useState, useEffect, useMemo} from 'react';
import {
    Text,
    Image,
    ScrollView,
    useWindowDimensions,
    View,
    TouchableOpacity,
    Alert,
    Linking,
    Share,
    ActivityIndicator, StyleSheet,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useLocalSearchParams, useNavigation, useRouter} from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RenderHTML from 'react-native-render-html';

import CustomHeader from '@/components/CustomHeader';
import {useTheme} from '@/components/ThemeContext';
import icons from '@/constants/icons';
import {WPPost} from '@/types/wp';

// notifications inbox helpers (read only for preview mode)
import {getInbox, type InboxItem} from '@/types/notificationInbox';
import CustomFooter from "@/components/CustomFooter";
import {globalSearch} from "@/utils/searchNavigation";
import colors from "@/constants/colors";

const deriveCategoryName = (post: any): string | undefined => {
    const groups = post?._embedded?.['wp:term'];
    if (Array.isArray(groups)) {
        const flat = groups.flat().filter(Boolean);
        const cat = flat.find((t: any) => t?.taxonomy === 'category' && t?.name);
        if (cat?.name) return String(cat.name);
    }
    return undefined;
};

type PreviewFromNotification = {
    title?: string;
    message?: string;
    imageUrl?: string;
    receivedAt?: number;
    categoryName?: string;
};

const PostDetails = () => {
    const {width} = useWindowDimensions();
    const contentWidth = useMemo(() => width, [width]);

    const {postId, category} = useLocalSearchParams<{ postId?: string; category?: string }>();
    const router = useRouter();

    const categoryParam = Array.isArray(category) ? category[0] : category;
    const [activeCategory, setActiveCategory] = useState<string>(categoryParam || '');
    const [menuOpen, setMenuOpen] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [postData, setPostData] = useState<WPPost | any | null>(null);
    const [loadingPost, setLoadingPost] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigation = useNavigation();

    // if showing a notification-only preview (no network/cache)
    const [preview, setPreview] = useState<PreviewFromNotification | null>(null);

    const {theme} = useTheme();
    const isDark = theme === 'dark';
    const htmlTextColor = isDark ? '#ffffff' : '#000000';

    const tagsStyles = useMemo(
        () => ({
            body: {color: htmlTextColor},
            p: {color: htmlTextColor},
            span: {color: htmlTextColor},
            li: {color: htmlTextColor},
            h1: {color: htmlTextColor},
            h2: {color: htmlTextColor},
            h3: {color: htmlTextColor},
            a: {color: '#1d4ed8'},
        }),
        [htmlTextColor]
    );

    useEffect(() => {
        const unsub = navigation.addListener('blur', () => setIsLoading(false));
        return unsub;
    }, [navigation]);

    useEffect(() => {
        const loadPost = async () => {
            setLoadingPost(true);
            setError(null);
            setPreview(null);
            setPostData(null);

            try {
                const idRaw = Array.isArray(postId) ? postId[0] : postId;
                if (!idRaw) throw new Error('Nedostaje ID objave');
                const idNum = parseInt(String(idRaw), 10);
                if (!Number.isFinite(idNum)) throw new Error('Neispravan ID objave');

                // 1) Try cache FIRST (normal behavior for live posts)
                const cacheRaw = await AsyncStorage.getItem('groupedPostsCache');
                if (cacheRaw) {
                    const {data} = JSON.parse(cacheRaw || '{}');
                    const allPosts = Object.values(data ?? {}).flat() as WPPost[];
                    const cached = allPosts.find((p) => p.id === idNum);
                    if (cached) {
                        setPostData(cached);

                        const derived = deriveCategoryName(cached);
                        if (derived && (!activeCategory || activeCategory === 'Naslovna')) {
                            setActiveCategory(derived);
                        }
                        return;
                    }
                }

                // 2) If not in cache, check notifications inbox for a preview item with same postId
                const inbox = await getInbox();
                const match: InboxItem | undefined = inbox.find(
                    (i) => String(i.postId) === String(idNum)
                );

                if (match) {
                    // PREVIEW MODE: do NOT fetch network, render from notification only
                    setPreview({
                        title: match.title,
                        message: match.message,
                        imageUrl: match.imageUrl,
                        receivedAt: match.receivedAt,
                        categoryName: (match as any).categoryName,
                    });
                    if (!activeCategory) {
                        setActiveCategory((match as any).categoryName || categoryParam || 'Naslovna');
                    }
                    return;
                }

                // 3) Fallback: if neither cache nor inbox had it, do the normal fetch (for real posts)
                const res = await fetch(`https://www.postinfo.rs/wp-json/wp/v2/posts/${idNum}?_embed=1`);
                if (!res.ok) throw new Error('Greška pri učitavanju');
                const json = await res.json();
                if (!json || !json.id) throw new Error('Objava nije pronađena');

                setPostData(json);

                const derived = deriveCategoryName(json);
                if (derived && (!activeCategory || activeCategory === 'Naslovna')) {
                    setActiveCategory(derived);
                }
            } catch (e: any) {
                console.warn('Greška pri učitavanju objave:', e?.message ?? e);
                setError('Nije moguće učitati objavu. Pokušajte ponovo.');
            } finally {
                setLoadingPost(false);
            }
        };

        loadPost();
    }, [postId]);

    // Bookmark state (works for both preview and normal)
    useEffect(() => {
        const check = async () => {
            const saved = await AsyncStorage.getItem('favorites');
            const idRaw = Array.isArray(postId) ? postId[0] : postId;
            const idNum = parseInt(String(idRaw || ''), 10);
            if (!saved || !idNum) return;

            const parsed = JSON.parse(saved);
            setIsBookmarked(parsed.some((item: any) => item.id === idNum));
        };
        check();
    }, [postData, preview, postId]);

    const handleBackWithLoading = () => {
        if (isLoading) return;
        setIsLoading(true);
        requestAnimationFrame(() => {
            router.back();
        });
    };


    const formattedDate =
        preview?.receivedAt
            ? new Date(preview.receivedAt).toLocaleDateString('sr-RS', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
            })
            : postData?.date
                ? new Date(postData.date).toLocaleDateString('sr-RS', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                })
                : undefined;

    const image = preview?.imageUrl || postData?._embedded?.['wp:featuredmedia']?.[0]?.source_url;

    const toggleBookmark = async () => {
        try {
            const idRaw = Array.isArray(postId) ? postId[0] : postId;
            const idNum = parseInt(String(idRaw || ''), 10);
            if (!idNum) return;

            const saved = await AsyncStorage.getItem('favorites');
            let favorites = saved ? JSON.parse(saved) : [];

            if (isBookmarked) {
                favorites = favorites.filter((item: any) => item.id !== idNum);
                await AsyncStorage.setItem('favorites', JSON.stringify(favorites));
                setIsBookmarked(false);
                Alert.alert('Obaveštenje', 'Post uklonjen iz omiljenih', [{text: 'OK'}], {
                    cancelable: true,
                });
            } else {
                const categoryToSave =
                    (postData ? deriveCategoryName(postData) : undefined) ||
                    preview?.categoryName ||
                    (activeCategory && activeCategory !== 'Naslovna' ? activeCategory : undefined) ||
                    'Naslovna';

                // Save either the full WP post (if we have it) or a minimal object from preview
                const toSave =
                    postData && postData.id
                        ? {...postData, category: categoryToSave}
                        : {
                            id: idNum,
                            title: {rendered: preview?.title || 'Objava'},
                            content: {rendered: ''},
                            excerpt: {rendered: preview?.message || ''},
                            date: preview?.receivedAt ? new Date(preview.receivedAt).toISOString() : new Date().toISOString(),
                            _embedded: image ? {'wp:featuredmedia': [{source_url: image}]} : undefined,
                            link: `https://www.postinfo.rs/?p=${idNum}`,
                            category: categoryToSave,
                        };

                favorites.push(toSave);
                await AsyncStorage.setItem('favorites', JSON.stringify(favorites));
                setIsBookmarked(true);
                Alert.alert('Obaveštenje', 'Post dodat u omiljene', [{text: 'OK'}], {
                    cancelable: true,
                });
            }
        } catch (e) {
            console.error('Greška pri čuvanju omiljenih:', e);
        }
    };

    const handleShare = async (platform: string) => {
        const idRaw = Array.isArray(postId) ? postId[0] : postId;
        const idNum = parseInt(String(idRaw || ''), 10);
        if (!idNum) return;

        const linkToShare = postData?.link || `https://www.postinfo.rs/?p=${idNum}`;
        const postTitle = (postData?.title?.rendered as string) || preview?.title || '';

        if (!linkToShare) {
            Alert.alert('Greška', 'Nema linka za deljenje.');
            return;
        }

        try {
            let url = '';

            switch (platform) {
                case 'facebook':
                case 'twitter':
                case 'x':
                    await Share.share({
                        message: linkToShare,
                        url: linkToShare,
                        title: postTitle,
                    });
                    return;

                case 'linkedin':
                    url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                        linkToShare
                    )}`;
                    break;

                case 'mail':
                    url = `mailto:?subject=${encodeURIComponent(postTitle)}&body=${encodeURIComponent(
                        linkToShare
                    )}`;
                    break;

                case 'whatsapp':
                    url = `whatsapp://send?text=${encodeURIComponent(postTitle + ' ' + linkToShare)}`;
                    break;

                default:
                    return;
            }

            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert(
                    'Aplikacija nije dostupna',
                    `Izgleda da aplikacija za ${platform} nije instalirana ili ne podržava deljenje sa ovog uređaja.`
                );
            }
        } catch (error) {
            console.error('Greška pri deljenju:', error);
            Alert.alert('Greška', 'Nije moguće izvršiti deljenje.');
        }
    };

    const handleCategorySelected = (cat: string) => {
        setActiveCategory(cat);
        router.replace({pathname: '/', params: {selectedCategory: cat}});
    };

    // Loading
    if (loadingPost) {
        return (
            <SafeAreaView
                className="flex-1 items-center justify-center"
                style={{backgroundColor: isDark ? colors.black : colors.grey}}
            >
                <ActivityIndicator size="large" color={isDark ? colors.grey : colors.black}/>
                <Text className="mt-4" style={{
                    color: isDark ? colors.grey : colors.black,
                fontFamily: 'Roboto-Regular'}}>
                    Učitavanje objave...
                </Text>
            </SafeAreaView>
        );
    }

    // Error (only when neither cache nor preview nor fetch provided data)
    if ((error && !preview && !postData) || (!preview && !postData)) {
        return (
            <SafeAreaView
                className="flex-1 items-center justify-center px-6"
                style={{backgroundColor: isDark ? colors.black : colors.grey}}
            >
                <Text className="text-center" style={{
                    color: isDark ? colors.grey : colors.black,
                fontFamily: 'Roboto-Regular'}}>
                    {error || 'Objava nije pronađena.'}
                </Text>
            </SafeAreaView>
        );
    }

    // --- PREVIEW MODE (from notification only; no HTML) ---
    if (preview && !postData) {
        return (
            <SafeAreaView
                className="flex-1"
                style={{backgroundColor: isDark ? colors.black : colors.grey}}
            >
                <CustomHeader
                    onMenuToggle={(visible) => setMenuOpen(visible)}
                    onCategorySelected={handleCategorySelected}
                    activeCategory={activeCategory || preview.categoryName || 'Naslovna'}
                    showMenu={false}
                    onBackPress={handleBackWithLoading}
                    loadingNav={isLoading}
                />

                <ScrollView contentContainerStyle={{paddingBottom: 120}} className="px-4 py-4">
                    {preview.imageUrl && (
                        <Image
                            source={{uri: preview.imageUrl}}
                            className="w-full h-60 rounded-md mb-4"
                            resizeMode="cover"
                        />
                    )}

                    <View className="flex-row justify-between items-center mb-2">
                        <Text
                            className="text-xl flex-1 pr-4"
                            style={{
                                color: isDark ? colors.grey : colors.black,
                            fontFamily: 'Roboto-ExtraBold'}}
                            numberOfLines={3}
                        >
                            {preview.title || 'Objava'}
                        </Text>
                        <TouchableOpacity onPress={toggleBookmark}>
                            <Image
                                source={icons.bookmark}
                                style={{
                                    width: 24,
                                    height: 24,
                                    tintColor: isBookmarked ? colors.red : isDark ? colors.grey : colors.black,
                                }}
                            />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-sm mt-1 mb-1" style={{
                        color: isDark ? colors.grey : colors.black,
                        fontFamily: 'YesevaOne-Regular'
                    }}>
                        {preview.receivedAt
                            ? new Date(preview.receivedAt).toLocaleDateString('sr-RS', {
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric',
                            })
                            : '-'}
                    </Text>

                    <View className="flex-row justify-around items-center mt-5 mb-5 px-4">
                        {[
                            {icon: icons.facebook, platform: 'facebook'},
                            {icon: icons.twitter, platform: 'x'},
                            {icon: icons.linkedin, platform: 'linkedin'},
                            {icon: icons.mail, platform: 'mail'},
                            {icon: icons.whatsapp, platform: 'whatsapp'},
                        ].map(({icon, platform}, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => handleShare(platform)}
                                className="p-3 mx-1 rounded-full border border-gray-300 bg-white shadow-sm"
                            >
                                <Image source={icon} style={{width: 20, height: 20}}/>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {!!preview.message && (
                        <Text style={{
                            color: isDark ? colors.grey : colors.black,
                            fontFamily: 'Roboto-Regular',
                            fontSize: 16,
                            lineHeight: 22}}>
                            {preview.message}
                        </Text>
                    )}
                </ScrollView>
                <CustomFooter onSearchPress={() => router.push(globalSearch())}/>
            </SafeAreaView>
        );
    }

    // --- NORMAL MODE (cache or fetched WP post with HTML) ---
    const titleRendered = postData?.title?.rendered ?? '';
    const contentRendered = postData?.content?.rendered ?? '';

    return (
        <SafeAreaView
            className="flex-1"
            style={{backgroundColor: isDark ? colors.black : colors.grey}}
        >
            <CustomHeader
                onMenuToggle={(visible) => setMenuOpen(visible)}
                onCategorySelected={handleCategorySelected}
                activeCategory={activeCategory || 'Naslovna'}
                showMenu={false}
                onBackPress={handleBackWithLoading}
                loadingNav={isLoading}
            />

            <ScrollView contentContainerStyle={{paddingBottom: 120}} className="px-4 py-4">
                {image && (
                    <Image
                        source={{uri: image}}
                        className="w-full h-60 rounded-md mb-4"
                        resizeMode="cover"
                    />
                )}

                <View className="flex-row justify-between items-center mb-2">
                    <Text
                        className="text-xl flex-1 pr-4"
                        style={{
                            color: isDark ? colors.grey: colors.black,
                        fontFamily: 'Roboto-ExtraBold'}}
                        numberOfLines={3}
                    >
                        {titleRendered}
                    </Text>
                    <TouchableOpacity onPress={toggleBookmark}>
                        <Image
                            source={icons.bookmark}
                            style={{
                                width: 24,
                                height: 24,
                                tintColor: isBookmarked ? colors.red : isDark ? colors.grey : colors.black,
                            }}
                        />
                    </TouchableOpacity>
                </View>

                <Text className="text-sm mb-3" style={{
                    color: isDark ? colors.grey : colors.black,
                    fontFamily: 'YesevaOne-Regular'
                }}>{formattedDate || '-'}
                </Text>

                <View className="flex-row justify-around items-center mt-5 mb-5 px-4">
                    {[
                        {icon: icons.facebook, platform: 'facebook'},
                        {icon: icons.twitter, platform: 'x'},
                        {icon: icons.linkedin, platform: 'linkedin'},
                        {icon: icons.mail, platform: 'mail'},
                        {icon: icons.whatsapp, platform: 'whatsapp'},
                    ].map(({icon, platform}, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => handleShare(platform)}
                            className="p-3 mx-1 rounded-full border border-gray-300 bg-white shadow-sm"
                        >
                            <Image source={icon} style={{width: 20, height: 20}}/>
                        </TouchableOpacity>
                    ))}
                </View>

                <RenderHTML contentWidth={contentWidth} source={{html: contentRendered}} tagsStyles={tagsStyles}/>
            </ScrollView>
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
                    <ActivityIndicator size="large" color={isDark ? colors.grey : colors.black} />
                    <Text
                        style={{
                            marginTop: 10,
                            color: isDark ? colors.grey : colors.black,
                            fontFamily: 'Roboto-SemiBold',
                            textAlign: 'center',
                        }}
                    >
                        Učitavanje...
                    </Text>
                </View>
            )}
            <CustomFooter onSearchPress={() => router.push(globalSearch())} />
        </SafeAreaView>
    );
};

export default PostDetails;