import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArrowRight, BookOpen, LucideAngularModule } from 'lucide-angular';
import { Segmented } from '../../../shared/components/tabs/tabs';
import { HelpFaqItem } from './help-faq-item';
import { ROLE_OPTIONS } from './help-roles';
import { HelpLayout } from './help-layout';
import { HelpNoResults } from './help-no-results';
import { HelpSearchBox } from './help-search-box';
import { HelpState } from './help-state.service';
import { Faq, FAQS, findFaq, findGuide, GUIDES, matchesRole, ROLE_LABEL, TOPICS } from './help.content';
import { queryTerms, searchHelp } from './help.search';

/**
 * /ayuda/faq: todas las preguntas agrupadas por tema, con buscador y selector de rol fijos arriba.
 * El hash abre y enfoca una pregunta (#id) o lleva a un tema (#tema). Abrir una pregunta actualiza
 * el hash con history.replaceState, sin forzar el scroll.
 */
@Component({
  selector: 'app-help-faq',
  imports: [RouterLink, LucideAngularModule, Segmented, HelpFaqItem, HelpLayout, HelpNoResults, HelpSearchBox],
  template: `
    <app-help-layout>
      <!-- Buscador + rol, fijos -->
      <div #bar class="sticky top-0 z-30 border-b border-trama-sand-100 bg-trama-sand-50/95 backdrop-blur">
        <div class="mx-auto flex max-w-[1280px] flex-col gap-3 px-4 py-3 sm:px-10 md:flex-row md:items-center lg:px-20">
          <app-help-search-box class="min-w-0 flex-1" mode="inline" [initial]="initialQ" (queryChange)="onQuery($event)" />
          <app-segmented
            class="self-start md:self-auto"
            ariaLabel="Mostrar ayuda para"
            [onPage]="true"
            [options]="roleOptions"
            [value]="state.role()"
            (valueChange)="state.setRole($event)"
          />
        </div>
      </div>

      <div class="mx-auto max-w-[1280px] px-4 pb-16 pt-8 sm:px-10 lg:px-20">
        <nav aria-label="Migas" class="text-sm text-trama-muted">
          <a routerLink="/ayuda" [queryParams]="roleParam()" class="hover:text-trama-dark hover:underline">Ayuda</a>
          <span aria-hidden="true"> / </span><span class="text-trama-dark">Preguntas frecuentes</span>
        </nav>

        @if (query()) {
          <!-- Resultados de búsqueda -->
          <h1 class="text-title-2 mt-4 text-trama-dark">Resultados para «{{ query() }}»</h1>
          @if (hasTerms() && (faqHits().length || guideHits().length)) {
            <p class="mt-1 text-sm text-trama-muted">{{ faqHits().length + guideHits().length }} resultados</p>
            <div class="mt-6 max-w-[820px] space-y-3">
              @for (f of faqHits(); track f.id) {
                <app-help-faq-item [faq]="f" [open]="isOpen(f.id)" [terms]="terms()" [showRole]="state.role() === 'todos'" (toggle)="toggle(f.id, $event)" />
              }
              @for (g of guideHits(); track g.slug) {
                <a class="t-card t-lift flex min-h-[56px] items-center gap-3 px-5 py-4" [routerLink]="['/ayuda/guia', g.slug]" [queryParams]="roleParam()">
                  <lucide-angular class="flex shrink-0 text-trama-muted" [img]="guideIcon" [size]="18" aria-hidden="true" />
                  <span class="min-w-0 flex-1">
                    <span class="block font-semibold text-trama-dark">Guía: {{ g.titulo }}</span>
                    <span class="block text-[13px] text-trama-muted">{{ roleLabel[g.rol] }} · {{ g.minutos }} min</span>
                  </span>
                  <lucide-angular class="flex shrink-0 text-trama-dark" [img]="arrowIcon" [size]="18" aria-hidden="true" />
                </a>
              }
            </div>
          } @else {
            <app-help-no-results class="mt-6 block max-w-[640px]" [query]="query()" />
          }
        } @else {
          <h1 class="text-title-1 mt-4 text-trama-dark">Preguntas frecuentes</h1>

          <!-- Temas: chips en mobile -->
          <div class="-mx-4 mt-5 overflow-x-auto px-4 lg:hidden">
            <div class="flex w-max gap-2 pb-1">
              @for (t of topics(); track t.id) {
                <button type="button" class="t-chip min-h-[44px]" (click)="scrollToId(t.id)">
                  {{ t.titulo }} <span class="t-chip-count">{{ t.faqs.length }}</span>
                </button>
              }
            </div>
          </div>

          <div class="mt-6 lg:grid lg:grid-cols-[230px_1fr] lg:gap-10">
            <!-- Índice lateral en desktop -->
            <aside class="hidden lg:block">
              <nav class="sticky" [style.top.px]="barHeight() + 24" aria-label="Temas">
                <p class="text-eyebrow mb-3">Temas</p>
                <ul class="space-y-1">
                  @for (t of topics(); track t.id) {
                    <li>
                      <button
                        type="button"
                        class="flex min-h-[40px] w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-left text-[14px] font-semibold text-trama-body hover:bg-trama-paper hover:text-trama-dark"
                        (click)="scrollToId(t.id)"
                      >
                        {{ t.titulo }} <span class="text-[12px] font-bold text-trama-muted">{{ t.faqs.length }}</span>
                      </button>
                    </li>
                  }
                </ul>
                <a routerLink="/ayuda/contacto" class="t-link mt-5 inline-block px-3 text-sm">¿No está tu pregunta? Escribinos</a>
              </nav>
            </aside>

            <div class="max-w-[820px] space-y-10">
              @for (t of topics(); track t.id) {
                <section [attr.id]="t.id" [attr.aria-labelledby]="'tema-' + t.id">
                  <h2 [attr.id]="'tema-' + t.id" class="text-title-3 mb-3 text-trama-dark">{{ t.titulo }}</h2>
                  <div class="space-y-3">
                    @for (f of t.faqs; track f.id) {
                      <app-help-faq-item [faq]="f" [open]="isOpen(f.id)" [showRole]="state.role() === 'todos'" (toggle)="toggle(f.id, $event)" />
                    }
                  </div>
                </section>
              }
              <div class="t-summary flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p class="relative text-[15px] font-semibold text-trama-dark">¿No encontraste tu pregunta?</p>
                <a class="t-btn t-btn-primary t-btn-sm relative" routerLink="/ayuda/contacto">Escribinos</a>
              </div>
            </div>
          </div>
        }
      </div>
    </app-help-layout>
  `,
})
export class HelpFaq implements OnInit {
  protected readonly state = inject(HelpState);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly bar = viewChild<ElementRef<HTMLElement>>('bar');

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly roleLabel = ROLE_LABEL;
  protected readonly guideIcon = BookOpen;
  protected readonly arrowIcon = ArrowRight;

