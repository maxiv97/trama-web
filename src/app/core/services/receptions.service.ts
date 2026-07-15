import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reception, ReceptionDiscrepancy, ReceptionResult } from '../models/reception.model';

export interface NewReception {
  garmentId: string;
  salesPointId: string;
  result: ReceptionResult;
  discrepancies: ReceptionDiscrepancy[];
  detail?: string;
  evidence: string[];
}

@Injectable({ providedIn: 'root' })
export class ReceptionsService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  byGarment(garmentId: string): Observable<Reception | undefined> {
    return this.http
      .get<Reception | null>(`${this.api}/garments/${garmentId}/reception`)
      .pipe(map((reception) => reception ?? undefined));
  }

  create(input: NewReception): Observable<Reception> {
    return this.http.post<Reception>(`${this.api}/receptions`, input);
  }
}
