import { Sale } from '../models/sale.model';

export const SALES: Sale[] = [
  {
    id: 'sale-3',
    garmentId: 'gar-3',
    actualSalePrice: 15000,
    soldAt: new Date('2026-06-28'),
    consignorAmount: 4500,
    merchantCommission: 10500,
  },
  {
    id: 'sale-7',
    garmentId: 'gar-7',
    actualSalePrice: 20000,
    soldAt: new Date('2026-05-10'),
    consignorAmount: 6000,
    merchantCommission: 14000,
    paidAt: new Date('2026-06-18'),
    paymentMethod: 'transfer',
    receiptNumber: 'TR-0518',
  },
  {
    id: 'sale-8',
    garmentId: 'gar-8',
    actualSalePrice: 12000,
    soldAt: new Date('2026-05-22'),
    consignorAmount: 3500,
    merchantCommission: 8500,
  },
  {
    id: 'sale-9',
    garmentId: 'gar-9',
    actualSalePrice: 16000,
    soldAt: new Date('2026-06-12'),
    consignorAmount: 5000,
    merchantCommission: 11000,
  },
];
