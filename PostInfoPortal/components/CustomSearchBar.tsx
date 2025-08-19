import React, {useEffect, useState} from 'react';
import {View, TextInput, Image, TouchableOpacity} from 'react-native';
import icons from '@/constants/icons';
import colors from "@/constants/colors";

type CustomSearchBarProps = {
    query?: string;
    onSearch: (query: string) => void;
    onReset?: () => void;
    backgroundColor?: string;
    autoFocus?: boolean;
};

const CustomSearchBar: React.FC<CustomSearchBarProps> = ({
                                                             query = '',
                                                             onSearch,
                                                             onReset,
                                                             backgroundColor,
                                                             autoFocus = false
                                                         }) => {
    const [input, setInput] = useState(query);

    useEffect(() => {
        if (query === '') {
            setInput('');
        }
    }, [query]);

    const handleSearch = () => {
        if (input.trim()) {
            onSearch(input.trim());
        }
    };

    return (
        <View
            className="flex-row items-center px-4 py-3 mt-10 mx-2 rounded-2xl"
            style={{ backgroundColor: backgroundColor || '#222' }}
        >
            <TextInput
                placeholder="Pretraga..."
                placeholderTextColor={colors.grey}
                className="flex-1 text-[#F9F9F9] text-sm"
                style={{fontFamily: 'YesevaOne-Regular'}}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                autoFocus={autoFocus}
            />
            {input.length === 0 ? (
                <TouchableOpacity onPress={handleSearch}>
                    <Image source={icons.search} className="w-4 h-4 ml-2" tintColor={colors.grey} />
                </TouchableOpacity>
            ) : (
                onReset && (
                    <TouchableOpacity
                        onPress={() => {
                            setInput('');
                            onReset?.();
                        }}
                    >
                        <Image source={icons.close} className="w-4 h-4 ml-2" tintColor={colors.grey} />

                    </TouchableOpacity>
                )
            )}
        </View>
    );
};

export default CustomSearchBar;