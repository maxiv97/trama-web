/**
 * Renderiza la aplicación completa (shell, avisos y la pantalla de la ruta) navegando a una URL
 * real, con guards, carga diferida y servicios reales sobre la API simulada. Ofrece atajos para
 * interactuar como lo haría un usuario.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { jsPDF } from 'jspdf';
import { ActivatedRouteSnapshot, provideRouter, Router } from '@angular/router';
import { App } from '../app/app';
import { routes } from '../app/app.routes';
import { ToastService } from '../app/shared/components/toast/toast.service';
import { FakeApi, provideFakeApi } from './fake-api';

// jsdom no implementa el desplazamiento de la ventana: las pantallas lo usan para llevar la vista
// al primer error o al inicio de un paso.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
window.scrollTo = () => undefined;

// jsdom tampoco tiene ResizeObserver ni calcula tamaños: el ancho que "mide" cada componente se
// fija con setObservedWidth (por ejemplo, 360 para ver la versión de celular).
let observedWidth = 1024;
export function setObservedWidth(width: number): void {
  observedWidth = width;
}
class FakeResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element): void {
    const entry = {
      target,
      contentRect: { width: observedWidth, height: 400 },
    } as unknown as ResizeObserverEntry;
    // Asíncrono, como el real: avisar dentro del render dispararía un ciclo de detección anidado.
    setTimeout(() => this.callback([entry], this as unknown as ResizeObserver), 0);
  }
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

// Las miniaturas se cargan cuando entran en pantalla: en las pruebas, todo está "visible".
class FakeIntersectionObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element): void {
    const entry = {
      target,
      isIntersecting: true,
      intersectionRatio: 1,
    } as unknown as IntersectionObserverEntry;
    setTimeout(() => this.callback([entry], this as unknown as IntersectionObserver), 0);
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
globalThis.IntersectionObserver =
  FakeIntersectionObserver as unknown as typeof IntersectionObserver;

// jsPDF guarda el archivo en disco cuando corre en Node: en las pruebas solo se registra el nombre.
// `save` se define en cada instancia, así que se reemplaza al inicializarla.
export const savedPdfs: string[] = [];
(jsPDF.API as unknown as { events: [string, (this: jsPDF) => void][] }).events.push([
  'initialized',
  function stubSave(this: jsPDF) {
    this.save = ((filename?: string) => {
      savedPdfs.push(filename ?? '');
      return this;
    }) as typeof this.save;
  },
]);

export type As = 'merchant' | 'consignor' | null;

export interface Screen {
  api: FakeApi;
  fixture: ComponentFixture<App>;
  router: Router;
  /** Elemento raíz de la aplicación. */
  el: HTMLElement;
  text(): string;
  /** Títulos de los avisos (toasts) mostrados. */
  toasts(): string[];
  /** Espera a que se resuelvan las llamadas y se actualice la vista. */
  settle(): Promise<void>;
  /** Primer elemento (botón, enlace, chip…) cuyo texto contiene `label`. */
  find(label: string, selector?: string): HTMLElement;
  click(label: string, selector?: string): Promise<void>;
  /** Escribe en un input, textarea o select y dispara los eventos de cambio. */
  type(target: string | HTMLElement, value: string): Promise<void>;
  all<T extends Element = HTMLElement>(selector: string): T[];
  url(): string;
  navigate(url: string): Promise<void>;
  /** Elige una opción de un dropdown de Trama identificado por su aria-label. */
  choose(ariaLabel: string, option: string, index?: number): Promise<void>;
  /** Confirma (o cancela) el diálogo de confirmación abierto. */
  modal(action: 'confirm' | 'cancel'): Promise<void>;
  /** Instancia del componente de la ruta, para lo que la interfaz no permite simular (archivos). */
  component<T>(): T;
}

export function login(as: As, api: FakeApi, keepStorage = false): void {
  if (keepStorage) {
    localStorage.removeItem('trama.session');
    localStorage.removeItem('trama.token');
  } else {
    localStorage.clear();
  }
  if (!as) return;
  localStorage.setItem('trama.session', JSON.stringify(api.db[as]));
  localStorage.setItem('trama.token', 'token-de-prueba');
}

