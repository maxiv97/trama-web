import { Proposal } from '../models/proposal.model';

export const PROPOSALS: Proposal[] = [
  {
    id: 'prop-1',
    garmentId: 'gar-1',
    requestedConsignorPrice: 6000,
    calculatedSalePrice: 20000,
    status: 'under_review',
    createdAt: new Date('2026-06-20'),
  },
];
