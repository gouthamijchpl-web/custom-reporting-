import { WorkspaceIcon } from '@/components/icons';
import { ModulePlaceholder } from './ModulePlaceholder';

/**
 * Workspace — the default screen after signing in.
 *
 * Intentionally empty for this phase: no widgets, summaries, activity or data loading.
 * The layout scaffold is here so the module can be built out without touching routing,
 * navigation or the application shell.
 */
export function WorkspacePage() {
  return (
    <ModulePlaceholder
      title="Workspace"
      description="Your reporting workspace."
      icon={<WorkspaceIcon size={24} />}
      emptyTitle="Nothing here yet"
      emptyDescription="The workspace is ready and waiting. Its content will arrive in a future release."
    />
  );
}
