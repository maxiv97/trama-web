// Resultado de los vencimientos de venta del comercio: de las prendas que terminaron la ventana
// sin venderse, cuántas retiró el cedente y cuántas no, y qué destino se les dio a las no retiradas.
export interface ExpiryOutcomes {
  expiredCount: number;
  awaitingPickupCount: number;
  returnedCount: number;
  unclaimedCount: number;
  pickupRate: number | null;
  donatedCount: number;
  keptCount: number;
  otherCount: number;
  unclaimedPendingCount: number;
}
