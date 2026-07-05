export type PaymentMethod = 'cash' | 'transfer';

export interface Sale {
  id: string;
  garmentId: string;
  actualSalePrice: number;
  soldAt: Date;
  consignorAmount: number;
  merchantCommission: number;
  paidAt?: Date;
  paymentMethod?: PaymentMethod;
  receiptNumber?: string;
}
