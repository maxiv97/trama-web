import { Component, input } from '@angular/core';
import { Needle } from '../illustrations/illustrations';

/** Carga (handoff §4.10): una aguja que cose en lugar del círculo que gira. */
@Component({
  selector: 'app-loading-spinner',
  imports: [Needle],
  template: `
    <div class="flex items-center justify-center" [class]="inline() ? 'py-6' : 'min-h-[60vh]'">
      <app-needle [width]="inline() ? 160 : 220" />
    </div>
  `,
})
export class LoadingSpinner {
  readonly inline = input(false);
}
