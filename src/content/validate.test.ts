import { describe, expect, it } from 'vitest';
import { ASSESSMENT, DOMAINS, GLOSSARY, LESSONS, QUESTIONS, SOURCES } from './index';
import { ASSESSMENT_DOMAIN_COUNTS, longestAnswerCueRate, validateCourse } from './validate';

const input = { domains: DOMAINS, lessons: LESSONS, questions: QUESTIONS, assessment: ASSESSMENT, sources: SOURCES, glossary: GLOSSARY };

describe('course content', () => {
  it('passes validation with no errors', () => {
    const result = validateCourse(input);
    expect(result.errors).toEqual([]);
  });

  it('has 12 domains with exactly 10 lessons each', () => {
    expect(DOMAINS).toHaveLength(12);
    for (const d of DOMAINS) expect(LESSONS.filter((l) => l.domainId === d.id)).toHaveLength(10);
  });

  it('has exactly 3 MCQ and 2 open questions per lesson', () => {
    expect(QUESTIONS).toHaveLength(600);
    for (const l of LESSONS) {
      const qs = QUESTIONS.filter((q) => q.lessonId === l.id);
      expect(qs.filter((q) => q.kind === 'mcq')).toHaveLength(3);
      expect(qs.filter((q) => q.kind === 'open')).toHaveLength(2);
    }
  });

  it('matches the assessment distribution by domain, type and difficulty', () => {
    expect(ASSESSMENT).toHaveLength(50);
    for (const [domainId, n] of Object.entries(ASSESSMENT_DOMAIN_COUNTS)) {
      expect(ASSESSMENT.filter((q) => q.domainId === domainId)).toHaveLength(n);
    }
    expect(ASSESSMENT.filter((q) => q.kind === 'mcq')).toHaveLength(30);
    expect(ASSESSMENT.filter((q) => q.kind === 'open')).toHaveLength(20);
    expect(ASSESSMENT.filter((q) => q.difficulty === 'foundational')).toHaveLength(15);
    expect(ASSESSMENT.filter((q) => q.difficulty === 'applied')).toHaveLength(25);
    expect(ASSESSMENT.filter((q) => q.difficulty === 'advanced')).toHaveLength(10);
  });

  it('keeps assessment items anchored to a lesson in the same domain', () => {
    for (const item of ASSESSMENT) expect(item.lessonId.startsWith(item.domainId)).toBe(true);
  });

  it('does not let the longest option reveal the answer', () => {
    expect(longestAnswerCueRate([...QUESTIONS, ...ASSESSMENT]).rate).toBeLessThan(0.05);
  });

  it('uses only reserved .example domains in email addresses and hosts', () => {
    const corpus = JSON.stringify([LESSONS, QUESTIONS, ASSESSMENT]);
    const emails = corpus.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}\b/gi) ?? [];
    for (const e of emails) expect(e).toMatch(/\.example$/);
  });

  it('reports a broken lesson reference as an error', () => {
    const broken = LESSONS.map((l, i) => (i === 0 ? { ...l, related: ['D99-L99'] } : l));
    const result = validateCourse({ ...input, lessons: broken });
    expect(result.errors.some((e) => e.includes('D99-L99'))).toBe(true);
  });

  it('reports a wrong assessment distribution as an error', () => {
    const result = validateCourse({ ...input, assessment: ASSESSMENT.slice(1) });
    expect(result.errors.some((e) => e.startsWith('assessment: expected 50'))).toBe(true);
  });

  it('rejects an assessment stem copied from practice', () => {
    const first = ASSESSMENT[0];
    const practice = QUESTIONS[0];
    if (!first || !practice) throw new Error('fixtures missing');
    const copied = [{ ...first, stem: practice.stem }, ...ASSESSMENT.slice(1)];
    const result = validateCourse({ ...input, assessment: copied });
    expect(result.errors.some((e) => e.includes('duplicates a practice question'))).toBe(true);
  });
});
