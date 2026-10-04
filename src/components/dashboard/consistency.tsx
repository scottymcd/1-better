import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, eachDay, relativeDayLabel, weekday, type DateKey } from '@/lib/dates';
import type { WeekdayAverage } from '@/lib/metrics';
import { MAX_DAILY_POINTS, type DayResult } from '@/lib/scoring';
import { CATEGORY_IDS } from '@/lib/types';
import { AppText } from '../app-text';
import { Card } from '../card';

const WEEKS = 12;
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Points bins: 0 gets the neutral cell, then five steps of the blue ramp. */
function heatLevel(points: number): number {
  if (points <= 0) return -1;
  return Math.min(4, Math.floor((points - 1) / 3));
}

function isTracked(day?: DayResult): day is DayResult {
  return !!day && CATEGORY_IDS.some((id) => day.categories[id].habits > 0);
}

/** Twelve weeks of daily points, one column per week. */
export function ConsistencyHeatmap({ days, todayKey }: { days: DayResult[]; todayKey: DateKey }) {
  const colors = useTheme();
  const [selectedKey, setSelectedKey] = useState<DateKey>();
  const byKey = new Map(days.map((day) => [day.dateKey, day]));
  const start = addDays(todayKey, -(weekday(todayKey) + (WEEKS - 1) * 7));
  const weeks = Array.from({ length: WEEKS }, (_, week) => eachDay(addDays(start, week * 7), addDays(start, week * 7 + 6)));
  const window = eachDay(start, todayKey).map((key) => byKey.get(key)).filter(isTracked);
  const activeDays = window.filter((day) => day.points > 0).length;
  const selected = selectedKey ? byKey.get(selectedKey) : undefined;

  const cellColor = (day?: DayResult) => {
    if (!isTracked(day)) return 'transparent';
    const level = heatLevel(day.points);
    return level < 0 ? colors.heatZero : colors.heat[level];
  };

  return (
    <Card style={styles.card}>
      <View style={styles.grid}>
        <View style={styles.labels}>
          {WEEKDAY_LETTERS.map((letter, index) => (
            <View key={index} style={styles.labelCell}>
              <AppText variant="caption" tone="muted">
                {index % 2 === 1 ? letter : ''}
              </AppText>
            </View>
          ))}
        </View>
        {weeks.map((week) => (
          <View key={week[0]} style={styles.column}>
            {week.map((dateKey) => {
              const day = byKey.get(dateKey);
              const future = dateKey > todayKey;
              const tracked = isTracked(day);
              return (
                <Pressable
                  key={dateKey}
                  disabled={future}
                  onPress={() => setSelectedKey(selectedKey === dateKey ? undefined : dateKey)}
                  accessibilityRole="button"
                  accessibilityLabel={`${relativeDayLabel(dateKey, todayKey)}: ${tracked ? `${day.points} points` : 'not tracking'}`}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: future ? 'transparent' : cellColor(day),
                      borderColor: !future && !tracked ? colors.separator : 'transparent',
                    },
                    selectedKey === dateKey && { borderColor: colors.text, borderWidth: 2 },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legendRow}>
        <AppText variant="caption" tone="muted">
          Less
        </AppText>
        {[colors.heatZero, ...colors.heat].map((color) => (
          <View key={color} style={[styles.legendCell, { backgroundColor: color }]} />
        ))}
        <AppText variant="caption" tone="muted">
          More
        </AppText>
        <AppText variant="caption" tone="muted" style={styles.legendNote}>
          points per day (0–{MAX_DAILY_POINTS})
        </AppText>
      </View>

      <View style={[styles.detail, { backgroundColor: colors.surfaceAlt }]}>
        <AppText variant="footnote" tone={selected ? 'primary' : 'secondary'}>
          {selectedKey
            ? `${relativeDayLabel(selectedKey, todayKey)}: ${
                selected && isTracked(selected)
                  ? `+${selected.points} earned${selected.final ? ` · −${selected.penalty} penalty` : ''}`
                  : 'not tracking yet'
              }`
            : `Points earned on ${activeDays} of the last ${window.length} tracked days. Tap a square for details.`}
        </AppText>
      </View>
    </Card>
  );
}

/** Average points by weekday; the best day is emphasized and the rest stay gray. */
export function WeekdayChart({ averages }: { averages: WeekdayAverage[] }) {
  const colors = useTheme();
  const withData = averages.filter((item) => item.days > 0);
  if (withData.length === 0) {
    return (
      <Card style={styles.card}>
        <AppText variant="subhead" tone="secondary">
          Weekday patterns appear after your first full day of tracking.
        </AppText>
      </Card>
    );
  }
  const max = Math.max(...withData.map((item) => item.avgPoints), 1);
  const best = withData.reduce((top, item) => (item.avgPoints > top.avgPoints ? item : top), withData[0]);

  return (
    <Card style={styles.card}>
      {averages.map((item) => {
        const isBest = item.weekday === best.weekday;
        return (
          <View
            key={item.weekday}
            style={styles.barRow}
            accessible
            accessibilityLabel={`${WEEKDAY_NAMES[item.weekday]}: ${item.avgPoints.toFixed(1)} points on average`}>
            <AppText variant="footnote" tone="secondary" weight={isBest ? '700' : '400'} style={styles.barLabel}>
              {WEEKDAY_NAMES[item.weekday]}
            </AppText>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    // Leave room after the longest bar for its value label.
                    width: `${(item.avgPoints / max) * 82}%`,
                    backgroundColor: isBest ? colors.tint : colors.deemphasis,
                  },
                ]}
              />
              <AppText variant="footnote" weight={isBest ? '700' : '500'} style={styles.barValue}>
                {item.days ? item.avgPoints.toFixed(1) : '–'}
              </AppText>
            </View>
          </View>
        );
      })}
      <AppText variant="caption" tone="muted">
        Average points earned per day. Your strongest day is {WEEKDAY_NAMES[best.weekday]}.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    gap: 3,
  },
  labels: {
    width: 14,
    gap: 3,
  },
  labelCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
  },
  column: {
    flex: 1,
    gap: 3,
  },
  cell: {
    aspectRatio: 1,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendNote: {
    marginLeft: Spacing.sm,
  },
  detail: {
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  barLabel: {
    width: 34,
  },
  barTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bar: {
    height: 14,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    minWidth: 2,
  },
  barValue: {
    fontVariant: ['tabular-nums'],
  },
});
