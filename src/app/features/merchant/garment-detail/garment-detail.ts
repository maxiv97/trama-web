import { Component, computed, inject } from '@angular/core';
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
import { CONDITION_LABELS } from '../../../core/models/garment.labels';
import { Garment, GarmentCondition } from '../../../core/models/garment.model';
import { Reception } from '../../../core/models/reception.model';
import { PAYMENT_METHOD_LABELS } from '../../../core/models/sale.labels';
import { PaymentMethod, Sale } from '../../../core/models/sale.model';
import { SalesPoint } from '../../../core/models/sales-point.model';
import { Consignor, Merchant } from '../../../core/models/user.model';
import { AgreementsService } from '../../../core/services/agreements.service';
import { ConsignorsService } from '../../../core/services/consignors.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { ReceptionsService } from '../../../core/services/receptions.service';
import { SalesService } from '../../../core/services/sales.service';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { PhotoGallery } from '../../../shared/components/photo-gallery/photo-gallery';
import { ProgressTracker } from '../../../shared/components/progress-tracker/progress-tracker';
import { ReceptionRemarks } from '../../../shared/components/reception-remarks/reception-remarks';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { Timeline } from '../../../shared/components/timeline/timeline';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';

interface DetailData {
  garment: Garment;
  consignor?: Consignor;
  merchant?: Merchant;
  salesPoint?: SalesPoint;
  agreement?: Agreement;
  reception?: Reception;
  sale?: Sale;
}

type DetailState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: DetailData };

