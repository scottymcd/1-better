import { addDays, eachDay } from '../dates';
import {
  categoriesAtRisk,
  computeProgress,
  DAILY_CATEGORY_CAP,
  FULL_CHARGE,
  isBalancedDay,
  MISSED_CATEGORY_PENALTY,
  summarizeDays,
} from '../scoring';
import { CATEGORY_IDS } from '../types';
import { entries, habit } from './test-utils';

const TODAY = '2026-10-04';

describe('computeProgress', () => {
  it('starts empty with no habits', () => {
    expect(computeProgress([], {}, TODAY)).toEqual({ score: 0, charges: 0, days: [] });
  });

  it('counts a yes immediately, without penalizing today', () => {
    const habits = [habit('run', 'health', TODAY), habit('budget', 'finance', TODAY)];
    const progress = computeProgress(habits, entries(['run', TODAY, 'yes']), TODAY);

    expect(progress.score).toBe(1);
    expect(progress.today?.final).toBe(false);
    expect(progress.today?.penalty).toBe(0);
    expect(progress.today?.categories.finance).toMatchObject({ habits: 1, yes: 0, penalty: 0 });
  });

  it('caps each category at five points per day', () => {
    const habits = Array.from({ length: 7 }, (_, i) => habit(`h${i}`, 'health', TODAY));
    const progress = computeProgress(
      habits,
      entries(...habits.map((h): [string, string, 'yes'] => [h.id, TODAY, 'yes'])),
      TODAY,
    );

    expect(progress.today?.categories.health).toMatchObject({ yes: 7, points: DAILY_CATEGORY_CAP });
    expect(progress.score).toBe(DAILY_CATEGORY_CAP);
  });

  it('adds up to fifteen points a day across the three categories', () => {
    const habits = CATEGORY_IDS.flatMap((categoryId) =>
      Array.from({ length: 5 }, (_, i) => habit(`${categoryId}${i}`, categoryId, TODAY)),
    );
    const progress = computeProgress(
      habits,
      entries(...habits.map((h): [string, string, 'yes'] => [h.id, TODAY, 'yes'])),
      TODAY,
    );
    expect(progress.score).toBe(15);
  });

  it('treats unanswered habits as "no" once the day is over', () => {
    const yesterday = addDays(TODAY, -1);
    const habits = [habit('run', 'health', yesterday), habit('budget', 'finance', yesterday)];
    const progress = computeProgress(habits, entries(['run', yesterday, 'yes']), TODAY);

    const [day] = progress.days;
    expect(day.final).toBe(true);
    expect(day.categories.health.penalty).toBe(0);
    expect(day.categories.finance.penalty).toBe(MISSED_CATEGORY_PENALTY);
    // 1 point earned, then 5 lost at midnight; the meter floors at 0.
    expect(day.endScore).toBe(0);
    expect(progress.score).toBe(0);
  });

  it('penalizes explicit "no" answers the same as missing ones', () => {
    const start = addDays(TODAY, -3);
    const habits = [habit('run', 'health', start), habit('save', 'finance', start)];
    const progress = computeProgress(
      habits,
      entries(
        ['run', start, 'yes'],
        ['save', start, 'yes'],
        ['run', addDays(start, 1), 'yes'],
        ['save', addDays(start, 1), 'yes'],
        ['run', addDays(start, 2), 'yes'],
        ['save', addDays(start, 2), 'no'],
      ),
      TODAY,
    );
    // Day 1: +2, day 2: +2 (4), day 3: +1 then -5 (0), today: nothing yet.
    expect(progress.days.map((day) => day.endScore)).toEqual([2, 4, 0, 0]);
    expect(progress.days[2].categories.finance).toMatchObject({ answered: 1, yes: 0, penalty: 5 });
  });

  it('applies up to fifteen points of penalties per missed day', () => {
    const start = addDays(TODAY, -10);
    const habits = [
      habit('run', 'health', start),
      habit('save', 'finance', start),
      habit('call', 'relationships', start),
    ];
    const allYes = eachDay(start, addDays(start, 4)).flatMap((dateKey) =>
      ['run', 'save', 'call'].map((id): [string, string, 'yes'] => [id, dateKey, 'yes']),
    );
    const progress = computeProgress(habits, entries(...allYes), TODAY);
    // Five perfect days (+3 each = 15), then a missed day costs 15.
    expect(progress.days[4].endScore).toBe(15);
    expect(progress.days[5].penalty).toBe(15);
    expect(progress.days[5].endScore).toBe(0);
  });

  it('never penalizes a category that has no habits', () => {
    const yesterday = addDays(TODAY, -1);
    const progress = computeProgress(
      [habit('run', 'health', yesterday)],
      entries(['run', yesterday, 'yes']),
      TODAY,
    );
    expect(progress.days[0].penalty).toBe(0);
    expect(progress.score).toBe(1);
  });

  it('only tracks a habit from the day it was added', () => {
    const start = addDays(TODAY, -5);
    const habits = [habit('run', 'health', start), habit('save', 'finance', addDays(TODAY, -1))];
    const yesEveryDay = eachDay(start, TODAY).map((d): [string, string, 'yes'] => ['run', d, 'yes']);
    const progress = computeProgress(habits, entries(...yesEveryDay), TODAY);

    expect(progress.days.map((day) => day.penalty)).toEqual([0, 0, 0, 0, 5, 0]);
  });

  it('fills to 100%, celebrates, and carries the overflow into the next charge', () => {
    const start = addDays(TODAY, -7);
    const habits = CATEGORY_IDS.flatMap((categoryId) =>
      Array.from({ length: 5 }, (_, i) => habit(`${categoryId}${i}`, categoryId, start)),
    );
    const perfect = eachDay(start, addDays(TODAY, -1)).flatMap((dateKey) =>
      habits.map((h): [string, string, 'yes'] => [h.id, dateKey, 'yes']),
    );
    const progress = computeProgress(habits, entries(...perfect), TODAY);

    // 7 perfect days × 15 points = 105 → one full charge plus 5%.
    expect(progress.charges).toBe(1);
    expect(progress.score).toBe(105 - FULL_CHARGE);
    expect(progress.days[6]).toMatchObject({ startScore: 90, endScore: 5, charges: 1 });
  });

  it('keeps a celebration even if a penalty lands at midnight the same day', () => {
    const start = addDays(TODAY, -8);
    const habits = [
      ...Array.from({ length: 5 }, (_, i) => habit(`h${i}`, 'health', start)),
      ...Array.from({ length: 5 }, (_, i) => habit(`f${i}`, 'finance', start)),
      ...Array.from({ length: 5 }, (_, i) => habit(`r${i}`, 'relationships', start)),
    ];
    const items: [string, string, 'yes'][] = [];
    // Six perfect days → 90%. Day seven: health and finance only (+10 → 100%),
    // so relationships is penalized at midnight.
    for (const dateKey of eachDay(start, addDays(start, 5))) {
      for (const h of habits) items.push([h.id, dateKey, 'yes']);
    }
    for (let i = 0; i < 5; i++) {
      items.push([`h${i}`, addDays(start, 6), 'yes'], [`f${i}`, addDays(start, 6), 'yes']);
    }
    const progress = computeProgress(habits, entries(...items), TODAY);

    const day7 = progress.days[6];
    expect(day7).toMatchObject({ startScore: 90, points: 10, penalty: 5, charges: 1, endScore: 0 });
    expect(progress.charges).toBe(1);
  });

  it('keeps an archived habit’s past but stops counting it from the archive day', () => {
    const start = addDays(TODAY, -4);
    const archiveDay = addDays(TODAY, -2);
    const habits = [habit('run', 'health', start, archiveDay), habit('walk', 'health', start)];
    const progress = computeProgress(
      habits,
      entries(
        ['run', start, 'yes'],
        ['walk', start, 'yes'],
        ['run', addDays(start, 1), 'yes'],
        // Entries on/after the archive day no longer count.
        ['run', archiveDay, 'yes'],
        ['walk', archiveDay, 'yes'],
      ),
      TODAY,
    );

    expect(progress.days.map((day) => day.categories.health.habits)).toEqual([2, 2, 1, 1, 1]);
    expect(progress.days.map((day) => day.points)).toEqual([2, 1, 1, 0, 0]);
    expect(progress.days.map((day) => day.penalty)).toEqual([0, 0, 0, 5, 0]);
  });

  it('ignores entries for unknown habits and for future days', () => {
    const progress = computeProgress(
      [habit('run', 'health', TODAY)],
      entries(['ghost', TODAY, 'yes'], ['run', addDays(TODAY, 1), 'yes'], ['run', TODAY]),
      TODAY,
    );
    expect(progress.score).toBe(0);
    expect(progress.days).toHaveLength(1);
    expect(progress.today?.categories.health.answered).toBe(0);
  });
});

