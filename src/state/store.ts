import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { DateKey } from '@/lib/dates';
import { createId } from '@/lib/ids';
import { buildSampleData } from '@/lib/sample-data';
import { computeProgress } from '@/lib/scoring';
import {
  entryKey,
  type CategoryId,
  type Entry,
  type EntryMap,
  type EntryStatus,
  type Habit,
} from '@/lib/types';

export const MAX_HABIT_NAME_LENGTH = 80;
export const MAX_NOTE_LENGTH = 500;

export interface ReminderTime {
  id: string;
  hour: number;
  minute: number;
}

export interface Settings {
  remindersEnabled: boolean;
  reminders: ReminderTime[];
  haptics: boolean;
}

interface PersistedState {
  habits: Habit[];
  entries: EntryMap;
  settings: Settings;
  /** Full charges already celebrated, so each one is celebrated exactly once. */
  chargesCelebrated: number;
  /** Last day the app was opened. */
  lastVisitKey?: DateKey;
}

interface SessionState {
  /** The visit before this one, for the "since your last visit" recap. */
  previousVisitKey?: DateKey;
  /** Shows the celebration on demand (Settings → Preview celebration). */
  celebrationPreview: boolean;
}

interface Actions {
  addHabit: (categoryId: CategoryId, name: string, todayKey: DateKey) => Habit | undefined;
  renameHabit: (habitId: string, name: string) => void;
  /** Archives the habit from today on; a habit added today is removed outright. */
  deleteHabit: (habitId: string, todayKey: DateKey) => void;
  /** Sets today's answer; `undefined` clears it. */
  setStatus: (habitId: string, dateKey: DateKey, status: EntryStatus | undefined) => void;
  setNote: (habitId: string, dateKey: DateKey, note: string) => void;
  setRemindersEnabled: (enabled: boolean) => void;
  addReminder: (hour: number, minute: number) => void;
  updateReminder: (id: string, hour: number, minute: number) => void;
  removeReminder: (id: string) => void;
  setHaptics: (enabled: boolean) => void;
  setChargesCelebrated: (count: number) => void;
  setCelebrationPreview: (visible: boolean) => void;
  recordVisit: (todayKey: DateKey) => void;
  loadSampleData: (todayKey: DateKey) => void;
  resetAll: () => void;
}

export type AppState = PersistedState & SessionState & Actions;

export const DEFAULT_SETTINGS: Settings = {
  remindersEnabled: false,
  reminders: [{ id: 'evening', hour: 20, minute: 0 }],
  haptics: true,
};

const initialData: PersistedState = {
  habits: [],
  entries: {},
  settings: DEFAULT_SETTINGS,
  chargesCelebrated: 0,
  lastVisitKey: undefined,
};

// Hydration status lives outside the store so a failed load still lets the app start.
let hydrationSettled = false;
const hydrationListeners = new Set<() => void>();

function settleHydration(): void {
  hydrationSettled = true;
  hydrationListeners.forEach((listener) => listener());
}

function sortReminders(reminders: ReminderTime[]): ReminderTime[] {
  return [...reminders].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
}

