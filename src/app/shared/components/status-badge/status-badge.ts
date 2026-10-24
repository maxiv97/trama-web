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
  // Semáforo del producto: rojo = vencido, ámbar = pendiente, gris = informativo/cerrado.
  delivery_expired: { label: 'Entrega vencida', badgeClass: 'bg-status-none-soft text-status-none' },
  awaiting_pickup: { label: 'Por retirar', badgeClass: 'bg-status-pending-soft text-status-pending' },
  returned: { label: 'Retirada', badgeClass: 'bg-status-neutral-soft text-status-neutral' },
  unclaimed: { label: 'No retirada', badgeClass: 'bg-status-none-soft text-status-none' },
};

@Component({
  selector: 'app-status-badge',
  template: `
    <span
      class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-[11px] py-1 text-[13px] font-semibold leading-tight"
      [class]="meta().badgeClass"
    >
      <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true"></span>
      {{ meta().label }}
    </span>
  `,
})
export class StatusBadge {
  readonly status = input.required<GarmentStatus>();
  protected readonly meta = computed(() => STATUS_META[this.status()]);
}
