import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { PlatformConfigService } from '../../../core/services/platform-config.service';
import { Role } from '../../../core/models/user.model';
import {
  RegisterConsignorRequest,
  RegisterMerchantRequest,
} from '../../../core/models/register.model';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { LogoIcon } from '../../../shared/components/logo/logo';
import { Coords, MapPickerDirective } from '../../../shared/directives/map-picker.directive';

interface StepDef {
  id: string;
  label: string;
  title: string;
  sub: string;
}

// Fallback geolocation when the user never drags the pin: the city centre, so the request is valid.
const CORDOBA_CENTER = { lat: -31.4201, lng: -64.1888 };

const DAYS = [
  { label: 'Lunes', short: 'Lun' },
  { label: 'Martes', short: 'Mar' },
  { label: 'Miércoles', short: 'Mié' },
  { label: 'Jueves', short: 'Jue' },
  { label: 'Viernes', short: 'Vie' },
  { label: 'Sábado', short: 'Sáb' },
  { label: 'Domingo', short: 'Dom' },
];

const TIME_SLOTS = ((): string[] => {
  const out: string[] = [];
  for (let m = 7 * 60; m <= 22 * 60; m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
})();

const CONSIGNOR_STEPS: StepDef[] = [
  {
    id: 'account',
    label: 'Datos de la cuenta',
    title: 'Tus datos de contacto',
    sub: 'Con estos datos el comercio te identifica y te avisamos de cada movimiento de tus prendas.',
  },
  {
    id: 'dni',
    label: 'Identidad',
    title: 'Verificación de identidad',
    sub: 'El DNI queda asociado a la cuenta para respaldar la entrega de prendas y el cobro de liquidaciones.',
  },
  {
    id: 'location',
    label: 'Ubicación',
    title: '¿Desde dónde consignás?',
    sub: 'Usamos la zona para mostrarte los comercios más cercanos. No publicamos tu dirección exacta.',
  },
  {
    id: 'terms',
    label: 'Términos',
    title: 'Revisá y confirmá',
    sub: 'Última revisión antes de crear la cuenta.',
  },
];

const MERCHANT_STEPS: StepDef[] = [
  {
    id: 'account',
    label: 'Datos de la cuenta',
    title: 'Datos de quien administra',
    sub: 'La persona responsable de la cuenta: recibe los avisos y firma los acuerdos con los cedentes.',
  },
  {
    id: 'business',
    label: 'El comercio',
    title: 'Datos del comercio',
    sub: 'Así aparece tu comercio ante los cedentes cuando eligen dónde consignar.',
  },
  {
    id: 'pdv',
    label: 'Punto de venta',
    title: 'Primer punto de venta',
    sub: 'Dónde recibís las prendas y en qué horarios. Después podés agregar más puntos.',
  },
  {
    id: 'commission',
    label: 'Comisión',
    title: 'Cómo se reparte cada venta',
    sub: 'El porcentaje se aplica sobre el precio de venta al público de cada prenda.',
  },
  {
    id: 'conditions',
    label: 'Condiciones',
    title: 'Plazos y día de pago',
    sub: 'Las condiciones que acepta el cedente cuando consigna con vos.',
  },
  {
    id: 'terms',
    label: 'Términos',
    title: 'Revisá y confirmá',
    sub: 'Última revisión antes de crear la cuenta.',
  },
];

function daysLabel(selected: boolean[]): string {
  const idx = selected.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return '';
  const groups: number[][] = [];
  idx.forEach((i) => {
    const last = groups[groups.length - 1];
    if (last && i === last[last.length - 1] + 1) last.push(i);
    else groups.push([i]);
  });
  return groups
    .map((g) =>
      g.length >= 3
        ? `${DAYS[g[0]].label} a ${DAYS[g[g.length - 1]].label.toLowerCase()}`
        : g.map((i) => DAYS[i].short).join(', '),
    )
    .join(' y ');
}

interface SummaryRow {
  key: string;
  value: string;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, LogoIcon, MapPickerDirective],
  template: `
    <div class="min-h-screen bg-trama-sand-50 px-4 py-8">
      <div class="mx-auto max-w-3xl">
        <div class="mb-6 flex items-center justify-between">
          <a routerLink="/" class="flex items-center gap-2">
            <app-logo-icon [size]="28" />
            <span class="text-title-3 text-trama-brand">Trama</span>
          </a>
          <span class="text-sm text-trama-body">
            ¿Ya tenés cuenta?
            <a routerLink="/login" class="font-medium text-trama-brand hover:underline">Ingresar</a>
          </span>
        </div>

        @switch (view()) {
          @case ('role') {
            <div class="rounded-2xl bg-trama-sidebar p-8 text-white sm:p-10">
              <h1 class="font-display text-3xl font-semibold sm:text-4xl">¿Cómo vas a usar Trama?</h1>
              <p class="mt-3 max-w-lg text-white/70">Elegí un rol para empezar el registro.</p>
            </div>
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              <div class="t-card flex flex-col gap-3 p-6">
                <span class="text-xs font-semibold tracking-wide text-trama-brand uppercase">Cedente</span>
                <h2 class="text-title-3 text-trama-dark">
                  Quiero dejar prendas en consignación
                </h2>
                <p class="text-sm text-trama-body">
                  Cargás tus artículos, acordás el precio con el comercio y cobrás cuando se venden.
                </p>
                <ul class="mt-1 space-y-1 text-sm text-trama-body">
                  <li>Datos personales y DNI</li>
                  <li>Barrio y ciudad</li>
                  <li>Verificación del email</li>
                </ul>
                <button
                  type="button"
                  (click)="pick('consignor')"
                  class="mt-auto t-btn t-btn-primary"
                >
                  Registrarme como cedente
                </button>
              </div>

              <div class="t-card flex flex-col gap-3 p-6">
                <span class="text-xs font-semibold tracking-wide text-trama-gold uppercase">Comercio</span>
                <h2 class="text-title-3 text-trama-dark">
                  Quiero recibir prendas para vender
                </h2>
                <p class="text-sm text-trama-body">
                  Configurás tu comisión, tus condiciones de venta y el punto de venta donde recibís.
                </p>
                @if (monetization()) {
                  <p class="rounded-lg bg-trama-green-50 px-3 py-2 text-xs font-medium text-trama-green-700">
                    Servicio pago para comercios: tu suscripción te posiciona ante los cedentes que
                    buscan dónde consignar.
                  </p>
                }
                <ul class="mt-1 space-y-1 text-sm text-trama-body">
                  <li>Datos del comercio y CUIT</li>
                  <li>Punto de venta y horarios</li>
                  <li>Comisión, plazos y día de pago</li>
                </ul>
                <button
                  type="button"
                  (click)="pick('merchant')"
                  class="mt-auto rounded-lg bg-trama-sidebar px-4 py-2.5 font-medium text-white hover:bg-trama-dark"
                >
                  Registrarme como comercio
                </button>
              </div>
            </div>
          }

          @case ('wizard') {
            <ol class="mb-6 flex items-center">
              @for (s of steps(); track s.id; let i = $index; let last = $last) {
                <li class="flex items-center" [class.flex-1]="!last">
                  <div class="flex flex-col items-center">
                    <span
                      class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium"
                      [class]="circleClass(i)"
                      >{{ i < step() ? '✓' : i + 1 }}</span
                    >
                    <span class="mt-1 hidden whitespace-nowrap text-xs sm:block" [class]="labelClass(i)">{{
                      s.label
                    }}</span>
                  </div>
                  @if (!last) {
                    <span
                      class="mx-2 h-0.5 flex-1"
                      [class]="i < step() ? 'bg-trama-brand' : 'bg-trama-sand-200'"
                    ></span>
                  }
                </li>
              }
            </ol>

            @if (role() === 'merchant' && monetization()) {
              <div class="mb-4 rounded-2xl border border-trama-gold/30 bg-trama-gold/10 p-4">
                <p class="text-sm font-semibold text-trama-dark">
                  Trama es un servicio pago para comercios
                </p>
                <p class="mt-1 text-sm text-trama-body">
                  Con tu suscripción aparecés ante los cedentes de tu zona que buscan dónde consignar,
                  además de todas las herramientas para gestionar el ciclo. Cuanto mejor tu plan, mejor
                  tu posicionamiento en la plataforma.
                </p>
              </div>
            }

            <div class="t-card p-6 sm:p-8">
              <p class="text-xs font-semibold tracking-wide text-trama-brand uppercase">
                Paso {{ step() + 1 }} de {{ steps().length }}
              </p>
              <h2 class="mt-1 font-display text-2xl font-semibold text-trama-dark">
                {{ current().title }}
              </h2>
              <p class="mt-1 text-sm text-trama-body">{{ current().sub }}</p>

              <div class="mt-6">
                @switch (current().id) {
                  @case ('account') {
                    <form [formGroup]="accountForm" class="grid gap-4 sm:grid-cols-2">
                      @if (role() === 'merchant') {
                        <div class="sm:col-span-2">
                          <label class="t-label">Nombre y apellido</label>
                          <input formControlName="name" placeholder="María Vega" [class]="inputClass" />
                          @if (showErrors() && !accountForm.controls.name.value?.trim()) {
                            <p class="t-error">Ingresá el nombre y apellido.</p>
                          }
                        </div>
                      } @else {
                        <div>
                          <label class="t-label">Nombre</label>
                          <input formControlName="firstName" placeholder="María" [class]="inputClass" />
                          @if (showErrors() && !accountForm.controls.firstName.value?.trim()) {
                            <p class="t-error">Ingresá tu nombre.</p>
                          }
                        </div>
                        <div>
                          <label class="t-label">Apellido</label>
                          <input formControlName="lastName" placeholder="Vega" [class]="inputClass" />
                          @if (showErrors() && !accountForm.controls.lastName.value?.trim()) {
                            <p class="t-error">Ingresá tu apellido.</p>
                          }
                        </div>
                      }
                      <div>
                        <label class="t-label">Email</label>
                        <input formControlName="email" type="email" placeholder="maria@email.com" [class]="inputClass" />
                        @if (showError(accountForm, 'email')) {
                          <p class="t-error">{{ errorMessage(accountForm, 'email') }}</p>
                        }
                      </div>
                      <div>
                        <label class="t-label">Teléfono</label>
                        <input formControlName="phone" type="tel" placeholder="+54 9 351 555 1234" [class]="inputClass" />
                        @if (showError(accountForm, 'phone')) {
                          <p class="t-error">{{ errorMessage(accountForm, 'phone') }}</p>
                        }
                      </div>
                      <div>
                        <label class="t-label">Contraseña</label>
                        <input formControlName="password" type="password" placeholder="Mínimo 8 caracteres" [class]="inputClass" />
                        @if (showError(accountForm, 'password')) {
                          <p class="t-error">{{ errorMessage(accountForm, 'password') }}</p>
                        }
                      </div>
                      <div>
                        <label class="t-label">Repetir contraseña</label>
                        <input formControlName="password2" type="password" [class]="inputClass" />
                        @if (passwordMismatch()) {
                          <p class="t-error">Las contraseñas no coinciden.</p>
                        }
                      </div>
                    </form>
                  }
                  @case ('dni') {
                    <form [formGroup]="dniForm" class="max-w-xs">
                      <label class="t-label">Número de DNI</label>
                      <input formControlName="dni" placeholder="30123456" [class]="inputClass" />
                      @if (showError(dniForm, 'dni')) {
                        <p class="t-error">{{ errorMessage(dniForm, 'dni') }}</p>
                      } @else {
                        <p class="t-help">Sin puntos ni espacios.</p>
                      }
                    </form>
                  }
                  @case ('location') {
                    <form [formGroup]="consignorLocationForm" class="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label class="t-label">Calle</label>
                        <input formControlName="street" placeholder="Independencia" [class]="inputClass" />
                        @if (showError(consignorLocationForm, 'street')) {
                          <p class="t-error">{{ errorMessage(consignorLocationForm, 'street') }}</p>
                        }
                      </div>
                      <div class="grid grid-cols-2 gap-4">
                        <div>
                          <label class="t-label">Número</label>
                          <input formControlName="number" placeholder="742" [class]="inputClass" />
                          @if (showError(consignorLocationForm, 'number')) {
                            <p class="t-error">{{ errorMessage(consignorLocationForm, 'number') }}</p>
                          }
                        </div>
                        <div>
                          <label class="t-label">Depto / Piso <span class="text-trama-muted">(opcional)</span></label>
                          <input formControlName="unit" placeholder="3B" [class]="inputClass" />
                        </div>
                      </div>
                      <div>
                        <label class="t-label">Barrio</label>
                        <input formControlName="neighborhood" placeholder="Nueva Córdoba" [class]="inputClass" />
                        @if (showError(consignorLocationForm, 'neighborhood')) {
                          <p class="t-error">{{ errorMessage(consignorLocationForm, 'neighborhood') }}</p>
                        }
                      </div>
                      <div>
                        <label class="t-label">Ciudad</label>
                        <input formControlName="city" placeholder="Córdoba" [class]="inputClass" />
                        @if (showError(consignorLocationForm, 'city')) {
                          <p class="t-error">{{ errorMessage(consignorLocationForm, 'city') }}</p>
                        }
                      </div>
                      <div class="sm:col-span-2">
                        <span class="t-label">Marcá tu ubicación en el mapa</span>
                        <div
                          appMapPicker
                          (coordsChange)="consignorGeo.set($event)"
                          class="h-56 w-full overflow-hidden rounded-xl border border-trama-sand-200"
                        ></div>
                        <p class="t-help">
                          Arrastrá el pin o tocá el mapa para ajustar el punto. No publicamos tu dirección exacta.
                        </p>
                      </div>
                    </form>
                  }
                  @case ('business') {
                    <form [formGroup]="businessForm" class="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label class="t-label">Nombre del comercio</label>
                        <input formControlName="businessName" placeholder="Vuelta Showroom" [class]="inputClass" />
                        @if (showError(businessForm, 'businessName')) {
                          <p class="t-error">{{ errorMessage(businessForm, 'businessName') }}</p>
                        }
                      </div>
                      <div>
                        <label class="t-label">CUIT</label>
                        <input formControlName="cuit" placeholder="30712345678" [class]="inputClass" />
                        @if (showError(businessForm, 'cuit')) {
                          <p class="t-error">{{ errorMessage(businessForm, 'cuit') }}</p>
                        } @else {
                          <p class="t-help">11 dígitos, sin guiones.</p>
                        }
                      </div>
                      <div>
                        <label class="t-label">Barrio</label>
                        <input formControlName="neighborhood" placeholder="Güemes" [class]="inputClass" />
                        @if (showError(businessForm, 'neighborhood')) {
                          <p class="t-error">{{ errorMessage(businessForm, 'neighborhood') }}</p>
                        }
                      </div>
                      <div>
                        <label class="t-label">Ciudad</label>
                        <input formControlName="city" placeholder="Córdoba" [class]="inputClass" />
                        @if (showError(businessForm, 'city')) {
                          <p class="t-error">{{ errorMessage(businessForm, 'city') }}</p>
                        }
                      </div>
                    </form>
                  }
                  @case ('pdv') {
                    <form [formGroup]="pdvForm" class="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label class="t-label">Nombre del punto de venta</label>
                        <input formControlName="spName" placeholder="Local Güemes" [class]="inputClass" />
                        @if (showError(pdvForm, 'spName')) {
                          <p class="t-error">{{ errorMessage(pdvForm, 'spName') }}</p>
                        }
                      </div>
                      <div>
                        <label class="t-label">Teléfono del local</label>
                        <input formControlName="spPhone" type="tel" placeholder="351 444 2020" [class]="inputClass" />
                        @if (showError(pdvForm, 'spPhone')) {
                          <p class="t-error">{{ errorMessage(pdvForm, 'spPhone') }}</p>
                        }
                      </div>
                      <div class="sm:col-span-2">
                        <label class="t-label">Dirección</label>
                        <input formControlName="spAddress" placeholder="Belgrano 800" [class]="inputClass" />
                        @if (showError(pdvForm, 'spAddress')) {
                          <p class="t-error">{{ errorMessage(pdvForm, 'spAddress') }}</p>
                        }
                      </div>
                      <div class="sm:col-span-2">
                        <label class="t-label">Instrucciones para el cedente</label>
                        <textarea
                          formControlName="spInstructions"
                          rows="2"
                          placeholder="Traer las prendas planchadas y en bolsa. Preguntar por Ana en el mostrador."
                          [class]="inputClass"
                        ></textarea>
                      </div>
                      <div class="sm:col-span-2">
                        <span class="mb-2 block text-sm font-medium text-trama-dark">Días de recepción</span>
                        <div class="flex flex-wrap gap-2">
                          @for (day of days; track day.short; let i = $index) {
                            <button
                              type="button"
                              (click)="toggleDay(i)"
                              class="rounded-full border px-3 py-1.5 text-sm"
                              [class]="
                                daysSel()[i]
                                  ? 'border-trama-brand bg-trama-green-50 text-trama-brand'
                                  : 'border-trama-sand-200 text-trama-body hover:border-trama-brand'
                              "
                            >
                              {{ day.short }}
                            </button>
                          }
                        </div>
                        @if (showErrors() && !daysSel().includes(true)) {
                          <p class="t-error">Elegí al menos un día de recepción.</p>
                        }
                      </div>
                      <div>
                        <label class="t-label">Abre</label>
                        <select [value]="fromTime()" (change)="setFrom($any($event.target).value)" [class]="inputClass">
                          @for (slot of timeSlots; track slot) {
                            <option [value]="slot" [selected]="slot === fromTime()">{{ slot }}</option>
                          }
                        </select>
                      </div>
                      <div>
                        <label class="t-label">Cierra</label>
                        <select [value]="toTime()" (change)="setTo($any($event.target).value)" [class]="inputClass">
                          @for (slot of timeSlots; track slot) {
                            <option [value]="slot" [selected]="slot === toTime()">{{ slot }}</option>
                          }
                        </select>
                        @if (!hoursValid()) {
                          <p class="t-error">El cierre debe ser posterior a la apertura.</p>
                        }
                      </div>
                      <div class="sm:col-span-2">
                        <div class="mb-1 flex items-baseline justify-between">
                          <span class="text-sm font-medium text-trama-dark">Ubicación exacta del local</span>
                          <span class="text-xs text-trama-muted">{{ coordsLabel(merchantGeo()) }}</span>
                        </div>
                        <div
                          appMapPicker
                          kind="merchant"
                          (coordsChange)="merchantGeo.set($event)"
                          class="h-56 w-full overflow-hidden rounded-xl border border-trama-sand-200"
                        ></div>
                        <p class="t-help">
                          Arrastrá el pin o tocá el mapa para ubicar la puerta del local.
                        </p>
                      </div>
                    </form>
                  }
                  @case ('commission') {
                    <div class="space-y-4">
                      <div class="grid gap-4 sm:grid-cols-2">
                        <div class="rounded-xl border border-trama-sand-200 bg-trama-sand-50 p-4">
                          <p class="text-sm font-medium text-trama-dark">Se lleva el cedente</p>
                          <div class="mt-2 flex items-baseline gap-2">
                            <input
                              type="number"
                              min="40"
                              max="95"
                              [value]="consignorPct()"
                              (input)="setConsignorPct($any($event.target).value)"
                              class="t-input w-24 text-2xl font-semibold text-trama-dark"
                            />
                            <span class="text-xl font-semibold text-trama-body">%</span>
                          </div>
                        </div>
                        <div class="rounded-xl border border-trama-sand-200 bg-trama-sand-50 p-4">
                          <p class="text-sm font-medium text-trama-dark">Se lleva el comercio</p>
                          <div class="mt-2 flex items-baseline gap-2">
                            <span class="text-2xl font-semibold text-trama-dark">{{ merchantPct() }}</span>
                            <span class="text-xl font-semibold text-trama-body">%</span>
                          </div>
                        </div>
                      </div>
                      <div class="flex flex-wrap items-center gap-6 rounded-xl bg-trama-sidebar p-4 text-white">
                        <span class="max-w-[20ch] text-sm text-white/70">Ejemplo: una prenda que se vende a $20.000</span>
                        <div>
                          <p class="text-xs font-semibold tracking-wide text-white/50 uppercase">Cedente</p>
                          <p class="text-lg font-semibold">{{ example(consignorPct()) }}</p>
                        </div>
                        <div>
                          <p class="text-xs font-semibold tracking-wide text-white/50 uppercase">Comercio</p>
                          <p class="text-lg font-semibold">{{ example(merchantPct()) }}</p>
                        </div>
                      </div>
                      @if (!commissionValid()) {
                        <p class="text-xs text-status-none">El porcentaje del cedente debe estar entre 40 % y 95 %.</p>
                      }
                    </div>
                  }
                  @case ('conditions') {
                    <form [formGroup]="conditionsForm" class="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label class="t-label">Plazo de venta</label>
                        <input formControlName="saleWindowMonths" type="number" min="1" max="12" [class]="inputClass" />
                        @if (showError(conditionsForm, 'saleWindowMonths')) {
                          <p class="t-error">{{ errorMessage(conditionsForm, 'saleWindowMonths') }}</p>
                        } @else {
                          <p class="t-help">Meses en góndola (1 a 12).</p>
                        }
                      </div>
                      <div>
                        <label class="t-label">Período de gracia</label>
                        <input formControlName="graceMonths" type="number" min="0" max="6" [class]="inputClass" />
                        @if (showError(conditionsForm, 'graceMonths')) {
                          <p class="t-error">{{ errorMessage(conditionsForm, 'graceMonths') }}</p>
                        } @else {
                          <p class="t-help">Meses extra (0 a 6).</p>
                        }
                      </div>
                      <div>
                        <label class="t-label">Día de pago</label>
                        <input formControlName="payoutDay" type="number" min="1" max="28" [class]="inputClass" />
                        @if (showError(conditionsForm, 'payoutDay')) {
                          <p class="t-error">{{ errorMessage(conditionsForm, 'payoutDay') }}</p>
                        } @else {
                          <p class="t-help">Del mes (1 a 28).</p>
                        }
                      </div>
                    </form>
                  }
                  @case ('terms') {
                    <div class="space-y-4">
                      <div class="grid gap-3 rounded-xl border border-trama-sand-200 bg-trama-sand-50 p-4 sm:grid-cols-2">
                        @for (row of summary(); track row.key) {
                          <div>
                            <p class="text-xs font-semibold tracking-wide text-trama-muted uppercase">{{ row.key }}</p>
                            <p class="mt-0.5 text-sm text-trama-dark">{{ row.value }}</p>
                          </div>
                        }
                      </div>
                      <div class="max-h-40 space-y-2 overflow-auto rounded-xl border border-trama-sand-200 bg-trama-sand-50 p-4 text-sm text-trama-body">
                        <p>La consignación no transfiere la propiedad de la prenda: el cedente sigue siendo dueño hasta que se concreta la venta al público.</p>
                        <p>El comercio recibe, revisa y exhibe las prendas acordadas, y registra cualquier discrepancia respecto de la propuesta al momento de la recepción.</p>
                        <p>El reparto de cada venta se rige por la comisión acordada. Un cambio posterior de comisión no afecta a las prendas ya acordadas.</p>
                        <p>Las liquidaciones se pagan el día del mes definido por el comercio, por las prendas vendidas en el período anterior.</p>
                      </div>
                      <label class="flex items-start gap-3 text-sm text-trama-dark">
                        <input type="checkbox" [checked]="accepted()" (change)="accepted.set($any($event.target).checked)" class="mt-0.5 h-4 w-4 accent-trama-brand" />
                        <span>Leí y acepto los términos de consignación y la política de datos de Trama.</span>
                      </label>
                      @if (showErrors() && !accepted()) {
                        <p class="text-xs text-status-none">Tenés que aceptar los términos para crear la cuenta.</p>
                      }
                    </div>
                  }
                }
              </div>
            </div>

            @if (showErrors() && !canAdvance()) {
              <p class="mt-4 rounded-lg bg-status-none-soft px-3 py-2 text-sm text-status-none" role="alert">
                Revisá los campos marcados antes de continuar.
              </p>
            }
            @if (submitError()) {
              <p class="mt-4 rounded-lg bg-status-none-soft px-3 py-2 text-sm text-status-none" role="alert">
                {{ submitError() }}
              </p>
            }

            <div class="mt-6 flex items-center justify-between">
              <button
                type="button"
                (click)="back()"
                class="t-btn t-btn-ghost"
              >
                {{ step() === 0 ? 'Cambiar de rol' : 'Anterior' }}
              </button>
              @if (step() < steps().length - 1) {
                <button
                  type="button"
                  (click)="next()"
                  class="t-btn t-btn-primary"
                >
                  Siguiente
                </button>
              } @else {
                <button
                  type="button"
                  (click)="submit()"
                  [disabled]="submitting()"
                  class="t-btn t-btn-primary"
                >
                  {{ submitting() ? 'Creando cuenta…' : 'Crear cuenta' }}
                </button>
              }
            </div>
          }

          @case ('verify') {
            <div class="t-card p-6 sm:p-8">
              <span class="text-xs font-semibold tracking-wide text-trama-brand uppercase">Cuenta creada</span>
              <h2 class="mt-1 font-display text-2xl font-semibold text-trama-dark">Confirmá tu email</h2>
              <p class="mt-1 text-sm text-trama-body">
                Te enviamos un código de 6 dígitos a
                <span class="font-medium text-trama-dark">{{ accountForm.controls.email.value }}</span
                >. Ingresalo para verificar tu cuenta.
              </p>

              <div class="mt-6 max-w-xs space-y-3">
                <input
                  [value]="code()"
                  (input)="setCode($any($event.target).value)"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="123456"
                  class="t-input w-full text-center text-2xl font-semibold tracking-[0.3em] text-trama-dark"
                />
                @if (codeError()) {
                  <p class="text-xs text-status-none">{{ codeError() }}</p>
                }
                <div class="flex items-center gap-3">
                  <button
                    type="button"
                    (click)="verify()"
                    [disabled]="code().length < 6 || verifying()"
                    class="t-btn t-btn-primary"
                  >
                    {{ verifying() ? 'Verificando…' : 'Verificar' }}
                  </button>
                  <button
                    type="button"
                    (click)="resend()"
                    [disabled]="resending()"
                    class="text-sm font-medium text-trama-brand hover:underline disabled:opacity-40"
                  >
                    {{ resending() ? 'Enviando…' : 'Reenviar código' }}
                  </button>
                </div>
              </div>

              <button
                type="button"
                (click)="finish()"
                class="mt-6 block text-sm text-trama-muted hover:text-trama-dark hover:underline"
              >
                Verificar más tarde
              </button>
            </div>
          }

          @case ('done') {
            <div class="rounded-2xl bg-trama-sidebar p-8 text-white sm:p-10">
              <span class="text-xs font-semibold tracking-wide text-trama-gold uppercase">Cuenta creada</span>
              <h1 class="mt-3 font-display text-3xl font-semibold sm:text-4xl">{{ doneTitle() }}</h1>
              <p class="mt-3 max-w-xl text-white/70">{{ doneSub() }}</p>
              @if (verified()) {
                <p class="mt-3 inline-flex items-center gap-2 rounded-full bg-trama-green-700 px-3 py-1 text-sm font-medium text-white">
                  ✓ Email verificado
                </p>
              }
              <a
                [routerLink]="panelHref()"
                class="mt-6 w-fit t-btn t-btn-primary"
              >
                {{ panelLabel() }}
              </a>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly platformConfig = inject(PlatformConfigService);

  // Flag de cobro a comercios: comunica en el registro que el servicio es pago.
  protected readonly monetization = this.platformConfig.monetization;

  protected readonly days = DAYS;
  protected readonly timeSlots = TIME_SLOTS;
  protected readonly inputClass =
    't-input';

  protected readonly view = signal<'role' | 'wizard' | 'verify' | 'done'>('role');
  protected readonly role = signal<Role | null>(null);
  protected readonly step = signal(0);
  protected readonly submitting = signal(false);
  // Pasa a true cuando el usuario intenta avanzar con el paso incompleto, para
  // revelar los mensajes de validación de ese paso.
  protected readonly showErrors = signal(false);
  protected readonly submitError = signal('');

  protected readonly daysSel = signal<boolean[]>([true, true, true, true, true, false, false]);
  protected readonly fromTime = signal('10:00');
  protected readonly toTime = signal('18:00');
  protected readonly consignorPct = signal(70);
  protected readonly code = signal('');
  protected readonly accepted = signal(false);
  protected readonly verifying = signal(false);
  protected readonly resending = signal(false);
  protected readonly codeError = signal('');
  protected readonly verified = signal(false);
  protected readonly consignorGeo = signal<Coords>(CORDOBA_CENTER);
  protected readonly merchantGeo = signal<Coords>(CORDOBA_CENTER);

  protected readonly accountForm = this.fb.group({
    name: [''], // used by the merchant flow; consignor uses firstName/lastName
    firstName: [''],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password2: ['', Validators.required],
  });

  protected readonly dniForm = this.fb.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
  });

  protected readonly consignorLocationForm = this.fb.group({
    street: ['', Validators.required],
    number: ['', Validators.required],
    unit: [''],
    neighborhood: ['', Validators.required],
    city: ['', Validators.required],
  });

  protected readonly businessForm = this.fb.group({
    businessName: ['', Validators.required],
    cuit: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    neighborhood: ['', Validators.required],
    city: ['', Validators.required],
  });

  protected readonly pdvForm = this.fb.group({
    spName: ['', Validators.required],
    spPhone: ['', Validators.required],
    spAddress: ['', Validators.required],
    spInstructions: [''],
  });

  protected readonly conditionsForm = this.fb.group({
    saleWindowMonths: [3, [Validators.required, Validators.min(1), Validators.max(12)]],
    graceMonths: [1, [Validators.required, Validators.min(0), Validators.max(6)]],
    payoutDay: [10, [Validators.required, Validators.min(1), Validators.max(28)]],
  });

  protected readonly steps = computed<StepDef[]>(() =>
    this.role() === 'merchant' ? MERCHANT_STEPS : this.role() === 'consignor' ? CONSIGNOR_STEPS : [],
  );
  protected readonly current = computed<StepDef>(() => this.steps()[this.step()] ?? CONSIGNOR_STEPS[0]);

  protected readonly merchantPct = computed(() => 100 - this.consignorPct());

  protected readonly summary = computed<SummaryRow[]>(() => this.buildSummary());

  protected readonly doneTitle = computed(() =>
    this.role() === 'merchant'
      ? 'Tu comercio ya puede recibir consignaciones'
      : 'Tu cuenta de cedente está lista',
  );
  protected readonly doneSub = computed(() =>
    this.role() === 'merchant'
      ? `Los cedentes de tu zona ya ven a ${this.businessForm.controls.businessName.value || 'tu comercio'} entre los comercios disponibles, con tu comisión y condiciones publicadas.`
      : 'Podés cargar tu primer artículo y enviarlo como propuesta al comercio que elijas.',
  );
  protected readonly panelHref = computed(() => (this.role() === 'merchant' ? '/m' : '/c'));
  protected readonly panelLabel = computed(() =>
    this.role() === 'merchant' ? 'Ir al panel del comercio' : 'Ir al panel del cedente',
  );

  constructor() {
    // Permite entrar directo al formulario desde la landing/login: /register?rol=cedente|comercio
    const rol = inject(ActivatedRoute).snapshot.queryParamMap.get('rol');
    if (rol === 'cedente') this.pick('consignor');
    else if (rol === 'comercio') this.pick('merchant');
  }

  protected pick(role: Role): void {
    this.role.set(role);
    this.step.set(0);
    this.view.set('wizard');
  }

  protected circleClass(index: number): string {
    const current = this.step();
    if (index < current) return 'bg-trama-brand text-white';
    if (index === current) return 'bg-trama-brand text-white ring-4 ring-trama-green-100';
    return 'bg-trama-sand-200 text-trama-muted';
  }

  protected labelClass(index: number): string {
    return index <= this.step() ? 'font-medium text-trama-dark' : 'text-trama-muted';
  }

  protected passwordMismatch(): boolean {
    const { password, password2 } = this.accountForm.controls;
    return !!password2.value && password.value !== password2.value;
  }

  protected hoursValid(): boolean {
    return TIME_SLOTS.indexOf(this.fromTime()) < TIME_SLOTS.indexOf(this.toTime());
  }

  protected commissionValid(): boolean {
    const p = this.consignorPct();
    return p >= 40 && p <= 95;
  }

  protected example(pct: number): string {
    return '$' + Math.round((20000 * pct) / 100).toLocaleString('es-AR');
  }

  protected coordsLabel(coords: Coords): string {
    return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
  }

  protected toggleDay(index: number): void {
    this.daysSel.update((sel) => sel.map((on, i) => (i === index ? !on : on)));
  }

  protected setFrom(value: string): void {
    this.fromTime.set(value);
    if (!this.hoursValid()) {
      const next = TIME_SLOTS[Math.min(TIME_SLOTS.indexOf(value) + 1, TIME_SLOTS.length - 1)];
      this.toTime.set(next);
    }
  }

  protected setTo(value: string): void {
    this.toTime.set(value);
  }

  protected setConsignorPct(value: string): void {
    const n = Number(value);
    this.consignorPct.set(Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0);
  }

  protected setCode(value: string): void {
    this.code.set(value.replace(/\D/g, '').slice(0, 6));
  }

  // The consignor uses first/last name, the merchant a single name; names have no form validators
  // (they differ by role), so check the right ones here.
  private accountNamesValid(): boolean {
    const { name, firstName, lastName } = this.accountForm.controls;
    return this.role() === 'merchant'
      ? !!name.value?.trim()
      : !!firstName.value?.trim() && !!lastName.value?.trim();
  }

  protected canAdvance(): boolean {
    switch (this.current().id) {
      case 'account':
        return this.accountForm.valid && this.accountNamesValid() && !this.passwordMismatch();
      case 'dni':
        return this.dniForm.valid;
      case 'location':
        return this.consignorLocationForm.valid;
      case 'business':
        return this.businessForm.valid;
      case 'pdv':
        return this.pdvForm.valid && this.daysSel().some(Boolean) && this.hoursValid();
      case 'commission':
        return this.commissionValid();
      case 'conditions':
        return this.conditionsForm.valid;
      case 'terms':
        return this.accepted();
      default:
        return false;
    }
  }

  // Muestra el error de un campo del formulario reactivo cuando fue tocado o
  // cuando el usuario ya intentó avanzar.
  protected showError(form: FormGroup, name: string): boolean {
    const control = form.get(name);
    return !!control && control.invalid && (control.touched || this.showErrors());
  }

  protected errorMessage(form: FormGroup, name: string): string {
    const control = form.get(name);
    const errors = control?.errors;
    if (!errors) return '';
    if (errors['required']) return 'Este campo es obligatorio.';
    if (errors['email']) return 'Ingresá un email válido.';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres.`;
    if (errors['min']) return `El mínimo es ${errors['min'].min}.`;
    if (errors['max']) return `El máximo es ${errors['max'].max}.`;
    if (errors['pattern']) {
      if (name === 'dni') return 'El DNI debe tener 7 u 8 dígitos, sin puntos.';
      if (name === 'cuit') return 'El CUIT debe tener 11 dígitos, sin guiones.';
      return 'El formato no es válido.';
    }
    return 'Revisá este dato.';
  }

  private backendMessage(err: HttpErrorResponse): string {
    const detail = err.error?.message;
    return Array.isArray(detail) ? detail[0] : typeof detail === 'string' ? detail : '';
  }

  // Formulario reactivo del paso actual (los pasos custom devuelven null).
  private stepForm(): FormGroup | null {
    switch (this.current().id) {
      case 'account':
        return this.accountForm;
      case 'dni':
        return this.dniForm;
      case 'location':
        return this.consignorLocationForm;
      case 'business':
        return this.businessForm;
      case 'pdv':
        return this.pdvForm;
      case 'conditions':
        return this.conditionsForm;
      default:
        return null;
    }
  }

  private revealErrors(): void {
    this.stepForm()?.markAllAsTouched();
    this.showErrors.set(true);
  }

  protected next(): void {
    if (!this.canAdvance()) {
      this.revealErrors();
      return;
    }
    this.showErrors.set(false);
    if (this.step() < this.steps().length - 1) {
      this.step.update((v) => v + 1);
    }
  }

  protected back(): void {
    this.showErrors.set(false);
    this.submitError.set('');
    if (this.step() === 0) {
      this.view.set('role');
      this.role.set(null);
      return;
    }
    this.step.update((v) => v - 1);
  }

  protected submit(): void {
    if (this.submitting()) return;
    if (!this.canAdvance()) {
      this.revealErrors();
      return;
    }
    this.submitError.set('');
    this.submitting.set(true);
    const request$ =
      this.role() === 'merchant'
        ? this.auth.registerMerchant(this.buildMerchantRequest())
        : this.auth.registerConsignor(this.buildConsignorRequest());

    request$.subscribe({
      next: () => {
        // Account created and session started; the backend has emailed the verification code.
        this.code.set('');
        this.codeError.set('');
        this.view.set('verify');
        this.submitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        const message =
          err.status === 409
            ? 'Ese email ya está registrado. Probá con otro o ingresá a tu cuenta.'
            : err.status === 0
              ? 'No pudimos conectarnos con el servidor. Probá de nuevo en unos minutos.'
              : this.backendMessage(err) || 'No pudimos crear la cuenta. Revisá los datos e intentá de nuevo.';
        this.submitError.set(message);
        this.toast.show(message, 'error');
      },
    });
  }

  protected verify(): void {
    if (this.code().length < 6 || this.verifying()) return;
    this.verifying.set(true);
    this.codeError.set('');
    this.auth.verifyEmail(this.code()).subscribe({
      next: () => {
        this.verified.set(true);
        this.verifying.set(false);
        this.view.set('done');
      },
      error: (err: { error?: { message?: string } }) => {
        this.verifying.set(false);
        this.codeError.set(err.error?.message ?? 'El código no coincide o venció.');
      },
    });
  }

  protected resend(): void {
    if (this.resending()) return;
    this.resending.set(true);
    this.codeError.set('');
    this.auth.resendCode().subscribe({
      next: () => {
        this.resending.set(false);
        this.toast.show('Te enviamos un nuevo código', 'success');
      },
      error: () => {
        this.resending.set(false);
        this.toast.show('No pudimos reenviar el código', 'error');
      },
    });
  }

  // Lets the user reach their panel without verifying now; the account stays unverified.
  protected finish(): void {
    this.view.set('done');
  }

  private buildConsignorRequest(): RegisterConsignorRequest {
    const account = this.accountForm.getRawValue();
    const location = this.consignorLocationForm.getRawValue();
    return {
      firstName: account.firstName!.trim(),
      lastName: account.lastName!.trim(),
      email: account.email!,
      phone: account.phone!,
      password: account.password!,
      dni: this.dniForm.controls.dni.value!,
      location: {
        street: location.street!,
        number: location.number!,
        unit: location.unit?.trim() || undefined,
        neighborhood: location.neighborhood!,
        city: location.city!,
        lat: this.consignorGeo().lat,
        lng: this.consignorGeo().lng,
      },
    };
  }

  private buildMerchantRequest(): RegisterMerchantRequest {
    const account = this.accountForm.getRawValue();
    const business = this.businessForm.getRawValue();
    const pdv = this.pdvForm.getRawValue();
    const conditions = this.conditionsForm.getRawValue();
    return {
      name: account.name!,
      email: account.email!,
      phone: account.phone!,
      password: account.password!,
      businessName: business.businessName!,
      cuit: business.cuit!,
      location: {
        neighborhood: business.neighborhood!,
        city: business.city!,
        lat: this.merchantGeo().lat,
        lng: this.merchantGeo().lng,
      },
      commissionConfig: {
        consignorPercentage: this.consignorPct(),
        merchantPercentage: this.merchantPct(),
      },
      terms: {
        saleWindowMonths: Number(conditions.saleWindowMonths),
        graceMonths: Number(conditions.graceMonths),
        payoutDay: Number(conditions.payoutDay),
      },
      salesPoint: {
        name: pdv.spName!,
        address: pdv.spAddress!,
        phone: pdv.spPhone!,
        geo: this.merchantGeo(),
        receptionSchedule: {
          days: daysLabel(this.daysSel()),
          hours: `${this.fromTime()} a ${this.toTime()}`,
          instructions: pdv.spInstructions?.trim() || 'Consultar en el mostrador al llegar.',
        },
      },
    };
  }

  private buildSummary(): SummaryRow[] {
    const account = this.accountForm.getRawValue();
    if (this.role() === 'merchant') {
      const business = this.businessForm.getRawValue();
      const pdv = this.pdvForm.getRawValue();
      const conditions = this.conditionsForm.getRawValue();
      return [
        { key: 'Comercio', value: business.businessName || '—' },
        { key: 'CUIT', value: business.cuit || '—' },
        { key: 'Responsable', value: account.name || '—' },
        { key: 'Email', value: account.email || '—' },
        {
          key: 'Punto de venta',
          value: pdv.spAddress ? `${pdv.spName} · ${pdv.spAddress}` : '—',
        },
        {
          key: 'Recepción',
          value: `${daysLabel(this.daysSel()) || '—'} · ${this.fromTime()} a ${this.toTime()}`,
        },
        { key: 'Geolocalización del local', value: this.coordsLabel(this.merchantGeo()) },
        {
          key: 'Comisión',
          value: `${this.consignorPct()} % cedente / ${this.merchantPct()} % comercio`,
        },
        {
          key: 'Condiciones',
          value: `${conditions.saleWindowMonths} meses + ${conditions.graceMonths} de gracia · pago el ${conditions.payoutDay}`,
        },
      ];
    }
    const location = this.consignorLocationForm.getRawValue();
    const street = [location.street, location.number].filter(Boolean).join(' ');
    const address = [street, location.unit].filter(Boolean).join(', ');
    return [
      {
        key: 'Nombre',
        value: [account.firstName, account.lastName].filter(Boolean).join(' ') || '—',
      },
      { key: 'Email', value: account.email || '—' },
      { key: 'Teléfono', value: account.phone || '—' },
      { key: 'DNI', value: this.dniForm.controls.dni.value || '—' },
      { key: 'Dirección', value: address || '—' },
      {
        key: 'Zona',
        value: location.neighborhood ? `${location.neighborhood}, ${location.city}` : '—',
      },
    ];
  }
}
