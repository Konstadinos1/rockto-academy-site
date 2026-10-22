import { emptyProgress, progressSchema, type Progress } from './schema';

// Device-only persistence in localStorage. Nothing is sent to a server.

export const STORAGE_KEY = 'rockto-academy:v1';
export const DEMO_KEY = 'rockto-academy:demo:v1';
export const MODE_KEY = 'rockto-academy:mode';
export const BACKUP_KEY = 'rockto-academy:v1:pre-import-backup';
export const CORRUPT_KEY = 'rockto-academy:v1:unreadable';

export type LoadOutcome = { progress: Progress; status: 'empty' | 'loaded' | 'unreadable' };

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadProgress(key: string): LoadOutcome {
  const store = storage();
  const raw = store?.getItem(key) ?? null;
  if (raw === null) return { progress: emptyProgress(), status: 'empty' };
  try {
    const parsed = progressSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return { progress: parsed.data, status: 'loaded' };
  } catch {
    // Fall through: unreadable JSON is preserved below, never silently discarded.
  }
  try {
    store?.setItem(CORRUPT_KEY, raw);
  } catch {
    // Storage full or blocked; the unreadable copy stays under its original key until overwritten by a save.
  }
  return { progress: emptyProgress(), status: 'unreadable' };
}

export function saveProgress(key: string, progress: Progress): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function readRaw(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string | null): boolean {
  const store = storage();
  if (!store) return false;
  try {
    if (value === null) store.removeItem(key);
    else store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function storageAvailable(): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem('rockto-academy:probe', '1');
    store.removeItem('rockto-academy:probe');
    return true;
  } catch {
    return false;
  }
}
