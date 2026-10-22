import { GLOSSARY, LESSONS, SOURCES } from '../content/index';
import type { Lesson } from '../content/types';
import { lessonText } from '../content/validate';
import { plainText } from './inline';

// Lightweight client-side search: every query term must appear somewhere in the record.
// Titles weigh more than body text.

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');
}

function terms(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .slice(0, 8);
}

interface Indexed<T> {
  item: T;
  title: string;
  body: string;
}

function score<T>(rec: Indexed<T>, q: string[]): number {
  let total = 0;
  for (const term of q) {
    const inTitle = rec.title.includes(term);
    const inBody = rec.body.includes(term);
    if (!inTitle && !inBody) return 0;
    total += inTitle ? 3 : 1;
  }
  return total;
}

function search<T>(index: Indexed<T>[], query: string): T[] {
  const q = terms(query);
  if (!q.length) return index.map((r) => r.item);
  return index
    .map((r) => ({ r, s: score(r, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.r.item);
}

let lessonIndex: Indexed<Lesson>[] | null = null;
export function searchLessons(query: string): Lesson[] {
  lessonIndex ??= LESSONS.map((l) => ({
    item: l,
    title: normalize(`${l.id} ${l.title}`),
    body: normalize([l.summary, ...l.objectives, ...lessonText(l)].map(plainText).join(' ')),
  }));
  return search(lessonIndex, query);
}

export function searchGlossary(query: string) {
  return search(
    GLOSSARY.map((g) => ({ item: g, title: normalize(`${g.term} ${(g.aliases ?? []).join(' ')}`), body: normalize(plainText(g.definition)) })),
    query,
  );
}

export function searchSources(query: string) {
  return search(
    SOURCES.map((s) => ({ item: s, title: normalize(s.title), body: normalize(`${s.publisher} ${s.version} ${s.note} ${s.kind}`) })),
    query,
  );
}
