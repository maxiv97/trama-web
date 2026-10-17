import { describe, expect, it } from 'vitest';
import { Garment, GarmentStatus } from '../../../core/models/garment.model';
import { Proposal } from '../../../core/models/proposal.model';
import { buildProposalRows } from './proposal-rows';

function garment(id: string, status: GarmentStatus, createdAt: string): Garment {
  return {
    id,
    consignorId: 'c1',
    merchantId: 'm1',
    name: `Prenda ${id}`,
    category: 'Pantalones',
    brand: 'Marca',
    size: 'M',
    color: 'Azul',
    season: 'Invierno',
    condition: 'good',
    description: '',
    photos: [],
    status,
    createdAt: new Date(createdAt),
    salesPointId: 'sp1',
    timeline: [],
  };
}

function proposal(garmentId: string, createdAt: string, extra: Partial<Proposal> = {}): Proposal {
  return {
    id: `p-${garmentId}`,
    garmentId,
    requestedConsignorPrice: 6000,
    calculatedSalePrice: 10000,
    status: 'under_review',
    createdAt: new Date(createdAt),
    ...extra,
  };
}

const consignors = new Map([['c1', 'Marcela Bazán']]);
const salesPoints = new Map([['sp1', 'Local Güemes']]);

describe('buildProposalRows', () => {
  it('deja afuera las prendas que ya tienen acuerdo', () => {
    const garments = [
      garment('g1', 'under_review', '2026-10-01'),
      garment('g2', 'agreed', '2026-10-02'),
      garment('g3', 'in_stock', '2026-10-03'),
      garment('g4', 'no_agreement', '2026-10-04'),
    ];
    const rows = buildProposalRows(garments, new Map(), consignors, salesPoints);
    expect(rows.map((row) => row.garmentId)).toEqual(['g4', 'g1']);
  });

  it('ordena de la más nueva a la más vieja según la fecha de la propuesta', () => {
    const garments = [
      garment('g1', 'under_review', '2026-10-01'),
      garment('g2', 'under_review', '2026-10-02'),
    ];
    const proposals = new Map([
      ['g1', proposal('g1', '2026-10-10')],
      ['g2', proposal('g2', '2026-10-05')],
    ]);
    const rows = buildProposalRows(garments, proposals, consignors, salesPoints);
    expect(rows.map((row) => row.garmentId)).toEqual(['g1', 'g2']);
  });

  it('muestra los montos de la contraoferta cuando la prenda está en contraoferta', () => {
    const garments = [garment('g1', 'counteroffer', '2026-10-01')];
    const proposals = new Map([
      [
        'g1',
        proposal('g1', '2026-10-01', {
          status: 'counteroffer',
          counteroffer: { consignorPrice: 4500, salePrice: 7500, date: new Date('2026-10-02') },
        }),
      ],
    ]);
    const [row] = buildProposalRows(garments, proposals, consignors, salesPoints);
    expect(row.consignorPrice).toBe(4500);
    expect(row.salePrice).toBe(7500);
  });

  it('completa nombres, categoría e id de propuesta para linkear a la revisión', () => {
    const garments = [garment('g1', 'under_review', '2026-10-01')];
    const proposals = new Map([['g1', proposal('g1', '2026-10-01')]]);
    const [row] = buildProposalRows(garments, proposals, consignors, salesPoints);
    expect(row).toMatchObject({
      proposalId: 'p-g1',
      category: 'Pantalones',
      consignorName: 'Marcela Bazán',
      salesPointName: 'Local Güemes',
      consignorPrice: 6000,
      salePrice: 10000,
    });
  });

  it('usa un guion cuando falta el cedente o el punto de venta', () => {
    const orphan = { ...garment('g1', 'under_review', '2026-10-01'), consignorId: 'x', salesPointId: 'y' };
    const [row] = buildProposalRows([orphan], new Map(), consignors, salesPoints);
    expect(row.consignorName).toBe('—');
    expect(row.salesPointName).toBe('—');
    expect(row.proposalId).toBeUndefined();
  });
});
