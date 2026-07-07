import { Component, input } from '@angular/core';
import { DISCREPANCY_LABELS } from '../../../core/models/reception.labels';
import { Reception, ReceptionDiscrepancy } from '../../../core/models/reception.model';

@Component({
  selector: 'app-reception-remarks',
  template: `
    <div class="space-y-3">
      @if (reception().discrepancies.length) {
        <ul class="flex flex-wrap gap-2">
          @for (item of reception().discrepancies; track item) {
            <li
              class="rounded-full bg-white px-3 py-1 text-xs font-medium text-trama-dark/70 ring-1 ring-inset ring-trama-sand-200"
            >
              {{ discrepancyLabel(item) }}
            </li>
          }
        </ul>
      }
      @if (reception().detail) {
        <p class="text-sm text-trama-dark/70">{{ reception().detail }}</p>
      }
      @if (reception().evidence.length) {
        <div class="grid grid-cols-4 gap-2 sm:grid-cols-6">
          @for (photo of reception().evidence; track $index) {
            <div class="aspect-square overflow-hidden rounded-lg">
              <img [src]="photo" alt="" class="h-full w-full object-cover" />
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ReceptionRemarks {
  readonly reception = input.required<Reception>();

  protected discrepancyLabel(discrepancy: ReceptionDiscrepancy): string {
    return DISCREPANCY_LABELS[discrepancy];
  }
}
