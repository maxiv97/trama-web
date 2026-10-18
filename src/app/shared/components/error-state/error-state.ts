import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CutThreadArt } from '../illustrations/illustrations';

/**
 * Pantalla de error (handoff §4.10): hilo cortado con la cruz roja, título
 * "Se cortó el hilo", el mensaje y el botón secundario Reintentar (o un link
 * de salida cuando no hay nada que reintentar).
 */
@Component({
  selector: 'app-error-state',
  imports: [RouterLink, CutThreadArt],
  template: `
    <div class="flex min-h-[60vh] flex-col items-center justify-center gap-3.5 px-4 text-center">
      <app-cut-thread-art [size]="160" />
      <p class="text-title-2 mt-1 text-trama-dark">{{ title() }}</p>
      <p class="max-w-[340px] text-[15px] leading-relaxed text-trama-body">{{ message() }}</p>
      @if (link(); as target) {
        <a [routerLink]="target" class="t-btn t-btn-secondary mt-1">{{ linkLabel() }}</a>
      } @else {
        <button type="button" (click)="retry.emit()" class="t-btn t-btn-secondary mt-1">
          Reintentar
        </button>
      }
    </div>
  `,
})
export class ErrorState {
  readonly message = input.required<string>();
  readonly title = input('Se cortó el hilo');
  readonly link = input<string>();
  readonly linkLabel = input<string>('Volver');
  readonly retry = output<void>();
}
