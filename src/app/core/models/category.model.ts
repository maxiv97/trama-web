export interface Category {
  id: string;
  label: string;
  subcategories: string[];
  base: boolean;
  ownerMerchantId?: string;
  parentLabel?: string;
  active: boolean;
}

export interface CategoryInput {
  label: string;
  subcategories?: string[];
  parentLabel?: string;
}

export interface CategoryUpdate {
  label?: string;
  subcategories?: string[];
  parentLabel?: string;
}