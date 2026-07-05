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

export interface MonthlyPayoutLine {
  garmentId: string;
  garmentName: string;
  soldAt: Date;
  consignorAmount: number;
  paid: boolean;
}

export interface MonthlyPayout {
  key: string;
  month: string;
  counterpartId: string;
  counterpartName: string;
  counterpartDni?: string;
  lines: MonthlyPayoutLine[];
  unpaidGarmentIds: string[];
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: PayoutStatus;
  dueDate: Date;
  paidAt?: Date;
}
