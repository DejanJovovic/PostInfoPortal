import React from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
} from 'react-native';
import {useTheme} from './ThemeContext';
import {WPPost} from '@/types/wp';
import colors from "@/constants/colors";

interface Props {
    categoryName: string;
    posts: WPPost[];
    /** Naslovna posts UI */
    showFeaturedFirst?: boolean;
    /** posts UI for other kategorije */
    gridAfterFirst?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    onPostPress: (postId: number, categoryName: string) => void;
    loadingNav?: boolean;
}

const CustomPostsSection: React.FC<Props> = ({
                                                 categoryName,
                                                 posts,
                                                 showFeaturedFirst = false,
                                                 gridAfterFirst = false,
                                                 refreshing,
                                                 onRefresh,
                                                 onPostPress,
                                                 loadingNav,
                                             }) => {
    const {theme} = useTheme();
    const isDark = theme === 'dark';

    const Card = ({item}: { item: WPPost }) => {
        const image = item._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        const date = new Date(item.date).toLocaleDateString('sr-RS');
        const excerpt = item.excerpt?.rendered?.replace(/<[^>]+>/g, '') || '';
        const postTitle = item.title?.rendered || '';

        return (
            <View
                className="rounded-2xl shadow-md p-3 border"
                style={{
                    backgroundColor: isDark ? colors.black : colors.grey,
                    borderColor: isDark ? '#525050' : '#e5e7eb',
                }}
            >
                {image && (
                    <Image
                        source={{uri: image}}
                        className="w-full h-[110px] rounded-xl mb-2"
                        resizeMode="cover"
                    />
                )}
                <Text
                    className="mb-1"
                    style={{
                        color: isDark ? colors.grey : colors.black,
                        fontFamily: 'Roboto-ExtraBold'
                    }}
                    numberOfLines={2}
                >
                    {postTitle}
                </Text>
                <Text className="text-xs mt-1 mb-1" style={{
                    color: isDark ? colors.grey : colors.black,
                    fontFamily: 'YesevaOne-Regular'
                }}>
                    {date}
                </Text>
                <Text className="text-sm" numberOfLines={3} style={{
                    color: isDark ? colors.grey : colors.black,
                    fontFamily: 'Roboto-Light'
                }}>
                    {excerpt}
                </Text>
            </View>
        );
    };

    const FeaturedCard = ({item}: { item: WPPost }) => {
        const image = item._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        const date = new Date(item.date).toLocaleDateString('sr-RS');
        const excerpt = item.excerpt?.rendered?.replace(/<[^>]+>/g, '') || '';
        const postTitle = item.title?.rendered || '';

        return (
            <View
                className="rounded-2xl shadow-md mb-4 mx-4 p-4 border"
                style={{
                    backgroundColor: isDark ? colors.black : colors.grey,
                    borderColor: isDark ? '#525050' : '#e5e7eb',
                }}
            >
                {image && <Image source={{uri: image}} className="w-full h-48 rounded-xl mb-3" resizeMode="cover"/>}
                <Text
                    className="mb-1"
                    style={{
                        color: isDark ? colors.grey : colors.black,
                        fontFamily: 'Roboto-ExtraBold'
                    }}
                    numberOfLines={2}
                >
                    {postTitle}
                </Text>
                <Text className="text-xs mt-1 mb-1" style={{
                    color: isDark ? colors.grey : colors.black,
                    fontFamily: 'YesevaOne-Regular'
                }}>
                    {date}
                </Text>
                <Text className="text-sm" numberOfLines={3} style={{
                    color: isDark ? colors.grey : colors.black,
                    fontFamily: 'Roboto-Light'
                }}>
                    {excerpt}
                </Text>
            </View>
        );
    };

    if (gridAfterFirst) {
        const rest = posts.slice(1);

        return (
            <ScrollView
                contentContainerStyle={{paddingBottom: 8}}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    refreshing !== undefined && onRefresh ? (
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>
                    ) : undefined
                }
            >
                {posts.length > 0 && (
                    <TouchableOpacity
                        onPress={() => onPostPress(posts[0].id, categoryName)}
                        disabled={loadingNav}
                        activeOpacity={0.8}
                    >
                        <FeaturedCard item={posts[0]}/>
                    </TouchableOpacity>
                )}

                {rest.length > 0 && (
                    <View style={{paddingHorizontal: 12}}>
                        <View
                            style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                justifyContent: 'space-between',
                            }}
                        >
                            {rest.map((item) => (
                                <View key={item.id} style={{width: '48%', marginBottom: 12}}>
                                    <TouchableOpacity
                                        onPress={() => onPostPress(item.id, categoryName)}
                                        disabled={loadingNav}
                                        activeOpacity={0.8}
                                    >
                                        <Card item={item}/>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        );
    }

    const horizontalData = showFeaturedFirst ? posts.slice(1) : posts;

    return (
        <View className="mb-6">
            <Text className="text-xl px-4 mb-3"
                  style={{
                      color: isDark ? colors.grey : colors.black,
                      fontFamily: 'YesevaOne-Regular',
                      marginTop: 35
                  }}>
                {categoryName}
            </Text>

            {showFeaturedFirst && posts.length > 0 && (
                <TouchableOpacity
                    onPress={() => onPostPress(posts[0].id, categoryName)}
                    disabled={loadingNav}
                    activeOpacity={0.8}
                >
                    <FeaturedCard item={posts[0]}/>
                </TouchableOpacity>
            )}

            {horizontalData.length > 0 && (
                <FlatList
                    data={horizontalData}
                    renderItem={({item}) => (
                        <TouchableOpacity
                            className="w-[240px] mr-3"
                            onPress={() => onPostPress(item.id, categoryName)}
                            disabled={loadingNav}
                            activeOpacity={0.8}
                        >
                            <Card item={item}/>
                        </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.id.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{paddingHorizontal: 16}}
                    removeClippedSubviews
                    initialNumToRender={3}
                    maxToRenderPerBatch={4}
                    windowSize={5}
                />
            )}
        </View>
    );
};

export default CustomPostsSection;