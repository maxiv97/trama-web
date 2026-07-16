import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
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
import { Merchant } from '../../../core/models/user.model';
import { AgreementsService } from '../../../core/services/agreements.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { ReceptionsService } from '../../../core/services/receptions.service';
import { SalesService } from '../../../core/services/sales.service';
import { ConfirmModal } from '../../../shared/components/confirm-modal/confirm-modal';
import { PhotoGallery } from '../../../shared/components/photo-gallery/photo-gallery';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { ProgressTracker } from '../../../shared/components/progress-tracker/progress-tracker';
import { ReceptionRemarks } from '../../../shared/components/reception-remarks/reception-remarks';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { Timeline } from '../../../shared/components/timeline/timeline';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';
import { ToastService } from '../../../shared/components/toast/toast.service';

interface TrackingData {
  garment: Garment;
  proposal?: Proposal;
  agreement?: Agreement;
  merchant?: Merchant;
  salesPoint?: SalesPoint;
  reception?: Reception;
  sale?: Sale;
}

type TrackingState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: TrackingData };

type ActiveModal = 'accept' | 'reject' | 'redeliver' | 'cancel' | null;

@Component({
  selector: 'app-consignor-garment-tracking',
  imports: [
    ProgressTracker,
    ReceptionRemarks,
    Timeline,
    PhotoGallery,
    StatusBadge,
    ConfirmModal,
    MoneyPipe,
    ShortDatePipe,
    LoadingSpinner,
    ErrorState,
  ],
  template: `
    @if (isLoading()) {
      <app-loading-spinner />
    } @else if (isError()) {
      <app-error-state message="No encontramos esta prenda." link="/c" linkLabel="Volver al panel" />
    } @else if (data(); as d) {
      <div class="space-y-6">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-2xl font-semibold text-trama-dark">{{ d.garment.name }}</h1>
          <app-status-badge [status]="d.garment.status" />
          <span class="text-sm text-trama-dark/50"
            >Cargada el {{ d.garment.createdAt | shortDate }}</span
          >
        </div>

        <div class="grid gap-6 md:grid-cols-3">
          <div class="md:col-span-1">
            <app-photo-gallery [photos]="d.garment.photos" />
          </div>

          <div class="space-y-6 md:col-span-2">
            <div class="grid grid-cols-2 gap-4">
              <div class="rounded-2xl border border-trama-sand-200 bg-white p-4">
                <p class="text-xs text-trama-dark/50">Precio que pediste</p>
                <p class="mt-1 text-lg font-semibold text-trama-dark">
                  {{ d.proposal?.requestedConsignorPrice | money }}
                </p>
              </div>
              <div class="rounded-2xl border border-trama-sand-200 bg-white p-4">
                <p class="text-xs text-trama-dark/50">Precio de venta acordado</p>
                <p class="mt-1 text-lg font-semibold text-trama-dark">
                  {{ d.agreement?.agreedSalePrice | money }}
                </p>
              </div>
            </div>

            <div class="rounded-2xl border border-trama-sand-200 bg-white p-4">
              <app-progress-tracker [currentStatus]="d.garment.status" />
            </div>

            @switch (d.garment.status) {
              @case ('under_review') {
                <div class="rounded-2xl bg-trama-sand-50 p-5">
                  <p class="text-sm text-trama-dark/80">
                    Tu propuesta está siendo evaluada por el comercio.
                  </p>
                </div>
              }
              @case ('counteroffer') {
                <div class="space-y-4 rounded-2xl border border-orange-200 bg-orange-50 p-5">
                  <p class="text-sm font-medium text-trama-dark">
                    El comercio te hizo una contraoferta.
                  </p>
                  @if (d.proposal?.counteroffer; as counter) {
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <p class="text-xs text-trama-dark/50">Recibirías</p>
                        <p class="text-lg font-semibold text-trama-dark">
                          {{ counter.consignorPrice | money }}
                        </p>
                      </div>
                      <div>
                        <p class="text-xs text-trama-dark/50">Se vendería a</p>
                        <p class="text-lg font-semibold text-trama-dark">
                          {{ counter.salePrice | money }}
                        </p>
                      </div>
                    </div>
                  }
                  <div class="flex gap-3">
                    <button
                      type="button"
                      (click)="openAccept()"
                      [disabled]="acting()"
                      class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700 disabled:opacity-40"
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      (click)="openReject()"
                      [disabled]="acting()"
                      class="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              }
              @case ('agreed') {
                <div class="space-y-2 rounded-2xl border border-green-200 bg-green-50 p-5">
                  <p class="text-sm font-medium text-trama-dark">
                    ¡Acuerdo confirmado! Coordiná la entrega:
                  </p>
                  @if (d.salesPoint; as point) {
                    <p class="text-sm text-trama-dark/80">
                      <span class="font-medium">{{ point.name }}</span> — {{ point.address }}
                    </p>
                    <p class="text-sm text-trama-dark/70">
                      Recepción: {{ point.receptionSchedule.days }}
                      {{ point.receptionSchedule.hours }}
                    </p>
                    <p class="text-sm text-trama-dark/70">
                      {{ point.receptionSchedule.instructions }}
                    </p>
                  }
                  @if (d.agreement; as agreement) {
                    <p class="text-sm text-trama-dark/70">
                      Plazo de entrega: hasta {{ agreement.saleDeadline | shortDate }}
                    </p>
                  }
                </div>
              }
              @case ('rejected') {
                <div class="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-5">
                  <p class="text-sm text-trama-dark/80">El comercio rechazó la recepción.</p>
                  @if (d.reception; as reception) {
                    <app-reception-remarks [reception]="reception" />
                  }
                  <button
                    type="button"
                    (click)="openRedeliver()"
                    [disabled]="acting()"
                    class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700 disabled:opacity-40"
                  >
                    Coordinar nueva entrega
                  </button>
                </div>
              }
              @case ('with_remarks') {
                <div class="space-y-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
                  <p class="text-sm text-trama-dark/80">
                    Tu prenda está en el comercio, recibida con observaciones.
                  </p>
                  @if (d.reception; as reception) {
                    <app-reception-remarks [reception]="reception" />
                  }
                </div>
              }
              @case ('in_stock') {
                <div class="rounded-2xl border border-green-200 bg-green-50 p-5">
                  <p class="text-sm text-trama-dark/80">Tu prenda está en el comercio, en venta.</p>
                </div>
              }
              @case ('sold') {
                <div class="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <p class="text-sm font-medium text-trama-dark">¡Tu prenda fue vendida!</p>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-xs text-trama-dark/50">Te corresponde</p>
                      <p class="text-lg font-semibold text-trama-dark">
                        {{ settlementConsignor() | money }}
                      </p>
                    </div>
                    <div>
                      <p class="text-xs text-trama-dark/50">Comisión del comercio</p>
                      <p class="text-lg font-semibold text-trama-dark">
                        {{ settlementMerchant() | money }}
                      </p>
                    </div>
                  </div>
                </div>
              }
              @case ('paid_out') {
                <div class="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <p class="text-sm font-medium text-trama-dark">¡Recibiste tu pago!</p>
                  <div>
                    <p class="text-xs text-trama-dark/50">Cobraste</p>
                    <p class="text-lg font-semibold text-trama-dark">
                      {{ settlementConsignor() | money }}
                    </p>
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
              @case ('no_agreement') {
                <div class="rounded-2xl border border-trama-sand-200 bg-trama-sand-50 p-5">
                  <p class="text-sm text-trama-dark/70">No hubo acuerdo con el comercio.</p>
                </div>
              }
            }
          </div>
        </div>

        @if (canCancel()) {
          <div class="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-white p-5">
            <div>
              <p class="text-sm font-medium text-trama-dark">¿Ya no querés consignar esta prenda?</p>
              <p class="text-xs text-trama-dark/50">
                Podés darla de baja mientras el comercio no la haya recibido.
              </p>
            </div>
            <button
              type="button"
              (click)="openCancel()"
              [disabled]="acting()"
              class="shrink-0 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              Cancelar prenda
            </button>
          </div>
        }

        <div class="rounded-2xl border border-trama-sand-200 bg-white p-5">
          <h2 class="mb-4 text-sm font-medium text-trama-dark/60">Historial</h2>
          <app-timeline [events]="d.garment.timeline" />
        </div>
      </div>

      <app-confirm-modal
        [open]="activeModal() !== null"
        [title]="modalTitle()"
        [body]="modalBody()"
        [confirmLabel]="modalConfirmLabel()"
        [confirmColor]="modalColor()"
        (confirmed)="onConfirmed()"
        (cancelled)="activeModal.set(null)"
      />
    }
  `,
})
export class ConsignorGarmentTracking {
  private readonly route = inject(ActivatedRoute);
  private readonly garmentsService = inject(GarmentsService);
  private readonly proposalsService = inject(ProposalsService);
  private readonly agreementsService = inject(AgreementsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly receptionsService = inject(ReceptionsService);
  private readonly salesService = inject(SalesService);
  private readonly toast = inject(ToastService);

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

  protected readonly activeModal = signal<ActiveModal>(null);
  protected readonly acting = signal(false);

  protected readonly modalTitle = computed(() => {
    switch (this.activeModal()) {
      case 'accept':
        return 'Aceptar contraoferta';
      case 'reject':
        return 'Rechazar contraoferta';
      case 'redeliver':
        return 'Coordinar nueva entrega';
      case 'cancel':
        return 'Cancelar prenda';
      default:
        return '';
    }
  });

  protected readonly modalBody = computed(() => {
    switch (this.activeModal()) {
      case 'accept':
        return 'Vas a aceptar el precio propuesto por el comercio y se generará el acuerdo.';
      case 'reject':
        return 'Vas a rechazar la contraoferta. La propuesta quedará sin acuerdo.';
      case 'redeliver':
        return 'Vas a coordinar una nueva entrega de la prenda con el comercio.';
      case 'cancel':
        return 'Vas a dar de baja esta prenda. La acción no se puede deshacer.';
      default:
        return '';
    }
  });

  protected readonly modalConfirmLabel = computed(() => {
    switch (this.activeModal()) {
      case 'reject':
        return 'Rechazar';
      case 'cancel':
        return 'Cancelar prenda';
      default:
        return 'Confirmar';
    }
  });

  protected readonly modalColor = computed<'green' | 'red' | 'blue'>(() =>
    this.activeModal() === 'reject' || this.activeModal() === 'cancel' ? 'red' : 'green',
  );

  protected readonly canCancel = computed(() => {
    const status = this.data()?.garment.status;
    return status === 'under_review' || status === 'counteroffer' || status === 'agreed';
  });

  protected openAccept(): void {
    this.activeModal.set('accept');
  }

  protected openReject(): void {
    this.activeModal.set('reject');
  }

  protected openRedeliver(): void {
    this.activeModal.set('redeliver');
  }

  protected openCancel(): void {
    this.activeModal.set('cancel');
  }

  protected onConfirmed(): void {
    const modal = this.activeModal();
    this.activeModal.set(null);
    if (modal === 'accept') this.acceptCounteroffer();
    else if (modal === 'reject') this.rejectCounteroffer();
    else if (modal === 'redeliver') this.redeliver();
    else if (modal === 'cancel') this.cancel();
  }

  private cancel(): void {
    const data = this.data();
    if (!data || this.acting()) return;
    this.acting.set(true);
    this.garmentsService.applyAction(data.garment.id, 'CANCEL', 'consignor', 'Prenda cancelada').subscribe({
      next: () => this.onActionSuccess('Cancelaste la prenda'),
      error: () => this.onActionError(),
    });
  }

  private acceptCounteroffer(): void {
    const data = this.data();
    const counter = data?.proposal?.counteroffer;
    if (!data || !counter || this.acting()) return;

    this.acting.set(true);
    this.proposalsService.acceptCounteroffer(data.garment.id).subscribe({
      next: () => this.onActionSuccess('Aceptaste la contraoferta'),
      error: () => this.onActionError(),
    });
  }

  private rejectCounteroffer(): void {
    const data = this.data();
    if (!data || this.acting()) return;
    this.acting.set(true);
    this.proposalsService.reject(data.garment.id).subscribe({
      next: () => this.onActionSuccess('Rechazaste la contraoferta'),
      error: () => this.onActionError(),
    });
  }

  private redeliver(): void {
    const data = this.data();
    if (!data || this.acting()) return;
    this.acting.set(true);
    this.garmentsService
      .applyAction(data.garment.id, 'REDELIVER', 'consignor', 'Nueva entrega coordinada')
      .subscribe({
        next: () => this.onActionSuccess('Coordinaste una nueva entrega'),
        error: () => this.onActionError(),
      });
  }

  private onActionSuccess(message: string): void {
    this.acting.set(false);
    this.toast.show(message);
    this.reload.next();
  }

  private onActionError(): void {
    this.acting.set(false);
    this.toast.show('No pudimos completar la acción', 'error');
  }

  private load(): Observable<TrackingData> {
    const id = this.garmentId();
    return this.garmentsService.getById(id).pipe(
      switchMap((garment) => {
        if (!garment) return throwError(() => new Error(`Prenda no encontrada: ${id}`));
        return forkJoin({
          proposal: this.proposalsService.byGarment(id),
          agreement: this.agreementsService.byGarment(id),
          merchant: garment.merchantId
            ? this.merchantsService.getById(garment.merchantId)
            : of(undefined),
          reception: this.receptionsService.byGarment(id),
          sale: this.salesService.byGarment(id),
        }).pipe(
          map(
            ({ proposal, agreement, merchant, reception, sale }): TrackingData => ({
              garment,
              proposal,
              agreement,
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
