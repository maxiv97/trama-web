import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function reviveDates(value: unknown): unknown {
  if (typeof value === 'string') {
    return ISO_DATE.test(value) ? new Date(value) : value;
  }
  if (Array.isArray(value)) {
    return value.map(reviveDates);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      record[key] = reviveDates(record[key]);
    }
    return record;
  }
  return value;
}

export const dateReviver: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    map((event) =>
      event instanceof HttpResponse ? event.clone({ body: reviveDates(event.body) }) : event,
    ),
  );
