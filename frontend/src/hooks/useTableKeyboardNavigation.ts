import { useEffect } from 'react';

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
const EDITING_CONTROL_SELECTOR = [
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="textbox"]',
].join(', ');
const INTERACTIVE_CONTROL_SELECTOR = [
  'a',
  'button',
  EDITING_CONTROL_SELECTOR,
  '[role="button"]',
  '[role="checkbox"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="switch"]',
].join(', ');

type TableGrid = Array<Array<HTMLTableCellElement | undefined>>;
type TableSelection = {
  cells: HTMLTableCellElement[];
  rows: HTMLTableCellElement[][];
};

function buildTableGrid(table: HTMLTableElement): TableGrid {
  const grid: TableGrid = [];

  Array.from(table.rows).forEach((row, rowIndex) => {
    grid[rowIndex] ??= [];
    let columnIndex = 0;

    Array.from(row.cells).forEach((cell) => {
      while (grid[rowIndex][columnIndex]) columnIndex += 1;

      const rowSpan = Math.max(1, cell.rowSpan);
      const columnSpan = Math.max(1, cell.colSpan);
      for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
        const targetRowIndex = rowIndex + rowOffset;
        grid[targetRowIndex] ??= [];
        for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
          grid[targetRowIndex][columnIndex + columnOffset] = cell;
        }
      }

      columnIndex += columnSpan;
    });
  });

  return grid;
}

function uniqueCells(cells: Array<HTMLTableCellElement | undefined>): HTMLTableCellElement[] {
  return [...new Set(cells.filter((cell): cell is HTMLTableCellElement => Boolean(cell)))];
}

function getTableSelection(table: HTMLTableElement, anchor: HTMLTableCellElement): TableSelection {
  if (anchor.closest('thead')) {
    const grid = buildTableGrid(table);
    const anchorRow = anchor.parentElement;
    if (!(anchorRow instanceof HTMLTableRowElement)) return { cells: [anchor], rows: [[anchor]] };

    const selectedColumns = grid[anchorRow.rowIndex]
      ?.map((cell, index) => cell === anchor ? index : -1)
      .filter((index) => index >= 0) ?? [];
    const rows = grid
      .map((row, rowIndex) => rowIndex < anchorRow.rowIndex
        ? []
        : uniqueCells(selectedColumns.map((columnIndex) => row?.[columnIndex])))
      .filter((row) => row.length > 0);
    return { cells: uniqueCells(rows.flat()), rows };
  }

  if (anchor.matches('th')) {
    const row = anchor.parentElement;
    const cells = row instanceof HTMLTableRowElement ? Array.from(row.cells) : [anchor];
    return { cells, rows: [cells] };
  }

  return { cells: [anchor], rows: [[anchor]] };
}

function clearTableSelection(): void {
  document.querySelectorAll<HTMLElement>('[data-table-keyboard-selected], [data-table-keyboard-copied]')
    .forEach((element) => {
      delete element.dataset.tableKeyboardSelected;
      delete element.dataset.tableKeyboardCopied;
    });
}

function selectTableCell(cell: HTMLTableCellElement): void {
  const table = cell.closest<HTMLTableElement>('table');
  if (!table) return;

  clearTableSelection();
  getTableSelection(table, cell).cells.forEach((selectedCell) => {
    selectedCell.dataset.tableKeyboardSelected = 'true';
  });
}

