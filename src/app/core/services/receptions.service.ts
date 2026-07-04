import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Reception } from '../models/reception.model';
import { MockStore } from '../mocks/mock-store';
import { mockResponse } from '../mocks/mock-response';

@Injectable({ providedIn: 'root' })
export class ReceptionsService {
  private readonly store = inject(MockStore);

  byGarment(garmentId: string): Observable<Reception | undefined> {
    return mockResponse(
      this.store.data.receptions.find((reception) => reception.garmentId === garmentId),
    );
  }

  create(reception: Reception): Observable<Reception> {
    this.store.data.receptions.push(reception);
    this.store.persist();
    return mockResponse(reception);
  }
}
