import { useContext } from 'react';
import { EntityContext, type EntityContextValue } from '@/context/entityContext';

/** Access to the account's entities and the active selection. */
export function useEntities(): EntityContextValue {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error('useEntities must be used within an EntityProvider.');
  }
  return context;
}
