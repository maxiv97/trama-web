import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sale } from '../models/sale.model';

export interface NewSale {
  garmentId: string;
  actualSalePrice: number;
  soldAt: string;
}

export interface BulkSaleResult {
  sold: string[];
  failed: { garmentId: string; reason: string }[];
}

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(): Observable<Sale[]> {
    return this.http.get<Sale[]>(`${this.api}/sales`);
  }

  byGarment(garmentId: string): Observable<Sale | undefined> {
    return this.http
      .get<Sale | null>(`${this.api}/garments/${garmentId}/sale`)
      .pipe(map((sale) => sale ?? undefined));
  }

  create(input: NewSale): Observable<Sale> {
    return this.http.post<Sale>(`${this.api}/sales`, input);
  }

  // Marca varias prendas como vendidas a la vez (al precio acordado de cada una).
  bulkCreate(garmentIds: string[], soldAt: string): Observable<BulkSaleResult> {
    return this.http.post<BulkSaleResult>(`${this.api}/sales/bulk`, { garmentIds, soldAt });
  }
}
