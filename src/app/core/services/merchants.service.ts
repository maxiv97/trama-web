import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Merchant } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class MerchantsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/merchants`;

  list(): Observable<Merchant[]> {
    return this.http.get<Merchant[]>(this.base);
  }

  getById(id: string): Observable<Merchant> {
    return this.http.get<Merchant>(`${this.base}/${id}`);
  }

  update(merchant: Merchant): Observable<Merchant> {
    return this.http.patch<Merchant>(`${this.base}/${merchant.id}`, merchant);
  }
}
