import { useState } from 'react';

// Browser simulation: the same CFO in two workflows. Decisions are computed from fixed
// synthetic tables; nothing here calls a real system.

type Workflow = 'invoice' | 'payroll';

interface Tool {
  id: string;
  label: string;
  rolePermits: boolean;
  resource: string;
}

const TOOLS: Tool[] = [
  { id: 'invoice.search', label: 'invoice.search', rolePermits: true, resource: 'Ledgerline invoices' },
  { id: 'vendor.lookup', label: 'vendor.lookup', rolePermits: true, resource: 'Vendor master (read)' },
  { id: 'payments.create_draft', label: 'payments.create_draft', rolePermits: true, resource: 'Payment drafts' },
  { id: 'payroll.aggregate', label: 'payroll.aggregate', rolePermits: true, resource: 'PayHub aggregates (group ≥ 5)' },
  { id: 'payroll.individual', label: 'payroll.individual', rolePermits: true, resource: 'PayHub individual records' },
  { id: 'report.export_internal', label: 'report.export_internal', rolePermits: true, resource: 'finance-share folder' },
  { id: 'email.send_external', label: 'email.send_external', rolePermits: true, resource: 'Outbound email' },
  { id: 'vendor.update_bank', label: 'vendor.update_bank', rolePermits: false, resource: 'Vendor bank details' },
];

const TASKS: Record<Workflow, { title: string; purpose: string; tools: string[]; destinations: string[] }> = {
  invoice: {
    title: 'Invoice summary',
    purpose: 'Summarize this week\'s supplier invoices and draft payments that match approved invoices.',
    tools: ['invoice.search', 'vendor.lookup', 'payments.create_draft'],
    destinations: ['Portal display to Dana'],
  },
  payroll: {
    title: 'Payroll analysis',
    purpose: 'Compare overtime cost by department for Q3 and save an internal report.',
    tools: ['payroll.aggregate', 'report.export_internal'],
    destinations: ['Portal display to Dana', 'finance-share folder (internal)'],
  },
};

function decide(tool: Tool, workflow: Workflow): { allowed: boolean; reason: string } {
  if (!tool.rolePermits) return { allowed: false, reason: 'Blocked: Dana\'s role does not hold this permission.' };
  if (!TASKS[workflow].tools.includes(tool.id)) {
    return { allowed: false, reason: `Blocked: the ${TASKS[workflow].title.toLowerCase()} task does not need this tool, even though the role permits it.` };
  }
  return { allowed: true, reason: 'Allowed: the role permits it and the active task needs it.' };
}

export function TaskPermissionsLab() {
  const [workflow, setWorkflow] = useState<Workflow>('invoice');
  const [proposal, setProposal] = useState('payroll.aggregate');
  const task = TASKS[workflow];
  const proposed = TOOLS.find((t) => t.id === proposal);
  const decision = proposed ? decide(proposed, workflow) : null;

  return (
    <div className="lab-panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="toggle-group" role="group" aria-label="Active workflow">
          {(Object.keys(TASKS) as Workflow[]).map((w) => (
            <button key={w} type="button" aria-pressed={workflow === w} onClick={() => setWorkflow(w)}>
              {TASKS[w].title}
            </button>
          ))}
        </div>
        <span className="chip">User: Dana Okafor · CFO (fictional)</span>
      </div>
      <p style={{ margin: 0 }}>
        <strong>Task purpose:</strong> {task.purpose}
      </p>
      <div className="table-wrap" aria-live="polite">
        <table className="data-table">
          <caption className="sr-only">Tools: role permission, task need and effective decision for the {task.title} workflow</caption>
          <thead>
            <tr>
              <th scope="col">Tool</th>
              <th scope="col">Resource</th>
              <th scope="col">Role permits</th>
              <th scope="col">Task needs</th>
              <th scope="col">Effective</th>
            </tr>
          </thead>
          <tbody>
            {TOOLS.map((t) => {
              const d = decide(t, workflow);
              const needed = task.tools.includes(t.id);
              return (
                <tr key={t.id}>
                  <td className="mono">{t.label}</td>
                  <td>{t.resource}</td>
                  <td>{t.rolePermits ? 'Yes' : 'No'}</td>
                  <td>{needed ? 'Yes' : 'No'}</td>
                  <td>
                    <span className={`chip ${d.allowed ? 'ok' : 'bad'}`}>{d.allowed ? 'Allowed' : 'Blocked'}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ margin: 0 }}>
        <strong>Allowed destinations:</strong> {task.destinations.join('; ')}.
      </p>
      <div className="card flat stack">
        <div className="field">
          <label htmlFor="proposal">Simulate a model proposal (for example, one steered by text inside an invoice PDF)</label>
          <select id="proposal" className="select" value={proposal} onChange={(e) => setProposal(e.target.value)}>
            {TOOLS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {decision && (
          <p role="status" className={`callout ${decision.allowed ? 'key' : 'warn'}`} style={{ margin: 0 }}>
            <span className="mono">dispatcher.check({proposal}, task={workflow})</span> → {decision.reason}
          </p>
        )}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
        Both checks must pass. In a real system this decision belongs in trusted backend code (the dispatcher and data services) that knows
        the active task; a system-prompt instruction cannot enforce it. This page only simulates the decision table.
      </p>
    </div>
  );
}
