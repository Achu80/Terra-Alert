import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * Low-poly night scene in the Himalayan foothills: stars, moon, snow peaks, a pine forest,
 * a Himachali hut with lit windows and a campfire.
 * The 3D look comes from drawing every shape as flat facets: a lit face and a shadow face.
 * Drawn in a 390 x 844 box and scaled to cover the screen (anchored to the bottom).
 */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Repeatable "random" numbers so the stars and trees are the same on every launch
function seeded(seed) {
    let s = seed;
    return () => {
        s = (s * 16807) % 2147483647;
        return s / 2147483647;
    };
}

const rand = seeded(42);
const STARS = Array.from({ length: 55 }, () => ({
    x: rand() * 390,
    y: 24 + rand() * 300,
    r: 0.5 + rand() * 1.1,
    o: 0.25 + rand() * 0.6,
}));
const TWINKLE = [
    { x: 62, y: 118, d: 1700 },
    { x: 148, y: 64, d: 2300 },
    { x: 228, y: 176, d: 1900 },
    { x: 352, y: 210, d: 2600 },
    { x: 98, y: 240, d: 2100 },
    { x: 276, y: 42, d: 2500 },
];

// One low-poly mountain: a lit face (left of `split`) and a shadow face meeting at the apex
const FAR = [
    { ax: 30, ay: 470, left: -60, right: 110, split: 45 },
    { ax: 125, ay: 418, left: 40, right: 215, split: 136, snow: 0.17 },
    { ax: 215, ay: 462, left: 150, right: 285, split: 226 },
    { ax: 305, ay: 400, left: 212, right: 400, split: 318, snow: 0.18 },
    { ax: 388, ay: 452, left: 320, right: 470, split: 394 },
];
const MID = [
    { ax: -10, ay: 522, left: -120, right: 110, split: 6 },
    { ax: 95, ay: 488, left: 0, right: 200, split: 110, snow: 0.12 },
    { ax: 206, ay: 532, left: 120, right: 292, split: 216 },
    { ax: 302, ay: 484, left: 200, right: 410, split: 314, snow: 0.13 },
];

const lerp = (a, b, t) => a + (b - a) * t;
const pts = (list) => list.map(([x, y]) => `${x},${y}`).join(' ');

function Mountain({ m, base, lit, shade, snowLit, snowShade }) {
    const apex = [m.ax, m.ay];
    const snow = m.snow;
    const at = (x, t) => [lerp(m.ax, x, t), lerp(m.ay, base, t)];
    return (
        <G>
            <Polygon points={pts([[m.left, base], apex, [m.split, base]])} fill={lit} />
            <Polygon points={pts([[m.split, base], apex, [m.right, base]])} fill={shade} />
            {snow ? (
                <>
                    <Polygon points={pts([apex, at(m.left, snow), at(m.split, snow * 0.7)])} fill={snowLit} />
                    <Polygon points={pts([apex, at(m.split, snow * 0.7), at(m.right, snow * 1.1)])} fill={snowShade} />
                </>
            ) : null}
        </G>
    );
}

// Three-tier pine (deodar) with a lit and a shadow half per tier
function Pine({ x, base, h, lit, shade }) {
    const trunk = h * 0.12;
    const w = h * 0.5;
    return (
        <G>
            <Rect x={x - 2.2} y={base - trunk} width={4.4} height={trunk} fill="#24190f" />
            {[0, 1, 2].map((i) => {
                const bottom = base - trunk - i * h * 0.24;
                const top = bottom - h * 0.44;
                const tw = w * (1 - i * 0.24);
                return (
                    <G key={i}>
                        <Polygon points={pts([[x - tw / 2, bottom], [x, top], [x, bottom]])} fill={lit} />
                        <Polygon points={pts([[x, bottom], [x, top], [x + tw / 2, bottom]])} fill={shade} />
                    </G>
                );
            })}
        </G>
    );
}

const treeRand = seeded(7);
const BACK_TREES = Array.from({ length: 26 }, (_, i) => ({ x: -8 + i * 16 + treeRand() * 8, h: 50 + treeRand() * 26 }));
// Front row leaves a clearing in the middle for the hut and the fire
const FRONT_TREES = [-6, 20, 44, 70, 96, 330, 356, 382]
    .map((x) => ({ x: x + treeRand() * 6, h: 92 + treeRand() * 40 }))
    .sort((a, b) => b.h - a.h);

function Twinkle({ x, y, duration }) {
    const v = useState(() => new Animated.Value(0))[0];
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(v, { toValue: 1, duration, useNativeDriver: false }),
                Animated.timing(v, { toValue: 0, duration, useNativeDriver: false }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [v, duration]);
    return <AnimatedCircle cx={x} cy={y} r={1.6} fill="#ffffff" opacity={v.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.95] })} />;
}

function FireGlow() {
    const v = useState(() => new Animated.Value(0.8))[0];
    useEffect(() => {
        const step = (to, ms) => Animated.timing(v, { toValue: to, duration: ms, useNativeDriver: false });
        const loop = Animated.loop(Animated.sequence([step(1, 280), step(0.72, 220), step(0.95, 260), step(0.8, 300)]));
        loop.start();
        return () => loop.stop();
    }, [v]);
    return <AnimatedCircle cx={182} cy={768} r={92} fill="url(#fire)" opacity={v} />;
}

