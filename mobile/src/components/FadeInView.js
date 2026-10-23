import { Children, useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Fades its content in while sliding it up a little, once, when it first appears.
 * Remount it (e.g. give it a new `key`) to play the animation again.
 */
export default function FadeInView({ children, style, delay = 0, duration = 340, distance = 14 }) {
    const progress = useState(() => new Animated.Value(0))[0];

    useEffect(() => {
        const anim = Animated.timing(progress, {
            toValue: 1,
            duration,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        });
        anim.start();
        return () => anim.stop();
    }, [progress, delay, duration]);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: progress,
                    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
}

/**
 * Cascade: each child fades in `step` ms after the previous one.
 * Use it inside a container that lays the children out (e.g. a View with `gap`).
 */
export function Stagger({ children, step = 70, start = 0 }) {
    return Children.toArray(children)
        .filter(Boolean)
        .map((child, i) => (
            <FadeInView key={child.key ?? i} delay={start + i * step}>
                {child}
            </FadeInView>
        ));
}
