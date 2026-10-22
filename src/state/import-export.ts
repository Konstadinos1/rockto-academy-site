import { CONTENT_VERSION, LESSON_BY_ID, QUESTION_BY_ID } from '../content/index';
import { EXPORT_FORMAT, PROGRESS_VERSION, exportEnvelopeSchema, type ExportEnvelope, type Progress } from './schema';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export function buildExport(progress: Progress, now: Date = new Date()): string {
  const envelope: ExportEnvelope = {
    format: EXPORT_FORMAT,
    formatVersion: PROGRESS_VERSION,
    exportedAt: now.toISOString(),
    contentVersion: CONTENT_VERSION,
    progress,
  };
  return JSON.stringify(envelope, null, 2);
}

export interface ImportSummary {
  exportedAt: string;
  contentVersion: string;
  attempts: number;
  lessonsCompleted: number;
  notes: number;
  droppedUnknown: number;
}

export type ImportResult =
  | { ok: true; progress: Progress; summary: ImportSummary }
  | { ok: false; errors: string[] };

/** Drops records that reference lessons or questions this content version does not have. */
function dropUnknownReferences(progress: Progress): { progress: Progress; dropped: number } {
  let dropped = 0;
  const keepLessons = <T,>(rec: Record<string, T>): Record<string, T> =>
    Object.fromEntries(
      Object.entries(rec).filter(([id]) => {
        const ok = LESSON_BY_ID.has(id);
        if (!ok) dropped++;
        return ok;
      }),
    );
  const attempts = progress.attempts.filter((a) => {
    const ok = QUESTION_BY_ID.has(a.questionId);
    if (!ok) dropped++;
    return ok;
  });
  const reviews = Object.fromEntries(Object.entries(progress.reviews).filter(([, r]) => LESSON_BY_ID.has(r.lessonId)));
  dropped += Object.keys(progress.reviews).length - Object.keys(reviews).length;
  const cleaned: Progress = {
    ...progress,
    visits: keepLessons(progress.visits),
    completed: keepLessons(progress.completed),
    exercises: keepLessons(progress.exercises),
    notes: keepLessons(progress.notes),
    attempts,
    reviews,
    // Sessions in progress are not portable across devices; the learner starts new ones.
    practice: null,
    assessment: null,
  };
  // Read the counter only after every filter above has run.
  return { dropped, progress: cleaned };
}

export function parseImport(text: string): ImportResult {
  if (new Blob([text]).size > MAX_IMPORT_BYTES) return { ok: false, errors: ['The file is larger than 5 MB.'] };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['The file is not valid JSON.'] };
  }
  const parsed = exportEnvelopeSchema.safeParse(json);
  if (!parsed.success) {
    const errors = parsed.error.issues.slice(0, 6).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
    return { ok: false, errors: ['The file is not a ROCKTO Academy progress export (version 1).', ...errors] };
  }
  const { progress, dropped } = dropUnknownReferences(parsed.data.progress);
  return {
    ok: true,
    progress,
    summary: {
      exportedAt: parsed.data.exportedAt,
      contentVersion: parsed.data.contentVersion,
      attempts: progress.attempts.length,
      lessonsCompleted: Object.keys(progress.completed).length,
      notes: Object.keys(progress.notes).length,
      droppedUnknown: dropped,
    },
  };
}
