import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Proposal } from '../models/proposal.model';
import { MockStore } from '../mocks/mock-store';
import { mockResponse } from '../mocks/mock-response';

@Injectable({ providedIn: 'root' })
export class ProposalsService {
  private readonly store = inject(MockStore);

  getById(id: string): Observable<Proposal | undefined> {
    return mockResponse(this.store.data.proposals.find((proposal) => proposal.id === id));
  }

  byGarment(garmentId: string): Observable<Proposal | undefined> {
    return mockResponse(this.store.data.proposals.find((proposal) => proposal.garmentId === garmentId));
  }

  pendingForMerchant(merchantId: string): Observable<Proposal[]> {
    const merchantGarmentIds = new Set(
      this.store.data.garments
        .filter((garment) => garment.merchantId === merchantId)
        .map((garment) => garment.id),
    );
    return mockResponse(
      this.store.data.proposals.filter(
        (proposal) =>
          proposal.status === 'under_review' && merchantGarmentIds.has(proposal.garmentId),
      ),
    );
  }
}
