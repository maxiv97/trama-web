import { Component, computed, input } from '@angular/core';
import { GarmentStatus } from '../../../core/models/garment.model';
import { Seam } from '../seam/seam';

const STEPS = [
  'Cargada',
  'En revisión',
  'Acordada',
  'Recepcionada',
  'En stock',
  'Vendida',
  'Liquidada',
] as const;

const STEP_INDEX: Record<GarmentStatus, number> = {
  submitted: 0,
  under_review: 1,
  counteroffer: 1,
  no_agreement: 1,
  agreed: 2,
  rejected: 3,
  in_stock: 4,
  with_remarks: 4,
  sold: 5,
  paid_out: 6,
  cancelled: 1,
};

// Resultados negativos: el anillo del paso actual pasa a rojo.
const NEGATIVE: Partial<Record<GarmentStatus, boolean>> = {
  no_agreement: true,
  rejected: true,
};

/** Recorrido de la prenda (handoff §4.7): la costura de trazabilidad en 7 pasos. */
@Component({
  selector: 'app-progress-tracker',
  imports: [Seam],
  template: `
    <app-seam
      [steps]="steps"
      [current]="currentIndex()"
      [negative]="isNegative()"
      [radius]="22"
      [compactLabels]="true"
    />
  `,
})
export class ProgressTracker {
  readonly currentStatus = input.required<GarmentStatus>();
  protected readonly steps = STEPS;
  protected readonly currentIndex = computed(() => STEP_INDEX[this.currentStatus()]);
  protected readonly isNegative = computed(() => NEGATIVE[this.currentStatus()] ?? false);
}