/** `keepStorage` conserva lo guardado en el navegador (por ejemplo, un borrador) entre pantallas. */
export async function renderRoute(
  url: string,
  as: As,
  api = new FakeApi(),
  keepStorage = false,
): Promise<Screen> {
  login(as, api, keepStorage);
  // Permite renderizar más de una pantalla en la misma prueba (por ejemplo, la vista de cada rol).
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideRouter(routes), ...provideFakeApi(api)] });
  const fixture = TestBed.createComponent(App);
  const router = TestBed.inject(Router);
  const toast = TestBed.inject(ToastService);
  // Algunos paneles (drawer, hojas de filtros) se montan en el body, fuera del componente raíz.
  const root = () => document.body;

  // No usa whenStable: esperaría también los temporizadores largos (los avisos se cierran a los
  // 5 s). La API simulada responde en el momento, así que alcanza con unas vueltas del event loop.
  // Si hay una navegación en curso (la pantalla destino se carga de forma diferida), la espera.
  const settle = async () => {
    for (let i = 0; i < 10 || (router.currentNavigation() !== null && i < 200); i++) {
      fixture.detectChanges();
      // Corre también los afterNextRender (medición de anchos, foco) como lo haría la app.
      TestBed.tick();
      await new Promise((resolve) => setTimeout(resolve, i < 10 ? 0 : 5));
    }
    fixture.detectChanges();
  };

  const find = (
    label: string,
    selector = 'button, a, [role="tab"], [role="button"], label, summary',
  ) => {
    const match = Array.from(root().querySelectorAll<HTMLElement>(selector)).find((node) =>
      (node.textContent ?? '').replace(/\s+/g, ' ').includes(label),
    );
    if (!match) {
      throw new Error(`No se encontró "${label}" en la pantalla ${router.url}`);
    }
    return match;
  };

  const routeComponent = (): unknown => {
    let snapshot: ActivatedRouteSnapshot = router.routerState.snapshot.root;
    while (snapshot.firstChild) snapshot = snapshot.firstChild;
    const type = snapshot.component;
    const node = fixture.debugElement
      .queryAll(() => true)
      .find((d) => !!type && d.componentInstance instanceof type);
    return node?.componentInstance;
  };

  const screen: Screen = {
    api,
    fixture,
    router,
    get el() {
      return root();
    },
    text: () => (root().textContent ?? '').replace(/\s+/g, ' '),
    toasts: () => toast.messages().map((m) => m.title),
    settle,
    find,
    click: async (label, selector) => {
      find(label, selector).click();
      await settle();
    },
    type: async (target, value) => {
      const node =
        typeof target === 'string'
          ? (root().querySelector(target) as HTMLInputElement | null)
          : (target as HTMLInputElement);
      if (!node) throw new Error(`No se encontró el campo ${String(target)} en ${router.url}`);
      node.value = value;
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
      node.dispatchEvent(new Event('blur', { bubbles: true }));
      await settle();
    },
    all: <T extends Element = HTMLElement>(selector: string) =>
      Array.from(root().querySelectorAll<T>(selector)),
    url: () => router.url,
    navigate: async (next) => {
      await router.navigateByUrl(next);
      await settle();
    },
    choose: async (ariaLabel, option, index = 0) => {
      const trigger = root().querySelectorAll<HTMLElement>(`button[aria-label="${ariaLabel}"]`)[
        index
      ];
      if (!trigger) throw new Error(`No se encontró el dropdown "${ariaLabel}" en ${router.url}`);
      trigger.click();
      await settle();
      const item = Array.from(root().querySelectorAll<HTMLElement>('[role="option"]')).find((li) =>
        (li.textContent ?? '').includes(option),
      );
      if (!item) throw new Error(`El dropdown "${ariaLabel}" no tiene la opción "${option}"`);
      item.click();
      await settle();
    },
    modal: async (action) => {
      const buttons = Array.from(
        root().querySelectorAll<HTMLButtonElement>('app-confirm-modal button'),
      );
      if (buttons.length < 2)
        throw new Error(`No hay un diálogo de confirmación abierto en ${router.url}`);
      buttons[action === 'confirm' ? buttons.length - 1 : buttons.length - 2].click();
      await settle();
    },
    component: <T>() => routeComponent() as T,
  };

  fixture.detectChanges();
  await screen.navigate(url);
  return screen;
}
