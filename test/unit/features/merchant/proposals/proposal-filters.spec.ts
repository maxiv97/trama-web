import { describe, expect, it } from 'vitest';
import {
  ALL,
  EMPTY_FILTERS,
  ProposalFilters,
  consignorOptions,
  filterProposalRows,
  parseStatusFilter,
  salesPointOptions,
} from '../../../../../src/app/features/merchant/proposals/proposal-filters';
import { ProposalRow } from '../../../../../src/app/features/merchant/proposals/proposal-rows';

function buildRow(overrides: Partial<ProposalRow> = {}): ProposalRow {
  return {
    garmentId: 'g1',
    proposalId: 'p1',
    name: 'Campera de jean',
    category: 'Camperas y abrigos',
    consignorId: 'c1',
    consignorName: 'Marcela Bazán',
    salesPointId: 'sp1',
    salesPointName: 'Local Güemes',
    status: 'under_review',
    consignorPrice: 6000,
    salePrice: 10000,
    createdAt: new Date('2026-10-01'),
    ...overrides,
  };
}

const rows: ProposalRow[] = [
  buildRow({ garmentId: 'g1' }),
  buildRow({
    garmentId: 'g2',
    name: 'Vestido de fiesta',
    status: 'counteroffer',
    consignorId: 'c2',
    consignorName: 'Ana Ríos',
  }),
  buildRow({
    garmentId: 'g3',
    name: 'Pantalón cargo',
    status: 'no_agreement',
    salesPointId: 'sp2',
    salesPointName: 'Local Centro',
  }),
  buildRow({ garmentId: 'g4', name: 'Saco de lino', status: 'cancelled', salesPointId: undefined }),
];

function idsWith(filters: Partial<ProposalFilters>): string[] {
  return filterProposalRows(rows, { ...EMPTY_FILTERS, ...filters }).map((row) => row.garmentId);
}

describe('filterProposalRows', () => {
  it('sin filtros devuelve todas las filas', () => {
    expect(idsWith({})).toEqual(['g1', 'g2', 'g3', 'g4']);
  });

  it('filtra por estado', () => {
    expect(idsWith({ status: 'counteroffer' })).toEqual(['g2']);
  });

  it('filtra por cedente', () => {
    expect(idsWith({ consignorId: 'c2' })).toEqual(['g2']);
  });

  it('filtra por punto de venta y deja afuera las prendas sin punto', () => {
    expect(idsWith({ salesPointId: 'sp1' })).toEqual(['g1', 'g2']);
  });

  it('busca por nombre sin distinguir mayúsculas ni tildes', () => {
    expect(idsWith({ search: 'PANTALON' })).toEqual(['g3']);
    expect(idsWith({ search: '  vestido ' })).toEqual(['g2']);
  });

  it('combina todos los filtros', () => {
    expect(idsWith({ status: 'under_review', consignorId: 'c1', search: 'campera' })).toEqual([
      'g1',
    ]);
    expect(idsWith({ status: 'under_review', consignorId: 'c2' })).toEqual([]);
  });
});

describe('parseStatusFilter', () => {
  it('acepta los estados de propuesta', () => {
    expect(parseStatusFilter('under_review')).toBe('under_review');
    expect(parseStatusFilter('cancelled')).toBe('cancelled');
  });

  it('ignora valores ausentes o que no son de propuesta', () => {
    expect(parseStatusFilter(null)).toBe(ALL);
    expect(parseStatusFilter('sold')).toBe(ALL);
    expect(parseStatusFilter('cualquier-cosa')).toBe(ALL);
  });
});

describe('opciones de los selectores', () => {
  it('lista cada cedente una sola vez, en orden alfabético', () => {
    expect(consignorOptions(rows)).toEqual([
      { id: 'c2', name: 'Ana Ríos' },
      { id: 'c1', name: 'Marcela Bazán' },
    ]);
  });

  it('lista los puntos de venta usados, sin las prendas que no tienen punto', () => {
    expect(salesPointOptions(rows)).toEqual([
      { id: 'sp2', name: 'Local Centro' },
      { id: 'sp1', name: 'Local Güemes' },
    ]);
  });
});
