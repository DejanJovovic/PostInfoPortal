import images from '@/constants/images';
import type { AdItem } from '@/types/ad';

export const AD_POOL: Readonly<AdItem[]> = [
    { url: 'https://a1.rs/privatni',         imageSrc: images.a1,        title: 'A1 Srbija',      cta: 'Saznaj više' },
    { url: 'https://www.yettel.rs/',         imageSrc: images.yettel,    title: 'Yettel Srbija',  cta: 'Saznaj više' },
    { url: 'https://www.dexy.co.rs/',        imageSrc: images.dexyco,    title: 'Dexyco',         cta: 'Saznaj više' },
    { url: 'https://www.sportvision.rs/',    imageSrc: images.sportvision,title: 'Sportvision',    cta: 'Saznaj više' },
    { url: 'https://www.knjizare-vulkan.rs/',imageSrc: images.vulkan,     title: 'Vulkan',         cta: 'Saznaj više' },
] as const;

export const pickRandomAd = (): AdItem =>
    AD_POOL[Math.floor(Math.random() * AD_POOL.length)];