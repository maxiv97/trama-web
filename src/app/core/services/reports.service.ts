import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExpiringConsignment } from '../models/expiring-consignment.model';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reports`;

  expiring(withinDays?: number): Observable<ExpiringConsignment[]> {
    const options =
      withinDays != null ? { params: { withinDays: String(withinDays) } } : {};
    return this.http.get<ExpiringConsignment[]>(`${this.base}/expiring`, options);
  }
}
