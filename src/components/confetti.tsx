import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

const COLORS = ['#3CEB6E', '#FFC94D', '#5598E7', '#EB6834', '#E87BA4', '#B7AEFF', '#1BAF7A', '#FFFFFF'];
const DURATION = 3600;
/** Sample times along the flight, packed tighter early on when pieces move fastest. */
const STEPS = Array.from({ length: 21 }, (_, i) => (i / 20) ** 1.6);

interface Piece {
  color: string;
  width: number;
  height: number;
  round: boolean;
  xs: number[];
  ys: number[];
  spins: string[];
  delay: number;
}

/** Seeded PRNG (mulberry32): the same seed always throws the same confetti. */
function createRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Launches pieces up from the bottom of the screen. Air drag gives each piece
 * a gentle terminal velocity, so it flutters down instead of dropping.
 */
function buildPieces(seed: number, count: number, width: number, height: number): Piece[] {
  const random = createRandom(seed);
  const drag = 3;
  const terminalSpeed = height * 0.22;
  const flight = DURATION / 1000;
  return Array.from({ length: count }, () => {
    const vy = -height * (2.2 + random() * 1.2);
    const vx = (random() - 0.5) * width * 3;
    const startX = width / 2 + (random() - 0.5) * width * 0.4;
    const startY = height + 20;
    const swayAmount = 8 + random() * 18;
    const swaySpeed = 4 + random() * 4;
    const turns = (random() < 0.5 ? -1 : 1) * (1.5 + random() * 3.5);
    const xs: number[] = [];
    const ys: number[] = [];
    const spins: string[] = [];
    for (const step of STEPS) {
      const t = step * flight;
      const decay = (1 - Math.exp(-drag * t)) / drag;
      xs.push(startX + vx * decay + Math.sin(t * swaySpeed) * swayAmount);
      ys.push(startY + terminalSpeed * t + (vy - terminalSpeed) * decay);
      spins.push(`${turns * 360 * step}deg`);
    }
    const size = 7 + random() * 6;
    return {
      color: COLORS[Math.floor(random() * COLORS.length)],
      width: size,
      height: random() < 0.5 ? size : size * 1.7,
      round: random() < 0.25,
      xs,
      ys,
      spins,
      delay: random() * 0.12,
    };
  });
}

export function Confetti({ seed, count = 90 }: { seed: number; count?: number }) {
  const { width, height } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));
  const pieces = useMemo(() => buildPieces(seed, count, width, height), [seed, count, width, height]);

  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, seed]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece, index) => {
        const inputRange = STEPS.map((step) => piece.delay + step * (1 - piece.delay));
        return (
          <Animated.View
            key={index}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: piece.width,
              height: piece.height,
              borderRadius: piece.round ? piece.width / 2 : 2,
              backgroundColor: piece.color,
              opacity: progress.interpolate({
                inputRange: [0, piece.delay, piece.delay + 0.01, 0.82, 1],
                outputRange: [0, 0, 1, 1, 0],
              }),
              transform: [
                { translateX: progress.interpolate({ inputRange, outputRange: piece.xs }) },
                { translateY: progress.interpolate({ inputRange, outputRange: piece.ys }) },
                { rotate: progress.interpolate({ inputRange, outputRange: piece.spins }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
