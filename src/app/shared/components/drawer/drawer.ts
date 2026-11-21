import { afterRenderEffect, Component, ElementRef, input, model, viewChild } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';

let nextDrawerId = 0;

@Component({
  selector: 'app-drawer',
  imports: [LucideAngularModule],
  template: `
    <dialog
      #panel
      class="trama-drawer"
      [attr.aria-labelledby]="headingId"
      [attr.aria-describedby]="lead() ? leadId : null"
      (close)="open.set(false)"
      (click)="closeFromBackdrop($event)"
    >
      <div class="frame">
        <span class="grip" aria-hidden="true"></span>
        <header>
          <div>
            @if (eyebrow()) {
              <p class="eyebrow">{{ eyebrow() }}</p>
            }
            <h2 [id]="headingId">{{ heading() }}</h2>
            @if (lead()) {
              <p class="lead" [id]="leadId">{{ lead() }}</p>
            }
          </div>
          <button type="button" class="close" aria-label="Cerrar" (click)="open.set(false)">
            <lucide-angular [img]="closeIcon" [size]="20" />
          </button>
        </header>
        <div class="body">
          <ng-content />
        </div>
        <footer>
          <ng-content select="[drawerFooter]" />
        </footer>
      </div>
    </dialog>
  `,
  styles: `
    dialog {
      position: fixed;
      inset: 0 0 0 auto;
      width: min(440px, 80%);
      max-width: none;
      height: 100dvh;
      max-height: none;
      margin: 0;
      padding: 0;
      overflow: hidden;
      border: 0;
      border-radius: 22px 0 0 22px;
      background-color: var(--color-trama-paper);
      box-shadow: var(--shadow-drawer);
      color: var(--color-trama-body);
      translate: 100% 0;
      transition:
        translate var(--duration-base) var(--ease-enter),
        overlay var(--duration-base) allow-discrete,
        display var(--duration-base) allow-discrete;
    }

    dialog[open] {
      translate: 0 0;
    }

    @starting-style {
      dialog[open] {
        translate: 100% 0;
      }
    }

    dialog::backdrop {
      background-color: transparent;
      transition:
        background-color var(--duration-base),
        overlay var(--duration-base) allow-discrete,
        display var(--duration-base) allow-discrete;
    }

    dialog[open]::backdrop {
      background-color: rgba(31, 58, 43, 0.28);
    }

    @starting-style {
      dialog[open]::backdrop {
        background-color: transparent;
      }
    }

    .frame {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: inherit;
    }

    header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 24px 24px 16px;
    }

    .eyebrow {
      margin: 0 0 4px;
      color: var(--color-trama-muted);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    h2 {
      margin: 0;
      color: var(--color-trama-dark);
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.25;
    }

    .lead {
      margin: 6px 0 0;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .close {
      display: grid;
      flex: none;
      place-items: center;
      width: 40px;
      height: 40px;
      margin: -6px -8px 0 auto;
      border-radius: 999px;
      color: var(--color-trama-dark);
      transition: background-color var(--duration-fast);
    }

    .close:hover {
      background-color: var(--color-trama-sand-50);
    }

    .close:focus-visible {
      outline: 2px solid var(--color-trama-brand);
      outline-offset: 2px;
    }

    .body {
      flex: 1;
      min-height: 0;
      padding: 0 24px 24px;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px 24px calc(20px + env(safe-area-inset-bottom));
      border-top: 1px solid var(--color-trama-sand-100);
    }

    footer:empty {
      display: none;
    }

    .grip {
      display: none;
      width: 44px;
      margin: 10px auto 0;
      border-top: 3px dashed var(--color-trama-thread-faint);
    }

    @media (width < 48rem) {
      dialog {
        inset: auto 0 0;
        width: 100%;
        height: auto;
        max-height: 88dvh;
        border-radius: 22px 22px 0 0;
        box-shadow: 0 -16px 40px rgba(31, 58, 43, 0.18);
        translate: 0 100%;
      }

      @starting-style {
        dialog[open] {
          translate: 0 100%;
        }
      }

      header {
        padding-top: 14px;
      }

      .grip {
        display: block;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      dialog,
      dialog::backdrop {
        transition: none;
      }
    }
  `,
})
export class Drawer {
  private readonly panel = viewChild.required<ElementRef<HTMLDialogElement>>('panel');

  readonly open = model(false);
  readonly heading = input.required<string>();
  readonly eyebrow = input<string>();
  readonly lead = input<string>();

  protected readonly closeIcon = X;
  private readonly id = nextDrawerId++;
  protected readonly headingId = `trama-drawer-${this.id}`;
  protected readonly leadId = `trama-drawer-lead-${this.id}`;

  constructor() {
    afterRenderEffect(() => {
      const dialog = this.panel().nativeElement;
      if (this.open() && !dialog.open) dialog.showModal();
      if (!this.open() && dialog.open) dialog.close();
    });
  }

  protected closeFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.open.set(false);
  }
}
