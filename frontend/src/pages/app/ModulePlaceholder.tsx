import type { ReactNode } from 'react';
import { EmptyState, PageHeader } from '@/components/ui';
import './ModulePlaceholder.css';

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
}

/**
 * Page scaffold for modules that are intentionally empty in this phase.
 *
 * It provides only the outer structure — page header and a centred empty state — with no
 * widgets, data or API calls. Each module keeps its own page component so that filling it
 * in later is a local change: swap this scaffold for the real content and nothing else
 * about the route, layout or navigation has to move.
 */
export function ModulePlaceholder({
  title,
  description,
  icon,
  emptyTitle,
  emptyDescription,
}: ModulePlaceholderProps) {
  return (
    <div className="module-page">
      <PageHeader title={title} description={description} />

      <div className="module-page__body">
        <EmptyState fillHeight icon={icon} title={emptyTitle} description={emptyDescription} />
      </div>
    </div>
  );
}
