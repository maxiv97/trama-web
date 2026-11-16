import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function validationMessage(
  errors: ValidationErrors | null,
  patternMessage = 'El formato no es válido.',
): string | null {
  if (!errors) return null;
  if (errors['required']) return 'Completá este campo.';
  if (errors['email']) return 'Ingresá un email válido.';
  if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres.`;
  if (errors['min']) return `El mínimo es ${errors['min'].min}.`;
  if (errors['max']) return `El máximo es ${errors['max'].max}.`;
  if (errors['pattern']) return patternMessage;
  return null;
}

export const notBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  String(control.value ?? '').trim() ? null : { required: true };
