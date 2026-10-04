/**
 * Read-only analytics for the metrics dashboard, derived from the same
 * history the progress engine uses.
 */
import { addDays, daysBetween, eachDay, maxKey, minKey, weekday, type DateKey } from './dates';
import { isBalancedDay, type DayResult, type Progress } from './scoring';
import { CATEGORY_IDS, entryKey, type CategoryId, type EntryMap, type Habit } from './types';

export interface CategoryAverage {
  /** Days counted: the category had habits, and the day is over or has answers. */
  days: number;
  points: number;
  penalty: number;
  penaltyDays: number;
  /** Average points earned per day (0–5). */
  avgPoints: number;
  /** Average points per day after penalties. */
  avgNet: number;
}

function countsForAverage(day: DayResult, categoryId: CategoryId): boolean {
  const category = day.categories[categoryId];
  if (category.habits === 0) return false;
  // Today only counts once something has been logged, so the average doesn't
  // dip every morning.
  return day.final || category.answered > 0;
}

export function categoryAverages(
  progress: Progress,
  fromKey: DateKey,
  toKey: DateKey,
): Record<CategoryId, CategoryAverage> {
  const result = {} as Record<CategoryId, CategoryAverage>;
  for (const categoryId of CATEGORY_IDS) {
    let days = 0;
    let points = 0;
    let penalty = 0;
    let penaltyDays = 0;
    for (const day of progress.days) {
      if (day.dateKey < fromKey || day.dateKey > toKey) continue;
      if (!countsForAverage(day, categoryId)) continue;
      const category = day.categories[categoryId];
      days += 1;
      points += category.points;
      penalty += category.penalty;
      if (category.penalty > 0) penaltyDays += 1;
    }
    result[categoryId] = {
      days,
      points,
      penalty,
      penaltyDays,
      avgPoints: days ? points / days : 0,
      avgNet: days ? (points - penalty) / days : 0,
    };
  }
  return result;
}

export interface OverallAverage {
  days: number;
  avgPoints: number;
  avgNet: number;
}

/** Average total points per day (across all categories) in [fromKey, toKey]. */
export function overallAverage(progress: Progress, fromKey: DateKey, toKey: DateKey): OverallAverage {
  let days = 0;
  let points = 0;
  let net = 0;
  for (const day of progress.days) {
    if (day.dateKey < fromKey || day.dateKey > toKey) continue;
    if (!CATEGORY_IDS.some((categoryId) => countsForAverage(day, categoryId))) continue;
    days += 1;
    points += day.points;
    net += day.net;
  }
  return { days, avgPoints: days ? points / days : 0, avgNet: days ? net / days : 0 };
}

export interface HabitStats {
  habit: Habit;
  /** Days in the window the habit could be checked off (today only once answered). */
  days: number;
  yes: number;
  /** yes / days, from 0 to 1. */
  rate: number;
  /** Consecutive days with a yes. An unanswered today doesn't break it until midnight. */
  currentStreak: number;
  bestStreak: number;
  lastYesKey?: DateKey;
  /** Days since the last yes, or null if it has never been checked off. */
  daysSinceYes: number | null;
  /** Days since the habit was added (0 = today). */
  age: number;
}

export function computeHabitStats(
  habit: Habit,
  entries: EntryMap,
  todayKey: DateKey,
  windowStart?: DateKey,
): HabitStats {
  const lastActiveKey = habit.archivedKey ? minKey(addDays(habit.archivedKey, -1), todayKey) : todayKey;
  const windowFrom = windowStart ? maxKey(habit.createdKey, windowStart) : habit.createdKey;

  let days = 0;
  let yes = 0;
  let run = 0;
  let bestStreak = 0;
  let lastYesKey: DateKey | undefined;

  for (const dateKey of eachDay(habit.createdKey, lastActiveKey)) {
    const status = entries[entryKey(dateKey, habit.id)]?.status;
    const isToday = dateKey === todayKey;

    if (status === 'yes') {
      run += 1;
      bestStreak = Math.max(bestStreak, run);
      lastYesKey = dateKey;
    } else if (!isToday || status === 'no') {
      run = 0;
    }

    if (dateKey >= windowFrom && (!isToday || status)) {
      days += 1;
      if (status === 'yes') yes += 1;
    }
  }

  return {
    habit,
    days,
    yes,
    rate: days ? yes / days : 0,
    currentStreak: run,
    bestStreak,
    lastYesKey,
    daysSinceYes: lastYesKey ? daysBetween(lastYesKey, todayKey) : null,
    age: Math.max(0, daysBetween(habit.createdKey, todayKey)),
  };
}

