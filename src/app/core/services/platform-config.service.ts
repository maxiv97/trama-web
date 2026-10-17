import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface PlatformConfig {
  monetization: boolean;
}

// Lee la config pública del backend (feature flags por entorno) al iniciar.
@Injectable({ providedIn: 'root' })
export class PlatformConfigService {
  private readonly http = inject(HttpClient);

  // Cobro a comercios activado (posicionamiento + suscripción).
  readonly monetization = signal(false);

  constructor() {
    this.http.get<PlatformConfig>(`${environment.apiUrl}/config`).subscribe({
      next: (config) => this.monetization.set(!!config.monetization),
      error: () => this.monetization.set(false),
    });
  }
}
