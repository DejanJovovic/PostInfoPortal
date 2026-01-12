import React, { useState, useMemo } from 'react';
import {
    View,
    ImageBackground,
    TouchableOpacity,
    Linking,
    Platform,
    StyleSheet,
    ImageSourcePropType,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/components/ThemeContext';

type CustomBannerProps = {
    url: string;
    imageSrc?: string | ImageSourcePropType;
    onClose?: () => void;
};

export default function CustomBanner({
                                         url,
                                         imageSrc,
                                         onClose,
                                     }: CustomBannerProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [visible, setVisible] = useState(true);

    const imgSource: ImageSourcePropType | undefined = useMemo(
        () => (typeof imageSrc === 'string' ? { uri: imageSrc } : imageSrc),
        [imageSrc]
    );

    const open = async () => {
        try {
            await Linking.openURL(url);
        } catch (e) {
            // optionally show a toast/alert that the link could not be opened
            console.warn('Failed to open URL:', e);
        }
    };

    const handleClose = () => {
        // sakrij samo u trenutnom UI-ju (bez persista)
        setVisible(false);
        onClose?.();
    };

    if (!visible) return null;

    return (
        <View
            style={{
                marginHorizontal: 12,
                marginTop: 12,
                borderWidth: 1,
                borderRadius: 16,
                overflow: 'hidden',
                borderColor: isDark ? '#525050' : '#e5e7eb',
                backgroundColor: isDark ? '#0f0f0f' : '#fff',
                ...(Platform.OS === 'android' ? { elevation: 0 } : {}),
            }}
        >
            {/* Pozadinska slika PREKO CELE KARTICE */}
            <TouchableOpacity activeOpacity={0.9} onPress={open} style={{ width: '100%' }}>
                <ImageBackground
                    source={imgSource ?? { uri: 'https://via.placeholder.com/1200x400?text=Ad' }}
                    style={{ width: '100%', height: 200, justifyContent: 'flex-end' }}
                    resizeMode="cover"
                >
                    {/* Tamni gradijent/overlay da tekst bude čitljiv */}
                    <View
                        style={[
                            StyleSheet.absoluteFillObject,
                            { backgroundColor: 'rgba(0,0,0,0.18)' },
                        ]}
                    />

                    {/* X dugme gore desno (absolute) */}
                    <TouchableOpacity
                        onPress={handleClose}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 10,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            borderRadius: 16,
                            padding: 4,
                        }}
                    >
                        <X size={16} color="#fff" />
                    </TouchableOpacity>
                </ImageBackground>
            </TouchableOpacity>
        </View>
    );
}