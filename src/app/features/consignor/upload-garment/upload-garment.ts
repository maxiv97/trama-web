import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { GarmentCondition } from '../../../core/models/garment.model';
import { GarmentsService } from '../../../core/services/garments.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { ConsignorsService } from '../../../core/services/consignors.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { Category } from '../../../core/models/category.model';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { calculateSalePrice } from '../../../core/utils/price.util';
import { distanceKm } from '../../../core/utils/geo.util';
import { compressImage } from '../../../core/utils/image.util';
import { SEASONS } from '../../../core/models/garment-taxonomy';
import { LucideAngularModule, Search } from 'lucide-angular';
import { WizardShell, WizardStep, WizardSummaryRow } from '../../../shared/components/wizard-shell/wizard-shell';
import { PhotoUploader } from '../../../shared/components/photo-uploader/photo-uploader';
import { Dropdown, DropdownOption } from '../../../shared/components/dropdown/dropdown';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { VerifiedBadge } from '../../../shared/components/verified-badge/verified-badge';
import { ResultScreen } from '../../../shared/components/result-screen/result-screen';


interface MerchantOption {
  merchantId: string;
  salesPointId: string;
  businessName: string;
  neighborhood: string;
  commission: number;
  distance: number | null;
  verified: boolean;
  scheduleDays: string;
  scheduleHours: string;
}

interface Selection {
  merchantId: string;
  salesPointId: string;
}

const CONDITIONS: { value: GarmentCondition; label: string }[] = [
  { value: 'new', label: 'Nuevo' },
  { value: 'very_good', label: 'Muy bueno' },
  { value: 'good', label: 'Bueno' },
  { value: 'fair', label: 'Regular' },
];

const STEPS: WizardStep[] = [
  { label: 'Fotos', title: 'Mostrá bien la prenda', lead: 'Frente, espalda y etiqueta. Con buena luz se vende más rápido.' },
  { label: 'Comercio', title: '¿A qué comercio la enviás?', lead: 'Te mostramos primero los que están más cerca tuyo.' },
  { label: 'Descripción', title: 'Contanos cómo es', lead: 'Estos datos los ve el comercio antes de aceptarla.' },
  { label: 'Precio', title: '¿Cuánto querés recibir?', lead: 'Vos ponés lo que querés cobrar; el comercio suma su comisión.' },
];

interface Draft {
  step: number;
  selection: Selection | null;
  form: Record<string, unknown>;
  photos?: string[];
  videoName: string | null;
}

