/**
 * API simulada para las pruebas de componentes: un interceptor HTTP que responde las rutas del
 * backend con los datos de fixtures.data.ts (generados con el lote de demostración real). Las
 * pantallas se prueban con sus servicios e interceptores reales; solo se reemplaza la red.
 */
import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { EnvironmentProviders, Provider } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { authErrorInterceptor } from '../app/core/auth/auth-error.interceptor';
import { dateReviver } from '../app/core/auth/date-reviver.interceptor';
import { jwtInterceptor } from '../app/core/auth/jwt.interceptor';
import { environment } from '../environments/environment';
import { FIXTURES, FIXTURES_GENERATED_AT } from './fixtures.data';

type Json = Record<string, unknown>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/**
 * Corre todas las fechas de los datos como si se hubieran generado hoy: así los plazos por vencer
 * siguen por vencer y las pruebas no cambian de resultado con el paso de los días.
 */
function shiftDates<T>(value: T, ms: number): T {
  if (typeof value === 'string') {
    return (
      ISO_DATE.test(value) ? new Date(new Date(value).getTime() + ms).toISOString() : value
    ) as T;
  }
  if (Array.isArray(value)) return value.map((item: unknown) => shiftDates(item, ms)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = shiftDates(item, ms);
    return out as T;
  }
  return value;
}

interface Session {
  id: string;
  name: string;
  role: 'merchant' | 'consignor';
}

export interface FakeDb {
  merchant: Session;
  consignor: Session;
  merchantDoc: Json;
  merchants: Json[];
  salesPoints: Json[];
  categories: Json[];
  consignors: Json[];
  garments: Json[];
  agreements: Json[];
  proposals: Json[];
  receptions: Json[];
  sales: Json[];
  returns: Json[];
  notifications: { merchant: Json[]; consignor: Json[] };
  payouts: {
    merchantMonthly: Json[];
    merchantFlat: Json[];
    consignorMonthly: Json[];
    consignorFlat: Json[];
  };
  reports: Record<string, unknown>;
}

interface Failure {
  method: string;
  path: RegExp;
  status: number;
  message: string | string[] | null;
  times: number;
}

interface Call {
  method: string;
  path: string;
  body: unknown;
  params: Record<string, string>;
}

type Handler = (req: HttpRequest<unknown>, match: RegExpMatchArray) => unknown;

/** Estado de la API simulada de una prueba: datos, llamadas registradas y fallas programadas. */
export class FakeApi {
  db: FakeDb = shiftDates(
    FIXTURES,
    Date.now() - new Date(FIXTURES_GENERATED_AT).getTime(),
  ) as FakeDb;
  readonly calls: Call[] = [];
  private readonly failures: Failure[] = [];
  private seq = 0;
  /** Categorías base que el comercio dejó de ofrecer. */
  private hidden: string[] = [];
  /** Respuestas que no siguen la lógica del backend simulado (por ejemplo, listas vacías). */
  readonly overrides = new Map<string, unknown>();

  /** Hace fallar la próxima llamada (o las próximas `times`) que coincida. */
  fail(
    method: string,
    path: RegExp,
    status = 500,
    /** `null`: la respuesta de error no trae cuerpo. */
    message: string | string[] | null = 'Error del servidor',
    times = 1,
  ): void {
    this.failures.push({ method, path, status, message, times });
  }

  /** Reemplaza la respuesta de una ruta exacta, por ejemplo `GET /reports/dashboard`. */
  override(key: string, value: unknown): void {
    this.overrides.set(key, value);
  }

  called(method: string, path: string | RegExp): Call[] {
    return this.calls.filter(
      (c) =>
        c.method === method && (typeof path === 'string' ? c.path === path : path.test(c.path)),
    );
  }

  garment(status: string, mine: 'merchant' | 'consignor' | 'any' = 'any'): Json {
    const found = this.db.garments.find(
      (g) =>
        g['status'] === status &&
        (mine !== 'consignor' || g['consignorId'] === this.db.consignor.id),
    );
    if (!found) throw new Error(`No hay una prenda en estado ${status} en los datos de prueba`);
    return found;
  }

  private session(): Session | null {
    const raw = localStorage.getItem('trama.session');
    return raw ? (JSON.parse(raw) as Session) : null;
  }

  private id(): string {
    this.seq += 1;
    return `fake${String(this.seq).padStart(20, '0')}`;
  }

  private byGarment(list: Json[], id: string): Json | null {
    return list.find((x) => x['garmentId'] === id) ?? null;
  }

  private visibleGarments(): Json[] {
    const s = this.session();
    if (s?.role === 'consignor') return this.db.garments.filter((g) => g['consignorId'] === s.id);
    return this.db.garments;
  }

