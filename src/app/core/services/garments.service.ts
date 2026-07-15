import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EventActor, Garment } from '../models/garment.model';
import { GarmentAction } from '../state-machine/garment.state-machine';

export type NewGarment = Omit<Garment, 'id' | 'status' | 'createdAt' | 'timeline'>;

@Injectable({ providedIn: 'root' })
export class GarmentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/garments`;

  list(): Observable<Garment[]> {
    return this.http.get<Garment[]>(this.base);
  }

  create(input: NewGarment): Observable<Garment> {
    return this.http.post<Garment>(this.base, input);
  }

  getById(id: string): Observable<Garment> {
    return this.http.get<Garment>(`${this.base}/${id}`);
  }

  byConsignor(_consignorId: string): Observable<Garment[]> {
    return this.http.get<Garment[]>(this.base);
  }

  byMerchant(_merchantId: string): Observable<Garment[]> {
    return this.http.get<Garment[]>(this.base);
  }

  applyAction(
    id: string,
    action: GarmentAction,
    _actor: EventActor,
    note?: string,
  ): Observable<Garment> {
    return this.http.post<Garment>(`${this.base}/${id}/actions`, { action, note });
  }
}
