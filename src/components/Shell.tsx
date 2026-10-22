import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { dueReviews } from '../lib/review';
import { mistakeQuestionIds } from '../lib/metrics';
import { updateSettings } from '../state/actions';
import { useStore } from '../state/store';

interface NavItem {
  to: string;
  label: string;
  badge?: 'due' | 'mistakes';
}

const LEARN: NavItem[] = [
  { to: '/dashboard', label: 'Overview' },
  { to: '/curriculum', label: 'Curriculum' },
  { to: '/practice', label: 'Practice', badge: 'due' },
  { to: '/assessment', label: 'Assessment' },
  { to: '/lab', label: 'Case lab' },
];
const EVIDENCE: NavItem[] = [
  { to: '/mistakes', label: 'Mistake notebook', badge: 'mistakes' },
  { to: '/progress', label: 'Progress' },
];
const REFERENCE: NavItem[] = [
  { to: '/glossary', label: 'Glossary' },
  { to: '/sources', label: 'Sources' },
  { to: '/settings', label: 'Settings' },
];

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--surface-3)" />
      <path d="M9 23V9h7.5a4.5 4.5 0 0 1 0 9H13m3.5 0L22 23" fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function useApplyPreferences() {
  const { progress } = useStore();
  const { theme, motion, textSize, underlineLinks } = progress.settings;
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    if (motion === 'reduce') root.dataset.motion = 'reduce';
    else delete root.dataset.motion;
    root.dataset.text = textSize;
    root.dataset.underline = String(underlineLinks);
  }, [theme, motion, textSize, underlineLinks]);
}

export function ThemeToggle() {
  const { progress, update } = useStore();
  const current = progress.settings.theme;
  const resolvedDark =
    current === 'dark' || (current === 'system' && typeof window !== 'undefined' && !window.matchMedia?.('(prefers-color-scheme: light)').matches);
  const next = resolvedDark ? 'light' : 'dark';
  return (
    <button type="button" className="btn ghost small" onClick={() => update((p) => updateSettings(p, { theme: next }))} aria-label={`Switch to ${next} theme`}>
      <span aria-hidden="true">{resolvedDark ? '☀' : '☾'}</span> {resolvedDark ? 'Light' : 'Dark'}
    </button>
  );
}

function NavGroup({ label, items, counts }: { label: string; items: NavItem[]; counts: Record<string, number> }) {
  return (
    <nav aria-label={label}>
      <p className="nav-group-label">{label}</p>
      <ul className="nav-list">
        {items.map((item) => {
          const count = item.badge ? counts[item.badge] ?? 0 : 0;
          return (
            <li key={item.to}>
              <NavLink to={item.to} className="nav-link">
                <span>{item.label}</span>
                {count > 0 && (
                  <span className={`nav-count${item.badge === 'due' ? ' due' : ''}`}>
                    {count}
                    <span className="sr-only">{item.badge === 'due' ? ' reviews due' : ' to revisit'}</span>
                  </span>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  useApplyPreferences();
  const { progress, mode, setMode, persistent, saveFailed, loadStatus } = useStore();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const counts = { due: dueReviews(progress).length, mistakes: mistakeQuestionIds(progress).length };

  return (
    <div className="shell">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to content
      </a>
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className="rail" data-open={open} id="course-nav" aria-label="Course navigation">
        <Link to="/" className="brand">
          <BrandMark />
          <span>
            <span className="brand-name">ROCKTO Academy</span>
            <span className="brand-sub">AI Security Lab</span>
          </span>
        </Link>
        <NavGroup label="Learn" items={LEARN} counts={counts} />
        <NavGroup label="Evidence" items={EVIDENCE} counts={counts} />
        <NavGroup label="Reference" items={REFERENCE} counts={counts} />
        <div className="rail-foot">
          <ThemeToggle />
          <p style={{ margin: 0 }}>
            {persistent ? 'Progress is saved in this browser on this device only.' : 'Storage is blocked: progress lasts only while this tab is open.'}{' '}
            <Link to="/settings#storage">Details</Link>
          </p>
          <p style={{ margin: 0 }}>ROCKTO Inc. and every person, system and record in this course are fictional.</p>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button type="button" className="btn ghost small" aria-expanded={open} aria-controls="course-nav" onClick={() => setOpen((v) => !v)}>
            <span aria-hidden="true">☰</span> Menu
          </button>
          <Link to="/" className="brand" aria-label="ROCKTO Academy home">
            <BrandMark />
          </Link>
          <ThemeToggle />
        </header>
        {mode === 'demo' && (
          <div className="banner demo" role="status">
            <strong>Demonstration mode.</strong> You are viewing sample data, kept separately from your own progress.
            <button type="button" className="btn small" onClick={() => setMode('learner')}>
              Return to my progress
            </button>
          </div>
        )}
        {saveFailed && (
          <div className="banner error" role="alert">
            Your latest change could not be saved to this browser (storage full or blocked). Export your progress from Settings to keep a copy.
          </div>
        )}
        {loadStatus === 'unreadable' && mode === 'learner' && (
          <div className="banner error" role="alert">
            Saved progress on this device could not be read, so the course started fresh. The unreadable copy was kept; see <Link to="/settings#storage">Settings</Link>.
          </div>
        )}
        <main id="main" tabIndex={-1} className="page" style={{ outline: 'none' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
