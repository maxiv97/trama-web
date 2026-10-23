import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LogoIcon } from '../../../shared/components/logo/logo';

/** Marco de las pantallas públicas de ayuda: encabezado con logo y acceso, contenido y pie. */
@Component({
  selector: 'app-help-layout',
  imports: [RouterLink, LogoIcon],
  host: { class: 'block' },
  template: `
    <div class="flex min-h-screen flex-col bg-trama-sand-50 text-trama-dark">
      <header class="border-b border-trama-sand-100 bg-trama-sand-50">
        <div class="mx-auto flex max-w-[1280px] items-center gap-4 px-4 py-4 sm:px-10 lg:px-20">
          <a routerLink="/" class="flex shrink-0 items-center gap-2.5" aria-label="Trama, inicio">
            <app-logo-icon [size]="32" [decorative]="true" />
            <span class="font-display text-[21px] font-bold tracking-[-0.02em]">Trama</span>
          </a>
          <a routerLink="/ayuda" class="ml-1 text-[15px] font-semibold text-trama-body hover:text-trama-dark">Ayuda</a>
          <span class="flex-1"></span>
          @if (panel(); as p) {
            <a [routerLink]="p" class="t-btn t-btn-secondary t-btn-pill t-btn-sm">Ir a mi panel</a>
          } @else {
            <a routerLink="/login" class="t-btn t-btn-secondary t-btn-pill t-btn-sm">Ingresar</a>
          }
        </div>
      </header>
      <main class="flex-1">
        <ng-content />
      </main>
      <footer class="bg-trama-dark text-trama-sand-50/60">
        <div class="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-8 text-[13px] sm:px-10 lg:px-20">
          <div class="flex items-center gap-2 font-display font-bold text-trama-sand-50">
            <app-logo-icon [size]="24" [decorative]="true" /> Trama
          </div>
          <nav class="flex flex-wrap gap-x-5 gap-y-2" aria-label="Ayuda">
            <a routerLink="/ayuda" class="hover:text-trama-sand-50">Centro de ayuda</a>
            <a routerLink="/ayuda/faq" class="hover:text-trama-sand-50">Preguntas frecuentes</a>
            <a routerLink="/ayuda/contacto" class="hover:text-trama-sand-50">Contacto</a>
          </nav>
        </div>
      </footer>
    </div>
  `,
})
export class HelpLayout {
  private readonly auth = inject(AuthService);
  protected readonly panel = computed(() => {
    const role = this.auth.role();
    return role === 'consignor' ? '/c' : role === 'merchant' ? '/m' : null;
  });
}
