import { addToInbox } from "@/types/notificationInbox";
import {
  extractCategoryName,
  extractPostId,
  getDeepLinkUrl,
} from "@/types/notificationParsing";
import { routeFromUrl, RouteTarget } from "@/types/routeDeepLink";
import * as Linking from "expo-linking";
import React from "react";
import { LogLevel, OneSignal } from "react-native-onesignal";

type UseOneSignalDeepLinksOpts = {
  navigate: (to: RouteTarget) => void;
  onesignalAppId: string;
  debug?: boolean;
};

export const useOneSignalDeepLinks = ({
  navigate,
  onesignalAppId,
  debug,
}: UseOneSignalDeepLinksOpts) => {
  const lastHandledUrl = { current: null as string | null };

  React.useEffect(() => {
    if (debug) OneSignal.Debug.setLogLevel(LogLevel.Verbose);

    OneSignal.initialize(onesignalAppId);

    OneSignal.Notifications.requestPermission(true);

    const handleClick = (event: any) => {
      const n = event?.notification;
      const postId = extractPostId(n, event);
      const categoryName = extractCategoryName(n, event);
      const deepLinkUrl = getDeepLinkUrl(n, event);

      try {
        addToInbox({
          id: `${Date.now()}-${Math.random()}`,
          oneSignalId: n?.notificationId ?? n?.id,
          title: n?.title,
          message: n?.body,
          postId,
          categoryName,
          deepLinkUrl,
          imageUrl: (n as any)?.image,
          receivedAt: Date.now(),
          read: true,
        });
      } catch {}

      if (postId) {
        navigate({
          pathname: "/post-details",
          params: {
            postId,
            ...(categoryName ? { category: categoryName } : {}),
          },
        });
      } else if (deepLinkUrl) {
        routeFromUrl(deepLinkUrl, navigate, lastHandledUrl);
      }
    };

    const handleForeground = (evt: any) => {
      const n = evt?.notification;
      if (!n) return;

      const postId = extractPostId(n, evt);
      const categoryName = extractCategoryName(n, evt);
      const deepLinkUrl = getDeepLinkUrl(n, evt);

      try {
        addToInbox({
          id: `${Date.now()}-${Math.random()}`,
          oneSignalId: n?.notificationId ?? n?.id,
          title: n?.title,
          message: n?.body,
          postId,
          categoryName,
          deepLinkUrl,
          imageUrl: (n as any)?.image,
          receivedAt: Date.now(),
          read: false,
        });
      } catch {}
    };

    OneSignal.Notifications.addEventListener("click", handleClick);
    OneSignal.Notifications.addEventListener(
      "foregroundWillDisplay",
      handleForeground,
    );

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) routeFromUrl(initialUrl, navigate, lastHandledUrl);
    });
    const urlSub = Linking.addEventListener("url", (ev) =>
      routeFromUrl(ev.url, navigate, lastHandledUrl),
    );

    return () => {
      OneSignal.Notifications.removeEventListener("click", handleClick);
      OneSignal.Notifications.removeEventListener(
        "foregroundWillDisplay",
        handleForeground,
      );
      urlSub.remove();
    };
  }, [navigate, onesignalAppId, debug]);
};
