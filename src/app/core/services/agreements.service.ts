import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Agreement } from '../models/agreement.model';

@Injectable({ providedIn: 'root' })
export class AgreementsService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(): Observable<Agreement[]> {
    return this.http.get<Agreement[]>(`${this.api}/agreements`);
  }

  byGarment(garmentId: string): Observable<Agreement | undefined> {
    return this.http
      .get<Agreement | null>(`${this.api}/garments/${garmentId}/agreement`)
      .pipe(map((agreement) => agreement ?? undefined));
  }
}
