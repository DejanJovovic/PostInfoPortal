import type { ImageSourcePropType } from 'react-native';
import type { VideoSource } from 'expo-video';

export interface AdItem {
    url: string;
    imageSrc?: ImageSourcePropType | string;
    videoSrc?: VideoSource;
}

