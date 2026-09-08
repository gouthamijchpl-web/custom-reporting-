import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { preferenceApi } from '@/api';
import { useAuth } from './useAuth';

/**
 * A small user preference stored through the backend in Supabase. Updates are applied
 * immediately in the UI and coalesced before being sent to the server.
 */
export function useCloudPreference<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const initialValueRef = useRef(initialValue);
  const requestRef = useRef(0);
  const [value, setValue] = useState<T>(initialValue);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    const requestId = ++requestRef.current;
    if (!userId) {
      setValue(initialValueRef.current);
      setLoadedFor(null);
      return;
    }
    void preferenceApi.get<T>(key).then((response) => {
      if (requestRef.current !== requestId) return;
      setValue(response.value ?? initialValueRef.current);
      setLoadedFor(userId);
    }).catch(() => {
      if (requestRef.current !== requestId) return;
      setValue(initialValueRef.current);
      setLoadedFor(userId);
    });
  }, [key, userId]);

  useEffect(() => {
    if (!userId || loadedFor !== userId) return;
    const timer = window.setTimeout(() => {
      void preferenceApi.set(key, value).catch(() => undefined);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [key, loadedFor, userId, value]);

  return [value, setValue];
}
