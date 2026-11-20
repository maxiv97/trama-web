import {
  afterNextRender,
  Component,
  Injector,
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
import { Check, ChevronDown, LucideAngularModule } from 'lucide-angular';

export interface DropdownOption {
  value: string;
  label: string;
  hint?: string;
}

const SEARCH_FROM = 8;

let nextId = 0;

@Component({
  selector: 'app-dropdown',
  imports: [LucideAngularModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Dropdown), multi: true }],
  host: {
    '[class.open]': 'open()',
    '(document:click)': 'closeOnOutside($event)',
  },
  template: `
    <button
      #trigger
      type="button"
      class="trama-input trigger"
      role="combobox"
      aria-haspopup="listbox"
      [id]="inputId()"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="open() ? listId : null"
      [attr.aria-activedescendant]="open() && !searchable() ? activeId() : null"
      [attr.aria-invalid]="invalid() || null"
      [disabled]="disabled()"
      (click)="toggle()"
      (keydown)="onTriggerKey($event)"
      (blur)="touched()"
    >
      <span class="current" [class.placeholder]="!selected()">
        {{ selected()?.label ?? placeholder() }}
      </span>
      <lucide-angular class="chevron" [img]="chevronIcon" [size]="18" />
    </button>

    @if (open()) {
      <div class="panel">
        @if (searchable()) {
          <input
            #search
            type="search"
            class="search"
            placeholder="Buscar…"
            aria-label="Buscar opción"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            [attr.aria-controls]="listId"
            [attr.aria-activedescendant]="activeId()"
            [value]="query()"
            (input)="onSearch($any($event.target).value)"
            (keydown)="onListKey($event)"
          />
        }
        <ul role="listbox" [id]="listId" [attr.aria-label]="ariaLabel() || null">
          @for (option of visible(); track option.value; let i = $index) {
            <li
              role="option"
              [id]="listId + '-' + i"
              [attr.aria-selected]="option.value === value()"
              [class.active]="i === active()"
              (mousemove)="active.set(i)"
              (click)="choose(option)"
            >
              <span class="text">
                <span>{{ option.label }}</span>
                @if (option.hint) {
                  <span class="hint">{{ option.hint }}</span>
                }
              </span>
              @if (option.value === value()) {
                <lucide-angular class="check" [img]="checkIcon" [size]="16" />
              }
            </li>
          } @empty {
            <li class="empty" role="presentation">No encontramos opciones con “{{ query() }}”.</li>
          }
        </ul>
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }

    .trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      text-align: left;
      cursor: pointer;
    }

    /* Abierto se ve como el campo con foco */
    :host(.open) .trigger {
      border-color: var(--color-trama-brand);
      outline-color: var(--color-trama-green-50);
      background-color: var(--color-trama-paper);
    }

    .current {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .placeholder {
      color: var(--color-trama-placeholder);
    }

    .chevron {
      display: flex;
      flex-shrink: 0;
      transition: transform var(--duration-base) var(--ease-enter);
    }

    :host(.open) .chevron {
      transform: rotate(180deg);
    }

    .panel {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 100%;
      max-height: 320px;
      padding: 8px;
      border-radius: var(--radius-popover);
      background-color: var(--color-trama-paper);
      box-shadow: var(--shadow-popover);
      animation: panel-open var(--duration-base) var(--ease-enter) both;
    }

    .search {
      padding: 8px 10px;
      border: 0;
      border-radius: 10px;
      outline: 2px solid transparent;
      background-color: var(--color-trama-sand-50);
      font-size: 0.875rem;
    }

    .search:focus {
      outline-color: var(--color-trama-green-50);
    }

    ul {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin: 0;
      padding: 0;
      overflow-y: auto;
      list-style: none;
    }

    li[role='option'] {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px;
      border-radius: 10px;
      color: var(--color-trama-dark);
      font-size: 0.9375rem; /* 15px */
      cursor: pointer;
    }

    li.active {
      background-color: var(--color-trama-sand-50);
    }

    li[aria-selected='true'] {
      font-weight: 700;
    }

    .text {
      display: flex;
      flex-direction: column;
    }

    .hint {
      color: var(--color-trama-muted);
      font-size: 0.75rem;
      font-weight: 400;
    }

    .check {
      display: flex;
      flex-shrink: 0;
      color: var(--color-trama-brand);
    }

    .empty {
      padding: 10px;
      color: var(--color-trama-muted);
      font-size: 0.875rem;
    }

    @keyframes panel-open {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .panel {
        animation: none;
      }
    }
  `,
})
export class Dropdown implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');

  readonly options = input.required<readonly DropdownOption[]>();
  readonly value = model<string | null>(null);
  readonly placeholder = input('Elegí una opción');
  readonly ariaLabel = input<string>();
  readonly inputId = input(`trama-dropdown-${nextId}`);
  readonly invalid = input(false);

  protected readonly listId = `trama-dropdown-list-${nextId++}`;
  protected readonly open = signal(false);
  protected readonly active = signal(0);
  protected readonly query = signal('');
  protected readonly disabled = signal(false);
  protected readonly chevronIcon = ChevronDown;
  protected readonly checkIcon = Check;

  protected readonly selected = computed(() =>
    this.options().find((option) => option.value === this.value()),
  );
  protected readonly searchable = computed(() => this.options().length >= SEARCH_FROM);
  protected readonly visible = computed(() => {
    const text = this.normalize(this.query());
    return text
      ? this.options().filter((option) => this.normalize(option.label).includes(text))
      : this.options();
  });
  protected readonly activeId = computed(() =>
    this.visible().length ? `${this.listId}-${this.active()}` : null,
  );

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.openPanel();
    }
  }

  protected choose(option: DropdownOption): void {
    this.value.set(option.value);
    this.onChange(option.value);
    this.close();
    this.trigger().nativeElement.focus();
  }

  protected touched(): void {
    if (!this.open()) this.onTouched();
  }

  protected onSearch(text: string): void {
    this.query.set(text);
    this.active.set(0);
  }

  protected onTriggerKey(event: KeyboardEvent): void {
    if (!this.open()) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        this.openPanel();
      }
      return;
    }
    this.onListKey(event);
  }

  protected onListKey(event: KeyboardEvent): void {
    const last = this.visible().length - 1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.active.update((index) => Math.min(index + 1, last));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.active.update((index) => Math.max(index - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        this.active.set(0);
        break;
      case 'End':
        event.preventDefault();
        this.active.set(Math.max(last, 0));
        break;
      case 'Enter': {
        event.preventDefault();
        const option = this.visible()[this.active()];
        if (option) this.choose(option);
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.close();
        this.trigger().nativeElement.focus();
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  protected closeOnOutside(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  private openPanel(): void {
    const index = this.options().findIndex((option) => option.value === this.value());
    this.query.set('');
    this.active.set(Math.max(index, 0));
    this.open.set(true);
    // Foco en el input
    afterNextRender(() => this.search()?.nativeElement.focus(), { injector: this.injector });
  }

  private close(): void {
    this.open.set(false);
    this.onTouched();
  }

  private normalize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
