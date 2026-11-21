import { Directive, inject, input } from '@angular/core';
import { Router } from '@angular/router';

const OWN_ACTION = 'a, button, input, select, textarea, label, [role="button"], [role="combobox"]';

@Directive({
  selector: 'tr[tramaRowLink]',
  host: {
    class: 'trama-row-link',
    '(click)': 'open($event)',
  },
})
export class RowLink {
  private readonly router = inject(Router);

  readonly tramaRowLink = input.required<readonly unknown[] | string>();

  protected open(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest(OWN_ACTION)) return;
    if (window.getSelection()?.toString()) return;

    const link = this.tramaRowLink();
    const commands = typeof link === 'string' ? [link] : [...link];
    // Ctrl clic para abrir en otra pestaña
    if (event.ctrlKey || event.metaKey) {
      const url = this.router.serializeUrl(this.router.createUrlTree(commands));
      window.open(url, '_blank');
      return;
    }
    this.router.navigate(commands);
  }
}
