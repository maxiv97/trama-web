import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Inbox, LucideIconData } from 'lucide-angular';
import { BlobIcon } from '../blob-icon/blob-icon';

/**
 * Estado vacío (handoff §4.10): borde hilvanado, el ícono de la sección sobre
 * un blob crema, título, cuerpo y, si hay link, el botón primario.
 * `compact` lo achica para usarlo dentro de tarjetas de reporte.
 */
@Component({
  selector: 'app-empty-state',
  imports: [RouterLink, BlobIcon],
  host: { class: 'block' },
  template: `
    <div
      class="relative flex flex-col items-center justify-center rounded-2xl bg-trama-paper text-center"
      [class]="compact() ? 'gap-2 px-5 py-8' : 'gap-3.5 px-6 py-14'"
    >
      <svg class="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <rect
          x="1.5"
          y="1.5"
          rx="16"
          style="width: calc(100% - 3px); height: calc(100% - 3px)"
          fill="none"
          stroke="#C9C2AE"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-dasharray="10 9"
        />
      </svg>
      @if (!compact()) {
        <app-blob-icon [icon]="icon()" [size]="104" [iconSize]="44" tone="cream" class="mb-1" />
      }
      @if (title()) {
        <p class="text-title-3 font-bold text-trama-dark">{{ title() }}</p>
      }
      <p class="max-w-[46ch] text-[15px] leading-relaxed text-trama-body">{{ message() }}</p>
      @if (link(); as target) {
        <a [routerLink]="target" class="t-btn t-btn-primary mt-1">{{ linkLabel() }}</a>
      }
    </div>
  `,
})
export class EmptyState {
  readonly message = input.required<string>();
  readonly title = input<string>('');
  readonly icon = input<LucideIconData>(Inbox);
  readonly compact = input(false);
  readonly link = input<string>();
  readonly linkLabel = input<string>();
}
