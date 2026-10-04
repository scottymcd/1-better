import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BatteryMeter } from '@/components/battery-meter';
import { Card, SectionLabel } from '@/components/card';
import { CategoryAverages } from '@/components/dashboard/category-averages';
import { ConsistencyHeatmap, WeekdayChart } from '@/components/dashboard/consistency';
import { DailyPointsChart } from '@/components/dashboard/daily-points-chart';
import { Leaderboard, NeglectedHabits } from '@/components/dashboard/habit-lists';
import { StatTile } from '@/components/dashboard/stat-tile';
import { SegmentedControl } from '@/components/segmented-control';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDay, startOfMonth, startOfYear } from '@/lib/dates';
import {
  balancedStreak,
  categoryAverages,
  computeHabitStats,
  lifetimeTotals,
  overallAverage,
  rankByConsistency,
  rankByNeglect,
  recentDays,
  weekdayAverages,
} from '@/lib/metrics';
import { FULL_CHARGE } from '@/lib/scoring';
import { useProgress } from '@/state/progress';
import { useAppStore } from '@/state/store';
import { useTodayKey } from '@/state/today';

type Range = '30d' | 'month' | 'year' | 'all';

const RANGES: readonly { value: Range; label: string }[] = [
  { value: '30d', label: '30 days' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All time' },
];

export default function DashboardScreen() {
  const colors = useTheme();
  const progress = useProgress();
  const todayKey = useTodayKey();
  const habits = useAppStore((state) => state.habits);
  const entries = useAppStore((state) => state.entries);
  const [range, setRange] = useState<Range>('30d');

  const openHabit = (habitId: string) => router.push({ pathname: '/habit/[id]', params: { id: habitId } });

  if (progress.days.length === 0) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Card style={styles.emptyCard}>
          <AppText variant="title3">Your dashboard is waiting</AppText>
          <AppText variant="subhead" tone="secondary" align="center">
            Add a few daily habits and log them for a couple of days. Averages, streaks, your most
            consistent habits and the ones slipping through the cracks will show up here.
          </AppText>
          <Pressable
            onPress={() => router.back()}
            style={[styles.emptyButton, { backgroundColor: colors.tint }]}
            accessibilityRole="button">
            <AppText variant="headline" tone="onTint">
              Add habits
            </AppText>
          </Pressable>
        </Card>
      </ScrollView>
    );
  }

  const monthStart = startOfMonth(todayKey);
  const yearStart = startOfYear(todayKey);
  const activeHabits = habits.filter((habit) => !habit.archivedKey);
  const windowStart =
    range === '30d' ? addDays(todayKey, -29) : range === 'month' ? monthStart : range === 'year' ? yearStart : undefined;
  const leaderboard = rankByConsistency(
    activeHabits.map((habit) => computeHabitStats(habit, entries, todayKey, windowStart)),
  );
  const neglected = rankByNeglect(activeHabits.map((habit) => computeHabitStats(habit, entries, todayKey)));
  const overallMonth = overallAverage(progress, monthStart, todayKey);
  const overallYear = overallAverage(progress, yearStart, todayKey);
  const streak = balancedStreak(progress);
  const totals = lifetimeTotals(progress);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={{ backgroundColor: colors.background }}>
      <Card style={styles.hero}>
        <View style={styles.flex}>
          <AppText variant="footnote" tone="secondary" weight="600">
            PROGRESS SCORE
          </AppText>
          <AppText style={[styles.heroValue, { color: colors.text }]}>{progress.score}%</AppText>
          <AppText variant="footnote" tone="secondary">
            Charge #{progress.charges + 1} · {FULL_CHARGE - progress.score} points to your next celebration
          </AppText>
        </View>
        <BatteryMeter
          level={progress.score}
          height={96}
          showPercent={false}
          charging={false}
          outlineColor={colors.textSecondary}
          trackColor={colors.surfaceAlt}
          boltColor={colors.text}
        />
      </Card>

      <View style={styles.tiles}>
        <StatTile icon="flash" label="Full charges" value={String(progress.charges)} detail="Times you hit 100%" />
        <StatTile
          icon="flame"
          label="Streak"
          value={`${streak.current}d`}
          detail={`Days with no penalty · best ${streak.best}d`}
        />
        <StatTile
          icon="today"
          label="Avg / day"
          value={overallMonth.avgPoints.toFixed(1)}
          detail="Points, month to date"
        />
      </View>

      <SectionLabel>Daily average by area</SectionLabel>
      <CategoryAverages
        monthToDate={categoryAverages(progress, monthStart, todayKey)}
        yearToDate={categoryAverages(progress, yearStart, todayKey)}
        overallMonth={overallMonth}
        overallYear={overallYear}
      />

      <SectionLabel>Last 30 days</SectionLabel>
      <DailyPointsChart days={recentDays(progress, todayKey, 30)} todayKey={todayKey} />

      <SectionLabel>Most consistent habits</SectionLabel>
      <View style={styles.filter}>
        <SegmentedControl options={RANGES} value={range} onChange={setRange} accessibilityLabel="Time range" />
      </View>
      <Leaderboard ranked={leaderboard} onOpen={openHabit} />

      <SectionLabel>Neglected habits</SectionLabel>
      <NeglectedHabits ranked={neglected} onOpen={openHabit} />

      <SectionLabel>Consistency · last 12 weeks</SectionLabel>
      <ConsistencyHeatmap days={progress.days} todayKey={todayKey} />

      <SectionLabel>Best days of the week</SectionLabel>
      <WeekdayChart averages={weekdayAverages(progress, addDays(todayKey, -83), todayKey)} />

      <SectionLabel>Lifetime</SectionLabel>
      <View style={styles.tiles}>
        <StatTile icon="checkmark-done" label="Check-ins" value={String(totals.yes)} detail="Total “yes” answers" />
        <StatTile icon="calendar" label="Tracked" value={`${totals.trackedDays}d`} detail="Days with habits" />
        <StatTile
          icon="star"
          label="Best day"
          value={totals.bestDay ? `+${totals.bestDay.net}` : '–'}
          detail={totals.bestDay ? formatDay(totals.bestDay.dateKey, { month: 'short', day: 'numeric', year: 'numeric' }) : undefined}
        />
      </View>
      <AppText variant="footnote" tone="muted" style={styles.footer}>
        {totals.points} points earned and {totals.penalty} lost to penalties since you started.
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  heroValue: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: '700',
    letterSpacing: -1,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  filter: {
    marginBottom: Spacing.md,
  },
  footer: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  emptyButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
});
