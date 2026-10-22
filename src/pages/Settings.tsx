import { useRef, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { COACH_ENABLED } from '../lib/coach';
import { formatDate } from '../lib/dates';
import { usePageTitle } from '../lib/usePageTitle';
import { updateSettings } from '../state/actions';
import { buildExport, MAX_IMPORT_BYTES, parseImport, type ImportResult } from '../state/import-export';
import { CORRUPT_KEY, readRaw } from '../state/storage';
import type { Settings } from '../state/schema';
import { useStore } from '../state/store';

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <fieldset style={{ border: 'none', padding: 0, marginInline: 0 }}>
      <legend className="label" style={{ marginBottom: '0.4rem' }}>
        {label}
      </legend>
      <div className="toggle-group">
        {options.map(([v, text]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Some embedded viewers block script-started downloads, so the export is also shown as text the
 * learner can copy into a .json file themselves.
 */
function ExportFallback({ text }: { text: string }) {
  const [copied, setCopied] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied('Copied. Paste it into a file ending in .json to keep it.');
    } catch {
      ref.current?.select();
      setCopied('Copy was blocked here; the text is selected so you can copy it with your keyboard.');
    }
  };
  return (
    <div className="field">
      <label htmlFor="export-text">If no file was saved, copy your export from here</label>
      <textarea id="export-text" ref={ref} className="input mono" rows={5} readOnly value={text} style={{ fontSize: '0.78rem' }} />
      <div className="row">
        <button type="button" className="btn small" onClick={() => void copy()}>
          Copy export text
        </button>
        <span className="muted" role="status" style={{ fontSize: '0.85rem' }}>
          {copied}
        </span>
      </div>
    </div>
  );
}

function IntervalsEditor({ settings, onSave }: { settings: Settings; onSave: (v: number[]) => void }) {
  const [text, setText] = useState(settings.reviewIntervals.join(', '));
  const [error, setError] = useState('');
  const save = () => {
    const parts = text.split(/[,\s]+/).filter(Boolean).map(Number);
    const valid = parts.length >= 1 && parts.length <= 8 && parts.every((n) => Number.isInteger(n) && n >= 1 && n <= 365);
    const ascending = parts.every((n, i) => i === 0 || n > (parts[i - 1] ?? 0));
    if (!valid || !ascending) {
      setError('Enter 1–8 whole numbers of days between 1 and 365, in increasing order.');
      return;
    }
    setError('');
    onSave(parts);
  };
  return (
    <div className="field">
      <label htmlFor="intervals">Review intervals (days)</label>
      <div className="row">
        <input id="intervals" className="input" style={{ maxWidth: '16rem' }} value={text} onChange={(e) => setText(e.target.value)} aria-describedby="intervals-help" aria-invalid={Boolean(error)} />
        <button type="button" className="btn small" onClick={save}>
          Save intervals
        </button>
      </div>
      <span id="intervals-help" className="muted" style={{ fontSize: '0.85rem' }}>
        After a miss, the concept returns after the first interval; each successful review moves to the next. Default 1, 3, 7, 14, 30. This is
        an instructional choice, not a claim of optimal timing.
      </span>
      {error && (
        <span role="alert" style={{ color: 'var(--bad)', fontSize: '0.85rem' }}>
          {error}
        </span>
      )}
    </div>
  );
}

function ImportSection() {
  const { progress, replaceWithImport, undoImport, hasImportBackup, mode } = useStore();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [ack, setAck] = useState(false);
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    setMessage('');
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setResult({ ok: false, errors: ['The file is larger than 5 MB.'] });
      return;
    }
    setResult(parseImport(await file.text()));
  };
  const [pasted, setPasted] = useState('');

  return (
    <div className="stack">
      <div className="field">
        <label htmlFor="import-file">Import a progress file (.json, up to 5 MB)</label>
        <input ref={fileRef} id="import-file" type="file" accept="application/json,.json" onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>
      <details>
        <summary>Or paste exported text instead of choosing a file</summary>
        <div className="field" style={{ marginTop: '0.6rem' }}>
          <label htmlFor="import-text">Exported progress text</label>
          <textarea id="import-text" className="input mono" rows={4} value={pasted} onChange={(e) => setPasted(e.target.value)} style={{ fontSize: '0.78rem' }} />
          <button
            type="button"
            className="btn small"
            style={{ justifySelf: 'start' }}
            disabled={!pasted.trim()}
            onClick={() => {
              setMessage('');
              setResult(parseImport(pasted));
            }}
          >
            Check pasted text
          </button>
        </div>
      </details>
      {result && !result.ok && (
        <div className="callout warn" role="alert">
          <p>
            <strong>Import rejected. Nothing was changed.</strong>
          </p>
          <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem' }}>
            {result.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {result && result.ok && (
        <div className="reveal" role="status">
          <p style={{ marginTop: 0 }}>
            <strong>Valid progress file</strong> exported {formatDate(result.summary.exportedAt)} (content v{result.summary.contentVersion}).
          </p>
          <ul style={{ paddingLeft: '1.2rem' }}>
            <li>{result.summary.attempts} attempts</li>
            <li>{result.summary.lessonsCompleted} lessons marked read</li>
            <li>{result.summary.notes} notes</li>
            {result.summary.droppedUnknown > 0 && <li>{result.summary.droppedUnknown} records referring to content not in this version will be skipped</li>}
          </ul>
          <button type="button" className="btn primary" onClick={() => setConfirm(true)}>
            Replace my progress with this file…
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="muted">
          {message}
        </p>
      )}
      {hasImportBackup && (
        <div className="row">
          <button
            type="button"
            className="btn small"
            onClick={() => setMessage(undoImport() ? 'Restored the progress you had before the last import.' : 'No backup was found.')}
          >
            Undo last import
          </button>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            Your progress from before the last import is kept until you undo or import again.
          </span>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        title="Replace your progress?"
        confirmLabel="Replace progress"
        danger
        confirmDisabled={!ack}
        onCancel={() => {
          setConfirm(false);
          setAck(false);
        }}
        onConfirm={() => {
          if (result && result.ok) replaceWithImport(result.progress);
          setConfirm(false);
          setAck(false);
          setResult(null);
          if (fileRef.current) fileRef.current.value = '';
          setMessage('Progress imported. You can undo this import from this page.');
        }}
      >
        <p>
          Your current {mode === 'demo' ? 'learner ' : ''}progress ({progress.attempts.length} attempts, {Object.keys(progress.completed).length} lessons read) will be
          replaced. A backup is kept so you can undo once.
        </p>
        <label className="row" style={{ gap: '0.5rem', marginTop: '0.6rem' }}>
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />I understand my current progress will be replaced.
        </label>
      </ConfirmDialog>
    </div>
  );
}

export function SettingsPage() {
  usePageTitle('Settings');
  const { progress, update, mode, setMode, persistent, resetLearnerProgress } = useStore();
  const [exportText, setExportText] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetText, setResetText] = useState('');
  const s = progress.settings;
  const set = (patch: Partial<Settings>) => update((p) => updateSettings(p, patch));
  const unreadable = readRaw(CORRUPT_KEY);

  return (
    <div className="stack" style={{ maxWidth: '48rem' }}>
      <header>
        <p className="eyebrow">Settings</p>
        <h1 style={{ fontSize: '2rem', marginTop: '0.4rem' }}>Settings</h1>
      </header>

      <section className="card stack" aria-labelledby="display-h">
        <h2 id="display-h" style={{ fontSize: '1.2rem' }}>
          Display and accessibility
        </h2>
        <Choice label="Theme" value={s.theme} options={[['system', 'Match system'], ['dark', 'Dark'], ['light', 'Light (reading)']]} onChange={(theme) => set({ theme })} />
        <Choice label="Motion" value={s.motion} options={[['system', 'Match system'], ['reduce', 'Reduce motion']]} onChange={(motion) => set({ motion })} />
        <Choice label="Text size" value={s.textSize} options={[['standard', 'Standard'], ['large', 'Large']]} onChange={(textSize) => set({ textSize })} />
        <label className="row" style={{ gap: '0.5rem' }}>
          <input type="checkbox" checked={s.underlineLinks} onChange={(e) => set({ underlineLinks: e.target.checked })} />
          Always underline links
        </label>
        <IntervalsEditor settings={s} onSave={(reviewIntervals) => set({ reviewIntervals })} />
      </section>

      <section className="card stack" id="storage" aria-labelledby="storage-h">
        <h2 id="storage-h" style={{ fontSize: '1.2rem' }}>
          Where your progress is stored
        </h2>
        <p style={{ margin: 0 }}>
          {persistent
            ? 'Progress, notes and answers are saved in this browser\'s local storage on this device. There is no account and nothing is synchronised to a server, so other browsers and devices do not see it. Clearing site data deletes it.'
            : 'This browser is blocking local storage (for example in a private window), so progress lasts only while this tab stays open. Export before closing to keep it.'}
        </p>
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          Use export to move progress to another device or keep a backup. Imported files are validated as data before anything changes.
        </p>
        {unreadable && (
          <div className="callout warn">
            <p>
              An unreadable copy of earlier progress was preserved on this device.{' '}
              <button type="button" className="btn small" onClick={() => download('rockto-academy-unreadable-progress.json', unreadable)}>
                Download the unreadable copy
              </button>
            </p>
          </div>
        )}
        <div className="row">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              const text = buildExport(progress);
              setExportText(text);
              download(`rockto-academy-progress-${new Date().toISOString().slice(0, 10)}.json`, text);
            }}
          >
            Export progress (JSON)
          </button>
          {mode === 'demo' && <span className="chip warn">You are exporting demonstration data</span>}
        </div>
        {exportText && <ExportFallback text={exportText} />}
        <ImportSection />
      </section>

      <section className="card stack" aria-labelledby="demo-h">
        <h2 id="demo-h" style={{ fontSize: '1.2rem' }}>
          Demonstration mode
        </h2>
        <p style={{ margin: 0 }}>
          Shows the dashboard and evidence pages filled with clearly labelled sample data. It is stored separately and never changes your own
          progress.
        </p>
        <div>
          {mode === 'demo' ? (
            <button type="button" className="btn" onClick={() => setMode('learner')}>
              Leave demonstration mode
            </button>
          ) : (
            <button type="button" className="btn" onClick={() => setMode('demo')}>
              Enter demonstration mode
            </button>
          )}
        </div>
      </section>

      <section className="card stack" aria-labelledby="coach-h">
        <h2 id="coach-h" style={{ fontSize: '1.2rem' }}>
          AI coach
        </h2>
        <p style={{ margin: 0 }}>
          {COACH_ENABLED
            ? 'An optional AI coach endpoint is configured. When you ask it to grade an open response, your answer text is sent to that server, which calls a model provider. Its grades are automated assessments with limitations and are labelled AI-graded.'
            : 'No AI coach is configured for this deployment. Lessons, multiple-choice grading and self-review all work without it, and nothing you type is sent anywhere.'}
        </p>
      </section>

      {mode === 'learner' && (
        <section className="card stack" aria-labelledby="reset-h" style={{ borderColor: 'var(--bad)' }}>
          <h2 id="reset-h" style={{ fontSize: '1.2rem' }}>
            Reset progress
          </h2>
          <p style={{ margin: 0 }}>Deletes all lesson visits, answers, notes and reviews on this device. Display settings are kept.</p>
          <div>
            <button type="button" className="btn danger" onClick={() => setConfirmReset(true)}>
              Reset all progress…
            </button>
          </div>
        </section>
      )}
      <ConfirmDialog
        open={confirmReset}
        title="Reset all progress?"
        confirmLabel="Delete my progress"
        danger
        confirmDisabled={resetText !== 'RESET'}
        onCancel={() => {
          setConfirmReset(false);
          setResetText('');
        }}
        onConfirm={() => {
          resetLearnerProgress();
          setConfirmReset(false);
          setResetText('');
        }}
      >
        <p>
          This permanently deletes {progress.attempts.length} attempts, {Object.keys(progress.notes).length} notes and{' '}
          {Object.keys(progress.completed).length} completed lessons from this device. Export first if you want a copy.
        </p>
        <div className="field" style={{ marginTop: '0.6rem' }}>
          <label htmlFor="reset-confirm">Type RESET to confirm</label>
          <input id="reset-confirm" className="input" value={resetText} onChange={(e) => setResetText(e.target.value)} autoComplete="off" />
        </div>
      </ConfirmDialog>
    </div>
  );
}
