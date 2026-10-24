import { afterNextRender, Component, computed, DestroyRef, inject, Injector, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArrowRight, BookOpen, Clock, LucideAngularModule } from 'lucide-angular';
import { BlobIcon } from '../../../shared/components/blob-icon/blob-icon';
import { Stitch } from '../../../shared/components/stitch/stitch';
import { Segmented } from '../../../shared/components/tabs/tabs';
import { ROLE_OPTIONS } from './help-roles';
import { HelpLayout } from './help-layout';
import { HelpNoResults } from './help-no-results';
import { HelpSearchBox } from './help-search-box';
import { HelpState } from './help-state.service';
import {
  FAQS,
  findGuide,
  GUIDES,
  matchesRole,
  RECORRIDO,
  ROLE_LABEL,
  STAGES,
  TOPICS,
} from './help.content';
import { queryTerms, searchHelp } from './help.search';

/** /ayuda: buscador, selector de rol, recorrido, guías, temas de FAQ y acceso al contacto. */
@Component({
  selector: 'app-help-hub',
  imports: [RouterLink, LucideAngularModule, BlobIcon, Stitch, Segmented, HelpLayout, HelpSearchBox, HelpNoResults],
  template: `
    <app-help-layout>
      <!-- 1. Encabezado + buscador -->
      <section class="mx-auto max-w-[1280px] px-4 pb-8 pt-10 sm:px-10 sm:pt-14 lg:px-20">
        <div class="mx-auto max-w-[760px] text-center">
          <p class="text-eyebrow">Ayuda</p>
          <h1 class="text-title-1 mt-2 text-balance text-trama-dark">¿En qué te ayudamos?</h1>
          <app-stitch class="mx-auto mt-3" variant="knot" [width]="140" [animate]="true" [delay]="150" />
          <app-help-search-box class="mt-7 text-left" [large]="true" [initial]="initialQ" (queryChange)="onQuery($event)" />
          <!-- 2. Selector de rol -->
          <div class="mt-5 flex flex-col items-center gap-2">
            <span class="text-sm text-trama-muted" id="help-role-label">Mostrar ayuda para</span>
            <app-segmented
              ariaLabel="Mostrar ayuda para"
              [onPage]="true"
              [options]="roleOptions"
              [value]="state.role()"
              (valueChange)="state.setRole($event)"
            />
          </div>
        </div>
        @if (noResults()) {
          <app-help-no-results class="mx-auto mt-8 max-w-[640px]" [query]="query()" />
        }
      </section>

      <!-- 3. Cómo funciona -->
      <section class="bg-trama-paper" aria-labelledby="recorrido-title">
        <div class="mx-auto max-w-[1280px] px-4 py-12 sm:px-10 lg:px-20">
          <p class="text-eyebrow">Cómo funciona</p>
          <h2 id="recorrido-title" class="text-title-2 mt-2 text-trama-dark sm:text-[28px]">{{ recorrido.titulo }}</h2>
          <p class="text-lead mt-2 max-w-[62ch] text-trama-body">{{ recorrido.bajada }}</p>

          <ol class="stages relative mt-9 grid gap-7 md:grid-cols-5 md:gap-5">
            <!-- Puntada que une las etapas: horizontal en desktop, vertical en mobile -->
            <div class="pointer-events-none absolute left-[22px] right-[19%] top-[18px] hidden md:block" aria-hidden="true">
              <app-stitch variant="faint" />
            </div>
            <div class="pointer-events-none absolute bottom-6 left-[21px] top-6 border-l-[3px] border-dashed border-trama-thread-faint md:hidden" aria-hidden="true"></div>
            @for (s of stages; track s.id; let i = $index) {
              <li class="relative flex gap-4 md:flex-col md:gap-3">
                <app-blob-icon class="z-[1]" [size]="44" tone="gold" [rotate]="i * 37">
                  <span class="relative font-display text-[17px] font-bold text-trama-dark">{{ i + 1 }}</span>
                </app-blob-icon>
                <div class="min-w-0 flex-1">
                  <h3 class="text-title-3 text-trama-dark">{{ s.titulo }}</h3>
                  @if (state.role() === 'todos') {
                    <p class="mt-2 text-[14px] leading-relaxed text-trama-body"><span class="font-bold text-trama-dark">Cedente.</span> {{ s.cedente }}</p>
                    <p class="mt-2 text-[14px] leading-relaxed text-trama-body"><span class="font-bold text-trama-dark">Comercio.</span> {{ s.comercio }}</p>
                  } @else {
                    <p class="mt-2 text-[15px] leading-relaxed text-trama-body">{{ state.role() === 'cedente' ? s.cedente : s.comercio }}</p>
                  }
                  @if (stageGuides(s.guias).length) {
                    <ul class="mt-3 space-y-1.5">
                      @for (g of stageGuides(s.guias); track g.slug) {
                        <li>
                          <a class="t-link inline-flex min-h-[28px] items-center gap-1.5 text-sm" [routerLink]="['/ayuda/guia', g.slug]" [queryParams]="roleParam()">
                            <lucide-angular [img]="guideIcon" [size]="14" aria-hidden="true" /> {{ g.titulo }}
                          </a>
                        </li>
                      }
                    </ul>
                  }
                </div>
              </li>
            }
          </ol>
        </div>
      </section>

      <!-- 4. Guías -->
      <section class="mx-auto max-w-[1280px] px-4 py-12 sm:px-10 lg:px-20" aria-labelledby="guias-title">
        <p class="text-eyebrow">Paso a paso</p>
        <h2 id="guias-title" class="text-title-2 mt-2 text-trama-dark sm:text-[28px]">Guías por tarea</h2>
        <div class="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (g of guides(); track g.slug) {
            <a class="t-card t-lift group flex min-h-[132px] flex-col p-5" [routerLink]="['/ayuda/guia', g.slug]" [queryParams]="roleParam()">
              <span class="inline-flex self-start rounded-full bg-trama-sand-50 px-2.5 py-0.5 text-[12px] font-semibold text-trama-body">{{ roleLabel[g.rol] }}</span>
              <span class="text-title-3 mt-3 text-trama-dark">{{ g.titulo }}</span>
              <span class="mt-auto flex items-center justify-between pt-4 text-[13px] text-trama-muted">
                <span class="inline-flex items-center gap-1.5"><lucide-angular [img]="clockIcon" [size]="14" aria-hidden="true" /> {{ g.minutos }} min de lectura</span>
                <lucide-angular class="flex text-trama-dark transition-transform duration-150 group-hover:translate-x-1" [img]="arrowIcon" [size]="18" aria-hidden="true" />
              </span>
            </a>
          }
        </div>
      </section>

      <!-- 5. Preguntas frecuentes por tema -->
      <section class="bg-trama-paper" aria-labelledby="faq-title">
        <div class="mx-auto max-w-[1280px] px-4 py-12 sm:px-10 lg:px-20">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p class="text-eyebrow">Preguntas frecuentes</p>
              <h2 id="faq-title" class="text-title-2 mt-2 text-trama-dark sm:text-[28px]">Buscá por tema</h2>
            </div>
            <a class="t-link text-[15px]" routerLink="/ayuda/faq" [queryParams]="roleParam()">Ver todas las preguntas</a>
          </div>
          <div class="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (t of topics(); track t.id) {
              <a class="t-lift group flex min-h-[96px] flex-col justify-between rounded-[18px] bg-trama-sand-50 p-5" routerLink="/ayuda/faq" [fragment]="t.id" [queryParams]="roleParam()">
                <span class="text-[16px] font-bold leading-snug text-trama-dark">{{ t.titulo }}</span>
                <span class="mt-3 text-[13px] text-trama-muted">{{ t.count }} {{ t.count === 1 ? 'pregunta' : 'preguntas' }}</span>
              </a>
            }
          </div>
        </div>
      </section>

      <!-- 6. Cierre -->
      <section class="mx-auto max-w-[1280px] px-4 py-14 sm:px-10 lg:px-20">
        <div class="t-summary flex flex-col items-start justify-between gap-5 !p-7 sm:flex-row sm:items-center sm:!p-9">
          <div class="relative">
            <h2 class="text-title-2 text-trama-dark">¿No encontraste lo que buscabas?</h2>
            <p class="mt-1.5 text-[15px] text-trama-body">Contanos tu consulta y te respondemos por email.</p>
          </div>
          <a class="t-btn t-btn-primary t-btn-pill relative" routerLink="/ayuda/contacto">Escribinos</a>
        </div>
      </section>
    </app-help-layout>
  `,
})
export class HelpHub implements OnInit {
  protected readonly state = inject(HelpState);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  // Se leen al renderizar y no al construir el componente: con la carga diferida, el módulo del
  // contenido puede terminar de evaluarse después que este (pasaba en las pruebas unitarias).
  protected get roleOptions() {
    return ROLE_OPTIONS;
  }
  protected get roleLabel() {
    return ROLE_LABEL;
  }
  protected get recorrido() {
    return RECORRIDO;
  }
  protected get stages() {
    return STAGES;
  }
  protected readonly guideIcon = BookOpen;
  protected readonly clockIcon = Clock;
  protected readonly arrowIcon = ArrowRight;

