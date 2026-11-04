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
                  <button
                    type="button"
                    (click)="toggleHidden(b)"
                    class="rounded-lg border border-trama-sand-200 px-3 py-1.5 text-xs font-medium text-trama-dark hover:bg-trama-sand-100"
                  >
                    {{ b.hidden ? 'Mostrar' : 'Ocultar' }}
                  </button>
              </div>
            }
          </div>
        </section>

        <section>
          <div class="mb-2 flex items-center justify-between">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-trama-dark/40">Mis categorías</h2>
            <button type="button" (click)="openCreate()"
              class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700">
              Agregar categoría
            </button>
          </div>
          @if (d.custom.length) {
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              @for (c of d.custom; track c.id) {
                <div class="flex items-start justify-between gap-3 rounded-2xl border border-trama-sand-200 bg-white p-4">
                  <div>
                    <p class="font-medium text-trama-dark">{{ c.label }}</p>
                    @if (c.subcategories.length) {
                      <p class="text-sm text-trama-dark/60">{{ c.subcategories.join(', ') }}</p>
                    }
                  </div>
                  <div class="flex shrink-0 gap-2">
                    <button type="button" (click)="openEdit(c)"
                      class="rounded-lg border border-trama-sand-200 px-3 py-1.5 text-xs font-medium text-trama-dark hover:bg-trama-sand-100">Editar</button>
                    <button type="button" (click)="remove(c.id)"
                      class="rounded-lg border border-trama-sand-200 px-3 py-1.5 text-xs font-medium text-status-none hover:bg-trama-sand-100">Borrar</button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <app-empty-state message="Todavía no creaste categorías propias." />
          }
        </section>
      </div>
      @if (formOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" (click)="close()">
          <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg" (click)="$event.stopPropagation()">
            <h2 class="text-lg font-semibold text-trama-dark">
              {{ editingId() ? 'Editar categoría' : 'Agregar categoría' }}
            </h2>
            <div class="mt-4 space-y-4">
              <label class="block text-sm">
                <span class="text-trama-dark/70">Nombre</span>
                <input [value]="fLabel()" (input)="fLabel.set($any($event.target).value)"
                  class="mt-1 w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm" />
              </label>
              <label class="block text-sm">
                <span class="text-trama-dark/70">Subcategorías (separadas por coma)</span>
                <input [value]="fSubcategories()" (input)="fSubcategories.set($any($event.target).value)"
                  class="mt-1 w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm" />
              </label>
              <label class="block text-sm">
                <span class="text-trama-dark/70">Categoría base (opcional)</span>
                <select [value]="fParentLabel()" (change)="fParentLabel.set($any($event.target).value)"
                  class="mt-1 w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm">
                  <option value="">(ninguna)</option>
                  @for (b of d.base; track b.label) {
                    <option [value]="b.label">{{ b.label }}</option>
                  }
                </select>
              </label>
            </div>
            <div class="mt-6 flex justify-end gap-3">
              <button type="button" (click)="close()"
                class="rounded-lg px-4 py-2 text-sm font-medium text-trama-dark/70 hover:bg-trama-sand-100">Cancelar</button>
              <button type="button" (click)="save()" [disabled]="!canSave() || saving()"
                class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700 disabled:opacity-40">
                {{ saving() ? 'Guardando…' : 'Guardar' }}
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

  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly fLabel = signal('');
  protected readonly fSubcategories = signal('');
  protected readonly fParentLabel = signal('');

  protected readonly canSave = computed(() => this.fLabel().trim().length > 0);

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected retry(): void {
    this.reload.next();
  }

  protected toggleHidden(row: Category & { hidden: boolean }): void {
    const current = this.data()?.base.filter((b) => b.hidden).map((b) => b.label) ?? [];
    const next = row.hidden
      ? current.filter((l) => l !== row.label)
      : [...current, row.label];
    this.categoriesService.setHidden(next).subscribe({
      next: () => this.reload.next(),
      error: () => this.toast.show('No pudimos actualizar la categoría', 'error'),
    });
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

  protected openCreate(): void {
    this.editingId.set(null);
    this.fLabel.set('');
    this.fSubcategories.set('');
    this.fParentLabel.set('');
    this.formOpen.set(true);
  }

  protected openEdit(c: Category): void {
    this.editingId.set(c.id);
    this.fLabel.set(c.label);
    this.fSubcategories.set(c.subcategories.join(', '));
    this.fParentLabel.set(c.parentLabel ?? '');
    this.formOpen.set(true);
  }

  protected close(): void {
    this.formOpen.set(false);
  }

  protected save(): void {
    if (!this.canSave() || this.saving()) return;
    const body: CategoryInput = {
      label: this.fLabel().trim(),
      subcategories: this.fSubcategories().split(',').map((s) => s.trim()).filter(Boolean),
      parentLabel: this.fParentLabel().trim() || undefined,
    };
    const editingId = this.editingId();
    const req = editingId
      ? this.categoriesService.update(editingId, body)
      : this.categoriesService.create(body);

    this.saving.set(true);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.toast.show(editingId ? 'Categoría actualizada' : 'Categoría creada');
        this.reload.next();
      },
      error: () => {
        this.saving.set(false);
        this.toast.show('No pudimos guardar la categoría', 'error');
      },
    });
  }

  protected remove(id: string): void {
    if (!confirm('¿Borrar esta categoría?')) return;
    this.categoriesService.remove(id).subscribe({
      next: () => {
        this.toast.show('Categoría eliminada');
        this.reload.next();
      },
      error: () => this.toast.show('No pudimos borrar la categoría', 'error'),
    });
  }
}
