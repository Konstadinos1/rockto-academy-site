import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ASSESSMENT, DOMAINS, GLOSSARY, LESSONS, QUESTIONS, SOURCES } from '../src/content/index';
import { countWords, lessonText, longestAnswerCueRate, validateCourse } from '../src/content/validate';

// Writes docs/content-coverage.json (machine-readable) and exits non-zero on structural errors.
// Pass --allow-incomplete while domains are still being authored to report without failing.

const allowIncomplete = process.argv.includes('--allow-incomplete');
const result = validateCourse({ domains: DOMAINS, lessons: LESSONS, questions: QUESTIONS, assessment: ASSESSMENT, sources: SOURCES, glossary: GLOSSARY });

const perDomain = DOMAINS.map((d) => {
  const lessons = LESSONS.filter((l) => l.domainId === d.id);
  const words = lessons.map((l) => ({ id: l.id, words: countWords(lessonText(l)) }));
  return {
    domain: d.id,
    lessons: lessons.length,
    practiceQuestions: QUESTIONS.filter((q) => q.domainId === d.id).length,
    assessmentItems: ASSESSMENT.filter((q) => q.domainId === d.id).length,
    lessonWords: words,
  };
});

const cue = longestAnswerCueRate(QUESTIONS);
const report = {
  generatedFrom: 'scripts/content-report.ts',
  totals: {
    domains: DOMAINS.length,
    lessons: LESSONS.length,
    practiceQuestions: QUESTIONS.length,
    practiceMcq: QUESTIONS.filter((q) => q.kind === 'mcq').length,
    practiceOpen: QUESTIONS.filter((q) => q.kind === 'open').length,
    assessmentItems: ASSESSMENT.length,
    exercises: LESSONS.length,
    sources: SOURCES.length,
    glossaryTerms: GLOSSARY.length,
    scoredQuestions: QUESTIONS.length + ASSESSMENT.length,
  },
  lessonWordRange: (() => {
    const all = perDomain.flatMap((d) => d.lessonWords.map((w) => w.words));
    return all.length ? { min: Math.min(...all), max: Math.max(...all), mean: Math.round(all.reduce((a, b) => a + b, 0) / all.length) } : null;
  })(),
  longestCorrectOptionCue: { rate: Number(cue.rate.toFixed(3)), flagged: cue.flagged },
  perDomain,
  errors: result.errors,
  warnings: result.warnings,
};

writeFileSync(resolve(import.meta.dirname, '../docs/content-coverage.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`domains ${report.totals.domains} | lessons ${report.totals.lessons} | practice ${report.totals.practiceQuestions} | assessment ${report.totals.assessmentItems}`);
console.log(`lesson words ${JSON.stringify(report.lessonWordRange)} | longest-correct cue ${report.longestCorrectOptionCue.rate}`);
for (const w of result.warnings) console.log(`warning: ${w}`);
for (const e of result.errors) console.log(`error: ${e}`);
if (result.errors.length && !allowIncomplete) process.exit(1);
