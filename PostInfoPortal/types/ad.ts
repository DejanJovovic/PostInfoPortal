import type { VideoSource } from "expo-video";
import type { ImageSourcePropType } from "react-native";

export interface AdItem {
  url: string;
  imageSrc?: ImageSourcePropType | string;
  videoSrc?: VideoSource;
}
