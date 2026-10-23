import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { HelpRoleFilter } from './help.content';

const STORAGE_KEY = 'trama.ayuda.rol';

function parseRole(value: string | null | undefined): HelpRoleFilter | null {
  return value === 'cedente' || value === 'comercio' || value === 'todos' ? value : null;
}

function readStored(): HelpRoleFilter | null {
  try {
    return parseRole(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/**
 * Estado compartido del centro de ayuda:
 * - el rol elegido (persiste en la URL como ?rol= y en localStorage `trama.ayuda.rol`);
 * - qué FAQs abrió la persona y desde dónde llega al contacto (`faqsVistas` y `origen` del ticket),
 *   para saber qué material no está resolviendo dudas.
 */
@Injectable({ providedIn: 'root' })
export class HelpState {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  private readonly roleSig = signal<HelpRoleFilter>(this.initialRole(null));
  readonly role = this.roleSig.asReadonly();

  private readonly viewed = signal<string[]>([]);
  readonly viewedFaqs = this.viewed.asReadonly();
  private lastOrigin = '';

  /** Toma el rol de la URL; si no viene, el de la sesión; si no, el guardado. */
  syncFromUrl(queryRole: string | null): void {
    this.roleSig.set(this.initialRole(queryRole));
    this.persist(this.roleSig());
  }

  /** Aplica un ?rol= que cambió en la URL (atrás/adelante); un rol ausente no pisa la elección. */
  applyUrlRole(queryRole: string | null): void {
    const r = parseRole(queryRole);
    if (r && r !== this.roleSig()) {
      this.roleSig.set(r);
      this.persist(r);
    }
  }

  /** Cambia el rol desde el selector y lo refleja en la URL sin sumar entradas al historial. */
  setRole(role: HelpRoleFilter): void {
    if (role === this.roleSig()) return;
    this.roleSig.set(role);
    this.persist(role);
    void this.router.navigate([], {
      queryParams: { rol: role === 'todos' ? null : role },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl: true,
    });
  }

  markViewed(faqId: string): void {
    if (!this.viewed().includes(faqId)) this.viewed.update((list) => [...list, faqId].slice(-50));
    this.lastOrigin = `/ayuda/faq#${faqId}`;
  }

  setOrigin(url: string): void {
    this.lastOrigin = url;
  }

  origin(): string {
    return this.lastOrigin;
  }

  private initialRole(queryRole: string | null): HelpRoleFilter {
    const fromUrl = parseRole(queryRole);
    if (fromUrl) return fromUrl;
    const session = this.auth.role();
    if (session) return session === 'consignor' ? 'cedente' : 'comercio';
    return readStored() ?? 'todos';
  }

  private persist(role: HelpRoleFilter): void {
    try {
      localStorage.setItem(STORAGE_KEY, role);
    } catch {
      /* almacenamiento bloqueado: el rol sigue en la URL */
    }
  }
}
