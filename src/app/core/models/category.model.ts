export interface Category {
  id: string;
  label: string;
  subcategories: string[];
  base: boolean;
  ownerMerchantId?: string;
  parentLabel?: string;
  active: boolean;
}

export interface NewCategory {
  label: string;
  subcategories: string[];
  parentLabel?: string;
}
