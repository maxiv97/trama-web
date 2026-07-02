import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Role } from '../../../core/models/user.model';

@Component({
  selector: 'app-login',
  template: `
    <div class="flex min-h-screen items-center justify-center bg-trama-sand-50 p-6">
      <div class="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 class="text-center text-3xl font-semibold text-trama-brand">Trama</h1>
        <p class="mt-2 text-center text-sm text-trama-dark/60">Ingresá para continuar</p>
        <div class="mt-8 space-y-3">
          <button
            type="button"
            (click)="enter('consignor')"
            class="w-full rounded-lg bg-trama-brand px-4 py-2.5 font-medium text-white hover:bg-trama-green-700"
          >
            Entrar como cedente
          </button>
          <button
            type="button"
            (click)="enter('merchant')"
            class="w-full rounded-lg border border-trama-brand px-4 py-2.5 font-medium text-trama-brand hover:bg-trama-green-50"
          >
            Entrar como comercio
          </button>
        </div>
      </div>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  enter(role: Role): void {
    this.auth.loginAs(role);
    this.router.navigateByUrl(role === 'consignor' ? '/c' : '/m');
  }
}
