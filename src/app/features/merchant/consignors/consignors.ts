import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { AgreementsService } from '../../../core/services/agreements.service';
import { ConsignorsService } from '../../../core/services/consignors.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { SalesService } from '../../../core/services/sales.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

interface ConsignorRow {
  id: string;
  name: string;
  dni: string;
  email: string;
  phone: string;
  verified: boolean;
  inStockCount: number;
  pendingPayout: number;
}

type ConsignorsState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ConsignorRow[] };

@Component({
  selector: 'app-consignors',
  imports: [RouterLink, MoneyPipe, LoadingSpinner, ErrorState, EmptyState],
  template: `
    @if (isLoading()) {
      <app-loading-spinner />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar los cedentes." (retry)="retry()" />
    } @else if (data(); as rows) {
      <div class="space-y-6">
        <h1 class="text-2xl font-semibold text-trama-dark">Mis cedentes</h1>

        <input
          type="search"
          [value]="search()"
          (input)="search.set($any($event.target).value)"
          placeholder="Buscar por nombre, DNI o email"
          class="w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm sm:max-w-sm"
        />

        @if (filteredRows().length) {
          <div class="overflow-x-auto rounded-2xl border border-trama-sand-200 bg-white">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-trama-sand-200 text-trama-dark/60">
                <tr>
                  <th class="px-4 py-3 font-medium">Cedente</th>
                  <th class="px-4 py-3 font-medium">DNI</th>
                  <th class="px-4 py-3 font-medium">Contacto</th>
                  <th class="px-4 py-3 font-medium">En stock</th>
                  <th class="px-4 py-3 font-medium">Liquidación pendiente</th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredRows(); track row.id) {
                  <tr
                    [routerLink]="['/m/inventory']"
                    [queryParams]="{ consignor: row.id }"
                    class="cursor-pointer border-b border-trama-sand-100 last:border-0 hover:bg-trama-sand-50"
                  >
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-trama-dark">{{ row.name }}</span>
                        @if (row.verified) {
                          <span
                            class="rounded-full bg-trama-green-100 px-2 py-0.5 text-xs font-medium text-trama-green-700"
                          >
                            Verificado
                          </span>
                        }
                      </div>
                    </td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.dni }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">
                      <div>{{ row.email }}</div>
                      <div class="text-trama-dark/50">{{ row.phone }}</div>
                    </td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.inStockCount }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.pendingPayout | money }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state message="No hay cedentes que coincidan con la búsqueda." />
        }
      </div>
    }
  `,
})
export class Consignors {
  private readonly auth = inject(AuthService);
  private readonly garmentsService = inject(GarmentsService);
  private readonly consignorsService = inject(ConsignorsService);
  private readonly agreementsService = inject(AgreementsService);
  private readonly salesService = inject(SalesService);

  protected readonly search = signal('');

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.load().pipe(
          map((data): ConsignorsState => ({ status: 'loaded', data })),
          startWith<ConsignorsState>({ status: 'loading', data: null }),
          catchError((): Observable<ConsignorsState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as ConsignorsState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected readonly filteredRows = computed(() => {
    const rows = this.data();
    if (!rows) return [];
    const term = this.search().trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(term) ||
        row.dni.toLowerCase().includes(term) ||
        row.email.toLowerCase().includes(term),
    );
  });

  protected retry(): void {
    this.reload.next();
  }

  private load(): Observable<ConsignorRow[]> {
    const merchantId = this.auth.user()?.id ?? '';
    return forkJoin({
      garments: this.garmentsService.byMerchant(merchantId),
      consignors: this.consignorsService.byMerchant(merchantId),
      agreements: this.agreementsService.list(),
      sales: this.salesService.list(),
    }).pipe(
      map(({ garments, consignors, agreements, sales }): ConsignorRow[] => {
        const consignorPriceByGarment = new Map(
          agreements.map((agreement) => [agreement.garmentId, agreement.agreedConsignorPrice]),
        );
        const consignorAmountByGarment = new Map(
          sales
            .filter((sale) => !sale.paidAt)
            .map((sale) => [sale.garmentId, sale.consignorAmount]),
        );

        return consignors
          .map((consignor): ConsignorRow => {
            const owned = garments.filter((garment) => garment.consignorId === consignor.id);
            const inStockCount = owned.filter(
              (garment) => garment.status === 'in_stock' || garment.status === 'with_remarks',
            ).length;
            const pendingPayout = owned
              .filter((garment) => garment.status === 'sold')
              .reduce(
                (total, garment) =>
                  total +
                  (consignorAmountByGarment.get(garment.id) ??
                    consignorPriceByGarment.get(garment.id) ??
                    0),
                0,
              );
            return {
              id: consignor.id,
              name: consignor.name,
              dni: consignor.dni,
              email: consignor.email,
              phone: consignor.phone,
              verified: consignor.verified,
              inStockCount,
              pendingPayout,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
      }),
    );
  }
}
