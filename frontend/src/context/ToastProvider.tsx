import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContext, type Toast, type ToastContextValue, type ToastVariant } from './toastContext';
import { ToastViewport } from '@/components/ui/ToastViewport';

/** How long a message stays before dismissing itself. */
const AUTO_DISMISS_MS = 4500;

/**
 * Transient notifications for actions whose result would otherwise be invisible.
 *
 * Used where the outcome is a change elsewhere on the page — deactivating a team member,
 * for instance, where the row updates but nothing confirms the change was saved. Errors
 * belonging to a specific field stay with that field rather than appearing here.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const nextId = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (variant: ToastVariant, message: string) => {
      // A counter rather than a random id, so the value is stable and testable.
      nextId.current += 1;
      const id = `toast-${nextId.current}`;

      setToasts((current) => [...current, { id, variant, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
      );
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      show,
      success: (message: string) => show('success', message),
      error: (message: string) => show('danger', message),
      dismiss,
    }),
    [toasts, show, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
