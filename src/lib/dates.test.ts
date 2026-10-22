import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, formatDate, isDue } from './dates';

describe('dates', () => {
  it('displays dates as DD/MM/YYYY', () => {
    expect(formatDate('2026-03-04T12:00:00')).toBe('04/03/2026');
  });

  it('shows a dash for missing or invalid dates', () => {
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('not a date')).toBe('—');
  });

  it('adds days and measures whole days between instants', () => {
    const later = addDays('2026-10-01T00:00:00.000Z', 7);
    expect(later).toBe('2026-10-08T00:00:00.000Z');
    expect(daysBetween('2026-10-01T00:00:00.000Z', later)).toBe(7);
  });

  it('treats a due date equal to now as due', () => {
    const now = new Date('2026-10-20T00:00:00.000Z');
    expect(isDue(now.toISOString(), now)).toBe(true);
    expect(isDue('2026-10-21T00:00:00.000Z', now)).toBe(false);
  });
});
