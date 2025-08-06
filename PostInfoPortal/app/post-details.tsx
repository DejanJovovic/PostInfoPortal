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
    ActivityIndicator,
    TextStyle,
} from 'react-native';
import React, {useState, useEffect, useMemo} from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CustomHeader from '@/components/CustomHeader';
import RenderHTML, {MixedStyleRecord} from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import icons from '@/constants/icons';
import { useTheme } from '@/components/ThemeContext';
import {WPPost} from "@/types/wp";

const PostDetails = () => {
    const { width } = useWindowDimensions();
    const contentWidth = useMemo(() => width, [width]);
    const { postId, category } = useLocalSearchParams();
    const router = useRouter();

    const categoryParam = Array.isArray(category) ? category[0] : category;
    const [activeCategory, setActiveCategory] = useState(categoryParam || 'Naslovna');
    const [menuOpen, setMenuOpen] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [postData, setPostData] = useState<any>(null);
    const [loadingPost, setLoadingPost] = useState(true);

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const htmlTextColor = isDark ? '#ffffff' : '#000000';

    const tagsStyles = useMemo(() => ({
        body: { color: htmlTextColor },
        p: { color: htmlTextColor },
        span: { color: htmlTextColor },
        li: { color: htmlTextColor },
        h1: { color: htmlTextColor },
        h2: { color: htmlTextColor },
        h3: { color: htmlTextColor },
    }), [htmlTextColor]);

    // 1. Load post by ID
    useEffect(() => {
        const loadPost = async () => {
            try {
                const cacheRaw = await AsyncStorage.getItem('groupedPostsCache');
                if (cacheRaw) {
                    const { data } = JSON.parse(cacheRaw);

                    const allPosts = Object.values(data).flat() as WPPost[];
                    const foundPost = allPosts.find(p => p.id === parseInt(postId as string));
                    if (foundPost) {
                        setPostData(foundPost);
                        return;
                    }
                }

                // Fallback API call
                const res = await fetch(`https://www.postinfo.rs/wp-json/wp/v2/posts/${postId}?_embed`);
                const post = await res.json();
                setPostData(post);
            } catch (e) {
                console.error('Greška prilikom učitavanja posta:', e);
            } finally {
                setLoadingPost(false);
            }
        };

        loadPost();
    }, [postId]);

    // 2. Check if post is bookmarked (runs every time postData promeni)
    useEffect(() => {
        if (!postData) return;

        const checkIfBookmarked = async () => {
            const saved = await AsyncStorage.getItem('favorites');
            if (saved) {
                const parsed = JSON.parse(saved);
                setIsBookmarked(parsed.some((item: any) => item.id === postData.id));
            }
        };

        checkIfBookmarked();
    }, [postData]);

    if (loadingPost || !postData) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center"
                          style={{ backgroundColor: isDark ? '#000' : '#fff' }}>
                <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
                <Text className="mt-4" style={{ color: isDark ? '#fff' : '#000' }}>Učitavanje objave...</Text>
            </SafeAreaView>
        );
    }

    const { id, title, content, date, _embedded, link } = postData;
    const image = _embedded?.['wp:featuredmedia']?.[0]?.source_url;
    const formattedDate = new Date(date).toLocaleDateString('sr-RS', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    });

    const toggleBookmark = async () => {
        try {
            const saved = await AsyncStorage.getItem('favorites');
            let favorites = saved ? JSON.parse(saved) : [];

            let toastMessage = '';

            if (isBookmarked) {
                favorites = favorites.filter((item: any) => item.id !== id);
                toastMessage = 'Post uklonjen iz omiljenih';
            } else {
                favorites.push({ ...postData, category: activeCategory });
                toastMessage = 'Post dodat u omiljene';
            }

            await AsyncStorage.setItem('favorites', JSON.stringify(favorites));
            setIsBookmarked(!isBookmarked);

            Alert.alert('Obaveštenje', toastMessage, [{ text: 'OK' }], { cancelable: true });
        } catch (e) {
            console.error('Greška pri čuvanju omiljenih:', e);
        }
    };

    const handleShare = async (platform: string) => {
        const linkToShare = postData.link || `https://www.postinfo.rs/?p=${postData.id}`;
        const postTitle = postData.title?.rendered || '';

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
                    url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(linkToShare)}`;
                    break;

                case 'mail':
                    url = `mailto:?subject=${encodeURIComponent(postTitle)}&body=${encodeURIComponent(linkToShare)}`;
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
    const handleCategorySelected = (category: string) => {
        setActiveCategory(category);
        router.replace({ pathname: '/', params: { selectedCategory: category } });
    };

    return (
        <SafeAreaView className="flex-1"
                      style={{ backgroundColor: isDark ? '#000000' : 'white' }}>
            <CustomHeader
                onMenuToggle={(visible) => setMenuOpen(visible)}
                onCategorySelected={handleCategorySelected}
                activeCategory={activeCategory}
                showMenu={false}
            />

            <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-4 py-4">
                {image && (
                    <Image
                        source={{ uri: image }}
                        className="w-full h-60 rounded-md mb-4"
                        resizeMode="cover"
                    />
                )}

                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-xl font-bold flex-1 pr-4"
                          style={{ color: isDark ? '#fff' : '#000000' }}>{title?.rendered}</Text>
                    <TouchableOpacity onPress={toggleBookmark}>
                        <Image
                            source={icons.bookmark}
                            style={{
                                width: 24, height: 24, tintColor: isBookmarked
                                    ? 'red'
                                    : isDark
                                        ? 'white'
                                        : 'black',
                            }}
                        />
                    </TouchableOpacity>
                </View>

                <Text className="text-gray-400 text-sm mb-3">{formattedDate}</Text>

                <View className="flex-row justify-around items-center mt-5 mb-5 px-4">
                    {[
                        { icon: icons.facebook, platform: 'facebook' },
                        { icon: icons.twitter, platform: 'x' },
                        { icon: icons.linkedin, platform: 'linkedin' },
                        { icon: icons.mail, platform: 'mail' },
                        { icon: icons.whatsapp, platform: 'whatsapp' },
                    ].map(({ icon, platform }, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => handleShare(platform)}
                            className="p-3 mx-1 rounded-full border border-gray-300 bg-white shadow-sm"
                        >
                            <Image source={icon} style={{ width: 20, height: 20 }} />
                        </TouchableOpacity>
                    ))}
                </View>

                <RenderHTML contentWidth={contentWidth} source={{ html: content?.rendered }} tagsStyles={tagsStyles} />

            </ScrollView>
        </SafeAreaView>
    );
};

export default PostDetails;