import { Component, computed, input } from '@angular/core';
import { GarmentStatus } from '../../../core/models/garment.model';

interface StatusMeta {
  label: string;
  badgeClass: string;
}

const STATUS_META: Record<GarmentStatus, StatusMeta> = {
  submitted: { label: 'En revisión', badgeClass: 'bg-blue-100 text-blue-800' },
  under_review: { label: 'En revisión', badgeClass: 'bg-yellow-100 text-yellow-800' },
  counteroffer: { label: 'Contraoferta', badgeClass: 'bg-orange-100 text-orange-800' },
  agreed: { label: 'Acordado', badgeClass: 'bg-green-100 text-green-700' },
  in_stock: { label: 'En stock', badgeClass: 'bg-green-200 text-green-800' },
  with_remarks: { label: 'Con observaciones', badgeClass: 'bg-yellow-100 text-yellow-800' },
  rejected: { label: 'Rechazada', badgeClass: 'bg-red-100 text-red-800' },
  sold: { label: 'Vendido', badgeClass: 'bg-emerald-200 text-emerald-900' },
  paid_out: { label: 'Liquidado', badgeClass: 'bg-gray-100 text-gray-700' },
  no_agreement: { label: 'Sin acuerdo', badgeClass: 'bg-red-50 text-red-600' },
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
