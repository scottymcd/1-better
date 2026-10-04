import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BatteryMeter } from '@/components/battery-meter';
import { Card, SectionLabel } from '@/components/card';
import { CategoryIcon, PointsPips } from '@/components/category-bits';
import { CATEGORY_LIST, type CategoryInfo } from '@/constants/categories';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useTheme } from '@/hooks/use-theme';
import { FULL_CHARGE, MAX_DAILY_POINTS, MISSED_CATEGORY_PENALTY, type CategoryDay } from '@/lib/scoring';
import { useProgress } from '@/state/progress';
import { useAppStore } from '@/state/store';

export default function MenuScreen() {
  const colors = useTheme();
  const progress = useProgress();
  const haptic = useHaptics();
  const habits = useAppStore((state) => state.habits);
  const today = progress.today;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/settings')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Settings and reminders">
              <Ionicons name="settings-outline" size={24} color={colors.tint} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        style={{ backgroundColor: colors.background }}>
        <Pressable onPress={() => router.dismissTo('/')} accessibilityRole="button" accessibilityHint="Opens the progress meter">
          <Card style={styles.summary}>
            <BatteryMeter
              level={progress.score}
              height={64}
              showPercent={false}
              charging={false}
              outlineColor={colors.textSecondary}
              trackColor={colors.surfaceAlt}
              boltColor={colors.text}
            />
            <View style={styles.summaryText}>
              <AppText variant="footnote" tone="secondary" weight="600">
                PROGRESS SCORE
              </AppText>
              <AppText variant="title" style={styles.score}>
                {progress.score}%
              </AppText>
              <AppText variant="footnote" tone="secondary">
                +{today?.points ?? 0} of {MAX_DAILY_POINTS} today · {FULL_CHARGE - progress.score} to celebrate
              </AppText>
            </View>
          </Card>
        </Pressable>

        <SectionLabel>Daily habits</SectionLabel>
        <View style={styles.categories}>
          {CATEGORY_LIST.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              habitCount={habits.filter((habit) => habit.categoryId === category.id && !habit.archivedKey).length}
              day={today?.categories[category.id]}
              onPress={() => {
                haptic('tap');
                router.push({ pathname: '/category/[id]', params: { id: category.id } });
              }}
            />
          ))}
        </View>

        <SectionLabel>Insights</SectionLabel>
        <Pressable
          onPress={() => {
            haptic('tap');
            router.push('/dashboard');
          }}
          accessibilityRole="button">
          {({ pressed }) => (
            <Card style={[styles.row, pressed && { opacity: 0.7 }]}>
              <View style={[styles.dashboardIcon, { backgroundColor: colors.tint }]}>
                <Ionicons name="stats-chart" size={22} color={colors.onTint} />
              </View>
              <View style={styles.rowText}>
                <AppText variant="headline">Metrics dashboard</AppText>
                <AppText variant="footnote" tone="secondary">
                  Averages, streaks, your most consistent and most neglected habits
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Card>
          )}
        </Pressable>

        <AppText variant="footnote" tone="muted" align="center" style={styles.footer}>
          Each “yes” adds 1% (up to 5% per area a day). At 11:59 PM unanswered habits count as “no”,
          and any area with no wins costs {MISSED_CATEGORY_PENALTY}%.
        </AppText>
      </ScrollView>
    </>
  );
}

function CategoryCard({
  category,
  habitCount,
  day,
  onPress,
}: {
  category: CategoryInfo;
  habitCount: number;
  day?: CategoryDay;
  onPress: () => void;
}) {
  const colors = useTheme();
  const atRisk = !!day && day.habits > 0 && day.yes === 0;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={category.title}>
      {({ pressed }) => (
        <Card style={[styles.categoryCard, pressed && { opacity: 0.7 }]}>
          <CategoryIcon categoryId={category.id} size={52} />
          <View style={styles.rowText}>
            <AppText variant="headline">{category.title}</AppText>
            {habitCount === 0 ? (
              <AppText variant="footnote" tone="tint" weight="600">
                No habits yet · tap to add your first
              </AppText>
            ) : (
              <>
                <PointsPips categoryId={category.id} points={day?.points ?? 0} />
                <AppText variant="footnote" tone="secondary">
                  {day?.answered ?? 0} of {habitCount} logged today
                </AppText>
                {atRisk && (
                  <View style={[styles.riskChip, { backgroundColor: colors.warningSoft }]}>
                    <Ionicons name="warning" size={13} color={colors.warningText} />
                    <AppText variant="caption" tone="warning" weight="600">
                      No wins yet · −{MISSED_CATEGORY_PENALTY}% at midnight
                    </AppText>
                  </View>
                )}
              </>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  summaryText: {
    flex: 1,
    gap: 2,
  },
  score: {
    fontVariant: ['tabular-nums'],
  },
  categories: {
    gap: Spacing.md,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  dashboardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    marginTop: 2,
  },
  footer: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
});
