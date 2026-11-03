import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ConsignorsService } from '../../../core/services/consignors.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';
import { PROPOSAL_STATUSES, ProposalRow, buildProposalRows } from './proposal-rows';

type ProposalsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; rows: ProposalRow[] };

@Component({
  selector: 'app-merchant-proposals',
  imports: [LoadingSpinner, ErrorState, EmptyState, StatusBadge, MoneyPipe, ShortDatePipe],
  template: `
    @if (isLoading()) {
      <app-loading-spinner />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar las propuestas." (retry)="retry()" />
    } @else if (rows(); as rows) {
      <div class="space-y-6">
        <h1 class="text-2xl font-semibold text-trama-dark">Propuestas</h1>

        @if (rows.length) {
          <div class="overflow-x-auto rounded-2xl border border-trama-sand-200 bg-white">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-trama-sand-200 text-trama-dark/60">
                <tr>
                  <th class="px-4 py-3 font-medium">Prenda</th>
                  <th class="px-4 py-3 font-medium">Categoría</th>
                  <th class="px-4 py-3 font-medium">Cedente</th>
                  <th class="px-4 py-3 font-medium">Punto de venta</th>
                  <th class="px-4 py-3 font-medium">Estado</th>
                  <th class="px-4 py-3 font-medium">Para el cedente</th>
                  <th class="px-4 py-3 font-medium">Precio de venta</th>
                  <th class="px-4 py-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows; track row.garmentId) {
                  <tr class="border-b border-trama-sand-100 last:border-0">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        @if (row.photo) {
                          <img [src]="row.photo" alt="" class="h-10 w-10 rounded-lg object-cover" />
                        } @else {
                          <div class="h-10 w-10 rounded-lg bg-trama-sand-100"></div>
                        }
                        <span class="font-medium text-trama-dark">{{ row.name }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.category }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.consignorName }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.salesPointName }}</td>
                    <td class="px-4 py-3"><app-status-badge [status]="row.status" /></td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.consignorPrice | money }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.salePrice | money }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.createdAt | shortDate }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state message="Todavía no recibiste propuestas de cedentes." />
        }
      </div>
    }
  `,
})
export class MerchantProposals {
  private readonly auth = inject(AuthService);
  private readonly garmentsService = inject(GarmentsService);
  private readonly proposalsService = inject(ProposalsService);
  private readonly consignorsService = inject(ConsignorsService);
  private readonly merchantsService = inject(MerchantsService);

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.loadRows().pipe(
          map((rows): ProposalsState => ({ status: 'loaded', rows })),
          startWith<ProposalsState>({ status: 'loading' }),
          catchError(() => of<ProposalsState>({ status: 'error' })),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as ProposalsState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly rows = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.rows : null;
  });

  protected retry(): void {
    this.reload.next();
  }

  private loadRows(): Observable<ProposalRow[]> {
    const merchantId = this.auth.user()?.id ?? '';

    return forkJoin({
      garments: this.garmentsService.byMerchant(merchantId),
      proposals: this.proposalsService.proposalsForMerchant(PROPOSAL_STATUSES),
      consignors: this.consignorsService.list(),
      merchant: this.merchantsService.getById(merchantId),
    }).pipe(
      map(({ garments, proposals, consignors, merchant }) =>
        buildProposalRows(
          garments,
          new Map(proposals.map((proposal) => [proposal.garmentId, proposal])),
          new Map(consignors.map((consignor) => [consignor.id, consignor.name])),
          new Map(merchant.salesPoints.map((point) => [point.id, point.name])),
        ),
      ),
    );
  }
}
