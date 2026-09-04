import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, PageHeader } from '@/components/ui';
import { LayersIcon } from '@/components/icons';
import { DEFAULT_AUTHENTICATED_ROUTE } from '@/routes/paths';
import './ModulePlaceholder.css';

/** Shown for any authenticated URL that does not match a module. */
export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="module-page">
      <PageHeader title="Page not found" description="That page does not exist in this workspace." />

      <div className="module-page__body">
        <EmptyState
          fillHeight
          icon={<LayersIcon size={24} />}
          title="Nothing at this address"
          description="The link may be out of date, or the page may have moved."
          action={
            <Button onClick={() => navigate(DEFAULT_AUTHENTICATED_ROUTE)}>Back to workspace</Button>
          }
        />
      </div>
    </div>
  );
}