/** Most consistent first: completion rate, then total yes, then current streak. */
export function rankByConsistency(stats: readonly HabitStats[]): HabitStats[] {
  return [...stats]
    .filter((stat) => stat.days > 0)
    .sort(
      (a, b) =>
        b.rate - a.rate ||
        b.yes - a.yes ||
        b.currentStreak - a.currentStreak ||
        a.habit.name.localeCompare(b.habit.name),
    );
}

/** How long a habit has gone without a yes; never-checked habits count from when they were added. */
export function neglectDays(stat: HabitStats): number {
  return stat.daysSinceYes ?? stat.age;
}

/**
 * Habits not checked off today (and not brand new), longest-neglected first.
 * A never-checked habit ranks ahead of one last checked off the same number of days ago.
 */
export function rankByNeglect(stats: readonly HabitStats[]): HabitStats[] {
  return stats
    .filter((stat) => neglectDays(stat) > 0)
    .sort(
      (a, b) =>
        neglectDays(b) - neglectDays(a) ||
        Number(b.daysSinceYes === null) - Number(a.daysSinceYes === null) ||
        a.habit.name.localeCompare(b.habit.name),
    );
}

export interface StreakSummary {
  current: number;
  best: number;
}

/**
 * Balanced days: every category with habits got at least one yes, so no
 * penalty was charged. Today extends the streak once it qualifies, but never
 * breaks it.
 */
export function balancedStreak(progress: Progress): StreakSummary {
  let best = 0;
  let run = 0;
  for (const day of progress.days) {
    if (isBalancedDay(day)) {
      run += 1;
      best = Math.max(best, run);
    } else if (day.final) {
      run = 0;
    }
  }
  return { current: run, best };
}

export interface WeekdayAverage {
  weekday: number;
  days: number;
  avgPoints: number;
}

/** Average points earned per weekday over finished days in [fromKey, toKey]. */
export function weekdayAverages(progress: Progress, fromKey: DateKey, toKey: DateKey): WeekdayAverage[] {
  const totals = Array.from({ length: 7 }, (_, index) => ({ weekday: index, days: 0, points: 0 }));
  for (const day of progress.days) {
    if (!day.final || day.dateKey < fromKey || day.dateKey > toKey) continue;
    if (!CATEGORY_IDS.some((categoryId) => day.categories[categoryId].habits > 0)) continue;
    const bucket = totals[weekday(day.dateKey)];
    bucket.days += 1;
    bucket.points += day.points;
  }
  return totals.map(({ weekday: dayOfWeek, days, points }) => ({
    weekday: dayOfWeek,
    days,
    avgPoints: days ? points / days : 0,
  }));
}

export interface LifetimeTotals {
  yes: number;
  points: number;
  penalty: number;
  trackedDays: number;
  bestDay?: DayResult;
}

export function lifetimeTotals(progress: Progress): LifetimeTotals {
  const totals: LifetimeTotals = { yes: 0, points: 0, penalty: 0, trackedDays: 0 };
  for (const day of progress.days) {
    totals.points += day.points;
    totals.penalty += day.penalty;
    for (const categoryId of CATEGORY_IDS) totals.yes += day.categories[categoryId].yes;
    if (CATEGORY_IDS.some((categoryId) => day.categories[categoryId].habits > 0)) {
      totals.trackedDays += 1;
    }
    if (day.points > 0 && (!totals.bestDay || day.net > totals.bestDay.net)) totals.bestDay = day;
  }
  return totals;
}

/** The last `count` days ending today, oldest first; missing days are undefined. */
export function recentDays(
  progress: Progress,
  todayKey: DateKey,
  count: number,
): { dateKey: DateKey; day?: DayResult }[] {
  const byKey = new Map(progress.days.map((day) => [day.dateKey, day]));
  return eachDay(addDays(todayKey, -(count - 1)), todayKey).map((dateKey) => ({
    dateKey,
    day: byKey.get(dateKey),
  }));
}
