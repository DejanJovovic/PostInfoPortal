import CustomBanner from "@/components/CustomBanner";
import colors from "@/constants/colors";
import { WPPost } from "@/types/wp";
import { Image } from "expo-image";
import React from "react";
import {
  Platform,
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useTheme } from "./ThemeContext";

interface Props {
  categoryName: string;
  posts: WPPost[];
  isHome?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onPostPress: (postId: number, categoryName: string) => void;
  loadingNav?: boolean;
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
  adUrl = "https://example.com",
  adImageUrl = "https://via.placeholder.com/1200x400?text=Ad",
  adTitle = "Test",
  adCta = "Saznaj više",
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (!posts || posts.length === 0) return null;

  const featured = posts[0];
  const nextTwo = posts.slice(1, 3);
  const rest = posts.slice(3);

  const cardBase = {
    backgroundColor: isDark ? colors.black : colors.grey,
    borderColor: isDark ? "#525050" : "#e5e7eb",
  } as const;

  const ShadowNone =
    Platform.OS === "ios"
      ? {
          shadowColor: "transparent",
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
        }
      : { elevation: 0 };

  const getImg = (p: WPPost) => {
    const media = p._embedded?.["wp:featuredmedia"]?.[0];
    if (!media) {
      console.log("No featured media for post:", p.id, p.title.rendered);
      return undefined;
    }
    const sizes = media.media_details?.sizes;
    const imgUrl =
      sizes?.medium?.source_url ||
      sizes?.medium_large?.source_url ||
      sizes?.large?.source_url ||
      media.source_url;
    if (!imgUrl) {
      console.log("No image URL found for post:", p.id, "media:", media);
    }
    return imgUrl;
  };
  const getDate = (p: WPPost) => new Date(p.date).toLocaleDateString("sr-RS");
  const getExcerpt = (p: WPPost) =>
    p.excerpt?.rendered?.replace(/<[^>]+>/g, "") || "";
  const getTitle = (p: WPPost) => p.title?.rendered || "";

  return (
    <View style={{ marginBottom: isHome ? 18 : 6 }}>
      {isHome && (
        <View
          style={{
            backgroundColor: colors.blue,
            alignSelf: "stretch",
            marginHorizontal: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            marginTop: 18,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              color: "#fff",
              fontFamily: "Roboto-Bold",
            }}
          >
            {categoryName}
          </Text>
        </View>
      )}

      <View
        style={{
          paddingBottom: isHome ? 8 : 8,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={loadingNav}
          onPress={() => onPostPress(featured.id, categoryName)}
          style={{ marginHorizontal: 12, marginTop: 10 }}
        >
          <View
            style={[
              {
                borderWidth: 1,
                borderRadius: 16,
                padding: 12,
                ...cardBase,
                overflow: "hidden",
              },
              ShadowNone,
            ]}
          >
            {getImg(featured) && (
              <Image
                source={{ uri: getImg(featured)! }}
                style={{
                  width: "100%",
                  height: 200,
                  borderRadius: 12,
                  marginBottom: 10,
                }}
                contentFit="cover"
                cachePolicy="disk"
                transition={150}
                onError={(error) => {
                  console.warn(
                    "Image failed to load for featured post:",
                    featured.id,
                    error,
                  );
                }}
              />
            )}
            <Text
              numberOfLines={2}
              style={{
                color: isDark ? colors.grey : colors.black,
                fontFamily: "Roboto-ExtraBold",
              }}
            >
              {getTitle(featured)}
            </Text>
            <Text
              style={{
                fontSize: 12,
                marginTop: 4,
                color: colors.darkerGray,
              }}
            >
              {getDate(featured)}
            </Text>
            <Text
              numberOfLines={3}
              style={{
                marginTop: 2,
                color: isDark ? colors.grey : colors.black,
                fontFamily: "Roboto-Light",
              }}
            >
              {getExcerpt(featured)}
            </Text>
          </View>
        </TouchableOpacity>

        {nextTwo.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: 12,
              marginTop: 12,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {nextTwo.map((p) => (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.85}
                disabled={loadingNav}
                onPress={() => onPostPress(p.id, categoryName)}
                style={{ width: "48%" }}
              >
                <View
                  style={[
                    {
                      borderWidth: 1,
                      borderRadius: 16,
                      padding: 10,
                      ...cardBase,
                      overflow: "hidden",
                      marginBottom: 8,
                    },
                    ShadowNone,
                  ]}
                >
                  {getImg(p) && (
                    <Image
                      source={{ uri: getImg(p)! }}
                      style={{
                        width: "100%",
                        height: 110,
                        borderRadius: 12,
                        marginBottom: 8,
                      }}
                      contentFit="cover"
                      cachePolicy="disk"
                      transition={150}
                      onError={(error) => {
                        console.warn(
                          "Image failed to load for post:",
                          p.id,
                          error,
                        );
                      }}
                    />
                  )}
                  <Text
                    numberOfLines={2}
                    style={{
                      color: isDark ? colors.grey : colors.black,
                      fontFamily: "Roboto-ExtraBold",
                    }}
                  >
                    {getTitle(p)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      marginTop: 4,
                      color: colors.darkerGray,
                    }}
                  >
                    {getDate(p)}
                  </Text>
                  <Text
                    numberOfLines={3}
                    style={{
                      marginTop: 2,
                      color: isDark ? colors.grey : colors.black,
                      fontFamily: "Roboto-Light",
                    }}
                  >
                    {getExcerpt(p)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {rest.length > 0 && (
          <View style={{ marginTop: 6 }}>
            {rest.map((p) => (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.85}
                disabled={loadingNav}
                onPress={() => onPostPress(p.id, categoryName)}
                style={{ marginHorizontal: 12, marginTop: 10 }}
              >
                <View
                  style={[
                    {
                      borderWidth: 1,
                      borderRadius: 16,
                      padding: 10,
                      ...cardBase,
                      overflow: "hidden",
                    },
                    ShadowNone,
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    {getImg(p) ? (
                      <Image
                        source={{ uri: getImg(p)! }}
                        style={{
                          flex: 3,
                          alignSelf: "stretch",
                          borderRadius: 10,
                        }}
                        contentFit="cover"
                        cachePolicy="disk"
                        transition={150}
                        onError={(error) => {
                          console.warn(
                            "Image failed to load for post:",
                            p.id,
                            error,
                          );
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          flex: 3,
                          alignSelf: "stretch",
                          backgroundColor: "#ddd",
                          borderRadius: 10,
                        }}
                      />
                    )}

                    <View style={{ flex: 7 }}>
                      <Text
                        numberOfLines={2}
                        style={{
                          color: isDark ? colors.grey : colors.black,
                          fontFamily: "Roboto-ExtraBold",
                        }}
                      >
                        {getTitle(p)}
                      </Text>
                      <Text
                        style={{
                          marginTop: 4,
                          color: colors.darkerGray,
                          fontSize: 12,
                        }}
                      >
                        {getDate(p)}
                      </Text>
                      <Text
                        numberOfLines={3}
                        style={{
                          marginTop: 2,
                          color: isDark ? colors.grey : colors.black,
                          fontFamily: "Roboto-Light",
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

        {adAtEnd && <CustomBanner url={adUrl} imageSrc={adImageUrl} />}
      </View>
    </View>
  );
};

export default React.memo(CustomPostsSection);
