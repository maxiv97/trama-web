export type PayoutStatus = 'pending' | 'paid' | 'overdue';

export interface Payout {
  id: string;
  consignorId: string;
  merchantId: string;
  month: string;
  saleIds: string[];
  totalAmount: number;
  status: PayoutStatus;
  dueDate: Date;
  paidAt?: Date;
  paymentMethod?: string;
  receiptNumber?: string;
}
