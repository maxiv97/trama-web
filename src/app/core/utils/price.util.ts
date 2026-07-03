export function calculateSalePrice(consignorPrice: number, consignorPercentage: number): number {
  return consignorPrice / (consignorPercentage / 100);
}

export function calculateConsignorAmount(
  actualSalePrice: number,
  consignorPercentage: number,
): number {
  return actualSalePrice * (consignorPercentage / 100);
}
