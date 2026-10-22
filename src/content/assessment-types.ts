import type { McqDraft, McqQuestion, OpenDraft, OpenQuestion } from './types';

/** Comprehensive-assessment items are original held-out scenarios, not copies of practice questions. */
export type AssessmentItem = McqQuestion | OpenQuestion;

/** An assessment item as authored: its lesson anchors domain and concept, which the content index fills in. */
export interface AssessmentDraft {
  id: string;
  lessonId: string;
  draft: McqDraft | OpenDraft;
}
