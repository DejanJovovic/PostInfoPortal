type WPFeaturedMedia = {
  id?: number;
  source_url: string;
  alt_text?: string;
  caption?: { rendered?: string };
  media_details?: { sizes?: Record<string, { source_url: string }> };
};

type WPEmbeddedAuthor = {
  id?: number;
  name?: string;
};

export type WPPost = {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  date: string;
  link?: string;
  _embedded?: {
    "wp:featuredmedia"?: WPFeaturedMedia[];
    author?: WPEmbeddedAuthor[];
  };
};
