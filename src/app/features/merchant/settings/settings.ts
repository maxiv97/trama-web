import { Settings as SettingsIcon } from 'lucide-angular';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Merchant } from '../../../core/models/user.model';
import { MerchantsService } from '../../../core/services/merchants.service';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageSkeleton } from '../../../shared/components/page-skeleton/page-skeleton';
import { HelpTip } from '../../../shared/components/help-tip/help-tip';

@Component({
  selector: 'app-settings',
  imports: [PageSkeleton, PageHeader, ReactiveFormsModule, RouterLink, ErrorState, HelpTip],
  template: `
    @if (loading()) {
      <app-page-skeleton layout="form" />
    } @else if (error()) {
      <app-error-state message="No pudimos cargar la configuración." (retry)="retry()" />
    } @else {
      <form [formGroup]="form" (ngSubmit)="save()" class="mx-auto max-w-2xl space-y-6">
        <app-page-header title="Configuración" section="Configuración" [icon]="headerIcon" lead="Los datos de tu comercio y las condiciones que ven los cedentes.">
          <div actions class="flex gap-3">
            @if (form.dirty) {
              <button
                type="button"
                (click)="discard()"
                class="t-btn t-btn-ghost"
              >
                Descartar cambios
              </button>
            }
            <button
              type="submit"
              [disabled]="form.invalid || form.pristine || saving()"
              class="t-btn t-btn-primary"
            >
              {{ saving() ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </app-page-header>

        <section formGroupName="profile" class="t-card space-y-4 p-5">
          <h2 class="text-title-3 text-trama-dark">Datos del comercio</h2>

          <label class="block">
            <span class="t-label">Nombre del negocio</span>
            <input
              formControlName="businessName"
              class="t-input"
            />
            @if (invalid('profile', 'businessName')) {
              <span class="t-error">Ingresá el nombre del negocio.</span>
            }
          </label>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="t-label">Email</span>
              <input
                formControlName="email"
                type="email"
                class="t-input"
              />
              @if (invalid('profile', 'email')) {
                <span class="t-error">Ingresá un email válido.</span>
              }
            </label>
            <label class="block">
              <span class="t-label">Teléfono</span>
              <input
                formControlName="phone"
                class="t-input"
              />
              @if (invalid('profile', 'phone')) {
                <span class="t-error">Ingresá el teléfono.</span>
              }
            </label>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="t-label">Barrio</span>
              <input
                formControlName="neighborhood"
                class="t-input"
              />
              @if (invalid('profile', 'neighborhood')) {
                <span class="t-error">Ingresá el barrio.</span>
              }
            </label>
            <label class="block">
              <span class="t-label">Ciudad</span>
              <input
                formControlName="city"
                class="t-input"
              />
              @if (invalid('profile', 'city')) {
                <span class="t-error">Ingresá la ciudad.</span>
              }
            </label>
          </div>
        </section>

        <section formGroupName="commission" class="t-card space-y-4 p-5">
          <h2 class="text-title-3 text-trama-dark">Comisión</h2>
          <p class="text-[13px] font-semibold text-trama-body">
            El porcentaje del comercio se calcula como el complemento del cedente.
          </p>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="t-label">% para el cedente</span>
              <input
                formControlName="consignorPercentage"
                type="number"
                min="0"
                max="100"
                class="t-input"
              />
              @if (invalid('commission', 'consignorPercentage')) {
                <span class="t-error">Ingresá un valor entre 0 y 100.</span>
              }
            </label>
            <label class="block">
              <span class="t-label">% para el comercio</span>
              <input
                [value]="merchantPercentage()"
                disabled
                class="mt-1 w-full rounded-lg border border-trama-sand-100 bg-trama-sand-100 px-3 py-2 text-sm text-trama-body"
              />
            </label>
          </div>
        </section>

        <section formGroupName="terms" class="t-card space-y-4 p-5">
          <h2 class="text-title-3 text-trama-dark">Términos de consignación</h2>
          <p class="text-sm text-trama-body">
            Rigen para las propuestas que aceptes desde ahora: cada acuerdo conserva los plazos con
            los que se cerró.
          </p>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label class="block">
              <span class="t-label inline-flex items-center gap-1.5">
                Plazo de entrega (días)
                <app-help-tip
                  label="Ayuda sobre el plazo de entrega"
                  text="Días que tiene el cedente para traer la prenda después del acuerdo. Si no la entrega, el acuerdo vence solo."
                />
              </span>
              <input
                formControlName="deliveryDays"
                type="number"
                min="1"
                max="30"
                class="t-input"
              />
              @if (invalid('terms', 'deliveryDays')) {
                <span class="t-error">Entre 1 y 30 días.</span>
              }
            </label>
            <label class="block">
              <span class="t-label inline-flex items-center gap-1.5">
                Ventana de venta (meses)
                <app-help-tip
                  label="Ayuda sobre la ventana de venta"
                  text="Cuánto tiempo está la prenda a la venta, contado desde que la recibís."
                />
              </span>
              <input
                formControlName="saleWindowMonths"
                type="number"
                min="1"
                class="t-input"
              />
              @if (invalid('terms', 'saleWindowMonths')) {
                <span class="t-error">Mínimo 1 mes.</span>
              }
            </label>
            <label class="block">
              <span class="t-label inline-flex items-center gap-1.5">
                Plazo para retirar (días)
                <app-help-tip
                  label="Ayuda sobre el plazo para retirar"
                  text="Si la prenda no se vende, sale de exhibición y el cedente tiene estos días para retirarla."
                />
              </span>
              <input
                formControlName="pickupDays"
                type="number"
                min="1"
                max="60"
                class="t-input"
              />
              @if (invalid('terms', 'pickupDays')) {
                <span class="t-error">Entre 1 y 60 días.</span>
              }
            </label>
            <label class="block">
              <span class="t-label">Día de pago</span>
              <input
                formControlName="payoutDay"
                type="number"
                min="1"
                max="28"
                class="t-input"
              />
              @if (invalid('terms', 'payoutDay')) {
                <span class="t-error">Entre 1 y 28.</span>
              }
            </label>
          </div>
        </section>

        <section class="t-card flex items-center justify-between gap-3 p-5">
          <div>
            <h2 class="text-title-3 text-trama-dark">Puntos de venta</h2>
            <p class="text-sm text-trama-body">
              {{ salesPointsCount() }}
              {{ salesPointsCount() === 1 ? 'punto configurado' : 'puntos configurados' }}
            </p>
          </div>
          <a
            routerLink="/m/sales-points"
            class="t-btn t-btn-secondary"
          >
            Administrar
          </a>
        </section>
      </form>
    }
  `,
})
export class Settings {
  protected readonly headerIcon = SettingsIcon;
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly saving = signal(false);
  private readonly merchant = signal<Merchant | null>(null);

