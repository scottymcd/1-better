import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { msUntilNextMidnight, toDateKey, type DateKey } from '@/lib/dates';

const TodayContext = createContext<DateKey>(toDateKey(new Date()));

/**
 * Provides today's date key and rolls it over at local midnight (and whenever
 * the app returns to the foreground), which is when yesterday's unanswered
 * habits are tallied as "no".
 */
export function TodayProvider({ children }: { children: ReactNode }) {
  const [todayKey, setTodayKey] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    const refresh = () => setTodayKey(toDateKey(new Date()));
    let timer: ReturnType<typeof setTimeout>;
    const scheduleRollover = () => {
      timer = setTimeout(() => {
        refresh();
        scheduleRollover();
      }, msUntilNextMidnight(new Date()) + 1000);
    };
    scheduleRollover();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return <TodayContext value={todayKey}>{children}</TodayContext>;
}

export function useTodayKey(): DateKey {
  return use(TodayContext);
}
