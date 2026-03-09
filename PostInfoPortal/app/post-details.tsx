import { getPostByIdFull } from "@/utils/wpApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import RenderHTML, {
  HTMLContentModel,
  HTMLElementModel,
} from "react-native-render-html";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import BottomAdBanner from "@/components/BottomAdBanner";
import CustomFooter from "@/components/CustomFooter";
import CustomHeader from "@/components/CustomHeader";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useTheme } from "@/components/ThemeContext";
import { pickRandomAd } from "@/constants/ads";
import colors from "@/constants/colors";
import icons from "@/constants/icons";
import {
  getFeaturedMediaCaptionText,
  getPostTitleText,
} from "@/hooks/postsUtils";
import { getInbox, type InboxItem } from "@/types/notificationInbox";
import { WPPost } from "@/types/wp";

const deriveCategoryName = (post: any): string | undefined => {
  const groups = post?._embedded?.["wp:term"];
  if (Array.isArray(groups)) {
    const flat = groups.flat().filter(Boolean);
    const cat = flat.find((t: any) => t?.taxonomy === "category" && t?.name);
    if (cat?.name) return String(cat.name);
  }
  return undefined;
};

const postDetailsCacheKey = (id: number) => `postDetailsCache:${id}`;

const DEFAULT_EMBED_ASPECT_RATIO = 16 / 9;
const APP_REFERRER_URL = "https://www.postinfo.rs/";
const APP_WIDGET_REFERRER = "https://www.postinfo.rs/post-details";

