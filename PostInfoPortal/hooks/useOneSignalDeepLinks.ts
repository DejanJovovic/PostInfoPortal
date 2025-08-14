import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { LogLevel, OneSignal } from "react-native-onesignal";
import { addToInbox } from "@/types/notificationInbox";
import { extractPostId, extractCategoryName, getDeepLinkUrl } from "@/types/notificationParsing";
import { routeFromUrl, RouteTarget } from "@/types/routeDeepLink";
import React from "react";

type UseOneSignalDeepLinksOpts = {
    navigate: (to: RouteTarget) => void; // fastRoute wrapper
    onesignalAppId: string;
    debug?: boolean;
};

export const useOneSignalDeepLinks = ({ navigate, onesignalAppId, debug }: UseOneSignalDeepLinksOpts) => {
    const lastHandledUrl = { current: null as string | null };

    React.useEffect(() => {
        // Android-only for now; remove the guard once I support iOS.
        if (Platform.OS !== "android") return;

        if (debug) OneSignal.Debug.setLogLevel(LogLevel.Verbose);
        OneSignal.initialize(onesignalAppId);
        OneSignal.Notifications.requestPermission(true);

        const handleClick = (event: any) => {
            const n = event?.notification;
            const postId = extractPostId(n, event);
            const categoryName = extractCategoryName(n, event);
            const deepLinkUrl = getDeepLinkUrl(n, event);

            // Save to inbox as read
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
                navigate({ pathname: "/post-details", params: { postId, ...(categoryName ? { category: categoryName } : {}) } });
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

        // OneSignal listeners
        OneSignal.Notifications.addEventListener("click", handleClick);
        OneSignal.Notifications.addEventListener("foregroundWillDisplay", handleForeground);

        // Cold start
        Linking.getInitialURL().then((initialUrl) => {
            if (initialUrl) routeFromUrl(initialUrl, navigate, lastHandledUrl);
        });

        // Runtime deep links
        const urlSub = Linking.addEventListener("url", (ev) => routeFromUrl(ev.url, navigate, lastHandledUrl));

        return () => {
            OneSignal.Notifications.removeEventListener("click", handleClick);
            OneSignal.Notifications.removeEventListener("foregroundWillDisplay", handleForeground);
            urlSub.remove();
        };
    }, [navigate, onesignalAppId, debug]);
};