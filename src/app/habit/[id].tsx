import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card, SectionLabel, Separator } from '@/components/card';
import { CategoryIcon } from '@/components/category-bits';
import { CATEGORIES } from '@/constants/categories';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { addDays, daysBetween, eachDay, formatDay, maxKey, relativeDayLabel } from '@/lib/dates';
import { computeHabitStats } from '@/lib/metrics';
import { entryKey, type EntryStatus, type Habit } from '@/lib/types';
import { MAX_HABIT_NAME_LENGTH, MAX_NOTE_LENGTH, useAppStore } from '@/state/store';
import { useTodayKey } from '@/state/today';

const HISTORY_DAYS = 30;

export default function HabitScreen() {
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const habit = useAppStore((state) => state.habits.find((item) => item.id === id && !item.archivedKey));
  const colors = useTheme();

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
              <AppText variant="body" weight="600" style={{ color: colors.tint }}>
                Done
              </AppText>
            </Pressable>
          ),
        }}
      />
      {habit ? (
        <HabitDetails key={habit.id} habit={habit} focusNote={focus === 'note'} />
      ) : (
        <View style={[styles.missing, { backgroundColor: colors.surfaceAlt }]}>
          <AppText variant="headline">This habit was deleted.</AppText>
        </View>
      )}
    </>
  );
}

function HabitDetails({ habit, focusNote }: { habit: Habit; focusNote: boolean }) {
  const colors = useTheme();
  const haptic = useHaptics();
  const todayKey = useTodayKey();
  const entries = useAppStore((state) => state.entries);
  const setStatus = useAppStore((state) => state.setStatus);
  const setNote = useAppStore((state) => state.setNote);
  const renameHabit = useAppStore((state) => state.renameHabit);
  const deleteHabit = useAppStore((state) => state.deleteHabit);

  const todayEntry = entries[entryKey(todayKey, habit.id)];
  const [name, setName] = useState(habit.name);
  const [note, setNoteText] = useState(todayEntry?.note ?? '');

  const saveName = () => {
    if (!name.trim()) setName(habit.name);
    else if (name.trim() !== habit.name) renameHabit(habit.id, name);
  };
  const saveNote = () => {
    if (note.trim() !== (todayEntry?.note ?? '')) setNote(habit.id, todayKey, note);
  };
  // Closing the sheet doesn't always blur the inputs first, so save on the way out too.
  const saveOnClose = useEffectEvent(() => {
    saveName();
    saveNote();
  });
  useEffect(() => () => saveOnClose(), []);
  const stats = computeHabitStats(habit, entries, todayKey);
  const category = CATEGORIES[habit.categoryId];
  const age = daysBetween(habit.createdKey, todayKey);

  const choose = (status: EntryStatus) => {
    const next = todayEntry?.status === status ? undefined : status;
    haptic(next === 'yes' ? 'success' : 'select');
    setStatus(habit.id, todayKey, next);
  };

  const remove = async () => {
    const confirmed = await confirm({
      title: `Delete “${habit.name}”?`,
      message:
        'It will disappear from your list and stop counting from today. Days you already logged stay in your score and history.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    deleteHabit(habit.id, todayKey);
    router.back();
  };

  const historyStart = maxKey(habit.createdKey, addDays(todayKey, -(HISTORY_DAYS - 1)));
  const history = eachDay(historyStart, todayKey).reverse();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={{ backgroundColor: colors.surfaceAlt }}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive">
      <View style={styles.titleRow}>
        <CategoryIcon categoryId={habit.categoryId} size={40} />
        <View style={styles.flex}>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={saveName}
            maxLength={MAX_HABIT_NAME_LENGTH}
            multiline
            // The browser preview renders multiline inputs as two-row textareas by default.
            numberOfLines={Platform.OS === 'web' ? 1 : undefined}
            submitBehavior="blurAndSubmit"
            blurOnSubmit
            style={[styles.nameInput, { color: colors.text }]}
            accessibilityLabel="Habit name"
          />
          <AppText variant="footnote" tone="secondary">
            {category.title} · added {age === 0 ? 'today' : `${formatDay(habit.createdKey, { month: 'short', day: 'numeric' })}`}
          </AppText>
        </View>
      </View>

      <SectionLabel>Today</SectionLabel>
      <Card style={styles.todayCard}>
        <AppText variant="headline">Did you do it today?</AppText>
        <View style={styles.bigChoices}>
          <BigChoice kind="yes" selected={todayEntry?.status === 'yes'} onPress={() => choose('yes')} />
          <BigChoice kind="no" selected={todayEntry?.status === 'no'} onPress={() => choose('no')} />
        </View>
        <AppText variant="subhead" weight="600" style={styles.detailsLabel}>
          Details <AppText variant="subhead" tone="muted">(optional)</AppText>
        </AppText>
        <TextInput
          value={note}
          onChangeText={setNoteText}
          onBlur={saveNote}
          autoFocus={focusNote}
          placeholder="What did you do today?"
          placeholderTextColor={colors.textMuted}
          maxLength={MAX_NOTE_LENGTH}
          multiline
          style={[styles.noteInput, { color: colors.text, backgroundColor: colors.surfaceAlt }]}
          accessibilityLabel="Details about today"
        />
      </Card>

      <SectionLabel>Stats</SectionLabel>
      <View style={styles.statsGrid}>
        <StatTile icon="flame" label="Current streak" value={`${stats.currentStreak} ${stats.currentStreak === 1 ? 'day' : 'days'}`} />
        <StatTile icon="trophy" label="Best streak" value={`${stats.bestStreak} ${stats.bestStreak === 1 ? 'day' : 'days'}`} />
        <StatTile
          icon="pie-chart"
          label="Completion"
          value={stats.days ? `${Math.round(stats.rate * 100)}%` : '–'}
          detail={stats.days ? `${stats.yes} of ${stats.days} days` : 'No finished days yet'}
        />
        <StatTile
          icon="time"
          label="Last checked off"
          value={
            stats.daysSinceYes === null
              ? 'Never'
              : stats.daysSinceYes === 0
                ? 'Today'
                : `${stats.daysSinceYes} ${stats.daysSinceYes === 1 ? 'day' : 'days'} ago`
          }
        />
      </View>

      <SectionLabel>History</SectionLabel>
      <Card>
        {history.map((dateKey, index) => {
          const entry = entries[entryKey(dateKey, habit.id)];
          const isToday = dateKey === todayKey;
          return (
            <View key={dateKey}>
              {index > 0 && <Separator />}
              <HistoryRow dateLabel={relativeDayLabel(dateKey, todayKey)} status={entry?.status} note={entry?.note} pending={isToday} />
            </View>
          );
        })}
      </Card>

      <Pressable
        onPress={remove}
        style={({ pressed }) => [styles.deleteButton, { backgroundColor: colors.surface }, pressed && { opacity: 0.6 }]}
        accessibilityRole="button">
        <Ionicons name="trash-outline" size={18} color={colors.criticalText} />
        <AppText variant="body" tone="critical" weight="600">
          Delete habit
        </AppText>
      </Pressable>
    </ScrollView>
  );
}

function BigChoice({ kind, selected, onPress }: { kind: EntryStatus; selected: boolean; onPress: () => void }) {
  const colors = useTheme();
  const isYes = kind === 'yes';
  const color = isYes ? colors.good : colors.critical;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.bigChoice,
        {
          backgroundColor: selected ? color : colors.surfaceAlt,
          borderColor: selected ? color : colors.separator,
        },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}>
      <Ionicons name={isYes ? 'checkmark-circle' : 'close-circle'} size={26} color={selected ? '#FFFFFF' : color} />
      <View>
        <AppText variant="headline" style={{ color: selected ? '#FFFFFF' : colors.text }}>
          {isYes ? 'Yes' : 'No'}
        </AppText>
        <AppText variant="caption" style={{ color: selected ? 'rgba(255,255,255,0.85)' : colors.textSecondary }}>
          {isYes ? 'Goal was met' : 'Didn’t happen'}
        </AppText>
      </View>
    </Pressable>
  );
}

