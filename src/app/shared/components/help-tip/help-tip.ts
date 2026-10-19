import { Component, input, signal } from '@angular/core';

let nextId = 0;

/**
 * Tooltip de ayuda (handoff §4.18): un "?" de 22 px sobre papel que abre, con
 * hover o foco, una burbuja verde profundo (texto crema 500 de 13/1.45, ancho
 * máximo 240, radio 12, flecha de 12 px). Si la ayuda necesita más de dos
 * frases, va como bajada debajo del campo, no acá.
 */
@Component({
  selector: 'app-help-tip',
  host: { class: 'relative inline-flex align-middle' },
  template: `
    <button
      type="button"
      class="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-trama-sand-100 bg-trama-paper text-[13px] font-bold leading-none text-trama-body transition-colors duration-150 hover:text-trama-dark"
      [attr.aria-label]="label()"
      [attr.aria-describedby]="open() ? id : null"
      (mouseenter)="open.set(true)"
      (mouseleave)="open.set(false)"
      (focus)="open.set(true)"
      (blur)="open.set(false)"
      (keydown.escape)="open.set(false)"
    >
      ?
    </button>
    @if (open()) {
      <span
        role="tooltip"
        [attr.id]="id"
        class="tip t-pop-in absolute bottom-[calc(100%+12px)] left-1/2 z-50 w-max max-w-[240px] -translate-x-1/2 rounded-xl bg-trama-dark px-3 py-2 text-[13px] font-medium leading-[1.45] text-trama-sand-50"
      >
        {{ text() }}
      </span>
    }
  `,
  styles: `
    .tip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      width: 12px;
      height: 12px;
      background: var(--color-trama-dark);
      transform: translate(-50%, -6px) rotate(45deg);
      border-radius: 2px;
    }
  `,
})
export class HelpTip {
  readonly text = input.required<string>();
  readonly label = input('Ayuda');
  protected readonly open = signal(false);
  protected readonly id = `t-tip-${nextId++}`;
}
