import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Role } from '../../../core/models/user.model';
import { LogoIcon } from '../../../shared/components/logo/logo';

const DEMO_CREDENTIALS: Record<Role, { email: string; password: string }> = {
  consignor: { email: 'ana@example.com', password: 'trama1234' },
  merchant: { email: 'contacto@tramaboutique.com', password: 'trama1234' },
};

@Component({
  selector: 'app-login',
  imports: [LogoIcon],
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
        <div class="mt-8 space-y-3">
          <button
            type="button"
            (click)="enter('consignor')"
            [disabled]="loading()"
            class="w-full rounded-lg bg-trama-brand px-4 py-2.5 font-medium text-white hover:bg-trama-green-700 disabled:opacity-40"
          >
            Entrar como cedente
          </button>
          <button
            type="button"
            (click)="enter('merchant')"
            [disabled]="loading()"
            class="w-full rounded-lg border border-trama-brand px-4 py-2.5 font-medium text-trama-brand hover:bg-trama-green-50 disabled:opacity-40"
          >
            Entrar como comercio
          </button>
        </div>
        @if (error()) {
          <p class="mt-4 text-center text-sm text-status-none">
            No pudimos iniciar sesión. Verificá que el servidor esté activo.
          </p>
        }
      </div>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal(false);

  enter(role: Role): void {
    if (this.loading()) return;
    const credentials = DEMO_CREDENTIALS[role];
    this.loading.set(true);
    this.error.set(false);
    this.auth.login(credentials.email, credentials.password).subscribe({
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
