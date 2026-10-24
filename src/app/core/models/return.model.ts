// Devolución: el comercio entrega al cedente una prenda que no se vendió.
export interface GarmentReturn {
  id: string;
  garmentId: string;
  merchantId: string;
  consignorId: string;
  salesPointId?: string;
  returnedAt: Date;
  identityChecked: boolean;
  notes?: string;
  receiptNumber: string;
  handledBy: string;
}
