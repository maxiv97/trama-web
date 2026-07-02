import { Component, input } from '@angular/core';
import { EventActor, GarmentEvent } from '../../../core/models/garment.model';
import { ShortDatePipe } from '../../pipes/short-date.pipe';
import { StatusBadge } from '../status-badge/status-badge';

const ACTOR_LABELS: Record<EventActor, string> = {
  consignor: 'Cedente',
  merchant: 'Comercio',
  system: 'Sistema',
};

@Component({
  selector: 'app-timeline',
  imports: [StatusBadge, ShortDatePipe],
  template: `
    <ol class="space-y-1">
      @for (event of events(); track $index; let last = $last) {
        <li class="flex gap-3">
          <div class="flex flex-col items-center">
            <span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-trama-brand"></span>
            @if (!last) {
              <span class="w-px flex-1 bg-trama-sand-200"></span>
            }
          </div>
          <div class="pb-4">
            <div class="flex items-center gap-2">
              <app-status-badge [status]="event.status" />
              <span class="text-xs text-trama-dark/50">{{ event.date | shortDate }}</span>
            </div>
            <p class="mt-1 text-sm text-trama-dark/70">
              {{ actorLabel(event.actor) }}@if (event.note) {
                <span> · {{ event.note }}</span>
              }
            </p>
          </div>
        </li>
      } @empty {
        <li class="text-sm text-trama-dark/50">Sin eventos todavía.</li>
      }
    </ol>
  `,
})
export class Timeline {
  readonly events = input.required<GarmentEvent[]>();

  protected actorLabel(actor: EventActor): string {
    return ACTOR_LABELS[actor];
  }
}
