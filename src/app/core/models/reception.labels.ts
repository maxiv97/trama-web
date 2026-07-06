import { ReceptionDiscrepancy } from './reception.model';

export const DISCREPANCY_OPTIONS: readonly { value: ReceptionDiscrepancy; label: string }[] = [
  { value: 'condition', label: 'Condición inferior' },
  { value: 'damage', label: 'Daños no declarados' },
  { value: 'photo_mismatch', label: 'No coincide con fotos' },
  { value: 'measurements', label: 'Medidas distintas' },
  { value: 'accessories', label: 'Faltan accesorios/etiquetas' },
  { value: 'hygiene', label: 'Sin higienizar' },
];

export const DISCREPANCY_LABELS = Object.fromEntries(
  DISCREPANCY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ReceptionDiscrepancy, string>;
