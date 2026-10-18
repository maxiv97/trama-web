import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LogoIcon } from '../../../shared/components/logo/logo';

@Component({
  selector: 'app-login',
  imports: [LogoIcon, RouterLink, ReactiveFormsModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-trama-sand-50 px-5 py-10">
      <div class="w-full max-w-[400px]">
        <div class="mb-7 flex flex-col items-center">
          <a routerLink="/" aria-label="Volver al inicio"><app-logo-icon [size]="46" /></a>
          <h1 class="mt-3.5 font-display text-2xl font-semibold text-trama-dark">Ingresá a Trama</h1>
          <p class="mt-1.5 text-sm text-trama-muted">Cedentes y comercios</p>
        </div>

        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          novalidate
          class="rounded-[18px] border border-black/[.07] bg-trama-paper p-7 shadow-[0_12px_40px_rgba(0,0,0,.06)]"
        >
          <label for="email" class="mb-1.5 block text-[13px] font-semibold text-trama-dark/80">Email</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            autocomplete="email"
            placeholder="tu@email.com"
            [class]="inputClass"
          />
          @if (showError('email')) {
            <p class="mt-1 text-xs text-status-none">Ingresá un email válido.</p>
          }

          <label for="password" class="mt-4 mb-1.5 block text-[13px] font-semibold text-trama-dark/80"
            >Contraseña</label
          >
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="current-password"
            [class]="inputClass"
          />
          @if (showError('password')) {
            <p class="mt-1 text-xs text-status-none">Ingresá tu contraseña.</p>
          }

          @if (error()) {
            <p class="mt-4 rounded-lg bg-status-none-soft px-3 py-2 text-sm text-status-none" role="alert">
              {{ error() }}
            </p>
          }

          <button
            type="submit"
            [disabled]="loading()"
            class="mt-5 w-full t-btn t-btn-primary"
          >
            {{ loading() ? 'Ingresando…' : 'Ingresar' }}
          </button>
        </form>

        <div class="my-5 flex items-center gap-3">
          <div class="h-px flex-1 bg-black/10"></div>
          <span class="text-[13px] text-trama-muted">¿No tenés cuenta?</span>
          <div class="h-px flex-1 bg-black/10"></div>
        </div>
        <div class="grid grid-cols-2 gap-2.5">
          <a
            routerLink="/register"
            [queryParams]="{ rol: 'cedente' }"
            class="rounded-[10px] border border-trama-dark/20 bg-trama-paper py-2.5 text-center text-[13.5px] font-semibold text-trama-dark hover:bg-trama-sand-100"
            >Soy cedente</a
          >
          <a
            routerLink="/register"
            [queryParams]="{ rol: 'comercio' }"
            class="rounded-[10px] border border-trama-dark/20 bg-trama-paper py-2.5 text-center text-[13.5px] font-semibold text-trama-dark hover:bg-trama-sand-100"
            >Soy comercio</a
          >
        </div>
      </div>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly inputClass =
    'w-full rounded-[10px] border border-black/[.14] bg-trama-sand-100 px-3.5 py-3 text-[15px] text-trama-dark outline-none focus:border-trama-brand focus:ring-2 focus:ring-trama-green-100';

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected showError(field: 'email' | 'password'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  submit(): void {
    if (this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email.trim(), password).subscribe({
      next: (response) => {
        this.router.navigateByUrl(response.user.role === 'consignor' ? '/c' : '/m');
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(
          err.status === 0
            ? 'No pudimos conectarnos con el servidor. Probá de nuevo en unos minutos.'
            : err.status === 400 || err.status === 401
              ? 'El email o la contraseña no son correctos.'
              : 'No pudimos iniciar sesión. Probá de nuevo.',
        );
      },
    });
  }
}
