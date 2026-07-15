import { computed, Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Role } from '../models/user.model';

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
}

interface LoginResponse {
  token: string;
  user: SessionUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly SESSION_KEY = 'trama.session';
  private static readonly TOKEN_KEY = 'trama.token';

  private readonly http = inject(HttpClient);
  private readonly currentUser = signal<SessionUser | null>(this.restore());

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly role = computed(() => this.currentUser()?.role ?? null);

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((response) => this.setSession(response)));
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem(AuthService.SESSION_KEY);
    localStorage.removeItem(AuthService.TOKEN_KEY);
  }

  private setSession(response: LoginResponse): void {
    this.currentUser.set(response.user);
    localStorage.setItem(AuthService.SESSION_KEY, JSON.stringify(response.user));
    localStorage.setItem(AuthService.TOKEN_KEY, response.token);
  }

  private restore(): SessionUser | null {
    const raw = localStorage.getItem(AuthService.SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  }
}
