import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { AuthService } from '../../../../../src/app/core/auth/auth.service';
import { Garment, GarmentStatus } from '../../../../../src/app/core/models/garment.model';
import { Proposal } from '../../../../../src/app/core/models/proposal.model';
import { ConsignorsService } from '../../../../../src/app/core/services/consignors.service';
import { GarmentsService } from '../../../../../src/app/core/services/garments.service';
import { MerchantsService } from '../../../../../src/app/core/services/merchants.service';
import { ProposalsService } from '../../../../../src/app/core/services/proposals.service';
import { MerchantProposals } from '../../../../../src/app/features/merchant/proposals/merchant-proposals';

function garment(id: string, name: string, status: GarmentStatus, consignorId = 'c1'): Garment {
  return {
    id,
    consignorId,
    merchantId: 'm1',
    name,
    category: 'Pantalones',
    brand: 'Marca',
    size: 'M',
    color: 'Azul',
    season: 'Invierno',
    condition: 'good',
    description: '',
    photos: [],
    status,
    createdAt: new Date('2026-10-01'),
    salesPointId: 'sp1',
    timeline: [],
  };
}

function proposal(garmentId: string): Proposal {
  return {
    id: `p-${garmentId}`,
    garmentId,
    requestedConsignorPrice: 6000,
    calculatedSalePrice: 10000,
    status: 'under_review',
    createdAt: new Date('2026-10-02'),
  };
}

const garments = [
  garment('g1', 'Campera de jean', 'under_review'),
  garment('g2', 'Vestido de fiesta', 'counteroffer', 'c2'),
  garment('g3', 'Pantalón cargo', 'no_agreement'),
  garment('g4', 'Remera blanca', 'in_stock'),
];

function render(queryParams: Record<string, string> = {}, merchantGarments = garments) {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
      },
      { provide: AuthService, useValue: { user: () => ({ id: 'm1' }) } },
      { provide: GarmentsService, useValue: { byMerchant: () => of(merchantGarments) } },
      {
        provide: ProposalsService,
        useValue: { proposalsForMerchant: () => of(merchantGarments.map((g) => proposal(g.id))) },
      },
      {
        provide: ConsignorsService,
        useValue: {
          list: () =>
            of([
              { id: 'c1', name: 'Marcela Bazán' },
              { id: 'c2', name: 'Ana Ríos' },
            ]),
        },
      },
      {
        provide: MerchantsService,
        useValue: {
          getById: () => of({ id: 'm1', salesPoints: [{ id: 'sp1', name: 'Local Güemes' }] }),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(MerchantProposals);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    element,
    names: () =>
      [...element.querySelectorAll('tbody td:first-child span')].map((span) =>
        span.textContent?.trim(),
      ),
  };
}

describe('MerchantProposals', () => {
  it('lista las prendas en negociación y las cerradas sin acuerdo, no las que están en stock', () => {
    const { names } = render();
    expect(names()).toEqual(['Campera de jean', 'Vestido de fiesta', 'Pantalón cargo']);
  });

  it('llega filtrada por estado desde la URL', () => {
    const { names, element } = render({ status: 'under_review' });
    expect(names()).toEqual(['Campera de jean']);
    const selected = element.querySelectorAll('select')[0].selectedOptions[0];
    expect(selected.textContent?.trim()).toBe('Por revisar');
  });

  it('llega filtrada por cedente desde la URL', () => {
    const { names } = render({ consignor: 'c2' });
    expect(names()).toEqual(['Vestido de fiesta']);
  });

  it('ofrece limpiar los filtros cuando no queda ninguna fila', () => {
    const { names, element, fixture } = render({ status: 'cancelled' });
    expect(names()).toEqual([]);
    expect(element.textContent).toContain('No hay propuestas que coincidan con los filtros.');

    const clear = [...element.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Limpiar filtros',
    );
    clear!.click();
    fixture.detectChanges();

    expect(names()).toHaveLength(3);
  });

  it('sin propuestas muestra el mensaje inicial y no muestra filtros', () => {
    const { element } = render({}, [garment('g4', 'Remera blanca', 'in_stock')]);
    expect(element.textContent).toContain('Todavía no recibiste propuestas de cedentes.');
    expect(element.querySelector('select')).toBeNull();
  });

  it('ofrece revisar solo las propuestas que esperan al comercio', () => {
    const { element } = render();
    const links = [...element.querySelectorAll('a')].filter(
      (link) => link.textContent?.trim() === 'Revisar',
    );
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/m/proposal/p-g1']);
  });

  it('resume las propuestas y el aviso lleva a las que hay que revisar', () => {
    const { element, fixture, names } = render();
    expect(element.textContent).toContain('Tenés 1 propuesta para revisar');

    const notice = [...element.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('para revisar'),
    );
    notice!.click();
    fixture.detectChanges();

    expect(names()).toEqual(['Campera de jean']);
    expect(element.textContent).not.toContain('Tenés 1 propuesta para revisar');
  });
});
