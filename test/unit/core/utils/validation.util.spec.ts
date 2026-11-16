import { describe, expect, it } from 'vitest';
import { FormControl, Validators } from '@angular/forms';
import { validationMessage } from '../../../../src/app/core/utils/validation.util';

const errorsOf = (value: unknown, ...validators: Parameters<typeof Validators.compose>[0]) =>
  new FormControl(value, Validators.compose(validators)).errors;

describe('validationMessage', () => {
  it('sin errores no devuelve mensaje', () => {
    expect(validationMessage(null)).toBeNull();
  });

  it('campo vacío pide completarlo', () => {
    expect(validationMessage(errorsOf('', Validators.required))).toBe('Completá este campo.');
  });

  it('vacío gana sobre el formato', () => {
    expect(validationMessage(errorsOf('', Validators.required, Validators.email))).toBe(
      'Completá este campo.',
    );
  });

  it('email mal escrito', () => {
    expect(validationMessage(errorsOf('maria@', Validators.email))).toBe('Ingresá un email válido.');
  });

  it('usa el largo mínimo real del validator', () => {
    expect(validationMessage(errorsOf('abc', Validators.minLength(8)))).toBe('Mínimo 8 caracteres.');
  });

  it('usa los límites reales de min y max', () => {
    expect(validationMessage(errorsOf(0, Validators.min(1)))).toBe('El mínimo es 1.');
    expect(validationMessage(errorsOf(13, Validators.max(12)))).toBe('El máximo es 12.');
  });

  it('pattern usa el mensaje del campo, o uno genérico', () => {
    const errors = errorsOf('12', Validators.pattern(/^\d{7,8}$/));
    expect(validationMessage(errors, '7 u 8 dígitos, sin puntos.')).toBe('7 u 8 dígitos, sin puntos.');
    expect(validationMessage(errors)).toBe('El formato no es válido.');
  });
});
