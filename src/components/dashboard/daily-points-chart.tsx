import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CATEGORIES } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, relativeDayLabel, type DateKey } from '@/lib/dates';
import type { DayResult } from '@/lib/scoring';
import { CATEGORY_IDS } from '@/lib/types';
import { AppText } from '../app-text';
import { Card } from '../card';

const PLOT_HEIGHT = 160;
const SEGMENT_GAP = 2;
const RADIUS = 4;
/** Stacked bottom → top. */
const STACK_ORDER = CATEGORY_IDS;

interface DailyPointsChartProps {
  days: { dateKey: DateKey; day?: DayResult }[];
  todayKey: DateKey;
}

function niceCeiling(value: number): number {
  return Math.max(5, Math.ceil(value / 5) * 5);
}

/**
 * Daily points stacked by category above the baseline, with midnight penalties
 * below it. Tap a day to read its values; the table view lists every value.
 */
export function DailyPointsChart({ days, todayKey }: DailyPointsChartProps) {
  const colors = useTheme();
  const [selectedKey, setSelectedKey] = useState<DateKey>();
  const [showTable, setShowTable] = useState(false);

  const yMax = niceCeiling(Math.max(0, ...days.map(({ day }) => day?.points ?? 0)));
  const maxPenalty = Math.max(0, ...days.map(({ day }) => day?.penalty ?? 0));
  const yMin = maxPenalty > 0 ? niceCeiling(maxPenalty) : 0;
  const unit = PLOT_HEIGHT / (yMax + yMin);
  const positiveHeight = yMax * unit;
  const negativeHeight = yMin * unit;
  const ticks = [
    ...Array.from({ length: yMax / 5 + 1 }, (_, i) => i * 5),
    ...Array.from({ length: yMin / 5 }, (_, i) => -(i + 1) * 5),
  ];
  const selected = days.find((item) => item.dateKey === selectedKey);
  const tracked = days.filter((item) => item.day);
  const totalPoints = tracked.reduce((sum, item) => sum + (item.day?.points ?? 0), 0);
  const totalPenalty = tracked.reduce((sum, item) => sum + (item.day?.penalty ?? 0), 0);

  return (
    <Card style={styles.card}>
      <View style={styles.legend} accessibilityRole="summary">
        {STACK_ORDER.map((categoryId) => (
          <LegendItem key={categoryId} color={colors.category[categoryId]} label={CATEGORIES[categoryId].shortTitle} />
        ))}
        <LegendItem color={colors.critical} label="Penalty" square />
      </View>

      <View style={styles.chartRow}>
        <View style={{ width: 26, height: positiveHeight + negativeHeight }}>
          {ticks.map((tick) => (
            <AppText
              key={tick}
              variant="caption"
              tone="muted"
              style={[styles.tick, { top: positiveHeight - tick * unit - 8 }]}>
              {tick > 0 ? `+${tick}` : tick}
            </AppText>
          ))}
        </View>
        <View style={styles.flex}>
          <View style={{ height: positiveHeight + negativeHeight }}>
            {ticks.map((tick) => (
              <View
                key={tick}
                style={[
                  styles.gridline,
                  {
                    top: positiveHeight - tick * unit,
                    backgroundColor: tick === 0 ? colors.baseline : colors.gridline,
                  },
                ]}
              />
            ))}
            <View style={styles.bars}>
              {days.map(({ dateKey, day }) => {
                const dimmed = selectedKey !== undefined && selectedKey !== dateKey;
                const stacked = STACK_ORDER.filter((id) => (day?.categories[id].points ?? 0) > 0);
                return (
                  <Pressable
                    key={dateKey}
                    style={[styles.slot, dimmed && styles.dimmed]}
                    onPress={() => setSelectedKey(selectedKey === dateKey ? undefined : dateKey)}
                    accessibilityRole="button"
                    accessibilityLabel={describeDay(dateKey, todayKey, day)}>
                    <View style={[styles.positive, { height: positiveHeight }]}>
                      {[...stacked].reverse().map((categoryId, index) => (
                        <View
                          key={categoryId}
                          style={{
                            height: (day?.categories[categoryId].points ?? 0) * unit,
                            backgroundColor: colors.category[categoryId],
                            borderTopLeftRadius: index === 0 ? RADIUS : 0,
                            borderTopRightRadius: index === 0 ? RADIUS : 0,
                            borderBottomWidth: index < stacked.length - 1 ? SEGMENT_GAP : 0,
                            borderBottomColor: colors.surface,
                          }}
                        />
                      ))}
                    </View>
                    <View style={[styles.negative, { height: negativeHeight }]}>
                      {(day?.penalty ?? 0) > 0 && (
                        <View
                          style={{
                            height: (day?.penalty ?? 0) * unit,
                            backgroundColor: colors.critical,
                            borderBottomLeftRadius: RADIUS,
                            borderBottomRightRadius: RADIUS,
                          }}
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.xAxis}>
            <AppText variant="caption" tone="muted">
              {formatDay(days[0].dateKey, { month: 'short', day: 'numeric' })}
            </AppText>
            <AppText variant="caption" tone="muted">
              {formatDay(days[Math.floor(days.length / 2)].dateKey, { month: 'short', day: 'numeric' })}
            </AppText>
            <AppText variant="caption" tone="muted">
              Today
            </AppText>
          </View>
        </View>
      </View>

      <View style={[styles.detail, { backgroundColor: colors.surfaceAlt }]}>
        {selected ? (
          <AppText variant="footnote">
            <AppText variant="footnote" weight="700">
              {relativeDayLabel(selected.dateKey, todayKey)}:{' '}
            </AppText>
            {describeValues(selected.day)}
          </AppText>
        ) : (
          <AppText variant="footnote" tone="secondary">
            Last {days.length} days: +{totalPoints} earned · −{totalPenalty} in penalties. Tap a bar for details.
          </AppText>
        )}
      </View>

      <Pressable onPress={() => setShowTable((value) => !value)} accessibilityRole="button" hitSlop={8}>
        <AppText variant="footnote" tone="tint" weight="600">
          {showTable ? 'Hide table' : 'View as table'}
        </AppText>
      </Pressable>
      {showTable && <DaysTable days={days} todayKey={todayKey} />}
    </Card>
  );
}

function describeValues(day?: DayResult): string {
  if (!day) return 'No habits were being tracked yet.';
  const parts = CATEGORY_IDS.map((id) => `${CATEGORIES[id].shortTitle} ${day.categories[id].points}`);
  const penalty = !day.final
    ? ' · Penalties apply at midnight'
    : day.penalty
      ? ` · Penalty −${day.penalty}`
      : ' · No penalty';
  return `${parts.join(' · ')}${penalty} · Net ${day.net >= 0 ? '+' : ''}${day.net}`;
}

function describeDay(dateKey: DateKey, todayKey: DateKey, day?: DayResult): string {
  return `${relativeDayLabel(dateKey, todayKey)}. ${describeValues(day)}`;
}

function LegendItem({ color, label, square = false }: { color: string; label: string; square?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color, borderRadius: square ? 2 : 5 }]} />
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}

function DaysTable({ days, todayKey }: DailyPointsChartProps) {
  const colors = useTheme();
  const headers = ['Day', 'Health', 'Finance', 'Home', 'Penalty', 'Net'];
  return (
    <View style={[styles.table, { borderColor: colors.separator }]}>
      <View style={[styles.tableRow, { backgroundColor: colors.surfaceAlt }]}>
        {headers.map((header, index) => (
          <AppText key={header} variant="caption" weight="700" style={index === 0 ? styles.dayCell : styles.cell}>
            {header}
          </AppText>
        ))}
      </View>
      {[...days].reverse().map(({ dateKey, day }) => (
        <View key={dateKey} style={[styles.tableRow, { borderTopColor: colors.separator }, styles.tableBorder]}>
          <AppText variant="caption" style={styles.dayCell}>
            {dateKey === todayKey ? 'Today' : formatDay(dateKey, { month: 'short', day: 'numeric' })}
          </AppText>
          {day ? (
            <>
              {CATEGORY_IDS.map((id) => (
                <AppText key={id} variant="caption" tone="secondary" style={styles.cell}>
                  {day.categories[id].points}
                </AppText>
              ))}
              <AppText variant="caption" tone="secondary" style={styles.cell}>
                {day.penalty ? `−${day.penalty}` : '0'}
              </AppText>
              <AppText variant="caption" weight="600" style={styles.cell}>
                {day.net > 0 ? `+${day.net}` : day.net}
              </AppText>
            </>
          ) : (
            <AppText variant="caption" tone="muted" style={styles.emptyCell}>
              Not tracking yet
            </AppText>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  flex: {
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.md,
    rowGap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  swatch: {
    width: 10,
    height: 10,
  },
  chartRow: {
    flexDirection: 'row',
    gap: 4,
  },
  tick: {
    position: 'absolute',
    right: 2,
    fontVariant: ['tabular-nums'],
    lineHeight: 16,
  },
  gridline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  bars: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
  },
  dimmed: {
    opacity: 0.35,
  },
  positive: {
    width: '68%',
    maxWidth: 24,
    justifyContent: 'flex-end',
  },
  negative: {
    width: '68%',
    maxWidth: 24,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  detail: {
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  tableBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dayCell: {
    flex: 1.2,
    fontVariant: ['tabular-nums'],
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  emptyCell: {
    flex: 5,
    textAlign: 'right',
  },
});
