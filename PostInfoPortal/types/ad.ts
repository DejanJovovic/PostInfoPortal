import type { ImageSourcePropType } from 'react-native';

export interface AdItem {
    url: string;
    cta: string;
    /** Može biti lokalni asset (require/import) ili remote URL string */
    imageSrc: ImageSourcePropType | string;
}