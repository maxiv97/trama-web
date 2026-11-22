import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { Download, LucideAngularModule } from 'lucide-angular';
import { GarmentStatus } from '../../../../core/models/garment.model';
import { Drawer } from '../../../../shared/components/drawer/drawer';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { downloadCsv } from '../../../../shared/csv/to-csv';

export interface DetailRow {
  name: string;
  meta: string;
  status: GarmentStatus;
}

export interface ReportDetailData {
  title: string;
  rows: DetailRow[];
  csvName: string;
}

@Component({
  selector: 'app-report-detail',
  imports: [Drawer, StatusBadge, LucideAngularModule],
  template: `
    <app-drawer
      [eyebrow]="question()"
      [heading]="shown()?.title ?? ''"
      [lead]="count()"
      [open]="!!detail()"
      (openChange)="onOpenChange($event)"
    >
      @if (shown()?.rows; as rows) {
        @if (rows.length) {
          <ul class="rows">
            @for (row of rows; track $index) {
              <li>
                <span class="text">
                  <span class="name">{{ row.name }}</span>
                  <span class="trama-table__meta">{{ row.meta }}</span>
                </span>
                <app-status-badge [status]="row.status" />
              </li>
            }
          </ul>
        } @else {
          <p class="empty">No hay prendas para este recorte.</p>
        }
      }
      @if (shown()?.rows?.length) {
        <button
          drawerFooter
          type="button"
          class="trama-btn trama-btn--outline"
          (click)="exportCsv()"
        >
          <lucide-angular [img]="downloadIcon" [size]="18" />
          Descargar CSV
        </button>
      }
    </app-drawer>
  `,
  styles: `
    .rows {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--color-trama-sand-100);
    }

    li:last-child {
      border-bottom: 0;
    }

    .text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .name {
      overflow: hidden;
      color: var(--color-trama-dark);
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      margin: 0;
      padding: 32px 0;
      color: var(--color-trama-muted);
      font-size: 0.875rem;
      text-align: center;
    }
  `,
})
export class ReportDetail {
  readonly question = input<string>();
  readonly detail = input<ReportDetailData | null>(null);
  readonly closed = output<void>();

  protected readonly downloadIcon = Download;

  protected readonly shown = linkedSignal<ReportDetailData | null, ReportDetailData | null>({
    source: this.detail,
    computation: (next, previous) => next ?? previous?.value ?? null,
  });

  protected readonly count = computed(() => {
    const total = this.shown()?.rows.length ?? 0;
    return `${total} ${total === 1 ? 'prenda' : 'prendas'}`;
  });

  protected onOpenChange(open: boolean): void {
    if (!open) this.closed.emit();
  }

  protected exportCsv(): void {
    const detail = this.shown();
    if (!detail) return;
    downloadCsv(
      detail.csvName,
      ['Prenda', 'Detalle', 'Estado'],
      detail.rows.map((row) => [row.name, row.meta, row.status]),
    );
  }
}
