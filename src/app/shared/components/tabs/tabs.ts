import {
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  model,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { stepByKey } from '../../utils/arrow-keys';

export interface TabOption {
  value: string;
  label: string;
}

let nextTabsId = 0;

@Component({
  selector: 'app-tabs',
  template: `
    <div #list class="list" role="tablist" [attr.aria-label]="ariaLabel() || null">
      @for (tab of options(); track tab.value; let i = $index) {
        <button
          #tab
          type="button"
          role="tab"
          [id]="tabId(tab.value)"
          [attr.aria-selected]="i === selectedIndex()"
          [attr.aria-controls]="panelId(tab.value)"
          [attr.data-label]="tab.label"
          [tabindex]="i === tabStop() ? 0 : -1"
          (click)="value.set(tab.value)"
          (keydown)="onKey($event, i)"
        >
          {{ tab.label }}
        </button>
      }
      <span #thread class="thread" aria-hidden="true"></span>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .list {
      position: relative;
      display: flex;
      gap: 28px;
      margin: -4px -4px 0;
      padding: 4px 4px 14px;
      overflow-x: auto;
      scroll-behavior: smooth;
      scrollbar-width: none;
    }

    button {
      display: inline-flex;
      flex-direction: column;
      flex: none;
      align-items: center;
      padding: 6px 0;
      color: var(--color-trama-muted);
      font-size: 1rem;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      transition: color var(--duration-fast);
    }

    button::after {
      content: attr(data-label);
      height: 0;
      overflow: hidden;
      font-weight: 700;
      visibility: hidden;
    }

    button:hover,
    button[aria-selected='true'] {
      color: var(--color-trama-dark);
    }

    button[aria-selected='true'] {
      font-weight: 700;
    }

    button:focus-visible {
      outline: 2px solid var(--color-trama-brand);
      outline-offset: 2px;
      border-radius: 6px;
    }

    .thread {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 0;
      height: 8px;
      padding-right: 8px;
      background: linear-gradient(90deg, var(--color-trama-knot) 9px, transparent 9px) 0 50% / 14px
        3px space no-repeat;
      background-clip: content-box;
      background-origin: content-box;
      pointer-events: none;
    }

    .thread::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--color-trama-knot);
    }

    .thread.settled {
      transition:
        translate 300ms var(--ease-enter),
        width 300ms var(--ease-enter);
    }

    @media (prefers-reduced-motion: reduce) {
      .list {
        scroll-behavior: auto;
      }

      .thread.settled {
        transition: none;
      }
    }
  `,
})
export class Tabs {
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  private readonly thread = viewChild.required<ElementRef<HTMLElement>>('thread');
  private readonly tabs = viewChildren<ElementRef<HTMLButtonElement>>('tab');

  readonly options = input.required<readonly TabOption[]>();
  readonly value = model('');
  readonly ariaLabel = input<string>();

  private readonly id = nextTabsId++;
  private readonly layout = signal(0);

  protected readonly selectedIndex = computed(() =>
    this.options().findIndex((tab) => tab.value === this.value()),
  );
  protected readonly tabStop = computed(() => Math.max(0, this.selectedIndex()));

  constructor() {
    afterRenderEffect({
      earlyRead: () => {
        this.layout();
        const tab = this.tabs()[this.selectedIndex()]?.nativeElement;
        return tab ? { left: tab.offsetLeft, width: tab.offsetWidth } : null;
      },
      write: (spot) => {
        const place = spot();
        const thread = this.thread().nativeElement;
        thread.hidden = !place;
        if (!place) return;
        thread.style.translate = `${place.left}px 0`;
        thread.style.width = `${place.width}px`;
        this.keepInView(place.left, place.width);
        if (!thread.classList.contains('settled')) {
          requestAnimationFrame(() => thread.classList.add('settled'));
        }
      },
    });

    if (typeof ResizeObserver !== 'undefined') {
      const watcher = new ResizeObserver(() => this.layout.update((n) => n + 1));
      afterRenderEffect(() => watcher.observe(this.list().nativeElement));
      inject(DestroyRef).onDestroy(() => watcher.disconnect());
    }
  }

  tabId(value: string): string {
    return `trama-tabs-${this.id}-tab-${value}`;
  }

  panelId(value: string): string {
    return `trama-tabs-${this.id}-panel-${value}`;
  }

  protected onKey(event: KeyboardEvent, index: number): void {
    const next = stepByKey(event.key, index, this.options().length);
    if (next === null) return;
    event.preventDefault();
    this.value.set(this.options()[next].value);
    this.tabs()[next]?.nativeElement.focus();
  }

  // Adaptacion mobile
  private keepInView(left: number, width: number): void {
    const list = this.list().nativeElement;
    const margin = 16;
    if (left < list.scrollLeft) {
      list.scrollLeft = left - margin;
    } else if (left + width > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = left + width - list.clientWidth + margin;
    }
  }
}
