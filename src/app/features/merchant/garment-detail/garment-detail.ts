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
import { PhotoGallery } from '../../../shared/components/photo-gallery/photo-gallery';
import { ProgressTracker } from '../../../shared/components/progress-tracker/progress-tracker';
import { ReceptionRemarks } from '../../../shared/components/reception-remarks/reception-remarks';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { Timeline } from '../../../shared/components/timeline/timeline';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageSkeleton } from '../../../shared/components/page-skeleton/page-skeleton';
import { Hanger } from '../../../shared/icons/trama-icons';

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
  imports: [PageSkeleton, PageHeader, 
    RouterLink,
    PhotoGallery,
    ProgressTracker,
    ReceptionRemarks,
    Timeline,
    StatusBadge,
    MoneyPipe,
    ShortDatePipe,
    ErrorState,
  ],
  template: `
    @if (isLoading()) {
      <app-page-skeleton layout="detail" />
    } @else if (isError()) {
      <app-error-state
        message="No encontramos este artículo."
        link="/m/inventory"
        linkLabel="Volver al inventario"
      />
    } @else if (data(); as d) {
      <div class="space-y-6">
        <div>
          <a routerLink="/m/inventory" class="t-link inline-flex items-center gap-1 no-underline hover:underline">← Inventario</a>
          <app-page-header class="mt-4" [title]="d.garment.name" section="Inventario" [icon]="headerIcon">
            <div lead class="mt-3 flex flex-wrap items-center gap-3">
              <app-status-badge [status]="d.garment.status" />
              @if (d.garment.code) {
                <span class="rounded bg-trama-sand-100 px-2 py-0.5 font-mono text-sm font-semibold text-trama-dark">{{ d.garment.code }}</span>
              }
              <span class="text-sm text-trama-muted">Cargada el {{ d.garment.createdAt | shortDate }}</span>
            </div>
          </app-page-header>
        </div>

        <div class="grid gap-6 md:grid-cols-3">
          <div class="md:col-span-1">
            <app-photo-gallery [photos]="d.garment.photos" />
          </div>

          <div class="space-y-6 md:col-span-2">
            <div class="t-card p-5">
              <h2 class="mb-4 text-title-3 text-trama-dark">Datos de la prenda</h2>
              <dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <div>
                  <dt class="text-[13px] text-trama-muted">Categoría</dt>
                  <dd class="font-semibold text-trama-dark">{{ d.garment.category }}</dd>
                </div>
                @if (d.garment.subcategory) {
                  <div>
                    <dt class="text-[13px] text-trama-muted">Subcategoría</dt>
                    <dd class="font-semibold text-trama-dark">{{ d.garment.subcategory }}</dd>
                  </div>
                }
                <div>
                  <dt class="text-[13px] text-trama-muted">Marca</dt>
                  <dd class="font-semibold text-trama-dark">{{ d.garment.brand }}</dd>
                </div>
                <div>
                  <dt class="text-[13px] text-trama-muted">Talle</dt>
                  <dd class="font-semibold text-trama-dark">{{ d.garment.size }}</dd>
                </div>
                <div>
                  <dt class="text-[13px] text-trama-muted">Color</dt>
                  <dd class="font-semibold text-trama-dark">{{ d.garment.color }}</dd>
                </div>
                <div>
                  <dt class="text-[13px] text-trama-muted">Temporada</dt>
                  <dd class="font-semibold text-trama-dark">{{ d.garment.season }}</dd>
                </div>
                <div>
                  <dt class="text-[13px] text-trama-muted">Estado</dt>
                  <dd class="font-semibold text-trama-dark">{{ conditionLabel(d.garment.condition) }}</dd>
                </div>
              </dl>
              @if (d.garment.description) {
                <div class="mt-4 border-t border-trama-sand-100 pt-4">
                  <dt class="text-sm text-trama-muted">Descripción</dt>
                  <dd class="mt-1 text-sm text-trama-body">{{ d.garment.description }}</dd>
                </div>
              }
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="t-card p-4">
                <p class="text-[13px] font-semibold text-trama-body">Cedente</p>
                @if (d.consignor; as consignor) {
                  <p class="mt-1 text-sm text-trama-dark">{{ consignor.name }}</p>
                  @if (consignor.dni) {
                    <p class="text-[13px] font-semibold text-trama-body">DNI {{ consignor.dni }}</p>
                  }
                } @else {
                  <p class="mt-1 text-sm text-trama-dark">—</p>
                }
              </div>
              <div class="t-card p-4">
                <p class="text-[13px] font-semibold text-trama-body">Punto de venta</p>
                @if (d.salesPoint; as salesPoint) {
                  <p class="mt-1 text-sm text-trama-dark">{{ salesPoint.name }}</p>
                  @if (salesPoint.address) {
                    <p class="text-[13px] font-semibold text-trama-body">{{ salesPoint.address }}</p>
                  }
                } @else {
                  <p class="mt-1 text-sm text-trama-dark">—</p>
                }
              </div>
            </div>

            @if (d.agreement; as agreement) {
              <div class="t-card p-5">
                <h2 class="mb-4 text-title-3 text-trama-dark">Precios acordados</h2>
                <div class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <p class="text-trama-muted">Precio del cedente</p>
                    <p class="mt-1 font-semibold text-trama-dark">
                      {{ agreement.agreedConsignorPrice | money }}
                    </p>
                  </div>
                  <div>
                    <p class="text-trama-muted">Precio de venta</p>
                    <p class="mt-1 font-semibold text-trama-dark">
                      {{ agreement.agreedSalePrice | money }}
                    </p>
                  </div>
                  <div>
                    <p class="text-trama-muted">Comisión</p>
                    <p class="mt-1 font-semibold text-trama-dark">
                      {{ agreement.appliedCommission }}%
                    </p>
                  </div>
                </div>
              </div>
            }

            @if (d.reception; as reception) {
              <div class="t-card p-5">
                <h2 class="mb-3 text-title-3 text-trama-dark">Recepción</h2>
                <p class="text-sm text-trama-body">
                  Comprobante {{ reception.receiptNumber }} ·
                  {{ reception.receivedAt | shortDate }}
                </p>
                <app-reception-remarks [reception]="reception" class="mt-3 block" />
              </div>
            }

            <div class="t-card p-4">
              <app-progress-tracker [currentStatus]="d.garment.status" />
            </div>

            @if (d.garment.status === 'agreed') {
              <a
                [routerLink]="['/m/garment', d.garment.id, 'reception']"
                class="t-btn t-btn-primary"
                >Registrar recepción</a
              >
            } @else if (d.garment.status === 'in_stock' || d.garment.status === 'with_remarks') {
              <a
                [routerLink]="['/m/garment', d.garment.id, 'sale']"
                class="t-btn t-btn-primary"
                >Registrar venta</a
              >
            } @else if (d.garment.status === 'sold') {
              <a
                [routerLink]="['/m/garment', d.garment.id]"
                class="t-btn t-btn-primary"
                >Ver liquidación</a
              >
            } @else if (d.garment.status === 'paid_out') {
              <div class="t-card p-5">
                <p class="text-[15px] font-bold text-trama-dark">Liquidación pagada.</p>
                @if (d.sale; as sale) {
                  @if (sale.paidAt) {
                    <p class="mt-1 text-sm text-trama-body">
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

        <div class="t-card p-5">
          <h2 class="mb-4 text-title-3 text-trama-dark">Historial</h2>
          <app-timeline [events]="d.garment.timeline" />
        </div>
      </div>
    }
  `,
})
export class GarmentDetail {
  protected readonly headerIcon = Hanger;
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
