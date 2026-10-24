import { countdownLabel, daysUntil } from './deadline.util';

describe('deadline.util', () => {
  const now = new Date(2026, 9, 23, 22, 0);

  it('cuenta días calendario sin importar la hora', () => {
    expect(daysUntil(new Date(2026, 9, 24, 1, 0), now)).toBe(1);
    expect(daysUntil(new Date(2026, 9, 23, 23, 59), now)).toBe(0);
    expect(daysUntil(new Date(2026, 9, 20), now)).toBe(-3);
  });

  it('arma la etiqueta de la cuenta regresiva', () => {
    expect(countdownLabel(new Date(2026, 9, 23), now)).toBe('Vence hoy');
    expect(countdownLabel(new Date(2026, 9, 24), now)).toBe('Vence mañana');
    expect(countdownLabel(new Date(2026, 9, 30), now)).toBe('Quedan 7 días');
    expect(countdownLabel(new Date(2026, 9, 22), now)).toBe('Venció ayer');
    expect(countdownLabel(new Date(2026, 9, 18), now)).toBe('Venció hace 5 días');
  });
});
