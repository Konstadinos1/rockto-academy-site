import type { AssessmentItem } from './assessment-types';
import type { Block, Domain, DomainId, GlossaryTerm, Lesson, Question, Source } from './types';

// Structural validation of the whole course. Used by the unit tests and by the build-time
// content report, so a missing lesson, a broken reference or a wrong assessment distribution
// fails the build instead of reaching learners.

export const EXPECTED_DOMAINS = 12;
export const LESSONS_PER_DOMAIN = 10;
export const QUESTIONS_PER_LESSON = 5;
export const ASSESSMENT_SIZE = 50;
export const MIN_LESSON_WORDS = 450;
export const MAX_LESSON_WORDS = 800;

export const ASSESSMENT_DOMAIN_COUNTS: Record<DomainId, number> = {
  D01: 4, D02: 5, D03: 5, D04: 5, D05: 5, D06: 4, D07: 4, D08: 4, D09: 4, D10: 4, D11: 3, D12: 3,
};
export const ASSESSMENT_KIND_COUNTS = { mcq: 30, open: 20 } as const;
export const ASSESSMENT_DIFFICULTY_COUNTS = { foundational: 15, applied: 25, advanced: 10 } as const;

const VALID_LABS = new Set(['task-permissions', 'trace-inspector', 'persistence-explorer', 'evaluation-panel']);
const LESSON_LINK = /\[\[([A-Z0-9-]+)(?:\|[^\]]*)?\]\]/g;
const TERM_LINK = /\{\{([a-z0-9-]+)(?:\|[^}]*)?\}\}/g;

export interface ValidationInput {
  domains: Domain[];
  lessons: Lesson[];
  questions: Question[];
  assessment: AssessmentItem[];
  sources: Source[];
  glossary: GlossaryTerm[];
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export function blockText(block: Block): string[] {
  switch (block.t) {
    case 'p':
    case 'h':
    case 'callout':
      return [block.text];
    case 'ul':
    case 'ol':
      return block.items;
    case 'table':
      return [block.caption, ...block.head, ...block.rows.flat()];
    case 'code':
      return [block.caption, ...(block.notes ?? [])];
    case 'trace':
      return [block.caption, ...block.lines.flatMap((l) => [l.actor, l.event, l.detail])];
    case 'flow':
      return [block.caption, ...block.steps.flatMap((s) => [s.label, s.note ?? ''])];
  }
}

/** Teaching text of a lesson, excluding code, questions and citations. */
export function lessonText(lesson: Lesson): string[] {
  return [
    ...lesson.explanation.flatMap(blockText),
    lesson.boundary.component,
    lesson.boundary.trustBoundary,
    lesson.boundary.attackerControl,
    lesson.scenario.title,
    lesson.scenario.setup,
    ...lesson.scenario.evidence.flatMap(blockText),
    lesson.worked.title,
    ...lesson.worked.blocks.flatMap(blockText),
    ...lesson.controls.flatMap((c) => [c.control, c.enforcementPoint, c.limitation]),
    lesson.misconception.claim,
    lesson.misconception.correction,
    lesson.exercise.prompt,
    ...lesson.exercise.modelResponse,
  ];
}

export function questionText(q: Question): string[] {
  const base = [q.stem, q.hint ?? '', ...(q.scenario ?? []).flatMap(blockText)];
  if (q.kind === 'mcq') return [...base, ...q.options.flatMap((o) => [o.text, o.explanation])];
  return [...base, q.mechanism, q.control, q.extension, q.exemplar, q.followUp];
}

export function countWords(texts: string[]): number {
  return texts
    .join(' ')
    .replace(LESSON_LINK, (_m, id: string) => id)
    .replace(TERM_LINK, (_m, id: string) => id)
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

function checkRefs(owner: string, texts: string[], lessonIds: Set<string>, termIds: Set<string>, errors: string[]): void {
  for (const text of texts) {
    for (const m of text.matchAll(LESSON_LINK)) {
      if (!lessonIds.has(m[1] ?? '')) errors.push(`${owner}: lesson link [[${m[1]}]] does not resolve`);
    }
    for (const m of text.matchAll(TERM_LINK)) {
      if (!termIds.has(m[1] ?? '')) errors.push(`${owner}: glossary link {{${m[1]}}} does not resolve`);
    }
  }
}

function checkUnique(label: string, ids: string[], errors: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`duplicate ${label} id ${id}`);
    seen.add(id);
  }
}

