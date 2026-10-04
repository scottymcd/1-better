/**
 * Daily check-in reminders, scheduled as repeating local notifications.
 * Nothing leaves the device, so no push server or account is needed.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const CHANNEL_ID = 'daily-reminders';

export interface ReminderSchedule {
  id: string;
  hour: number;
  minute: number;
}

export type PermissionResult = 'granted' | 'denied' | 'unsupported';

export function configureNotifications(): void {
  if (!notificationsSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function isGranted(status: Notifications.NotificationPermissionsStatus): boolean {
  if (status.granted) return true;
  const iosStatus = status.ios?.status;
  return (
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

/** Asks for permission if it hasn't been decided yet. */
export async function requestReminderPermission(): Promise<PermissionResult> {
  if (!notificationsSupported) return 'unsupported';
  if (Platform.OS === 'android') {
    // Android 13+ only shows the permission prompt once a channel exists.
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (isGranted(current)) return 'granted';
  if (!current.canAskAgain) return 'denied';
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return isGranted(requested) ? 'granted' : 'denied';
}

export function reminderContent(hour: number): Notifications.NotificationContentInput {
  const data = { url: '/menu' };
  if (hour >= 21) {
    return {
      title: '⏰ Last call for today',
      body: 'Log your habits before midnight. Every category without a win costs 5%.',
      data,
    };
  }
  if (hour < 12) {
    return {
      title: '⚡ Good morning!',
      body: 'What will make you 1% better today? Your habits are ready to check off.',
      data,
    };
  }
  return {
    title: '⚡ Time to check in',
    body: 'How did your habits go today? Log your wins to keep charging.',
    data,
  };
}

let pendingSync: Promise<void> = Promise.resolve();

/**
 * Replaces every scheduled reminder with one repeating notification per time.
 * Calls are queued so overlapping updates can't leave stale reminders behind.
 */
export function syncDailyReminders(enabled: boolean, reminders: ReminderSchedule[]): Promise<void> {
  pendingSync = pendingSync.then(() => applyReminders(enabled, reminders)).catch((error: unknown) => {
    console.warn('Could not schedule reminders', error);
  });
  return pendingSync;
}

async function applyReminders(enabled: boolean, reminders: ReminderSchedule[]): Promise<void> {
  if (!notificationsSupported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled || reminders.length === 0) return;
  const permission = await Notifications.getPermissionsAsync();
  if (!isGranted(permission)) return;

  for (const reminder of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: `daily-${reminder.id}`,
      content: reminderContent(reminder.hour),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminder.hour,
        minute: reminder.minute,
        channelId: CHANNEL_ID,
      },
    });
  }
}

export async function sendTestReminder(): Promise<void> {
  if (!notificationsSupported) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚡ This is how your reminders will look',
      body: 'Tap to jump straight to your habits.',
      data: { url: '/menu' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
}
