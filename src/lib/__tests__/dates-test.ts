import {
  addDays,
  daysBetween,
  eachDay,
  fromDateKey,
  msUntilNextMidnight,
  relativeDayLabel,
  startOfMonth,
  startOfYear,
  toDateKey,
  weekday,
} from '../dates';

describe('date keys', () => {
  it('formats local dates as YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });

  it('round-trips through fromDateKey', () => {
    for (const key of ['2024-02-29', '2026-03-08', '2026-11-01', '2026-12-31']) {
      expect(toDateKey(fromDateKey(key))).toBe(key);
    }
  });

  it('adds days across month, year and leap-day boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    // US daylight-saving changes (second Sunday of March, first Sunday of November).
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
  });

  it('counts whole days between keys', () => {
    expect(daysBetween('2026-10-01', '2026-10-04')).toBe(3);
    expect(daysBetween('2026-10-04', '2026-10-01')).toBe(-3);
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
  });

  it('lists days inclusively', () => {
    expect(eachDay('2026-09-29', '2026-10-02')).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
    expect(eachDay('2026-10-02', '2026-10-01')).toEqual([]);
  });

  it('finds the start of the month and year', () => {
    expect(startOfMonth('2026-10-04')).toBe('2026-10-01');
    expect(startOfYear('2026-10-04')).toBe('2026-01-01');
  });

  it('computes weekdays (0 = Sunday)', () => {
    expect(weekday('2026-10-04')).toBe(0);
    expect(weekday('2026-10-05')).toBe(1);
    expect(weekday('1969-12-31')).toBe(3);
  });

  it('measures the time until midnight', () => {
    expect(msUntilNextMidnight(new Date(2026, 9, 4, 23, 59, 0))).toBe(60_000);
    expect(msUntilNextMidnight(new Date(2026, 9, 4, 0, 0, 0))).toBe(86_400_000);
  });

  it('labels nearby days relative to today', () => {
    expect(relativeDayLabel('2026-10-04', '2026-10-04')).toBe('Today');
    expect(relativeDayLabel('2026-10-03', '2026-10-04')).toBe('Yesterday');
  });
});
