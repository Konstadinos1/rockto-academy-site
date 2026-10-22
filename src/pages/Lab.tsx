import type { ComponentType } from 'react';
import { Link, useParams } from 'react-router';
import { LESSONS } from '../content/index';
import type { LabId } from '../content/types';
import { EvaluationPanelLab } from '../labs/EvaluationPanel';
import { PersistenceExplorerLab } from '../labs/PersistenceExplorer';
import { TaskPermissionsLab } from '../labs/TaskPermissions';
import { TraceInspectorLab } from '../labs/TraceInspector';
import { usePageTitle } from '../lib/usePageTitle';
import { NotFoundPage } from './NotFound';

export const LAB_TITLES: Record<LabId, string> = {
  'task-permissions': 'Task permission comparison',
  'trace-inspector': 'Trace inspector',
  'persistence-explorer': 'Persistence explorer',
  'evaluation-panel': 'Evaluation panel',
};

const LABS: { id: LabId; summary: string; component: ComponentType }[] = [
  {
    id: 'task-permissions',
    summary: 'The same CFO in an invoice-summary and a payroll-analysis workflow: see how the active task, not the role alone, decides which tools run.',
    component: TaskPermissionsLab,
  },
  {
    id: 'trace-inspector',
    summary: 'Separate requested, proposed, authorized, executed and blocked actions in synthetic traces, including a refusal that comes after an executed send.',
    component: TraceInspectorLab,
  },
  {
    id: 'persistence-explorer',
    summary: 'Compare what changes when an event touches context, memory, a retrieval index, a dataset, a checkpoint or a business system.',
    component: PersistenceExplorerLab,
  },
  {
    id: 'evaluation-panel',
    summary: 'Inspect benign completion and executed violations together, with case counts and denominators, across three configurations.',
    component: EvaluationPanelLab,
  },
];

function SimulationNotice() {
  return (
    <p className="callout warn" role="note">
      <span className="sim-badge" style={{ marginRight: '0.5rem' }}>
        Browser simulation
      </span>
      Outcomes are computed from fixed synthetic data in your browser. No attack is executed and no remote API is called. A simulated block
      illustrates where a control belongs; it does not prove that any production control works.
    </p>
  );
}

export function LabIndexPage() {
  usePageTitle('Case lab');
  return (
    <div className="stack" style={{ maxWidth: '58rem' }}>
      <header>
        <p className="eyebrow">Case lab</p>
        <h1 style={{ fontSize: '2rem', marginTop: '0.4rem' }}>Synthetic architecture and tool-execution exercises</h1>
        <p className="lede">Four interactive simulations of ROCKTO systems. Each links back to the lessons that use it.</p>
      </header>
      <SimulationNotice />
      <ul className="grid-auto" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {LABS.map((lab) => {
          const lessons = LESSONS.filter((l) => l.labId === lab.id);
          return (
            <li key={lab.id} className="card">
              <h2 style={{ fontSize: '1.15rem' }}>
                <Link to={`/lab/${lab.id}`} style={{ color: 'var(--text)' }}>
                  {LAB_TITLES[lab.id]}
                </Link>
              </h2>
              <p className="muted" style={{ fontSize: '0.92rem' }}>
                {lab.summary}
              </p>
              {lessons.length > 0 && (
                <p style={{ fontSize: '0.85rem' }}>
                  Used in:{' '}
                  {lessons.map((l, i) => (
                    <span key={l.id}>
                      {i > 0 && ' · '}
                      <Link to={`/lesson/${l.id}`}>{l.id}</Link>
                    </span>
                  ))}
                </p>
              )}
              <Link className="btn small" to={`/lab/${lab.id}`}>
                Open lab
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function LabPage() {
  const { labId = '' } = useParams();
  const lab = LABS.find((l) => l.id === labId);
  usePageTitle(lab ? LAB_TITLES[lab.id] : 'Lab not found');
  if (!lab) return <NotFoundPage what="lab" />;
  const Component = lab.component;
  const lessons = LESSONS.filter((l) => l.labId === lab.id);
  return (
    <div className="stack" style={{ maxWidth: '62rem' }}>
      <header>
        <p className="eyebrow">
          <Link to="/lab">Case lab</Link> · browser simulation
        </p>
        <h1 style={{ fontSize: '2rem', marginTop: '0.4rem' }}>{LAB_TITLES[lab.id]}</h1>
        <p className="lede">{lab.summary}</p>
      </header>
      <SimulationNotice />
      <section className="card" aria-label={`${LAB_TITLES[lab.id]} simulation`}>
        <Component />
      </section>
      {lessons.length > 0 && (
        <p>
          Related lessons:{' '}
          {lessons.map((l, i) => (
            <span key={l.id}>
              {i > 0 && ' · '}
              <Link to={`/lesson/${l.id}`}>
                {l.id} {l.title}
              </Link>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
