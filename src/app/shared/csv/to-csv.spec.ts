import { describe, expect, it } from 'vitest';
import { toCsv } from './to-csv';

describe('toCsv', () => {
  it('arma encabezados y filas con saltos CRLF', () => {
    const csv = toCsv(['Categoría', 'Ganancia'], [['Calzado', 10500], ['Accesorios', 14000]]);
    expect(csv).toBe('Categoría,Ganancia\r\nCalzado,10500\r\nAccesorios,14000');
  });

  it('entrecomilla valores con comas, comillas o saltos de línea', () => {
    const csv = toCsv(['Nombre', 'Nota'], [['Pérez, Ana', 'dice "hola"']]);
    expect(csv).toBe('Nombre,Nota\r\n"Pérez, Ana","dice ""hola"""');
  });

  it('deja vacías las celdas nulas o indefinidas', () => {
    const csv = toCsv(['A', 'B', 'C'], [[null, undefined, 0]]);
    expect(csv).toBe('A,B,C\r\n,,0');
  });
});
