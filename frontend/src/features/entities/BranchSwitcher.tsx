import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon, LayersIcon } from '@/components/icons';
import { Spinner } from '@/components/ui';
import { useBranches, useEntities } from '@/hooks';
import { cx } from '@/utils/classNames';
import './EntitySwitcher.css';
import './BranchSwitcher.css';

export function BranchSwitcher() {
  const { selectedEntity } = useEntities();
  const { status, selectableBranches, selectedBranch, errorMessage, reload, select } = useBranches();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [close, isOpen]);

  if (!selectedEntity) return null;

  const triggerLabel = selectedBranch?.name
    ?? (status === 'loading' ? 'Loading…' : selectableBranches.length === 0 ? 'No branches' : 'Choose branch');

  const open = () => {
    setIsOpen(true);
    void reload();
  };

  return (
    <div className="entity-switcher branch-switcher" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={cx('entity-switcher__trigger', 'branch-switcher__trigger', !selectedBranch && 'entity-switcher__trigger--empty')}
        onClick={() => (isOpen ? close() : open())}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={selectedBranch ? `Active branch: ${selectedBranch.name}` : `Choose a branch for ${selectedEntity.name}`}
      >
        <span className="entity-switcher__badge branch-switcher__badge" aria-hidden="true">
          {selectedBranch?.code ? selectedBranch.code.slice(0, 4) : <LayersIcon size={15} />}
        </span>
        <span className="entity-switcher__label">
          <span className="entity-switcher__caption branch-switcher__caption">Branch</span>
          <span className="entity-switcher__name branch-switcher__name">{triggerLabel}</span>
        </span>
        <ChevronDownIcon size={15} className="entity-switcher__chevron" />
      </button>

      {isOpen && (
        <div className="entity-switcher__popover branch-switcher__popover" role="listbox" aria-label={`Branches for ${selectedEntity.name}`}>
          <div className="entity-switcher__list">
            {status === 'loading' && <p className="entity-switcher__message"><Spinner size="sm" /> Loading branches…</p>}
            {status === 'error' && <p className="entity-switcher__message entity-switcher__message--error">{errorMessage ?? 'Unable to load branches.'}</p>}
            {status === 'ready' && selectableBranches.length === 0 && <p className="entity-switcher__message">No active branches configured for this client.</p>}
            {selectableBranches.map((branch) => {
              const isActive = branch.id === selectedBranch?.id;
              return (
                <button
                  key={branch.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={cx('entity-switcher__option', 'branch-switcher__option', isActive && 'entity-switcher__option--active')}
                  onClick={() => {
                    select(branch.id);
                    close();
                  }}
                >
                  <span className="entity-switcher__check" aria-hidden="true">{isActive && <CheckIcon size={15} />}</span>
                  <span className="entity-switcher__option-text">
                    <span className="entity-switcher__option-name">{branch.name}</span>
                    {branch.primaryBranch && <span className="branch-switcher__primary">Primary</span>}
                    {branch.code && <span className="entity-switcher__option-code">{branch.code}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="entity-switcher__message branch-switcher__footer">Branches for {selectedEntity.name}</p>
        </div>
      )}
    </div>
  );
}
