export interface Sale {
  id: string;
  garmentId: string;
  actualSalePrice: number;
  soldAt: Date;
  consignorAmount: number;
  merchantCommission: number;
}
