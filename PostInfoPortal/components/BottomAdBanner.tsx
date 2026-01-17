import CustomBanner from "@/components/CustomBanner";
import type { AdItem } from "@/types/ad";
import React from "react";
import { StyleSheet, View } from "react-native";

type BottomAdBannerProps = {
  visible: boolean;
  ad: AdItem;
  onClose: () => void;
  bottomOffset?: number;
  zIndex?: number;
};

const BottomAdBanner = ({
  visible,
  ad,
  onClose,
  bottomOffset = 84,
  zIndex,
}: BottomAdBannerProps) => {
  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          justifyContent: "flex-end",
          alignItems: "center",
          ...(zIndex ? { zIndex } : null),
        },
      ]}
    >
      <View
        style={{
          width: "100%",
          paddingHorizontal: 8,
          marginBottom: bottomOffset,
        }}
      >
        <CustomBanner
          url={ad.url}
          imageSrc={ad.imageSrc}
          videoSrc={ad.videoSrc}
          onClose={onClose}
        />
      </View>
    </View>
  );
};

export default BottomAdBanner;
