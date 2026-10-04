import { addDays, eachDay, startOfMonth } from '../dates';
import {
  balancedStreak,
  categoryAverages,
  computeHabitStats,
  lifetimeTotals,
  neglectDays,
  overallAverage,
  rankByConsistency,
  rankByNeglect,
  recentDays,
  weekdayAverages,
} from '../metrics';
import { buildSampleData } from '../sample-data';
import { computeProgress } from '../scoring';
import { CATEGORY_IDS } from '../types';
import { entries, habit } from './test-utils';

const TODAY = '2026-10-04'; // a Sunday

describe('categoryAverages', () => {
  const start = '2026-09-28';
  const habits = [habit('run', 'health', start), habit('read', 'health', start), habit('save', 'finance', start)];
  const log = entries(
    ['run', '2026-09-28', 'yes'],
    ['read', '2026-09-28', 'yes'],
    ['save', '2026-09-28', 'yes'],
    ['run', '2026-09-30', 'yes'],
    ['save', '2026-10-01', 'yes'],
    ['run', '2026-10-02', 'yes'],
    ['read', '2026-10-02', 'yes'],
    ['save', '2026-10-02', 'yes'],
  );

  it('averages points and penalties per tracked day', () => {
    const progress = computeProgress(habits, log, TODAY);
    const averages = categoryAverages(progress, start, TODAY);

    // Finished days 9/28–10/3 (6 days); today has nothing logged so it is skipped.
    // Health: 2 + 0 + 1 + 0 + 2 + 0 = 5 points; missed 9/29, 10/1, 10/3.
    expect(averages.health).toMatchObject({ days: 6, points: 5, penaltyDays: 3, penalty: 15 });
    expect(averages.health.avgPoints).toBeCloseTo(5 / 6);
    expect(averages.health.avgNet).toBeCloseTo((5 - 15) / 6);
    // Finance: yes on 9/28, 10/1, 10/2.
    expect(averages.finance).toMatchObject({ days: 6, points: 3, penaltyDays: 3 });
    // No relationship habits: nothing to average.
    expect(averages.relationships).toMatchObject({ days: 0, avgPoints: 0, avgNet: 0 });
  });

  it('includes today once something has been logged', () => {
    const withToday = { ...log, ...entries(['run', TODAY, 'no']) };
    const progress = computeProgress(habits, withToday, TODAY);
    expect(categoryAverages(progress, start, TODAY).health.days).toBe(7);
    expect(categoryAverages(progress, start, TODAY).finance.days).toBe(6);
  });

  it('restricts to the requested window (month to date)', () => {
    const progress = computeProgress(habits, log, TODAY);
    const monthToDate = categoryAverages(progress, startOfMonth(TODAY), TODAY);
    // 10/1–10/3: health 0 + 2 + 0.
    expect(monthToDate.health).toMatchObject({ days: 3, points: 2 });
  });

  it('computes an overall daily average across categories', () => {
    const progress = computeProgress(habits, log, TODAY);
    const overall = overallAverage(progress, start, TODAY);
    expect(overall.days).toBe(6);
    expect(overall.avgPoints).toBeCloseTo(8 / 6);
  });
});

describe('computeHabitStats', () => {
  const created = '2026-09-25';
  const run = habit('run', 'health', created);

  it('tracks current and best streaks, rate, and days since the last yes', () => {
    const log = entries(
      ['run', '2026-09-25', 'yes'],
      ['run', '2026-09-26', 'yes'],
      ['run', '2026-09-27', 'yes'],
      ['run', '2026-09-28', 'no'],
      ['run', '2026-10-02', 'yes'],
      ['run', '2026-10-03', 'yes'],
    );
    const stats = computeHabitStats(run, log, TODAY);

    expect(stats.bestStreak).toBe(3);
    // Today isn't answered yet, so the streak through yesterday is still alive.
    expect(stats.currentStreak).toBe(2);
    // 9/25–10/3 = 9 finished days, today excluded until answered.
    expect(stats.days).toBe(9);
    expect(stats.yes).toBe(5);
    expect(stats.rate).toBeCloseTo(5 / 9);
    expect(stats.lastYesKey).toBe('2026-10-03');
    expect(stats.daysSinceYes).toBe(1);
    expect(stats.age).toBe(9);
  });

  it('extends the streak when today is a yes', () => {
    const log = entries(['run', '2026-10-03', 'yes'], ['run', TODAY, 'yes']);
    const stats = computeHabitStats(run, log, TODAY);
    expect(stats.currentStreak).toBe(2);
    expect(stats.daysSinceYes).toBe(0);
    expect(stats.days).toBe(10);
  });

  it('ends the streak when today is answered "no"', () => {
    const log = entries(['run', '2026-10-03', 'yes'], ['run', TODAY, 'no']);
    const stats = computeHabitStats(run, log, TODAY);
    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(1);
  });

  it('resets the streak after a finished day without a yes', () => {
    const log = entries(['run', '2026-10-02', 'yes']);
    expect(computeHabitStats(run, log, TODAY).currentStreak).toBe(0);
  });

  it('limits the rate to a window but keeps streaks from the full history', () => {
    const log = entries(
      ...eachDay(created, '2026-10-03').map((d): [string, string, 'yes'] => ['run', d, 'yes']),
    );
    const stats = computeHabitStats(run, log, TODAY, '2026-10-01');
    expect(stats.days).toBe(3);
    expect(stats.rate).toBe(1);
    expect(stats.currentStreak).toBe(9);
  });

  it('reports never-checked habits', () => {
    const stats = computeHabitStats(run, {}, TODAY);
    expect(stats).toMatchObject({ yes: 0, rate: 0, daysSinceYes: null, currentStreak: 0 });
    expect(neglectDays(stats)).toBe(9);
  });

  it('stops counting archived habits on the archive day', () => {
    const archived = habit('run', 'health', created, '2026-09-28');
    const stats = computeHabitStats(archived, entries(['run', '2026-09-27', 'yes']), TODAY);
    expect(stats.days).toBe(3);
    expect(stats.yes).toBe(1);
  });
});

