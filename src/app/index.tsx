import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BatteryMeter } from '@/components/battery-meter';
import { CATEGORIES } from '@/constants/categories';
import { batteryColors, Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { addDays, daysBetween } from '@/lib/dates';
import { categoriesAtRisk, FULL_CHARGE, MAX_DAILY_POINTS, summarizeDays, type Progress } from '@/lib/scoring';
import { CATEGORY_IDS } from '@/lib/types';
import { useProgress } from '@/state/progress';
import { useAppStore, useHasHydrated } from '@/state/store';
import { useTodayKey } from '@/state/today';

export default function WelcomeScreen() {
  const hydrated = useHasHydrated();
  const progress = useProgress();
  const todayKey = useTodayKey();
  const hasHabits = useAppStore((state) => state.habits.some((habit) => !habit.archivedKey));
  const previousVisitKey = useAppStore((state) => state.previousVisitKey);
  const haptic = useHaptics();
  const { height } = useWindowDimensions();
  const [replay, setReplay] = useState(0);
  // The status bar style is app-wide on iOS, so only claim it while this screen is showing.
  const isFocused = useIsFocused();
  const batteryHeight = Math.round(Math.min(280, Math.max(170, height * 0.31)));

  const continueToMenu = () => {
    haptic('tap');
    router.push('/menu');
  };

  return (
    <View style={styles.root}>
      {isFocused && <StatusBar style="light" />}
      <LinearGradient colors={[Brand.night, Brand.nightAlt, Brand.night]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.kicker}>1% BETTER</Text>
          <Text style={styles.tagline}>Daily habit & self-accountability tracker</Text>
        </View>

        <View style={styles.center}>
          <View style={styles.batteryWrap}>
            <View
              pointerEvents="none"
              style={[styles.glow, { boxShadow: `0 0 160px 110px ${batteryColors(progress.score)[1]}26` }]}
            />
            <Pressable
              onPress={() => {
                haptic('select');
                setReplay((value) => value + 1);
              }}
              accessibilityHint="Replays the charging animation">
              {hydrated && (
                <BatteryMeter
                  key={replay}
                  level={progress.score}
                  from={0}
                  height={batteryHeight}
                  msPerPercent={26}
                />
              )}
            </Pressable>
          </View>
          {hydrated && <ChargeStatus progress={progress} hasHabits={hasHabits} />}
        </View>

        {hydrated && hasHabits && (
          <Recap progress={progress} todayKey={todayKey} previousVisitKey={previousVisitKey} />
        )}

        <ContinueButton label={hasHabits ? 'Tap to continue' : 'Tap to get started'} onPress={continueToMenu} />
      </SafeAreaView>
    </View>
  );
}

function ChargeStatus({ progress, hasHabits }: { progress: Progress; hasHabits: boolean }) {
  if (!hasHabits) {
    return (
      <View style={styles.status}>
        <Text style={styles.statusTitle}>Ready to start charging</Text>
        <Text style={styles.statusText}>
          Add daily habits in three areas of life. Every “yes” adds 1% to your meter, up to 5% per area
          each day. Reach 100% and it’s time to celebrate.
        </Text>
      </View>
    );
  }
  const remaining = FULL_CHARGE - progress.score;
  return (
    <View style={styles.status}>
      <Text style={styles.statusTitle}>
        {remaining} {remaining === 1 ? 'point' : 'points'} to your next celebration
      </Text>
      <Text style={styles.statusText}>
        {progress.charges > 0
          ? `Fully charged ${progress.charges} ${progress.charges === 1 ? 'time' : 'times'} so far ⚡`
          : '1% better every day adds up to 37× better in a year.'}
      </Text>
    </View>
  );
}

function Recap({
  progress,
  todayKey,
  previousVisitKey,
}: {
  progress: Progress;
  todayKey: string;
  previousVisitKey?: string;
}) {
  const yesterdayKey = addDays(todayKey, -1);
  const yesterday = progress.days.find((day) => day.dateKey === yesterdayKey);
  const missedSince = previousVisitKey && previousVisitKey < yesterdayKey ? previousVisitKey : undefined;
  const today = progress.today;
  const atRisk = categoriesAtRisk(today);

  let recapLabel: string | undefined;
  let recapValue: string | undefined;
  if (missedSince) {
    const summary = summarizeDays(progress, missedSince, yesterdayKey);
    recapLabel = `Since your last visit · ${daysBetween(missedSince, todayKey)} days`;
    recapValue = `+${summary.points} earned · −${summary.penalty} auto-tallied`;
  } else if (yesterday) {
    recapLabel = 'Yesterday';
    const missed = CATEGORY_IDS.filter((id) => yesterday.categories[id].penalty > 0).map(
      (id) => CATEGORIES[id].shortTitle,
    );
    recapValue = `+${yesterday.points} earned${
      missed.length ? ` · −${yesterday.penalty} (no wins in ${missed.join(', ')})` : ' · no penalties 🎯'
    }`;
  }

  return (
    <View style={styles.recap}>
      {recapLabel && (
        <View style={styles.recapRow}>
          <Text style={styles.recapLabel}>{recapLabel}</Text>
          <Text style={styles.recapValue}>{recapValue}</Text>
        </View>
      )}
      {today && (
        <View style={styles.recapRow}>
          <Text style={styles.recapLabel}>Today so far</Text>
          <Text style={styles.recapValue}>
            +{today.points} of {MAX_DAILY_POINTS}
            {atRisk.length > 0
              ? ` · ${atRisk.length} ${atRisk.length === 1 ? 'area needs' : 'areas need'} a win`
              : ' · every area has a win ✅'}
          </Text>
        </View>
      )}
    </View>
  );
}

function ContinueButton({ label, onPress }: { label: string; onPress: () => void }) {
  const [nudge] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(nudge, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(nudge, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [nudge]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.continue, pressed && styles.continuePressed]}>
      <Text style={styles.continueText}>{label}</Text>
      <Animated.View
        style={{ transform: [{ translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) }] }}>
        <Ionicons name="arrow-forward-circle" size={28} color={Brand.night} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.night,
  },
  batteryWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  kicker: {
    color: Brand.glow,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 3,
  },
  tagline: {
    color: Brand.textSecondary,
    fontSize: 15,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  status: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusTitle: {
    color: Brand.text,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
    textAlign: 'center',
  },
  statusText: {
    color: Brand.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  recap: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  recapRow: {
    gap: 2,
  },
  recapLabel: {
    color: Brand.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  recapValue: {
    color: Brand.text,
    fontSize: 15,
    lineHeight: 20,
  },
  continue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Brand.glow,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    boxShadow: '0 6px 24px rgba(60, 235, 110, 0.35)',
  },
  continuePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  continueText: {
    color: Brand.night,
    fontSize: 18,
    fontWeight: '700',
  },
});