  protected initialQ = '';
  protected readonly query = signal('');

  protected readonly roleParam = computed(() => (this.state.role() === 'todos' ? {} : { rol: this.state.role() }));
  protected readonly guides = computed(() => GUIDES.filter((g) => matchesRole(g.rol, this.state.role())));
  protected readonly topics = computed(() =>
    TOPICS.map((t) => ({
      ...t,
      count: FAQS.filter((f) => f.tema === t.id && matchesRole(f.rol, this.state.role())).length,
    })).filter((t) => t.count > 0),
  );
  protected readonly noResults = computed(() => {
    const q = this.query();
    return !!q && queryTerms(q).length > 0 && searchHelp(q, this.state.role(), FAQS, GUIDES).length === 0;
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.state.syncFromUrl(params.get('rol'));
    this.state.setOrigin('/ayuda');
    this.initialQ = params.get('q') ?? '';
    this.query.set(this.initialQ.trim().length >= 2 ? this.initialQ.trim() : '');
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => this.state.applyUrlRole(p.get('rol')));
    // Anclas internas (p. ej. "Guías" desde las migas de una guía), con window.scrollTo.
    this.route.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((f) => {
      if (!f) return;
      afterNextRender(
        () => {
          const el = document.getElementById(f);
          if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 24 });
        },
        { injector: this.injector },
      );
    });
  }

  protected stageGuides(slugs: string[]) {
    return slugs
      .map((s) => findGuide(s))
      .filter((g) => !!g && matchesRole(g.rol, this.state.role()))
      .map((g) => g!);
  }

  protected onQuery(q: string): void {
    this.query.set(q);
    void this.router.navigate([], {
      queryParams: { q: q || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
