import { useCallback, useEffect, useState } from "react";
import { ConsoleApiError } from "./api";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: ConsoleApiError | Error | null;
  reload: () => void;
}

export function useAsync<T>(fn: () => Promise<T>, deps: ReadonlyArray<unknown> = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ConsoleApiError | Error | null>(null);
  const [bump, setBump] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fn()
      .then((value) => {
        if (cancelled) return;
        setData(value);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bump, ...deps]);

  const reload = useCallback(() => setBump((n) => n + 1), []);
  return { data, loading, error, reload };
}
