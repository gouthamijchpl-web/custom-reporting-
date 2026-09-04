import { useCallback, useEffect, useId, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '@/components/icons';
import { cx } from '@/utils/classNames';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Action row rendered at the foot of the dialog. */
  footer?: ReactNode;
  onClose: () => void;
  /** Receives focus when the dialog opens; defaults to the first focusable element. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Hides the corner dismiss button for dialogs that must be answered by their actions. */
  hideCloseButton?: boolean;
}

/**
 * Accessible modal dialog.
 *
 * Owns the behaviour every dialog needs so no caller has to repeat it: close on Escape and
 * on a scrim click, move focus in on open and back to the trigger on close, keep Tab
 * inside while open, and stop the page behind it from scrolling.
 */
export function Modal({
  isOpen,
  title,
  description,
  children,
  footer,
  onClose,
  initialFocusRef,
  size = 'sm',
  hideCloseButton = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const focusableElements = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return [] as HTMLElement[];
    }
    return [
      ...dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]),' +
          ' textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ];
  }, []);

  const trapFocus = useCallback(
    (event: KeyboardEvent) => {
      const focusable = focusableElements();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [focusableElements],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    (initialFocusRef?.current ?? focusableElements()[0])?.focus();

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === 'Tab') {
        trapFocus(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [focusableElements, initialFocusRef, isOpen, trapFocus]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="modal__scrim" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className={cx('modal', `modal--${size}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <div className="modal__heading">
            <h2 className="modal__title" id={titleId}>
              {title}
            </h2>
            {description && (
              <p className="modal__description" id={descriptionId}>
                {description}
              </p>
            )}
          </div>

          {!hideCloseButton && (
            <button type="button" className="modal__close" onClick={onClose} aria-label="Close dialog">
              <CloseIcon size={17} />
            </button>
          )}
        </header>

        {children && <div className="modal__body">{children}</div>}
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
