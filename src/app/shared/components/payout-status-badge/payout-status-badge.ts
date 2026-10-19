import { Component, computed, input } from '@angular/core';
import { PayoutStatus } from '../../../core/models/payout.model';

interface StatusMeta {
  label: string;
  badgeClass: string;
}

const STATUS_META: Record<PayoutStatus, StatusMeta> = {
  pending: { label: 'Pendiente', badgeClass: 'bg-status-pending-soft text-status-pending' },
  paid: { label: 'Pagada', badgeClass: 'bg-status-agreed-soft text-status-agreed' },
  overdue: { label: 'Vencida', badgeClass: 'bg-status-none-soft text-status-none' },
};

@Component({
  selector: 'app-payout-status-badge',
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
export class PayoutStatusBadge {
  readonly status = input.required<PayoutStatus>();
  protected readonly meta = computed(() => STATUS_META[this.status()]);
}
