import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { batteryColors, Fonts } from '@/constants/theme';

interface BatteryMeterProps {
  /** Level to show, 0–100. */
  level: number;
  /** Body height in points; the width follows a battery's proportions. */
  height?: number;
  /** Level the fill starts from, so it visibly "charges" up to `level`. */
  from?: number;
  /** Show the percentage inside the battery. */
  showPercent?: boolean;
  /** Pulse the lightning bolt. */
  charging?: boolean;
  outlineColor?: string;
  trackColor?: string;
  boltColor?: string;
  /** Animation speed; higher is slower. */
  msPerPercent?: number;
  onFilled?: (level: number) => void;
}


export function BatteryMeter({
  level,
  height = 240,
  from,
  showPercent = true,
  charging = true,
  outlineColor = 'rgba(255, 255, 255, 0.9)',
  trackColor = 'rgba(255, 255, 255, 0.08)',
  boltColor = '#FFFFFF',
  msPerPercent = 16,
  onFilled,
}: BatteryMeterProps) {
  const target = Math.max(0, Math.min(100, level));
  const start = from ?? target;
  const [fill] = useState(() => new Animated.Value(start));
  const [pulse] = useState(() => new Animated.Value(1));
  const [display, setDisplay] = useState(Math.round(start));
  const lastValue = useRef(start);

  const width = Math.round(height * 0.56);
  const border = Math.max(2, Math.round(height * 0.028));
  const radius = Math.round(width * 0.24);
  const gap = Math.max(2, Math.round(height * 0.022));
  const innerHeight = height - border * 2 - gap * 2;
  const capWidth = Math.round(width * 0.36);
  const capHeight = Math.max(3, Math.round(height * 0.055));

  const handleFilled = useEffectEvent((value: number) => onFilled?.(value));

  useEffect(() => {
    const id = fill.addListener(({ value }) => {
      lastValue.current = value;
      setDisplay(Math.round(value));
    });
    return () => fill.removeListener(id);
  }, [fill]);

  useEffect(() => {
    const distance = Math.abs(target - lastValue.current);
    const animation = Animated.timing(fill, {
      toValue: target,
      duration: Math.max(300, distance * msPerPercent),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) handleFilled(target);
    });
    return () => animation.stop();
  }, [fill, target, msPerPercent]);

  useEffect(() => {
    if (!charging) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.14, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [charging, pulse]);

  const [topColor, bottomColor] = batteryColors(display);
  const fillHeight = fill.interpolate({
    inputRange: [0, 100],
    outputRange: [0, innerHeight],
    extrapolate: 'clamp',
  });
  const glowRadius = Math.round(height * 0.16);

  return (
    <View
      style={{ alignItems: 'center' }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Progress score"
      accessibilityValue={{ min: 0, max: 100, now: display, text: `${display}%` }}>
      <View
        style={{
          width: capWidth,
          height: capHeight,
          borderTopLeftRadius: capHeight / 1.5,
          borderTopRightRadius: capHeight / 1.5,
          backgroundColor: outlineColor,
        }}
      />
      <View
        style={{
          width,
          height,
          borderWidth: border,
          borderColor: outlineColor,
          borderRadius: radius,
          borderCurve: 'continuous',
          padding: gap,
          justifyContent: 'flex-end',
          backgroundColor: trackColor,
          boxShadow: display > 0 ? `0 0 ${glowRadius}px ${bottomColor}66` : undefined,
        }}>
        <Animated.View
          style={{
            height: fillHeight,
            borderRadius: Math.max(2, radius - border - gap),
            borderCurve: 'continuous',
            overflow: 'hidden',
          }}>
          <LinearGradient
            colors={[topColor, bottomColor]}
            style={[StyleSheet.absoluteFill, { top: undefined, height: innerHeight }]}
          />
          <View style={styles.shine} />
        </Animated.View>

        <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none">
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Ionicons
              name="flash"
              size={Math.round(height * (showPercent ? 0.2 : 0.42))}
              color={boltColor}
              style={boltColor === '#FFFFFF' && styles.iconShadow}
            />
          </Animated.View>
          {showPercent && (
            <Text
              style={[styles.percent, { fontSize: Math.round(height * 0.17) }]}
              maxFontSizeMultiplier={1.2}>
              {display}%
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '12%',
    width: '14%',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 999,
  },
  iconShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  percent: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontFamily: Fonts.rounded,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
    marginTop: 2,
  },
});
