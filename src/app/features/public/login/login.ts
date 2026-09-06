import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LogoIcon } from '../../../shared/components/logo/logo';

interface DemoAccount {
  label: string;
  email: string;
  password: string;
}

interface DemoGroup {
  heading: string;
  accounts: DemoAccount[];
}

const DEMO_GROUPS: DemoGroup[] = [
  {
    heading: 'Cuentas de ejemplo',
    accounts: [
      { label: 'Entrar como cedente (Ana)', email: 'ana@example.com', password: 'trama1234' },
      {
        label: 'Entrar como comercio (Trama Boutique)',
        email: 'contacto@tramaboutique.com',
        password: 'trama1234',
      },
    ],
  },
  {
    heading: 'Comercio de prueba — Segunda Vuelta',
    accounts: [
      {
        label: 'Entrar como cedente (Franco)',
        email: 'franco.ledesma.demo@trama.app',
        password: 'trama1234',
      },
      {
        label: 'Entrar como comercio (Segunda Vuelta)',
        email: 'comercio.demo@segundavuelta.app',
        password: 'trama1234',
      },
    ],
  },
];

@Component({
  selector: 'app-login',
  imports: [LogoIcon, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-trama-sand-50 p-6">
      <div class="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <div class="flex justify-center">
          <app-logo-icon [size]="48" />
        </div>
        <h1 class="mt-3 text-center font-display text-3xl font-semibold text-trama-brand">
          Trama
        </h1>
        <p class="mt-2 text-center text-sm text-trama-dark/60">Ingresá para continuar</p>
        @for (group of demoGroups; track group.heading) {
          <div class="mt-6 first:mt-8">
            <p class="mb-2 text-xs font-medium tracking-wide text-trama-dark/40 uppercase">
              {{ group.heading }}
            </p>
            <div class="space-y-2">
              @for (account of group.accounts; track account.email) {
                <button
                  type="button"
                  (click)="enter(account)"
                  [disabled]="loading()"
                  class="w-full rounded-lg border border-trama-brand px-4 py-2.5 font-medium text-trama-brand hover:bg-trama-green-50 disabled:opacity-40"
                >
                  {{ account.label }}
                </button>
              }
            </div>
          </div>
        }
        @if (error()) {
          <p class="mt-4 text-center text-sm text-status-none">
            No pudimos iniciar sesión. Verificá que el servidor esté activo.
          </p>
        }
        <p class="mt-6 text-center text-sm text-trama-dark/60">
          ¿No tenés cuenta?
          <a routerLink="/register" class="font-medium text-trama-brand hover:underline">Registrarme</a>
        </p>
      </div>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly demoGroups = DEMO_GROUPS;
  protected readonly loading = signal(false);
  protected readonly error = signal(false);

  enter(account: DemoAccount): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(false);
    this.auth.login(account.email, account.password).subscribe({
      next: (response) => {
        this.router.navigateByUrl(response.user.role === 'consignor' ? '/c' : '/m');
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
