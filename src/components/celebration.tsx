import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useEffectEvent, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useProgress } from '@/state/progress';
import { useAppStore, useHasHydrated } from '@/state/store';
import { BatteryMeter } from './battery-meter';
import { Confetti } from './confetti';

const IDEAS = [
  'Treat yourself to your favorite meal',
  'Share the win with someone you love',
  'Take a guilt-free evening off',
  'Plan something fun for the weekend',
  'Buy yourself a small reward',
  'Put on your favorite song and dance',
  'Write down three things you’re proud of',
  'Go somewhere beautiful and soak it in',
];

/**
 * Watches the progress meter and throws a party every time it reaches 100%.
 * Each full charge is celebrated exactly once.
 */
export function CelebrationHost() {
  const hydrated = useHasHydrated();
  const { charges } = useProgress();
  const celebrated = useAppStore((state) => state.chargesCelebrated);
  const preview = useAppStore((state) => state.celebrationPreview);
  const setChargesCelebrated = useAppStore((state) => state.setChargesCelebrated);
  const setCelebrationPreview = useAppStore((state) => state.setCelebrationPreview);
  // iOS can't present this over the habit sheet, so a charge earned there is
  // celebrated as soon as the sheet closes.
  const sheetOpen = usePathname().startsWith('/habit/');

  useEffect(() => {
    // An undone "yes" can take a charge back; re-arm so it's celebrated again when re-earned.
    if (hydrated && charges < celebrated) setChargesCelebrated(charges);
  }, [hydrated, charges, celebrated, setChargesCelebrated]);

  const visible = hydrated && !sheetOpen && (charges > celebrated || preview);
  const dismiss = () => {
    setChargesCelebrated(Math.max(charges, celebrated));
    setCelebrationPreview(false);
  };

  return (
    <Celebration
      visible={visible}
      chargeNumber={Math.max(1, charges)}
      isPreview={preview && charges <= celebrated}
      onDismiss={dismiss}
    />
  );
}

interface CelebrationProps {
  visible: boolean;
  chargeNumber: number;
  isPreview: boolean;
  onDismiss: () => void;
}

function Celebration({ visible, chargeNumber, isPreview, onDismiss }: CelebrationProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      {visible && <CelebrationContent chargeNumber={chargeNumber} isPreview={isPreview} onDismiss={onDismiss} />}
    </Modal>
  );
}

function CelebrationContent({ chargeNumber, isPreview, onDismiss }: Omit<CelebrationProps, 'visible'>) {
  const haptic = useHaptics();
  const [entrance] = useState(() => new Animated.Value(0));
  const [burst, setBurst] = useState(chargeNumber * 97);
  const playSuccess = useEffectEvent(() => haptic('success'));

  useEffect(() => {
    playSuccess();
    Animated.spring(entrance, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start();
  }, [entrance]);

  const idea = IDEAS[chargeNumber % IDEAS.length];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient colors={[Brand.night, Brand.nightAlt]} style={StyleSheet.absoluteFill} />
      <Confetti key={burst} seed={burst} />
      <Animated.View
        style={[
          styles.content,
          {
            opacity: entrance,
            transform: [{ scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
          },
        ]}>
        <Pressable
          onPress={() => {
            haptic('tap');
            setBurst((value) => value + 1);
          }}
          accessibilityRole="button"
          accessibilityLabel="Fully charged battery. Tap for more confetti.">
          <BatteryMeter level={100} from={72} height={210} charging />
        </Pressable>
        <Text style={styles.kicker}>{isPreview ? 'PREVIEW' : `CHARGE #${chargeNumber} COMPLETE`}</Text>
        <Text style={styles.title} accessibilityRole="header">
          100% charged!
        </Text>
        <Text style={styles.subtitle}>
          Time to celebrate 🎉 Every 1% you earned added up to this moment.
        </Text>
        <View style={styles.ideaCard}>
          <Text style={styles.ideaLabel}>CELEBRATE WITH</Text>
          <Text style={styles.ideaText}>{idea}</Text>
        </View>
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          accessibilityRole="button">
          <Text style={styles.buttonText}>Start my next charge ⚡</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    maxWidth: 420,
    width: '100%',
  },
  kicker: {
    color: Brand.glow,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: Spacing.xl,
  },
  title: {
    color: Brand.text,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    color: Brand.textSecondary,
    fontSize: 17,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  ideaCard: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  ideaLabel: {
    color: Brand.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  ideaText: {
    color: Brand.text,
    fontSize: 17,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing.xl,
    backgroundColor: Brand.glow,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: '#062B10',
    fontSize: 17,
    fontWeight: '700',
  },
});
