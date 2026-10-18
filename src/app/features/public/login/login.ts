import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Stitch } from '../../../shared/components/stitch/stitch';
import { LogoIcon } from '../../../shared/components/logo/logo';

@Component({
  selector: 'app-login',
  imports: [Stitch, LogoIcon, RouterLink, ReactiveFormsModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-trama-sand-50 px-5 py-10">
      <div class="w-full max-w-[400px]">
        <div class="mb-7 flex flex-col items-center">
          <a routerLink="/" aria-label="Volver al inicio"><app-logo-icon [size]="46" /></a>
          <h1 class="text-title-2 mt-4 text-trama-dark">Ingresá a Trama</h1>
          <app-stitch class="mt-2" variant="knot" [width]="120" [animate]="true" [delay]="200" />
          <p class="mt-2 text-sm text-trama-body">Cedentes y comercios</p>
        </div>

        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          novalidate
          class="t-card-raised p-7"
        >
          <label for="email" class="t-label">Email</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            autocomplete="email"
            placeholder="tu@email.com"
            [class]="inputClass"
          />
          @if (showError('email')) {
            <p class="t-error">Ingresá un email válido.</p>
          }

          <label for="password" class="t-label mt-4">Contraseña</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="current-password"
            [class]="inputClass"
          />
          @if (showError('password')) {
            <p class="t-error">Ingresá tu contraseña.</p>
          }

          @if (error()) {
            <p class="t-alert mt-4" role="alert">
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
          <app-stitch class="flex-1" variant="baste" />
          <span class="text-[13px] text-trama-muted">¿No tenés cuenta?</span>
          <app-stitch class="flex-1" variant="baste" />
        </div>
        <div class="grid grid-cols-2 gap-2.5">
          <a
            routerLink="/register"
            [queryParams]="{ rol: 'cedente' }"
            class="t-btn t-btn-secondary t-btn-pill"
            >Soy cedente</a
          >
          <a
            routerLink="/register"
            [queryParams]="{ rol: 'comercio' }"
            class="t-btn t-btn-secondary t-btn-pill"
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
    't-input';

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
