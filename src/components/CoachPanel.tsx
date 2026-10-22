import { useState } from 'react';
import type { OpenQuestion } from '../content/types';
import { requestCoachFeedback } from '../lib/coach';
import { challengeGrade, recordAiGrade } from '../state/actions';
import type { Attempt } from '../state/schema';
import { useStore } from '../state/store';

export function CoachPanel({ question, attempt }: { question: OpenQuestion; attempt: Attempt }) {
  const { update } = useStore();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  if (attempt.result.kind !== 'open' || attempt.response.kind !== 'open') return null;
  const result = attempt.result;
  const text = attempt.response.text;

  const ask = async () => {
    setStatus('loading');
    try {
      const r = await requestCoachFeedback(question.id, text);
      const rationale = [`Verdict: ${r.verdict}`, `Valid part: ${r.validPart}`, `Gap: ${r.gap}`, `Improved answer: ${r.improvedAnswer}`, `Follow-up: ${r.followUp}`, `Model: ${r.model}`].join('\n\n');
      update((p) => recordAiGrade(p, attempt.id, r.score, rationale));
      setStatus('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The coach request failed.');
      setStatus('error');
    }
  };

  return (
    <div className="reveal">
      <p className="eyebrow">Optional AI coach</p>
      {result.grading === 'ai-graded' ? (
        result.challenge ? (
          <p style={{ margin: '0.4rem 0 0' }}>You challenged this automated grade. Your note is stored with the attempt: “{result.challenge.note}”.</p>
        ) : (
          <form
            className="stack"
            style={{ marginTop: '0.5rem' }}
            onSubmit={(e) => {
              e.preventDefault();
              if (note.trim()) update((p) => challengeGrade(p, attempt.id, note));
            }}
          >
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              This is an automated assessment with limitations. If you disagree with it, record why; the challenge is kept with the evidence.
            </p>
            <label className="sr-only" htmlFor={`challenge-${attempt.id}`}>
              Why you disagree with the automated grade
            </label>
            <textarea id={`challenge-${attempt.id}`} className="textarea" style={{ minHeight: '5rem' }} value={note} onChange={(e) => setNote(e.target.value)} />
            <button type="submit" className="btn small" disabled={!note.trim()}>
              Challenge this grade
            </button>
          </form>
        )
      ) : (
        <div className="row" style={{ marginTop: '0.5rem' }}>
          <button type="button" className="btn small" onClick={ask} disabled={status === 'loading'}>
            {status === 'loading' ? 'Asking the coach…' : 'Ask the AI coach to grade this answer'}
          </button>
          {status === 'error' && (
            <span role="alert" style={{ color: 'var(--bad)', fontSize: '0.85rem' }}>
              {error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
