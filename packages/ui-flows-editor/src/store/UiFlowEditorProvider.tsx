import React, { createContext, useContext, useRef } from 'react';
import { useStore, type StoreApi } from 'zustand';
import type { UiFlowEditorStore, PersistenceAdapter } from './types';
import type { UiFlowDefinition, ThemeConfig } from '@oven/module-ui-flows/types';
import { createUiFlowEditorStore } from './uiFlowStore';

// ─── Context ────────────────────────────────────────────────────

const UiFlowEditorContext = createContext<StoreApi<UiFlowEditorStore> | null>(
  null,
);

// ─── Provider ───────────────────────────────────────────────────

export interface UiFlowEditorProviderProps {
  flowId: number;
  flowSlug: string;
  flowName: string;
  initialDefinition?: UiFlowDefinition;
  initialTheme?: ThemeConfig;
  adapter: PersistenceAdapter;
  children: React.ReactNode;
}

export function UiFlowEditorProvider({
  flowId,
  flowSlug,
  flowName,
  initialDefinition,
  initialTheme,
  adapter,
  children,
}: UiFlowEditorProviderProps) {
  // Create store once per mount — ref ensures stable identity
  const storeRef = useRef<StoreApi<UiFlowEditorStore> | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createUiFlowEditorStore({
      flowId,
      flowSlug,
      flowName,
      initialDefinition,
      initialTheme,
      adapter,
    });
  }

  return (
    <UiFlowEditorContext.Provider value={storeRef.current}>
      {children}
    </UiFlowEditorContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────

export function useUiFlowEditorStore<T>(
  selector: (state: UiFlowEditorStore) => T,
): T {
  const store = useContext(UiFlowEditorContext);
  if (!store) {
    throw new Error(
      'useUiFlowEditorStore must be used within a <UiFlowEditorProvider>',
    );
  }
  return useStore(store, selector);
}
