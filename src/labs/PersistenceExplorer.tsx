import { useState } from 'react';

// Browser simulation: which artifact an event changes, how long the change persists, and
// what rolling it back involves. The mapping is the course's teaching model, not a product spec.

type ArtifactId = 'context' | 'memory' | 'index' | 'dataset' | 'checkpoint' | 'business';

const ARTIFACTS: { id: ArtifactId; label: string; persistence: string; rollback: string }[] = [
  { id: 'context', label: 'Context window', persistence: 'This request (and this thread while history is re-sent).', rollback: 'Start a new thread or remove the message from stored history.' },
  { id: 'memory', label: 'Application memory', persistence: 'Future sessions within the memory scope (user, team or global).', rollback: 'Delete the entry; audit other entries written by the same session.' },
  { id: 'index', label: 'Retrieval index', persistence: 'Every query that retrieves the chunk, for every user with access.', rollback: 'Remove or correct the source document, then re-index and purge caches.' },
  { id: 'dataset', label: 'Training dataset', persistence: 'Future training runs that include this dataset version.', rollback: 'Quarantine the version; rebuild without the bad records.' },
  { id: 'checkpoint', label: 'Model checkpoint', persistence: 'Every inference served by these weights.', rollback: 'Roll back to a checkpoint trained before the bad data, or retrain.' },
  { id: 'business', label: 'Business system', persistence: 'The real world: payments, emails, records.', rollback: 'Business process: cancel, reverse, notify. AI rollback does not undo it.' },
];

const EVENTS: { id: string; label: string; changes: ArtifactId[]; note: string }[] = [
  { id: 'chat', label: 'A user states a false fact in chat', changes: ['context'], note: 'Only the conversation context changes. The model\'s weights are untouched.' },
  { id: 'memory', label: 'The assistant saves that fact to team memory', changes: ['context', 'memory'], note: 'The claim now reaches every teammate\'s future prompts without any retraining.' },
  { id: 'ingest', label: 'A poisoned PDF is ingested into SupplierKB', changes: ['index'], note: 'Retrieval poisoning: fixed by correcting the corpus and re-indexing, not by retraining.' },
  { id: 'feedback', label: 'Chat logs are exported into next month\'s fine-tune set', changes: ['dataset'], note: 'Nothing changes in serving yet. Weights change only when a training job runs on this dataset.' },
  { id: 'finetune', label: 'The fine-tune job runs on that dataset', changes: ['checkpoint'], note: 'Training data poisoning now persists in the weights until rollback or retraining.' },
  { id: 'payment', label: 'The agent creates and an approver releases a payment', changes: ['context', 'business'], note: 'The effect is in Ledgerline and the bank. Deleting the chat or the memory does not reverse it.' },
];

export function PersistenceExplorerLab() {
  const [eventId, setEventId] = useState(EVENTS[0]?.id ?? '');
  const event = EVENTS.find((e) => e.id === eventId) ?? EVENTS[0];
  if (!event) return null;
  return (
    <div className="lab-panel">
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: '0.5rem' }}>
          Choose an event
        </legend>
        <div style={{ display: 'grid', gap: '0.4rem' }}>
          {EVENTS.map((e) => (
            <label key={e.id} className="option" style={{ padding: '0.6rem 0.8rem' }}>
              <input type="radio" name="persistence-event" checked={eventId === e.id} onChange={() => setEventId(e.id)} />
              <span>{e.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p role="status" className="callout key" style={{ margin: 0 }}>
        {event.note}
      </p>
      <ul className="grid-auto" style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="Artifacts">
        {ARTIFACTS.map((a) => {
          const changed = event.changes.includes(a.id);
          return (
            <li
              key={a.id}
              className="card flat fade-in"
              style={{ borderColor: changed ? 'var(--accent)' : undefined, background: changed ? 'var(--accent-soft)' : undefined, transition: 'background var(--dur), border-color var(--dur)' }}
            >
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{a.label}</strong>
                <span className={`chip ${changed ? 'accent' : ''}`}>{changed ? 'Changed' : 'Unchanged'}</span>
              </div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.88rem' }}>
                <span className="muted">Persists: </span>
                {a.persistence}
              </p>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem' }}>
                <span className="muted">Recovery: </span>
                {a.rollback}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
        Browser simulation. Real systems may add stores (caches, logs, backups) that also need checking.
      </p>
    </div>
  );
}
