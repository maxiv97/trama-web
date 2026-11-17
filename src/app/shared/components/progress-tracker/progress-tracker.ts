import { Component, computed, input } from '@angular/core';
import { GarmentStatus } from '../../../core/models/garment.model';
import { Seam } from '../seam/seam';
import { SeamOutcome } from '../seam/seam-button';
import { SeamSummary } from '../seam/seam-summary';

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

// Estados donde termina la consignación
const OUTCOME: Partial<Record<GarmentStatus, SeamOutcome>> = {
  paid_out: 'complete',
  no_agreement: 'negative',
  rejected: 'negative',
  cancelled: 'negative',
};

@Component({
  selector: 'app-progress-tracker',
  imports: [Seam, SeamSummary],
  template: `
    <app-seam class="wide" [steps]="steps" [current]="current()" [outcome]="outcome()" />
    <app-seam-summary class="narrow" [steps]="steps" [current]="current()" [outcome]="outcome()" />
  `,
  styles: `
    :host {
      display: block;
      container-type: inline-size;
    }

    .narrow {
      display: none;
    }

    @container (width < 480px) {
      .wide {
        display: none;
      }

      .narrow {
        display: flex;
      }
    }
  `,
})
export class ProgressTracker {
  readonly currentStatus = input.required<GarmentStatus>();
  protected readonly steps = STEPS;
  protected readonly current = computed(() => STEP_INDEX[this.currentStatus()]);
  protected readonly outcome = computed(() => OUTCOME[this.currentStatus()] ?? 'open');
}
