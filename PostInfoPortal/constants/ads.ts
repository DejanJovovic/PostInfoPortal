import images from '@/constants/images';
import type { AdItem } from '@/types/ad';

export const AD_POOL: Readonly<AdItem[]> = [
    {
        url: 'https://www.instagram.com/brunch.rs/',
        imageSrc: images.brunch
    },
    {
        url: 'https://www.dotnetworks.rs/',
        imageSrc: images.dotNetworks},
    {
        url: 'https://www.maneks.rs/',
        imageSrc: images.maneks},
    {
        url: 'https://novakinvest.rs/',
        imageSrc: images.novakInvest
    }
] as const;

export const pickRandomAd = (): AdItem =>
    AD_POOL[Math.floor(Math.random() * AD_POOL.length)];