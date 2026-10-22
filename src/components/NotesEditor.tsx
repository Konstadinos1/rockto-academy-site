import { useEffect, useRef, useState } from 'react';
import { formatDate } from '../lib/dates';
import { saveNote } from '../state/actions';
import { MAX_TEXT } from '../state/schema';
import { useStore } from '../state/store';

const SAVE_DELAY_MS = 600;

// Notes are stored and shown as plain text; React escapes them, and they are never parsed as markup.
export function NotesEditor({ lessonId }: { lessonId: string }) {
  const { progress, update } = useStore();
  const saved = progress.notes[lessonId];
  const [text, setText] = useState(saved?.text ?? '');
  const [status, setStatus] = useState<'idle' | 'pending' | 'saved'>('idle');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setText(progress.notes[lessonId]?.text ?? '');
    setStatus('idle');
    // Only reset when the lesson changes, not on every save.
  }, [lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onChange = (value: string) => {
    setText(value);
    setStatus('pending');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      update((p) => saveNote(p, lessonId, value));
      setStatus('saved');
    }, SAVE_DELAY_MS);
  };

  return (
    <div className="field">
      <label htmlFor={`notes-${lessonId}`}>Your notes</label>
      <textarea
        id={`notes-${lessonId}`}
        className="textarea"
        style={{ minHeight: '7rem', fontSize: '0.9rem' }}
        value={text}
        maxLength={MAX_TEXT}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          window.clearTimeout(timer.current);
          if (status === 'pending') {
            update((p) => saveNote(p, lessonId, text));
            setStatus('saved');
          }
        }}
        aria-describedby={`notes-status-${lessonId}`}
      />
      <span id={`notes-status-${lessonId}`} className="muted" style={{ fontSize: '0.78rem' }} aria-live="polite">
        {status === 'pending' ? 'Saving…' : status === 'saved' ? 'Saved on this device.' : saved ? `Last saved ${formatDate(saved.updatedAt)}.` : 'Plain text, saved on this device.'}
      </span>
    </div>
  );
}