describe('categoriesAtRisk', () => {
  it('lists tracked categories without a yes today', () => {
    const habits = [
      habit('run', 'health', TODAY),
      habit('save', 'finance', TODAY),
      habit('call', 'relationships', TODAY),
    ];
    const progress = computeProgress(habits, entries(['run', TODAY, 'yes'], ['save', TODAY, 'no']), TODAY);
    expect(categoriesAtRisk(progress.today)).toEqual(['finance', 'relationships']);
    expect(categoriesAtRisk(undefined)).toEqual([]);
  });
});

describe('summarizeDays', () => {
  it('totals finished days and counts balanced ones', () => {
    const start = addDays(TODAY, -3);
    const habits = [habit('run', 'health', start), habit('save', 'finance', start)];
    const progress = computeProgress(
      habits,
      entries(
        ['run', start, 'yes'],
        ['save', start, 'yes'],
        ['run', addDays(start, 1), 'yes'],
        ['run', TODAY, 'yes'],
        ['save', TODAY, 'yes'],
      ),
      TODAY,
    );

    expect(summarizeDays(progress, start, TODAY)).toEqual({
      days: 3,
      points: 3,
      penalty: 5 + 10,
      net: 3 - 15,
      balancedDays: 1,
    });
    expect(isBalancedDay(progress.today!)).toBe(true);
  });
});