  private findGarment(id: string): Json {
    const g = this.db.garments.find((x) => x['id'] === id);
    if (!g) throw new FakeHttpError(404, `Prenda no encontrada: ${id}`);
    return g;
  }

  private setStatus(id: string, status: string, note?: string): Json {
    const g = this.findGarment(id);
    g['status'] = status;
    (g['timeline'] as Json[]).push({
      date: new Date().toISOString(),
      actor: 'merchant',
      status,
      note,
    });
    return g;
  }

  private readonly routes: [string, RegExp, Handler][] = [
    ['GET', /^\/config$/, () => ({ monetization: false })],
    [
      'POST',
      /^\/auth\/login$/,
      (req) => {
        const body = req.body as { email: string; password: string };
        if (body.password === 'incorrecta') throw new FakeHttpError(401, 'Credenciales inválidas');
        const user = body.email.includes('comercio') ? this.db.merchant : this.db.consignor;
        return { token: 'token-de-prueba', user };
      },
    ],
    ['POST', /^\/auth\/register\/consignor$/, () => ({ token: 't', user: this.db.consignor })],
    ['POST', /^\/auth\/register\/merchant$/, () => ({ token: 't', user: this.db.merchant })],
    [
      'POST',
      /^\/auth\/verify-email$/,
      (req) => {
        if ((req.body as { code: string }).code !== '123456')
          throw new FakeHttpError(400, 'El código no coincide');
        return { verified: true };
      },
    ],
    ['POST', /^\/auth\/resend-code$/, () => ({ sent: true })],
    ['GET', /^\/auth\/me$/, () => ({ ...this.session(), email: 'camila.suarez.demo@trama.app' })],
    ['GET', /^\/garments$/, () => this.visibleGarments()],
    [
      'POST',
      /^\/garments$/,
      (req) => {
        const g: Json = {
          ...(req.body as Json),
          id: this.id(),
          code: 'TRA-09999',
          status: 'under_review',
          consignorId: this.session()?.id,
          createdAt: new Date().toISOString(),
          timeline: [],
        };
        this.db.garments.push(g);
        return g;
      },
    ],
    ['GET', /^\/garments\/([^/]+)$/, (_r, m) => this.findGarment(m[1])],
    [
      'GET',
      /^\/garments\/([^/]+)\/photo$/,
      (_r, m) => ({ photo: (this.findGarment(m[1])['photos'] as string[])[0] ?? null }),
    ],
    [
      'PATCH',
      /^\/garments\/([^/]+)\/draft$/,
      (req, m) => Object.assign(this.findGarment(m[1]), req.body),
    ],
    [
      'POST',
      /^\/garments\/([^/]+)\/actions$/,
      (req, m) => {
        const action = (req.body as { action: string }).action;
        const next: Record<string, string> = {
          CANCEL: 'cancelled',
          REDELIVER: 'agreed',
          REGISTER_SALE: 'sold',
        };
        return this.setStatus(m[1], next[action] ?? 'under_review');
      },
    ],
    [
      'GET',
      /^\/garments\/([^/]+)\/agreement$/,
      (_r, m) => this.byGarment(this.db.agreements, m[1]),
    ],
    ['GET', /^\/garments\/([^/]+)\/proposal$/, (_r, m) => this.byGarment(this.db.proposals, m[1])],
    [
      'GET',
      /^\/garments\/([^/]+)\/reception$/,
      (_r, m) => this.byGarment(this.db.receptions, m[1]),
    ],
    ['GET', /^\/garments\/([^/]+)\/sale$/, (_r, m) => this.byGarment(this.db.sales, m[1])],
    ['GET', /^\/garments\/([^/]+)\/return$/, (_r, m) => this.byGarment(this.db.returns, m[1])],
    [
      'POST',
      /^\/garments\/([^/]+)\/disposition$/,
      (req, m) => {
        const g = this.findGarment(m[1]);
        g['unclaimedDisposition'] = {
          ...(req.body as Json),
          date: new Date().toISOString(),
          handledBy: 'Laura',
        };
        return g;
      },
    ],
    [
      'GET',
      /^\/agreements$/,
      () => {
        const ids = new Set(this.visibleGarments().map((g) => g['id']));
        return this.db.agreements.filter((a) => ids.has(a['garmentId']));
      },
    ],
    [
      'GET',
      /^\/proposals$/,
      () => {
        const pending = new Set(
          this.db.garments.filter((g) => g['status'] === 'under_review').map((g) => g['id']),
        );
        return this.db.proposals.filter((p) => pending.has(p['garmentId']));
      },
    ],
    [
      'GET',
      /^\/proposals\/([^/]+)$/,
      (_r, m) => {
        const p = this.db.proposals.find((x) => x['id'] === m[1] || x['garmentId'] === m[1]);
        if (!p) throw new FakeHttpError(404, 'Propuesta no encontrada');
        return p;
      },
    ],
    [
      'POST',
      /^\/proposals$/,
      (req) => {
        const p: Json = {
          ...(req.body as Json),
          id: this.id(),
          status: 'under_review',
          calculatedSalePrice: 20000,
          createdAt: new Date().toISOString(),
        };
        this.db.proposals.push(p);
        return p;
      },
    ],
    [
      'POST',
      /^\/proposals\/([^/]+)\/accept$/,
      (_r, m) => (this.setStatus(m[1], 'agreed'), this.byGarment(this.db.proposals, m[1])),
    ],
    [
      'POST',
      /^\/proposals\/([^/]+)\/counteroffer$/,
      (_r, m) => (this.setStatus(m[1], 'counteroffer'), this.byGarment(this.db.proposals, m[1])),
    ],
    [
      'POST',
      /^\/proposals\/([^/]+)\/accept-counteroffer$/,
      (_r, m) => (this.setStatus(m[1], 'agreed'), this.byGarment(this.db.proposals, m[1])),
    ],
    [
      'POST',
      /^\/proposals\/([^/]+)\/reject$/,
      (_r, m) => (this.setStatus(m[1], 'no_agreement'), {}),
    ],
    [
      'POST',
      /^\/receptions$/,
      (req) => {
        const body = req.body as Json;
        const next: Record<string, string> = {
          accepted: 'in_stock',
          with_remarks: 'with_remarks',
          rejected: 'rejected',
        };
        this.setStatus(body['garmentId'] as string, next[body['result'] as string]);
        const r = {
          ...body,
          id: this.id(),
          receiptNumber: 'REC-1',
          receivedAt: new Date().toISOString(),
          handledBy: 'Laura',
        };
        this.db.receptions.push(r);
        return r;
      },
    ],
    ['GET', /^\/sales$/, () => this.db.sales],
    [
      'POST',
      /^\/sales$/,
      (req) => {
        const body = req.body as Json;
        this.setStatus(body['garmentId'] as string, 'sold');
        return { ...body, id: this.id(), consignorAmount: 1000, merchantCommission: 500 };
      },
    ],
    [
      'POST',
      /^\/sales\/bulk$/,
      (req) => {
        const ids = (req.body as { garmentIds: string[] }).garmentIds;
        return {
          sold: ids.slice(1),
          failed: ids
            .slice(0, 1)
            .map((garmentId) => ({ garmentId, reason: 'Transición inválida' })),
        };
      },
    ],
    [
      'POST',
      /^\/returns$/,
      (req) => {
        const body = req.body as Json;
        this.setStatus(body['garmentId'] as string, 'returned');
        const r = {
          ...body,
          id: this.id(),
          receiptNumber: 'DEV-1',
          returnedAt: new Date().toISOString(),
          handledBy: 'Laura',
        };
        this.db.returns.push(r);
        return r;
      },
    ],
    ['GET', /^\/merchants$/, () => this.db.merchants],
    [
      'GET',
      /^\/merchants\/([^/]+)$/,
      (_r, m) => this.db.merchants.find((x) => x['id'] === m[1]) ?? this.db.merchantDoc,
    ],
    ['PATCH', /^\/merchants\/([^/]+)$/, (req) => Object.assign(this.db.merchantDoc, req.body)],
    ['GET', /^\/sales-points$/, () => this.db.salesPoints],
    [
      'GET',
      /^\/sales-points\/([^/]+)$/,
      (_r, m) => this.db.salesPoints.find((x) => x['id'] === m[1]) ?? this.db.salesPoints[0],
    ],
    [
      'POST',
      /^\/sales-points$/,
      (req) => {
        const p = { ...(req.body as Json), id: this.id() };
        this.db.salesPoints.push(p);
        return p;
      },
    ],
    [
      'PATCH',
      /^\/sales-points\/([^/]+)$/,
      (req, m) => Object.assign(this.db.salesPoints.find((x) => x['id'] === m[1]) ?? {}, req.body),
    ],
    [
      'GET',
      /^\/categories$/,
      (req) =>
        this.db.categories.filter(
          (c) =>
            c['active'] !== false &&
            !(
              req.params.has('merchantId') &&
              c['base'] &&
              this.hidden.includes(c['label'] as string)
            ),
        ),
    ],
    [
      'POST',
      /^\/categories$/,
      (req) => {
        const c = {
          ...(req.body as Json),
          id: this.id(),
          base: false,
          active: true,
          ownerMerchantId: this.db.merchant.id,
        };
        this.db.categories.push(c);
        return c;
      },
    ],
    [
      'PATCH',
      /^\/categories\/hidden$/,
      (req) => (this.hidden = (req.body as { labels: string[] }).labels),
    ],
    [
      'PATCH',
      /^\/categories\/([^/]+)$/,
      (req, m) => Object.assign(this.db.categories.find((x) => x['id'] === m[1]) ?? {}, req.body),
    ],
    [
      'DELETE',
      /^\/categories\/([^/]+)$/,
      (_r, m) => {
        const c = this.db.categories.find((x) => x['id'] === m[1]);
        if (c) c['active'] = false;
        return null;
      },
    ],
    ['GET', /^\/consignors$/, () => this.db.consignors],
    [
      'GET',
      /^\/consignors\/([^/]+)$/,
      (_r, m) => this.db.consignors.find((x) => x['id'] === m[1]) ?? this.db.consignors[0],
    ],
    ['GET', /^\/notifications$/, () => this.notifications()],
    [
      'GET',
      /^\/notifications\/unread-count$/,
      () => ({ count: this.notifications().filter((n) => !n['read']).length }),
    ],
    [
      'PATCH',
      /^\/notifications\/read-all$/,
      () => (this.notifications().forEach((n) => (n['read'] = true)), { updated: 1 }),
    ],
    [
      'PATCH',
      /^\/notifications\/([^/]+)\/read$/,
      (_r, m) =>
        Object.assign(this.notifications().find((n) => n['id'] === m[1]) ?? {}, { read: true }),
    ],
    [
      'GET',
      /^\/payouts$/,
      () =>
        this.session()?.role === 'consignor'
          ? this.db.payouts.consignorFlat
          : this.db.payouts.merchantFlat,
    ],
    [
      'GET',
      /^\/payouts\/monthly$/,
      () =>
        this.session()?.role === 'consignor'
          ? this.db.payouts.consignorMonthly
          : this.db.payouts.merchantMonthly,
    ],
    ['POST', /^\/payouts\/settle$/, () => []],
    ['GET', /^\/reports\/dashboard$/, () => this.db.reports['dashboard']],
    ['GET', /^\/reports\/expiring$/, () => this.db.reports['expiring']],
    ['GET', /^\/reports\/by-category$/, () => this.db.reports['byCategory']],
    ['GET', /^\/reports\/by-point$/, () => this.db.reports['byPoint']],
    ['GET', /^\/reports\/rotation$/, () => this.db.reports['rotation']],
    ['GET', /^\/reports\/consignors$/, () => this.db.reports['consignors']],
    ['GET', /^\/reports\/discrepancies$/, () => this.db.reports['discrepancies']],
    ['GET', /^\/reports\/discrepancies\/detail$/, () => this.db.reports['discrepancyDetail']],
    ['GET', /^\/reports\/summary$/, () => this.db.reports['summary']],
    ['GET', /^\/reports\/weekly$/, () => this.db.reports['weekly']],
    ['POST', /^\/support\/tickets$/, () => ({ ticketId: 'TR-2026-000042' })],
  ];