function validateLesson(lesson: Lesson, ctx: Ctx, errors: string[], warnings: string[]): void {
  const where = lesson.id;
  if (!/^D(0[1-9]|1[0-2])-L(0[1-9]|10)$/.test(lesson.id)) errors.push(`${where}: malformed lesson id`);
  if (lesson.objectives.length !== 3) errors.push(`${where}: needs exactly 3 objectives`);
  if (lesson.controls.length < 1) errors.push(`${where}: needs at least one control mapping`);
  if (lesson.exercise.modelResponse.length < 1) errors.push(`${where}: exercise needs a model response`);
  if (lesson.sourceIds.length < 1) errors.push(`${where}: needs at least one source`);
  for (const id of [...lesson.prerequisites, ...lesson.related]) {
    if (!ctx.lessonIds.has(id)) errors.push(`${where}: referenced lesson ${id} does not exist`);
  }
  for (const id of lesson.sourceIds) if (!ctx.sourceIds.has(id)) errors.push(`${where}: source ${id} does not exist`);
  for (const id of lesson.glossary) if (!ctx.termIds.has(id)) errors.push(`${where}: glossary term ${id} does not exist`);
  if (lesson.labId && !VALID_LABS.has(lesson.labId)) errors.push(`${where}: unknown lab ${lesson.labId}`);
  checkRefs(where, lessonText(lesson), ctx.lessonIds, ctx.termIds, errors);
  const words = countWords(lessonText(lesson));
  if (words < MIN_LESSON_WORDS) warnings.push(`${where}: ${words} words (target ${MIN_LESSON_WORDS}–${MAX_LESSON_WORDS})`);
  if (words > MAX_LESSON_WORDS + 150) warnings.push(`${where}: ${words} words exceeds target range`);
}

function validateQuestion(q: Question, ctx: Ctx, errors: string[]): void {
  const where = q.id;
  if (!ctx.lessonIds.has(q.lessonId)) errors.push(`${where}: lesson ${q.lessonId} does not exist`);
  for (const id of q.sourceIds ?? []) if (!ctx.sourceIds.has(id)) errors.push(`${where}: source ${id} does not exist`);
  checkRefs(where, questionText(q), ctx.lessonIds, ctx.termIds, errors);
  if (q.kind === 'mcq') {
    const ids = q.options.map((o) => o.id);
    if (new Set(ids).size !== 4) errors.push(`${where}: option ids must be four distinct values`);
    if (!ids.includes(q.answer)) errors.push(`${where}: answer ${q.answer} is not an option`);
    for (const o of q.options) {
      if (!o.text.trim() || !o.explanation.trim()) errors.push(`${where}: option ${o.id} needs text and explanation`);
    }
  } else {
    for (const field of [q.mechanism, q.control, q.extension, q.exemplar, q.followUp]) {
      if (!field.trim()) errors.push(`${where}: open question has an empty rubric field`);
    }
  }
}

interface Ctx {
  lessonIds: Set<string>;
  sourceIds: Set<string>;
  termIds: Set<string>;
}

