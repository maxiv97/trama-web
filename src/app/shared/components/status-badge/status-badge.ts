import { Component, computed, input } from '@angular/core';
import { GarmentStatus } from '../../../core/models/garment.model';

interface StatusMeta {
  label: string;
  badgeClass: string;
}

const STATUS_META: Record<GarmentStatus, StatusMeta> = {
  submitted: { label: 'En revisión', badgeClass: 'bg-status-neutral-soft text-status-neutral' },
  under_review: { label: 'En revisión', badgeClass: 'bg-status-pending-soft text-status-pending' },
  counteroffer: { label: 'Contraoferta', badgeClass: 'bg-status-counter-soft text-status-counter' },
  agreed: { label: 'Acordado', badgeClass: 'bg-status-agreed-soft text-status-agreed' },
  in_stock: { label: 'En stock', badgeClass: 'bg-status-agreed-soft text-status-agreed' },
  with_remarks: {
    label: 'Con observaciones',
    badgeClass: 'bg-status-pending-soft text-status-pending',
  },
  rejected: { label: 'Rechazada', badgeClass: 'bg-status-none-soft text-status-none' },
  sold: { label: 'Vendido', badgeClass: 'bg-status-sold-soft text-status-sold' },
  paid_out: { label: 'Liquidado', badgeClass: 'bg-status-settled-soft text-status-settled' },
  no_agreement: { label: 'Sin acuerdo', badgeClass: 'bg-status-none-soft text-status-none' },
  cancelled: { label: 'Cancelada', badgeClass: 'bg-status-none-soft text-status-none' },
};

@Component({
  selector: 'app-status-badge',
  template: `
    <span
      class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      [class]="meta().badgeClass"
    >
      {{ meta().label }}
    </span>
  `,
})
export class StatusBadge {
  readonly status = input.required<GarmentStatus>();
  protected readonly meta = computed(() => STATUS_META[this.status()]);
}