  private notifications(): Json[] {
    return this.session()?.role === 'consignor'
      ? this.db.notifications.consignor
      : this.db.notifications.merchant;
  }

  handle(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    const path = req.url.replace(environment.apiUrl, '').split('?')[0];
    const params: Record<string, string> = {};
    for (const key of req.params.keys()) params[key] = req.params.get(key) ?? '';
    this.calls.push({ method: req.method, path, body: req.body, params });

    const failure = this.failures.find(
      (f) => f.method === req.method && f.path.test(path) && f.times > 0,
    );
    if (failure) {
      failure.times -= 1;
      return throwError(
        () =>
          new HttpErrorResponse({
            status: failure.status,
            url: req.url,
            error: failure.message === null ? null : { message: failure.message },
          }),
      );
    }
    const key = `${req.method} ${path}`;
    if (this.overrides.has(key)) {
      return of(new HttpResponse({ status: 200, body: structuredClone(this.overrides.get(key)) }));
    }
    for (const [method, pattern, handler] of this.routes) {
      const match = path.match(pattern);
      if (method !== req.method || !match) continue;
      try {
        const body = handler(req, match);
        return of(
          new HttpResponse({
            status: 200,
            body: body === undefined ? null : structuredClone(body),
          }),
        );
      } catch (error) {
        const e = error instanceof FakeHttpError ? error : new FakeHttpError(500, String(error));
        return throwError(
          () =>
            new HttpErrorResponse({
              status: e.status,
              url: req.url,
              error: { message: e.message },
            }),
        );
      }
    }
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 404,
          url: req.url,
          error: { message: `Sin ruta simulada: ${key}` },
        }),
    );
  }
}

class FakeHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Proveedores de HttpClient con los interceptores reales de la app y la API simulada al final. */
export function provideFakeApi(api: FakeApi): (Provider | EnvironmentProviders)[] {
  const fake: HttpInterceptorFn = (req) => api.handle(req);
  return [
    provideHttpClient(withInterceptors([jwtInterceptor, dateReviver, authErrorInterceptor, fake])),
  ];
}
