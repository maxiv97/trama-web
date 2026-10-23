import { Component, computed, DestroyRef, ElementRef, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BookOpen, CircleHelp, LucideAngularModule, Search, X } from 'lucide-angular';
import { HelpAnalytics } from './help-analytics.service';
import { HelpHighlight } from './help-highlight';
import { HelpState } from './help-state.service';
import { FAQS, GUIDES, ROLE_LABEL, topicTitle } from './help.content';
import { HelpHit, queryTerms, searchHelp } from './help.search';

const DEBOUNCE_MS = 150;
const MIN_CHARS = 2;
const MAX_DROPDOWN = 8;

let nextId = 0;

/**
 * Buscador del centro de ayuda (handoff §3). Combobox accesible: ↑ ↓ mueven, Enter abre, Esc cierra.
 * En modo `dropdown` (hub) muestra hasta 8 resultados bajo el campo; en modo `inline` (FAQ) solo
 * emite el término y la página arma la lista completa.
 */
@Component({
  selector: 'app-help-search-box',
  imports: [LucideAngularModule, HelpHighlight],
  styles: `
    .big {
      border-radius: 16px;
      padding-top: 16px;
      padding-bottom: 16px;
      font-size: 17px;
      box-shadow: 0 6px 20px rgba(31, 58, 43, 0.06);
    }
  `,
  host: { class: 'relative block', '(document:click)': 'onDocClick($event)' },
  template: `
    <div class="relative">
      <lucide-angular
        class="pointer-events-none absolute left-[18px] top-0 flex h-full items-center text-trama-muted"
        [img]="searchIcon"
        [size]="large() ? 22 : 18"
        aria-hidden="true"
      />
      <input
        type="text"
        inputmode="search"
        enterkeyhint="search"
        role="combobox"
        autocomplete="off"
        class="t-input w-full !bg-trama-paper"
        [class.big]="large()"
        [style.padding-left.px]="large() ? 66 : 54"
        [style.padding-right.px]="large() ? 50 : 42"
        [attr.aria-label]="label()"
        [attr.aria-expanded]="showList()"
        [attr.aria-controls]="listId"
        [attr.aria-activedescendant]="active() >= 0 && showList() ? listId + '-' + active() : null"
        [placeholder]="placeholder()"
        [value]="text()"
        (input)="onInput($any($event.target).value)"
        (keydown)="onKey($event)"
        (focus)="focused.set(true)"
      />
      @if (text()) {
        <button
          type="button"
          class="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-trama-muted hover:bg-trama-sand-50 hover:text-trama-dark"
          aria-label="Borrar búsqueda"
          (click)="clear()"
        >
          <lucide-angular [img]="xIcon" [size]="18" />
        </button>
      }
    </div>
    @if (mode() === 'dropdown' && showList()) {
      <div class="t-popover t-pop-in absolute inset-x-0 top-[calc(100%+8px)] z-40 overflow-hidden p-2">
        <ul [attr.id]="listId" role="listbox" [attr.aria-label]="'Resultados para ' + query()">
          @for (h of top(); track h.kind + h.id; let i = $index) {
            <li
              role="option"
              [attr.id]="listId + '-' + i"
              [attr.aria-selected]="i === active()"
              class="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[12px] px-3 py-2.5"
              [class.bg-trama-sand-50]="i === active()"
              (mouseenter)="active.set(i)"
              (click)="open(h)"
            >
              <lucide-angular class="mt-0.5 flex shrink-0 text-trama-muted" [img]="h.kind === 'faq' ? faqIcon : guideIcon" [size]="17" aria-hidden="true" />
              <span class="min-w-0 flex-1">
                <span class="block text-[15px] font-semibold leading-snug text-trama-dark">
                  <app-help-highlight [text]="h.title" [terms]="terms()" />
                </span>
                <span class="mt-0.5 block text-[13px] text-trama-muted">{{ meta(h) }}</span>
              </span>
            </li>
          }
        </ul>
        @if (results().length) {
          <button type="button" class="t-link mt-1 block w-full rounded-[10px] px-3 py-2.5 text-left text-sm" (click)="seeAll()">
            Ver todos los resultados ({{ results().length }})
          </button>
        }
      </div>
    }
  `,
})
export class HelpSearchBox {
  private readonly router = inject(Router);
  private readonly state = inject(HelpState);
  private readonly analytics = inject(HelpAnalytics);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly mode = input<'dropdown' | 'inline'>('dropdown');
  readonly large = input(false);
  readonly label = input('Buscar en la ayuda');
  readonly placeholder = input('Buscá por palabra: liquidación, recepción, contraoferta…');
  /** Valor inicial (de ?q=). */
  readonly initial = input('');
  /** Término ya "asentado" (después del debounce), o '' si es más corto que el mínimo. */
  readonly queryChange = output<string>();

