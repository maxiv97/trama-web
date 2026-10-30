import { Component, input, output } from '@angular/core';
import { GarmentStatus } from '../../../../core/models/garment.model';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { downloadCsv } from '../../../../shared/csv/to-csv';

export interface DrillRow {
  name: string;
  meta: string;
  status: GarmentStatus;
}

@Component({
  selector: 'app-drill-modal',
  imports: [StatusBadge],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-start justify-center bg-trama-dark/40 p-4 sm:p-10"
      (click)="close.emit()"
    >
      <div
        class="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-start justify-between gap-3 border-b border-trama-sand-200 px-5 py-4">
          <div>
            <h3 class="font-display text-lg font-semibold text-trama-dark">{{ title() }}</h3>
            <p class="text-sm text-trama-dark/50">
              {{ rows().length }} {{ rows().length === 1 ? 'prenda' : 'prendas' }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            @if (rows().length) {
              <button
                (click)="exportCsv()"
                class="rounded-lg border border-trama-sand-200 px-3 py-1.5 text-xs font-semibold text-trama-dark/70 hover:bg-trama-sand-50"
              >
                CSV
              </button>
            }
            <button (click)="close.emit()" class="px-1 text-2xl leading-none text-trama-dark/50">×</button>
          </div>
        </div>

        <div class="overflow-y-auto px-5">
          @if (rows().length) {
            @for (row of rows(); track $index) {
              <div class="flex items-center gap-3 border-b border-trama-sand-100 py-3 last:border-0">
                <div class="min-w-0 flex-1">
                  <p class="font-medium text-trama-dark">{{ row.name }}</p>
                  <p class="text-xs text-trama-dark/50">{{ row.meta }}</p>
                </div>
                <app-status-badge [status]="row.status" />
              </div>
            }
          } @else {
            <p class="py-10 text-center text-sm text-trama-dark/50">Sin prendas para este recorte.</p>
          }
        </div>
      </div>
    </div>
  `,
})
export class DrillModal {
  readonly title = input.required<string>();
  readonly rows = input.required<DrillRow[]>();
  readonly csvName = input<string>('prendas');
  readonly close = output<void>();

  protected exportCsv(): void {
    downloadCsv(
      this.csvName(),
      ['Prenda', 'Detalle', 'Estado'],
      this.rows().map((r) => [r.name, r.meta, r.status]),
    );
  }
}