  protected initialQ = '';
  protected readonly query = signal('');
  private readonly openIds = signal<ReadonlySet<string>>(new Set());
  protected readonly barHeight = signal(120);

  protected readonly roleParam = computed(() => (this.state.role() === 'todos' ? {} : { rol: this.state.role() }));
  protected readonly topics = computed(() =>
    TOPICS.map((t) => ({
      ...t,
      faqs: FAQS.filter((f) => f.tema === t.id && matchesRole(f.rol, this.state.role())),
    })).filter((t) => t.faqs.length > 0),
  );

  protected readonly terms = computed(() => queryTerms(this.query()));
  protected readonly hasTerms = computed(() => this.terms().length > 0);
  private readonly hits = computed(() => searchHelp(this.query(), this.state.role(), FAQS, GUIDES));
  protected readonly faqHits = computed(() =>
    this.hits()
      .filter((h) => h.kind === 'faq')
      .map((h) => findFaq(h.id))
      .filter((f): f is Faq => !!f),
  );
  protected readonly guideHits = computed(() =>
    this.hits()
      .filter((h) => h.kind === 'guia')
      .map((h) => findGuide(h.id)!)
      .filter(Boolean),
  );

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.state.syncFromUrl(params.get('rol'));
    this.initialQ = params.get('q') ?? '';
    this.query.set(this.initialQ.trim().length >= 2 ? this.initialQ.trim() : '');
    this.state.setOrigin('/ayuda/faq');

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => this.state.applyUrlRole(p.get('rol')));
    this.route.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((f) => this.handleHash(f));
  }

  protected isOpen(id: string): boolean {
    return this.openIds().has(id);
  }

  protected toggle(id: string, open: boolean): void {
    const next = new Set(this.openIds());
    if (open) next.add(id);
    else next.delete(id);
    this.openIds.set(next);
    if (open) {
      this.state.markViewed(id);
      history.replaceState(history.state, '', `${location.pathname}${location.search}#${id}`);
    }
  }

  protected onQuery(q: string): void {
    this.query.set(q);
    void this.router.navigate([], {
      queryParams: { q: q || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Desplaza con window.scrollTo (no scrollIntoView) descontando la barra fija. */
  protected scrollToId(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = (this.bar()?.nativeElement.offsetHeight ?? 0) + 16;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
  }

  private handleHash(hash: string | null): void {
    if (!hash) return;
    const faq = findFaq(hash);
    if (faq) {
      // Si la pregunta es del otro rol, se muestra todo para que el enlace no quede vacío.
      if (!matchesRole(faq.rol, this.state.role())) this.state.setRole('todos');
      this.openIds.set(new Set([...this.openIds(), faq.id]));
      this.state.markViewed(faq.id);
    } else if (!TOPICS.some((t) => t.id === hash)) {
      return; // Hash inexistente: se ignora y la lista queda sin abrir.
    }
    afterNextRender(
      () => {
        this.barHeight.set(this.bar()?.nativeElement.offsetHeight ?? 120);
        const el = document.getElementById(hash);
        if (!el) return;
        const offset = (this.bar()?.nativeElement.offsetHeight ?? 0) + 16;
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset });
        (el.querySelector('button') as HTMLElement | null)?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
}
