import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Agreement } from '../models/agreement.model';
import { MockStore } from '../mocks/mock-store';
import { mockResponse } from '../mocks/mock-response';

@Injectable({ providedIn: 'root' })
export class AgreementsService {
  private readonly store = inject(MockStore);

  list(): Observable<Agreement[]> {
    return mockResponse(this.store.data.agreements);
  }

  byGarment(garmentId: string): Observable<Agreement | undefined> {
    return mockResponse(
      this.store.data.agreements.find((agreement) => agreement.garmentId === garmentId),
    );
  }
}