function validatePracticeShape(input: ValidationInput, errors: string[]): void {
  if (input.domains.length !== EXPECTED_DOMAINS) errors.push(`expected ${EXPECTED_DOMAINS} domains, found ${input.domains.length}`);
  for (const d of input.domains) {
    const lessons = input.lessons.filter((l) => l.domainId === d.id);
    if (lessons.length !== LESSONS_PER_DOMAIN) errors.push(`${d.id}: expected ${LESSONS_PER_DOMAIN} lessons, found ${lessons.length}`);
    lessons.forEach((l, i) => {
      const expected = `${d.id}-L${String(i + 1).padStart(2, '0')}`;
      if (l.id !== expected) errors.push(`${d.id}: lesson ${i + 1} has id ${l.id}, expected ${expected}`);
    });
  }
  for (const l of input.lessons) {
    const qs = input.questions.filter((q) => q.lessonId === l.id);
    if (qs.length !== QUESTIONS_PER_LESSON) {
      errors.push(`${l.id}: expected ${QUESTIONS_PER_LESSON} practice questions, found ${qs.length}`);
      continue;
    }
    const shape = qs.map((q) => (q.kind === 'mcq' ? 'mcq' : q.focus)).join(',');
    if (shape !== 'mcq,mcq,mcq,diagnosis,control') errors.push(`${l.id}: question mix is ${shape}`);
  }
}

function tally<T extends string>(items: T[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items) out[i] = (out[i] ?? 0) + 1;
  return out;
}

function compareCounts(label: string, actual: Record<string, number>, expected: Record<string, number>, errors: string[]): void {
  for (const [k, v] of Object.entries(expected)) {
    if ((actual[k] ?? 0) !== v) errors.push(`assessment ${label} ${k}: expected ${v}, found ${actual[k] ?? 0}`);
  }
}

function validateAssessment(input: ValidationInput, ctx: Ctx, errors: string[]): void {
  const items = input.assessment;
  if (items.length !== ASSESSMENT_SIZE) errors.push(`assessment: expected ${ASSESSMENT_SIZE} items, found ${items.length}`);
  compareCounts('domain', tally(items.map((i) => i.domainId)), ASSESSMENT_DOMAIN_COUNTS, errors);
  compareCounts('type', tally(items.map((i) => i.kind)), ASSESSMENT_KIND_COUNTS, errors);
  compareCounts('difficulty', tally(items.map((i) => i.difficulty)), ASSESSMENT_DIFFICULTY_COUNTS, errors);
  const practiceStems = new Set(input.questions.map((q) => q.stem.trim().toLowerCase()));
  for (const item of items) {
    if (!/^FA-\d{2}$/.test(item.id)) errors.push(`${item.id}: assessment ids must look like FA-01`);
    if (practiceStems.has(item.stem.trim().toLowerCase())) errors.push(`${item.id}: stem duplicates a practice question`);
    validateQuestion(item, ctx, errors);
  }
}

export function validateCourse(input: ValidationInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ctx: Ctx = {
    lessonIds: new Set(input.lessons.map((l) => l.id)),
    sourceIds: new Set(input.sources.map((s) => s.id)),
    termIds: new Set(input.glossary.map((g) => g.id)),
  };
  checkUnique('lesson', input.lessons.map((l) => l.id), errors);
  checkUnique('question', [...input.questions, ...input.assessment].map((q) => q.id), errors);
  checkUnique('source', input.sources.map((s) => s.id), errors);
  checkUnique('glossary', input.glossary.map((g) => g.id), errors);
  validatePracticeShape(input, errors);
  for (const l of input.lessons) validateLesson(l, ctx, errors, warnings);
  for (const q of input.questions) validateQuestion(q, ctx, errors);
  validateAssessment(input, ctx, errors);
  return { errors, warnings };
}

/** Share of MCQs whose correct option is the longest by more than 20%, a possible answer cue. */
export function longestAnswerCueRate(questions: Question[]): { flagged: string[]; rate: number } {
  const mcqs = questions.filter((q) => q.kind === 'mcq');
  const flagged = mcqs
    .filter((q) => {
      const correct = q.options.find((o) => o.id === q.answer)?.text.length ?? 0;
      const others = q.options.filter((o) => o.id !== q.answer).map((o) => o.text.length);
      return correct > Math.max(...others) * 1.2;
    })
    .map((q) => q.id);
  return { flagged, rate: mcqs.length ? flagged.length / mcqs.length : 0 };
}
