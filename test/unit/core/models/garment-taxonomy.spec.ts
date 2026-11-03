import { describe, expect, it } from 'vitest';
import { CATEGORIES, SEASONS } from '../../../../src/app/core/models/garment-taxonomy';

const API_CATEGORY_LABELS_CHANGE_CASE = [
  'Camperas y abrigos',
  'Buzos y sweaters',
  'Sacos y blazers',
  'Remeras y tops',
  'Camisas y blusas',
  'Vestidos',
  'Monos y enteritos',
  'Pantalones',
  'Polleras y shorts',
  'Ropa deportiva',
  'Trajes de baño',
  'Calzado',
  'Bolsos y carteras',
  'Accesorios',
  'Bijouterie y joyas',
];

const ORIGINAL_LABELS_CHANGE_CASE = [
  'Camperas y abrigos',
  'Vestidos',
  'Pantalones',
  'Remeras y tops',
  'Camisas y blusas',
  'Calzado',
  'Accesorios',
];

const labels = CATEGORIES.map((category) => category.label);

describe('taxonomía de prendas', () => {
  it('tiene las mismas categorías que valida la API', () => {
    expect(labels).toEqual(API_CATEGORY_LABELS_CHANGE_CASE);
  });

  it('conserva las categorías originales sin renombrar', () => {
    for (const original of ORIGINAL_LABELS_CHANGE_CASE) {
      expect(labels).toContain(original);
    }
  });

  it('no repite categorías', () => {
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('cada categoría tiene al menos una subcategoría y ninguna repetida', () => {
    for (const { label, subcategories } of CATEGORIES) {
      expect(subcategories.length, label).toBeGreaterThan(0);
      expect(new Set(subcategories).size, label).toBe(subcategories.length);
    }
  });

  it('no tiene subcategorías vacías ni con espacios sobrantes', () => {
    for (const { subcategories } of CATEGORIES) {
      for (const sub of subcategories) {
        expect(sub.trim()).toBe(sub);
        expect(sub.length).toBeGreaterThan(0);
      }
    }
  });

  it('mantiene las temporadas disponibles', () => {
    expect(SEASONS).toEqual(['Verano', 'Invierno', 'Otoño', 'Primavera', 'Todo el año']);
  });
});
