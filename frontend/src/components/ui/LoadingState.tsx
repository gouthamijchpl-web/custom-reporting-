import { Spinner } from './Spinner';
import './LoadingState.css';

interface LoadingStateProps {
  message?: string;
  /** Fills the available height, for full-page and full-panel loads. */
  fillHeight?: boolean;
}

/** Standard "content is loading" placeholder used by pages and panels. */
export function LoadingState({ message = 'Loading…', fillHeight = false }: LoadingStateProps) {
  return (
    <div className={fillHeight ? 'loading-state loading-state--fill' : 'loading-state'}>
      <Spinner size="lg" label={message} />
      <p className="loading-state__message">{message}</p>
    </div>
  );
}
