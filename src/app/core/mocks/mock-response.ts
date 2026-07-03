import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

const LATENCY_MS = 300;

export function mockResponse<T>(value: T, ms: number = LATENCY_MS): Observable<T> {
  return of(structuredClone(value)).pipe(delay(ms));
}