@Component({
  selector: 'app-upload-garment',
  imports: [ReactiveFormsModule, DecimalPipe, MoneyPipe, LucideAngularModule, WizardShell, PhotoUploader, Dropdown, Avatar, VerifiedBadge, ResultScreen],
  styles: `
    .opt {
      border: 2px solid var(--color-trama-sand-100);
      transition: border-color 150ms, background-color 150ms;
    }
    .opt:hover {
      border-color: var(--color-trama-thread-light);
    }
    .opt-on,
    .opt-on:hover {
      border-color: var(--color-trama-dark);
      background: var(--color-trama-sand-50);
    }
    .radio {
      border: 2px solid var(--color-trama-thread-faint);
    }
    .opt-on .radio {
      border-color: var(--color-trama-dark);
      background: var(--color-trama-dark);
    }
    .opt-on .dot {
      background: var(--color-trama-gold);
    }
    .amount {
      background: var(--color-trama-sand-50);
      border: 1.5px solid transparent;
      outline: 3px solid transparent;
      transition: all 150ms;
    }
    .amount:focus-within {
      background: var(--color-trama-paper);
      border-color: var(--color-trama-brand);
      outline-color: var(--color-trama-green-50);
    }
    .amount-error {
      border-color: var(--color-status-none);
      outline-color: var(--color-status-none-soft);
    }
  `,
  template: `
    <app-wizard-shell
      eyebrow="Cargar prenda"
      summaryTitle="Tu propuesta"
      finishLabel="Enviar propuesta"
      busyLabel="Enviando…"
      doneTitle="Propuesta enviada"
      [steps]="steps"
      [current]="step() - 1"
      [summary]="summary()"
      [busy]="submitting()"
      [done]="submitted()"
      [status]="savedAt() ? 'Guardado automáticamente' : ''"
      (next)="step() < 4 ? next() : submit()"
      (back)="back()"
      (stepChange)="goToStep($event + 1)"
    >
      @if (submitError()) {
        <div class="t-alert mb-5" role="alert">{{ submitError() }}</div>
      } @else if (showErrors() && !canAdvance()) {
        <div class="t-alert mb-5" role="alert">Revisá los campos marcados antes de seguir.</div>
      }

      @switch (step()) {
        @case (1) {
          <app-photo-uploader [(photos)]="photos" [invalid]="showErrors() && !photos().length" (failed)="photoFailed($event)" />
          @if (showErrors() && !photos().length) {
            <p class="t-error">Subí al menos una foto para seguir.</p>
          }

          <div class="mt-6">
            <span class="t-label">Video <span class="font-medium text-trama-muted">(opcional)</span></span>
            @if (videoName(); as name) {
              <div class="flex items-center justify-between gap-3 rounded-[11px] bg-trama-sand-50 px-4 py-3 text-sm">
                <span class="truncate text-trama-dark">{{ name }}</span>
                <button type="button" (click)="removeVideo()" class="t-link shrink-0">Quitar</button>
              </div>
            } @else {
              <label class="flex cursor-pointer items-center justify-center rounded-[11px] px-4 py-3 text-sm font-semibold text-trama-body transition-colors hover:bg-trama-sand-50 hover:text-trama-dark" style="border: 2px dashed #C9C2AE">
                Subí un video de tu prenda
                <input type="file" accept="video/*" class="sr-only" (change)="onVideoSelected($event)" />
              </label>
            }
          </div>
        }
        @case (2) {
          <div class="relative">
            <lucide-angular class="pointer-events-none absolute left-3.5 top-0 flex h-full items-center text-trama-muted" [img]="searchIcon" [size]="18" />
            <input
              type="search"
              [value]="search()"
              (input)="search.set($any($event.target).value)"
              placeholder="Buscá por nombre o barrio"
              aria-label="Buscar comercio"
              class="t-input"
              style="padding-left: 42px"
            />
          </div>

          @if (merchantOptions().length) {
            <div class="mt-4 space-y-2.5" role="radiogroup" aria-label="Comercio">
              @for (option of merchantOptions(); track option.merchantId) {
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="selection()?.merchantId === option.merchantId"
                  (click)="select(option)"
                  class="opt flex w-full items-center gap-4 rounded-2xl px-[18px] py-4 text-left"
                  [class.opt-on]="selection()?.merchantId === option.merchantId"
                >
                  <app-avatar kind="merchant" [name]="option.businessName" [size]="48" />
                  <span class="min-w-0 flex-1">
                    <span class="flex items-center gap-1.5">
                      <span class="truncate text-[16px] font-bold text-trama-dark">{{ option.businessName }}</span>
                      @if (option.verified) {
                        <app-verified-badge [size]="16" />
                      }
                    </span>
                    <span class="block truncate text-[13px] text-trama-body">
                      {{ option.neighborhood }}@if (option.distance !== null) { · a {{ option.distance | number: '1.1-1' }} km} · comisión {{ 100 - option.commission }} %
                    </span>
                    @if (option.scheduleDays) {
                      <span class="block truncate text-[12px] text-trama-muted">Recibe {{ option.scheduleDays }} {{ option.scheduleHours }}</span>
                    }
                  </span>
                  <span class="radio flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full">
                    <span class="dot h-2.5 w-2.5 rounded-full"></span>
                  </span>
                </button>
              }
            </div>
          } @else {
            <p class="mt-6 rounded-2xl bg-trama-sand-50 px-4 py-6 text-center text-sm text-trama-body">
              No encontramos comercios con "{{ search() }}". Probá con otro barrio.
            </p>
          }
          @if (showErrors() && !selection()) {
            <p class="t-error">Elegí un comercio para seguir.</p>
          }
        }
        @case (3) {
          <form [formGroup]="form" class="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="t-label" for="g-name">Nombre</label>
              <input id="g-name" formControlName="name" placeholder="Ej: Campera de jean azul" class="t-input" [class.t-input-error]="showError('name')" />
              @if (showError('name')) {
                <p class="t-error">{{ errorMessage('name') }}</p>
              }
            </div>
            <div>
              <span class="t-label">Categoría</span>
              <app-dropdown formControlName="category" placeholder="Elegí una categoría" ariaLabel="Categoría" [options]="categoryOptions()" [invalid]="showError('category')" />
              @if (showError('category')) {
                <p class="t-error">{{ errorMessage('category') }}</p>
              }
            </div>
            <div>
              <span class="t-label">Subcategoría</span>
              <app-dropdown formControlName="subcategory" placeholder="Elegí una subcategoría" ariaLabel="Subcategoría" [options]="subcategoryOptions()" [invalid]="showError('subcategory')" />
              @if (showError('subcategory')) {
                <p class="t-error">{{ errorMessage('subcategory') }}</p>
              }
            </div>
            <div>
              <label class="t-label" for="g-brand">Marca</label>
              <input id="g-brand" formControlName="brand" class="t-input" [class.t-input-error]="showError('brand')" />
              @if (showError('brand')) {
                <p class="t-error">{{ errorMessage('brand') }}</p>
              }
            </div>
            <div>
              <label class="t-label" for="g-size">Talle</label>
              <input id="g-size" formControlName="size" class="t-input" [class.t-input-error]="showError('size')" />
              @if (showError('size')) {
                <p class="t-error">{{ errorMessage('size') }}</p>
              }
            </div>
            <div>
              <label class="t-label" for="g-color">Color</label>
              <input id="g-color" formControlName="color" class="t-input" [class.t-input-error]="showError('color')" />
              @if (showError('color')) {
                <p class="t-error">{{ errorMessage('color') }}</p>
              }
            </div>
            <div>
              <span class="t-label">Temporada</span>
              <app-dropdown formControlName="season" placeholder="Elegí una temporada" ariaLabel="Temporada" [options]="seasonOptions" [invalid]="showError('season')" />
              @if (showError('season')) {
                <p class="t-error">{{ errorMessage('season') }}</p>
              }
            </div>
            <div class="sm:col-span-2">
              <span class="t-label">Estado</span>
              <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Estado de la prenda">
                @for (condition of conditions; track condition.value) {
                  <button
                    type="button"
                    role="radio"
                    class="t-chip"
                    [attr.aria-checked]="form.controls.condition.value === condition.value"
                    (click)="form.controls.condition.setValue(condition.value); form.controls.condition.markAsTouched()"
                  >
                    {{ condition.label }}
                  </button>
                }
              </div>
              @if (showError('condition')) {
                <p class="t-error">Elegí el estado de la prenda.</p>
              }
            </div>
            <div class="sm:col-span-2">
              <label class="t-label" for="g-desc">Descripción <span class="font-medium text-trama-muted">(opcional)</span></label>
              <textarea id="g-desc" formControlName="description" rows="3" class="t-input" placeholder="Detalles, uso, medidas…"></textarea>
            </div>
          </form>
        }
        @case (4) {
          <form [formGroup]="form" class="max-w-[460px]">
            <label class="t-label" for="g-price">Lo que querés recibir</label>
            <div
              class="amount flex items-baseline gap-2 rounded-[11px] px-4 py-3"
              [class.amount-error]="showError('consignorPrice')"
            >
              <span class="font-display text-[22px] font-bold text-trama-muted">$</span>
              <input
                id="g-price"
                type="number"
                inputmode="numeric"
                formControlName="consignorPrice"
                min="1"
                placeholder="0"
                class="w-full bg-transparent font-display text-[30px] font-extrabold tabular-nums text-trama-dark outline-none"
              />
            </div>
            @if (showError('consignorPrice')) {
              <p class="t-error">Ingresá un monto mayor a cero.</p>
            }

            @if (breakdown(); as b) {
              <div class="t-summary mt-5 space-y-2.5 !p-5 text-[15px]">
                <div class="flex justify-between gap-3">
                  <span class="text-trama-body">Vos recibís</span>
                  <span class="font-display font-bold tabular-nums text-trama-dark">{{ b.consignor | money }}</span>
                </div>
                <div class="flex justify-between gap-3">
                  <span class="text-trama-body">Comisión de {{ b.merchantName }} ({{ b.pct }} %)</span>
                  <span class="font-display font-bold tabular-nums text-trama-dark">{{ b.commission | money }}</span>
                </div>
                <div class="border-t-2 border-dashed border-trama-thread-light pt-2.5">
                  <div class="flex items-baseline justify-between gap-3">
                    <span class="font-semibold text-trama-dark">Precio de venta sugerido</span>
                    <span class="font-display text-[20px] font-extrabold tabular-nums text-trama-dark">{{ b.sale | money }}</span>
                  </div>
                </div>
              </div>
            }
            <p class="mt-4 text-sm text-trama-body">El comercio puede aceptar este precio o mandarte una contraoferta.</p>
          </form>
        }
      }

      @if (submitted()) {
      <app-result-screen
        result
        title="Propuesta enviada"
        [body]="sentMerchantName() + ' ya la tiene para revisar. Te avisamos cuando la acepte o te mande una contraoferta.'"
      >
        @if (sent(); as r) {
          <div summary class="t-summary space-y-1.5 text-left text-sm">
            <div class="flex justify-between gap-3"><span class="text-trama-body">Prenda</span><span class="truncate font-bold text-trama-dark">{{ r.name }}</span></div>
            <div class="flex justify-between gap-3"><span class="text-trama-body">Talle</span><span class="font-bold text-trama-dark">{{ r.size }}</span></div>
            <div class="flex justify-between gap-3"><span class="text-trama-body">Precio pedido</span><span class="font-display font-bold tabular-nums text-trama-dark">{{ r.price | money }}</span></div>
            <div class="flex justify-between gap-3"><span class="text-trama-body">Código</span><span class="font-mono text-[13px] font-bold text-trama-dark">{{ r.code }}</span></div>
          </div>
        }
        <button actions type="button" (click)="reset()" class="t-btn t-btn-primary">Cargar otra prenda</button>
        <button actions type="button" (click)="viewGarment()" class="t-btn t-btn-secondary">Ver seguimiento</button>
        <button exit type="button" (click)="goHome()" class="t-link">Volver al panel</button>
      </app-result-screen>
      }
    </app-wizard-shell>
  `,
})
export class UploadGarment {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly garmentsService = inject(GarmentsService);
  private readonly proposalsService = inject(ProposalsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly consignorsService = inject(ConsignorsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly steps = STEPS;
  // Catálogo del comercio elegido (base − ocultas + propias), traído de la API.
  protected readonly categories = signal<Category[]>([]);
  protected readonly seasons = SEASONS;
  protected readonly conditions = CONDITIONS;

  protected readonly step = signal(1);
  protected readonly photos = signal<string[]>([]);
  protected readonly videoName = signal<string | null>(null);
  protected readonly selection = signal<Selection | null>(null);
  protected readonly search = signal('');
  protected readonly submitting = signal(false);
  protected readonly showErrors = signal(false);
  protected readonly submitError = signal('');
  // Pantalla de confirmación tras enviar la propuesta.
  protected readonly submitted = signal(false);
  protected readonly sentGarmentId = signal<string | null>(null);
  protected readonly sentMerchantName = signal('');
  protected readonly sent = signal<{ name: string; size: string; price: number; code: string } | null>(null);
  protected readonly savedAt = signal<number | null>(null);
  protected readonly searchIcon = Search;
  protected readonly seasonOptions: DropdownOption[] = SEASONS.map((x) => ({ value: x, label: x }));

  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    category: ['', Validators.required],
    subcategory: ['', Validators.required],
    brand: ['', Validators.required],
    size: ['', Validators.required],
    color: ['', Validators.required],
    season: ['', Validators.required],
    condition: ['', Validators.required],
    description: [''],
    consignorPrice: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  private readonly merchants = toSignal(this.merchantsService.list(), { initialValue: [] });
  private readonly consignor = toSignal(
    this.consignorsService
      .getById(this.auth.user()?.id ?? '')
      .pipe(catchError(() => of(undefined))),
    { initialValue: undefined },
  );

  private readonly categoryValue = toSignal(this.form.controls.category.valueChanges, {
    initialValue: this.form.controls.category.value,
  });
  private readonly priceValue = toSignal(this.form.controls.consignorPrice.valueChanges, {
    initialValue: this.form.controls.consignorPrice.value,
  });

  protected readonly subcategories = computed(
    () =>
      this.categories().find((category) => category.label === this.categoryValue())
        ?.subcategories ?? [],
  );

  protected readonly merchantOptions = computed<MerchantOption[]>(() => {
    const origin = this.consignor()?.location;
    const term = this.search().trim().toLowerCase();
    return this.merchants()
      .map((merchant): MerchantOption => {
        const nearest = [...merchant.salesPoints].sort(
          (a, b) => this.distanceFrom(origin, a.geo) - this.distanceFrom(origin, b.geo),
        )[0];
        const distance =
          origin?.lat != null && origin.lng != null && nearest
            ? distanceKm({ lat: origin.lat, lng: origin.lng }, nearest.geo)
            : null;
        return {
          merchantId: merchant.id,
          salesPointId: nearest?.id ?? '',
          businessName: merchant.businessName,
          neighborhood: merchant.location.neighborhood,
          commission: merchant.commissionConfig.consignorPercentage,
          verified: merchant.verified,
          distance,
          scheduleDays: nearest?.receptionSchedule.days ?? '',
          scheduleHours: nearest?.receptionSchedule.hours ?? '',
        };
      })
      .filter(
        (option) =>
          !term ||
          option.businessName.toLowerCase().includes(term) ||
          option.neighborhood.toLowerCase().includes(term),
      )
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  });

  private readonly selectedMerchant = computed(() =>
    this.merchants().find((merchant) => merchant.id === this.selection()?.merchantId),
  );


  protected readonly categoryOptions = computed<DropdownOption[]>(() =>
    this.categories().map((c) => ({
      value: c.label,
      label: c.label,
      hint: c.subcategories?.length ? c.subcategories.slice(0, 3).join(', ') : undefined,
    })),
  );
  protected readonly subcategoryOptions = computed<DropdownOption[]>(() =>
    this.subcategories().map((sub) => ({ value: sub, label: sub })),
  );

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  /** Resumen "Tu propuesta" del costado. */
  protected readonly summary = computed<WizardSummaryRow[]>(() => {
    const v = this.formValue();
    const n = this.photos().length;
    const price = Number(v.consignorPrice);
    return [
      { label: 'Fotos', value: n ? `${n} ${n === 1 ? 'foto' : 'fotos'}` : null },
      { label: 'Comercio', value: this.selectedMerchant()?.businessName ?? null },
      { label: 'Prenda', value: v.name ? [v.name, v.size].filter(Boolean).join(' · ') : null },
      { label: 'Querés recibir', value: price > 0 ? this.money.transform(price) : null },
    ];
  });

  /** Desglose del precio: lo que recibe el cedente, la comisión y el precio de venta. */
  protected readonly breakdown = computed(() => {
    const price = Number(this.priceValue());
    const merchant = this.selectedMerchant();
    if (!price || !merchant) return null;
    const sale = calculateSalePrice(price, merchant.commissionConfig.consignorPercentage);
    return {
      consignor: price,
      sale,
      commission: sale - price,
      pct: merchant.commissionConfig.merchantPercentage ?? 100 - merchant.commissionConfig.consignorPercentage,
      merchantName: merchant.businessName,
    };
  });

  private readonly money = new MoneyPipe();
  private readonly draftKey = `trama.draft.upload.${this.auth.user()?.id ?? 'anon'}`;

  constructor() {
    this.form.controls.category.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.subcategory.setValue(''));
    this.restoreDraft();
    // Guardado automático: cada cambio de paso, selección, fotos o campos.
    effect(() => {
      this.step();
      this.selection();
      this.photos();
      this.videoName();
      this.formValue();
      if (!this.submitted()) untracked(() => this.saveDraft());
    });
  }

  protected goToStep(n: number): void {
    if (n >= 1 && n < this.step()) {
      this.showErrors.set(false);
      this.step.set(n);
    }
  }

  protected photoFailed(name: string): void {
    this.toast.show(`No pudimos procesar ${name}`, 'error');
  }

  private saveDraft(): void {
    const draft: Draft = {
      step: this.step(),
      selection: this.selection(),
      form: this.form.getRawValue(),
      photos: this.photos(),
      videoName: this.videoName(),
    };
    try {
      localStorage.setItem(this.draftKey, JSON.stringify(draft));
    } catch {
      // Si las fotos no entran en el almacenamiento, se guardan solo los datos.
      try {
        localStorage.setItem(this.draftKey, JSON.stringify({ ...draft, photos: undefined }));
      } catch {
        return;
      }
    }
    this.savedAt.set(Date.now());
  }

  private restoreDraft(): void {
    let draft: Draft | null = null;
    try {
      const raw = localStorage.getItem(this.draftKey);
      draft = raw ? (JSON.parse(raw) as Draft) : null;
    } catch {
      draft = null;
    }
    if (!draft) return;
    if (draft.selection) {
      this.selection.set(draft.selection);
      this.loadCategories(draft.selection.merchantId, draft.form);
    } else {
      this.form.patchValue(draft.form, { emitEvent: false });
    }
    if (draft.photos?.length) this.photos.set(draft.photos);
    this.videoName.set(draft.videoName ?? null);
    this.step.set(Math.min(Math.max(1, draft.step || 1), 4));
  }

  private clearDraft(): void {
    try {
      localStorage.removeItem(this.draftKey);
    } catch {
      /* sin almacenamiento */
    }
    this.savedAt.set(null);
  }

  private scrollToFirstError(): void {
    setTimeout(() => {
      const el = document.querySelector('.t-error, .t-input-error, [aria-invalid="true"]');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  protected onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.videoName.set(file.name);
    input.value = '';
  }

  protected removeVideo(): void {
    this.videoName.set(null);
  }

  protected select(option: MerchantOption): void {
    const current = this.selection();
    this.selection.set({ merchantId: option.merchantId, salesPointId: option.salesPointId });
    // El catálogo depende del comercio: al cambiarlo, recargo categorías y limpio
    // la selección previa de categoría/subcategoría que podría no existir en el nuevo.
    if (current?.merchantId !== option.merchantId) {
      this.form.controls.category.setValue('');
      this.form.controls.subcategory.setValue('');
      this.loadCategories(option.merchantId);
    }
  }

  private loadCategories(merchantId: string, restore?: Record<string, unknown>): void {
    this.categoriesService
      .forMerchant(merchantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categories.set(categories);
          if (restore) {
            this.form.patchValue(restore, { emitEvent: false });
            this.form.controls.subcategory.setValue((restore['subcategory'] as string) ?? '', { emitEvent: false });
            this.form.updateValueAndValidity();
          }
        },
        error: () => this.toast.show('No pudimos cargar las categorías del comercio', 'error'),
      });
  }

  protected canAdvance(): boolean {
    switch (this.step()) {
      case 1:
        return this.photos().length >= 1;
      case 2:
        return this.selection() !== null;
      case 3:
        return this.descriptionValid();
      case 4:
        return this.form.controls.consignorPrice.valid;
      default:
        return false;
    }
  }

  // Muestra el error de un campo del paso de descripción cuando fue tocado o
  // cuando el usuario ya intentó avanzar.
  protected showError(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.touched || this.showErrors());
  }

