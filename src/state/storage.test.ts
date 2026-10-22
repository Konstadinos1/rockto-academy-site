import { beforeEach, describe, expect, it } from 'vitest';
import { emptyProgress } from './schema';
import { CORRUPT_KEY, loadProgress, saveProgress, STORAGE_KEY } from './storage';

describe('device storage', () => {
  beforeEach(() => localStorage.clear());

  it('reports empty storage as a first run', () => {
    expect(loadProgress(STORAGE_KEY).status).toBe('empty');
  });

  it('saves and loads progress through the schema', () => {
    const p = emptyProgress(new Date('2026-10-20T00:00:00Z'));
    expect(saveProgress(STORAGE_KEY, p)).toBe(true);
    expect(loadProgress(STORAGE_KEY)).toEqual({ progress: p, status: 'loaded' });
  });

  it('preserves unreadable data under a separate key instead of discarding it', () => {
    localStorage.setItem(STORAGE_KEY, '{"broken":');
    const outcome = loadProgress(STORAGE_KEY);
    expect(outcome.status).toBe('unreadable');
    expect(localStorage.getItem(CORRUPT_KEY)).toBe('{"broken":');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{"broken":');
  });

  it('treats schema-invalid data as unreadable', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schema: 'rockto-academy-progress', version: 9 }));
    expect(loadProgress(STORAGE_KEY).status).toBe('unreadable');
  });
});
