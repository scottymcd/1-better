import { createContext, use, useMemo, type ReactNode } from 'react';

import { computeProgress, type Progress } from '@/lib/scoring';
import { useAppStore } from './store';
import { useTodayKey } from './today';

const ProgressContext = createContext<Progress>({ score: 0, charges: 0, days: [] });

/** Computes the progress meter once for the whole app. */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const habits = useAppStore((state) => state.habits);
  const entries = useAppStore((state) => state.entries);
  const todayKey = useTodayKey();
  const progress = useMemo(() => computeProgress(habits, entries, todayKey), [habits, entries, todayKey]);
  return <ProgressContext value={progress}>{children}</ProgressContext>;
}

export function useProgress(): Progress {
  return use(ProgressContext);
}