  protected readonly salesPointsCount = computed(() => this.merchant()?.salesPoints.length ?? 0);

  private readonly reload = new BehaviorSubject<void>(undefined);

  protected readonly form = this.fb.nonNullable.group({
    profile: this.fb.nonNullable.group({
      businessName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      neighborhood: ['', Validators.required],
      city: ['', Validators.required],
    }),
    commission: this.fb.nonNullable.group({
      consignorPercentage: [
        0,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
    }),
    terms: this.fb.nonNullable.group({
      saleWindowMonths: [1, [Validators.required, Validators.min(1)]],
      deliveryDays: [7, [Validators.required, Validators.min(1), Validators.max(30)]],
      pickupDays: [15, [Validators.required, Validators.min(1), Validators.max(60)]],
      payoutDay: [1, [Validators.required, Validators.min(1), Validators.max(28)]],
    }),
  });

  private readonly consignorPercentage = toSignal(
    this.form.controls.commission.controls.consignorPercentage.valueChanges,
    { initialValue: this.form.getRawValue().commission.consignorPercentage },
  );

  protected readonly merchantPercentage = computed(() => {
    const consignor = Number(this.consignorPercentage());
    return Number.isFinite(consignor) ? 100 - consignor : 100;
  });

  constructor() {
    this.reload
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(false);
        }),
        switchMap(() =>
          this.merchantsService.getById(this.auth.user()?.id ?? '').pipe(catchError(() => of(undefined))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((merchant) => {
        this.loading.set(false);
        if (merchant) {
          this.applyToForm(merchant);
        } else {
          this.error.set(true);
        }
      });
  }

  protected retry(): void {
    this.reload.next();
  }

  protected invalid(group: 'profile' | 'commission' | 'terms', control: string): boolean {
    const field = this.form.get([group, control]);
    return !!field && field.invalid && field.touched;
  }

  protected discard(): void {
    const current = this.merchant();
    if (current) {
      this.applyToForm(current);
    }
  }

  protected save(): void {
    const base = this.merchant();
    if (!base || this.form.invalid || this.saving()) return;

    const value = this.form.getRawValue();
    const consignorPercentage = value.commission.consignorPercentage;
    const updated: Merchant = {
      ...base,
      businessName: value.profile.businessName.trim(),
      email: value.profile.email.trim(),
      phone: value.profile.phone.trim(),
      location: {
        ...base.location,
        neighborhood: value.profile.neighborhood.trim(),
        city: value.profile.city.trim(),
      },
      commissionConfig: {
        consignorPercentage,
        merchantPercentage: 100 - consignorPercentage,
      },
      terms: {
        saleWindowMonths: value.terms.saleWindowMonths,
        deliveryDays: value.terms.deliveryDays,
        pickupDays: value.terms.pickupDays,
        payoutDay: value.terms.payoutDay,
      },
    };

    this.saving.set(true);
    this.merchantsService.update(updated).subscribe({
      next: (merchant) => {
        this.saving.set(false);
        this.applyToForm(merchant);
        this.toast.show('Configuración guardada');
      },
      error: () => {
        this.saving.set(false);
        this.toast.show('No pudimos guardar la configuración', 'error');
      },
    });
  }

  private applyToForm(merchant: Merchant): void {
    this.merchant.set(merchant);
    this.form.reset({
      profile: {
        businessName: merchant.businessName,
        email: merchant.email,
        phone: merchant.phone,
        neighborhood: merchant.location.neighborhood,
        city: merchant.location.city,
      },
      commission: { consignorPercentage: merchant.commissionConfig.consignorPercentage },
      terms: {
        saleWindowMonths: merchant.terms.saleWindowMonths,
        deliveryDays: merchant.terms.deliveryDays ?? 7,
        pickupDays: merchant.terms.pickupDays ?? 15,
        payoutDay: merchant.terms.payoutDay,
      },
    });
  }
}
