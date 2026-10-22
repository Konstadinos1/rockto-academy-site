import { describe, expect, it } from 'vitest';
import { newId, optionOrderFor, seededShuffle } from './random';

describe('seeded shuffling', () => {
  it('returns the same order for the same seed', () => {
    expect(seededShuffle([1, 2, 3, 4, 5, 6], 'seed-1')).toEqual(seededShuffle([1, 2, 3, 4, 5, 6], 'seed-1'));
  });

  it('keeps every item exactly once', () => {
    expect([...seededShuffle([1, 2, 3, 4, 5, 6], 'x')].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('varies option order across sessions so position is not a cue', () => {
    const firstPositions = new Set(Array.from({ length: 40 }, (_, i) => optionOrderFor(`as_${i}`, 'FA-01')[0]));
    expect(firstPositions.size).toBe(4);
  });

  it('keeps option order stable for a given session and question', () => {
    expect(optionOrderFor('ps_abc', 'D01-L01-Q1')).toEqual(optionOrderFor('ps_abc', 'D01-L01-Q1'));
  });

  it('creates prefixed random ids', () => {
    expect(newId('at')).toMatch(/^at_[0-9a-f]{16}$/);
    expect(newId('at')).not.toBe(newId('at'));
  });
});
