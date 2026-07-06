import { Component, computed, input } from '@angular/core';
import { PayoutStatus } from '../../../core/models/payout.model';

interface StatusMeta {
  label: string;
  badgeClass: string;
}

const STATUS_META: Record<PayoutStatus, StatusMeta> = {
  pending: { label: 'Pendiente', badgeClass: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Pagada', badgeClass: 'bg-trama-green-100 text-trama-green-700' },
  overdue: { label: 'Vencida', badgeClass: 'bg-red-100 text-red-800' },
};

@Component({
  selector: 'app-payout-status-badge',
  template: `
    <span
      class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      [class]="meta().badgeClass"
    >
      {{ meta().label }}
    </span>
  `,
})
export class PayoutStatusBadge {
  readonly status = input.required<PayoutStatus>();
  protected readonly meta = computed(() => STATUS_META[this.status()]);
}
