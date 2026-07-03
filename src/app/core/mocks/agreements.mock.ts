import { Agreement } from '../models/agreement.model';

export const AGREEMENTS: Agreement[] = [
  {
    garmentId: 'gar-2',
    agreedConsignorPrice: 3000,
    agreedSalePrice: 10000,
    appliedCommission: 70,
    agreedAt: new Date('2026-05-12'),
    saleDeadline: new Date('2026-08-12'),
  },
  {
    garmentId: 'gar-3',
    agreedConsignorPrice: 4500,
    agreedSalePrice: 15000,
    appliedCommission: 70,
    agreedAt: new Date('2026-04-17'),
    saleDeadline: new Date('2026-07-17'),
  },
];
