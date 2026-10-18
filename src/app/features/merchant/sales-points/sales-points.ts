import { MapPin } from 'lucide-angular';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { GeoPoint, SalesPoint } from '../../../core/models/sales-point.model';
import { AgreementsService } from '../../../core/services/agreements.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { SalesPointsService } from '../../../core/services/sales-points.service';
import { LeafletMap } from '../../../shared/directives/leaflet-map';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageSkeleton } from '../../../shared/components/page-skeleton/page-skeleton';

const CORDOBA_CENTER: GeoPoint = { lat: -31.4201, lng: -64.1888 };

interface SalesPointCard {
  id: string;
  name: string;
  address: string;
  phone: string;
  days: string;
  hours: string;
  instructions: string;
  geo: GeoPoint;
  inStockCount: number;
  stockValue: number;
}

interface SalesPointsData {
  cards: SalesPointCard[];
  merchantGeo: GeoPoint;
}

type SalesPointsState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: SalesPointsData };

@Component({
  selector: 'app-sales-points',
  imports: [PageSkeleton, PageHeader, LeafletMap, MoneyPipe, ErrorState, EmptyState],
  template: `
    @if (isLoading()) {
      <app-page-skeleton layout="list" />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar los puntos de venta." (retry)="retry()" />
    } @else if (data(); as d) {
      <div class="space-y-6">
        <app-page-header title="Puntos de venta" section="Puntos de venta" [icon]="headerIcon" lead="Dónde exhibís las prendas. Los cedentes los ven en el mapa al elegir comercio.">
          <button actions
            type="button"
            (click)="openCreate()"
            class="t-btn t-btn-primary"
          >
            Agregar punto
          </button>
        </app-page-header>

        @if (d.cards.length) {
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            @for (card of d.cards; track card.id) {
              <div class="t-card space-y-3 p-5">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-medium text-trama-dark">{{ card.name }}</p>
                    <p class="text-sm text-trama-dark/60">{{ card.address }}</p>
                  </div>
                  <button
                    type="button"
                    (click)="openEdit(card)"
                    class="t-btn t-btn-secondary t-btn-sm"
                  >
                    Editar
                  </button>
                </div>

                <div class="text-sm text-trama-dark/70">
                  <p>{{ card.phone }}</p>
                  <p class="text-trama-dark/50">
                    Recepción: {{ card.days }} · {{ card.hours }}
                  </p>
                </div>

                <div class="flex gap-6 border-t border-trama-sand-100 pt-3 text-sm">
                  <div>
                    <p class="text-trama-dark/50">En stock</p>
                    <p class="font-medium text-trama-dark">
                      {{ card.inStockCount }}
                      {{ card.inStockCount === 1 ? 'artículo' : 'artículos' }}
                    </p>
                  </div>
                  <div>
                    <p class="text-trama-dark/50">Valor del stock</p>
                    <p class="font-medium text-trama-dark">{{ card.stockValue | money }}</p>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else {
          <app-empty-state message="Todavía no cargaste puntos de venta." />
        }
      </div>

      @if (formOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-trama-dark/30 p-4"
          (click)="close()"
        >
          <div
            class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-trama-paper p-6 shadow-lg"
            (click)="$event.stopPropagation()"
          >
            <h2 class="text-lg font-semibold text-trama-dark">
              {{ editingId() ? 'Editar punto de venta' : 'Agregar punto de venta' }}
            </h2>

            <div class="mt-4 space-y-4">
              <label class="block text-sm">
                <span class="text-trama-dark/70">Nombre</span>
                <input
                  [value]="fName()"
                  (input)="fName.set($any($event.target).value)"
                  class="t-input mt-1.5 w-full"
                />
              </label>

              <label class="block text-sm">
                <span class="text-trama-dark/70">Dirección</span>
                <input
                  [value]="fAddress()"
                  (input)="fAddress.set($any($event.target).value)"
                  class="t-input mt-1.5 w-full"
                />
              </label>

              <label class="block text-sm">
                <span class="text-trama-dark/70">Teléfono</span>
                <input
                  [value]="fPhone()"
                  (input)="fPhone.set($any($event.target).value)"
                  class="t-input mt-1.5 w-full"
                />
              </label>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label class="block text-sm">
                  <span class="text-trama-dark/70">Días de recepción</span>
                  <input
                    [value]="fDays()"
                    (input)="fDays.set($any($event.target).value)"
                    placeholder="Lun a Vie"
                    class="t-input mt-1.5 w-full"
                  />
                </label>
                <label class="block text-sm">
                  <span class="text-trama-dark/70">Horario</span>
                  <input
                    [value]="fHours()"
                    (input)="fHours.set($any($event.target).value)"
                    placeholder="10 a 18 h"
                    class="t-input mt-1.5 w-full"
                  />
                </label>
              </div>

              <label class="block text-sm">
                <span class="text-trama-dark/70">Instrucciones para el cedente</span>
                <input
                  [value]="fInstructions()"
                  (input)="fInstructions.set($any($event.target).value)"
                  class="t-input mt-1.5 w-full"
                />
              </label>

              <div class="text-sm">
                <span class="text-trama-dark/70">Ubicación</span>
                <p class="mb-1 text-xs text-trama-dark/50">
                  Tocá el mapa para fijar la ubicación (opcional).
                </p>
                <div
                  appLeafletMap
                  [center]="pickCenter()"
                  [zoom]="13"
                  [pickable]="true"
                  [markers]="pickMarker()"
                  (pointPicked)="setGeo($event)"
                  class="h-[300px] w-full overflow-hidden rounded-lg border border-trama-sand-200"
                ></div>
                @if (fGeo(); as geo) {
                  <p class="mt-1 text-xs text-trama-dark/60">
                    {{ geo.lat.toFixed(5) }}, {{ geo.lng.toFixed(5) }}
                  </p>
                }
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button
                type="button"
                (click)="close()"
                class="t-btn t-btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="save()"
                [disabled]="!canSave() || saving()"
                class="t-btn t-btn-primary"
              >
                {{ saving() ? 'Guardando…' : 'Guardar' }}
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class SalesPoints {
  protected readonly headerIcon = MapPin;
  private readonly auth = inject(AuthService);
  private readonly salesPointsService = inject(SalesPointsService);
  private readonly garmentsService = inject(GarmentsService);
  private readonly agreementsService = inject(AgreementsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly toast = inject(ToastService);

  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly fName = signal('');
  protected readonly fAddress = signal('');
  protected readonly fPhone = signal('');
  protected readonly fDays = signal('');
  protected readonly fHours = signal('');
  protected readonly fInstructions = signal('');
  protected readonly fGeo = signal<GeoPoint | null>(null);

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.load().pipe(
          map((data): SalesPointsState => ({ status: 'loaded', data })),
          startWith<SalesPointsState>({ status: 'loading', data: null }),
          catchError((): Observable<SalesPointsState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as SalesPointsState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected readonly mapCenter = computed(
    () => this.data()?.cards[0]?.geo ?? this.data()?.merchantGeo ?? CORDOBA_CENTER,
  );

  protected readonly pickCenter = computed(() => this.fGeo() ?? this.mapCenter());
  protected readonly pickMarker = computed(() => {
    const geo = this.fGeo();
    return geo ? [geo] : [];
  });

  protected readonly canSave = computed(
    () => this.fName().trim().length > 0 && this.fAddress().trim().length > 0,
  );

  protected retry(): void {
    this.reload.next();
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.fName.set('');
    this.fAddress.set('');
    this.fPhone.set('');
    this.fDays.set('');
    this.fHours.set('');
    this.fInstructions.set('');
    this.fGeo.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(card: SalesPointCard): void {
    this.editingId.set(card.id);
    this.fName.set(card.name);
    this.fAddress.set(card.address);
    this.fPhone.set(card.phone);
    this.fDays.set(card.days);
    this.fHours.set(card.hours);
    this.fInstructions.set(card.instructions);
    this.fGeo.set(card.geo);
    this.formOpen.set(true);
  }

  protected setGeo(geo: GeoPoint): void {
    this.fGeo.set(geo);
  }

  protected close(): void {
    this.formOpen.set(false);
  }

  protected save(): void {
    if (!this.canSave() || this.saving()) return;
    const merchantId = this.auth.user()?.id ?? '';
    const id = this.editingId() ?? `sp-${Date.now()}`;
    const point: SalesPoint = {
      id,
      merchantId,
      name: this.fName().trim(),
      address: this.fAddress().trim(),
      phone: this.fPhone().trim(),
      geo: this.fGeo() ?? this.mapCenter(),
      receptionSchedule: {
        days: this.fDays().trim(),
        hours: this.fHours().trim(),
        instructions: this.fInstructions().trim(),
      },
    };

    this.saving.set(true);
    const request = this.editingId()
      ? this.salesPointsService.update(point)
      : this.salesPointsService.create(point);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.toast.show(this.editingId() ? 'Punto de venta actualizado' : 'Punto de venta agregado');
        this.reload.next();
      },
      error: () => {
        this.saving.set(false);
        this.toast.show('No pudimos guardar el punto de venta', 'error');
      },
    });
  }

  private load(): Observable<SalesPointsData> {
    const merchantId = this.auth.user()?.id ?? '';
    return forkJoin({
      salesPoints: this.salesPointsService.byMerchant(merchantId),
      garments: this.garmentsService.byMerchant(merchantId),
      agreements: this.agreementsService.list(),
      merchant: this.merchantsService.getById(merchantId),
    }).pipe(
      map(({ salesPoints, garments, agreements, merchant }): SalesPointsData => {
        const salePriceByGarment = new Map(
          agreements.map((agreement) => [agreement.garmentId, agreement.agreedSalePrice]),
        );

        const cards: SalesPointCard[] = salesPoints.map((point) => {
          const stocked = garments.filter(
            (garment) =>
              garment.salesPointId === point.id &&
              (garment.status === 'in_stock' || garment.status === 'with_remarks'),
          );
          return {
            id: point.id,
            name: point.name,
            address: point.address,
            phone: point.phone,
            days: point.receptionSchedule.days,
            hours: point.receptionSchedule.hours,
            instructions: point.receptionSchedule.instructions,
            geo: point.geo,
            inStockCount: stocked.length,
            stockValue: stocked.reduce(
              (total, garment) => total + (salePriceByGarment.get(garment.id) ?? 0),
              0,
            ),
          };
        });

        const location = merchant?.location;
        const merchantGeo: GeoPoint =
          location?.lat != null && location?.lng != null
            ? { lat: location.lat, lng: location.lng }
            : CORDOBA_CENTER;

        return { cards, merchantGeo };
      }),
    );
  }
}
