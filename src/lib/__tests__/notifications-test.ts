import * as Notifications from 'expo-notifications';

import { reminderContent, requestReminderPermission, syncDailyReminders } from '../notifications';


jest.mock('expo-notifications', () => ({
  IosAuthorizationStatus: { NOT_DETERMINED: 0, DENIED: 1, AUTHORIZED: 2, PROVISIONAL: 3, EPHEMERAL: 4 },
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', TIME_INTERVAL: 'timeInterval' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

const mocked = Notifications as jest.Mocked<typeof Notifications>;
const granted = { granted: true, status: 'granted', canAskAgain: true, expires: 'never' } as never;
const undetermined = { granted: false, status: 'undetermined', canAskAgain: true, expires: 'never' } as never;
const denied = { granted: false, status: 'denied', canAskAgain: false, expires: 'never' } as never;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('syncDailyReminders', () => {
  it('replaces scheduled reminders with one daily notification per time', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(granted);
    await syncDailyReminders(true, [
      { id: 'morning', hour: 7, minute: 30 },
      { id: 'late', hour: 21, minute: 45 },
    ]);

    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(mocked.scheduleNotificationAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        identifier: 'daily-morning',
        trigger: expect.objectContaining({ type: 'daily', hour: 7, minute: 30 }),
        content: expect.objectContaining({ data: { url: '/menu' } }),
      }),
    );
    expect(mocked.scheduleNotificationAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ trigger: expect.objectContaining({ hour: 21, minute: 45 }) }),
    );
  });

  it('only cancels when reminders are turned off', async () => {
    await syncDailyReminders(false, [{ id: 'evening', hour: 20, minute: 0 }]);
    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('schedules nothing without permission', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(denied);
    await syncDailyReminders(true, [{ id: 'evening', hour: 20, minute: 0 }]);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('runs overlapping updates one after another', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(granted);
    const calls: string[] = [];
    mocked.cancelAllScheduledNotificationsAsync.mockImplementation(async () => {
      calls.push('cancel');
    });
    mocked.scheduleNotificationAsync.mockImplementation(async (request) => {
      calls.push(String(request.identifier));
      return 'id';
    });

    await Promise.all([
      syncDailyReminders(true, [{ id: 'a', hour: 8, minute: 0 }]),
      syncDailyReminders(true, [{ id: 'b', hour: 9, minute: 0 }]),
    ]);
    expect(calls).toEqual(['cancel', 'daily-a', 'cancel', 'daily-b']);
  });
});

describe('requestReminderPermission', () => {
  it('asks when permission has not been decided', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(undetermined);
    mocked.requestPermissionsAsync.mockResolvedValue(granted);
    await expect(requestReminderPermission()).resolves.toBe('granted');
    expect(mocked.requestPermissionsAsync).toHaveBeenCalled();
  });

  it('reports denied without prompting again', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(denied);
    await expect(requestReminderPermission()).resolves.toBe('denied');
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('reminderContent', () => {
  it('words reminders for the time of day', () => {
    expect(reminderContent(8).title).toContain('morning');
    expect(reminderContent(18).title).toContain('check in');
    expect(reminderContent(22).body).toContain('midnight');
  });
});
