import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return '$' + this.formatter.format(value);
  }
}
