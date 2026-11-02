import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category, CategoryInput, CategoryUpdate } from '../models/category.model';


@Injectable({ providedIn: 'root' })
export class CategoriesService  {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/categories`;

  forMerchant(merchantId?: string): Observable<Category[]> {
    let params = new HttpParams();
    if (merchantId) params = params.set('merchantId', merchantId);
    return this.http.get<Category[]>(this.base, { params });
  }

  create(body: CategoryInput): Observable<Category> {
    return this.http.post<Category>(this.base, body); 
  }

  update(id: string, body: CategoryUpdate): Observable<Category> {
    return this.http.patch<Category>(`${this.base}/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`); 
  }

  setHidden(labels: string[]): Observable<string[]> {
    return this.http.patch<string[]>(`${this.base}/hidden`, { labels });
  }
}
