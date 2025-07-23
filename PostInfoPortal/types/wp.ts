export type WPPost = {
    id: number;
    title: { rendered: string };
    excerpt: { rendered: string };
    content: { rendered: string };
    _embedded?: {
        'wp:featuredmedia'?: { source_url: string }[];
    };
};