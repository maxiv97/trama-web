export type ProposalStatus = 'under_review' | 'counteroffer' | 'agreed' | 'no_agreement';

export interface Counteroffer {
  consignorPrice: number;
  salePrice: number;
  date: Date;
}

export interface Proposal {
  id: string;
  garmentId: string;
  requestedConsignorPrice: number;
  calculatedSalePrice: number;
  status: ProposalStatus;
  createdAt: Date;
  counteroffer?: Counteroffer;
}
