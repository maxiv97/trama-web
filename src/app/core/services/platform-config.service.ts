import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

interface PlatformConfig {
  monetization: boolean;
}

@Injectable({ providedIn: 'root' })
export class PlatformConfigService {
  private readonly http = inject(HttpClient);

  readonly monetization = toSignal(
    this.http.get<PlatformConfig>(`${environment.apiUrl}/config`).pipe(
      map((config) => !!config.monetization),
      catchError(() => of(false)),
    ),
    { initialValue: false },
  );
}
