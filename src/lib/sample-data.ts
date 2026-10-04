/**
 * Deterministic demo history, so the dashboard can be explored before weeks
 * of real data exist. Loaded from Settings → "Load sample data".
 */
import { addDays, eachDay, fromDateKey, weekday, type DateKey } from './dates';
import { entryKey, type CategoryId, type EntryMap, type Habit } from './types';

interface SampleHabit {
  categoryId: CategoryId;
  name: string;
  /** Chance of a yes on any given day. */
  rate: number;
  /** Added this many days before today. */
  addedDaysAgo: number;
  weekendRate?: number;
  notes?: string[];
}

const SAMPLE_HABITS: SampleHabit[] = [
  {
    categoryId: 'health',
    name: 'Move for 30 minutes',
    rate: 0.8,
    addedDaysAgo: 75,
    notes: ['Morning run, 3 miles', 'Gym: leg day', 'Long walk with the dog', 'Yoga class'],
  },
  { categoryId: 'health', name: 'Drink 8 glasses of water', rate: 0.65, addedDaysAgo: 75 },
  { categoryId: 'health', name: 'Lights out by 11 PM', rate: 0.45, addedDaysAgo: 60, weekendRate: 0.2 },
  { categoryId: 'health', name: 'Meditate for 10 minutes', rate: 0.15, addedDaysAgo: 40 },
  {
    categoryId: 'finance',
    name: 'Log every purchase',
    rate: 0.7,
    addedDaysAgo: 75,
    weekendRate: 0.45,
    notes: ['Logged groceries and gas', 'All receipts logged'],
  },
  { categoryId: 'finance', name: 'No impulse buys', rate: 0.6, addedDaysAgo: 75, weekendRate: 0.4 },
  {
    categoryId: 'finance',
    name: 'Learn a career skill for 20 minutes',
    rate: 0.45,
    addedDaysAgo: 50,
    weekendRate: 0.2,
    notes: ['Finished a SQL lesson', 'Read two chapters of a leadership book', 'Updated my resume'],
  },
  { categoryId: 'finance', name: 'Review the weekly budget', rate: 0.08, addedDaysAgo: 30 },
  {
    categoryId: 'relationships',
    name: 'Call or text someone I love',
    rate: 0.55,
    addedDaysAgo: 75,
    weekendRate: 0.8,
    notes: ['Called Mom', 'Texted my brother', 'Video call with old friends'],
  },
  { categoryId: 'relationships', name: 'Tidy up for 10 minutes', rate: 0.5, addedDaysAgo: 75 },
  { categoryId: 'relationships', name: 'Phone-free dinner', rate: 0.35, addedDaysAgo: 45, weekendRate: 0.6 },
  { categoryId: 'relationships', name: 'Plan a date night', rate: 0, addedDaysAgo: 12 },
];

/** Small seeded PRNG (mulberry32) so the sample history is identical every time. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSampleData(todayKey: DateKey, seed = 7): { habits: Habit[]; entries: EntryMap } {
  const random = createRandom(seed);
  const habits: Habit[] = SAMPLE_HABITS.map((sample, index) => {
    const createdKey = addDays(todayKey, -sample.addedDaysAgo);
    return {
      id: `sample-${index}`,
      categoryId: sample.categoryId,
      name: sample.name,
      createdKey,
      createdAt: fromDateKey(createdKey).getTime() + index,
    };
  });

  const entries: EntryMap = {};
  const firstKey = addDays(todayKey, -Math.max(...SAMPLE_HABITS.map((sample) => sample.addedDaysAgo)));

  for (const dateKey of eachDay(firstKey, todayKey)) {
    const isToday = dateKey === todayKey;
    // Roughly one day in twelve the app never got opened: everything is auto-tallied as "no".
    if (!isToday && random() < 0.08) continue;
    const isWeekend = [0, 6].includes(weekday(dateKey));

    habits.forEach((habit, index) => {
      if (dateKey < habit.createdKey) return;
      const sample = SAMPLE_HABITS[index];
      // Today is only half logged, so there is something left to check off.
      if (isToday && index % 2 === 1) return;
      const rate = isWeekend ? (sample.weekendRate ?? sample.rate) : sample.rate;
      const yes = random() < rate;
      const answered = yes || random() < 0.7;
      if (!answered) return;
      const note =
        yes && sample.notes && random() < 0.35
          ? sample.notes[Math.floor(random() * sample.notes.length)]
          : undefined;
      entries[entryKey(dateKey, habit.id)] = {
        habitId: habit.id,
        dateKey,
        status: yes ? 'yes' : 'no',
        note,
        updatedAt: fromDateKey(dateKey).getTime(),
      };
    });
  }

  return { habits, entries };
}
