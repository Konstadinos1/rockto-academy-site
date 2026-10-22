// Typed records for all course content. Content is data: it is rendered by a safe renderer
// (src/components/RichText.tsx) and never interpreted as HTML.

export type DomainId =
  | 'D01'
  | 'D02'
  | 'D03'
  | 'D04'
  | 'D05'
  | 'D06'
  | 'D07'
  | 'D08'
  | 'D09'
  | 'D10'
  | 'D11'
  | 'D12';

export type Difficulty = 'foundational' | 'applied' | 'advanced';

/** Inline text supports a small, safe markup: **bold**, *em*, `code`, [[D02-L03]] lesson links and {{term-id}} glossary links. */
export type InlineText = string;

export type TraceFlag = 'ok' | 'info' | 'warn' | 'violation' | 'blocked';

export interface TraceLine {
  at?: string;
  actor: string;
  event: string;
  detail: InlineText;
  flag?: TraceFlag;
}

export type FlowZone = 'trusted' | 'untrusted' | 'boundary' | 'external' | 'model';

export interface FlowStep {
  label: string;
  zone: FlowZone;
  note?: InlineText;
}

export type Block =
  | { t: 'p'; text: InlineText }
  | { t: 'h'; text: string }
  | { t: 'ul'; items: InlineText[] }
  | { t: 'ol'; items: InlineText[] }
  | { t: 'table'; caption: string; head: string[]; rows: InlineText[][] }
  | { t: 'code'; caption: string; lang: string; code: string; notes?: InlineText[] }
  | { t: 'trace'; caption: string; lines: TraceLine[] }
  | { t: 'flow'; caption: string; steps: FlowStep[] }
  | { t: 'callout'; tone: 'note' | 'warn' | 'key'; text: InlineText };

export interface Domain {
  id: DomainId;
  title: string;
  short: string;
  description: string;
  /** Domains whose lessons this domain assumes. */
  prerequisites: DomainId[];
  /** True for the four core subjects named in the course brief. */
  core: boolean;
}

export interface ControlMapping {
  control: InlineText;
  enforcementPoint: InlineText;
  limitation: InlineText;
}

export interface Lesson {
  id: string;
  domainId: DomainId;
  order: number;
  title: string;
  summary: string;
  minutes: number;
  version: string;
  reviewed: string;
  objectives: [string, string, string];
  prerequisites: string[];
  explanation: Block[];
  boundary: { component: InlineText; trustBoundary: InlineText; attackerControl: InlineText };
  scenario: { title: string; setup: InlineText; evidence: Block[] };
  worked: { title: string; blocks: Block[] };
  controls: ControlMapping[];
  misconception: { claim: InlineText; correction: InlineText };
  exercise: { kind: 'reflection' | 'tabletop'; prompt: InlineText; modelResponse: InlineText[] };
  sourceIds: string[];
  glossary: string[];
  related: string[];
  conceptTag: string;
  /** Optional interactive lab that illustrates this lesson. */
  labId?: LabId;
}

/** A lesson as authored: version, review date and questionIds are filled in by the content index. */
export type LessonDraft = Omit<Lesson, 'version' | 'reviewed' | 'domainId' | 'order'>;

export type OptionId = 'a' | 'b' | 'c' | 'd';

export interface McqOption {
  id: OptionId;
  text: InlineText;
  explanation: InlineText;
}

interface QuestionBase {
  id: string;
  lessonId: string;
  domainId: DomainId;
  difficulty: Difficulty;
  conceptTag: string;
  scenario?: Block[];
  stem: InlineText;
  /** Optional, deliberately non-spoiling nudge. */
  hint?: InlineText;
  sourceIds?: string[];
}

export interface McqQuestion extends QuestionBase {
  kind: 'mcq';
  options: [McqOption, McqOption, McqOption, McqOption];
  answer: OptionId;
}

export interface OpenQuestion extends QuestionBase {
  kind: 'open';
  focus: 'diagnosis' | 'control';
  /** What a score of 2 requires beyond naming a label: the mechanism. */
  mechanism: InlineText;
  /** What a score of 2 requires: a suitable control or evidence check. */
  control: InlineText;
  /** What a score of 3 additionally requires: boundary, limitation or verification evidence. */
  extension: InlineText;
  exemplar: InlineText;
  followUp: InlineText;
}

export type Question = McqQuestion | OpenQuestion;

/** Authored question drafts: ids follow `${lessonId}-Q${n}` and the concept tag defaults to the lesson's. */
export type McqDraft = Omit<McqQuestion, 'id' | 'lessonId' | 'domainId' | 'kind' | 'conceptTag'> & { conceptTag?: string };
export type OpenDraft = Omit<OpenQuestion, 'id' | 'lessonId' | 'domainId' | 'kind' | 'conceptTag'> & { conceptTag?: string };

export type SourceKind =
  | 'framework'
  | 'guidance'
  | 'specification'
  | 'standard'
  | 'government-report'
  | 'research'
  | 'documentation'
  | 'legislation';

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  kind: SourceKind;
  version: string;
  published: string;
  accessed: string;
  linkCheck: 'resolved' | 'blocked-automated-check';
  note: string;
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: InlineText;
  aliases?: string[];
}

export type LabId = 'task-permissions' | 'trace-inspector' | 'persistence-explorer' | 'evaluation-panel';

export interface DomainContent {
  domainId: DomainId;
  lessons: LessonDraft[];
  /** Five drafts per lesson, keyed by lesson id: three MCQ followed by a diagnosis and a control/evidence open question. */
  questions: Record<string, [McqDraft, McqDraft, McqDraft, OpenDraft, OpenDraft]>;
}
