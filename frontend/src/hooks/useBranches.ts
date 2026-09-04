import { useContext } from 'react';
import { BranchContext, type BranchContextValue } from '@/context/branchContext';

export function useBranches(): BranchContextValue {
  const context = useContext(BranchContext);
  if (!context) throw new Error('useBranches must be used within a BranchProvider.');
  return context;
}
