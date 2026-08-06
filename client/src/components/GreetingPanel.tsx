import { useId, useState } from 'react';
import './GreetingPanel.css';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useGreeting } from '../hooks/useGreeting';

export default function GreetingPanel() {
  const inputId = useId();
  const [name, setName] = useState('');
  const debouncedName = useDebouncedValue(name, 300);
  const { data, isPending, isError, error, isFetching, refetch } = useGreeting(debouncedName);

  return (
    <section className="panel" aria-labelledby={`${inputId}-heading`}>
      <h2 className="panel__heading" id={`${inputId}-heading`}>
        Greeting
      </h2>

      <div className="panel__field">
        <label className="panel__label" htmlFor={inputId}>
          Your name
        </label>
        <input
          className="panel__input"
          id={inputId}
          type="text"
          value={name}
          placeholder="world"
          autoComplete="given-name"
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="panel__result" aria-busy={isFetching} aria-live="polite">
        {isPending && <p className="panel__status">Loading greeting…</p>}

        {isError && (
          <div className="panel__error" role="alert">
            <p className="panel__status">{error.message}</p>
            <button className="panel__retry" type="button" onClick={() => void refetch()}>
              Retry
            </button>
          </div>
        )}

        {!isPending && !isError && (
          <>
            <p className="panel__message">{data.message}</p>
            <p className="panel__meta">
              Served at <time dateTime={data.generatedAt}>{formatTime(data.generatedAt)}</time>
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function formatTime(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleTimeString();
}
