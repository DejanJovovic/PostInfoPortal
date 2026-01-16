import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import colors from '@/constants/colors';

type LoadingOverlayProps = {
    isDark: boolean;
    message: string;
    indicatorColor?: string;
};

const LoadingOverlay = ({ isDark, message, indicatorColor }: LoadingOverlayProps) => (
    <View
        style={[
            StyleSheet.absoluteFillObject,
            {
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.7)',
                zIndex: 9999,
                elevation: 9999,
            },
        ]}
        pointerEvents="auto"
    >
        <ActivityIndicator
            size="large"
            color={indicatorColor || (isDark ? colors.grey : colors.black)}
        />
        <Text
            style={{
                marginTop: 10,
                fontFamily: 'Roboto-SemiBold',
                color: isDark ? colors.grey : colors.black,
                textAlign: 'center',
            }}
        >
            {message}
        </Text>
    </View>
);

export default LoadingOverlay;
