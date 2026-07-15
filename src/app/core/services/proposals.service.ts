import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Proposal } from '../models/proposal.model';

export interface NewProposal {
  garmentId: string;
  requestedConsignorPrice: number;
  calculatedSalePrice: number;
}

@Injectable({ providedIn: 'root' })
export class ProposalsService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  create(input: NewProposal): Observable<Proposal> {
    return this.http.post<Proposal>(`${this.api}/proposals`, {
      garmentId: input.garmentId,
      requestedConsignorPrice: input.requestedConsignorPrice,
    });
  }

  getById(id: string): Observable<Proposal> {
    return this.http.get<Proposal>(`${this.api}/proposals/${id}`);
  }

  byGarment(garmentId: string): Observable<Proposal | undefined> {
    return this.http
      .get<Proposal | null>(`${this.api}/garments/${garmentId}/proposal`)
      .pipe(map((proposal) => proposal ?? undefined));
  }

  pendingForMerchant(_merchantId: string): Observable<Proposal[]> {
    return this.http.get<Proposal[]>(`${this.api}/proposals`);
  }

  accept(garmentId: string): Observable<Proposal> {
    return this.http.post<Proposal>(`${this.api}/proposals/${garmentId}/accept`, {});
  }

  counteroffer(garmentId: string, consignorPrice: number): Observable<Proposal> {
    return this.http.post<Proposal>(`${this.api}/proposals/${garmentId}/counteroffer`, {
      consignorPrice,
    });
  }

  acceptCounteroffer(garmentId: string): Observable<Proposal> {
    return this.http.post<Proposal>(`${this.api}/proposals/${garmentId}/accept-counteroffer`, {});
  }

  reject(garmentId: string): Observable<unknown> {
    return this.http.post(`${this.api}/proposals/${garmentId}/reject`, {});
  }
}
