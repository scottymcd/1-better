import { entryKey, type CategoryId, type EntryMap, type EntryStatus, type Habit } from '../types';

export function habit(
  id: string,
  categoryId: CategoryId,
  createdKey: string,
  archivedKey?: string,
): Habit {
  return { id, categoryId, name: id, createdKey, archivedKey, createdAt: 0 };
}

export function entries(...items: [habitId: string, dateKey: string, status?: EntryStatus][]): EntryMap {
  const map: EntryMap = {};
  for (const [habitId, dateKey, status] of items) {
    map[entryKey(dateKey, habitId)] = { habitId, dateKey, status, updatedAt: 0 };
  }
  return map;
}
