import { GarmentStatus } from '../../../core/models/garment.model';
import { PROPOSAL_STATUSES, ProposalRow } from './proposal-rows';

export const ALL = 'all';

export type StatusFilter = GarmentStatus | typeof ALL;

export interface ProposalFilters {
  status: StatusFilter;
  consignorId: string;
  salesPointId: string;
  search: string;
}

export const EMPTY_FILTERS: ProposalFilters = {
  status: ALL,
  consignorId: ALL,
  salesPointId: ALL,
  search: '',
};

export interface FilterOption {
  id: string;
  name: string;
}

export function parseStatusFilter(value: string | null): StatusFilter {
  return PROPOSAL_STATUSES.find((status) => status === value) ?? ALL;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matches(selected: string, value: string | undefined): boolean {
  return selected === ALL || selected === value;
}

export function filterProposalRows(rows: ProposalRow[], filters: ProposalFilters): ProposalRow[] {
  const term = normalize(filters.search);

  return rows.filter(
    (row) =>
      matches(filters.status, row.status) &&
      matches(filters.consignorId, row.consignorId) &&
      matches(filters.salesPointId, row.salesPointId) &&
      (term === '' || normalize(row.name).includes(term)),
  );
}

function toOptions(options: FilterOption[]): FilterOption[] {
  const byId = new Map(options.map((option) => [option.id, option]));
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function consignorOptions(rows: ProposalRow[]): FilterOption[] {
  return toOptions(rows.map((row) => ({ id: row.consignorId, name: row.consignorName })));
}

export function salesPointOptions(rows: ProposalRow[]): FilterOption[] {
  return toOptions(
    rows.flatMap((row) =>
      row.salesPointId ? [{ id: row.salesPointId, name: row.salesPointName }] : [],
    ),
  );
}
