import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BuildingIcon,
  CheckIcon,
  ChevronDownIcon,
  SearchIcon,
} from '@/components/icons';
import { Spinner } from '@/components/ui';
import { useEntities } from '@/hooks';
import { cx } from '@/utils/classNames';
import type { ReportingEntity } from '@/types';
import './EntitySwitcher.css';

/**
 * The entity box in the application header.
 *
 * Shows which entity is active and opens a popover to search, switch, edit or add one.
 * Built as a popover rather than a native select because it carries a search field and
 * per-row actions, which a select cannot hold.
 *
 * Selection is written to the server, so it follows the user to their next session and to
 * any other device.
 */
export function EntitySwitcher() {
  const { status, selectableEntities, selectedEntity, errorMessage, select, reload } = useEntities();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  // Close on Escape or on a click outside; the popover is not modal, so the rest of the
  // page stays usable while it is open.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        close();
      }
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

  const openPopover = useCallback(() => {
    setIsOpen(true);
    // Focus the search field so typing filters immediately.
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length === 0) {
      return selectableEntities;
    }
    return selectableEntities.filter(
      (entity) =>
        entity.name.toLowerCase().includes(term) || (entity.code ?? '').toLowerCase().includes(term),
    );
  }, [query, selectableEntities]);

  const handleSelect = useCallback(
    (entity: ReportingEntity) => {
      if (entity.id === selectedEntity?.id) {
        close();
        return;
      }
      setPendingId(entity.id);
      void select(entity.id)
        .catch(() => void reload())
        .finally(() => {
          setPendingId(null);
          close();
        });
    },
    [close, reload, select, selectedEntity],
  );

  const triggerLabel = selectedEntity?.name ?? (status === 'loading' ? 'Loading…' : 'No entity selected');

  return (
    <>
      <div className="entity-switcher" ref={containerRef}>
        <button
          ref={triggerRef}
          type="button"
          className={cx('entity-switcher__trigger', !selectedEntity && 'entity-switcher__trigger--empty')}
          onClick={() => (isOpen ? close() : openPopover())}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          title={selectedEntity ? `Active entity: ${selectedEntity.name}` : 'Choose an entity'}
        >
          <span className="entity-switcher__badge" aria-hidden="true">
            {selectedEntity?.code ? selectedEntity.code.slice(0, 4) : <BuildingIcon size={15} />}
          </span>

          <span className="entity-switcher__label">
            <span className="entity-switcher__caption">Entity</span>
            <span className="entity-switcher__name">{triggerLabel}</span>
          </span>

          <ChevronDownIcon size={15} className="entity-switcher__chevron" />
        </button>

        {isOpen && (
          <div className="entity-switcher__popover" role="dialog" aria-label="Choose an entity">
            <div className="entity-switcher__search">
              <SearchIcon size={15} className="entity-switcher__search-icon" />
              <input
                ref={searchRef}
                type="search"
                autoComplete="off"
                className="entity-switcher__search-input"
                placeholder="Search entities…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search entities"
              />
            </div>

            <div className="entity-switcher__list" role="list">
              {status === 'loading' && (
                <p className="entity-switcher__message">
                  <Spinner size="sm" /> Loading entities…
                </p>
              )}

              {status === 'error' && (
                <p className="entity-switcher__message entity-switcher__message--error">
                  {errorMessage ?? 'Unable to load your entities.'}
                </p>
              )}

              {status === 'ready' && selectableEntities.length === 0 && (
                <p className="entity-switcher__message">
                  No entities yet. Add one to get started.
                </p>
              )}

              {status === 'ready' && selectableEntities.length > 0 && matches.length === 0 && (
                <p className="entity-switcher__message">No entities match “{query.trim()}”.</p>
              )}

              {matches.map((entity) => {
                const isActive = entity.id === selectedEntity?.id;
                return (
                  <div className="entity-switcher__row" role="listitem" key={entity.id}>
                    <button
                      type="button"
                      className={cx('entity-switcher__option', isActive && 'entity-switcher__option--active')}
                      onClick={() => handleSelect(entity)}
                      disabled={pendingId !== null}
                      aria-current={isActive}
                    >
                      <span className="entity-switcher__check" aria-hidden="true">
                        {pendingId === entity.id ? (
                          <Spinner size="sm" />
                        ) : (
                          isActive && <CheckIcon size={15} />
                        )}
                      </span>

                      <span className="entity-switcher__option-text">
                        <span className="entity-switcher__option-name">{entity.name}</span>
                        {entity.code && <span className="entity-switcher__option-code">{entity.code}</span>}
                      </span>
                    </button>

                  </div>
                );
              })}
            </div>

            <p className="entity-switcher__message">Manage entities from Settings → Entities.</p>
          </div>
        )}
      </div>

    </>
  );
}
