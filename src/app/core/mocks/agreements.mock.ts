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
  {
    garmentId: 'gar-5',
    agreedConsignorPrice: 4500,
    agreedSalePrice: 15000,
    appliedCommission: 70,
    agreedAt: new Date('2026-06-21'),
    saleDeadline: new Date('2026-09-21'),
  },
  {
    garmentId: 'gar-7',
    agreedConsignorPrice: 6000,
    agreedSalePrice: 20000,
    appliedCommission: 70,
    agreedAt: new Date('2026-04-10'),
    saleDeadline: new Date('2026-07-10'),
  },
  {
    garmentId: 'gar-8',
    agreedConsignorPrice: 3500,
    agreedSalePrice: 12000,
    appliedCommission: 70,
    agreedAt: new Date('2026-04-22'),
    saleDeadline: new Date('2026-07-22'),
  },
  {
    garmentId: 'gar-9',
    agreedConsignorPrice: 5000,
    agreedSalePrice: 16000,
    appliedCommission: 70,
    agreedAt: new Date('2026-05-20'),
    saleDeadline: new Date('2026-08-20'),
  },
];
