import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EventActor, Garment } from '../models/garment.model';
import { GarmentAction } from '../state-machine/garment.state-machine';

export type NewGarment = Omit<Garment, 'id' | 'status' | 'createdAt' | 'timeline'>;

export interface EditDraftPayload {
  name: string;
  category: string;
  subcategory?: string;
  brand: string;
  size: string;
  color: string;
  season: string;
  condition: string;
  description?: string;
  photos: string[];
  video?: string;
  requestedConsignorPrice: number;
}

@Injectable({ providedIn: 'root' })
export class GarmentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/garments`;

  list(): Observable<Garment[]> {
    return this.http.get<Garment[]>(this.base);
  }

  // Prendas sin fotos/video/timeline, para vistas que solo agregan datos (puntos de venta,
  // tarjetas de reportes) y no muestran miniaturas. Evita traerse los base64 de cada prenda.
  listMeta(): Observable<Garment[]> {
    return this.http.get<Garment[]>(this.base, { params: { lite: '1' } });
  }

  create(input: NewGarment): Observable<Garment> {
    return this.http.post<Garment>(this.base, input);
  }

  getById(id: string): Observable<Garment> {
    return this.http.get<Garment>(`${this.base}/${id}`);
  }

  // Primera foto de una prenda, para la miniatura diferida de los listados.
  photo(id: string): Observable<{ photo: string | null }> {
    return this.http.get<{ photo: string | null }>(`${this.base}/${id}/photo`);
  }

  // Editar una consignación en revisión (prenda + precio pedido).
  updateDraft(id: string, payload: EditDraftPayload): Observable<unknown> {
    return this.http.patch(`${this.base}/${id}/draft`, payload);
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
