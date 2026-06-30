import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'shortDate' })
export class ShortDatePipe implements PipeTransform {
  private readonly formatter = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  transform(value: Date | string | number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return this.formatter.format(new Date(value));
  }
}
