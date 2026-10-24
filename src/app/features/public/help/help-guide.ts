import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArrowLeft, ArrowRight, Clock, LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/auth/auth.service';
import { BlobIcon } from '../../../shared/components/blob-icon/blob-icon';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { Stitch } from '../../../shared/components/stitch/stitch';
import { HelpAnalytics } from './help-analytics.service';
import { HelpLayout } from './help-layout';
import { HelpState } from './help-state.service';
import { findGuide, GUIDES, ROLE_LABEL } from './help.content';

/** /ayuda/guia/:slug: pasos numerados, consejo, "¿Te sirvió?" y anterior/siguiente del mismo rol. */
@Component({
  selector: 'app-help-guide',
  imports: [RouterLink, LucideAngularModule, BlobIcon, ErrorState, Stitch, HelpLayout],
  template: `
    <app-help-layout>
      @if (guide(); as g) {
        <article class="mx-auto max-w-[760px] px-4 py-8 sm:px-6 sm:py-12">
          <nav aria-label="Migas" class="text-sm text-trama-muted">
            <ol class="flex flex-wrap items-center gap-1.5">
              <li><a routerLink="/ayuda" [queryParams]="roleParam()" class="hover:text-trama-dark hover:underline">Ayuda</a></li>
              <li aria-hidden="true">/</li>
              <li><a routerLink="/ayuda" [queryParams]="roleParam()" fragment="guias-title" class="hover:text-trama-dark hover:underline">Guías</a></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" class="text-trama-dark">{{ g.titulo }}</li>
            </ol>
          </nav>

          <h1 class="text-title-1 mt-5 text-balance text-trama-dark">{{ g.titulo }}</h1>
          <app-stitch class="mt-3" variant="knot" [width]="120" [animate]="true" [delay]="150" />
          <div class="mt-4 flex flex-wrap items-center gap-3 text-sm text-trama-muted">
            <span class="rounded-full bg-trama-paper px-3 py-1 text-[13px] font-semibold text-trama-body ring-1 ring-trama-sand-100">{{ roleLabel[g.rol] }}</span>
            <span class="inline-flex items-center gap-1.5"><lucide-angular [img]="clockIcon" [size]="15" aria-hidden="true" /> {{ g.minutos }} min de lectura</span>
          </div>

          <ol class="mt-8 space-y-4">
            @for (p of g.pasos; track $index; let i = $index) {
              <li class="t-card flex items-start gap-4 p-4 sm:p-5">
                <app-blob-icon [size]="38" tone="gold" [rotate]="i * 53">
                  <span class="relative font-display text-[15px] font-bold text-trama-dark">{{ i + 1 }}</span>
                </app-blob-icon>
                <p class="pt-1.5 text-[16px] leading-relaxed text-trama-dark">{{ p }}</p>
              </li>
            }
          </ol>

          @if (g.consejo) {
            <aside class="t-summary mt-6">
              <p class="relative text-eyebrow">Consejo</p>
              <p class="relative mt-1.5 text-[15px] leading-relaxed text-trama-dark">{{ g.consejo }}</p>
            </aside>
          }

          @if (screenLink(); as link) {
            <a class="t-btn t-btn-primary mt-7" [routerLink]="link">Ir a la pantalla</a>
          }

          <!-- ¿Te sirvió? -->
          <section class="mt-10 rounded-[18px] bg-trama-paper p-5 ring-1 ring-trama-sand-100" aria-live="polite">
            @switch (feedback()) {
              @case (null) {
                <div class="flex flex-wrap items-center gap-3">
                  <p class="mr-2 text-[15px] font-semibold text-trama-dark">¿Te sirvió esta guía?</p>
                  <button type="button" class="t-btn t-btn-secondary t-btn-sm min-h-[44px] min-w-[64px]" (click)="rate(true)">Sí</button>
                  <button type="button" class="t-btn t-btn-secondary t-btn-sm min-h-[44px] min-w-[64px]" (click)="rate(false)">No</button>
                </div>
              }
              @case (true) {
                <p class="text-[15px] text-trama-dark">¡Gracias! Nos ayuda a saber qué material funciona.</p>
              }
              @case (false) {
                <p class="text-[15px] text-trama-dark">
                  Gracias por avisarnos. Contanos qué te faltó y te respondemos por email.
                </p>
                <a class="t-btn t-btn-primary t-btn-sm mt-3" routerLink="/ayuda/contacto" [queryParams]="{ motivo: g.motivo }">Escribinos</a>
              }
            }
          </section>

          <nav class="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Otras guías">
            @if (prev(); as p) {
              <a class="t-card t-lift flex min-h-[64px] items-center gap-3 p-4" [routerLink]="['/ayuda/guia', p.slug]" [queryParams]="roleParam()">
                <lucide-angular class="flex shrink-0 text-trama-dark" [img]="leftIcon" [size]="18" aria-hidden="true" />
                <span class="min-w-0"><span class="block text-[12px] text-trama-muted">Anterior</span><span class="block font-semibold text-trama-dark">{{ p.titulo }}</span></span>
              </a>
            } @else {
              <span class="hidden sm:block"></span>
            }
            @if (next(); as n) {
              <a class="t-card t-lift flex min-h-[64px] items-center justify-end gap-3 p-4 text-right" [routerLink]="['/ayuda/guia', n.slug]" [queryParams]="roleParam()">
                <span class="min-w-0"><span class="block text-[12px] text-trama-muted">Siguiente</span><span class="block font-semibold text-trama-dark">{{ n.titulo }}</span></span>
                <lucide-angular class="flex shrink-0 text-trama-dark" [img]="rightIcon" [size]="18" aria-hidden="true" />
              </a>
            }
          </nav>
        </article>
      } @else {
        <app-error-state
          title="No encontramos esta guía"
          message="Puede que el enlace esté mal escrito o que la guía ya no exista."
          link="/ayuda"
          linkLabel="Ir al centro de ayuda"
        />
      }
    </app-help-layout>
  `,
})
export class HelpGuide {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly state = inject(HelpState);
  private readonly analytics = inject(HelpAnalytics);

