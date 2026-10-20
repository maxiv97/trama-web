import { Garment, GarmentStatus } from '../../../core/models/garment.model';
import { Proposal } from '../../../core/models/proposal.model';

/**
 * Garment statuses listed on the merchant Proposals page: the negotiation stage, plus the proposals that
 * ended without agreement, so the merchant keeps the history (as Inventory does with sold items).
 * Only `under_review` waits for the merchant; `counteroffer` waits for the consignor.
 */
export const PROPOSAL_STATUSES: GarmentStatus[] = [
  'under_review',
  'counteroffer',
  'no_agreement',
  'cancelled',
];

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
  /** Amount for the consignor: what they asked for, or the merchant's counteroffer. */
  consignorPrice?: number;
  salePrice?: number;
  createdAt: Date;
}

/**
 * Joins each garment in a proposal stage with its proposal and display names.
 * Rows come newest first; when the garment is in `counteroffer`, the prices are the counteroffer's.
 */
export function buildProposalRows(
  garments: Garment[],
  proposalByGarment: Map<string, Proposal>,
  consignorName: Map<string, string>,
  salesPointName: Map<string, string>,
): ProposalRow[] {
  return garments
    .filter((garment) => PROPOSAL_STATUSES.includes(garment.status))
    .map((garment): ProposalRow => {
      const proposal = proposalByGarment.get(garment.id);
      const counter = garment.status === 'counteroffer' ? proposal?.counteroffer : undefined;
      return {
        garmentId: garment.id,
        proposalId: proposal?.id,
        name: garment.name,
        category: garment.category,
        consignorId: garment.consignorId,
        consignorName: consignorName.get(garment.consignorId) ?? '—',
        salesPointId: garment.salesPointId,
        salesPointName: garment.salesPointId
          ? (salesPointName.get(garment.salesPointId) ?? '—')
          : '—',
        status: garment.status,
        consignorPrice: counter?.consignorPrice ?? proposal?.requestedConsignorPrice,
        salePrice: counter?.salePrice ?? proposal?.calculatedSalePrice,
        createdAt: proposal?.createdAt ?? garment.createdAt,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