export default function NightScene({ style }) {
    return (
        <Svg style={[StyleSheet.absoluteFill, style]} viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice">
            <Defs>
                <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#060509" />
                    <Stop offset="0.55" stopColor="#141220" />
                    <Stop offset="1" stopColor="#0a0a0c" />
                </LinearGradient>
                <LinearGradient id="moon" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#f6f4fb" />
                    <Stop offset="1" stopColor="#bdb8cc" />
                </LinearGradient>
                <RadialGradient id="fire" cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor="#ff9d3c" stopOpacity="0.55" />
                    <Stop offset="0.45" stopColor="#ff7a1a" stopOpacity="0.18" />
                    <Stop offset="1" stopColor="#ff7a1a" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
                    <Stop offset="0.35" stopColor="#ffffff" stopOpacity="0.12" />
                    <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id="window" cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor="#ffd27a" stopOpacity="0.35" />
                    <Stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
                </RadialGradient>
            </Defs>

            <Rect x="0" y="0" width="390" height="844" fill="url(#sky)" />

            {/* Stars */}
            {STARS.map((s, i) => (
                <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o} />
            ))}
            {TWINKLE.map((t) => (
                <Twinkle key={`${t.x}-${t.y}`} x={t.x} y={t.y} duration={t.d} />
            ))}

            {/* Moon with a soft halo and craters */}
            <Circle cx="318" cy="96" r="78" fill="url(#halo)" />
            <Circle cx="318" cy="96" r="27" fill="url(#moon)" />
            <Circle cx="309" cy="88" r="5" fill="#cfcadb" />
            <Circle cx="326" cy="104" r="3.5" fill="#cfcadb" />
            <Circle cx="322" cy="86" r="2" fill="#d9d5e3" />

            {/* Everything on the ground is lifted so the buttons don't cover the hut and fire */}
            <G transform="translate(0,-110)">
                {/* Thin cloud streaks */}
                <Rect x="40" y="398" width="120" height="5" rx="2.5" fill="#2a2636" opacity="0.7" />
                <Rect x="250" y="436" width="96" height="4" rx="2" fill="#2a2636" opacity="0.6" />

                {FAR.map((m) => (
                    <Mountain key={m.ax} m={m} base={612} lit="#2d2a3c" shade="#1f1d2b" snowLit="#d3d6e3" snowShade="#8e91a6" />
                ))}
                {MID.map((m) => (
                    <Mountain key={m.ax} m={m} base={662} lit="#242131" shade="#17161f" snowLit="#c9ccda" snowShade="#7d8096" />
                ))}

                {BACK_TREES.map((t, i) => (
                    <Pine key={`b${i}`} x={t.x} base={700} h={t.h} lit="#3b4522" shade="#262d16" />
                ))}

                {/* Ground facets */}
                <Polygon points="0,698 390,690 390,960 0,960" fill="#141319" />
                <Polygon points="0,760 140,742 232,772 120,960 0,960" fill="#18171e" />
                <Polygon points="232,772 390,748 390,960 120,960" fill="#121117" />
                {/* Footpath up to the hut */}
                <Polygon points="168,960 214,960 230,812 248,778 240,776 214,808" fill="#211f29" />

                <Circle cx="250" cy="724" r="70" fill="url(#window)" />
                <FireGlow />

                {/* Himachali hut: lit front wall, shaded side wall, slate roof */}
                <Polygon points="232,744 232,712 270,712 270,744" fill="#6e4d33" />
                <Polygon points="270,744 270,712 298,706 298,738" fill="#4a3323" />
                <Polygon points="226,713 251,689 276,713" fill="#57536a" />
                <Polygon points="251,689 276,713 304,707 279,683" fill="#37343f" />
                <Polygon points="251,689 279,683 280,685 252,691" fill="#706c84" />
                <Rect x="237" y="719" width="10" height="9" fill="#ffd27a" />
                <Rect x="254" y="723" width="9" height="21" fill="#2e2016" />
                <Polygon points="279,717 290,715 290,724 279,726" fill="#ffc861" />

                {/* Landslide warning sign by the path */}
                <Rect x="214.5" y="764" width="2" height="26" fill="#5b4a3a" />
                <Polygon points="215.5,748 226,766 205,766" fill="#f5c451" />
                <Rect x="214.6" y="753" width="1.8" height="7" fill="#1b1b1b" />
                <Rect x="214.6" y="761.5" width="1.8" height="1.8" fill="#1b1b1b" />

                {/* Campfire */}
                <Polygon points="166,778 198,770 200,775 168,783" fill="#4a3020" />
                <Polygon points="166,770 198,778 196,783 164,775" fill="#3b2618" />
                <Polygon points="174,775 182,748 190,775" fill="#ff7a1a" />
                <Polygon points="178,775 182,758 186,775" fill="#ffd25e" />
                <Circle cx="188" cy="742" r="1.2" fill="#ffb15c" />
                <Circle cx="177" cy="734" r="0.9" fill="#ffb15c" />

                {/* Low-poly rocks */}
                <Polygon points="118,792 136,774 158,782 162,800 124,802" fill="#3a3846" />
                <Polygon points="136,774 158,782 162,800 146,790" fill="#2a2834" />
                <Polygon points="300,794 316,780 334,788 330,804 304,804" fill="#363441" />

                {FRONT_TREES.map((t, i) => (
                    <Pine key={`f${i}`} x={t.x} base={808} h={t.h} lit="#56622a" shade="#353e19" />
                ))}
            </G>
        </Svg>
    );
}
