import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Proposal, ProposalStatus } from '../models/proposal.model';
import { MockStore } from '../mocks/mock-store';
import { mockResponse } from '../mocks/mock-response';

export interface NewProposal {
  garmentId: string;
  requestedConsignorPrice: number;
  calculatedSalePrice: number;
}

@Injectable({ providedIn: 'root' })
export class ProposalsService {
  private readonly store = inject(MockStore);

  create(input: NewProposal): Observable<Proposal> {
    const proposal: Proposal = {
      id: `prop-${Date.now()}`,
      garmentId: input.garmentId,
      requestedConsignorPrice: input.requestedConsignorPrice,
      calculatedSalePrice: input.calculatedSalePrice,
      status: 'under_review',
      createdAt: new Date(),
    };
    this.store.data.proposals.push(proposal);
    this.store.persist();
    return mockResponse(proposal);
  }

  setStatus(garmentId: string, status: ProposalStatus): Observable<Proposal | undefined> {
    const proposal = this.store.data.proposals.find((item) => item.garmentId === garmentId);
    if (proposal) {
      proposal.status = status;
      this.store.persist();
    }
    return mockResponse(proposal);
  }

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
