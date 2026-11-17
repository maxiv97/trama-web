import { Component, computed, input } from '@angular/core';
import { PayoutStatus } from '../../../core/models/payout.model';
import { BadgeTone, badgeToneClass } from '../status-badge/status-badge';

interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

const STATUS_META: Record<PayoutStatus, StatusMeta> = {
  pending: { label: 'Pendiente', tone: 'pending' },
  paid: { label: 'Pagada', tone: 'agreed' },
  overdue: { label: 'Vencida', tone: 'none' },
};

@Component({
  selector: 'app-payout-status-badge',
  host: {
    class: 'trama-badge',
    '[class]': 'toneClass()',
  },
  template: `{{ meta().label }}`,
})
export class PayoutStatusBadge {
  readonly status = input.required<PayoutStatus>();
  protected readonly meta = computed(() => STATUS_META[this.status()]);
  protected readonly toneClass = computed(() => badgeToneClass(this.meta().tone));
}