  // Se lee al renderizar: con la carga diferida, el módulo del contenido puede evaluarse después.
  protected get roleLabel() {
    return ROLE_LABEL;
  }
  protected readonly clockIcon = Clock;
  protected readonly leftIcon = ArrowLeft;
  protected readonly rightIcon = ArrowRight;

  private readonly slug = signal('');
  protected readonly feedback = signal<boolean | null>(null);
  protected readonly guide = computed(() => findGuide(this.slug()));

  private readonly siblings = computed(() => {
    const g = this.guide();
    return g ? GUIDES.filter((x) => x.rol === g.rol) : [];
  });
  protected readonly prev = computed(() => {
    const list = this.siblings();
    const i = list.findIndex((x) => x.slug === this.slug());
    return i > 0 ? list[i - 1] : undefined;
  });
  protected readonly next = computed(() => {
    const list = this.siblings();
    const i = list.findIndex((x) => x.slug === this.slug());
    return i >= 0 && i < list.length - 1 ? list[i + 1] : undefined;
  });

  /** Solo con sesión del rol de la guía y si la pantalla no necesita un :id. */
  protected readonly screenLink = computed(() => {
    const g = this.guide();
    const role = this.auth.role();
    if (!g || !role || g.pantalla.includes(':')) return null;
    const matches = (g.rol === 'cedente' && role === 'consignor') || (g.rol === 'comercio' && role === 'merchant');
    return matches ? g.pantalla : null;
  });

  protected readonly roleParam = computed(() => (this.state.role() === 'todos' ? {} : { rol: this.state.role() }));

  constructor() {
    this.state.syncFromUrl(this.route.snapshot.queryParamMap.get('rol'));
    this.route.paramMap.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((p) => {
      this.slug.set(p.get('slug') ?? '');
      this.feedback.set(null);
      this.state.setOrigin(`/ayuda/guia/${this.slug()}`);
      window.scrollTo({ top: 0 });
    });
  }

  protected rate(useful: boolean): void {
    this.feedback.set(useful);
    this.analytics.track({ type: 'guide_feedback', slug: this.slug(), useful });
  }
}
