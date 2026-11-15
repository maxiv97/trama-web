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
    <ol>
      @for (event of events(); track $index; let last = $last) {
        <li [class.latest]="last">
          <span class="thread" aria-hidden="true">
            <span class="knot"></span>
          </span>
          <div class="event">
            <div class="when">
              <app-status-badge [status]="event.status" />
              <time class="date" [attr.datetime]="isoDate(event.date)">{{
                event.date | shortDate
              }}</time>
            </div>
            <p class="who">
              {{ actorLabel(event.actor) }}
              @if (event.note) {
                · {{ event.note }}
              }
            </p>
          </div>
        </li>
      } @empty {
        <li class="empty">Sin eventos todavía.</li>
      }
    </ol>
  `,
  styles: `
    ol {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: flex;
      gap: 14px;
    }

    .thread {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
      width: 10px;
    }

    .knot {
      width: 10px;
      height: 10px;
      margin-top: 6px;
      border-radius: 50%;
      background-color: var(--color-trama-dark);
    }

    li:not(:last-child) .thread::after {
      content: '';
      flex: 1;
      width: 3px;
      margin-block: 4px;
      background: linear-gradient(to bottom, var(--color-trama-dark) 9px, transparent 9px) 0 0 / 3px
        15px repeat-y;
    }

    .latest .knot {
      background-color: var(--color-trama-knot);
    }

    .event {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    li:not(:last-child) .event {
      padding-bottom: 14px;
    }

    .when {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .date {
      color: var(--color-trama-muted);
      font-size: 0.8125rem; /* 13px */
    }

    .who {
      margin: 0;
      color: var(--color-trama-body);
      font-size: 0.875rem; /* 14px */
    }

    .empty {
      color: var(--color-trama-muted);
      font-size: 0.875rem;
    }
  `,
})
export class Timeline {
  readonly events = input.required<GarmentEvent[]>();

  protected actorLabel(actor: EventActor): string {
    return ACTOR_LABELS[actor];
  }

  protected isoDate(date: Date | string): string {
    return new Date(date).toISOString();
  }
}
