import { computed, Injectable, signal } from '@angular/core';
import { Role } from '../models/user.model';

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly STORAGE_KEY = 'trama.session';

  private readonly currentUser = signal<SessionUser | null>(this.restore());

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly role = computed(() => this.currentUser()?.role ?? null);

  loginAs(role: Role): void {
    const user: SessionUser =
      role === 'consignor'
        ? { id: 'con-ana', name: 'Ana Gómez', role }
        : { id: 'mer-trama', name: 'María López', role };
    this.currentUser.set(user);
    localStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(user));
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem(AuthService.STORAGE_KEY);
  }

  private restore(): SessionUser | null {
    const raw = localStorage.getItem(AuthService.STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  }
}
