import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, Image} from 'react-native';
import icons from '@/constants/icons';
import colors from "@/constants/colors";

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

    const isActive = title === activeCategory;

    // recursive check to see if there is a subcategory, inside the selected category
    const hasActiveSubCategory = (children: (CategoryItem | string)[]): boolean => {
        return children.some((child) => {
            if (typeof child === 'string') {
                return child === activeCategory;
            } else {
                if (child.title === activeCategory) return true;
                if (child.children) {
                    return hasActiveSubCategory(child.children);
                }
                return false;
            }
        });
    };

    // this opens up the selected subcategory, the next time drawer is opened (so its user friendly)
    useEffect(() => {
        if (hasChildren && item.children && hasActiveSubCategory(item.children)) {
            setExpanded(true);
        }
    }, [activeCategory]);

    const handleCategoryPress = () => {
        if (title !== 'Latin | Ćirilica') {
            // Latin | Ćirilica is left out because it doenst contain any posts, as it should only change text (will be implemented later)
            onPress?.(title);
        }
    };

    // function that checks for the opened subcategories
    const toggleExpand = () => {
        setExpanded(!expanded);
    };

    return (
        <View>
            <View className="flex-row items-center justify-between px-4 py-2">
                <TouchableOpacity
                    onPress={handleCategoryPress}
                    className="flex-1"
                >
                    <Text
                        className={`${
                            isActive ? 'text-[#FA0A0F]' : level === 0
                                ? 'text-[#F9F9F9]'
                                : 'text-[#9ca3af]'}`}
                        style={{
                            fontFamily: 'YesevaOne-Regular',
                            marginLeft: level * 12
                        }}
                    >{title}</Text>
                </TouchableOpacity>

                {/* if the arrow is clicked, it opens up the subcategories */}
                {hasChildren && (
                    <TouchableOpacity onPress={toggleExpand} className="ml-2">
                        <Image
                            source={expanded ? icons.downArrow : icons.rightArrow}
                            className="w-4 h-4"
                            tintColor="#9ca3af"
                        />
                    </TouchableOpacity>
                )}
            </View>

            {/* display of subcategories if they are opened */}
            {expanded &&
                hasChildren &&
                item.children?.map((child, idx) => {
                    const childTitle = typeof child === 'string' ? child : child.title;
                    const isFromLokal = rootParent === 'Lokal' || title === 'Lokal';

                    return (
                        <View key={`${childTitle}-${idx}`}>
                            <MenuCategoryItem
                                item={child}
                                level={level + 1}
                                onPress={onPress}
                                activeCategory={activeCategory}
                                rootParent={title === 'Lokal' ? 'Lokal' : rootParent}
                            />
                            {isFromLokal && <View className="h-[1px] bg-[#9ca3af] mx-4"/>}
                        </View>
                    );
                })}
        </View>
    );
};

export default MenuCategoryItem;