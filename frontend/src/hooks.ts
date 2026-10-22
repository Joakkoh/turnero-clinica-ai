import { useCallback, useEffect, useState } from 'react';

/** Returns `value` after it has stopped changing for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Loads a list from the API whenever `query` changes (or `reload` is called),
 * ignoring responses from superseded requests. `fetcher` must be a stable reference.
 */
export function useList<T>(
  fetcher: (query: string, signal: AbortSignal) => Promise<T[]>,
  query: string,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetcher(query, controller.signal)
      .then((data) => {
        setItems(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Error desconocido');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [fetcher, query, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { items, loading, error, reload };
}