function StatTile({
  icon,
  label,
  value,
  detail,
}: {
  icon: 'flame' | 'trophy' | 'pie-chart' | 'time';
  label: string;
  value: string;
  detail?: string;
}) {
  const colors = useTheme();
  return (
    <Card style={styles.statTile}>
      <View style={styles.statLabel}>
        <Ionicons name={icon} size={14} color={colors.textSecondary} />
        <AppText variant="footnote" tone="secondary">
          {label}
        </AppText>
      </View>
      <AppText variant="title3" weight="700">
        {value}
      </AppText>
      {detail && (
        <AppText variant="caption" tone="muted">
          {detail}
        </AppText>
      )}
    </Card>
  );
}

function HistoryRow({
  dateLabel,
  status,
  note,
  pending,
}: {
  dateLabel: string;
  status?: EntryStatus;
  note?: string;
  pending: boolean;
}) {
  const colors = useTheme();
  let icon: 'checkmark-circle' | 'close-circle' | 'ellipse-outline' | 'remove-circle';
  let label: string;
  let color: string;
  if (status === 'yes') {
    icon = 'checkmark-circle';
    label = 'Yes';
    color = colors.good;
  } else if (status === 'no') {
    icon = 'close-circle';
    label = 'No';
    color = colors.critical;
  } else if (pending) {
    icon = 'ellipse-outline';
    label = 'Not logged yet';
    color = colors.textMuted;
  } else {
    icon = 'remove-circle';
    label = 'Missed (counted as no)';
    color = colors.textMuted;
  }
  return (
    <View style={styles.historyRow}>
      <Ionicons name={icon} size={20} color={color} />
      <View style={styles.flex}>
        <View style={styles.historyHeader}>
          <AppText variant="subhead" weight="600">
            {dateLabel}
          </AppText>
          <AppText variant="footnote" tone="secondary">
            {label}
          </AppText>
        </View>
        {note ? (
          <AppText variant="footnote" tone="secondary">
            {note}
          </AppText>
        ) : null}
      </View>
    </View>
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
  flex: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  todayCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  bigChoices: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  bigChoice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  detailsLabel: {
    marginTop: Spacing.xs,
  },
  noteInput: {
    minHeight: 88,
    fontSize: 16,
    lineHeight: 21,
    padding: Spacing.md,
    borderRadius: Radius.md,
    textAlignVertical: 'top',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statTile: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: Spacing.md,
    gap: 4,
  },
  statLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
});
