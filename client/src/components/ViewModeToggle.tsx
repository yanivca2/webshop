import type { ReactElement } from 'react';
import type { ViewMode } from '../hooks/useViewMode';
import './ViewModeToggle.css';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export default function ViewModeToggle({ value, onChange }: ViewModeToggleProps): ReactElement {
  return (
    <div className="view-toggle" role="group" aria-label="Product view">
      <button
        type="button"
        className="view-toggle__button"
        aria-pressed={value === 'cards'}
        onClick={() => onChange('cards')}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" />
          <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" />
          <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" />
          <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
        </svg>
        Cards
      </button>
      <button
        type="button"
        className="view-toggle__button"
        aria-pressed={value === 'list'}
        onClick={() => onChange('list')}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <rect x="1" y="2" width="14" height="2.5" rx="1" fill="currentColor" />
          <rect x="1" y="6.75" width="14" height="2.5" rx="1" fill="currentColor" />
          <rect x="1" y="11.5" width="14" height="2.5" rx="1" fill="currentColor" />
        </svg>
        List
      </button>
    </div>
  );
}