const parseEmbedNumericAttr = (value?: string) => {
  if (!value) return undefined;
  const parsed = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const normalizeUrl = (raw?: string) => {
  if (!raw || typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
};

const extractYoutubeId = (url: URL) => {
  const host = url.hostname.toLowerCase();

  if (host.includes("youtu.be")) {
    return url.pathname.split("/").filter(Boolean)[0];
  }
  if (!host.includes("youtube.com") && !host.includes("youtube-nocookie.com")) {
    return undefined;
  }
  if (url.pathname.startsWith("/watch"))
    return url.searchParams.get("v") || undefined;
  if (url.pathname.startsWith("/shorts/"))
    return url.pathname.split("/shorts/")[1];
  if (url.pathname.startsWith("/live/")) return url.pathname.split("/live/")[1];
  if (url.pathname.includes("/embed/")) return url.pathname.split("/embed/")[1];
  return undefined;
};

const stripYoutubeId = (value?: string | null) => {
  if (!value) return undefined;
  const clean = String(value).split(/[?&#/]/)[0];
  return clean || undefined;
};

const getEmbedTarget = (raw?: string) => {
  const src = normalizeUrl(raw);
  if (!src) return undefined;

  try {
    const parsed = new URL(src);
    const host = parsed.hostname.toLowerCase();
    const isYoutube =
      host.includes("youtube.com") ||
      host.includes("youtube-nocookie.com") ||
      host.includes("youtu.be");

    if (!isYoutube) {
      return {
        embedUrl: src,
        externalUrl: src,
        isYoutube: false,
      };
    }

    const videoId = stripYoutubeId(extractYoutubeId(parsed));
    if (!videoId) {
      return {
        embedUrl: src,
        externalUrl: src,
        isYoutube: true,
      };
    }

    const query = new URLSearchParams({
      playsinline: "1",
      rel: "0",
      origin: APP_REFERRER_URL.replace(/\/$/, ""),
      widget_referrer: APP_WIDGET_REFERRER,
    });

    return {
      embedUrl: `https://www.youtube.com/embed/${videoId}?${query.toString()}`,
      externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      isYoutube: true,
    };
  } catch {
    return {
      embedUrl: src,
      externalUrl: src,
      isYoutube: false,
    };
  }
};

const simplifyPostForDetailsCache = (post: any) => ({
  id: post?.id,
  title: post?.title,
  content: post?.content,
  excerpt: post?.excerpt,
  date: post?.date,
  modified: post?.modified,
  link: post?.link,
  _embedded: {
    "wp:featuredmedia": post?._embedded?.["wp:featuredmedia"],
    "wp:term": post?._embedded?.["wp:term"],
  } as any,
});

const persistPostDetailsToCache = async (id: number, post: WPPost | any) => {
  try {
    const payload = {
      data: simplifyPostForDetailsCache(post),
      timestamp: Date.now(),
    };
    const jsonString = JSON.stringify(payload);

    if (jsonString.length > 1000000) {
      console.warn("postDetails cache too large, skipping save");
      return;
    }

    await AsyncStorage.setItem(postDetailsCacheKey(id), jsonString);
  } catch (e) {
    console.warn("Failed to persist postDetails cache:", e);
  }
};

type PreviewFromNotification = {
  title?: string;
  message?: string;
  imageUrl?: string;
  receivedAt?: number;
  categoryName?: string;
};

const PostDetails = () => {
  const { width } = useWindowDimensions();
  const horizontalContentPadding = useMemo(
    () => Math.max(16, Math.round(width * 0.05)),
    [width],
  );
  const contentWidth = useMemo(
    () => Math.max(0, width - horizontalContentPadding * 2),
    [width, horizontalContentPadding],
  );

  const { postId, category } = useLocalSearchParams<{
    postId?: string;
    category?: string;
  }>();
  const router = useRouter();

  const categoryParam = Array.isArray(category) ? category[0] : category;
  const decodedCategoryParam = categoryParam
    ? decodeURIComponent(categoryParam)
    : undefined;
  const [activeCategory, setActiveCategory] = useState<string>(
    decodedCategoryParam || "",
  );
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [postData, setPostData] = useState<WPPost | any | null>(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  const [preview, setPreview] = useState<PreviewFromNotification | null>(null);

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const htmlTextColor = isDark ? "#ffffff" : "#000000";

  const tagsStyles = useMemo(
    () => ({
      body: { color: htmlTextColor, fontSize: 20 },
      p: { color: htmlTextColor, fontSize: 20 },
      span: { color: htmlTextColor },
      li: { color: htmlTextColor },
      h1: { color: htmlTextColor },
      h2: { color: htmlTextColor },
      h3: { color: htmlTextColor },
      a: { color: "#1d4ed8" },
      figure: { marginTop: 12, marginBottom: 12 },
      img: { marginTop: 12, marginBottom: 12 },
    }),
    [htmlTextColor],
  );

  const customHTMLElementModels = useMemo(
    () => ({
      iframe: HTMLElementModel.fromCustomModel({
        tagName: "iframe",
        contentModel: HTMLContentModel.block,
      }),
    }),
    [],
  );

  const htmlRenderers = useMemo(
    () => ({
      iframe: ({ tnode }: any) => {
        const embed = getEmbedTarget(tnode?.attributes?.src);
        if (!embed?.embedUrl) return null;

        const embedWidth = parseEmbedNumericAttr(tnode?.attributes?.width);
        const embedHeight = parseEmbedNumericAttr(tnode?.attributes?.height);
        const aspectRatio =
          embedWidth && embedHeight
            ? embedWidth / embedHeight
            : DEFAULT_EMBED_ASPECT_RATIO;

        const baseEmbedUrl = embed.embedUrl.split("?")[0];

        return (
          <View
            style={{
              width: "100%",
              aspectRatio,
              borderRadius: 8,
              overflow: "hidden",
              marginTop: 12,
              marginBottom: 12,
            }}
          >
            <WebView
              source={{
                uri: embed.embedUrl,
                headers: embed.isYoutube ? { Referer: APP_REFERRER_URL } : {},
              }}
              style={{ flex: 1 }}
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              setSupportMultipleWindows={false}
              onShouldStartLoadWithRequest={(request) => {
                const next = normalizeUrl(request?.url);
                if (!next || next === "about:blank") return true;
                if (
                  typeof (request as any)?.isTopFrame === "boolean" &&
                  (request as any).isTopFrame === false
                ) {
                  return true;
                }

                if (next.startsWith(baseEmbedUrl) || next.includes("/embed/")) {
                  return true;
                }

                if (!embed.isYoutube) return true;

                const nextTarget = getEmbedTarget(next);
                if (!nextTarget?.isYoutube) return true;
                const external =
                  nextTarget?.externalUrl ||
                  embed.externalUrl ||
                  APP_REFERRER_URL;

                Linking.openURL(external).catch((err) => {
                  console.warn("Failed to open external video URL:", err);
                });
                return false;
              }}
            />
          </View>
        );
      },
    }),
    [],
  );

  const [bottomAdVisible, setBottomAdVisible] = useState(false);
  const [bottomAd, setBottomAd] = useState(() => pickRandomAd());

  const adTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAdTimer = () => {
    if (adTimerRef.current) {
      clearTimeout(adTimerRef.current);
      adTimerRef.current = null;
    }
  };

  const scheduleAd = useCallback((ms: number) => {
    clearAdTimer();
    adTimerRef.current = setTimeout(() => {
      setBottomAd(pickRandomAd());
      setBottomAdVisible(true);
    }, ms);
  }, []);

  const dismissBottomAd = () => {
    setBottomAdVisible(false);
    scheduleAd(10000);
  };

  useEffect(() => {
    scheduleAd(5000);
    return () => clearAdTimer();
  }, [scheduleAd]);

  useEffect(() => {
    const unsub = navigation.addListener("blur", () => setIsLoading(false));
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
        if (!idRaw) throw new Error("Nedostaje ID objave");
        const idNum = parseInt(String(idRaw), 10);
        if (!Number.isFinite(idNum)) throw new Error("Neispravan ID objave");

        const detailsRaw = await AsyncStorage.getItem(
          postDetailsCacheKey(idNum),
        );
        if (detailsRaw) {
          try {
            const parsed = JSON.parse(detailsRaw);
            const cachedFull = parsed?.data ?? parsed;
            if (cachedFull?.id) {
              setPostData(cachedFull);
              const derived = deriveCategoryName(cachedFull);
              if (
                derived &&
                (!activeCategory || activeCategory === "Naslovna")
              ) {
                setActiveCategory(derived);
              }

              getPostByIdFull(idNum)
                .then((full) => {
                  if (full && full.id) {
                    setPostData(full);
                    persistPostDetailsToCache(idNum, full).catch(() => {});
                  }
                })
                .catch(() => {});

              setLoadingPost(false);
              return;
            }
          } catch {}
        }

        const cacheRaw = await AsyncStorage.getItem("groupedPostsCache");
        if (cacheRaw) {
          const { data } = JSON.parse(cacheRaw || "{}");
          const allPosts = Object.values(data ?? {}).flat() as WPPost[];
          const cached = allPosts.find((p) => p.id === idNum);
          if (cached) {
            setPostData(cached);
            const derived = deriveCategoryName(cached);
            if (derived && (!activeCategory || activeCategory === "Naslovna")) {
              setActiveCategory(derived);
            }
            getPostByIdFull(idNum)
              .then((full) => {
                if (full && full.id) {
                  setPostData(full);
                  persistPostDetailsToCache(idNum, full).catch(() => {});
                }
              })
              .catch(() => {});
            setLoadingPost(false);
            return;
          }
        }

        const inbox = await getInbox();
        const match: InboxItem | undefined = inbox.find(
          (i) => String(i.postId) === String(idNum),
        );

        if (match) {
          const previewCategory = (match as any).categoryName || "";
          setPreview({
            title: match.title,
            message: match.message,
            imageUrl: match.imageUrl,
            receivedAt: match.receivedAt,
            categoryName: previewCategory || undefined,
          });
          if (!activeCategory) {
            setActiveCategory(
              previewCategory || decodedCategoryParam || "Naslovna",
            );
          }
          return;
        }

        const json = await getPostByIdFull(idNum);
        if (!json || !json.id) throw new Error("Objava nije pronađena");

        setPostData(json);
        persistPostDetailsToCache(idNum, json).catch(() => {});

        const derived = deriveCategoryName(json);
        if (derived && (!activeCategory || activeCategory === "Naslovna")) {
          setActiveCategory(derived);
        }
      } catch (e: any) {
        console.warn("Greška pri učitavanju objave:", e?.message ?? e);
        setError("Nije moguće učitati objavu. Pokušajte ponovo.");
      } finally {
        setLoadingPost(false);
      }
    };

    loadPost();
  }, [postId, activeCategory, decodedCategoryParam]);

  useEffect(() => {
    const check = async () => {
      const saved = await AsyncStorage.getItem("favorites");
      const idRaw = Array.isArray(postId) ? postId[0] : postId;
      const idNum = parseInt(String(idRaw || ""), 10);
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
      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace("/");
    });
  };

  const formattedDate = preview?.receivedAt
    ? new Date(preview.receivedAt).toLocaleDateString("sr-RS", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      })
    : postData?.date
      ? new Date(postData.date).toLocaleDateString("sr-RS", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        })
      : undefined;

  const image =
    preview?.imageUrl ||
    postData?._embedded?.["wp:featuredmedia"]?.[0]?.source_url;

  const imageCaption = getFeaturedMediaCaptionText(
    postData as WPPost | undefined,
  );

  const toggleBookmark = async () => {
    try {
      const idRaw = Array.isArray(postId) ? postId[0] : postId;
      const idNum = parseInt(String(idRaw || ""), 10);
      if (!idNum) return;

      const saved = await AsyncStorage.getItem("favorites");
      let favorites = saved ? JSON.parse(saved) : [];

      if (isBookmarked) {
        favorites = favorites.filter((item: any) => item.id !== idNum);
        await AsyncStorage.setItem("favorites", JSON.stringify(favorites));
        setIsBookmarked(false);
        Alert.alert(
          "Obaveštenje",
          "Post uklonjen iz omiljenih",
          [{ text: "OK" }],
          {
            cancelable: true,
          },
        );
      } else {
        const categoryToSave =
          (postData ? deriveCategoryName(postData) : undefined) ||
          preview?.categoryName ||
          (activeCategory && activeCategory !== "Naslovna"
            ? activeCategory
            : undefined) ||
          "Naslovna";

        const toSave =
          postData && postData.id
            ? { ...postData, category: categoryToSave }
            : {
                id: idNum,
                title: { rendered: preview?.title || "Objava" },
                content: { rendered: "" },
                excerpt: { rendered: preview?.message || "" },
                date: preview?.receivedAt
                  ? new Date(preview.receivedAt).toISOString()
                  : new Date().toISOString(),
                _embedded: image
                  ? { "wp:featuredmedia": [{ source_url: image }] }
                  : undefined,
                link: `https://www.postinfo.rs/?p=${idNum}`,
                category: categoryToSave,
              };

        favorites.push(toSave);
        await AsyncStorage.setItem("favorites", JSON.stringify(favorites));
        setIsBookmarked(true);
        Alert.alert("Obaveštenje", "Post dodat u omiljene", [{ text: "OK" }], {
          cancelable: true,
        });
      }
    } catch (e) {
      console.error("Greška pri čuvanju omiljenih:", e);
    }
  };

  const handleShare = async (platform: string) => {
    const idRaw = Array.isArray(postId) ? postId[0] : postId;
    const idNum = parseInt(String(idRaw || ""), 10);
    if (!idNum) return;

    const linkToShare = postData?.link || `https://www.postinfo.rs/?p=${idNum}`;
    const postTitle =
      getPostTitleText(postData as WPPost | undefined) || preview?.title || "";

    if (!linkToShare) {
      Alert.alert("Greška", "Nema linka za deljenje.");
      return;
    }

    try {
      let url = "";

      switch (platform) {
        case "facebook":
        case "twitter":
        case "x":
          await Share.share({
            message: linkToShare,
            url: linkToShare,
            title: postTitle,
          });
          return;

        case "linkedin":
          url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
            linkToShare,
          )}`;
          break;

        case "mail":
          url = `mailto:?subject=${encodeURIComponent(postTitle)}&body=${encodeURIComponent(
            linkToShare,
          )}`;
          break;

        case "whatsapp":
          url = `whatsapp://send?text=${encodeURIComponent(postTitle + " " + linkToShare)}`;
          break;

        default:
          return;
      }

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Aplikacija nije dostupna",
          `Izgleda da aplikacija za ${platform} nije instalirana ili ne podržava deljenje sa ovog uređaja.`,
        );
      }
    } catch (error) {
      console.error("Greška pri deljenju:", error);
      Alert.alert("Greška", "Nije moguće izvršiti deljenje.");
    }
  };

  const handleCategorySelected = (cat: string) => {
    setActiveCategory(cat);
    router.replace({ pathname: "/", params: { selectedCategory: cat } });
  };

  if (loadingPost) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: isDark ? colors.black : colors.grey }}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? colors.grey : colors.black}
        />
        <Text
          className="mt-4"
          style={{
            color: isDark ? colors.grey : colors.black,
            fontFamily: "Roboto-Regular",
          }}
        >
          Učitavanje objave...
        </Text>
      </SafeAreaView>
    );
  }

  if ((error && !preview && !postData) || (!preview && !postData)) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: isDark ? colors.black : colors.grey }}
      >
        <Text
          className="text-center"
          style={{
            color: isDark ? colors.grey : colors.black,
            fontFamily: "Roboto-Regular",
          }}
        >
          {error || "Objava nije pronađena."}
        </Text>
      </SafeAreaView>
    );
  }

  if (preview && !postData) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: isDark ? colors.black : colors.grey }}
      >
        <CustomHeader
          onMenuToggle={() => {}}
          onCategorySelected={handleCategorySelected}
          activeCategory={activeCategory || preview.categoryName || "Naslovna"}
          showMenu={false}
          onBackPress={handleBackWithLoading}
          loadingNav={isLoading}
        />

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: horizontalContentPadding,
            paddingTop: 16,
            paddingBottom: bottomAdVisible ? 220 : 120,
          }}
        >
          {preview.imageUrl && (
            <ExpoImage
              source={{ uri: preview.imageUrl }}
              style={{
                width: "100%",
                height: 240,
                borderRadius: 6,
                marginBottom: 16,
              }}
              contentFit="cover"
              cachePolicy="disk"
            />
          )}

          <View className="flex-row justify-between items-start mb-2">
            <Text
              className="text-xl flex-1 pr-4"
              style={{
                fontSize: 24,
                color: isDark ? colors.grey : colors.black,
                fontFamily: "Roboto-ExtraBold",
              }}
            >
              {preview.title || "Objava"}
            </Text>
            <TouchableOpacity onPress={toggleBookmark}>
              <Image
                source={icons.bookmark}
                style={{
                  width: 24,
                  height: 24,
                  tintColor: isBookmarked
                    ? colors.red
                    : isDark
                      ? colors.grey
                      : colors.black,
                }}
              />
            </TouchableOpacity>
          </View>

          <Text
            className="text-sm mt-1 mb-1"
            style={{
              color: colors.darkerGray,
              fontSize: 12,
            }}
          >
            {preview.receivedAt
              ? new Date(preview.receivedAt).toLocaleDateString("sr-RS", {
                  year: "numeric",
                  month: "numeric",
                  day: "numeric",
                })
              : "-"}
          </Text>

          <View className="flex-row justify-around items-center mt-5 mb-5 px-4">
            {[
              { icon: icons.facebook, platform: "facebook" },
              { icon: icons.twitter, platform: "x" },
              { icon: icons.linkedin, platform: "linkedin" },
              { icon: icons.mail, platform: "mail" },
              { icon: icons.whatsapp, platform: "whatsapp" },
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

          {!!preview.message && (
            <Text
              style={{
                color: isDark ? colors.grey : colors.black,
                fontFamily: "Roboto-Regular",
                fontSize: 20,
                lineHeight: 22,
              }}
            >
              {preview.message}
            </Text>
          )}
        </ScrollView>
        <CustomFooter />

        <BottomAdBanner
          visible={bottomAdVisible}
          ad={bottomAd}
          onClose={dismissBottomAd}
        />
      </SafeAreaView>
    );
  }

  const titleRendered = getPostTitleText(postData as WPPost | undefined);
  const contentRendered =
    postData?.content?.rendered ?? postData?.excerpt?.rendered ?? "";

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: isDark ? colors.black : colors.grey }}
    >
      <CustomHeader
        onMenuToggle={() => {}}
        onCategorySelected={handleCategorySelected}
        activeCategory={activeCategory || "Naslovna"}
        showMenu={false}
        onBackPress={handleBackWithLoading}
        loadingNav={isLoading}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: horizontalContentPadding,
          paddingTop: 16,
          paddingBottom: bottomAdVisible ? 220 : 120,
        }}
      >
        {image && (
          <ExpoImage
            source={{ uri: image }}
            style={{
              width: "100%",
              height: 240,
              borderRadius: 6,
              marginBottom: 16,
            }}
            contentFit="cover"
            cachePolicy="disk"
          />
        )}

        <View className="flex-row justify-between items-start mb-2">
          <Text
            className="text-xl flex-1 pr-4"
            style={{
              fontSize: 24,
              color: isDark ? colors.grey : colors.black,
              fontFamily: "Roboto-ExtraBold",
            }}
          >
            {titleRendered}
          </Text>
          <TouchableOpacity onPress={toggleBookmark}>
            <Image
              source={icons.bookmark}
              style={{
                width: 24,
                height: 24,
                tintColor: isBookmarked
                  ? colors.red
                  : isDark
                    ? colors.grey
                    : colors.black,
              }}
            />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-between mb-3">
          <Text
            className="text-sm"
            style={{
              color: colors.darkerGray,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {formattedDate || "-"}
          </Text>
          {!!imageCaption && (
            <Text
              className="text-sm"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{
                color: colors.darkerGray,
                fontSize: 12,
                marginLeft: 12,
                textAlign: "right",
                flexShrink: 1,
                minWidth: 0,
                maxWidth: "70%",
              }}
            >
              {imageCaption}
            </Text>
          )}
        </View>

        <View className="flex-row justify-around items-center mt-5 mb-5 px-4">
          {[
            { icon: icons.facebook, platform: "facebook" },
            { icon: icons.twitter, platform: "x" },
            { icon: icons.linkedin, platform: "linkedin" },
            { icon: icons.mail, platform: "mail" },
            { icon: icons.whatsapp, platform: "whatsapp" },
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

        <View style={{ marginTop: 24 }}>
          <RenderHTML
            contentWidth={contentWidth}
            source={{ html: contentRendered }}
            tagsStyles={tagsStyles}
            customHTMLElementModels={customHTMLElementModels}
            renderers={htmlRenderers}
          />
        </View>
      </ScrollView>
      {isLoading && <LoadingOverlay isDark={isDark} message="Učitavanje..." />}
      <CustomFooter />

      <BottomAdBanner
        visible={bottomAdVisible}
        ad={bottomAd}
        onClose={dismissBottomAd}
      />
    </SafeAreaView>
  );
};

export default PostDetails;
