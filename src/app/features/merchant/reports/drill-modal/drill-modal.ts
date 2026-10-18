import { Component, input, output } from '@angular/core';
import { GarmentStatus } from '../../../../core/models/garment.model';
import { TableThumb } from '../../../../shared/components/data-table/data-table';
import { Drawer } from '../../../../shared/components/drawer/drawer';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { downloadCsv } from '../../../../shared/csv/to-csv';

export interface DrillRow {
  name: string;
  meta: string;
  status: GarmentStatus;
}

/**
 * Detalle de un reporte en un drawer lateral (handoff §4.19): el reporte sigue
 * a la vista detrás. Mantiene el selector y las entradas del modal anterior.
 */
@Component({
  selector: 'app-drill-modal',
  imports: [Drawer, StatusBadge, TableThumb],
  template: `
    <app-drawer [eyebrow]="question()" [title]="title()" [lead]="lead()" (close)="close.emit()">
      @if (rows().length) {
        <ul>
          @for (row of rows(); track $index) {
            <li class="flex min-w-0 items-center gap-3 border-b border-trama-sand-100 py-3 last:border-0">
              <app-table-thumb [seed]="row.name" [size]="44" />
              <div class="min-w-0 flex-1">
                <p class="truncate font-bold text-trama-dark">{{ row.name }}</p>
                <p class="truncate text-[13px] text-trama-muted">{{ row.meta }}</p>
              </div>
              <app-status-badge class="shrink-0" [status]="row.status" />
            </li>
          }
        </ul>
      } @else {
        <p class="py-10 text-center text-sm text-trama-muted">Sin prendas para este recorte.</p>
      }
      @if (rows().length) {
        <button footer type="button" (click)="exportCsv()" class="t-btn t-btn-secondary t-btn-sm">CSV</button>
      }
    </app-drawer>
  `,
})
export class DrillModal {
  readonly title = input.required<string>();
  readonly rows = input.required<DrillRow[]>();
  readonly csvName = input<string>('prendas');
  /** Pregunta del reporte, como eyebrow. */
  readonly question = input('');
  readonly close = output<void>();

  protected lead(): string {
    const n = this.rows().length;
    return `${n} ${n === 1 ? 'prenda' : 'prendas'}`;
  }

  protected exportCsv(): void {
    downloadCsv(
      this.csvName(),
      ['Prenda', 'Detalle', 'Estado'],
      this.rows().map((r) => [r.name, r.meta, r.status]),
    );
  }
}
