/**
 * The 1% Better progress engine.
 *
 * Rules:
 * - Each "yes" adds one point to its category's daily score, capped at
 *   DAILY_CATEGORY_CAP (5) points per category per day. Points count as soon
 *   as they are entered.
 * - When a day ends (11:59 PM local time), unanswered habits count as "no".
 *   Every category that had habits but zero "yes" answers costs
 *   MISSED_CATEGORY_PENALTY (5) points.
 * - The meter never drops below 0%. Reaching 100% is a full charge: it is
 *   celebrated, and the meter starts the next charge with any overflow.
 *
 * The score is always recomputed from the full history, so it is
 * deterministic. Deleting a habit only archives it (see `Habit.archivedKey`),
 * so past days are never rewritten.
 */
import { eachDay, type DateKey } from './dates';
import {
  CATEGORY_IDS,
  isHabitActiveOn,
  type CategoryId,
  type EntryMap,
  type Habit,
} from './types';

/** Most points one category can add to the meter in a day. */
export const DAILY_CATEGORY_CAP = 5;
/** Deducted at midnight for each tracked category with zero "yes" answers. */
export const MISSED_CATEGORY_PENALTY = 5;
/** Meter level that triggers a celebration and starts a new charge. */
export const FULL_CHARGE = 100;
export const MAX_DAILY_POINTS = DAILY_CATEGORY_CAP * CATEGORY_IDS.length;

export interface CategoryDay {
  /** Habits in this category that counted on this day. */
  habits: number;
  /** Habits with a yes or no recorded. */
  answered: number;
  yes: number;
  /** One point per yes, capped at DAILY_CATEGORY_CAP. */
  points: number;
  /** Applied once the day is over, if the category had habits but no yes. */
  penalty: number;
}

export interface DayResult {
  dateKey: DateKey;
  /** The day is over, so its penalties have been applied. */
  final: boolean;
  categories: Record<CategoryId, CategoryDay>;
  points: number;
  penalty: number;
  net: number;
  /** Meter level before and after this day. */
  startScore: number;
  endScore: number;
  /** Times the meter reached 100% on this day. */
  charges: number;
}

export interface Progress {
  /** Current meter level, 0–99. */
  score: number;
  /** Times the meter has reached 100%. */
  charges: number;
  /** One result per day, oldest first, from the first habit's creation to today. */
  days: DayResult[];
  today?: DayResult;
}

type Tally = Record<CategoryId, { yes: number; answered: number }>;

function emptyTally(): Tally {
  return {
    health: { yes: 0, answered: 0 },
    finance: { yes: 0, answered: 0 },
    relationships: { yes: 0, answered: 0 },
  };
}

export function computeProgress(
  habits: readonly Habit[],
  entries: EntryMap,
  todayKey: DateKey,
): Progress {
  let firstKey: DateKey | undefined;
  for (const habit of habits) {
    if (!firstKey || habit.createdKey < firstKey) firstKey = habit.createdKey;
  }
  if (!firstKey || firstKey > todayKey) {
    return { score: 0, charges: 0, days: [] };
  }

  const habitsById = new Map(habits.map((habit) => [habit.id, habit]));
  const tallies = new Map<DateKey, Tally>();
  for (const entry of Object.values(entries)) {
    if (!entry.status || entry.dateKey > todayKey) continue;
    const habit = habitsById.get(entry.habitId);
    if (!habit || !isHabitActiveOn(habit, entry.dateKey)) continue;
    let tally = tallies.get(entry.dateKey);
    if (!tally) {
      tally = emptyTally();
      tallies.set(entry.dateKey, tally);
    }
    tally[habit.categoryId].answered += 1;
    if (entry.status === 'yes') tally[habit.categoryId].yes += 1;
  }

  const habitsByCategory = {} as Record<CategoryId, Habit[]>;
  for (const categoryId of CATEGORY_IDS) {
    habitsByCategory[categoryId] = habits.filter((habit) => habit.categoryId === categoryId);
  }

  let score = 0;
  let charges = 0;
  const days: DayResult[] = [];

  for (const dateKey of eachDay(firstKey, todayKey)) {
    const final = dateKey < todayKey;
    const tally = tallies.get(dateKey) ?? emptyTally();
    const categories = {} as Record<CategoryId, CategoryDay>;
    let points = 0;
    let penalty = 0;

    for (const categoryId of CATEGORY_IDS) {
      const habitCount = habitsByCategory[categoryId].filter((habit) =>
        isHabitActiveOn(habit, dateKey),
      ).length;
      const { yes, answered } = tally[categoryId];
      const categoryPoints = Math.min(yes, DAILY_CATEGORY_CAP);
      const categoryPenalty = final && habitCount > 0 && yes === 0 ? MISSED_CATEGORY_PENALTY : 0;
      categories[categoryId] = {
        habits: habitCount,
        answered,
        yes,
        points: categoryPoints,
        penalty: categoryPenalty,
      };
      points += categoryPoints;
      penalty += categoryPenalty;
    }

    // Gains land during the day; penalties land at midnight, after them.
    const startScore = score;
    score += points;
    let dayCharges = 0;
    while (score >= FULL_CHARGE) {
      score -= FULL_CHARGE;
      dayCharges += 1;
    }
    score = Math.max(0, score - penalty);
    charges += dayCharges;

    days.push({
      dateKey,
      final,
      categories,
      points,
      penalty,
      net: points - penalty,
      startScore,
      endScore: score,
      charges: dayCharges,
    });
  }

  const last = days[days.length - 1];
  return {
    score,
    charges,
    days,
    today: last && last.dateKey === todayKey ? last : undefined,
  };
}

/** Categories that will lose points at midnight unless a habit gets a yes. */
export function categoriesAtRisk(today: DayResult | undefined): CategoryId[] {
  if (!today) return [];
  return CATEGORY_IDS.filter(
    (categoryId) => today.categories[categoryId].habits > 0 && today.categories[categoryId].yes === 0,
  );
}

export interface PeriodSummary {
  days: number;
  points: number;
  penalty: number;
  net: number;
  /** Days on which every category with habits got at least one yes. */
  balancedDays: number;
}

/** Totals for the finished days in [fromKey, toKey]. */
export function summarizeDays(progress: Progress, fromKey: DateKey, toKey: DateKey): PeriodSummary {
  const summary: PeriodSummary = { days: 0, points: 0, penalty: 0, net: 0, balancedDays: 0 };
  for (const day of progress.days) {
    if (!day.final || day.dateKey < fromKey || day.dateKey > toKey) continue;
    summary.days += 1;
    summary.points += day.points;
    summary.penalty += day.penalty;
    summary.net += day.net;
    if (isBalancedDay(day)) summary.balancedDays += 1;
  }
  return summary;
}

/** Every category that had habits got at least one yes (and at least one had habits). */
export function isBalancedDay(day: DayResult): boolean {
  const tracked = CATEGORY_IDS.filter((categoryId) => day.categories[categoryId].habits > 0);
  return tracked.length > 0 && tracked.every((categoryId) => day.categories[categoryId].yes > 0);
}
