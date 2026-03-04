import CustomFooter from "@/components/CustomFooter";
import CustomHeader from "@/components/CustomHeader";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useTheme } from "@/components/ThemeContext";
import colors from "@/constants/colors";
import {
  clearInbox,
  getInbox,
  inboxSubscribe,
  markRead,
  type InboxItem,
} from "@/types/notificationInbox";
import { useNavigation, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const NotificationsScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [items, setItems] = React.useState<InboxItem[] | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadingNav, setLoadingNav] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await getInbox();
      const sorted = [...data].sort(
        (a, b) => (b.receivedAt || 0) - (a.receivedAt || 0),
      );
      setItems(sorted);
    } catch (error) {
      console.error("Failed to read inbox:", error);
      setItems([]);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const unsubscribe = inboxSubscribe(() => {
      load().catch(() => {});
    });
    return () => {
      unsubscribe();
    };
  }, [load]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      setLoadingNav(false);
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const confirmClearAll = React.useCallback(() => {
    Alert.alert(
      "Brisanje obaveštenja",
      "Da li ste sigurni da želite da obrišete sva obaveštenja?",
      [
        { text: "Ne", style: "cancel" },
        {
          text: "Da",
          style: "destructive",
          onPress: async () => {
            await clearInbox();
            await load();
          },
        },
      ],
      { cancelable: true },
    );
  }, [load]);

  const onOpenItem = React.useCallback(
    async (item: InboxItem) => {
      if (loadingNav) return;

      if (item.oneSignalId) {
        try {
          await markRead(item.oneSignalId);
        } catch {}
      }

      setItems((prev) =>
        (prev ?? []).map((inboxItem) =>
          inboxItem.oneSignalId === item.oneSignalId
            ? { ...inboxItem, read: true }
            : inboxItem,
        ),
      );

      if (item.postId) {
        setLoadingNav(true);
        requestAnimationFrame(() => {
          router.push({
            pathname: "/post-details",
            params: {
              postId: String(item.postId),
              ...(item.categoryName ? { category: item.categoryName } : {}),
            },
          });
        });
        return;
      }

      if (item.deepLinkUrl) {
        try {
          await Linking.openURL(item.deepLinkUrl);
        } catch (error) {
          console.error("Failed to open notification deeplink:", error);
        }
        return;
      }

      Alert.alert(
        "Nije moguce otvoriti",
        "Ovo obaveštenje nema post ili link.",
      );
    },
    [loadingNav, router],
  );

  const renderItem = (item: InboxItem, index: number) => (
    <TouchableOpacity
      key={item.oneSignalId || item.id || String(index)}
      onPress={() => onOpenItem(item)}
      disabled={loadingNav}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: isDark ? "#525050" : "#e5e7eb",
        backgroundColor: isDark ? colors.black : colors.grey,
        overflow: "hidden",
        ...(Platform.OS === "ios"
          ? {
              shadowColor: "transparent",
              shadowOpacity: 0,
              shadowRadius: 0,
              shadowOffset: { width: 0, height: 0 },
            }
          : { elevation: 0 }),
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: 8,
            height: 8,
            marginTop: 4,
            marginRight: 12,
            borderRadius: 99,
            backgroundColor: item.read ? "transparent" : colors.red,
          }}
        />

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: isDark ? colors.grey : colors.black,
              fontFamily: "Roboto-Bold",
            }}
            numberOfLines={2}
          >
            {item.title || "Nova objava"}
          </Text>

          {!!item.message && (
            <Text
              numberOfLines={2}
              style={{
                marginTop: 4,
                color: isDark ? "#bdbdbd" : "#333333",
                fontFamily: "Roboto-Regular",
                fontSize: 13,
              }}
            >
              {item.message}
            </Text>
          )}

          <Text
            style={{
              marginTop: 8,
              color: isDark ? colors.grey : colors.black,
              fontFamily: "Roboto-Regular",
              fontSize: 11,
            }}
          >
            {new Date(item.receivedAt).toLocaleString("sr-RS")}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const canClear = (items?.length ?? 0) > 0;

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: isDark ? colors.black : colors.grey }}
    >
      <CustomHeader
        onCategorySelected={() => {}}
        activeCategory="Obaveštenja"
        showMenu={false}
      />

      <View style={{ paddingTop: 6 }}>
        <Text
          style={{
            textAlign: "center",
            color: isDark ? colors.grey : colors.black,
            fontFamily: "Roboto-Bold",
            fontSize: 22,
          }}
        >
          {"Obaveštenja"}
        </Text>

        <View
          style={{
            height: 1,
            backgroundColor: isDark ? "#525050" : "#e5e7eb",
            marginTop: 10,
            marginHorizontal: 12,
            marginBottom: 6,
          }}
        />

        {canClear && (
          <View
            style={{
              alignItems: "flex-end",
              paddingHorizontal: 16,
              paddingBottom: 8,
            }}
          >
            <TouchableOpacity
              onPress={confirmClearAll}
              disabled={loadingNav}
              style={{ paddingVertical: 4, paddingHorizontal: 6 }}
            >
              <Text style={{ color: colors.red, fontFamily: "Roboto-Bold" }}>
                Obriši sve
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {items === null ? (
        <View style={{ paddingVertical: 32, alignItems: "center" }}>
          <ActivityIndicator
            size="large"
            color={isDark ? colors.grey : colors.black}
          />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{
            paddingBottom: 110,
            flexGrow: (items || []).length ? 0 : 1,
            justifyContent: (items || []).length ? undefined : "center",
          }}
        >
          {(items || []).length === 0 ? (
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  color: isDark ? colors.grey : colors.black,
                  fontFamily: "Roboto-Medium",
                }}
              >
                {"Nema novih obaveštenja"}
              </Text>
            </View>
          ) : (
            (items || []).map((item, index) => renderItem(item, index))
          )}
        </ScrollView>
      )}

      {loadingNav && <LoadingOverlay isDark={isDark} message="Učitavanje..." />}

      <CustomFooter />
    </SafeAreaView>
  );
};

export default NotificationsScreen;