describe('rankings', () => {
  const created = '2026-09-27';
  const habits = [
    habit('steady', 'health', created),
    habit('sometimes', 'finance', created),
    habit('never', 'relationships', created),
    habit('fresh', 'health', TODAY),
    habit('done-today', 'finance', created),
  ];
  const log = entries(
    ...eachDay(created, '2026-10-03').map((d): [string, string, 'yes'] => ['steady', d, 'yes']),
    ['sometimes', '2026-09-28', 'yes'],
    ['sometimes', '2026-09-30', 'yes'],
    ['done-today', TODAY, 'yes'],
  );
  const stats = habits.map((h) => computeHabitStats(h, log, TODAY));

  it('ranks the most consistent habits first', () => {
    const ranked = rankByConsistency(stats).map((s) => s.habit.id);
    // "fresh" has no finished days yet, so it isn't ranked.
    expect(ranked).toEqual(['steady', 'sometimes', 'done-today', 'never']);
  });

  it('ranks the longest-neglected habits first', () => {
    const ranked = rankByNeglect(stats).map((s) => [s.habit.id, neglectDays(s)]);
    expect(ranked).toEqual([
      ['never', 7],
      ['sometimes', 4],
      ['steady', 1],
    ]);
  });
});

describe('balancedStreak', () => {
  it('counts consecutive days where every tracked category got a yes', () => {
    const start = '2026-09-28';
    const habits = [habit('run', 'health', start), habit('save', 'finance', start)];
    const both = (d: string): [string, string, 'yes'][] => [
      ['run', d, 'yes'],
      ['save', d, 'yes'],
    ];
    const log = entries(
      ...both('2026-09-28'),
      ...both('2026-09-29'),
      ...both('2026-09-30'),
      ['run', '2026-10-01', 'yes'],
      ...both('2026-10-02'),
      ...both('2026-10-03'),
    );
    const progress = computeProgress(habits, log, TODAY);
    expect(balancedStreak(progress)).toEqual({ current: 2, best: 3 });

    const withToday = computeProgress(habits, { ...log, ...entries(...both(TODAY)) }, TODAY);
    expect(balancedStreak(withToday)).toEqual({ current: 3, best: 3 });
  });
});

describe('weekdayAverages', () => {
  it('averages finished days by weekday', () => {
    const start = '2026-09-20'; // Sunday
    const habits = [habit('run', 'health', start)];
    const log = entries(['run', '2026-09-20', 'yes'], ['run', '2026-09-21', 'yes'], ['run', '2026-09-28', 'yes']);
    const averages = weekdayAverages(computeProgress(habits, log, TODAY), start, TODAY);
    expect(averages[0]).toEqual({ weekday: 0, days: 2, avgPoints: 0.5 }); // 9/20 yes, 9/27 no; today excluded
    expect(averages[1]).toEqual({ weekday: 1, days: 2, avgPoints: 1 });
    expect(averages[2]).toEqual({ weekday: 2, days: 2, avgPoints: 0 });
  });
});

describe('lifetimeTotals and recentDays', () => {
  it('sums the whole history', () => {
    const start = '2026-10-01';
    const habits = [habit('run', 'health', start), habit('save', 'finance', start)];
    const log = entries(['run', '2026-10-01', 'yes'], ['save', '2026-10-01', 'yes'], ['run', '2026-10-02', 'yes']);
    const progress = computeProgress(habits, log, TODAY);
    const totals = lifetimeTotals(progress);
    expect(totals).toMatchObject({ yes: 3, points: 3, penalty: 5 + 10, trackedDays: 4 });
    expect(totals.bestDay?.dateKey).toBe('2026-10-01');

    const recent = recentDays(progress, TODAY, 7);
    expect(recent).toHaveLength(7);
    expect(recent[0]).toEqual({ dateKey: '2026-09-28', day: undefined });
    expect(recent[6].day?.dateKey).toBe(TODAY);
  });
});

describe('buildSampleData', () => {
  it('produces a deterministic, valid history', () => {
    const first = buildSampleData(TODAY);
    const second = buildSampleData(TODAY);
    expect(second).toEqual(first);

    const ids = new Set(first.habits.map((h) => h.id));
    for (const entry of Object.values(first.entries)) {
      expect(ids.has(entry.habitId)).toBe(true);
      expect(entry.dateKey <= TODAY).toBe(true);
    }
    for (const categoryId of CATEGORY_IDS) {
      expect(first.habits.some((h) => h.categoryId === categoryId)).toBe(true);
    }

    const progress = computeProgress(first.habits, first.entries, TODAY);
    expect(progress.days.length).toBeGreaterThan(60);
    expect(progress.charges).toBeGreaterThan(0);
    expect(progress.days[0].dateKey).toBe(addDays(TODAY, -75));
  });
});
