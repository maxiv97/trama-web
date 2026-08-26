export interface GarmentCategory {
  label: string;
  subcategories: string[];
}

export const CATEGORIES: GarmentCategory[] = [
  { label: 'Camperas y abrigos', subcategories: ['Campera', 'Tapado', 'Sobretodo', 'Piloto'] },
  { label: 'Vestidos', subcategories: ['Casual', 'De fiesta', 'Largo'] },
  { label: 'Pantalones', subcategories: ['Jean', 'De vestir', 'Jogging'] },
  { label: 'Remeras y tops', subcategories: ['Remera', 'Top', 'Musculosa'] },
  { label: 'Camisas y blusas', subcategories: ['Camisa', 'Blusa'] },
  { label: 'Calzado', subcategories: ['Zapatillas', 'Botas', 'Sandalias', 'Zapatos'] },
  { label: 'Accesorios', subcategories: ['Cartera', 'Cinturón', 'Bufanda', 'Gorro'] },
];

export const SEASONS: string[] = ['Verano', 'Invierno', 'Otoño', 'Primavera', 'Todo el año'];
