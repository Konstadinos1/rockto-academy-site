import { useId, useState } from 'react';
import { Link } from 'react-router';
import { LESSON_BY_ID } from '../content/index';
import type { McqQuestion, OpenQuestion, OptionId, Question } from '../content/types';
import { COACH_ENABLED } from '../lib/coach';
import { GRADING_LABEL, rubricFor, toPublicQuestion, verdictLabel, type RubricScore } from '../lib/grading';
import type { Attempt, Draft } from '../state/schema';
import { CoachPanel } from './CoachPanel';
import { Blocks, Inline } from './RichText';

const LETTERS = ['A', 'B', 'C', 'D'];

export interface QuestionCardProps {
  question: Question;
  optionOrder?: OptionId[];
  draft: Draft;
  attempt?: Attempt;
  /** Coached: feedback right after submission. Exam: answers stay editable, no feedback until the end. */
  mode: 'coached' | 'exam';
  revealFeedback: boolean;
  position: string;
  onDraft: (draft: Draft) => void;
  onSubmit?: () => void;
  onSelfReview: (attemptId: string, score: RubricScore) => void;
}

function Header({ q, position }: { q: Question; position: string }) {
  const lesson = LESSON_BY_ID.get(q.lessonId);
  return (
    <div className="quiz-head">
      <p className="eyebrow">{position}</p>
      <div className="row" style={{ gap: '0.4rem' }}>
        <span className="chip">{q.kind === 'mcq' ? 'Multiple choice' : q.focus === 'diagnosis' ? 'Open · diagnosis' : 'Open · control & evidence'}</span>
        <span className="chip">{q.difficulty}</span>
        {lesson && <span className="chip mono">{lesson.id}</span>}
      </div>
    </div>
  );
}

