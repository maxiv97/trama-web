import {
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Check, ChevronDown, LucideAngularModule, Search } from 'lucide-angular';

export interface DropdownOption {
  value: string;
  label: string;
  /** Segunda línea de 12 px (cantidad, subcategorías). */
  hint?: string;
  disabled?: boolean;
}

let nextId = 0;

/**
 * Dropdown de Trama (handoff §4.4), en lugar de los <select> nativos.
 * El disparador se ve como un input con un chevron que gira al abrir; el panel
 * es papel con radio 16 y sombra de popover. La opción elegida va en 700 con un
 * tilde verde y, con más de 7 opciones, aparece un buscador arriba.
 *
 * Funciona con [(value)] o con formControlName.
 */
@Component({
  selector: 'app-dropdown',
  imports: [LucideAngularModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Dropdown), multi: true }],
  host: {
    class: 'relative block',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close(true)',
  },
  template: `
    <button
      #trigger
      type="button"
      class="t-input flex items-center justify-between gap-2 text-left"
      [class.t-input-sm]="size() === 'sm'"
      [class.t-input-error]="invalid()"
      [class.dd-open]="open()"
      [class.dd-page]="onPage()"
      [disabled]="isDisabled()"
      [attr.id]="triggerId()"
      [attr.aria-haspopup]="'listbox'"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="listId"
      [attr.aria-label]="ariaLabel() || null"
      (click)="toggle()"
      (keydown)="onTriggerKey($event)"
    >
      <span class="min-w-0 truncate" [class.dd-ph]="!selected()">
        {{ selected()?.label ?? placeholder() }}
      </span>
      <lucide-angular
        class="chev flex shrink-0 text-trama-dark"
        [class.chev-open]="open()"
        [img]="chevron"
        [size]="18"
      />
    </button>

    @if (open()) {
      <div
        class="t-popover t-pop-in absolute left-0 z-50 mt-2 w-full min-w-[220px] p-2"
        [class.right-0]="alignRight()"
        [class.left-auto]="alignRight()"
      >
        @if (searchable()) {
          <div class="relative mb-1.5">
            <lucide-angular
              class="pointer-events-none absolute left-3 top-0 flex h-full items-center text-trama-muted"
              [img]="searchIcon"
              [size]="16"
            />
            <input
              #searchBox
              type="text"
              class="t-input t-input-sm"
              style="padding-left: 36px"
              placeholder="Buscar"
              aria-label="Buscar opción"
              [value]="query()"
              (input)="query.set($any($event.target).value); active.set(0)"
              (keydown)="onListKey($event)"
            />
          </div>
        }
        <ul
          [attr.id]="listId"
          role="listbox"
          class="max-h-72 overflow-y-auto"
          tabindex="-1"
          (keydown)="onListKey($event)"
        >
          @for (o of filtered(); track o.value; let i = $index) {
            <li
              role="option"
              [attr.aria-selected]="o.value === value()"
              [attr.aria-disabled]="o.disabled || null"
              class="flex cursor-pointer items-center gap-2 rounded-[10px] p-2.5 transition-colors duration-150"
              [class.bg-trama-sand-50]="i === active()"
              [class.opacity-40]="o.disabled"
              (mouseenter)="active.set(i)"
              (click)="choose(o)"
            >
              <span class="min-w-0 flex-1">
                <span
                  class="block truncate text-[15px] text-trama-dark"
                  [class.font-bold]="o.value === value()"
                  >{{ o.label }}</span
                >
                @if (o.hint) {
                  <span class="block truncate text-xs text-trama-muted">{{ o.hint }}</span>
                }
              </span>
              @if (o.value === value()) {
                <lucide-angular class="flex shrink-0" [img]="checkIcon" [size]="18" color="#2E7D54" [strokeWidth]="2.6" />
              }
            </li>
          } @empty {
            <li class="p-2.5 text-sm text-trama-muted">No hay opciones con "{{ query() }}".</li>
          }
        </ul>
      </div>
    }
  `,
  styles: `
    .chev {
      transition: transform 250ms cubic-bezier(0.2, 0.8, 0.3, 1);
    }
    .chev-open {
      transform: rotate(180deg);
    }
    .dd-page:not(.dd-open) {
      background: var(--color-trama-paper);
      border-color: var(--color-trama-sand-100);
    }
    .dd-ph {
      color: #8a8778;
    }
    .dd-open {
      background: var(--color-trama-paper);
      border-color: var(--color-trama-brand);
      outline-color: var(--color-trama-green-50);
    }
  `,
})
export class Dropdown implements ControlValueAccessor {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  readonly options = input.required<readonly DropdownOption[]>();
  readonly value = model<string>('');
  readonly placeholder = input('Elegí una opción');
  readonly ariaLabel = input('');
  readonly size = input<'md' | 'sm'>('md');
  readonly invalid = input(false);
  readonly disabled = input(false);
  readonly alignRight = input(false);
  /** Va sobre el fondo crema de la página: el disparador pasa a papel. */
  readonly onPage = input(false);
  /** Id para asociar un <label for>. */
  readonly inputId = input('');

  protected readonly chevron = ChevronDown;
  protected readonly checkIcon = Check;
  protected readonly searchIcon = Search;
  protected readonly listId = `t-dd-${nextId++}`;
  protected readonly triggerId = computed(() => this.inputId() || null);

  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly active = signal(0);
  private readonly cvaDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');

  protected readonly searchable = computed(() => this.options().length > 7);
  protected readonly selected = computed(() => this.options().find((o) => o.value === this.value()));
  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.options();
    return this.options().filter(
      (o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q),
    );
  });

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: string | null): void {
    this.value.set(v ?? '');
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean): void {
    this.cvaDisabled.set(d);
  }

  protected toggle(): void {
    if (this.open()) this.close();
    else this.openPanel();
  }

  private openPanel(): void {
    this.query.set('');
    const idx = this.options().findIndex((o) => o.value === this.value());
    this.active.set(Math.max(0, idx));
    this.open.set(true);
    if (this.searchable()) queueMicrotask(() => this.searchBox()?.nativeElement.focus());
  }

  close(refocus = false): void {
    if (!this.open()) return;
    this.open.set(false);
    this.onTouched();
    if (refocus) this.trigger()?.nativeElement.focus();
  }

  protected choose(o: DropdownOption): void {
    if (o.disabled) return;
    this.value.set(o.value);
    this.onChange(o.value);
    this.close(true);
  }

  protected onTriggerKey(e: KeyboardEvent): void {
    if (!this.open() && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      this.openPanel();
      return;
    }
    if (this.open()) this.onListKey(e);
  }

  protected onListKey(e: KeyboardEvent): void {
    const list = this.filtered();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.active.set(Math.min(list.length - 1, this.active() + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.active.set(Math.max(0, this.active() - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = list[this.active()];
      if (o) this.choose(o);
    } else if (e.key === 'Tab') {
      this.close();
    }
  }

  protected onDocumentClick(e: MouseEvent): void {
    if (this.open() && !this.host.contains(e.target as Node)) this.close();
  }
}
