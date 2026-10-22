import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildDemoProgress } from './demo';
import { emptyProgress, type Progress } from './schema';
import {
  BACKUP_KEY,
  DEMO_KEY,
  MODE_KEY,
  STORAGE_KEY,
  loadProgress,
  readRaw,
  saveProgress,
  storageAvailable,
  writeRaw,
} from './storage';

export type Mode = 'learner' | 'demo';

interface StoreValue {
  progress: Progress;
  mode: Mode;
  /** False when the browser blocks storage (private mode, policy): progress then lasts only for this tab. */
  persistent: boolean;
  saveFailed: boolean;
  loadStatus: 'empty' | 'loaded' | 'unreadable';
  update: (fn: (p: Progress) => Progress) => void;
  setMode: (mode: Mode) => void;
  replaceWithImport: (incoming: Progress) => void;
  undoImport: () => boolean;
  hasImportBackup: boolean;
  resetLearnerProgress: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function readMode(): Mode {
  return readRaw(MODE_KEY) === 'demo' ? 'demo' : 'learner';
}

function loadFor(mode: Mode) {
  if (mode === 'learner') return loadProgress(STORAGE_KEY);
  const loaded = loadProgress(DEMO_KEY);
  return loaded.status === 'loaded' ? loaded : { progress: buildDemoProgress(), status: 'loaded' as const };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(readMode);
  const initial = useMemo(() => loadFor(mode), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [progress, setProgress] = useState<Progress>(initial.progress);
  const [loadStatus, setLoadStatus] = useState(initial.status);
  const [saveFailed, setSaveFailed] = useState(false);
  const [hasImportBackup, setHasImportBackup] = useState(() => readRaw(BACKUP_KEY) !== null);
  const persistent = useMemo(storageAvailable, []);
  const keyRef = useRef(mode === 'demo' ? DEMO_KEY : STORAGE_KEY);
  const skipFirstSave = useRef(initial.status === 'unreadable');

  useEffect(() => {
    // An unreadable stored copy is kept until the learner changes something, so it can be recovered.
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    setSaveFailed(!saveProgress(keyRef.current, progress));
  }, [progress]);

  const update = useCallback((fn: (p: Progress) => Progress) => setProgress((prev) => fn(prev)), []);

  const setMode = useCallback((next: Mode) => {
    writeRaw(MODE_KEY, next === 'demo' ? 'demo' : null);
    keyRef.current = next === 'demo' ? DEMO_KEY : STORAGE_KEY;
    const loaded = loadFor(next);
    setModeState(next);
    setLoadStatus(loaded.status);
    setProgress(loaded.progress);
  }, []);

  const replaceWithImport = useCallback((incoming: Progress) => {
    const current = readRaw(STORAGE_KEY);
    if (current !== null) setHasImportBackup(writeRaw(BACKUP_KEY, current));
    writeRaw(MODE_KEY, null);
    keyRef.current = STORAGE_KEY;
    setModeState('learner');
    setProgress(incoming);
  }, []);

  const undoImport = useCallback(() => {
    const backup = readRaw(BACKUP_KEY);
    if (backup === null) return false;
    writeRaw(STORAGE_KEY, backup);
    writeRaw(BACKUP_KEY, null);
    setHasImportBackup(false);
    keyRef.current = STORAGE_KEY;
    setModeState('learner');
    setProgress(loadProgress(STORAGE_KEY).progress);
    return true;
  }, []);

  const resetLearnerProgress = useCallback(() => {
    const settings = progress.settings;
    setProgress({ ...emptyProgress(), settings });
  }, [progress.settings]);

  const value = useMemo<StoreValue>(
    () => ({ progress, mode, persistent, saveFailed, loadStatus, update, setMode, replaceWithImport, undoImport, hasImportBackup, resetLearnerProgress }),
    [progress, mode, persistent, saveFailed, loadStatus, update, setMode, replaceWithImport, undoImport, hasImportBackup, resetLearnerProgress],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
