import { useSQLiteContext } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type DependencyList,
  type ReactNode,
} from 'react';

import type { Mode } from '@/db/types';

const MODE_KEY = 'mode';

type AppState = {
  mode: Mode;
  setMode: (mode: Mode) => void;
  /** Increments after every write so screens reload their data. */
  dataVersion: number;
  notifyDataChanged: () => void;
};

const AppStateContext = createContext<AppState | null>(null);

function readStoredMode(): Mode {
  try {
    return Storage.getItemSync(MODE_KEY) === 'tenant' ? 'tenant' : 'owner';
  } catch {
    return 'owner';
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(readStoredMode);
  const [dataVersion, setDataVersion] = useState(0);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    Storage.setItem(MODE_KEY, next).catch(() => {});
  }, []);

  const notifyDataChanged = useCallback(() => setDataVersion((v) => v + 1), []);

  const value = useMemo(
    () => ({ mode, setMode, dataVersion, notifyDataChanged }),
    [mode, setMode, dataVersion, notifyDataChanged]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}

export function useMode() {
  return useAppState().mode;
}

/** Labels that change with the mode. */
export function useModeLabels() {
  const mode = useMode();
  return mode === 'owner'
    ? {
        person: 'Tenant',
        aPerson: 'a tenant',
        people: 'Tenants',
        moneyIn: 'Collected',
        moneyVerb: 'collected',
        recordPayment: 'Record rent collected',
      }
    : {
        person: 'Owner',
        aPerson: 'an owner',
        people: 'Owners',
        moneyIn: 'Paid',
        moneyVerb: 'paid',
        recordPayment: 'Record rent paid',
      };
}

/**
 * Runs an async query against the database and re-runs it whenever the mode
 * or any data changes. Returns `undefined` while loading.
 */
export function useDbQuery<T>(
  query: (db: ReturnType<typeof useSQLiteContext>, mode: Mode) => Promise<T>,
  deps: DependencyList = []
) {
  const db = useSQLiteContext();
  const { mode, dataVersion } = useAppState();
  const [data, setData] = useState<T>();

  useEffect(() => {
    let cancelled = false;
    query(db, mode)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error) => console.warn('Query failed', error));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, mode, dataVersion, ...deps]);

  return data;
}
