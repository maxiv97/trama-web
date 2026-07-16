import { Component, computed, input } from '@angular/core';
import { GarmentStatus } from '../../../core/models/garment.model';

const STEPS = ['Cargada', 'En revisión', 'Acordada', 'En stock', 'Vendida', 'Liquidada'] as const;

const STEP_INDEX: Record<GarmentStatus, number> = {
  submitted: 0,
  under_review: 1,
  counteroffer: 1,
  no_agreement: 1,
  agreed: 2,
  rejected: 2,
  in_stock: 3,
  with_remarks: 3,
  sold: 4,
  paid_out: 5,
  cancelled: 1,
};

@Component({
  selector: 'app-progress-tracker',
  template: `
    <ol class="flex items-center">
      @for (step of steps; track step; let i = $index; let last = $last) {
        <li class="flex items-center" [class.flex-1]="!last">
          <div class="flex flex-col items-center">
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium"
              [class]="circleClass(i)"
              >{{ i + 1 }}</span
            >
            <span class="mt-1 whitespace-nowrap text-xs" [class]="labelClass(i)">{{ step }}</span>
          </div>
          @if (!last) {
            <span
              class="mx-2 h-0.5 flex-1"
              [class]="i < currentIndex() ? 'bg-trama-brand' : 'bg-trama-sand-200'"
            ></span>
          }
        </li>
      }
    </ol>
  `,
})
export class ProgressTracker {
  readonly currentStatus = input.required<GarmentStatus>();
  protected readonly steps = STEPS;
  protected readonly currentIndex = computed(() => STEP_INDEX[this.currentStatus()]);

  protected circleClass(i: number): string {
    const current = this.currentIndex();
    if (i < current) return 'bg-trama-brand text-white';
    if (i === current) return 'bg-trama-brand text-white ring-4 ring-trama-green-100';
    return 'bg-trama-sand-200 text-trama-dark/50';
  }

  protected labelClass(i: number): string {
    return i <= this.currentIndex() ? 'font-medium text-trama-dark' : 'text-trama-dark/40';
  }
}
