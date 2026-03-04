import { useTheme } from "@/components/ThemeContext";
import colors from "@/constants/colors";
import icons from "@/constants/icons";
import { menuData } from "@/types/menuData";
import { getUnreadCount, inboxSubscribe } from "@/types/notificationInbox";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  Linking,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MenuCategoryItem from "./MenuCategoryItem";

type MenuDrawerProps = {
  onCategorySelect: (categoryName: string) => void;
  activeCategory: string;
  onOpenNotifications?: () => void;
};

const MenuDrawer: React.FC<MenuDrawerProps> = ({
  onCategorySelect,
  activeCategory,
  onOpenNotifications,
}) => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [unread, setUnread] = React.useState(0);

  const isDarkMode = theme === "dark";
  const drawerBackground = isDarkMode ? colors.black : "#ffffff";
  const primaryTextColor = isDarkMode ? colors.grey : colors.black;
  const secondaryTextColor = isDarkMode ? "#d1d5db" : "#4b5563";
  const menuDividerStyle = {
    height: 1,
    backgroundColor: isDarkMode ? "#374151" : "#d1d5db",
    marginHorizontal: 8,
  } as const;
  const footerLinks = [
    { label: "Impresum", url: "https://www.postinfo.rs/impresum/" },
    { label: "Marketing", url: "https://www.postinfo.rs/marketing/" },
    {
      label: "Politika privatnosti",
      url: "https://www.postinfo.rs/politika-privatnosti/",
    },
    { label: "O nama", url: "https://www.postinfo.rs/o-nama/" },
    {
      label: "Prijatelji portala",
      url: "https://www.postinfo.rs/prijatelji-portala/",
    },
    { label: "Kontakt", url: "https://www.postinfo.rs/kontakt/" },
  ] as const;

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) => {
      console.warn("Failed to open url:", url, err);
    });
  };

  React.useEffect(() => {
    let mounted = true;

    const loadUnreadCount = async () => {
      const count = await getUnreadCount();
      if (mounted) setUnread(count);
    };

    loadUnreadCount();
    const unsubscribe = inboxSubscribe(() => {
      getUnreadCount().then((count) => {
        if (mounted) setUnread(count);
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const renderUnread = (
    count: number,
    containerStyle?: {
      position?: "absolute";
      top?: number;
      right?: number;
      zIndex?: number;
    },
  ) => {
    if (!count) return null;
    const text = count > 99 ? "99+" : String(count);
    return (
      <View
        style={[
          {
            minWidth: 20,
            height: 20,
            paddingHorizontal: 6,
            borderRadius: 10,
            backgroundColor: colors.red,
            alignItems: "center",
            justifyContent: "center",
          },
          containerStyle,
        ]}
      >
        <Text
          style={{
            color: colors.grey,
            fontSize: 10,
            fontFamily: "Roboto-Regular",
          }}
        >
          {text}
        </Text>
      </View>
    );
  };

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        style={{ backgroundColor: drawerBackground }}
      >
        {menuData.map((item) => (
          <MenuCategoryItem
            key={typeof item === "string" ? item : item.title}
            item={item}
            onPress={onCategorySelect}
            activeCategory={activeCategory}
          />
        ))}

        <View style={{ marginTop: "auto" }}>
          <View className="flex-row justify-around items-center mt-6 px-4">
            <TouchableOpacity
              onPress={() => openLink("https://www.facebook.com/postinfo.rs")}
            >
              <Image
                source={icons.facebook}
                className="w-5 h-5"
                tintColor={primaryTextColor}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openLink("https://x.com/postinfo_rs")}
            >
              <Image
                source={icons.twitter}
                className="w-5 h-5"
                tintColor={primaryTextColor}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openLink("https://youtube.com/@postinfotv")}
            >
              <Image
                source={icons.youtube}
                className="w-5 h-5"
                tintColor={primaryTextColor}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openLink("https://www.instagram.com/postinfo.rs")}
            >
              <Image
                source={icons.instagram}
                className="w-5 h-5"
                tintColor={primaryTextColor}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                openLink("https://www.linkedin.com/company/postinfo-rs")
              }
            >
              <Image
                source={icons.linkedin}
                className="w-5 h-5"
                tintColor={primaryTextColor}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openLink("https://www.postinfo.rs")}
            >
              <Image
                source={icons.wifi}
                className="w-5 h-5"
                tintColor={primaryTextColor}
              />
            </TouchableOpacity>
          </View>

          <View style={[menuDividerStyle, { marginTop: 16 }]} />

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 12,
              paddingHorizontal: 16,
              rowGap: 8,
            }}
          >
            {footerLinks.map((link, idx) => (
              <React.Fragment key={link.label}>
                <TouchableOpacity onPress={() => openLink(link.url)}>
                  <Text
                    style={{
                      color: secondaryTextColor,
                      fontFamily: "Roboto-Regular",
                      fontSize: 12,
                    }}
                  >
                    {link.label}
                  </Text>
                </TouchableOpacity>
                {idx < footerLinks.length - 1 && (
                  <Text
                    style={{
                      color: secondaryTextColor,
                      marginHorizontal: 6,
                      fontSize: 12,
                    }}
                  >
                    /
                  </Text>
                )}
              </React.Fragment>
            ))}
          </View>

          <View style={[menuDividerStyle, { marginTop: 12 }]} />

          <View style={{ marginTop: 2, paddingHorizontal: 16 }}>
            <View
              style={{
                marginTop: 4,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Feather
                  name="sun"
                  size={20}
                  color={isDarkMode ? "#6b7280" : primaryTextColor}
                  style={{ marginRight: 8 }}
                />
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  trackColor={{ false: "#9ca3af", true: "#475569" }}
                  thumbColor={isDarkMode ? colors.grey : colors.black}
                />
                <Feather
                  name="moon"
                  size={20}
                  color={isDarkMode ? primaryTextColor : "#9ca3af"}
                  style={{ marginLeft: 8 }}
                />
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (onOpenNotifications) {
                    onOpenNotifications();
                    return;
                  }
                  router.push("/notifications");
                }}
                activeOpacity={0.8}
                style={{ position: "relative", padding: 4 }}
              >
                <Image
                  source={icons.bell}
                  style={{ width: 20, height: 20 }}
                  tintColor={primaryTextColor}
                />
                {renderUnread(unread, {
                  position: "absolute",
                  top: -4,
                  right: -10,
                  zIndex: 1,
                })}
              </TouchableOpacity>
            </View>

            <View
              style={[
                menuDividerStyle,
                { marginTop: 12, marginHorizontal: -8 },
              ]}
            />
          </View>

          <View
            className="mt-6 px-4"
            style={{
              paddingBottom: 50,
            }}
          >
            <Text
              className="text-xs flex-wrap leading-5"
              style={{
                color: secondaryTextColor,
                fontFamily: "Roboto-Regular",
              }}
            >
              © 2026{" "}
              <Text
                className="underline"
                onPress={() => openLink("https://www.postinfo.rs")}
                style={{
                  color: colors.red,
                  fontFamily: "Roboto-Regular",
                }}
              >
                POSTINFO
              </Text>{" "}
              - Sva prava zadržava{" "}
              <Text
                className="underline"
                onPress={() => openLink("https://www.digitalthinking.rs")}
                style={{
                  color: colors.red,
                  fontFamily: "Roboto-Regular",
                }}
              >
                Digital Thinking d.o.o.
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export default MenuDrawer;
