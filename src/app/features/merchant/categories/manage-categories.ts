import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, startWith, switchMap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { Category } from '../../../core/models/category.model';
import { CategoriesService } from '../../../core/services/categories.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { ToastService } from '../../../shared/components/toast/toast.service';

interface BaseRow {
  label: string;
  shown: boolean;
}

interface CategoriesData {
  custom: Category[];
  base: BaseRow[];
  baseLabels: string[];
  hidden: string[];
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
      <div class="space-y-8">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl font-semibold text-trama-dark">Categorías</h1>
            <p class="mt-1 text-sm text-trama-dark/60">
              Elegí qué categorías base ofrecés y sumá las tuyas propias.
            </p>
          </div>
          <button
            type="button"
            (click)="openCreate()"
            class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700"
          >
            Agregar categoría
          </button>
        </div>

        <!-- Categorías propias -->
        <section class="space-y-3">
          <h2 class="text-sm font-semibold tracking-wide text-trama-dark/60 uppercase">
            Mis categorías
          </h2>
          @if (d.custom.length) {
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              @for (category of d.custom; track category.id) {
                <div class="space-y-2 rounded-2xl border border-trama-sand-200 bg-white p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="font-medium text-trama-dark">{{ category.label }}</p>
                      @if (category.parentLabel) {
                        <p class="text-xs text-trama-dark/50">Consolida en: {{ category.parentLabel }}</p>
                      }
                    </div>
                    <div class="flex gap-2">
                      <button
                        type="button"
                        (click)="openEdit(category)"
                        class="rounded-lg border border-trama-sand-200 px-3 py-1.5 text-xs font-medium text-trama-dark hover:bg-trama-sand-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        (click)="askDelete(category)"
                        class="rounded-lg border border-status-none/30 px-3 py-1.5 text-xs font-medium text-status-none hover:bg-status-none-soft"
                      >
                        Dar de baja
                      </button>
                    </div>
                  </div>
                  @if (category.subcategories.length) {
                    <p class="text-sm text-trama-dark/70">{{ category.subcategories.join(' · ') }}</p>
                  } @else {
                    <p class="text-sm text-trama-dark/40">Sin subcategorías</p>
                  }
                </div>
              }
            </div>
          } @else {
            <app-empty-state message="Todavía no agregaste categorías propias." />
          }
        </section>

        <!-- Catálogo base -->
        <section class="space-y-3">
          <h2 class="text-sm font-semibold tracking-wide text-trama-dark/60 uppercase">
            Catálogo base
          </h2>
          <p class="text-sm text-trama-dark/60">
            Las que no ofrecés no aparecen cuando un cedente te elige. No afecta a otros comercios.
          </p>
          <div class="divide-y divide-trama-sand-100 overflow-hidden rounded-2xl border border-trama-sand-200 bg-white">
            @for (row of d.base; track row.label) {
              <div class="flex items-center justify-between gap-3 px-4 py-3">
                <span [class]="row.shown ? 'text-trama-dark' : 'text-trama-dark/40 line-through'">
                  {{ row.label }}
                </span>
                <button
                  type="button"
                  (click)="toggleBase(row)"
                  [disabled]="savingHidden()"
                  class="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  [class]="
                    row.shown
                      ? 'border-trama-sand-200 text-trama-dark/70 hover:bg-trama-sand-100'
                      : 'border-trama-brand bg-trama-green-50 text-trama-brand hover:bg-trama-green-100'
                  "
                >
                  {{ row.shown ? 'Ofreciéndola' : 'No la ofrezco' }}
                </button>
              </div>
            }
          </div>
        </section>
      </div>

