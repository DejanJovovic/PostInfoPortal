import React, {useState} from 'react';
import {View, Text, TouchableOpacity, Image} from 'react-native';
import icons from '@/constants/icons';

type CategoryItem = {
    title: string;
    children?: (CategoryItem | string)[];
};

type MenuCategoryItemProps = {
    item: CategoryItem | string;
    level?: number;
    onPress?: (title: string) => void;
    activeCategory?: string;
    rootParent?: string;
};

const MenuCategoryItem: React.FC<MenuCategoryItemProps> = ({
                                                               item,
                                                               level = 0,
                                                               onPress,
                                                               activeCategory,
                                                               rootParent,
                                                           }) => {
    const [expanded, setExpanded] = useState(false);

    const hasChildren = typeof item === 'object' && item.children;
    const title = typeof item === 'string' ? item : item.title;

    const isMain = level === 0;
    const isActive = isMain && title === activeCategory;

    const toggleExpand = () => {
        if (hasChildren) {
            setExpanded(!expanded);
            if (level === 0) {
                onPress?.(title);
            }
        } else {
            onPress?.(title);
        }
    };

    return (
        <View>
            <TouchableOpacity
                onPress={toggleExpand}
                className="flex-row items-center justify-between px-4 py-2"
            >
                <Text
                    className={`text-base font-bold ${
                        level === 0
                            ? (title === activeCategory ? 'text-[#FA0A0F]' : 'text-white')
                            : 'text-gray-400'
                    }`}
                    style={{ marginLeft: level * 12 }}
                >
                    {title}
                </Text>

                {hasChildren && (
                    <Image
                        source={expanded ? icons.downArrow : icons.rightArrow}
                        className="w-4 h-4"
                        tintColor="gray"
                    />
                )}
            </TouchableOpacity>

            {/* Expanded subcategories */}
            {expanded &&
                hasChildren &&
                item.children?.map((child, idx) => {
                    const childTitle = typeof child === 'string' ? child : child.title;
                    const isFromLokal = rootParent === 'Lokal' || title === 'Lokal';

                    return (
                        <View key={childTitle}>
                            <MenuCategoryItem
                                item={child}
                                level={level + 1}
                                onPress={onPress}
                                activeCategory={activeCategory}
                                rootParent={title === 'Lokal' ? 'Lokal' : rootParent}
                            />

                            {/* Separator subcategories of lokal */}
                            {isFromLokal && (
                                <View className="h-[1px] bg-gray-700 mx-4"/>
                            )}
                        </View>
                    );
                })}
        </View>
    );
};

export default MenuCategoryItem;