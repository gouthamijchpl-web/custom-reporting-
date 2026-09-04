import { createPortal } from 'react-dom';
import { AlertCircleIcon, CheckCircleIcon, CloseIcon, InfoCircleIcon } from '@/components/icons';
import type { Toast } from '@/context/toastContext';
import './ToastViewport.css';

const ICONS = {
  success: CheckCircleIcon,
  danger: AlertCircleIcon,
  info: InfoCircleIcon,
} as const;

interface ToastViewportProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

/**
 * Renders the stack of active notifications.
 *
 * Announced politely rather than assertively: these confirm something the user just did,
 * so interrupting whatever a screen reader is saying would be unhelpful.
 */
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) {
    return null;
  }

  return createPortal(
    <div className="toast-viewport" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const IconComponent = ICONS[toast.variant];
        return (
          <div key={toast.id} className={`toast toast--${toast.variant}`}>
            <span className="toast__icon">
              <IconComponent size={17} />
            </span>
            <p className="toast__message">{toast.message}</p>
            <button
              type="button"
              className="toast__dismiss"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <CloseIcon size={15} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
