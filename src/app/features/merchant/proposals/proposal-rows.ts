import { Garment, GarmentStatus } from '../../../core/models/garment.model';
import { Proposal } from '../../../core/models/proposal.model';

export const PROPOSAL_STATUSES: readonly GarmentStatus[] = [
  'under_review',
  'counteroffer',
  'no_agreement',
  'cancelled',
];

export const MISSING_LABEL = '—';

export interface ProposalRow {
  garmentId: string;
  proposalId?: string;
  name: string;
  photo?: string;
  category: string;
  consignorId: string;
  consignorName: string;
  salesPointId?: string;
  salesPointName: string;
  status: GarmentStatus;
  consignorPrice?: number;
  salePrice?: number;
  createdAt: Date;
}

export function isProposalStage(status: GarmentStatus): boolean {
  return PROPOSAL_STATUSES.includes(status);
}

function currentPrices(
  garment: Garment,
  proposal: Proposal | undefined,
): Pick<ProposalRow, 'consignorPrice' | 'salePrice'> {
  const counteroffer = garment.status === 'counteroffer' ? proposal?.counteroffer : undefined;
  if (counteroffer) {
    return { consignorPrice: counteroffer.consignorPrice, salePrice: counteroffer.salePrice };
  }
  return {
    consignorPrice: proposal?.requestedConsignorPrice,
    salePrice: proposal?.calculatedSalePrice,
  };
}

function toProposalRow(
  garment: Garment,
  proposal: Proposal | undefined,
  consignorNames: Map<string, string>,
  salesPointNames: Map<string, string>,
): ProposalRow {
  const salesPointName = garment.salesPointId
    ? salesPointNames.get(garment.salesPointId)
    : undefined;

  return {
    garmentId: garment.id,
    proposalId: proposal?.id,
    name: garment.name,
    photo: garment.photos[0],
    category: garment.category,
    consignorId: garment.consignorId,
    consignorName: consignorNames.get(garment.consignorId) ?? MISSING_LABEL,
    salesPointId: garment.salesPointId,
    salesPointName: salesPointName ?? MISSING_LABEL,
    status: garment.status,
    ...currentPrices(garment, proposal),
    createdAt: proposal?.createdAt ?? garment.createdAt,
  };
}

export function buildProposalRows(
  garments: Garment[],
  proposalsByGarment: Map<string, Proposal>,
  consignorNames: Map<string, string>,
  salesPointNames: Map<string, string>,
): ProposalRow[] {
  return garments
    .filter((garment) => isProposalStage(garment.status))
    .map((garment) =>
      toProposalRow(garment, proposalsByGarment.get(garment.id), consignorNames, salesPointNames),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function proposalLink(row: ProposalRow): string[] {
  if (row.status === 'under_review' && row.proposalId) {
    return ['/m/proposal', row.proposalId];
  }
  return ['/m/garment', row.garmentId];
}
