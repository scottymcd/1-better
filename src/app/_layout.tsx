import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { CelebrationHost } from '@/components/celebration';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import { configureNotifications, notificationsSupported, syncDailyReminders } from '@/lib/notifications';
import { ProgressProvider } from '@/state/progress';
import { useAppStore, useHasHydrated } from '@/state/store';
import { TodayProvider, useTodayKey } from '@/state/today';

SplashScreen.preventAutoHideAsync();
configureNotifications();

export default function RootLayout() {
  const isDark = useIsDark();
  const colors = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.tint,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.separator,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <TodayProvider>
        <ProgressProvider>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerTintColor: colors.tint,
              headerTitleStyle: { color: colors.text },
              headerLargeTitleStyle: { color: colors.text },
              headerShadowVisible: false,
              headerLargeTitleShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              contentStyle: { backgroundColor: colors.background },
            }}>
            <Stack.Screen name="index" options={{ headerShown: false, title: 'Meter' }} />
            <Stack.Screen name="menu" options={{ title: '1% Better', headerLargeTitleEnabled: true }} />
            <Stack.Screen name="category/[id]" options={{ title: '' }} />
            <Stack.Screen
              name="habit/[id]"
              options={{ title: 'Habit', presentation: 'modal', headerStyle: { backgroundColor: colors.surface } }}
            />
            <Stack.Screen name="dashboard" options={{ title: 'Metrics', headerLargeTitleEnabled: true }} />
            <Stack.Screen name="settings" options={{ title: 'Settings', headerLargeTitleEnabled: true }} />
          </Stack>
          <CelebrationHost />
          <AppEffects />
        </ProgressProvider>
      </TodayProvider>
    </ThemeProvider>
  );
}

/** App-wide side effects that wait for saved data to load. */
function AppEffects() {
  const hydrated = useHasHydrated();
  const todayKey = useTodayKey();
  const recordVisit = useAppStore((state) => state.recordVisit);
  const remindersEnabled = useAppStore((state) => state.settings.remindersEnabled);
  const reminders = useAppStore((state) => state.settings.reminders);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);

  useEffect(() => {
    // Safety net: never leave the splash screen up if loading stalls.
    const timer = setTimeout(() => SplashScreen.hideAsync(), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated) recordVisit(todayKey);
  }, [hydrated, todayKey, recordVisit]);

  useEffect(() => {
    if (hydrated) syncDailyReminders(remindersEnabled, reminders);
  }, [hydrated, remindersEnabled, reminders]);

  useEffect(() => {
    if (!notificationsSupported) return;
    const open = (notification: Notifications.Notification) => {
      if (notification.request.content.data?.url === '/menu') router.navigate('/menu');
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      open(last.notification);
      Notifications.clearLastNotificationResponse();
    }
    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      open(response.notification),
    );
    return () => subscription.remove();
  }, []);

  return null;
}
