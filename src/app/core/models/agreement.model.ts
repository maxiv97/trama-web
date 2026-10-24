export interface Agreement {
  garmentId: string;
  agreedConsignorPrice: number;
  agreedSalePrice: number;
  appliedCommission: number;
  agreedAt: Date;
  // Provisoria hasta la recepción, que la recalcula desde la fecha en que se recibió la prenda.
  saleDeadline: Date;
  // Plazos congelados al acordar (los acuerdos anteriores al 23/10/2026 pueden no tenerlos).
  saleWindowMonths?: number;
  deliveryDays?: number;
  deliveryDeadline?: Date;
  pickupDays?: number;
  pickupDeadline?: Date;
}
