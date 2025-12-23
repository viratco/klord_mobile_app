import React, { useRef } from 'react';
import { Pressable, Animated, PressableProps } from 'react-native';

interface BouncyPressableProps extends PressableProps {
    scaleTo?: number;
    friction?: number;
    tension?: number;
}

export const BouncyPressable: React.FC<BouncyPressableProps> = ({
    children,
    style,
    scaleTo = 0.95,
    friction = 3,
    tension = 40,
    onPressIn,
    onPressOut,
    ...props
}) => {
    const scaleValue = useRef(new Animated.Value(1)).current;

    const handlePressIn = (event: any) => {
        Animated.spring(scaleValue, {
            toValue: scaleTo,
            useNativeDriver: true,
            friction,
            tension,
        }).start();
        onPressIn?.(event);
    };

    const handlePressOut = (event: any) => {
        Animated.spring(scaleValue, {
            toValue: 1,
            useNativeDriver: true,
            friction,
            tension,
        }).start();
        onPressOut?.(event);
    };

    return (
        <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={style}
            {...props}
        >
            {({ pressed }) => (
                <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
                    {typeof children === 'function' ? children({ pressed }) : children}
                </Animated.View>
            )}
        </Pressable>
    );
};
