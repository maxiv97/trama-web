import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { RowLink } from '../../../../src/app/shared/directives/row-link.directive';

@Component({ template: '' })
class Blank {}

@Component({
  imports: [RowLink],
  template: `
    <table>
      <tbody>
        <tr [tramaRowLink]="['/m/inventory', 'g1']">
          <td class="name">Campera de jean</td>
          <td><button type="button" class="action">Recibir</button></td>
        </tr>
      </tbody>
    </table>
  `,
})
class Host {}

function setup() {
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: '**', component: Blank }])],
  });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return { element, navigate };
}

describe('RowLink', () => {
  it('un clic en la fila abre el detalle', () => {
    const { element, navigate } = setup();
    element.querySelector<HTMLElement>('.name')!.click();
    expect(navigate).toHaveBeenCalledWith(['/m/inventory', 'g1']);
  });

  it('las acciones rápidas de la fila no la activan', () => {
    const { element, navigate } = setup();
    element.querySelector<HTMLButtonElement>('.action')!.click();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('marca la fila para el hover y el foco', () => {
    expect(setup().element.querySelector('tr')?.classList.contains('trama-row-link')).toBe(true);
  });

  it('con Ctrl apretado la abre en otra pestaña', () => {
    const { element, navigate } = setup();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    element
      .querySelector<HTMLElement>('.name')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    expect(open).toHaveBeenCalledWith('/m/inventory/g1', '_blank');
    expect(navigate).not.toHaveBeenCalled();
    open.mockRestore();
  });
});
