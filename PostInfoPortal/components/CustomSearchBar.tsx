import React, {useEffect, useState} from 'react';
import {View, TextInput, Image, TouchableOpacity} from 'react-native';
import icons from '@/constants/icons';

type CustomSearchBarProps = {
    query?: string;
    onSearch: (query: string) => void;
    onReset?: () => void;
    backgroundColor?: string;
};

const CustomSearchBar: React.FC<CustomSearchBarProps> = ({ query = '', onSearch, onReset, backgroundColor }) => {
    const [input, setInput] = useState(query);

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
            className="flex-row items-center px-4 py-3 mt-10 mx-2 rounded-2xl"
            style={{ backgroundColor: backgroundColor || '#1a1a1a' }}>
            <TextInput
                placeholder="Pretraga..."
                placeholderTextColor="#999"
                className="flex-1 text-white text-sm"
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
            />
            {input.length === 0 ? (
                <TouchableOpacity onPress={handleSearch}>
                    <Image source={icons.search} className="w-4 h-4 ml-2" tintColor="#999" />
                </TouchableOpacity>
            ) : (
                onReset && (
                    <TouchableOpacity onPress={onReset}>
                        <Image source={icons.close} className="w-4 h-4 ml-2" tintColor="#999" />
                    </TouchableOpacity>
                )
            )}
        </View>
    );
};

export default CustomSearchBar;