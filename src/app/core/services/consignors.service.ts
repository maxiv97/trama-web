import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Consignor } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ConsignorsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/consignors`;

  list(): Observable<Consignor[]> {
    return this.http.get<Consignor[]>(this.base);
  }

  getById(id: string): Observable<Consignor> {
    return this.http.get<Consignor>(`${this.base}/${id}`);
  }

  byMerchant(merchantId: string): Observable<Consignor[]> {
    return this.http.get<Consignor[]>(this.base, { params: { merchantId } });
  }
}
