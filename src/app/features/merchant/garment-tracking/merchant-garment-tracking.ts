import { Route } from 'lucide-angular';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
import { Proposal } from '../../../core/models/proposal.model';
import { Reception } from '../../../core/models/reception.model';
import { PAYMENT_METHOD_LABELS } from '../../../core/models/sale.labels';
import { PaymentMethod, Sale } from '../../../core/models/sale.model';
import { SalesPoint } from '../../../core/models/sales-point.model';
import { Consignor, Merchant } from '../../../core/models/user.model';
import { AgreementsService } from '../../../core/services/agreements.service';
import { ConsignorsService } from '../../../core/services/consignors.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { PayoutsService } from '../../../core/services/payouts.service';
import { ReceptionsService } from '../../../core/services/receptions.service';
import { SalesService } from '../../../core/services/sales.service';
import { ConfirmModal } from '../../../shared/components/confirm-modal/confirm-modal';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { PhotoGallery } from '../../../shared/components/photo-gallery/photo-gallery';
import { ProgressTracker } from '../../../shared/components/progress-tracker/progress-tracker';
import { ReceptionRemarks } from '../../../shared/components/reception-remarks/reception-remarks';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { Timeline } from '../../../shared/components/timeline/timeline';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageSkeleton } from '../../../shared/components/page-skeleton/page-skeleton';

interface TrackingData {
  garment: Garment;
  proposal?: Proposal;
  agreement?: Agreement;
  consignor?: Consignor;
  merchant?: Merchant;
  salesPoint?: SalesPoint;
  reception?: Reception;
  sale?: Sale;
}

type TrackingState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: TrackingData };

