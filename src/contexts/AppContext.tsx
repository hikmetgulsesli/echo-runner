import { createContext, useContext, type ReactNode } from 'react';
import { useAppState } from '../hooks/useAppState';
import type { RuntimeAppBridge } from '../types/domain';

const AppContext = createContext<RuntimeAppBridge | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const app = useAppState();
  return <AppContext.Provider value={app}>{children}</AppContext.Provider>;
}

export function useAppContext(): RuntimeAppBridge {
  const app = useContext(AppContext);
  if (!app) {
    throw new Error('useAppContext must be used inside AppProvider');
  }
  return app;
}
