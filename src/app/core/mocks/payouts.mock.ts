import { Payout } from '../models/payout.model';

export const PAYOUTS: Payout[] = [
  {
    id: 'pay-1',
    consignorId: 'con-luis',
    merchantId: 'mer-trama',
    month: '2026-06',
    saleIds: ['sale-3'],
    totalAmount: 4500,
    status: 'pending',
    dueDate: new Date('2026-07-20'),
  },
];