@Component({
  selector: 'app-garment-detail',
  imports: [
    RouterLink,
    PhotoGallery,
    ProgressTracker,
    ReceptionRemarks,
    Timeline,
    StatusBadge,
    MoneyPipe,
    ShortDatePipe,
    LoadingSpinner,
    ErrorState,
  ],
  template: `
    @if (isLoading()) {
      <app-loading-spinner />
    } @else if (isError()) {
      <app-error-state
        message="No encontramos este artículo."
        link="/m/inventory"
        linkLabel="Volver al inventario"
      />
    } @else if (data(); as d) {
      <div class="space-y-6">
        <div>
          <a routerLink="/m/inventory" class="text-sm text-trama-brand">← Inventario</a>
          <div class="mt-2 flex flex-wrap items-center gap-3">
            <h1 class="text-2xl font-semibold text-trama-dark">{{ d.garment.name }}</h1>
            <app-status-badge [status]="d.garment.status" />
            <span class="text-sm text-trama-dark/50"
              >Cargada el {{ d.garment.createdAt | shortDate }}</span
            >
          </div>
        </div>

        <div class="grid gap-6 md:grid-cols-3">
          <div class="md:col-span-1">
            <app-photo-gallery [photos]="d.garment.photos" />
          </div>

          <div class="space-y-6 md:col-span-2">
            <div class="rounded-2xl border border-trama-sand-200 bg-white p-5">
              <h2 class="mb-4 text-sm font-medium text-trama-dark/60">Datos de la prenda</h2>
              <dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <div>
                  <dt class="text-trama-dark/50">Categoría</dt>
                  <dd class="text-trama-dark/80">{{ d.garment.category }}</dd>
                </div>
                @if (d.garment.subcategory) {
                  <div>
                    <dt class="text-trama-dark/50">Subcategoría</dt>
                    <dd class="text-trama-dark/80">{{ d.garment.subcategory }}</dd>
                  </div>
                }
                <div>
                  <dt class="text-trama-dark/50">Marca</dt>
                  <dd class="text-trama-dark/80">{{ d.garment.brand }}</dd>
                </div>
                <div>
                  <dt class="text-trama-dark/50">Talle</dt>
                  <dd class="text-trama-dark/80">{{ d.garment.size }}</dd>
                </div>
                <div>
                  <dt class="text-trama-dark/50">Color</dt>
                  <dd class="text-trama-dark/80">{{ d.garment.color }}</dd>
                </div>
                <div>
                  <dt class="text-trama-dark/50">Temporada</dt>
                  <dd class="text-trama-dark/80">{{ d.garment.season }}</dd>
                </div>
                <div>
                  <dt class="text-trama-dark/50">Estado</dt>
                  <dd class="text-trama-dark/80">{{ conditionLabel(d.garment.condition) }}</dd>
                </div>
              </dl>
              @if (d.garment.description) {
                <div class="mt-4 border-t border-trama-sand-100 pt-4">
                  <dt class="text-sm text-trama-dark/50">Descripción</dt>
                  <dd class="mt-1 text-sm text-trama-dark/80">{{ d.garment.description }}</dd>
                </div>
              }
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="rounded-2xl border border-trama-sand-200 bg-white p-4">
                <p class="text-xs text-trama-dark/50">Cedente</p>
                @if (d.consignor; as consignor) {
                  <p class="mt-1 text-sm text-trama-dark">{{ consignor.name }}</p>
                  @if (consignor.dni) {
                    <p class="text-xs text-trama-dark/50">DNI {{ consignor.dni }}</p>
                  }
                } @else {
                  <p class="mt-1 text-sm text-trama-dark">—</p>
                }
              </div>
              <div class="rounded-2xl border border-trama-sand-200 bg-white p-4">
                <p class="text-xs text-trama-dark/50">Punto de venta</p>
                @if (d.salesPoint; as salesPoint) {
                  <p class="mt-1 text-sm text-trama-dark">{{ salesPoint.name }}</p>
                  @if (salesPoint.address) {
                    <p class="text-xs text-trama-dark/50">{{ salesPoint.address }}</p>
                  }
                } @else {
                  <p class="mt-1 text-sm text-trama-dark">—</p>
                }
              </div>
            </div>

            @if (d.agreement; as agreement) {
              <div class="rounded-2xl border border-trama-sand-200 bg-white p-5">
                <h2 class="mb-4 text-sm font-medium text-trama-dark/60">Precios acordados</h2>
                <div class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <p class="text-trama-dark/50">Precio del cedente</p>
                    <p class="mt-1 font-semibold text-trama-dark">
                      {{ agreement.agreedConsignorPrice | money }}
                    </p>
                  </div>
                  <div>
                    <p class="text-trama-dark/50">Precio de venta</p>
                    <p class="mt-1 font-semibold text-trama-dark">
                      {{ agreement.agreedSalePrice | money }}
                    </p>
                  </div>
                  <div>
                    <p class="text-trama-dark/50">Comisión</p>
                    <p class="mt-1 font-semibold text-trama-dark">
                      {{ agreement.appliedCommission }}%
                    </p>
                  </div>
                </div>
              </div>
            }

            @if (d.reception; as reception) {
              <div class="rounded-2xl border border-trama-sand-200 bg-white p-5">
                <h2 class="mb-3 text-sm font-medium text-trama-dark/60">Recepción</h2>
                <p class="text-sm text-trama-dark/80">
                  Comprobante {{ reception.receiptNumber }} ·
                  {{ reception.receivedAt | shortDate }}
                </p>
                <app-reception-remarks [reception]="reception" class="mt-3 block" />
              </div>
            }

            <div class="rounded-2xl border border-trama-sand-200 bg-white p-4">
              <app-progress-tracker [currentStatus]="d.garment.status" />
            </div>

            @if (d.garment.status === 'agreed') {
              <a
                [routerLink]="['/m/garment', d.garment.id, 'reception']"
                class="inline-block rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700"
                >Registrar recepción</a
              >
            } @else if (d.garment.status === 'in_stock' || d.garment.status === 'with_remarks') {
              <a
                [routerLink]="['/m/garment', d.garment.id, 'sale']"
                class="inline-block rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700"
                >Registrar venta</a
              >
            } @else if (d.garment.status === 'sold') {
              <a
                [routerLink]="['/m/garment', d.garment.id]"
                class="inline-block rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700"
                >Ver liquidación</a
              >
            } @else if (d.garment.status === 'paid_out') {
              <div class="rounded-2xl border border-trama-sand-200 bg-white p-5">
                <p class="text-sm font-medium text-trama-dark">Liquidación pagada.</p>
                @if (d.sale; as sale) {
                  @if (sale.paidAt) {
                    <p class="mt-1 text-sm text-trama-dark/70">
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
          </div>
        </div>

        <div class="rounded-2xl border border-trama-sand-200 bg-white p-5">
          <h2 class="mb-4 text-sm font-medium text-trama-dark/60">Historial</h2>
          <app-timeline [events]="d.garment.timeline" />
        </div>
      </div>
    }
  `,
})
export class GarmentDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly garmentsService = inject(GarmentsService);
  private readonly consignorsService = inject(ConsignorsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly agreementsService = inject(AgreementsService);
  private readonly receptionsService = inject(ReceptionsService);
  private readonly salesService = inject(SalesService);

  private readonly garmentId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.load().pipe(
          map((data): DetailState => ({ status: 'loaded', data })),
          startWith<DetailState>({ status: 'loading', data: null }),
          catchError((): Observable<DetailState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as DetailState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected conditionLabel(condition: GarmentCondition): string {
    return CONDITION_LABELS[condition];
  }

  protected methodLabel(method?: PaymentMethod): string {
    return method ? PAYMENT_METHOD_LABELS[method] : '—';
  }

  private load(): Observable<DetailData> {
    const id = this.garmentId();
    return this.garmentsService.getById(id).pipe(
      switchMap((garment) => {
        if (!garment) return throwError(() => new Error(`Prenda no encontrada: ${id}`));
        return forkJoin({
          consignor: this.consignorsService.getById(garment.consignorId),
          merchant: garment.merchantId
            ? this.merchantsService.getById(garment.merchantId)
            : of(undefined),
          agreement: this.agreementsService.byGarment(id),
          reception: this.receptionsService.byGarment(id),
          sale: this.salesService.byGarment(id),
        }).pipe(
          map(
            ({ consignor, merchant, agreement, reception, sale }): DetailData => ({
              garment,
              consignor,
              merchant,
              salesPoint: merchant?.salesPoints.find((point) => point.id === garment.salesPointId),
              agreement,
              reception,
              sale,
            }),
          ),
        );
      }),
    );
  }
}
