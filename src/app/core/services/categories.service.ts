import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category, NewCategory } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/categories`;

  // Base canónica menos las ocultas del comercio, más sus categorías propias.
  forMerchant(merchantId?: string): Observable<Category[]> {
    const params = merchantId ? new HttpParams().set('merchantId', merchantId) : undefined;
    return this.http.get<Category[]>(this.base, { params });
  }

  create(input: NewCategory): Observable<Category> {
    return this.http.post<Category>(this.base, input);
  }

  update(id: string, input: Partial<NewCategory>): Observable<Category> {
    return this.http.patch<Category>(`${this.base}/${id}`, input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // Define qué categorías base oculta el comercio (reemplaza la lista completa).
  setHidden(labels: string[]): Observable<string[]> {
    return this.http.patch<string[]>(`${this.base}/hidden`, { labels });
  }
}