  protected errorMessage(name: string): string {
    const errors = this.form.get(name)?.errors;
    if (!errors) return '';
    if (errors['required']) return 'Este campo es obligatorio.';
    if (errors['min']) return `El mínimo es ${errors['min'].min}.`;
    return 'Revisá este dato.';
  }

  protected next(): void {
    if (!this.canAdvance()) {
      this.revealErrors();
      return;
    }
    this.showErrors.set(false);
    if (this.step() < 4) this.step.update((value) => value + 1);
  }

  protected back(): void {
    this.showErrors.set(false);
    this.submitError.set('');
    if (this.step() > 1) this.step.update((value) => value - 1);
  }

  private revealErrors(): void {
    if (this.step() === 3) this.form.markAllAsTouched();
    if (this.step() === 4) this.form.controls.consignorPrice.markAsTouched();
    this.showErrors.set(true);
    this.scrollToFirstError();
  }

  protected submit(): void {
    if (this.submitting()) return;
    const selection = this.selection();
    const merchant = this.selectedMerchant();
    if (!selection || !merchant || !this.canAdvance()) {
      this.revealErrors();
      return;
    }
    this.submitError.set('');

    const raw = this.form.getRawValue();
    const consignorPrice = Number(raw.consignorPrice);
    const salePrice = calculateSalePrice(
      consignorPrice,
      merchant.commissionConfig.consignorPercentage,
    );

    this.submitting.set(true);
    this.garmentsService
      .create({
        consignorId: this.auth.user()?.id ?? '',
        merchantId: selection.merchantId,
        salesPointId: selection.salesPointId,
        name: raw.name ?? '',
        category: raw.category ?? '',
        subcategory: raw.subcategory ?? '',
        brand: raw.brand ?? '',
        size: raw.size ?? '',
        color: raw.color ?? '',
        season: raw.season ?? '',
        condition: raw.condition as GarmentCondition,
        description: raw.description ?? '',
        photos: this.photos(),
        video: this.videoName() ?? undefined,
      })
      .pipe(
        switchMap((garment) =>
          this.proposalsService
            .create({
              garmentId: garment.id,
              requestedConsignorPrice: consignorPrice,
              calculatedSalePrice: salePrice,
            })
            .pipe(map(() => garment)),
        ),
      )
      .subscribe({
        next: (garment) => {
          this.submitting.set(false);
          this.sentGarmentId.set(garment.id);
          this.sentMerchantName.set(merchant.businessName);
          this.sent.set({
            name: raw.name ?? '',
            size: raw.size ?? '',
            price: consignorPrice,
            code: garment.id.slice(-6).toUpperCase(),
          });
          this.clearDraft();
          this.submitted.set(true);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          const message = this.submitErrorMessage(err);
          this.submitError.set(message);
          this.toast.show(message, 'error');
        },
      });
  }