@Component({
  selector: 'app-merchant-garment-tracking',
  imports: [PageSkeleton, PageHeader, 
    RouterLink,
    PhotoGallery,
    ProgressTracker,
    ReceptionRemarks,
    Timeline,
    StatusBadge,
    ConfirmModal,
    MoneyPipe,
    ShortDatePipe,
    ErrorState,
  ],
  template: `
    @if (isLoading()) {
      <app-page-skeleton layout="detail" />
    } @else if (isError()) {
      <app-error-state message="No encontramos esta prenda." link="/m" linkLabel="Volver al panel" />
    } @else if (data(); as d) {
      <div class="space-y-6">
        <app-page-header [title]="d.garment.name" section="Seguimiento" [icon]="headerIcon">
          <div lead class="mt-3 flex flex-wrap items-center gap-3">
            <app-status-badge [status]="d.garment.status" />
            <span class="text-sm text-trama-muted">Cargada el {{ d.garment.createdAt | shortDate }}</span>
          </div>
        </app-page-header>

        <div class="grid gap-6 md:grid-cols-3">
          <div class="md:col-span-1">
            <app-photo-gallery [photos]="d.garment.photos" />
          </div>

          <div class="space-y-6 md:col-span-2">
            <div class="grid grid-cols-2 gap-4">
              <div class="t-card p-4">
                <p class="text-xs text-trama-dark/50">Precio del cedente</p>
                <p class="mt-1 text-lg font-semibold text-trama-dark">
                  {{ d.proposal?.requestedConsignorPrice | money }}
                </p>
              </div>
              <div class="t-card p-4">
                <p class="text-xs text-trama-dark/50">Precio de venta acordado</p>
                <p class="mt-1 text-lg font-semibold text-trama-dark">
                  {{ d.agreement?.agreedSalePrice | money }}
                </p>
              </div>
            </div>

            <div class="t-card p-4">
              <p class="text-xs text-trama-dark/50">Cedente</p>
              <p class="mt-1 text-sm text-trama-dark">
                {{ d.consignor?.name ?? '—' }}
                @if (d.consignor?.dni) {
                  <span class="text-trama-dark/50">· DNI {{ d.consignor?.dni }}</span>
                }
              </p>
            </div>

            <div class="t-card p-4">
              <app-progress-tracker [currentStatus]="d.garment.status" />
            </div>

            @switch (d.garment.status) {
              @case ('agreed') {
                <div class="space-y-3 rounded-2xl border border-status-agreed/20 bg-status-agreed-soft p-5">
                  <p class="text-sm font-medium text-trama-dark">
                    Acuerdo confirmado. Cuando recibas la prenda, registrá la recepción.
                  </p>
                  <a
                    [routerLink]="['/m/garment', d.garment.id, 'reception']"
                    class="t-btn t-btn-primary"
                    >Registrar recepción</a
                  >
                </div>
              }
              @case ('in_stock') {
                <div class="space-y-3 rounded-2xl border border-status-agreed/20 bg-status-agreed-soft p-5">
                  <p class="text-sm font-medium text-trama-dark">La prenda está en stock.</p>
                  <a
                    [routerLink]="['/m/garment', d.garment.id, 'sale']"
                    class="t-btn t-btn-primary"
                    >Registrar venta</a
                  >
                </div>
              }
              @case ('with_remarks') {
                <div class="space-y-3 rounded-2xl border border-status-pending/20 bg-status-pending-soft p-5">
                  <p class="text-sm font-medium text-trama-dark">Recibida con observaciones.</p>
                  @if (d.reception; as reception) {
                    <app-reception-remarks [reception]="reception" />
                  }
                  <a
                    [routerLink]="['/m/garment', d.garment.id, 'sale']"
                    class="t-btn t-btn-primary"
                    >Registrar venta</a
                  >
                </div>
              }
              @case ('rejected') {
                <div class="space-y-2 rounded-2xl border border-status-none/20 bg-status-none-soft p-5">
                  <p class="text-sm font-medium text-trama-dark">
                    Recepción rechazada. La prenda se devuelve al cedente.
                  </p>
                  @if (d.reception; as reception) {
                    <app-reception-remarks [reception]="reception" />
                  }
                </div>
              }
              @case ('sold') {
                <div class="space-y-4 rounded-2xl border border-status-sold/20 bg-status-sold-soft p-5">
                  <p class="text-sm font-medium text-trama-dark">Prenda vendida.</p>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-xs text-trama-dark/50">Le corresponde al cedente</p>
                      <p class="text-lg font-semibold text-trama-dark">
                        {{ settlementConsignor() | money }}
                      </p>
                    </div>
                    <div>
                      <p class="text-xs text-trama-dark/50">Tu comisión</p>
                      <p class="text-lg font-semibold text-trama-dark">
                        {{ settlementMerchant() | money }}
                      </p>
                    </div>
                  </div>
                  @if (!payingOut()) {
                    <button
                      type="button"
                      (click)="payingOut.set(true)"
                      class="t-btn t-btn-primary"
                    >
                      Marcar liquidación pagada
                    </button>
                  } @else {
                    <div class="space-y-3 rounded-xl border border-trama-sand-200 bg-trama-paper p-4">
                      <div>
                        <label class="mb-1 block text-sm font-medium text-trama-dark"
                          >Método de pago</label
                        >
                        <select
                          [value]="paymentMethod()"
                          (change)="paymentMethod.set($any($event.target).value)"
                          class="t-input w-full"
                        >
                          <option value="transfer">Transferencia</option>
                          <option value="cash">Efectivo</option>
                        </select>
                      </div>
                      <div>
                        <label class="mb-1 block text-sm font-medium text-trama-dark"
                          >Nº de comprobante</label
                        >
                        <input
                          type="text"
                          [value]="receiptNumber()"
                          (input)="receiptNumber.set($any($event.target).value)"
                          placeholder="Opcional"
                          class="t-input w-full"
                        />
                      </div>
                      <div class="flex gap-3">
                        <button
                          type="button"
                          (click)="confirmingPayout.set(true)"
                          [disabled]="acting()"
                          class="t-btn t-btn-primary"
                        >
                          {{ acting() ? 'Registrando…' : 'Registrar pago' }}
                        </button>
                        <button
                          type="button"
                          (click)="payingOut.set(false)"
                          [disabled]="acting()"
                          class="t-btn t-btn-secondary"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
              @case ('paid_out') {
                <div class="t-card space-y-2 p-5">
                  <p class="text-sm font-medium text-trama-dark">Liquidación pagada.</p>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-xs text-trama-dark/50">Le pagaste al cedente</p>
                      <p class="text-lg font-semibold text-trama-dark">
                        {{ settlementConsignor() | money }}
                      </p>
                    </div>
                    <div>
                      <p class="text-xs text-trama-dark/50">Tu comisión</p>
                      <p class="text-lg font-semibold text-trama-dark">
                        {{ settlementMerchant() | money }}
                      </p>
                    </div>
                  </div>
                  @if (d.sale; as sale) {
                    @if (sale.paidAt) {
                      <p class="text-sm text-trama-dark/70">
                        {{ methodLabel(sale.paymentMethod) }}
                        @if (sale.receiptNumber) {
                          · Comp. {{ sale.receiptNumber }}
                        }
                        · {{ sale.paidAt | shortDate }}
                      </p>
                    }
                  }
                </div>
              }
              @case ('under_review') {
                <div class="rounded-2xl bg-trama-sand-50 p-5">
                  <p class="text-sm text-trama-dark/70">Propuesta en revisión.</p>
                </div>
              }
              @case ('counteroffer') {
                <div class="rounded-2xl border border-status-counter/20 bg-status-counter-soft p-5">
                  <p class="text-sm text-trama-dark/70">
                    Contraoferta enviada. Esperando la respuesta del cedente.
                  </p>
                </div>
              }
              @case ('no_agreement') {
                <div class="rounded-2xl border border-trama-sand-200 bg-trama-sand-50 p-5">
                  <p class="text-sm text-trama-dark/70">No hubo acuerdo con el cedente.</p>
                </div>
              }
            }
          </div>
        </div>

        <div class="t-card p-5">
          <h2 class="mb-4 text-sm font-medium text-trama-dark/60">Historial</h2>
          <app-timeline [events]="d.garment.timeline" />
        </div>
      </div>

      <app-confirm-modal
        [open]="confirmingPayout()"
        title="Registrar liquidación"
        body="La prenda quedará marcada como pagada al cedente. ¿Confirmás el pago?"
        confirmLabel="Registrar"
        (confirmed)="markPaidOut()"
        (cancelled)="confirmingPayout.set(false)"
      />
    }
  `,
})
export class MerchantGarmentTracking {
  protected readonly headerIcon = Route;
  private readonly route = inject(ActivatedRoute);
  private readonly garmentsService = inject(GarmentsService);
  private readonly proposalsService = inject(ProposalsService);
  private readonly agreementsService = inject(AgreementsService);
  private readonly consignorsService = inject(ConsignorsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly receptionsService = inject(ReceptionsService);
  private readonly salesService = inject(SalesService);
  private readonly payoutsService = inject(PayoutsService);
  private readonly toast = inject(ToastService);

  protected readonly payingOut = signal(false);
  protected readonly confirmingPayout = signal(false);
  protected readonly paymentMethod = signal<PaymentMethod>('transfer');
  protected readonly receiptNumber = signal('');
  protected readonly acting = signal(false);

  private readonly garmentId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.load().pipe(
          map((data): TrackingState => ({ status: 'loaded', data })),
          startWith<TrackingState>({ status: 'loading', data: null }),
          catchError((): Observable<TrackingState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as TrackingState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected readonly settlementConsignor = computed(() => {
    const d = this.data();
    return d?.sale?.consignorAmount ?? d?.agreement?.agreedConsignorPrice ?? 0;
  });

  protected readonly settlementMerchant = computed(() => {
    const d = this.data();
    if (d?.sale) return d.sale.merchantCommission;
    if (d?.agreement) return d.agreement.agreedSalePrice - d.agreement.agreedConsignorPrice;
    return 0;
  });

  protected methodLabel(method?: PaymentMethod): string {
    return method ? PAYMENT_METHOD_LABELS[method] : '—';
  }

  protected markPaidOut(): void {
    const d = this.data();
    this.confirmingPayout.set(false);
    if (!d || this.acting()) return;

    const garmentId = d.garment.id;
    const method = this.paymentMethod();
    const receipt = this.receiptNumber().trim();

    this.acting.set(true);
    this.payoutsService
      .settleMonthly([garmentId], {
        paymentMethod: method,
        receiptNumber: receipt || undefined,
      })
      .subscribe({
        next: () => {
          this.acting.set(false);
          this.payingOut.set(false);
          this.toast.show('Liquidación registrada');
          this.reload.next();
        },
        error: () => {
          this.acting.set(false);
          this.toast.show('No pudimos registrar la liquidación', 'error');
        },
      });
  }

  private load(): Observable<TrackingData> {
    const id = this.garmentId();
    return this.garmentsService.getById(id).pipe(
      switchMap((garment) => {
        if (!garment) return throwError(() => new Error(`Prenda no encontrada: ${id}`));
        return forkJoin({
          proposal: this.proposalsService.byGarment(id),
          agreement: this.agreementsService.byGarment(id),
          consignor: this.consignorsService.getById(garment.consignorId),
          merchant: garment.merchantId
            ? this.merchantsService.getById(garment.merchantId)
            : of(undefined),
          reception: this.receptionsService.byGarment(id),
          sale: this.salesService.byGarment(id),
        }).pipe(
          map(
            ({ proposal, agreement, consignor, merchant, reception, sale }): TrackingData => ({
              garment,
              proposal,
              agreement,
              consignor,
              merchant,
              salesPoint: merchant?.salesPoints.find((point) => point.id === garment.salesPointId),
              reception,
              sale,
            }),
          ),
        );
      }),
    );
  }
}
