import { createContext } from 'react';

export type ToastVariant = 'success' | 'danger' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
}

export interface ToastContextValue {
  toasts: Toast[];
  /** Shows a transient message; returns the id in case it needs dismissing early. */
  show: (variant: ToastVariant, message: string) => string;
  success: (message: string) => string;
  error: (message: string) => string;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);
