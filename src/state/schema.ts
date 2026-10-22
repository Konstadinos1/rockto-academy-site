import { z } from 'zod';

// Versioned learner-state schema. Every load from storage and every import is parsed with
// these schemas, so stored or imported text is only ever treated as data.

export const PROGRESS_VERSION = 1;
export const EXPORT_FORMAT = 'rockto-academy-progress';
export const MAX_TEXT = 20_000;
export const MAX_ATTEMPTS = 20_000;

const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const iso = z.string().max(40).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date');
const text = z.string().max(MAX_TEXT);
const optionId = z.enum(['a', 'b', 'c', 'd']);
const score = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

export const gradingSchema = z.enum(['ungraded', 'self-reviewed', 'ai-graded', 'human-reviewed']);
export type Grading = z.infer<typeof gradingSchema>;

export const attemptContextSchema = z.enum(['practice', 'review', 'assessment-coached', 'assessment-exam']);
export type AttemptContext = z.infer<typeof attemptContextSchema>;

export const responseSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('mcq'), optionId }),
  z.object({ kind: z.literal('open'), text }),
]);
export type LearnerResponse = z.infer<typeof responseSchema>;

export const resultSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('mcq'), correct: z.boolean() }),
  z.object({
    kind: z.literal('open'),
    grading: gradingSchema,
    score: score.nullable(),
    rationale: text.optional(),
    challenge: z.object({ at: iso, note: text }).optional(),
  }),
]);
export type AttemptResult = z.infer<typeof resultSchema>;

export const attemptSchema = z.object({
  id,
  questionId: id,
  sessionId: id,
  context: attemptContextSchema,
  at: iso,
  first: z.boolean(),
  hintUsed: z.boolean(),
  response: responseSchema,
  result: resultSchema,
});
export type Attempt = z.infer<typeof attemptSchema>;

export const reviewItemSchema = z.object({
  key: id,
  lessonId: id,
  conceptTag: z.string().max(80),
  sourceQuestionId: id,
  missedAt: iso,
  step: z.number().int().min(0).max(20),
  dueAt: iso,
  retired: z.boolean(),
  history: z.array(z.object({ at: iso, questionId: id, success: z.boolean() })).max(200),
});
export type ReviewItem = z.infer<typeof reviewItemSchema>;

const draftSchema = z.object({ optionId: optionId.optional(), text: text.optional(), hintShown: z.boolean().optional() });
export type Draft = z.infer<typeof draftSchema>;

export const practiceScopeSchema = z.object({
  type: z.enum(['domain', 'lesson', 'mistakes', 'review', 'question']),
  id: z.string().max(16).optional(),
});
export type PracticeScope = z.infer<typeof practiceScopeSchema>;

export const practiceSessionSchema = z.object({
  id,
  scope: practiceScopeSchema,
  questionIds: z.array(id).max(600),
  index: z.number().int().min(0),
  optionOrder: z.record(id, z.array(optionId).length(4)),
  drafts: z.record(id, draftSchema),
  submitted: z.record(id, id),
  startedAt: iso,
});
export type PracticeSession = z.infer<typeof practiceSessionSchema>;

export const assessmentSessionSchema = z.object({
  id,
  mode: z.enum(['coached', 'exam']),
  questionIds: z.array(id).max(50),
  index: z.number().int().min(0),
  optionOrder: z.record(id, z.array(optionId).length(4)),
  drafts: z.record(id, draftSchema),
  submitted: z.record(id, id),
  startedAt: iso,
  finishedAt: iso.optional(),
});
export type AssessmentSession = z.infer<typeof assessmentSessionSchema>;

export const settingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']),
  motion: z.enum(['system', 'reduce']),
  textSize: z.enum(['standard', 'large']),
  underlineLinks: z.boolean(),
  reviewIntervals: z.array(z.number().int().min(1).max(365)).min(1).max(8),
});
export type Settings = z.infer<typeof settingsSchema>;

export const progressSchema = z.object({
  schema: z.literal(EXPORT_FORMAT),
  version: z.literal(PROGRESS_VERSION),
  createdAt: iso,
  visits: z.record(id, z.object({ first: iso, last: iso, count: z.number().int().min(0) })),
  completed: z.record(id, iso),
  exercises: z.record(id, z.object({ response: text, revealedAt: iso })),
  notes: z.record(id, z.object({ text, updatedAt: iso })),
  attempts: z.array(attemptSchema).max(MAX_ATTEMPTS),
  reviews: z.record(id, reviewItemSchema),
  practice: practiceSessionSchema.nullable(),
  assessment: assessmentSessionSchema.nullable(),
  settings: settingsSchema,
});
export type Progress = z.infer<typeof progressSchema>;

export const exportEnvelopeSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  formatVersion: z.literal(PROGRESS_VERSION),
  exportedAt: iso,
  contentVersion: z.string().max(20),
  progress: progressSchema,
});
export type ExportEnvelope = z.infer<typeof exportEnvelopeSchema>;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  motion: 'system',
  textSize: 'standard',
  underlineLinks: false,
  reviewIntervals: [1, 3, 7, 14, 30],
};

export function emptyProgress(now: Date = new Date()): Progress {
  return {
    schema: EXPORT_FORMAT,
    version: PROGRESS_VERSION,
    createdAt: now.toISOString(),
    visits: {},
    completed: {},
    exercises: {},
    notes: {},
    attempts: [],
    reviews: {},
    practice: null,
    assessment: null,
    settings: { ...DEFAULT_SETTINGS },
  };
}
