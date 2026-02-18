import { useTheme } from "@/components/ThemeContext";
import { VideoView, useVideoPlayer, type VideoSource } from "expo-video";
import { X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ImageBackground,
  ImageSourcePropType,
  Linking,
  Platform,
  Image as RNImage,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

type CustomBannerProps = {
  url: string;
  imageSrc?: string | ImageSourcePropType;
  videoSrc?: VideoSource;
  onClose?: () => void;
};

type BannerVideoProps = {
  source: VideoSource;
};

const DEFAULT_MEDIA_ASPECT_RATIO = 16 / 9;

const BannerVideo = ({ source }: BannerVideoProps) => {
  const player = useVideoPlayer(source, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  useEffect(() => {
    player.play();
  }, [player]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      surfaceType={Platform.OS === "android" ? "textureView" : undefined}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
    />
  );
};

export default function CustomBanner({
  url,
  imageSrc,
  videoSrc,
  onClose,
}: CustomBannerProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [visible, setVisible] = useState(true);
  const [mediaAspectRatio, setMediaAspectRatio] = useState(
    DEFAULT_MEDIA_ASPECT_RATIO,
  );

  const imgSource: ImageSourcePropType | undefined = useMemo(
    () => (typeof imageSrc === "string" ? { uri: imageSrc } : imageSrc),
    [imageSrc],
  );

  const hasVideo = Boolean(videoSrc);

  useEffect(() => {
    let cancelled = false;

    const setRatio = (width?: number, height?: number) => {
      if (cancelled) return;
      if (
        !width ||
        !height ||
        !Number.isFinite(width) ||
        !Number.isFinite(height)
      ) {
        setMediaAspectRatio(DEFAULT_MEDIA_ASPECT_RATIO);
        return;
      }
      setMediaAspectRatio(width / height);
    };

    const resolveLocalAspect = (source: number) => {
      const resolved = RNImage.resolveAssetSource(source);
      setRatio(resolved?.width, resolved?.height);
    };

    if (hasVideo && videoSrc) {
      if (typeof videoSrc === "number") {
        resolveLocalAspect(videoSrc);
      } else if (
        typeof (videoSrc as any)?.width === "number" &&
        typeof (videoSrc as any)?.height === "number"
      ) {
        setRatio((videoSrc as any).width, (videoSrc as any).height);
      } else if (typeof (videoSrc as any)?.uri === "number") {
        resolveLocalAspect((videoSrc as any).uri);
      } else {
        setMediaAspectRatio(DEFAULT_MEDIA_ASPECT_RATIO);
      }
      return () => {
        cancelled = true;
      };
    }

    if (!imageSrc) {
      setMediaAspectRatio(DEFAULT_MEDIA_ASPECT_RATIO);
      return () => {
        cancelled = true;
      };
    }

    if (typeof imageSrc === "string") {
      RNImage.getSize(
        imageSrc,
        (width, height) => setRatio(width, height),
        () => setMediaAspectRatio(DEFAULT_MEDIA_ASPECT_RATIO),
      );
    } else if (typeof imageSrc === "number") {
      resolveLocalAspect(imageSrc);
    } else if (
      typeof (imageSrc as any)?.uri === "string" &&
      (imageSrc as any).uri.length > 0
    ) {
      RNImage.getSize(
        (imageSrc as any).uri,
        (width, height) => setRatio(width, height),
        () => setMediaAspectRatio(DEFAULT_MEDIA_ASPECT_RATIO),
      );
    } else {
      setMediaAspectRatio(DEFAULT_MEDIA_ASPECT_RATIO);
    }

    return () => {
      cancelled = true;
    };
  }, [hasVideo, imageSrc, videoSrc]);

  const open = async () => {
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.warn("Failed to open URL:", e);
    }
  };

  const handleClose = () => {
    setVisible(false);
    onClose?.();
  };

  if (!visible) return null;

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginTop: 5,
        borderWidth: 1,
        borderRadius: 16,
        overflow: "hidden",
        borderColor: isDark ? "#525050" : "#e5e7eb",
        backgroundColor: isDark ? "#0f0f0f" : "#fff",
        ...(Platform.OS === "android" ? { elevation: 0 } : {}),
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={open}
        style={{ width: "100%", aspectRatio: mediaAspectRatio }}
      >
        {hasVideo && videoSrc ? (
          <BannerVideo source={videoSrc} />
        ) : (
          <ImageBackground
            source={
              imgSource ?? {
                uri: "https://via.placeholder.com/1200x400?text=Ad",
              }
            }
            style={[
              StyleSheet.absoluteFillObject,
              { justifyContent: "flex-end" },
            ]}
            resizeMode="cover"
          />
        )}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "rgba(0,0,0,0.18)" },
          ]}
        />

        <TouchableOpacity
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 10,
            backgroundColor: "rgba(0,0,0,0.5)",
            borderRadius: 16,
            padding: 4,
          }}
        >
          <X size={16} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}
