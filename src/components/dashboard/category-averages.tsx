import { StyleSheet, View } from 'react-native';

import { CATEGORY_LIST } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CategoryAverage, OverallAverage } from '@/lib/metrics';
import { DAILY_CATEGORY_CAP, MAX_DAILY_POINTS } from '@/lib/scoring';
import type { CategoryId } from '@/lib/types';
import { AppText } from '../app-text';
import { Card, Separator } from '../card';
import { CategoryIcon } from '../category-bits';
import { MeterBar } from './stat-tile';

interface CategoryAveragesProps {
  monthToDate: Record<CategoryId, CategoryAverage>;
  yearToDate: Record<CategoryId, CategoryAverage>;
  overallMonth: OverallAverage;
  overallYear: OverallAverage;
}

function formatAverage(value: number): string {
  return value.toFixed(1);
}

/** Average daily points per category, month to date and year to date. */
export function CategoryAverages({ monthToDate, yearToDate, overallMonth, overallYear }: CategoryAveragesProps) {
  const colors = useTheme();
  return (
    <Card>
      {CATEGORY_LIST.map((category, index) => {
        const month = monthToDate[category.id];
        const year = yearToDate[category.id];
        const color = colors.category[category.id];
        return (
          <View key={category.id}>
            {index > 0 && <Separator />}
            <View style={styles.category}>
              <View style={styles.categoryHeader}>
                <CategoryIcon categoryId={category.id} size={28} />
                <AppText variant="headline" style={styles.flex} numberOfLines={1}>
                  {category.shortTitle}
                </AppText>
              </View>
              {year.days === 0 ? (
                <AppText variant="footnote" tone="muted">
                  No days tracked yet.
                </AppText>
              ) : (
                <>
                  <AverageLine label="Month" average={month} color={color} />
                  <AverageLine label="Year" average={year} color={color} />
                  <AppText variant="caption" tone="muted">
                    Penalty days: {month.penaltyDays} this month · {year.penaltyDays} this year
                  </AppText>
                </>
              )}
            </View>
          </View>
        );
      })}
      <Separator inset={0} />
      <View style={styles.overall}>
        <AppText variant="subhead" weight="600">
          All areas, per day
        </AppText>
        <AppText variant="subhead" tone="secondary" style={styles.tabular}>
          {formatAverage(overallMonth.avgPoints)} MTD · {formatAverage(overallYear.avgPoints)} YTD{' '}
          <AppText variant="caption" tone="muted">
            of {MAX_DAILY_POINTS}
          </AppText>
        </AppText>
      </View>
    </Card>
  );
}

function AverageLine({ label, average, color }: { label: string; average: CategoryAverage; color: string }) {
  return (
    <View
      style={styles.line}
      accessible
      accessibilityLabel={`${label} to date: ${formatAverage(average.avgPoints)} points per day over ${average.days} days`}>
      <AppText variant="footnote" tone="secondary" style={styles.lineLabel}>
        {label}
      </AppText>
      <MeterBar value={average.avgPoints} max={DAILY_CATEGORY_CAP} color={color} />
      <AppText variant="footnote" weight="600" style={[styles.lineValue, styles.tabular]}>
        {average.days ? formatAverage(average.avgPoints) : '–'}
        <AppText variant="caption" tone="muted">
          {' '}
          / {DAILY_CATEGORY_CAP}
        </AppText>
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  category: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  lineLabel: {
    width: 44,
  },
  lineValue: {
    width: 64,
    textAlign: 'right',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  overall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    padding: Spacing.lg,
  },
});
