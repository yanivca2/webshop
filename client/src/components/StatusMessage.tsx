import type { ReactElement } from 'react';
import './StatusMessage.css';

interface StatusMessageProps {
  title: string;
  detail?: string;
  // Errors announce themselves; loading and empty states do not interrupt.
  tone?: 'info' | 'error';
  onRetry?: () => void;
}

export default function StatusMessage({
  title,
  detail,
  tone = 'info',
  onRetry,
}: StatusMessageProps): ReactElement {
  return (
    <div
      className={`status status--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
    >
      <h2 className="status__title">{title}</h2>
      {detail ? <p className="status__detail">{detail}</p> : null}
      {onRetry ? (
        <button type="button" className="status__retry" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
