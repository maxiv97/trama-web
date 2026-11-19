import { Component, computed, input } from '@angular/core';
import { GarmentStatus } from '../../../core/models/garment.model';

export type BadgeTone = 'neutral' | 'pending' | 'counter' | 'agreed' | 'sold' | 'settled' | 'none';

interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

const STATUS_META: Record<GarmentStatus, StatusMeta> = {
  submitted: { label: 'En revisión', tone: 'neutral' },
  under_review: { label: 'En revisión', tone: 'pending' },
  counteroffer: { label: 'Contraoferta', tone: 'counter' },
  agreed: { label: 'Acordado', tone: 'agreed' },
  in_stock: { label: 'En stock', tone: 'agreed' },
  with_remarks: { label: 'Con observaciones', tone: 'pending' },
  rejected: { label: 'Rechazada', tone: 'none' },
  sold: { label: 'Vendido', tone: 'sold' },
  paid_out: { label: 'Liquidado', tone: 'settled' },
  no_agreement: { label: 'Sin acuerdo', tone: 'none' },
  cancelled: { label: 'Cancelada', tone: 'none' },
};

export function badgeToneClass(tone: BadgeTone): string {
  return tone === 'neutral' ? '' : `trama-badge--${tone}`;
}

@Component({
  selector: 'app-status-badge',
  host: {
    class: 'trama-badge',
    '[class]': 'toneClass()',
  },
  template: `{{ meta().label }}`,
})
export class StatusBadge {
  readonly status = input.required<GarmentStatus>();
  protected readonly meta = computed<StatusMeta>(
    () => STATUS_META[this.status()] ?? { label: this.status(), tone: 'neutral' },
  );
  protected readonly toneClass = computed(() => badgeToneClass(this.meta().tone));
}
