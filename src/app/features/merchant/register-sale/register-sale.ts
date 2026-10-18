import { Receipt } from 'lucide-angular';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  forkJoin,
  map,
  Observable,
  of,
  startWith,
  switchMap,
  throwError,
} from 'rxjs';
import { Agreement } from '../../../core/models/agreement.model';
import { Garment } from '../../../core/models/garment.model';
import { Merchant } from '../../../core/models/user.model';
import { AgreementsService } from '../../../core/services/agreements.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { SalesService } from '../../../core/services/sales.service';
import { ConfirmModal } from '../../../shared/components/confirm-modal/confirm-modal';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { calculateConsignorAmount } from '../../../core/utils/price.util';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageSkeleton } from '../../../shared/components/page-skeleton/page-skeleton';

interface SaleData {
  garment: Garment;
  agreement?: Agreement;
  merchant?: Merchant;
}

type PageState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: SaleData };

@Component({
  selector: 'app-register-sale',
  imports: [PageSkeleton, PageHeader, ConfirmModal, MoneyPipe, ErrorState],
  template: `
    @if (isLoading()) {
      <app-page-skeleton layout="form" />
    } @else if (isError()) {
      <app-error-state message="No encontramos esta prenda." link="/m" linkLabel="Volver al panel" />
    } @else if (data(); as d) {
      <div class="mx-auto max-w-lg space-y-6">
        <app-page-header title="Registrar venta" section="Inventario" [icon]="headerIcon" lead="Confirmá el precio de venta. La prenda pasa a liquidación del cedente." />

        <div class="t-card p-4">
          <p class="font-medium text-trama-dark">{{ d.garment.name }}</p>
          <p class="text-sm text-trama-dark/60">
            Precio de venta acordado:
            <span class="text-trama-dark/80">{{ d.agreement?.agreedSalePrice | money }}</span>
          </p>
        </div>

        <div class="t-card space-y-4 p-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-trama-dark"
              >Precio de venta real</label
            >
            <input
              type="number"
              min="1"
              [value]="effectivePrice() || ''"
              (input)="actualSalePrice.set(toNumber($event))"
              class="t-input w-full"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-trama-dark">Fecha de venta</label>
            <input
              type="date"
              [value]="soldAt()"
              (input)="soldAt.set($any($event.target).value)"
              class="t-input w-full"
            />
          </div>

          <div class="rounded-xl bg-trama-sand-50 p-4 text-sm text-trama-dark/80">
            El cedente recibirá
            <span class="font-semibold text-trama-brand">{{ consignorAmount() | money }}</span>
            · Tu comisión:
            <span class="font-semibold text-trama-dark">{{ merchantCommission() | money }}</span>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            type="button"
            (click)="confirming.set(true)"
            [disabled]="!canConfirm() || acting()"
            class="t-btn t-btn-primary"
          >
            {{ acting() ? 'Registrando…' : 'Registrar venta' }}
          </button>
        </div>
      </div>

      <app-confirm-modal
        [open]="confirming()"
        title="Registrar venta"
        body="La prenda quedará marcada como vendida. ¿Confirmás la venta?"
        confirmLabel="Registrar"
        (confirmed)="registerSale()"
        (cancelled)="confirming.set(false)"
      />
    }
  `,
})
export class RegisterSale {
  protected readonly headerIcon = Receipt;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly garmentsService = inject(GarmentsService);
  private readonly agreementsService = inject(AgreementsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly salesService = inject(SalesService);
  private readonly toast = inject(ToastService);

  protected readonly actualSalePrice = signal<number | null>(null);
  protected readonly soldAt = signal(new Date().toISOString().slice(0, 10));
  protected readonly acting = signal(false);
  protected readonly confirming = signal(false);

  private readonly garmentId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.load().pipe(
          map((data): PageState => ({ status: 'loaded', data })),
          startWith<PageState>({ status: 'loading', data: null }),
          catchError((): Observable<PageState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as PageState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected readonly effectivePrice = computed(
    () => this.actualSalePrice() ?? this.data()?.agreement?.agreedSalePrice ?? 0,
  );

  private readonly consignorPercentage = computed(() => {
    const data = this.data();
    if (data?.agreement) return 100 - data.agreement.appliedCommission;
    return data?.merchant?.commissionConfig.consignorPercentage ?? 0;
  });

  protected readonly consignorAmount = computed(() =>
    calculateConsignorAmount(this.effectivePrice(), this.consignorPercentage()),
  );

  protected readonly merchantCommission = computed(
    () => this.effectivePrice() - this.consignorAmount(),
  );

  protected readonly canConfirm = computed(() => this.effectivePrice() > 0);

  protected toNumber(event: Event): number | null {
    const value = (event.target as HTMLInputElement).value;
    return value ? Number(value) : null;
  }

  protected registerSale(): void {
    const data = this.data();
    this.confirming.set(false);
    if (!data || !this.canConfirm() || this.acting()) return;

    const garmentId = data.garment.id;
    const actualSalePrice = this.effectivePrice();

    this.acting.set(true);
    this.salesService
      .create({ garmentId, actualSalePrice, soldAt: this.soldAt() })
      .subscribe({
        next: () => {
          this.toast.show('Venta registrada');
          this.router.navigate(['/m/garment', garmentId]);
        },
        error: () => {
          this.acting.set(false);
          this.toast.show('No pudimos registrar la venta', 'error');
        },
      });
  }

  private load(): Observable<SaleData> {
    const id = this.garmentId();
    return this.garmentsService.getById(id).pipe(
      switchMap((garment) => {
        if (!garment) return throwError(() => new Error(`Prenda no encontrada: ${id}`));
        return forkJoin({
          agreement: this.agreementsService.byGarment(id),
          merchant: garment.merchantId
            ? this.merchantsService.getById(garment.merchantId)
            : of(undefined),
        }).pipe(map(({ agreement, merchant }): SaleData => ({ garment, agreement, merchant })));
      }),
    );
  }
}
