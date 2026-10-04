import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CATEGORIES } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDay } from '@/lib/dates';
import { neglectDays, type HabitStats } from '@/lib/metrics';
import { AppText } from '../app-text';
import { Card, Separator } from '../card';
import { MeterBar } from './stat-tile';

const COLLAPSED_COUNT = 5;

function CategoryTag({ stat }: { stat: HabitStats }) {
  const colors = useTheme();
  return (
    <View style={styles.tag}>
      <View style={[styles.dot, { backgroundColor: colors.category[stat.habit.categoryId] }]} />
      <AppText variant="caption" tone="secondary" numberOfLines={1}>
        {CATEGORIES[stat.habit.categoryId].shortTitle}
      </AppText>
    </View>
  );
}

function ShowMore({ expanded, total, onPress }: { expanded: boolean; total: number; onPress: () => void }) {
  if (total <= COLLAPSED_COUNT) return null;
  return (
    <>
      <Separator inset={0} />
      <Pressable onPress={onPress} style={styles.more} accessibilityRole="button">
        <AppText variant="subhead" tone="tint" weight="600">
          {expanded ? 'Show less' : `Show all ${total}`}
        </AppText>
      </Pressable>
    </>
  );
}

/** Habits ranked by completion rate in the selected window. */
export function Leaderboard({ ranked, onOpen }: { ranked: HabitStats[]; onOpen: (habitId: string) => void }) {
  const colors = useTheme();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? ranked : ranked.slice(0, COLLAPSED_COUNT);

  if (ranked.length === 0) {
    return (
      <Card style={styles.empty}>
        <AppText variant="subhead" tone="secondary">
          Rankings appear after your first full day of tracking.
        </AppText>
      </Card>
    );
  }

  return (
    <Card>
      {visible.map((stat, index) => (
        <View key={stat.habit.id}>
          {index > 0 && <Separator inset={56} />}
          <Pressable onPress={() => onOpen(stat.habit.id)} style={styles.row} accessibilityRole="button">
            <View style={[styles.rank, { backgroundColor: index < 3 ? colors.tintSoft : colors.surfaceAlt }]}>
              {index === 0 ? (
                <Ionicons name="trophy" size={16} color={colors.tint} />
              ) : (
                <AppText variant="subhead" weight="700" tone={index < 3 ? 'tint' : 'secondary'}>
                  {index + 1}
                </AppText>
              )}
            </View>
            <View style={styles.flex}>
              <AppText variant="subhead" weight="600" numberOfLines={1}>
                {stat.habit.name}
              </AppText>
              <View style={styles.metaRow}>
                <CategoryTag stat={stat} />
                {stat.currentStreak >= 2 && (
                  <AppText variant="caption" tone="secondary">
                    · 🔥 {stat.currentStreak}-day streak
                  </AppText>
                )}
              </View>
              <View style={styles.rateRow}>
                <MeterBar value={stat.rate} max={1} color={colors.category[stat.habit.categoryId]} height={6} />
                <AppText variant="footnote" weight="700" style={styles.rate}>
                  {Math.round(stat.rate * 100)}%
                </AppText>
              </View>
              <AppText variant="caption" tone="muted">
                {stat.yes} of {stat.days} {stat.days === 1 ? 'day' : 'days'}
              </AppText>
            </View>
          </Pressable>
        </View>
      ))}
      <ShowMore expanded={expanded} total={ranked.length} onPress={() => setExpanded((value) => !value)} />
    </Card>
  );
}

/** Habits that haven't been checked off lately, longest gap first. */
export function NeglectedHabits({ ranked, onOpen }: { ranked: HabitStats[]; onOpen: (habitId: string) => void }) {
  const colors = useTheme();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? ranked : ranked.slice(0, COLLAPSED_COUNT);

  if (ranked.length === 0) {
    return (
      <Card style={[styles.empty, styles.emptyRow]}>
        <Ionicons name="sparkles" size={18} color={colors.goodText} />
        <AppText variant="subhead" tone="secondary" style={styles.flex}>
          Nothing neglected. Every habit has been checked off today.
        </AppText>
      </Card>
    );
  }

  return (
    <Card>
      {visible.map((stat, index) => {
        const gap = neglectDays(stat);
        const severity = gap >= 7 ? 'critical' : gap >= 3 ? 'warning' : 'ok';
        const badgeColor =
          severity === 'critical' ? colors.criticalSoft : severity === 'warning' ? colors.warningSoft : colors.surfaceAlt;
        const badgeTone = severity === 'critical' ? 'critical' : severity === 'warning' ? 'warning' : 'secondary';
        return (
          <View key={stat.habit.id}>
            {index > 0 && <Separator />}
            <Pressable onPress={() => onOpen(stat.habit.id)} style={styles.row} accessibilityRole="button">
              <View style={styles.flex}>
                <AppText variant="subhead" weight="600" numberOfLines={1}>
                  {stat.habit.name}
                </AppText>
                <View style={styles.metaRow}>
                  <CategoryTag stat={stat} />
                  <AppText variant="caption" tone="secondary" style={styles.flex} numberOfLines={1}>
                    ·{' '}
                    {stat.lastYesKey
                      ? `last checked off ${formatDay(stat.lastYesKey, { month: 'short', day: 'numeric' })}`
                      : 'never checked off'}
                  </AppText>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                {severity !== 'ok' && (
                  <Ionicons
                    name={severity === 'critical' ? 'alert-circle' : 'warning'}
                    size={13}
                    color={severity === 'critical' ? colors.criticalText : colors.warningText}
                  />
                )}
                <AppText variant="footnote" weight="700" tone={badgeTone}>
                  {gap} {gap === 1 ? 'day' : 'days'}
                </AppText>
              </View>
            </Pressable>
          </View>
        );
      })}
      <ShowMore expanded={expanded} total={ranked.length} onPress={() => setExpanded((value) => !value)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  empty: {
    padding: Spacing.lg,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 6,
  },
  rate: {
    width: 40,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  more: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
});
