import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Card, SectionLabel, Separator } from '@/components/card';
import { TimePicker } from '@/components/time-picker';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useTheme } from '@/hooks/use-theme';
import { confirm, notify } from '@/lib/confirm';
import { formatTime } from '@/lib/dates';
import { notificationsSupported, requestReminderPermission, sendTestReminder } from '@/lib/notifications';
import { DAILY_CATEGORY_CAP, FULL_CHARGE, MISSED_CATEGORY_PENALTY } from '@/lib/scoring';
import { useAppStore, type ReminderTime } from '@/state/store';
import { useTodayKey } from '@/state/today';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface PickerState {
  /** Reminder being edited, or undefined when adding a new one. */
  reminderId?: string;
  hour: number;
  minute: number;
}

export default function SettingsScreen() {
  const colors = useTheme();
  const haptic = useHaptics();
  const todayKey = useTodayKey();
  const settings = useAppStore((state) => state.settings);
  const setRemindersEnabled = useAppStore((state) => state.setRemindersEnabled);
  const addReminder = useAppStore((state) => state.addReminder);
  const updateReminder = useAppStore((state) => state.updateReminder);
  const removeReminder = useAppStore((state) => state.removeReminder);
  const setHaptics = useAppStore((state) => state.setHaptics);
  const setCelebrationPreview = useAppStore((state) => state.setCelebrationPreview);
  const loadSampleData = useAppStore((state) => state.loadSampleData);
  const resetAll = useAppStore((state) => state.resetAll);
  const [picker, setPicker] = useState<PickerState>();

  const toggleReminders = async (enabled: boolean) => {
    haptic('select');
    if (!enabled) {
      setRemindersEnabled(false);
      return;
    }
    if (!notificationsSupported) {
      notify('Reminders need the app', 'Open 1% Better on your iPhone to get daily reminder notifications.');
      return;
    }
    const permission = await requestReminderPermission();
    if (permission === 'granted') {
      setRemindersEnabled(true);
      return;
    }
    const openSettings = await confirm({
      title: 'Notifications are turned off',
      message: 'To get daily reminders, allow notifications for 1% Better in the Settings app.',
      confirmLabel: 'Open Settings',
    });
    if (openSettings) Linking.openSettings();
  };

  const saveTime = (state: PickerState) => {
    if (state.reminderId) updateReminder(state.reminderId, state.hour, state.minute);
    else addReminder(state.hour, state.minute);
    setPicker(undefined);
  };

  const confirmRemove = async (reminder: ReminderTime) => {
    const ok = await confirm({
      title: 'Remove this reminder?',
      message: `You won’t be reminded at ${formatTime(reminder.hour, reminder.minute)} anymore.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) removeReminder(reminder.id);
  };

  const testReminder = async () => {
    await sendTestReminder();
    notify('Test reminder scheduled', 'It will arrive in about 5 seconds. Lock your phone or go home to see it.');
  };

  const loadSample = async () => {
    const ok = await confirm({
      title: 'Load sample data?',
      message: 'This replaces your habits and history with 75 days of example data so you can explore the dashboard.',
      confirmLabel: 'Load sample data',
      destructive: true,
    });
    if (!ok) return;
    loadSampleData(todayKey);
    router.dismissTo('/menu');
  };

  const eraseAll = async () => {
    const ok = await confirm({
      title: 'Erase everything?',
      message: 'All habits, answers, notes and your progress score will be permanently deleted.',
      confirmLabel: 'Erase all data',
      destructive: true,
    });
    if (!ok) return;
    resetAll();
    router.dismissTo('/');
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={{ backgroundColor: colors.background }}>
      <SectionLabel>Daily reminders</SectionLabel>
      <Card>
        <View style={styles.row}>
          <RowIcon name="notifications" color={colors.critical} />
          <AppText variant="body" style={styles.flex}>
            Remind me to check in
          </AppText>
          <Switch
            value={settings.remindersEnabled}
            onValueChange={toggleReminders}
            trackColor={{ true: colors.good }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Daily reminders"
          />
        </View>
        {settings.remindersEnabled && (
          <>
            {settings.reminders.map((reminder) => (
              <View key={reminder.id}>
                <Separator inset={56} />
                <View style={styles.row}>
                  <RowIcon name="alarm-outline" color={colors.tint} subtle />
                  <Pressable
                    style={styles.flex}
                    onPress={() => setPicker({ reminderId: reminder.id, hour: reminder.hour, minute: reminder.minute })}
                    accessibilityRole="button"
                    accessibilityLabel={`Reminder at ${formatTime(reminder.hour, reminder.minute)}. Change time`}>
                    <AppText variant="body">{formatTime(reminder.hour, reminder.minute)}</AppText>
                    <AppText variant="caption" tone="secondary">
                      Every day · tap to change
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmRemove(reminder)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Remove reminder">
                    <Ionicons name="trash-outline" size={20} color={colors.criticalText} />
                  </Pressable>
                </View>
              </View>
            ))}
            <Separator inset={56} />
            <Pressable
              style={styles.row}
              onPress={() => setPicker({ hour: settings.reminders.length ? 12 : 20, minute: 0 })}
              accessibilityRole="button">
              <RowIcon name="add" color={colors.tint} subtle />
              <AppText variant="body" tone="tint" weight="600">
                Add a reminder time
              </AppText>
            </Pressable>
          </>
        )}
      </Card>
      <AppText variant="footnote" tone="muted" style={styles.note}>
        {notificationsSupported
          ? 'Reminders repeat daily at the times you choose. Reminders after 9 PM remind you to log before the 11:59 PM cutoff.'
          : 'Daily reminder notifications are available in the iPhone app.'}
      </AppText>
      {settings.remindersEnabled && notificationsSupported && (
        <Pressable onPress={testReminder} style={styles.inlineAction} accessibilityRole="button">
          <AppText variant="subhead" tone="tint" weight="600">
            Send a test notification
          </AppText>
        </Pressable>
      )}

      <SectionLabel>Feedback</SectionLabel>
      <Card>
        <View style={styles.row}>
          <RowIcon name="phone-portrait-outline" color={colors.category.finance} />
          <AppText variant="body" style={styles.flex}>
            Haptic feedback
          </AppText>
          <Switch
            value={settings.haptics}
            onValueChange={setHaptics}
            trackColor={{ true: colors.good }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Haptic feedback"
          />
        </View>
      </Card>

      <SectionLabel>How scoring works</SectionLabel>
      <Card style={styles.rules}>
        <Rule icon="checkmark-circle" color={colors.good}>
          Every “yes” adds 1% to your progress score, up to {DAILY_CATEGORY_CAP}% per area each day
          ({DAILY_CATEGORY_CAP * 3}% max).
        </Rule>
        <Rule icon="moon" color={colors.tint}>
          At 11:59 PM each night, anything you didn’t answer counts as “no”.
        </Rule>
        <Rule icon="remove-circle" color={colors.critical}>
          An area with habits but zero “yes” answers that day costs {MISSED_CATEGORY_PENALTY}%. The score never drops
          below 0%.
        </Rule>
        <Rule icon="flash" color={colors.warningText}>
          Hit {FULL_CHARGE}% and it’s time to celebrate! The meter then starts your next charge, keeping any extra points.
        </Rule>
        <Pressable
          onPress={() => setCelebrationPreview(true)}
          style={[styles.preview, { backgroundColor: colors.tintSoft }]}
          accessibilityRole="button">
          <AppText variant="subhead" tone="tint" weight="700">
            Preview the 100% celebration 🎉
          </AppText>
        </Pressable>
      </Card>

      <SectionLabel>Data</SectionLabel>
      <Card>
        <Pressable style={styles.row} onPress={loadSample} accessibilityRole="button">
          <RowIcon name="flask-outline" color={colors.category.health} />
          <View style={styles.flex}>
            <AppText variant="body">Load sample data</AppText>
            <AppText variant="caption" tone="secondary">
              Explore the app with 75 days of example history
            </AppText>
          </View>
        </Pressable>
        <Separator inset={56} />
        <Pressable style={styles.row} onPress={eraseAll} accessibilityRole="button">
          <RowIcon name="trash" color={colors.critical} />
          <AppText variant="body" tone="critical">
            Erase all data
          </AppText>
        </Pressable>
      </Card>
      <AppText variant="footnote" tone="muted" style={styles.note}>
        Your habits and history are stored only on this device. Version{' '}
        {Constants.expoConfig?.version ?? '1.0.0'}.
      </AppText>

      <TimePickerSheet state={picker} onCancel={() => setPicker(undefined)} onSave={saveTime} />
    </ScrollView>
  );
}

function RowIcon({ name, color, subtle = false }: { name: IconName; color: string; subtle?: boolean }) {
  return (
    <View style={[styles.rowIcon, { backgroundColor: subtle ? 'transparent' : color }]}>
      <Ionicons name={name} size={subtle ? 22 : 17} color={subtle ? color : '#FFFFFF'} />
    </View>
  );
}

function Rule({ icon, color, children }: { icon: IconName; color: string; children: React.ReactNode }) {
  return (
    <View style={styles.rule}>
      <Ionicons name={icon} size={20} color={color} />
      <AppText variant="subhead" style={styles.flex}>
        {children}
      </AppText>
    </View>
  );
}

function TimePickerSheet({
  state,
  onCancel,
  onSave,
}: {
  state?: PickerState;
  onCancel: () => void;
  onSave: (state: PickerState) => void;
}) {
  return (
    <Modal visible={!!state} transparent animationType="slide" onRequestClose={onCancel}>
      {state && <TimePickerSheetContent key={state.reminderId ?? 'new'} initial={state} onCancel={onCancel} onSave={onSave} />}
    </Modal>
  );
}

function TimePickerSheetContent({
  initial,
  onCancel,
  onSave,
}: {
  initial: PickerState;
  onCancel: () => void;
  onSave: (state: PickerState) => void;
}) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [time, setTime] = useState({ hour: initial.hour, minute: initial.minute });
  return (
    <View style={styles.sheetRoot}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} onPress={onCancel} accessibilityLabel="Cancel" />
      <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.sheetHeader}>
          <Pressable onPress={onCancel} hitSlop={10} accessibilityRole="button">
            <AppText variant="body" tone="tint">
              Cancel
            </AppText>
          </Pressable>
          <AppText variant="headline">{initial.reminderId ? 'Change time' : 'New reminder'}</AppText>
          <Pressable onPress={() => onSave({ ...initial, ...time })} hitSlop={10} accessibilityRole="button">
            <AppText variant="body" tone="tint" weight="700">
              Save
            </AppText>
          </Pressable>
        </View>
        <TimePicker hour={time.hour} minute={time.minute} onChange={(hour, minute) => setTime({ hour, minute })} />
        <AppText variant="footnote" tone="secondary" align="center">
          Remind me every day at {formatTime(time.hour, time.minute)}
        </AppText>
      </View>
    </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 52,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  inlineAction: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  rules: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  rule: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  preview: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
});
