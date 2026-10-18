import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  imports: [RouterLink],
  template: `
    <div
      class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-trama-sand-200 py-16 text-center"
    >
      <p class="text-trama-dark/60">{{ message() }}</p>
      @if (link(); as target) {
        <a
          [routerLink]="target"
          class="t-btn t-btn-primary"
          >{{ linkLabel() }}</a
        >
      }
    </div>
  `,
})
export class EmptyState {
  readonly message = input.required<string>();
  readonly link = input<string>();
  readonly linkLabel = input<string>();
}
