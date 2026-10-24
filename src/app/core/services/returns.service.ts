import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Garment, UnclaimedDisposition } from '../models/garment.model';
import { GarmentReturn } from '../models/return.model';

export interface NewReturn {
  garmentId: string;
  identityChecked: boolean;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class ReturnsService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  byGarment(garmentId: string): Observable<GarmentReturn | undefined> {
    return this.http
      .get<GarmentReturn | null>(`${this.api}/garments/${garmentId}/return`)
      .pipe(map((value) => value ?? undefined));
  }

  create(input: NewReturn): Observable<GarmentReturn> {
    return this.http.post<GarmentReturn>(`${this.api}/returns`, input);
  }

  // Destino de una prenda que el cedente no retiró (se registra una sola vez).
  registerDisposition(
    garmentId: string,
    disposition: UnclaimedDisposition,
    note?: string,
  ): Observable<Garment> {
    return this.http.post<Garment>(`${this.api}/garments/${garmentId}/disposition`, {
      disposition,
      note: note?.trim() || undefined,
    });
  }
}
