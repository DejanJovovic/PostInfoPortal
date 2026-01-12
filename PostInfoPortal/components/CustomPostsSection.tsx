import React from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    Platform, type ImageSourcePropType,
} from 'react-native';
import {useTheme} from './ThemeContext';
import {WPPost} from '@/types/wp';
import colors from '@/constants/colors';
import CustomBanner from "@/components/CustomBanner";

interface Props {
    categoryName: string;
    posts: WPPost[];
    /** Da li se sekcija prikazuje na "Naslovna" (prikazuje plavi naslov karticu)? */
    isHome?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    onPostPress: (postId: number, categoryName: string) => void;
    loadingNav?: boolean;
    /** Reklama na kraju sekcije (za ostale kategorije) */
    adAtEnd?: boolean;
    adUrl?: string;
    adImageUrl?: ImageSourcePropType | string;
    adTitle?: string;
    adCta?: string;
}

const CustomPostsSection: React.FC<Props> = ({
                                                 categoryName,
                                                 posts,
                                                 isHome = false,
                                                 refreshing,
                                                 onRefresh,
                                                 onPostPress,
                                                 loadingNav,
                                                 adAtEnd = false,
                                                 adUrl = 'https://example.com',
                                                 adImageUrl = 'https://via.placeholder.com/1200x400?text=Ad',
                                                 adTitle = 'Test',
                                                 adCta = 'Saznaj više',
                                             }) => {
    const {theme} = useTheme();
    const isDark = theme === 'dark';

    if (!posts || posts.length === 0) return null;

    const featured = posts[0];
    const nextTwo = posts.slice(1, 3);
    const rest = posts.slice(3);

    const cardBase = {
        backgroundColor: isDark ? colors.black : colors.grey,
        borderColor: isDark ? '#525050' : '#e5e7eb',
    } as const;

    const ShadowNone =
        Platform.OS === 'ios'
            ? {
                shadowColor: 'transparent',
                shadowOpacity: 0,
                shadowRadius: 0,
                shadowOffset: {width: 0, height: 0},
            }
            : {elevation: 0};

    const getImg = (p: WPPost) => p._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    const getDate = (p: WPPost) => new Date(p.date).toLocaleDateString('sr-RS');
    const getExcerpt = (p: WPPost) => p.excerpt?.rendered?.replace(/<[^>]+>/g, '') || '';
    const getTitle = (p: WPPost) => p.title?.rendered || '';

    return (
        <View style={{marginBottom: 18}}>
            {/* Header (samo na Naslovna) */}
            {isHome && (
                <View
                    style={{
                        backgroundColor: colors.blue,
                        alignSelf: 'stretch',
                        marginHorizontal: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                        marginTop: 18,
                    }}
                >
                    <Text
                        style={{
                            color: '#fff',
                            fontFamily: 'YesevaOne-Regular',
                        }}
                    >
                        {categoryName}
                    </Text>
                </View>
            )}

            <ScrollView
                contentContainerStyle={{
                    paddingBottom: isHome ? 8 : 250,
                }}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                refreshControl={
                    refreshing !== undefined && onRefresh ? (
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>
                    ) : undefined
                }
            >
                {/* #1 Featured full-width */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={loadingNav}
                    onPress={() => onPostPress(featured.id, categoryName)}
                    style={{marginHorizontal: 12, marginTop: 10}}
                >
                    <View
                        style={[
                            {
                                borderWidth: 1,
                                borderRadius: 16,
                                padding: 12,
                                ...cardBase,
                                overflow: 'hidden',
                            },
                            ShadowNone,
                        ]}
                    >
                        {getImg(featured) && (
                            <Image
                                source={{uri: getImg(featured)!}}
                                style={{width: '100%', height: 200, borderRadius: 12, marginBottom: 10}}
                                resizeMode="cover"
                            />
                        )}
                        <Text
                            numberOfLines={2}
                            style={{color: isDark ? colors.grey : colors.black, fontFamily: 'Roboto-ExtraBold'}}
                        >
                            {getTitle(featured)}
                        </Text>
                        <Text
                            style={{
                                marginTop: 4,
                                color: isDark ? colors.grey : colors.black,
                                fontFamily: 'YesevaOne-Regular'
                            }}
                        >
                            {getDate(featured)}
                        </Text>
                        <Text
                            numberOfLines={3}
                            style={{
                                marginTop: 2,
                                color: isDark ? colors.grey : colors.black,
                                fontFamily: 'Roboto-Light'
                            }}
                        >
                            {getExcerpt(featured)}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* #2 i #3: dva u redu (po 50%) */}
                {nextTwo.length > 0 && (
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            paddingHorizontal: 12,
                            marginTop: 12,
                            flexWrap: 'wrap',
                            gap: 8,
                        }}
                    >
                        {nextTwo.map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                activeOpacity={0.85}
                                disabled={loadingNav}
                                onPress={() => onPostPress(p.id, categoryName)}
                                style={{width: '48%'}}
                            >
                                <View
                                    style={[
                                        {
                                            borderWidth: 1,
                                            borderRadius: 16,
                                            padding: 10,
                                            ...cardBase,
                                            overflow: 'hidden',
                                            marginBottom: 8,
                                        },
                                        ShadowNone,
                                    ]}
                                >
                                    {getImg(p) && (
                                        <Image
                                            source={{uri: getImg(p)!}}
                                            style={{width: '100%', height: 110, borderRadius: 12, marginBottom: 8}}
                                            resizeMode="cover"
                                        />
                                    )}
                                    <Text
                                        numberOfLines={2}
                                        style={{
                                            color: isDark ? colors.grey : colors.black,
                                            fontFamily: 'Roboto-ExtraBold'
                                        }}
                                    >
                                        {getTitle(p)}
                                    </Text>
                                    <Text
                                        style={{
                                            marginTop: 4,
                                            color: isDark ? colors.grey : colors.black,
                                            fontFamily: 'YesevaOne-Regular',
                                        }}
                                    >
                                        {getDate(p)}
                                    </Text>
                                    <Text
                                        numberOfLines={3}
                                        style={{
                                            marginTop: 2,
                                            color: isDark ? colors.grey : colors.black,
                                            fontFamily: 'Roboto-Light'
                                        }}
                                    >
                                        {getExcerpt(p)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Ostali: vertikalno, thumbnail 30% + tekst 70% */}
                {rest.length > 0 && (
                    <View style={{marginTop: 6}}>
                        {rest.map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                activeOpacity={0.85}
                                disabled={loadingNav}
                                onPress={() => onPostPress(p.id, categoryName)}
                                style={{marginHorizontal: 12, marginTop: 10}}
                            >
                                <View
                                    style={[
                                        {
                                            borderWidth: 1,
                                            borderRadius: 16,
                                            padding: 10,
                                            ...cardBase,
                                            overflow: 'hidden',
                                        },
                                        ShadowNone,
                                    ]}
                                >
                                    <View style={{flexDirection: 'row', alignItems: 'flex-start', gap: 10}}>
                                        {getImg(p) ? (
                                            <Image
                                                source={{uri: getImg(p)!}}
                                                style={{
                                                    flex: 3,
                                                    alignSelf: 'stretch',
                                                    borderRadius: 10,
                                                }}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View
                                                style={{
                                                    flex: 3,
                                                    alignSelf: 'stretch',
                                                    backgroundColor: '#ddd',
                                                    borderRadius: 10,
                                                }}
                                            />
                                        )}

                                        <View style={{flex: 7}}>
                                            <Text
                                                numberOfLines={2}
                                                style={{
                                                    color: isDark ? colors.grey : colors.black,
                                                    fontFamily: 'Roboto-ExtraBold'
                                                }}
                                            >
                                                {getTitle(p)}
                                            </Text>
                                            <Text
                                                style={{
                                                    marginTop: 4,
                                                    color: isDark ? colors.grey : colors.black,
                                                    fontFamily: 'YesevaOne-Regular',
                                                }}
                                            >
                                                {getDate(p)}
                                            </Text>
                                            <Text
                                                numberOfLines={3}
                                                style={{
                                                    marginTop: 2,
                                                    color: isDark ? colors.grey : colors.black,
                                                    fontFamily: 'Roboto-Light'
                                                }}
                                            >
                                                {getExcerpt(p)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* add at the end */}
                {adAtEnd && (
                    <CustomBanner
                        url={adUrl}
                        imageSrc={adImageUrl}
                    />
                )}
            </ScrollView>
        </View>
    );
};

export default CustomPostsSection;