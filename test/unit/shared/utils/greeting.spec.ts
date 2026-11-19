import { describe, expect, it } from 'vitest';
import { greetingFor, greetingName } from '../../../../src/app/shared/utils/greeting';

const at = (hour: number) => new Date(2026, 10, 17, hour, 30);

describe('greetingFor', () => {
  it('buen día a la mañana, buenas tardes después del mediodía y buenas noches a la noche', () => {
    expect(greetingFor(at(8))).toBe('Buen día');
    expect(greetingFor(at(12))).toBe('Buen día');
    expect(greetingFor(at(13))).toBe('Buenas tardes');
    expect(greetingFor(at(19))).toBe('Buenas tardes');
    expect(greetingFor(at(20))).toBe('Buenas noches');
    expect(greetingFor(at(2))).toBe('Buenas noches');
  });
});

describe('greetingName', () => {
  it('al cedente por el nombre de pila; al comercio, por su nombre completo', () => {
    expect(greetingName('Lucía Fernández', 'consignor')).toBe('Lucía');
    expect(greetingName('Moda Circular', 'merchant')).toBe('Moda Circular');
  });
});
