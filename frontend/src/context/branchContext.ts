import { createContext } from 'react';
import type { EntityBranch } from '@/types';

export type BranchStatus = 'loading' | 'ready' | 'error';

export interface BranchContextValue {
  status: BranchStatus;
  branches: EntityBranch[];
  selectableBranches: EntityBranch[];
  selectedBranch: EntityBranch | null;
  errorMessage: string | null;
  reload: () => Promise<void>;
  select: (branchId: string) => void;
}

export const BranchContext = createContext<BranchContextValue | undefined>(undefined);
