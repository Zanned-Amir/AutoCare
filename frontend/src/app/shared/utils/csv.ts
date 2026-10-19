import { Page } from '@core/api/api';

export interface CsvColumn<T> {
  label: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

/** Above this the export stops: the backoffice filters should narrow the list first. */
export const CSV_MAX_ROWS = 5000;

/** Pages through a list until the end (or CSV_MAX_ROWS). */
export async function fetchAllPages<T>(
  fetchPage: (page: number, size: number) => Promise<Page<T>>,
  size = 200,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; rows.length < CSV_MAX_ROWS; page++) {
    const result = await fetchPage(page, size);
    rows.push(...result.content);
    if (page + 1 >= result.page.totalPages) break;
  }
  return rows.slice(0, CSV_MAX_ROWS);
}

function cell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'boolean' ? (value ? 'oui' : 'non') : String(value);
  // Leading = + - @ would run as a formula in Excel.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Semicolon-separated with a BOM: what French Excel opens with accents intact. */
export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const lines = [columns.map((column) => cell(column.label)).join(';')];
  for (const row of rows) {
    lines.push(columns.map((column) => cell(column.value(row))).join(';'));
  }
  return '﻿' + lines.join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** "demandes-2026-10-20.csv" */
export function csvFilename(name: string): string {
  return `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
}
