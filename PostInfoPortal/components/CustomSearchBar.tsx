import colors from "@/constants/colors";
import icons from "@/constants/icons";
import React, { useEffect, useState } from "react";
import {
  Image,
  StyleProp,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

type CustomSearchBarProps = {
  query?: string;
  onSearch: (query: string) => void;
  onQueryChange?: (query: string) => void;
  onReset?: () => void;
  backgroundColor?: string;
  inputTextColor?: string;
  placeholderColor?: string;
  iconColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  autoFocus?: boolean;
};

const CustomSearchBar: React.FC<CustomSearchBarProps> = ({
  query = "",
  onSearch,
  onQueryChange,
  onReset,
  backgroundColor,
  inputTextColor,
  placeholderColor,
  iconColor,
  containerStyle,
  inputStyle,
  autoFocus = false,
}) => {
  const [input, setInput] = useState(query);
  const finalInputTextColor = inputTextColor || colors.grey;
  const finalPlaceholderColor = placeholderColor || colors.grey;
  const finalIconColor = iconColor || colors.grey;

  useEffect(() => {
    setInput(query);
  }, [query]);

  const handleSearch = () => {
    if (input.trim()) {
      onSearch(input.trim());
    }
  };

  return (
    <View
      className="flex-row items-center px-4 py-3 mt-10 mx-2 rounded-xl"
      style={[{ backgroundColor: backgroundColor || "#222" }, containerStyle]}
    >
      <TextInput
        placeholder="Pretraga..."
        placeholderTextColor={finalPlaceholderColor}
        className="flex-1 text-lg"
        style={[{ fontFamily: "Roboto-Bold", color: finalInputTextColor }, inputStyle]}
        value={input}
        onChangeText={(value) => {
          setInput(value);
          onQueryChange?.(value);
        }}
        onSubmitEditing={handleSearch}
        returnKeyType="search"
        autoFocus={autoFocus}
      />
      {input.length === 0 ? (
        <TouchableOpacity onPress={handleSearch}>
          <Image
            source={icons.search}
            className="w-4 h-4 ml-2"
            tintColor={finalIconColor}
          />
        </TouchableOpacity>
      ) : (
        onReset && (
          <TouchableOpacity
            onPress={() => {
              setInput("");
              onReset?.();
            }}
          >
            <Image
              source={icons.close}
              className="w-4 h-4 ml-2"
              tintColor={finalIconColor}
            />
          </TouchableOpacity>
        )
      )}
    </View>
  );
};

export default CustomSearchBar;
