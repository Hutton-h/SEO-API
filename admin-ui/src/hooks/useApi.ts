import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';

interface UseApiOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  errorMessage?: string;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refreshing: boolean;
}

export function useApi<T>(
  apiFunc: (...args: any[]) => Promise<T>,
  options: UseApiOptions<T> = {}
) {
  const { immediate = true, onSuccess, onError, errorMessage } = options;
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: immediate,
    error: null,
    refreshing: false,
  });
  const mountedRef = useRef(true);
  const paramsRef = useRef<any[]>([]);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async (...args: any[]) => {
    paramsRef.current = args;
    setState(prev => ({
      ...prev,
      loading: prev.data === null,
      refreshing: prev.data !== null,
      error: null,
    }));

    try {
      const result = await apiFunc(...args);
      if (mountedRef.current) {
        setState({ data: result, loading: false, error: null, refreshing: false });
        onSuccess?.(result);
      }
      return result;
    } catch (err: any) {
      if (mountedRef.current) {
        const error = err instanceof Error ? err : new Error(err?.message || 'Request failed');
        setState({ data: null, loading: false, error, refreshing: false });
        if (errorMessage) message.error(errorMessage);
        onError?.(error);
      }
      throw err;
    }
  }, [apiFunc, onSuccess, onError, errorMessage]);

  const refresh = useCallback(() => {
    return execute(...paramsRef.current);
  }, [execute]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, []);

  return { ...state, execute, refresh };
}