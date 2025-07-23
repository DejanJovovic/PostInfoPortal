import {View, Image, TouchableOpacity} from 'react-native'
import React from 'react'
import {usePathname, useRouter} from "expo-router";
import images from "@/constants/images";
import icons from "@/constants/icons";

const CustomHeader = () => {

    const router = useRouter();
    const pathname = usePathname();

    const isRoot = pathname === '/';

    return (
        <View className="w-full h-[60px] relative mb-8">
            <TouchableOpacity onPress={() => router.replace('/')}>
                <Image
                    source={images.header}
                    className="w-full h-[90px]"
                    resizeMode="cover"
                />
            </TouchableOpacity>

            {!isRoot && (
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute left-4 top-11 -translate-y-1/2 z-10"
                >
                    <Image
                        source={icons.backArrow}
                        className="w-5 h-5"
                        tintColor="white"
                        resizeMode="contain"
                    />
                </TouchableOpacity>
            )}

            <TouchableOpacity
                onPress={() => console.log('Menu pressed')}
                className="absolute right-4 top-11 -translate-y-1/2 z-10"
            >
                <Image
                    source={icons.menu}
                    className="w-6 h-6"
                    tintColor="white"
                    resizeMode="contain"
                />
            </TouchableOpacity>
        </View>
    );
}
export default CustomHeader
