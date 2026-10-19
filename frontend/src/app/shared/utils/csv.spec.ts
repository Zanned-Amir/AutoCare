import { Page } from '@core/api/api';
import { CsvColumn, fetchAllPages, toCsv } from './csv';

interface Row {
  name: string;
  amount: string | null;
  active: boolean;
}

const columns: CsvColumn<Row>[] = [
  { label: 'Nom', value: (row) => row.name },
  { label: 'Montant', value: (row) => row.amount },
  { label: 'Actif', value: (row) => row.active },
];

describe('toCsv', () => {
  it('writes a BOM, semicolons and quotes only where needed', () => {
    const csv = toCsv(columns, [
      { name: 'Garage "Le Bardo"; Tunis', amount: '120.500', active: true },
      { name: 'Ali', amount: null, active: false },
    ]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual([
      'Nom;Montant;Actif',
      '"Garage ""Le Bardo""; Tunis";120.500;oui',
      'Ali;;non',
    ]);
  });

  it('neutralises spreadsheet formulas', () => {
    const csv = toCsv(columns, [{ name: '=HYPERLINK("x")', amount: '-1', active: true }]);
    expect(csv.split('\r\n')[1]).toBe(`"'=HYPERLINK(""x"")";'-1;oui`);
  });
});

describe('fetchAllPages', () => {
  it('reads every page then stops', async () => {
    const pages = [[1, 2], [3, 4], [5]];
    const calls: number[] = [];
    const rows = await fetchAllPages<number>(async (page, size) => {
      calls.push(page);
      return {
        content: pages[page] ?? [],
        page: { size, number: page, totalElements: 5, totalPages: 3 },
      } satisfies Page<number>;
    }, 2);
    expect(rows).toEqual([1, 2, 3, 4, 5]);
    expect(calls).toEqual([0, 1, 2]);
  });
});
