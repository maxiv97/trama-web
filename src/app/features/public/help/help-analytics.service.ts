import { Injectable } from '@angular/core';

export type HelpEvent =
  | { type: 'search_no_results'; term: string }
  | { type: 'guide_feedback'; slug: string; useful: boolean }
  | { type: 'ticket_sent'; motivo: string };

/**
 * Medición mínima del centro de ayuda (handoff §4): búsquedas sin resultado, "¿Te sirvió?" por guía
 * y tickets por motivo. Todavía no hay backend para estos contadores: los eventos quedan en memoria
 * y este es el único punto a conectar cuando exista uno.
 */
@Injectable({ providedIn: 'root' })
export class HelpAnalytics {
  private readonly events: HelpEvent[] = [];

  track(event: HelpEvent): void {
    this.events.push(event);
  }

  /** Para depurar desde la consola o conectar un envío por lotes más adelante. */
  snapshot(): readonly HelpEvent[] {
    return this.events;
  }
}
