import { Component, input } from '@angular/core';
import { EventActor, GarmentEvent } from '../../../core/models/garment.model';
import { ShortDatePipe } from '../../pipes/short-date.pipe';
import { StatusBadge } from '../status-badge/status-badge';

const ACTOR_LABELS: Record<EventActor, string> = {
  consignor: 'Cedente',
  merchant: 'Comercio',
  system: 'Sistema',
};

/**
 * Línea de eventos (handoff §4.8): la línea vertical es una puntada y cada
 * evento lleva un nudo de 10 px, verde profundo si ya ocurrió y naranja en el
 * último.
 */
@Component({
  selector: 'app-timeline',
  imports: [StatusBadge, ShortDatePipe],
  template: `
    <ol>
      @for (event of events(); track $index; let last = $last) {
        <li class="flex gap-3.5">
          <div class="flex w-2.5 flex-col items-center">
            <span
              class="mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full"
              [class]="last ? 'bg-trama-knot' : 'bg-trama-dark'"
            ></span>
            @if (!last) {
              <span class="stitch-v my-1 w-[3px] flex-1"></span>
            }
          </div>
          <div class="min-w-0 pb-5">
            <div class="flex flex-wrap items-center gap-2">
              <app-status-badge [status]="event.status" />
              <span class="text-[13px] text-trama-muted">{{ event.date | shortDate }}</span>
            </div>
            <p class="mt-1.5 text-sm text-trama-body">
              {{ actorLabel(event.actor) }}@if (event.note) {
                <span> · {{ event.note }}</span>
              }
            </p>
          </div>
        </li>
      } @empty {
        <li class="text-sm text-trama-muted">Sin eventos todavía.</li>
      }
    </ol>
  `,
  styles: `
    .stitch-v {
      min-height: 18px;
      border-radius: 2px;
      background-image: linear-gradient(to bottom, #1f3a2b 9px, transparent 9px);
      background-size: 3px 15px;
      background-repeat: repeat-y;
    }
  `,
})
export class Timeline {
  readonly events = input.required<GarmentEvent[]>();

  protected actorLabel(actor: EventActor): string {
    return ACTOR_LABELS[actor];
  }
}
