import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, startWith, switchMap } from 'rxjs';
import { Category, CategoryInput } from '../../../core/models/category.model';
import { AuthService } from '../../../core/auth/auth.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { ToastService } from '../../../shared/components/toast/toast.service';

interface CategoriesData {
  base: (Category & { hidden: boolean })[];
  custom: Category[];
}

type CategoriesState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: CategoriesData };

@Component({
  selector: 'app-manage-categories',
  imports: [LoadingSpinner, ErrorState, EmptyState],
  template: `
    @if (isLoading()) {
      <app-loading-spinner />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar las categorías." (retry)="retry()" />
    } @else if (data(); as d) {
      <div class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h1 class="text-2xl font-semibold text-trama-dark">Categorías</h1>
        </div>

        <section>
          <h2 class="mb-2 text-sm font-semibold uppercase tracking-wide text-trama-dark/40">Categorías base</h2>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            @for (b of d.base; track b.label) {
              <div class="flex items-center justify-between rounded-2xl border border-trama-sand-200 bg-white p-4">
                <span class="font-medium text-trama-dark">{{ b.label }}</span>
                <span class="text-xs text-trama-dark/50">{{ b.hidden ? 'Oculta' : 'Visible' }}</span>
              </div>
            }
          </div>
        </section>

        <section>
          <h2 class="mb-2 text-sm font-semibold uppercase tracking-wide text-trama-dark/40">Mis categorías</h2>
          @if (d.custom.length) {
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              @for (c of d.custom; track c.id) {
                <div class="rounded-2xl border border-trama-sand-200 bg-white p-4">
                  <p class="font-medium text-trama-dark">{{ c.label }}</p>
                </div>
              }
            </div>
          } @else {
            <app-empty-state message="Todavía no creaste categorías propias." />
          }
        </section>
      </div>
    }
  `,
})

export class ManageCategories {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly categoriesService = inject(CategoriesService);

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.load().pipe(
          map((data): CategoriesState => ({ status: 'loaded', data })),
          startWith<CategoriesState>({ status: 'loading', data: null }),
          catchError((): Observable<CategoriesState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as CategoriesState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected retry(): void {
    this.reload.next();
  }

  private load(): Observable<CategoriesData> {
    const ownId = this.auth.user()?.id ?? '';
    return forkJoin({ 
      allBase: this.categoriesService.forMerchant(),
      mine: this.categoriesService.forMerchant(ownId)
    }).pipe(
      map(({ allBase, mine }) => {
        const base = allBase.map((b) => ({
          ...b,
          hidden: !mine.some((c) => c.base && c.label === b.label),
        }));
        const custom = mine.filter((c) => !c.base);
        return { base, custom };
      }),
    );
  }
}
