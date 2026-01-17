export type OneSignalLike = {
  additionalData?: Record<string, any>;
  launchURL?: string;
  rawPayload?: { custom?: { u?: string } };
  [k: string]: any;
};

export const extractPostId = (
  n?: OneSignalLike,
  evt?: any,
): string | undefined => {
  const fromData = n?.additionalData?.postId;
  if (fromData) return String(fromData);

  const lu =
    evt?.notification?.launchURL ??
    n?.launchURL ??
    n?.additionalData?.app_url ??
    n?.rawPayload?.custom?.u;

  if (!lu || typeof lu !== "string") return undefined;

  try {
    const qs = lu.split("?")[1] ?? "";
    const pid = new URLSearchParams(qs).get("postId");
    if (pid) return String(pid);
  } catch {}

  const m = lu.match(/[?&]p=(\d+)/);
  if (m?.[1]) return m[1];

  return undefined;
};

export const extractCategoryName = (
  n?: OneSignalLike,
  evt?: any,
): string | undefined => {
  const fromData =
    n?.additionalData?.category || n?.additionalData?.categoryName;
  if (fromData) return String(fromData);

  const lu =
    evt?.notification?.launchURL ??
    n?.launchURL ??
    n?.additionalData?.app_url ??
    n?.rawPayload?.custom?.u;

  if (!lu || typeof lu !== "string") return undefined;

  try {
    const qs = lu.split("?")[1] ?? "";
    const cat = new URLSearchParams(qs).get("category");
    if (cat) return String(cat);
  } catch {}

  return undefined;
};

export const getDeepLinkUrl = (
  n?: OneSignalLike,
  evt?: any,
): string | undefined => {
  return (
    evt?.notification?.launchURL ??
    n?.launchURL ??
    n?.additionalData?.app_url ??
    n?.rawPayload?.custom?.u
  );
};