function cellText(cell: HTMLTableCellElement): string {
  return cell.innerText.replace(/\s+/g, ' ').trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function findAdjacentCell(
  table: HTMLTableElement,
  currentCell: HTMLTableCellElement,
  direction: string,
): HTMLTableCellElement | undefined {
  const currentRow = currentCell.parentElement;
  if (!(currentRow instanceof HTMLTableRowElement)) return undefined;

  const grid = buildTableGrid(table);
  const currentRowIndex = currentRow.rowIndex;
  const occupiedColumns = grid[currentRowIndex]
    ?.map((cell, index) => cell === currentCell ? index : -1)
    .filter((index) => index >= 0) ?? [];
  if (occupiedColumns.length === 0) return undefined;

  const firstColumn = occupiedColumns[0];
  const lastColumn = occupiedColumns[occupiedColumns.length - 1];
  if (direction === 'ArrowLeft') return grid[currentRowIndex]?.[firstColumn - 1];
  if (direction === 'ArrowRight') return grid[currentRowIndex]?.[lastColumn + 1];

  const rowStep = direction === 'ArrowDown' ? 1 : -1;
  let targetRowIndex = currentRowIndex + rowStep;
  while (targetRowIndex >= 0 && targetRowIndex < grid.length) {
    const candidate = grid[targetRowIndex]?.[firstColumn];
    if (candidate && candidate !== currentCell) return candidate;
    targetRowIndex += rowStep;
  }
  return undefined;
}

function findScrollContainer(element: HTMLElement, axis: 'horizontal' | 'vertical'): HTMLElement | null {
  let parent = element.parentElement;
  while (parent) {
    const styles = window.getComputedStyle(parent);
    const overflow = axis === 'horizontal' ? styles.overflowX : styles.overflowY;
    const hasScrollableOverflow = /auto|scroll|overlay/.test(overflow);
    const hasOverflow = axis === 'horizontal'
      ? parent.scrollWidth > parent.clientWidth
      : parent.scrollHeight > parent.clientHeight;
    if (hasScrollableOverflow && hasOverflow) return parent;
    parent = parent.parentElement;
  }
  return null;
}

function scrollTableCellIntoView(cell: HTMLTableCellElement): void {
  const horizontalContainer = findScrollContainer(cell, 'horizontal');
  if (horizontalContainer) {
    const containerRect = horizontalContainer.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    let visibleLeft = containerRect.left;

    if (window.getComputedStyle(cell).position !== 'sticky') {
      const row = cell.parentElement;
      if (row instanceof HTMLTableRowElement) {
        Array.from(row.cells).slice(0, cell.cellIndex).forEach((precedingCell) => {
          if (window.getComputedStyle(precedingCell).position === 'sticky') {
            visibleLeft = Math.max(visibleLeft, precedingCell.getBoundingClientRect().right);
          }
        });
      }
    }

    if (cellRect.left < visibleLeft) {
      horizontalContainer.scrollLeft -= visibleLeft - cellRect.left;
    } else if (cellRect.right > containerRect.right) {
      horizontalContainer.scrollLeft += cellRect.right - containerRect.right;
    }
  }

  const verticalContainer = findScrollContainer(cell, 'vertical');
  if (verticalContainer) {
    const containerRect = verticalContainer.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    let visibleTop = containerRect.top;
    let visibleBottom = containerRect.bottom;
    const table = cell.closest('table');

    if (window.getComputedStyle(cell).position !== 'sticky' && table) {
      table.tHead?.querySelectorAll<HTMLTableCellElement>('th, td').forEach((headerCell) => {
        if (window.getComputedStyle(headerCell).position === 'sticky') {
          visibleTop = Math.max(visibleTop, headerCell.getBoundingClientRect().bottom);
        }
      });
      table.tFoot?.querySelectorAll<HTMLTableCellElement>('th, td').forEach((footerCell) => {
        if (window.getComputedStyle(footerCell).position === 'sticky') {
          visibleBottom = Math.min(visibleBottom, footerCell.getBoundingClientRect().top);
        }
      });
    }

    if (cellRect.top < visibleTop) {
      verticalContainer.scrollTop -= visibleTop - cellRect.top;
    } else if (cellRect.bottom > visibleBottom) {
      verticalContainer.scrollTop += cellRect.bottom - visibleBottom;
    }
  }
}

function focusTableCell(cell: HTMLTableCellElement): void {
  const sortableHeaderButton = cell.matches('th')
    ? cell.querySelector<HTMLButtonElement>(':scope > .category-sales-table__sort, :scope > .table-sort')
    : null;
  const focusTarget = sortableHeaderButton ?? cell;
  if (focusTarget === cell) cell.tabIndex = -1;
  focusTarget.focus({ preventScroll: true });
  scrollTableCellIntoView(cell);
}

/** Enables spreadsheet-style arrow-key movement for every native table in the app. */
export function useTableKeyboardNavigation(): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented
        || !ARROW_KEYS.has(event.key)
        || event.altKey
        || event.ctrlKey
        || event.metaKey
        || event.shiftKey
      ) return;

      const eventTarget = event.target;
      if (!(eventTarget instanceof Element) || eventTarget.closest(EDITING_CONTROL_SELECTOR)) return;

      const currentCell = eventTarget.closest<HTMLTableCellElement>('th, td');
      const table = currentCell?.closest<HTMLTableElement>('table');
      if (!currentCell || !table) return;

      const nextCell = findAdjacentCell(table, currentCell, event.key);
      if (!nextCell) return;

      event.preventDefault();
      focusTableCell(nextCell);
    };

    const handleClick = (event: MouseEvent) => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Element)) return;

      const cell = eventTarget.closest<HTMLTableCellElement>('th, td');
      if (!cell || !cell.closest('table')) {
        clearTableSelection();
        return;
      }
      if (eventTarget.closest(INTERACTIVE_CONTROL_SELECTOR)) return;
      focusTableCell(cell);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Element)) return;
      const cell = eventTarget.closest<HTMLTableCellElement>('th, td');
      if (cell?.closest('table')) selectTableCell(cell);
    };

    const handleCopy = (event: ClipboardEvent) => {
      const eventTarget = event.target;
      if (eventTarget instanceof Element && eventTarget.closest(EDITING_CONTROL_SELECTOR)) return;
      const textSelection = window.getSelection();
      if (textSelection && !textSelection.isCollapsed && textSelection.toString()) return;

      const activeElement = document.activeElement;
      const cell = activeElement instanceof Element
        ? activeElement.closest<HTMLTableCellElement>('th, td')
        : null;
      const table = cell?.closest<HTMLTableElement>('table');
      if (!cell || !table || !event.clipboardData) return;

      const selection = getTableSelection(table, cell);
      const values = selection.rows.map((row) => row.map(cellText));
      const plainText = values.map((row) => row.join('\t')).join('\r\n');
      const html = `<table><tbody>${values.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

      event.preventDefault();
      event.clipboardData.setData('text/plain', plainText);
      event.clipboardData.setData('text/html', html);
      selection.cells.forEach((copiedCell) => {
        copiedCell.dataset.tableKeyboardCopied = 'true';
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('copy', handleCopy);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('copy', handleCopy);
    };
  }, []);
}
