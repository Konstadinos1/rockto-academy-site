import { useState } from 'react';

// Browser simulation of a synthetic evaluation. Counts are fixed teaching data for fictional
// configurations, not measurements of any real product.

type CaseKind = 'benign' | 'adversarial' | 'ambiguous';

interface ConfigResult {
  id: string;
  label: string;
  description: string;
  /** Per case kind: [completed correctly, proposed violation, executed violation, blocked legitimate]. */
  results: Record<CaseKind, { completed: number; proposed: number; executed: number; falseBlocks: number }>;
}

const CASES: Record<CaseKind, number> = { benign: 60, adversarial: 30, ambiguous: 10 };

const CONFIGS: ConfigResult[] = [
  {
    id: 'prompt-only',
    label: 'Prompt rules only',
    description: 'System prompt says "never email external parties". No dispatcher checks.',
    results: {
      benign: { completed: 57, proposed: 0, executed: 0, falseBlocks: 0 },
      adversarial: { completed: 0, proposed: 11, executed: 11, falseBlocks: 0 },
      ambiguous: { completed: 8, proposed: 2, executed: 2, falseBlocks: 0 },
    },
  },
  {
    id: 'dispatcher',
    label: 'Dispatcher task scope + recipient allowlist',
    description: 'Same prompt. The dispatcher blocks tools outside the task and unapproved recipients.',
    results: {
      benign: { completed: 55, proposed: 0, executed: 0, falseBlocks: 2 },
      adversarial: { completed: 0, proposed: 10, executed: 0, falseBlocks: 0 },
      ambiguous: { completed: 7, proposed: 2, executed: 0, falseBlocks: 1 },
    },
  },
  {
    id: 'refuse-all',
    label: 'Refuse anything involving email',
    description: 'A filter refuses every request that mentions email or sending.',
    results: {
      benign: { completed: 31, proposed: 0, executed: 0, falseBlocks: 29 },
      adversarial: { completed: 0, proposed: 0, executed: 0, falseBlocks: 0 },
      ambiguous: { completed: 2, proposed: 0, executed: 0, falseBlocks: 8 },
    },
  },
];

function pct(n: number, d: number): string {
  return d ? `${((n / d) * 100).toFixed(1)}%` : '—';
}

export function EvaluationPanelLab() {
  const [configId, setConfigId] = useState(CONFIGS[0]?.id ?? '');
  const config = CONFIGS.find((c) => c.id === configId) ?? CONFIGS[0];
  if (!config) return null;
  const kinds = Object.keys(CASES) as CaseKind[];
  const executedTotal = kinds.reduce((s, k) => s + config.results[k].executed, 0);
  const attackDenominator = CASES.adversarial;

  return (
    <div className="lab-panel">
      <div className="toggle-group" role="group" aria-label="Configuration">
        {CONFIGS.map((c) => (
          <button key={c.id} type="button" aria-pressed={configId === c.id} onClick={() => setConfigId(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <p style={{ margin: 0 }}>{config.description}</p>
      <div className="table-wrap" aria-live="polite">
        <table className="data-table">
          <caption className="sr-only">Results for {config.label} by case type, with denominators</caption>
          <thead>
            <tr>
              <th scope="col">Case type (n)</th>
              <th scope="col">Legitimate task completed</th>
              <th scope="col">Violation proposed</th>
              <th scope="col">Violation executed</th>
              <th scope="col">Legitimate request blocked</th>
            </tr>
          </thead>
          <tbody>
            {kinds.map((k) => {
              const r = config.results[k];
              const n = CASES[k];
              return (
                <tr key={k}>
                  <th scope="row" style={{ background: 'transparent', color: 'var(--text)', fontSize: 'inherit' }}>
                    {k} ({n})
                  </th>
                  <td className="mono">{k === 'adversarial' ? 'n/a' : `${r.completed}/${n} (${pct(r.completed, n)})`}</td>
                  <td className="mono">
                    {r.proposed}/{n}
                  </td>
                  <td className="mono" style={{ color: r.executed ? 'var(--bad)' : undefined }}>
                    {r.executed}/{n}
                  </td>
                  <td className="mono" style={{ color: r.falseBlocks ? 'var(--warn)' : undefined }}>
                    {k === 'adversarial' ? 'n/a' : `${r.falseBlocks}/${n}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <dl className="grid-auto">
        <div className="card flat stat">
          <dt className="stat-label">Executed attack success (adversarial)</dt>
          <dd className="stat-value" style={{ margin: 0 }}>
            {pct(config.results.adversarial.executed, attackDenominator)}
          </dd>
          <dd className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
            {config.results.adversarial.executed} of {attackDenominator} attempts, one trial each
          </dd>
        </div>
        <div className="card flat stat">
          <dt className="stat-label">Benign completion</dt>
          <dd className="stat-value" style={{ margin: 0 }}>
            {pct(config.results.benign.completed, CASES.benign)}
          </dd>
          <dd className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
            {config.results.benign.completed} of {CASES.benign} legitimate tasks
          </dd>
        </div>
        <div className="card flat stat">
          <dt className="stat-label">Executed violations, all cases</dt>
          <dd className="stat-value" style={{ margin: 0 }}>
            {executedTotal}
          </dd>
          <dd className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
            out of {kinds.reduce((s, k) => s + CASES[k], 0)} cases
          </dd>
        </div>
      </dl>
      {config.id === 'refuse-all' && (
        <p className="callout warn" role="note" style={{ margin: 0 }}>
          Zero executed violations, but almost half of legitimate tasks fail. A security result is only meaningful next to benign completion.
        </p>
      )}
      {config.id === 'dispatcher' && (
        <p className="callout key" role="note" style={{ margin: 0 }}>
          The model still proposed 10 violations: the prompt did not stop the manipulation. The dispatcher stopped execution. Report proposed
          and executed counts separately.
        </p>
      )}
      <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
        Synthetic teaching data for fictional configurations (100 cases, one trial each). Real evaluations need repeated trials, a stated
        attack budget and held-out cases.
      </p>
    </div>
  );
}
