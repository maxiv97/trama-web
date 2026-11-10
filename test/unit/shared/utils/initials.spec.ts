import { describe, expect, it } from 'vitest';
import { initialsOf } from '../../../../src/app/shared/utils/initials';

describe('initialsOf', () => {
  it('toma la inicial del primer nombre y la del último apellido', () => {
    expect(initialsOf('Lucía Fernández')).toBe('LF');
    expect(initialsOf('María José López Paz')).toBe('MP');
  });

  it('con una sola palabra devuelve una letra', () => {
    expect(initialsOf('Ana')).toBe('A');
  });

  it('ignora espacios de más y pasa a mayúsculas', () => {
    expect(initialsOf('  moda   circular ')).toBe('MC');
  });

  it('sin nombre devuelve vacío', () => {
    expect(initialsOf('')).toBe('');
    expect(initialsOf('   ')).toBe('');
  });
});