function McqInput({ q, order, draft, attempt, locked, reveal, onDraft }: {
  q: McqQuestion; order: OptionId[]; draft: Draft; attempt?: Attempt; locked: boolean; reveal: boolean; onDraft: (d: Draft) => void;
}) {
  const name = useId();
  const pub = toPublicQuestion(q);
  if (pub.kind !== 'mcq') return null;
  const chosen = attempt?.response.kind === 'mcq' ? attempt.response.optionId : draft.optionId;
  return (
    <fieldset className="options">
      <legend className="sr-only">Choose one answer</legend>
      {order.map((oid, i) => {
        const opt = pub.options.find((o) => o.id === oid);
        if (!opt) return null;
        let state: string | undefined;
        if (reveal && attempt) state = oid === q.answer ? 'correct' : oid === chosen ? 'chosen-wrong' : undefined;
        return (
          <label key={oid} className="option" data-state={state} data-locked={locked}>
            <input
              type="radio"
              name={name}
              value={oid}
              checked={chosen === oid}
              disabled={locked}
              onChange={() => onDraft({ optionId: oid })}
            />
            <span>
              <span className="option-letter">{LETTERS[i]}. </span>
              <Inline text={opt.text} />
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

const LEADING_CORRECT = /^Correct\b/;

/** Labels the keyed and chosen options, folding an explanation that itself opens with "Correct" into the label. */
function ExplanationLine({ explanation, isAnswer, isChosen }: { explanation: string; isAnswer: boolean; isChosen: boolean }) {
  if (isAnswer) {
    const rest = LEADING_CORRECT.test(explanation) ? explanation.replace(LEADING_CORRECT, '') : `. ${explanation}`;
    return (
      <>
        <strong>Correct answer</strong>
        <Inline text={rest} />
      </>
    );
  }
  return (
    <>
      {isChosen && <strong>Your answer. </strong>}
      <Inline text={explanation} />
    </>
  );
}

function McqFeedback({ q, order, attempt }: { q: McqQuestion; order: OptionId[]; attempt: Attempt }) {
  const correct = attempt.result.kind === 'mcq' && attempt.result.correct;
  const chosen = attempt.response.kind === 'mcq' ? attempt.response.optionId : undefined;
  const correctIndex = order.indexOf(q.answer);
  const lesson = LESSON_BY_ID.get(q.lessonId);
  return (
    <section className="feedback" aria-label="Feedback" tabIndex={-1}>
      <div className={`feedback-head ${correct ? 'correct' : 'incorrect'}`} role="status">
        <strong>{correct ? 'Correct.' : 'Not quite.'}</strong>
        <span>
          The defensible answer is {LETTERS[correctIndex]}.{attempt.first ? ' First attempt recorded.' : ' Retry recorded separately from your first attempt.'}
        </span>
      </div>
      <div className="feedback-body">
        <ul className="explain-list" aria-label="Why each option is right or wrong">
          {order.map((oid, i) => {
            const opt = q.options.find((o) => o.id === oid);
            if (!opt) return null;
            const isAnswer = oid === q.answer;
            return (
              <li key={oid}>
                <span className="mono" style={{ color: isAnswer ? 'var(--ok)' : 'var(--muted)' }}>
                  {LETTERS[i]}
                </span>
                <span>
                  <ExplanationLine explanation={opt.explanation} isAnswer={isAnswer} isChosen={oid === chosen} />
                </span>
              </li>
            );
          })}
        </ul>
        {!correct && lesson && (
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            This concept is scheduled for review with a different scenario. Revisit <Link to={`/lesson/${lesson.id}`}>{lesson.id} {lesson.title}</Link>.
          </p>
        )}
      </div>
    </section>
  );
}

function suggestedScore(checks: [boolean, boolean, boolean]): RubricScore {
  const [mech, ctrl, ext] = checks;
  if (mech && ctrl) return ext ? 3 : 2;
  return mech || ctrl ? 1 : 0;
}

function SelfReview({ q, attempt, onSelfReview }: { q: OpenQuestion; attempt: Attempt; onSelfReview: QuestionCardProps['onSelfReview'] }) {
  const [checks, setChecks] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [score, setScore] = useState<RubricScore | null>(null);
  const items = [q.mechanism, q.control, q.extension];
  const rubric = rubricFor(q);
  const effective = score ?? suggestedScore(checks);
  return (
    <div className="stack">
      <div>
        <p className="label">1. Which parts does your answer cover?</p>
        <div className="rubric">
          {items.map((text, i) => (
            <label key={i} className="rubric-option" style={{ gridTemplateColumns: '1.4rem minmax(0,1fr)' }}>
              <input
                type="checkbox"
                checked={checks[i]}
                onChange={(e) => {
                  const next = [...checks] as [boolean, boolean, boolean];
                  next[i] = e.target.checked;
                  setChecks(next);
                  setScore(null);
                }}
              />
              <span>
                <strong>{i === 2 ? 'For level 3: ' : i === 0 ? 'Mechanism: ' : 'Control or evidence: '}</strong>
                <Inline text={text} />
              </span>
            </label>
          ))}
        </div>
      </div>
      <fieldset className="rubric" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: '0.5rem' }}>
          2. Confirm the rubric level (suggested from your ticks: {effective})
        </legend>
        {rubric.map((level) => (
          <label key={level.score} className="rubric-option">
            <input type="radio" name={`rubric-${attempt.id}`} checked={effective === level.score} onChange={() => setScore(level.score)} />
            <span className="rubric-score">{level.score}</span>
            <span>
              <strong>{level.label}.</strong> <Inline text={level.description} />
            </span>
          </label>
        ))}
      </fieldset>
      <div className="row">
        <button type="button" className="btn primary" onClick={() => onSelfReview(attempt.id, effective)}>
          Record self-review
        </button>
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          Recorded as self-reviewed evidence, not as an independent grade.
        </span>
      </div>
    </div>
  );
}

function OpenFeedback({ q, attempt, onSelfReview }: { q: OpenQuestion; attempt: Attempt; onSelfReview: QuestionCardProps['onSelfReview'] }) {
  if (attempt.result.kind !== 'open') return null;
  const { grading, score } = attempt.result;
  const reviewed = score !== null;
  const items: [string, string][] = [
    ['Mechanism', q.mechanism],
    ['Control or evidence', q.control],
    ['For level 3', q.extension],
  ];
  const covered = reviewed ? items.slice(0, score >= 3 ? 3 : score >= 2 ? 2 : score) : [];
  const gaps = reviewed ? items.slice(covered.length) : [];
  return (
    <section className="feedback" aria-label="Feedback">
      <div className={`feedback-head ${!reviewed ? 'pending' : score >= 2 ? 'correct' : 'incorrect'}`} role="status">
        <strong>{reviewed ? `Verdict: ${verdictLabel(score)} (${score}/3)` : 'Response saved. Compare it with the exemplar, then self-review.'}</strong>
        <span className={`chip ${grading === 'self-reviewed' ? 'warn' : grading === 'ungraded' ? 'info' : 'accent'}`}>{GRADING_LABEL[grading]}</span>
      </div>
      <div className="feedback-body">
        <div>
          <p className="eyebrow">Improved answer (exemplar)</p>
          <p style={{ margin: '0.3rem 0 0' }}>
            <Inline text={q.exemplar} />
          </p>
        </div>
        {reviewed ? (
          <>
            {covered.length > 0 && (
              <div>
                <p className="eyebrow">Valid part (by your self-review)</p>
                <ul style={{ margin: '0.3rem 0 0', paddingLeft: '1.2rem' }}>
                  {covered.map(([k, v]) => (
                    <li key={k}>
                      <strong>{k}:</strong> <Inline text={v} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {gaps.length > 0 && (
              <div>
                <p className="eyebrow">Gap</p>
                <ul style={{ margin: '0.3rem 0 0', paddingLeft: '1.2rem' }}>
                  {gaps.map(([k, v]) => (
                    <li key={k}>
                      <strong>{k}:</strong> <Inline text={v} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="eyebrow">Targeted follow-up</p>
              <p style={{ margin: '0.3rem 0 0' }}>
                <Inline text={q.followUp} />
              </p>
            </div>
            {attempt.result.rationale && (
              <div>
                <p className="eyebrow">Automated rationale</p>
                <p style={{ margin: '0.3rem 0 0', whiteSpace: 'pre-wrap' }}>{attempt.result.rationale}</p>
              </div>
            )}
          </>
        ) : (
          <SelfReview q={q} attempt={attempt} onSelfReview={onSelfReview} />
        )}
        {COACH_ENABLED && <CoachPanel question={q} attempt={attempt} />}
      </div>
    </section>
  );
}

export function QuestionCard(props: QuestionCardProps) {
  const { question: q, draft, attempt, mode, revealFeedback, position, onDraft, onSubmit, onSelfReview } = props;
  const order = props.optionOrder ?? ['a', 'b', 'c', 'd'];
  const locked = Boolean(attempt) && mode === 'coached';
  const pub = toPublicQuestion(q);
  const ready = q.kind === 'mcq' ? Boolean(draft.optionId) : (draft.text ?? '').trim().length > 0;
  const textId = useId();

  return (
    <div className="quiz">
      <Header q={q} position={position} />
      {pub.scenario && pub.scenario.length > 0 && (
        <div className="prose" style={{ maxWidth: 'none' }}>
          <Blocks blocks={pub.scenario} />
        </div>
      )}
      <h2 className="question-stem" id={`stem-${q.id}`}>
        <Inline text={pub.stem} />
      </h2>
      {q.kind === 'mcq' ? (
        <McqInput q={q} order={order} draft={draft} attempt={attempt} locked={locked} reveal={revealFeedback} onDraft={onDraft} />
      ) : (
        <div className="field">
          <label htmlFor={textId}>Your answer</label>
          <textarea
            id={textId}
            className="textarea"
            aria-describedby={`stem-${q.id}`}
            value={attempt?.response.kind === 'open' ? attempt.response.text : (draft.text ?? '')}
            readOnly={locked}
            maxLength={20000}
            onChange={(e) => onDraft({ text: e.target.value })}
          />
        </div>
      )}
      {!attempt && pub.hint && (
        <div style={{ marginTop: '0.8rem' }}>
          {draft.hintShown ? (
            <p className="callout note" role="note">
              <strong>Hint: </strong>
              <Inline text={pub.hint} />
            </p>
          ) : (
            <button type="button" className="btn ghost small" onClick={() => onDraft({ hintShown: true })}>
              Show a hint (does not reveal the answer)
            </button>
          )}
        </div>
      )}
      {mode === 'coached' && !attempt && onSubmit && (
        <div className="row" style={{ marginTop: '1.1rem' }}>
          <button type="button" className="btn primary" disabled={!ready} onClick={onSubmit}>
            Submit answer
          </button>
          {!ready && <span className="muted" style={{ fontSize: '0.85rem' }}>{q.kind === 'mcq' ? 'Choose an option to submit.' : 'Write an answer to submit.'}</span>}
        </div>
      )}
      {revealFeedback && attempt && q.kind === 'mcq' && <McqFeedback q={q} order={order} attempt={attempt} />}
      {revealFeedback && attempt && q.kind === 'open' && <OpenFeedback q={q} attempt={attempt} onSelfReview={onSelfReview} />}
    </div>
  );
}
