import { GarmentCondition, UnclaimedDisposition } from './garment.model';

export const CONDITION_LABELS: Record<GarmentCondition, string> = {
  new: 'Nuevo',
  very_good: 'Muy bueno',
  good: 'Bueno',
  fair: 'Regular',
};

export const DISPOSITION_LABELS: Record<UnclaimedDisposition, string> = {
  donated: 'Donada',
  kept: 'Quedó para el comercio',
  other: 'Otro destino',
};
