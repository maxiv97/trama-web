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
  {
    id: 'prop-2',
    garmentId: 'gar-4',
    requestedConsignorPrice: 9000,
    calculatedSalePrice: 30000,
    status: 'counteroffer',
    createdAt: new Date('2026-06-25'),
    counteroffer: {
      consignorPrice: 6000,
      salePrice: 20000,
      date: new Date('2026-06-27'),
    },
  },
  {
    id: 'prop-3',
    garmentId: 'gar-5',
    requestedConsignorPrice: 4500,
    calculatedSalePrice: 15000,
    status: 'agreed',
    createdAt: new Date('2026-06-18'),
  },
  {
    id: 'prop-4',
    garmentId: 'gar-6',
    requestedConsignorPrice: 7500,
    calculatedSalePrice: 25000,
    status: 'under_review',
    createdAt: new Date('2026-06-29'),
  },
];
