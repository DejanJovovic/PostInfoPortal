import { pickRandomAd } from "@/constants/ads";
import type { AdItem } from "@/types/ad";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import CustomBanner from "./CustomBanner";

type RotatingAdBannerProps = {
  containerStyle?: StyleProp<ViewStyle>;
  initialAd?: AdItem;
  reappearDelayMs?: number;
  reappearMinDelayMs?: number;
  reappearMaxDelayMs?: number;
};

const DEFAULT_REAPPEAR_DELAY_MS = 10000;

const resolveDelay = (
  reappearDelayMs: number,
  reappearMinDelayMs?: number,
  reappearMaxDelayMs?: number,
) => {
  if (
    typeof reappearMinDelayMs === "number" &&
    typeof reappearMaxDelayMs === "number" &&
    reappearMaxDelayMs >= reappearMinDelayMs
  ) {
    const span = reappearMaxDelayMs - reappearMinDelayMs;
    return reappearMinDelayMs + Math.floor(Math.random() * (span + 1));
  }
  return reappearDelayMs;
};

const RotatingAdBanner: React.FC<RotatingAdBannerProps> = ({
  containerStyle,
  initialAd,
  reappearDelayMs = DEFAULT_REAPPEAR_DELAY_MS,
  reappearMinDelayMs,
  reappearMaxDelayMs,
}) => {
  const [ad, setAd] = useState<AdItem>(() => initialAd ?? pickRandomAd());
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onClose = useCallback(() => {
    setVisible(false);
    clearTimer();

    const delay = resolveDelay(
      reappearDelayMs,
      reappearMinDelayMs,
      reappearMaxDelayMs,
    );

    timerRef.current = setTimeout(() => {
      setAd(pickRandomAd());
      setVisible(true);
      timerRef.current = null;
    }, delay);
  }, [clearTimer, reappearDelayMs, reappearMaxDelayMs, reappearMinDelayMs]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  if (!visible) return null;

  return (
    <View style={containerStyle}>
      <CustomBanner
        url={ad.url}
        imageSrc={ad.imageSrc}
        videoSrc={ad.videoSrc}
        onClose={onClose}
      />
    </View>
  );
};

export default RotatingAdBanner;