/** Writes an entry, or removes it once it holds neither an answer nor a note. */
function withEntry(entries: EntryMap, entry: Entry): EntryMap {
  const key = entryKey(entry.dateKey, entry.habitId);
  const next = { ...entries };
  if (!entry.status && !entry.note) {
    delete next[key];
  } else {
    next[key] = entry;
  }
  return next;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData,
      previousVisitKey: undefined,
      celebrationPreview: false,

      addHabit: (categoryId, name, todayKey) => {
        const trimmed = name.trim().slice(0, MAX_HABIT_NAME_LENGTH);
        if (!trimmed) return undefined;
        const habit: Habit = {
          id: createId(),
          categoryId,
          name: trimmed,
          createdKey: todayKey,
          createdAt: Date.now(),
        };
        set((state) => ({ habits: [...state.habits, habit] }));
        return habit;
      },

      renameHabit: (habitId, name) => {
        const trimmed = name.trim().slice(0, MAX_HABIT_NAME_LENGTH);
        if (!trimmed) return;
        set((state) => ({
          habits: state.habits.map((habit) => (habit.id === habitId ? { ...habit, name: trimmed } : habit)),
        }));
      },

      deleteHabit: (habitId, todayKey) => {
        const habit = get().habits.find((item) => item.id === habitId);
        if (!habit) return;
        if (habit.createdKey >= todayKey) {
          // Nothing has been scored yet, so there's no history to keep.
          set((state) => ({
            habits: state.habits.filter((item) => item.id !== habitId),
            entries: Object.fromEntries(
              Object.entries(state.entries).filter(([, entry]) => entry.habitId !== habitId),
            ),
          }));
          return;
        }
        set((state) => ({
          habits: state.habits.map((item) =>
            item.id === habitId ? { ...item, archivedKey: todayKey } : item,
          ),
        }));
      },

      setStatus: (habitId, dateKey, status) => {
        set((state) => {
          const existing = state.entries[entryKey(dateKey, habitId)];
          return {
            entries: withEntry(state.entries, {
              habitId,
              dateKey,
              note: existing?.note,
              status,
              updatedAt: Date.now(),
            }),
          };
        });
      },

      setNote: (habitId, dateKey, note) => {
        const trimmed = note.trim().slice(0, MAX_NOTE_LENGTH);
        set((state) => {
          const existing = state.entries[entryKey(dateKey, habitId)];
          return {
            entries: withEntry(state.entries, {
              habitId,
              dateKey,
              status: existing?.status,
              note: trimmed || undefined,
              updatedAt: Date.now(),
            }),
          };
        });
      },

      setRemindersEnabled: (enabled) =>
        set((state) => ({ settings: { ...state.settings, remindersEnabled: enabled } })),

      addReminder: (hour, minute) =>
        set((state) => ({
          settings: {
            ...state.settings,
            reminders: sortReminders([...state.settings.reminders, { id: createId(), hour, minute }]),
          },
        })),

      updateReminder: (id, hour, minute) =>
        set((state) => ({
          settings: {
            ...state.settings,
            reminders: sortReminders(
              state.settings.reminders.map((reminder) =>
                reminder.id === id ? { ...reminder, hour, minute } : reminder,
              ),
            ),
          },
        })),

      removeReminder: (id) =>
        set((state) => ({
          settings: {
            ...state.settings,
            reminders: state.settings.reminders.filter((reminder) => reminder.id !== id),
          },
        })),

      setHaptics: (enabled) => set((state) => ({ settings: { ...state.settings, haptics: enabled } })),

      setChargesCelebrated: (count) => set({ chargesCelebrated: count }),

      setCelebrationPreview: (visible) => set({ celebrationPreview: visible }),

      recordVisit: (todayKey) => {
        const { lastVisitKey } = get();
        if (lastVisitKey === todayKey) return;
        set({ previousVisitKey: lastVisitKey, lastVisitKey: todayKey });
      },

      loadSampleData: (todayKey) => {
        const { habits, entries } = buildSampleData(todayKey);
        // Charges already in the sample history aren't celebrated; new ones will be.
        const { charges } = computeProgress(habits, entries, todayKey);
        set({ habits, entries, chargesCelebrated: charges });
      },

      resetAll: () =>
        set((state) => ({
          ...initialData,
          // Keep notification preferences; they mirror OS-level permission state.
          settings: state.settings,
          lastVisitKey: state.lastVisitKey,
          previousVisitKey: undefined,
        })),
    }),
    {
      name: 'one-percent-better',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn('Could not load saved data', error);
        settleHydration();
      },
      partialize: (state): PersistedState => ({
        habits: state.habits,
        entries: state.entries,
        settings: state.settings,
        chargesCelebrated: state.chargesCelebrated,
        lastVisitKey: state.lastVisitKey,
      }),
    },
  ),
);

function subscribeToHydration(onChange: () => void): () => void {
  hydrationListeners.add(onChange);
  return () => hydrationListeners.delete(onChange);
}

/** True once saved data has been loaded from device storage (or loading failed). */
export function useHasHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToHydration,
    () => hydrationSettled,
    () => false,
  );
}
