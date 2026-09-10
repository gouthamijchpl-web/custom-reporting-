import { Button } from '@/components/ui';
import { DownloadIcon } from '@/components/icons';
import type { CellObject, SheetData } from 'write-excel-file/browser';
import './TableDownloadButton.css';

interface TableDownloadButtonProps {
  tableId: string;
  fileName: string;
}

function cellText(cell: HTMLTableCellElement): string {
  const clone = cell.cloneNode(true) as HTMLTableCellElement;
  clone.querySelectorAll('[aria-hidden="true"], [data-csv-exclude], .sr-only').forEach((element) => element.remove());
  clone.querySelectorAll('strong, span').forEach((element) => element.insertAdjacentText('afterend', ' '));
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function excelValue(cell: HTMLTableCellElement, value: string): CellObject {
  if (cell.tagName !== 'TD') return { value, type: String };
  const currency = value.match(/^(-)?₹\s*([\d,]+(?:\.\d+)?)$/);
  if (currency) {
    const amount = Number(currency[2].replace(/,/g, '')) * (currency[1] ? -1 : 1);
    return { value: amount, type: Number, format: '₹#,##,##0;[Red]-₹#,##,##0' };
  }
  const percentage = value.match(/^(-?[\d,]+(?:\.\d+)?)%$/);
  if (percentage) {
    return { value: Number(percentage[1].replace(/,/g, '')) / 100, type: Number, format: '0.00%;[Red]-0.00%' };
  }
  if (/^-?[\d,]+(?:\.\d+)?$/.test(value)) {
    return { value: Number(value.replace(/,/g, '')), type: Number, format: '#,##,##0.##;[Red]-#,##,##0.##' };
  }
  return { value, type: String };
}

function colorChannel(value: number): string {
  return Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0').toUpperCase();
}

function opaqueHex(red: number, green: number, blue: number, alpha = 1): string | undefined {
  if (alpha <= 0.001) return undefined;
  const composite = (channel: number) => channel * alpha + 255 * (1 - alpha);
  return `#${colorChannel(composite(red))}${colorChannel(composite(green))}${colorChannel(composite(blue))}`;
}

function excelColor(value: string): string | undefined {
  const normalized = value.trim();
  if (!normalized || normalized === 'transparent') return undefined;
  if (/^#[\dA-F]{6}$/i.test(normalized)) return normalized.toUpperCase();
  const components = normalized.match(/[\d.]+/g)?.map(Number) ?? [];
  if (normalized.startsWith('rgb') && components.length >= 3) {
    return opaqueHex(components[0], components[1], components[2], components[3] ?? 1);
  }
  if (normalized.startsWith('color(srgb') && components.length >= 3) {
    return opaqueHex(components[0] * 255, components[1] * 255, components[2] * 255, components[3] ?? 1);
  }
  return undefined;
}

function renderedBackground(cell: HTMLTableCellElement): string | undefined {
  let element: HTMLElement | null = cell;
  while (element && element.tagName !== 'TABLE') {
    const color = excelColor(getComputedStyle(element).backgroundColor);
    if (color) return color;
    element = element.parentElement;
  }
  return undefined;
}

function workbookData(table: HTMLTableElement): {
  data: SheetData;
  columns: Array<{ width: number }>;
  stickyRowsCount: number;
} {
  const widths: number[] = [];
  const data: SheetData = [...table.rows].map((row) => {
    const cells: SheetData[number] = [];
    const header = row.parentElement?.tagName === 'THEAD';
    const footer = row.parentElement?.tagName === 'TFOOT';
    const groupedHeader = header && [...row.cells].some((cell) => cell.colSpan > 1);
    let columnIndex = 0;
    for (const cell of row.cells) {
      const value = cellText(cell);
      const columnSpan = Math.max(1, cell.colSpan);
      const width = Math.ceil(value.length / columnSpan) + 2;
      for (let index = 0; index < columnSpan; index += 1) {
        widths[columnIndex + index] = Math.max(widths[columnIndex + index] ?? 0, width);
      }
      const renderedStyle = getComputedStyle(cell);
      const fallbackBackground = groupedHeader
        ? cell.cellIndex === 0 ? '#2563EB' : '#315FBD'
        : header ? '#EFF6FF' : footer ? '#EAF2FF' : undefined;
      const backgroundColor = renderedBackground(cell) ?? fallbackBackground;
      const textColor = excelColor(renderedStyle.color) ?? (groupedHeader ? '#FFFFFF' : header ? '#334155' : undefined);
      const borderColor = excelColor(renderedStyle.borderBottomColor) ?? '#D6E4F5';
      const renderedAlignment = ['left', 'center', 'right'].includes(renderedStyle.textAlign)
        ? renderedStyle.textAlign as 'left' | 'center' | 'right'
        : header ? 'center' : cell.cellIndex === 0 ? 'left' : 'right';
      const renderedWeight = Number.parseInt(renderedStyle.fontWeight, 10);
      const bold = renderedStyle.fontWeight === 'bold' || renderedWeight >= 600
        || header || footer || cell.tagName === 'TH';
      const cellData: CellObject = {
        ...excelValue(cell, value),
        ...(columnSpan > 1 ? { columnSpan } : {}),
        ...(bold ? { fontWeight: 'bold' as const } : {}),
        ...(backgroundColor ? { backgroundColor } : {}),
        ...(textColor ? { textColor } : {}),
        borderColor,
        borderStyle: 'thin',
        align: renderedAlignment,
        alignVertical: 'center',
        wrap: header,
      };
      cells.push(cellData);
      for (let index = 1; index < columnSpan; index += 1) cells.push(null);
      columnIndex += columnSpan;
    }
    return cells;
  });
  return {
    data,
    columns: widths.map((width, index) => ({ width: Math.min(40, Math.max(index === 0 ? 16 : 12, width)) })),
    stickyRowsCount: table.tHead?.rows.length ?? 0,
  };
}

export function TableDownloadButton({ tableId, fileName }: TableDownloadButtonProps) {
  const download = async () => {
    const table = document.getElementById(tableId);
    if (!(table instanceof HTMLTableElement)) return;
    const { data, columns, stickyRowsCount } = workbookData(table);
    const xlsxFileName = fileName.replace(/\.csv$/i, '').replace(/\.xlsx$/i, '');
    const { default: writeExcelFile } = await import('write-excel-file/browser');
    await writeExcelFile(data, {
      columns,
      showGridLines: true,
      ...(stickyRowsCount > 0 ? { stickyRowsCount } : {}),
    }).toFile(`${xlsxFileName}.xlsx`);
  };

  return <Button type="button" variant="secondary" size="sm" className="table-download-button" leadingIcon={<DownloadIcon size={16} />} onClick={() => { void download(); }}>Download Excel</Button>;
}
