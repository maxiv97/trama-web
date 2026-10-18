import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-error-state',
  imports: [RouterLink],
  template: `
    <div class="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p class="text-trama-dark/70">{{ message() }}</p>
      @if (link(); as target) {
        <a
          [routerLink]="target"
          class="t-btn t-btn-primary"
          >{{ linkLabel() }}</a
        >
      } @else {
        <button
          type="button"
          (click)="retry.emit()"
          class="t-btn t-btn-primary"
        >
          Reintentar
        </button>
      }
    </div>
  `,
})
export class ErrorState {
  readonly message = input.required<string>();
  readonly link = input<string>();
  readonly linkLabel = input<string>('Volver');
  readonly retry = output<void>();
}