      <!-- Alta / edición -->
      @if (formOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" (click)="close()">
          <div
            class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lg"
            (click)="$event.stopPropagation()"
          >
            <h2 class="text-lg font-semibold text-trama-dark">
              {{ editingId() ? 'Editar categoría' : 'Agregar categoría' }}
            </h2>

            <div class="mt-4 space-y-4">
              <label class="block text-sm">
                <span class="text-trama-dark/70">Nombre</span>
                <input
                  [value]="fLabel()"
                  (input)="fLabel.set($any($event.target).value)"
                  placeholder="Ej: Ropa de bebé"
                  class="mt-1 w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm outline-none focus:border-trama-brand"
                />
              </label>

              <label class="block text-sm">
                <span class="text-trama-dark/70">Subcategorías</span>
                <span class="block text-xs text-trama-dark/50">Una por línea (opcional).</span>
                <textarea
                  [value]="fSubcategories()"
                  (input)="fSubcategories.set($any($event.target).value)"
                  rows="4"
                  placeholder="Bodys&#10;Enteritos&#10;Camperitas"
                  class="mt-1 w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm outline-none focus:border-trama-brand"
                ></textarea>
              </label>

              <label class="block text-sm">
                <span class="text-trama-dark/70">Consolidar en (para reportes)</span>
                <span class="block text-xs text-trama-dark/50">
                  Categoría base con la que se agrupa en las métricas. Opcional.
                </span>
                <select
                  [value]="fParent()"
                  (change)="fParent.set($any($event.target).value)"
                  class="mt-1 w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm outline-none focus:border-trama-brand"
                >
                  <option value="">Ninguna</option>
                  @for (label of parentOptions(); track label) {
                    <option [value]="label" [selected]="label === fParent()">{{ label }}</option>
                  }
                </select>
              </label>

              @if (formError()) {
                <p class="rounded-lg bg-status-none-soft px-3 py-2 text-sm text-status-none">
                  {{ formError() }}
                </p>
              }
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button
                type="button"
                (click)="close()"
                class="rounded-lg px-4 py-2 text-sm font-medium text-trama-dark/70 hover:bg-trama-sand-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="save()"
                [disabled]="!fLabel().trim() || saving()"
                class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700 disabled:opacity-40"
              >
                {{ saving() ? 'Guardando…' : 'Guardar' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Confirmación de baja -->
      @if (deleting(); as target) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" (click)="deleting.set(null)">
          <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg" (click)="$event.stopPropagation()">
            <h2 class="text-lg font-semibold text-trama-dark">Dar de baja la categoría</h2>
            <p class="mt-2 text-sm text-trama-dark/70">
              "{{ target.label }}" dejará de ofrecerse a los cedentes. Las prendas que ya la usan no
              se modifican.
            </p>
            <div class="mt-6 flex justify-end gap-3">
              <button
                type="button"
                (click)="deleting.set(null)"
                class="rounded-lg px-4 py-2 text-sm font-medium text-trama-dark/70 hover:bg-trama-sand-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirmDelete(target)"
                [disabled]="saving()"
                class="rounded-lg bg-status-none px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
              >
                {{ saving() ? 'Dando de baja…' : 'Dar de baja' }}
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class ManageCategories {
  private readonly auth = inject(AuthService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly toast = inject(ToastService);

  private readonly merchantId = this.auth.user()?.id ?? '';

  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly savingHidden = signal(false);
  protected readonly deleting = signal<Category | null>(null);
  protected readonly formError = signal('');

  protected readonly fLabel = signal('');
  protected readonly fSubcategories = signal('');
  protected readonly fParent = signal('');

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

  protected readonly parentOptions = computed(() => this.data()?.baseLabels ?? []);

  protected retry(): void {
    this.reload.next();
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.fLabel.set('');
    this.fSubcategories.set('');
    this.fParent.set('');
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected openEdit(category: Category): void {
    this.editingId.set(category.id);
    this.fLabel.set(category.label);
    this.fSubcategories.set(category.subcategories.join('\n'));
    this.fParent.set(category.parentLabel ?? '');
    this.formError.set('');
    this.formOpen.set(true);
  }

  protected close(): void {
    this.formOpen.set(false);
  }

  protected save(): void {
    const label = this.fLabel().trim();
    if (!label || this.saving()) return;
    const payload = {
      label,
      subcategories: this.parseSubcategories(),
      parentLabel: this.fParent().trim() || undefined,
    };
    this.saving.set(true);
    this.formError.set('');
    const id = this.editingId();
    const request = id
      ? this.categoriesService.update(id, payload)
      : this.categoriesService.create(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.toast.show(id ? 'Categoría actualizada' : 'Categoría agregada');
        this.reload.next();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.formError.set(this.backendMessage(err) || 'No pudimos guardar la categoría.');
      },
    });
  }

  protected askDelete(category: Category): void {
    this.deleting.set(category);
  }

  protected confirmDelete(category: Category): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.categoriesService.remove(category.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.deleting.set(null);
        this.toast.show('Categoría dada de baja');
        this.reload.next();
      },
      error: () => {
        this.saving.set(false);
        this.toast.show('No pudimos dar de baja la categoría', 'error');
      },
    });
  }

  protected toggleBase(row: BaseRow): void {
    const current = this.data();
    if (!current || this.savingHidden()) return;
    // Ofreciéndola → ocultar; no la ofrezco → volver a mostrar.
    const hidden = row.shown
      ? [...current.hidden, row.label]
      : current.hidden.filter((label) => label !== row.label);
    this.savingHidden.set(true);
    this.categoriesService.setHidden(hidden).subscribe({
      next: () => {
        this.savingHidden.set(false);
        this.reload.next();
      },
      error: () => {
        this.savingHidden.set(false);
        this.toast.show('No pudimos actualizar el catálogo', 'error');
      },
    });
  }

  private parseSubcategories(): string[] {
    return this.fSubcategories()
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private backendMessage(err: HttpErrorResponse): string {
    const detail = err.error?.message;
    return Array.isArray(detail) ? detail[0] : typeof detail === 'string' ? detail : '';
  }

  private load(): Observable<CategoriesData> {
    return forkJoin({
      all: this.categoriesService.forMerchant(),
      mine: this.categoriesService.forMerchant(this.merchantId),
    }).pipe(
      map(({ all, mine }): CategoriesData => {
        const baseLabels = all.filter((category) => category.base).map((category) => category.label);
        const visibleBase = new Set(
          mine.filter((category) => category.base).map((category) => category.label),
        );
        const hidden = baseLabels.filter((label) => !visibleBase.has(label));
        return {
          custom: mine.filter((category) => !category.base),
          base: baseLabels.map((label) => ({ label, shown: visibleBase.has(label) })),
          baseLabels,
          hidden,
        };
      }),
    );
  }
}
