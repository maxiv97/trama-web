import { Component, ElementRef, input, model, viewChild } from '@angular/core';
import { LucideAngularModule, Search, X } from 'lucide-angular';

@Component({
  selector: 'app-search-field',
  imports: [LucideAngularModule],
  template: `
    <lucide-angular class="lens" [img]="searchIcon" [size]="18" aria-hidden="true" />
    <input
      #field
      type="search"
      class="trama-input"
      [placeholder]="placeholder()"
      [attr.aria-label]="ariaLabel() || placeholder()"
      [value]="value()"
      (input)="value.set($any($event.target).value)"
      (keydown.escape)="clear()"
    />
    @if (value()) {
      <button type="button" class="clear" aria-label="Borrar búsqueda" (click)="clear()">
        <lucide-angular [img]="clearIcon" [size]="16" />
      </button>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }

    .lens {
      position: absolute;
      top: 50%;
      left: 14px;
      display: flex;
      color: var(--color-trama-muted);
      pointer-events: none;
      translate: 0 -50%;
    }

    input {
      padding-inline: 40px;
    }

    input::-webkit-search-cancel-button {
      appearance: none;
    }

    .clear {
      position: absolute;
      top: 50%;
      right: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 999px;
      color: var(--color-trama-body);
      cursor: pointer;
      translate: 0 -50%;
      transition: background-color var(--duration-fast);
    }

    .clear:hover {
      background-color: var(--color-trama-sand-100);
    }

    .clear:focus-visible {
      outline: 2px solid var(--color-trama-brand);
    }
  `,
})
export class SearchField {
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  readonly value = model('');
  readonly placeholder = input('Buscar');
  readonly ariaLabel = input<string>();

  protected readonly searchIcon = Search;
  protected readonly clearIcon = X;

  protected clear(): void {
    this.value.set('');
    this.field().nativeElement.focus();
  }
}
