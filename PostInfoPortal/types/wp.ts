export type WPPost = {
    id: number;
    title: { rendered: string };
    excerpt: { rendered: string };
    content: { rendered: string };
    date: string;
    _embedded?: {
        'wp:featuredmedia'?: { source_url: string; media_details?: { sizes?: Record<string, { source_url: string }> } }[];
    };
};
