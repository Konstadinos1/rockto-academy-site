import { describe, expect, it } from 'vitest';
import { mcqIn, mcqAttempt, FIXED_NOW } from '../test/fixtures';
import { buildExport, MAX_IMPORT_BYTES, parseImport } from './import-export';
import { emptyProgress } from './schema';

function sampleProgress() {
  const p = emptyProgress(FIXED_NOW);
  const q = mcqIn('D01')[0]!;
  return {
    ...p,
    completed: { 'D01-L01': FIXED_NOW.toISOString() },
    notes: { 'D01-L01': { text: 'My note', updatedAt: FIXED_NOW.toISOString() } },
    attempts: [mcqAttempt(q, true, FIXED_NOW.toISOString())],
  };
}

describe('progress export and import', () => {
  it('round-trips a versioned export without loss', () => {
    const p = sampleProgress();
    const result = parseImport(buildExport(p, FIXED_NOW));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.progress.attempts).toEqual(p.attempts);
    expect(result.progress.notes).toEqual(p.notes);
    expect(result.summary).toMatchObject({ attempts: 1, lessonsCompleted: 1, notes: 1, droppedUnknown: 0 });
  });

  it('rejects invalid JSON with a readable error', () => {
    const result = parseImport('{not json');
    expect(result).toEqual({ ok: false, errors: ['The file is not valid JSON.'] });
  });

  it('rejects a file from another application or version', () => {
    const result = parseImport(JSON.stringify({ format: 'something-else', formatVersion: 1 }));
    expect(result.ok).toBe(false);
    const v2 = JSON.parse(buildExport(sampleProgress(), FIXED_NOW));
    v2.formatVersion = 2;
    expect(parseImport(JSON.stringify(v2)).ok).toBe(false);
  });

  it('rejects files over the size limit before parsing', () => {
    const result = parseImport('x'.repeat(MAX_IMPORT_BYTES + 1));
    expect(result).toEqual({ ok: false, errors: ['The file is larger than 5 MB.'] });
  });

  it('keeps hostile note text as inert data', () => {
    const p = sampleProgress();
    const hostile = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    p.notes['D01-L01'] = { text: hostile, updatedAt: FIXED_NOW.toISOString() };
    const result = parseImport(buildExport(p, FIXED_NOW));
    expect(result.ok && result.progress.notes['D01-L01']?.text).toBe(hostile);
  });

  it('rejects ids with characters outside the allowed set', () => {
    const env = JSON.parse(buildExport(sampleProgress(), FIXED_NOW));
    env.progress.notes['../../etc'] = { text: 'x', updatedAt: FIXED_NOW.toISOString() };
    expect(parseImport(JSON.stringify(env)).ok).toBe(false);
  });

  it('drops a __proto__ key without polluting object prototypes', () => {
    const text = buildExport(sampleProgress(), FIXED_NOW).replace(
      '"notes": {',
      '"notes": { "__proto__": { "text": "polluted", "updatedAt": "2026-10-20T12:00:00.000Z" },',
    );
    const result = parseImport(text);
    expect(({} as Record<string, unknown>).text).toBeUndefined();
    if (result.ok) expect(Object.keys(result.progress.notes)).toEqual(['D01-L01']);
  });

  it('drops records for lessons and questions this version does not have, and reports how many', () => {
    const env = JSON.parse(buildExport(sampleProgress(), FIXED_NOW));
    env.progress.completed['D99-L01'] = FIXED_NOW.toISOString();
    env.progress.attempts.push({ ...env.progress.attempts[0], id: 'at_unknown', questionId: 'D99-L01-Q1' });
    const result = parseImport(JSON.stringify(env));
    expect(result.ok && result.summary.droppedUnknown).toBe(2);
  });

  it('never imports in-progress sessions', () => {
    const p = { ...sampleProgress() };
    const env = JSON.parse(buildExport(p, FIXED_NOW));
    env.progress.practice = { id: 'ps_x', scope: { type: 'lesson', id: 'D01-L01' }, questionIds: ['D01-L01-Q1'], index: 0, optionOrder: {}, drafts: {}, submitted: {}, startedAt: FIXED_NOW.toISOString() };
    const result = parseImport(JSON.stringify(env));
    expect(result.ok && result.progress.practice).toBeNull();
  });
});