  protected reset(): void {
    this.form.reset({ consignorPrice: null });
    this.photos.set([]);
    this.videoName.set(null);
    this.selection.set(null);
    this.categories.set([]);
    this.search.set('');
    this.showErrors.set(false);
    this.submitError.set('');
    this.sentGarmentId.set(null);
    this.submitted.set(false);
    this.sent.set(null);
    this.clearDraft();
    this.step.set(1);
  }

  protected viewGarment(): void {
    const id = this.sentGarmentId();
    if (id) this.router.navigate(['/c/garment', id]);
  }

  protected goHome(): void {
    this.router.navigate(['/c']);
  }

  private submitErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'No pudimos conectarnos con el servidor. Probá de nuevo en unos minutos.';
    }
    if (err.status === 413) {
      return 'Las fotos son demasiado pesadas. Probá con menos fotos o imágenes más livianas.';
    }
    const detail = err.error?.message;
    const message = Array.isArray(detail) ? detail[0] : detail;
    return typeof message === 'string' && message
      ? message
      : 'No pudimos enviar la propuesta. Revisá los datos e intentá de nuevo.';
  }

  private descriptionValid(): boolean {
    return (
      ['name', 'category', 'subcategory', 'brand', 'size', 'color', 'season', 'condition'] as const
    ).every((control) => this.form.controls[control].valid);
  }

  private distanceFrom(
    origin: { lat?: number; lng?: number } | undefined,
    to: { lat: number; lng: number },
  ): number {
    if (origin?.lat == null || origin.lng == null) return Infinity;
    return distanceKm({ lat: origin.lat, lng: origin.lng }, to);
  }
}