  protected readonly listId = `help-search-${nextId++}`;
  protected readonly searchIcon = Search;
  protected readonly xIcon = X;
  protected readonly faqIcon = CircleHelp;
  protected readonly guideIcon = BookOpen;

  protected readonly text = signal('');
  readonly query = signal('');
  protected readonly focused = signal(false);
  protected readonly active = signal(-1);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private initialized = false;

  readonly terms = computed(() => queryTerms(this.query()));
  readonly results = computed<HelpHit[]>(() => searchHelp(this.query(), this.state.role(), FAQS, GUIDES));
  protected readonly top = computed(() => this.results().slice(0, MAX_DROPDOWN));
  protected readonly showList = computed(
    () => this.mode() === 'dropdown' && this.focused() && this.query().length >= MIN_CHARS && this.top().length > 0,
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  ngOnInit(): void {
    if (this.initialized) return;
    this.initialized = true;
    const q = this.initial();
    if (q) {
      this.text.set(q);
      this.query.set(q.trim().length >= MIN_CHARS ? q.trim() : '');
    }
  }

  protected meta(h: HelpHit): string {
    const kind = h.kind === 'faq' ? `Pregunta · ${topicTitle(h.tema ?? '')}` : 'Guía';
    return h.rol === 'comun' ? kind : `${kind} · ${ROLE_LABEL[h.rol]}`;
  }

  protected onInput(value: string): void {
    this.text.set(value);
    this.active.set(-1);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.settle(value), DEBOUNCE_MS);
  }

  private settle(value: string): void {
    const q = value.trim().length >= MIN_CHARS ? value.trim() : '';
    if (q === this.query()) return;
    this.query.set(q);
    if (q && queryTerms(q).length && !this.results().length) {
      this.analytics.track({ type: 'search_no_results', term: q });
    }
    this.queryChange.emit(q);
  }

  protected clear(): void {
    clearTimeout(this.timer);
    this.text.set('');
    this.settle('');
  }

  protected onKey(e: KeyboardEvent): void {
    const n = this.top().length;
    if (e.key === 'ArrowDown' && this.mode() === 'dropdown' && n) {
      e.preventDefault();
      this.focused.set(true);
      this.active.set((this.active() + 1) % n);
    } else if (e.key === 'ArrowUp' && this.mode() === 'dropdown' && n) {
      e.preventDefault();
      this.active.set(this.active() <= 0 ? n - 1 : this.active() - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(this.timer);
      this.settle(this.text());
      const hit = this.top()[this.active()];
      if (this.mode() === 'dropdown') {
        if (hit) this.open(hit);
        else if (this.query()) this.seeAll();
      }
    } else if (e.key === 'Escape') {
      if (this.showList()) {
        e.preventDefault();
        this.focused.set(false);
        this.active.set(-1);
      }
    }
  }

  protected open(h: HelpHit): void {
    this.focused.set(false);
    if (h.kind === 'guia') {
      void this.router.navigate(['/ayuda/guia', h.id], { queryParams: this.roleParam() });
    } else {
      this.state.markViewed(h.id);
      void this.router.navigate(['/ayuda/faq'], { fragment: h.id, queryParams: this.roleParam() });
    }
  }

  protected seeAll(): void {
    this.focused.set(false);
    void this.router.navigate(['/ayuda/faq'], { queryParams: { ...this.roleParam(), q: this.query() } });
  }

  private roleParam(): { rol?: string } {
    const r = this.state.role();
    return r === 'todos' ? {} : { rol: r };
  }

  protected onDocClick(e: Event): void {
    if (!this.host.nativeElement.contains(e.target as Node)) this.focused.set(false);
  }
}
