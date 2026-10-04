import type { DateKey } from './dates';

export type CategoryId = 'health' | 'finance' | 'relationships';

export const CATEGORY_IDS: readonly CategoryId[] = ['health', 'finance', 'relationships'];

export interface Habit {
  id: string;
  categoryId: CategoryId;
  name: string;
  /** First day the habit is tracked (and can be penalized). */
  createdKey: DateKey;
  /**
   * Set when the habit is deleted. The habit stops counting from this day on,
   * but its history stays so past scores never change retroactively.
   */
  archivedKey?: DateKey;
  createdAt: number;
}

export type EntryStatus = 'yes' | 'no';

export interface Entry {
  habitId: string;
  dateKey: DateKey;
  /** Undefined means "not answered yet" – it is tallied as a no at midnight. */
  status?: EntryStatus;
  note?: string;
  updatedAt: number;
}

/** Entries keyed by `entryKey(dateKey, habitId)`. */
export type EntryMap = Record<string, Entry>;

export function entryKey(dateKey: DateKey, habitId: string): string {
  return `${dateKey}|${habitId}`;
}

export function isHabitActiveOn(habit: Habit, dateKey: DateKey): boolean {
  return habit.createdKey <= dateKey && (!habit.archivedKey || dateKey < habit.archivedKey);
}
