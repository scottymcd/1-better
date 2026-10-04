import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Fragment, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card, SectionLabel, Separator } from '@/components/card';
import { CategoryIcon, PointsPips } from '@/components/category-bits';
import { HabitRow } from '@/components/habit-row';
import { NewHabitRow } from '@/components/new-habit-row';
import { CATEGORIES, isCategoryId } from '@/constants/categories';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useTheme } from '@/hooks/use-theme';
import { formatDay } from '@/lib/dates';
import { computeHabitStats } from '@/lib/metrics';
import { DAILY_CATEGORY_CAP, MISSED_CATEGORY_PENALTY } from '@/lib/scoring';
import { entryKey, type CategoryId } from '@/lib/types';
import { useProgress } from '@/state/progress';
import { useAppStore } from '@/state/store';
import { useTodayKey } from '@/state/today';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!isCategoryId(id)) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <AppText variant="headline">That category doesn’t exist.</AppText>
      </View>
    );
  }
  return <CategoryHabits categoryId={id} />;
}

function CategoryHabits({ categoryId }: { categoryId: CategoryId }) {
  const colors = useTheme();
  const haptic = useHaptics();
  const todayKey = useTodayKey();
  const progress = useProgress();
  const category = CATEGORIES[categoryId];
  const allHabits = useAppStore((state) => state.habits);
  const entries = useAppStore((state) => state.entries);
  const addHabit = useAppStore((state) => state.addHabit);
  const setStatus = useAppStore((state) => state.setStatus);
  const scrollRef = useRef<ScrollView>(null);
  const [editing, setEditing] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string>();

  const habits = allHabits
    .filter((habit) => habit.categoryId === categoryId && !habit.archivedKey)
    .sort((a, b) => a.createdAt - b.createdAt);
  const day = progress.today?.categories[categoryId];
  const points = day?.points ?? 0;
  const unusedIdeas = category.suggestions.filter(
    (idea) => !habits.some((habit) => habit.name.toLowerCase() === idea.toLowerCase()),
  );

  const startEditing = () => {
    setEditing(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  };

  const add = (name: string) => {
    const habit = addHabit(categoryId, name, todayKey);
    if (!habit) return false;
    haptic('tap');
    setLastAddedId(habit.id);
    return true;
  };

  let status: { icon: 'warning' | 'trophy' | 'checkmark-circle'; text: string; tone: 'warning' | 'good' | 'secondary' };
  if (points >= DAILY_CATEGORY_CAP) {
    status = { icon: 'trophy', text: `Maxed out for today: +${DAILY_CATEGORY_CAP}% earned`, tone: 'good' };
  } else if (points > 0) {
    status = {
      icon: 'checkmark-circle',
      text: `+${points}% earned today · ${DAILY_CATEGORY_CAP - points} more ${DAILY_CATEGORY_CAP - points === 1 ? 'point' : 'points'} available`,
      tone: 'secondary',
    };
  } else {
    status = {
      icon: 'warning',
      text: habits.length
        ? `No wins yet today. Log a “yes” before midnight to avoid −${MISSED_CATEGORY_PENALTY}%.`
        : 'Add the habits you want to practice every day.',
      tone: habits.length ? 'warning' : 'secondary',
    };
  }
  const statusColor =
    status.tone === 'warning' ? colors.warningText : status.tone === 'good' ? colors.goodText : colors.textSecondary;

  return (
    <>
      <Stack.Screen
        options={{
          title: category.shortTitle,
          headerRight: () => (
            <Pressable onPress={startEditing} hitSlop={12} accessibilityRole="button" accessibilityLabel="Add habit">
              <Ionicons name="add-circle-outline" size={26} color={colors.tint} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={styles.content}
        style={{ backgroundColor: colors.background }}>
        <Card style={styles.header}>
          <CategoryIcon categoryId={categoryId} size={60} />
          <View style={styles.headerText}>
            <AppText variant="title3" weight="700">
              {category.title}
            </AppText>
            <AppText variant="subhead" tone="secondary">
              {category.description}
            </AppText>
            <PointsPips categoryId={categoryId} points={points} large />
          </View>
        </Card>
        <View style={styles.status}>
          <Ionicons name={status.icon} size={16} color={statusColor} />
          <AppText variant="footnote" weight="600" style={[styles.statusText, { color: statusColor }]}>
            {status.text}
          </AppText>
        </View>

        <SectionLabel>{`Today · ${formatDay(todayKey, { weekday: 'long', month: 'short', day: 'numeric' })}`}</SectionLabel>
        <Card>
          {habits.map((habit) => {
            const entry = entries[entryKey(todayKey, habit.id)];
            const stats = computeHabitStats(habit, entries, todayKey);
            return (
              <Fragment key={habit.id}>
                <HabitRow
                  name={habit.name}
                  status={entry?.status}
                  note={entry?.note}
                  streak={stats.currentStreak}
                  highlight={habit.id === lastAddedId}
                  onChange={(next) => setStatus(habit.id, todayKey, next)}
                  onOpen={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
                  onAddDetails={() =>
                    router.push({ pathname: '/habit/[id]', params: { id: habit.id, focus: 'note' } })
                  }
                />
                <Separator />
              </Fragment>
            );
          })}
          <NewHabitRow editing={editing} onEditingChange={setEditing} onSubmit={add} />
        </Card>

        {habits.length < 4 && unusedIdeas.length > 0 && (
          <>
            <SectionLabel>Ideas to get you started</SectionLabel>
            <View style={styles.ideas}>
              {unusedIdeas.map((idea) => (
                <Pressable
                  key={idea}
                  onPress={() => add(idea)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${idea}`}
                  style={({ pressed }) => [
                    styles.idea,
                    { backgroundColor: colors.surface, borderColor: colors.separator },
                    pressed && { opacity: 0.6 },
                  ]}>
                  <Ionicons name="add" size={16} color={colors.tint} />
                  <AppText variant="subhead">{idea}</AppText>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <AppText variant="footnote" tone="muted" style={styles.footer}>
          Tap Yes or No for each habit, and tap a habit to add details about what you did. Each yes
          adds 1% (up to {DAILY_CATEGORY_CAP}% here per day). Answers lock at midnight.
        </AppText>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  headerText: {
    flex: 1,
    gap: Spacing.xs,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.md,
  },
  statusText: {
    flex: 1,
  },
  ideas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  idea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
});
