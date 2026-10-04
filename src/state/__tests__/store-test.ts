import { computeProgress } from '@/lib/scoring';
import { entryKey } from '@/lib/types';
import { DEFAULT_SETTINGS, useAppStore } from '../store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const TODAY = '2026-10-04';

function store() {
  return useAppStore.getState();
}

beforeEach(() => {
  useAppStore.setState({
    habits: [],
    entries: {},
    settings: DEFAULT_SETTINGS,
    chargesCelebrated: 0,
    lastVisitKey: undefined,
    previousVisitKey: undefined,
    celebrationPreview: false,
  });
});

describe('habits', () => {
  it('adds trimmed habits and ignores blank names', () => {
    const habit = store().addHabit('health', '  Drink water  ', TODAY);
    expect(habit).toMatchObject({ name: 'Drink water', categoryId: 'health', createdKey: TODAY });
    expect(store().addHabit('health', '   ', TODAY)).toBeUndefined();
    expect(store().habits).toHaveLength(1);
  });

  it('renames habits', () => {
    const habit = store().addHabit('finance', 'Budget', TODAY)!;
    store().renameHabit(habit.id, 'Review budget');
    store().renameHabit(habit.id, '   ');
    expect(store().habits[0].name).toBe('Review budget');
  });

  it('removes a habit added today, along with its answers', () => {
    const habit = store().addHabit('health', 'Run', TODAY)!;
    store().setStatus(habit.id, TODAY, 'yes');
    store().deleteHabit(habit.id, TODAY);
    expect(store().habits).toHaveLength(0);
    expect(store().entries).toEqual({});
  });

  it('archives an older habit so past scores stay the same', () => {
    const habit = store().addHabit('health', 'Run', '2026-10-01')!;
    store().setStatus(habit.id, '2026-10-02', 'yes');
    const before = computeProgress(store().habits, store().entries, TODAY).days.slice(0, 3);

    store().deleteHabit(habit.id, TODAY);

    expect(store().habits[0].archivedKey).toBe(TODAY);
    const after = computeProgress(store().habits, store().entries, TODAY);
    expect(after.days.slice(0, 3)).toEqual(before);
    expect(after.today?.categories.health.habits).toBe(0);
  });
});

describe('answers and notes', () => {
  it('sets, changes and clears an answer', () => {
    const habit = store().addHabit('health', 'Run', TODAY)!;
    const key = entryKey(TODAY, habit.id);

    store().setStatus(habit.id, TODAY, 'yes');
    expect(store().entries[key].status).toBe('yes');
    store().setStatus(habit.id, TODAY, 'no');
    expect(store().entries[key].status).toBe('no');
    store().setStatus(habit.id, TODAY, undefined);
    expect(store().entries[key]).toBeUndefined();
  });

  it('keeps notes when the answer changes, and vice versa', () => {
    const habit = store().addHabit('health', 'Run', TODAY)!;
    const key = entryKey(TODAY, habit.id);

    store().setNote(habit.id, TODAY, '  5k in the park ');
    expect(store().entries[key]).toMatchObject({ note: '5k in the park', status: undefined });
    store().setStatus(habit.id, TODAY, 'yes');
    expect(store().entries[key]).toMatchObject({ note: '5k in the park', status: 'yes' });
    store().setStatus(habit.id, TODAY, undefined);
    expect(store().entries[key]).toMatchObject({ note: '5k in the park' });
    store().setNote(habit.id, TODAY, '');
    expect(store().entries[key]).toBeUndefined();
  });
});

describe('reminders', () => {
  it('keeps reminders sorted by time', () => {
    store().addReminder(7, 30);
    store().addReminder(22, 0);
    expect(store().settings.reminders.map((r) => [r.hour, r.minute])).toEqual([
      [7, 30],
      [20, 0],
      [22, 0],
    ]);

    const evening = store().settings.reminders.find((r) => r.hour === 20)!;
    store().updateReminder(evening.id, 6, 0);
    expect(store().settings.reminders[0]).toMatchObject({ id: evening.id, hour: 6, minute: 0 });

    store().removeReminder(evening.id);
    expect(store().settings.reminders).toHaveLength(2);
  });

  it('toggles reminders and haptics', () => {
    store().setRemindersEnabled(true);
    store().setHaptics(false);
    expect(store().settings).toMatchObject({ remindersEnabled: true, haptics: false });
  });
});

describe('visits, sample data and reset', () => {
  it('remembers the previous visit once per day', () => {
    store().recordVisit('2026-10-01');
    store().recordVisit(TODAY);
    store().recordVisit(TODAY);
    expect(store()).toMatchObject({ previousVisitKey: '2026-10-01', lastVisitKey: TODAY });
  });

  it('loads sample data without celebrating its existing charges', () => {
    store().loadSampleData(TODAY);
    const { charges } = computeProgress(store().habits, store().entries, TODAY);
    expect(store().habits.length).toBeGreaterThan(5);
    expect(store().chargesCelebrated).toBe(charges);
  });

  it('erases data but keeps reminder preferences', () => {
    store().setRemindersEnabled(true);
    store().loadSampleData(TODAY);
    store().resetAll();
    expect(store()).toMatchObject({ habits: [], entries: {}, chargesCelebrated: 0 });
    expect(store().settings.remindersEnabled).toBe(true);
  });
});
