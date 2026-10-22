import { ASSESSMENT_DRAFTS } from './assessment';
import type { AssessmentItem } from './assessment-types';
import { DOMAINS, DOMAIN_BY_ID } from './domain-meta';
import { GLOSSARY, GLOSSARY_BY_ID } from './glossary';
import { DOMAIN_CONTENT } from './registry';
import { SOURCES, SOURCE_BY_ID } from './sources';
import type { DomainId, Lesson, McqQuestion, OpenQuestion, Question } from './types';

export const CONTENT_VERSION = '1.0.0';
export const CONTENT_REVIEWED = '2026-10-20';

function buildLessons(): Lesson[] {
  return DOMAIN_CONTENT.flatMap((dc) =>
    dc.lessons.map((draft, i) => ({
      ...draft,
      domainId: dc.domainId,
      order: i + 1,
      version: CONTENT_VERSION,
      reviewed: CONTENT_REVIEWED,
    })),
  );
}

function buildQuestions(): Question[] {
  const out: Question[] = [];
  for (const dc of DOMAIN_CONTENT) {
    for (const [lessonId, drafts] of Object.entries(dc.questions)) {
      const conceptTag = dc.lessons.find((l) => l.id === lessonId)?.conceptTag ?? lessonId;
      drafts.forEach((draft, i) => {
        const base = { id: `${lessonId}-Q${i + 1}`, lessonId, domainId: dc.domainId, conceptTag };
        if ('options' in draft) {
          out.push({ ...draft, ...base, conceptTag: draft.conceptTag ?? conceptTag, kind: 'mcq' } as McqQuestion);
        } else {
          out.push({ ...draft, ...base, conceptTag: draft.conceptTag ?? conceptTag, kind: 'open' } as OpenQuestion);
        }
      });
    }
  }
  return out;
}

export const LESSONS: Lesson[] = buildLessons();
export const LESSON_BY_ID: ReadonlyMap<string, Lesson> = new Map(LESSONS.map((l) => [l.id, l]));
export const QUESTIONS: Question[] = buildQuestions();

function buildAssessment(): AssessmentItem[] {
  return ASSESSMENT_DRAFTS.map(({ id, lessonId, draft }) => {
    const lesson = LESSON_BY_ID.get(lessonId);
    // An unknown lesson keeps its id as domain and concept so validation reports it instead of crashing.
    const base = { id, lessonId, domainId: (lesson?.domainId ?? lessonId.slice(0, 3)) as DomainId };
    const conceptTag = draft.conceptTag ?? lesson?.conceptTag ?? lessonId;
    return 'options' in draft
      ? ({ ...draft, ...base, conceptTag, kind: 'mcq' } as McqQuestion)
      : ({ ...draft, ...base, conceptTag, kind: 'open' } as OpenQuestion);
  });
}

export const ASSESSMENT: AssessmentItem[] = buildAssessment();
export const QUESTION_BY_ID: ReadonlyMap<string, Question> = new Map(
  [...QUESTIONS, ...ASSESSMENT].map((q) => [q.id, q]),
);

export function questionIdsForLesson(lessonId: string): string[] {
  return QUESTIONS.filter((q) => q.lessonId === lessonId).map((q) => q.id);
}

export function lessonsForDomain(domainId: string): Lesson[] {
  return LESSONS.filter((l) => l.domainId === domainId);
}

export function nextLesson(lessonId: string): Lesson | undefined {
  const i = LESSONS.findIndex((l) => l.id === lessonId);
  return i >= 0 ? LESSONS[i + 1] : undefined;
}

export function previousLesson(lessonId: string): Lesson | undefined {
  const i = LESSONS.findIndex((l) => l.id === lessonId);
  return i > 0 ? LESSONS[i - 1] : undefined;
}

export { DOMAINS, DOMAIN_BY_ID, GLOSSARY, GLOSSARY_BY_ID, SOURCES, SOURCE_BY_ID };
