import {
    Text,
    Image,
    ScrollView,
    useWindowDimensions,
    View,
    TouchableOpacity,
    Alert,
    Linking,
    Share
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CustomHeader from '@/components/CustomHeader';
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import icons from "@/constants/icons";

const PostDetails = () => {
    const { width } = useWindowDimensions();
    const { post, category } = useLocalSearchParams();
    const router = useRouter();

    const categoryParam = Array.isArray(category) ? category[0] : category;
    const [activeCategory, setActiveCategory] = useState(categoryParam || 'Naslovna');
    const [menuOpen, setMenuOpen] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);

    const postData = JSON.parse(Array.isArray(post) ? post[0] : post);
    const { id, title, content, date, _embedded } = postData;
    const image = _embedded?.['wp:featuredmedia']?.[0]?.source_url;
    const formattedDate = new Date(date).toLocaleDateString('sr-RS', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    });

    useEffect(() => {
        const checkIfBookmarked = async () => {
            const saved = await AsyncStorage.getItem('favorites');
            if (saved) {
                const parsed = JSON.parse(saved);
                setIsBookmarked(parsed.some((item: any) => item.id === id));
            }
        };
        checkIfBookmarked();
    }, [id]);

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

    // this function handles sharing posts to social apps
    const handleShare = async (platform: string) => {
        const postLink = postData.link;

        try {
            let url = '';
            switch (platform) {
                case 'facebook':
                    // share api, instead of linking because fb doesnt allow linking to fb pages
                    await Share.share({
                        message: `${postLink}`,
                        url: postLink,
                        title: title.rendered,
                    });
                    return;
                case 'twitter':
                    url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(postLink)}&text=${encodeURIComponent(title.rendered)}`;
                    break;
                case 'linkedin':
                    url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postLink)}`;
                    break;
                case 'mail':
                    url = `mailto:?subject=${encodeURIComponent(title.rendered)}&body=${encodeURIComponent(postLink)}`;
                    break;
                case 'whatsapp':
                    url = `whatsapp://send?text=${encodeURIComponent(postLink)}`;
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
                    `Izgleda da ${platform.charAt(0).toUpperCase() + platform.slice(1)} aplikacija nije instalirana na ovom uređaju.`
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

    // this return comes before hooks
    if (!post) return null;

    return (
        <SafeAreaView className="flex-1 bg-white">
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
                    <Text className="text-xl font-bold text-black flex-1 pr-4">{title?.rendered}</Text>
                    <TouchableOpacity onPress={toggleBookmark}>
                        <Image
                            source={icons.bookmark}
                            style={{ width: 24, height: 24, tintColor: isBookmarked ? 'red' : 'black' }}
                        />
                    </TouchableOpacity>
                </View>

                <Text className="text-gray-400 text-sm mb-3">{formattedDate}</Text>
                <View className="flex-row justify-around items-center mt-5 mb-5 px-4">
                    {[
                        { icon: icons.facebook, platform: 'facebook' },
                        { icon: icons.twitter, platform: 'twitter' },
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

                <RenderHTML contentWidth={width} source={{ html: content?.rendered }} />
            </ScrollView>
        </SafeAreaView>
    );
};

export default PostDetails;