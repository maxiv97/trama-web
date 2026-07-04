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
import { Garment } from '../../../core/models/garment.model';
import { Proposal } from '../../../core/models/proposal.model';
import { Reception, ReceptionDiscrepancy } from '../../../core/models/reception.model';
import { SalesPoint } from '../../../core/models/sales-point.model';
import { Consignor, Merchant } from '../../../core/models/user.model';
import { AgreementsService } from '../../../core/services/agreements.service';
import { ConsignorsService } from '../../../core/services/consignors.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { ReceptionsService } from '../../../core/services/receptions.service';
import { PhotoGallery } from '../../../shared/components/photo-gallery/photo-gallery';
import { ProgressTracker } from '../../../shared/components/progress-tracker/progress-tracker';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { Timeline } from '../../../shared/components/timeline/timeline';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';

const DISCREPANCY_LABELS: Record<ReceptionDiscrepancy, string> = {
  condition: 'Condición inferior',
  damage: 'Daños no declarados',
  photo_mismatch: 'No coincide con fotos',
  measurements: 'Medidas distintas',
  accessories: 'Faltan accesorios/etiquetas',
  hygiene: 'Sin higienizar',
};

interface TrackingData {
  garment: Garment;
  proposal?: Proposal;
  agreement?: Agreement;
  consignor?: Consignor;
  merchant?: Merchant;
  salesPoint?: SalesPoint;
  reception?: Reception;
}

type TrackingState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: TrackingData };

@Component({
  selector: 'app-merchant-garment-tracking',
  imports: [RouterLink, PhotoGallery, ProgressTracker, Timeline, StatusBadge, MoneyPipe, ShortDatePipe],
  template: `
    @if (isLoading()) {
      <div class="flex min-h-[60vh] items-center justify-center">
        <div
          class="h-8 w-8 animate-spin rounded-full border-2 border-trama-sand-200 border-t-trama-brand"
        ></div>
      </div>
    } @else if (isError()) {
      <div class="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p class="text-trama-dark/70">No encontramos esta prenda.</p>
        <a
          routerLink="/m"
          class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700"
          >Volver al panel</a
        >
      </div>
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
                <p class="text-xs text-trama-dark/50">Precio del cedente</p>
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
              <p class="text-xs text-trama-dark/50">Cedente</p>
              <p class="mt-1 text-sm text-trama-dark">
                {{ d.consignor?.name ?? '—' }}
                @if (d.consignor?.dni) {
                  <span class="text-trama-dark/50">· DNI {{ d.consignor?.dni }}</span>
                }
              </p>
            </div>

            <div class="rounded-2xl border border-trama-sand-200 bg-white p-4">
              <app-progress-tracker [currentStatus]="d.garment.status" />
            </div>

            @switch (d.garment.status) {
              @case ('agreed') {
                <div class="space-y-3 rounded-2xl border border-green-200 bg-green-50 p-5">
                  <p class="text-sm font-medium text-trama-dark">
                    Acuerdo confirmado. Cuando recibas la prenda, registrá la recepción.
                  </p>
                  <a
                    [routerLink]="['/m/garment', d.garment.id, 'reception']"
                    class="inline-block rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700"
                    >Registrar recepción</a
                  >
                </div>
              }
              @case ('in_stock') {
                <div class="space-y-3 rounded-2xl border border-green-200 bg-green-50 p-5">
                  <p class="text-sm font-medium text-trama-dark">La prenda está en stock.</p>
                  <a
                    [routerLink]="['/m/garment', d.garment.id, 'sale']"
                    class="inline-block rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700"
                    >Registrar venta</a
                  >
                </div>
              }
              @case ('with_remarks') {
                <div class="space-y-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
                  <p class="text-sm font-medium text-trama-dark">
                    Recibida con observaciones.
                  </p>
                  @if (d.reception; as reception) {
                    @if (reception.discrepancies.length) {
                      <ul class="list-disc pl-5 text-sm text-trama-dark/70">
                        @for (item of reception.discrepancies; track item) {
                          <li>{{ discrepancyLabel(item) }}</li>
                        }
                      </ul>
                    }
                    @if (reception.detail) {
                      <p class="text-sm text-trama-dark/70">{{ reception.detail }}</p>
                    }
                  }
                  <a
                    [routerLink]="['/m/garment', d.garment.id, 'sale']"
                    class="inline-block rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700"
                    >Registrar venta</a
                  >
                </div>
              }
              @case ('rejected') {
                <div class="space-y-2 rounded-2xl border border-red-200 bg-red-50 p-5">
                  <p class="text-sm font-medium text-trama-dark">
                    Recepción rechazada. La prenda se devuelve al cedente.
                  </p>
                  @if (d.reception?.detail) {
                    <p class="text-sm text-trama-dark/70">{{ d.reception?.detail }}</p>
                  }
                </div>
              }
              @case ('sold') {
                <div class="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <p class="text-sm font-medium text-trama-dark">Prenda vendida.</p>
                  @if (d.agreement; as agreement) {
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <p class="text-xs text-trama-dark/50">Le corresponde al cedente</p>
                        <p class="text-lg font-semibold text-trama-dark">
                          {{ agreement.agreedConsignorPrice | money }}
                        </p>
                      </div>
                      <div>
                        <p class="text-xs text-trama-dark/50">Tu comisión</p>
                        <p class="text-lg font-semibold text-trama-dark">
                          {{ agreement.agreedSalePrice - agreement.agreedConsignorPrice | money }}
                        </p>
                      </div>
                    </div>
                  }
                </div>
              }
              @case ('under_review') {
                <div class="rounded-2xl bg-trama-sand-50 p-5">
                  <p class="text-sm text-trama-dark/70">Propuesta en revisión.</p>
                </div>
              }
              @case ('counteroffer') {
                <div class="rounded-2xl border border-orange-200 bg-orange-50 p-5">
                  <p class="text-sm text-trama-dark/70">
                    Contraoferta enviada. Esperando la respuesta del cedente.
                  </p>
                </div>
              }
              @case ('paid_out') {
                <div class="rounded-2xl border border-trama-sand-200 bg-white p-5">
                  <p class="text-sm text-trama-dark/80">Liquidación pagada.</p>
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

        <div class="rounded-2xl border border-trama-sand-200 bg-white p-5">
          <h2 class="mb-4 text-sm font-medium text-trama-dark/60">Historial</h2>
          <app-timeline [events]="d.garment.timeline" />
        </div>
      </div>
    }
  `,
})
export class MerchantGarmentTracking {
  private readonly route = inject(ActivatedRoute);
  private readonly garmentsService = inject(GarmentsService);
  private readonly proposalsService = inject(ProposalsService);
  private readonly agreementsService = inject(AgreementsService);
  private readonly consignorsService = inject(ConsignorsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly receptionsService = inject(ReceptionsService);

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

  protected discrepancyLabel(discrepancy: ReceptionDiscrepancy): string {
    return DISCREPANCY_LABELS[discrepancy];
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
        }).pipe(
          map(
            ({ proposal, agreement, consignor, merchant, reception }): TrackingData => ({
              garment,
              proposal,
              agreement,
              consignor,
              merchant,
              salesPoint: merchant?.salesPoints.find((point) => point.id === garment.salesPointId),
              reception,
            }),
          ),
        );
      }),
    );
  }
}
