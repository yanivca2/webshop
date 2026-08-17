import { useState } from 'react';

export type ViewMode = 'cards' | 'list';

const STORAGE_KEY = 'webshop.productViewMode.v1';

function readStoredViewMode(): ViewMode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'list' ? 'list' : 'cards';
  } catch {
    return 'cards';
  }
}

export type ViewModeState = [ViewMode, (mode: ViewMode) => void];

/** The chosen product view mode (cards or list), persisted across reloads. */
export function useViewMode(): ViewModeState {
  const [viewMode, setViewModeState] = useState<ViewMode>(readStoredViewMode);

  function setViewMode(mode: ViewMode): void {
    setViewModeState(mode);
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Private browsing or a full quota - the chosen mode still applies for
      // the current session, it just won't survive a reload.
    }
  }

  return [viewMode, setViewMode];
}
