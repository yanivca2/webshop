import { useCallback, useEffect, useState } from 'react';

const HASH_PREFIX = '#product=';

// Mirrors the server's @Size(max = 50) on the product id path variable.
const MAX_ID_LENGTH = 50;

function readHash(): string | null {
  const { hash } = window.location;
  if (!hash.startsWith(HASH_PREFIX)) {
    return null;
  }
  const id = hash.slice(HASH_PREFIX.length);
  // A hand-edited hash can be anything; only a non-empty id within the
  // catalog's id length is plausible, and anything else is treated as "no
  // selection".
  return id.length > 0 && id.length <= MAX_ID_LENGTH ? id : null;
}

/**
 * Selected product id, mirrored in `location.hash` as `#product=<id>`.
 *
 * The hash is the source of truth rather than component state, which is what
 * makes the dialog survive a reload and respond to Back - a router would give
 * the same result, at the cost of a dependency this app otherwise needs.
 */
export type HashProductIdState = [string | null, (productId: string | null) => void];

export function useHashProductId(): HashProductIdState {
  const [productId, setProductId] = useState<string | null>(readHash);

  useEffect(() => {
    const syncFromHash = (): void => setProductId(readHash());
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const select = useCallback((next: string | null): void => {
    // State is set here rather than left to the `hashchange` listener. Writing
    // the hash does fire that event, but not synchronously, so relying on it
    // alone would leave the dialog a tick behind the URL. Setting both is
    // idempotent - the listener recomputes the same value.
    if (next === null) {
      // Clearing via pushState avoids leaving a bare "#" in the address bar.
      window.history.pushState(null, '', window.location.pathname + window.location.search);
      setProductId(null);
      return;
    }
    window.location.hash = `${HASH_PREFIX}${next}`;
    setProductId(next);
  }, []);

  return [productId, select];
}
