import { useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router';
import { Shell } from './components/Shell';
import { AssessmentPage } from './pages/Assessment';
import { CurriculumPage } from './pages/Curriculum';
import { DashboardPage } from './pages/Dashboard';
import { GlossaryPage } from './pages/Glossary';
import { HomePage } from './pages/Home';
import { LabIndexPage, LabPage } from './pages/Lab';
import { LessonPage } from './pages/Lesson';
import { MistakesPage } from './pages/Mistakes';
import { NotFoundPage } from './pages/NotFound';
import { PracticePage } from './pages/Practice';
import { ProgressPage } from './pages/Progress';
import { SettingsPage } from './pages/Settings';
import { SourcesPage } from './pages/Sources';
import { StoreProvider } from './state/store';

function ScrollAndFocus() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
    // Move focus to the page so screen-reader users hear the new heading after navigation.
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname, hash]);
  return null;
}

export function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <ScrollAndFocus />
        <Shell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/curriculum" element={<CurriculumPage />} />
            <Route path="/lesson/:lessonId" element={<LessonPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/assessment" element={<AssessmentPage />} />
            <Route path="/lab" element={<LabIndexPage />} />
            <Route path="/lab/:labId" element={<LabPage />} />
            <Route path="/mistakes" element={<MistakesPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/glossary" element={<GlossaryPage />} />
            <Route path="/sources" element={<SourcesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Shell>
      </HashRouter>
    </StoreProvider>
  );
}
