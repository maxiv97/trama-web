import { describe, expect, it } from 'vitest';
import { Garment } from '../../../../../src/app/core/models/garment.model';
import { Proposal } from '../../../../../src/app/core/models/proposal.model';
import {
  MISSING_LABEL,
  buildProposalRows,
  isProposalStage,
  proposalLink,
  summarizeProposals,
} from '../../../../../src/app/features/merchant/proposals/proposal-rows';

function buildGarment(overrides: Partial<Garment> = {}): Garment {
  return {
    id: 'g1',
    consignorId: 'c1',
    merchantId: 'm1',
    name: 'Campera de jean',
    category: 'Camperas y abrigos',
    brand: 'Levi’s',
    size: 'M',
    color: 'Azul',
    season: 'Invierno',
    condition: 'good',
    description: '',
    photos: ['foto-1.jpg', 'foto-2.jpg'],
    status: 'under_review',
    createdAt: new Date('2026-10-01'),
    salesPointId: 'sp1',
    timeline: [],
    ...overrides,
  };
}

function buildProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: 'p1',
    garmentId: 'g1',
    requestedConsignorPrice: 6000,
    calculatedSalePrice: 10000,
    status: 'under_review',
    createdAt: new Date('2026-10-02'),
    ...overrides,
  };
}

const consignorNames = new Map([['c1', 'Marcela Bazán']]);
const salesPointNames = new Map([['sp1', 'Local Güemes']]);

function rowsFor(garments: Garment[], proposals: Proposal[] = []) {
  const byGarment = new Map(proposals.map((proposal) => [proposal.garmentId, proposal]));
  return buildProposalRows(garments, byGarment, consignorNames, salesPointNames);
}

describe('isProposalStage', () => {
  it('reconoce los estados de negociación y los cerrados sin acuerdo', () => {
    expect(isProposalStage('under_review')).toBe(true);
    expect(isProposalStage('counteroffer')).toBe(true);
    expect(isProposalStage('no_agreement')).toBe(true);
    expect(isProposalStage('cancelled')).toBe(true);
  });

  it('descarta los estados posteriores al acuerdo', () => {
    expect(isProposalStage('agreed')).toBe(false);
    expect(isProposalStage('in_stock')).toBe(false);
    expect(isProposalStage('sold')).toBe(false);
  });
});

describe('buildProposalRows', () => {
  it('lista solo las prendas en etapa de propuesta', () => {
    const rows = rowsFor([
      buildGarment({ id: 'g1', status: 'under_review' }),
      buildGarment({ id: 'g2', status: 'agreed' }),
      buildGarment({ id: 'g3', status: 'in_stock' }),
      buildGarment({ id: 'g4', status: 'cancelled' }),
    ]);

    expect(rows.map((row) => row.garmentId).sort()).toEqual(['g1', 'g4']);
  });

  it('muestra los montos que pidió el cedente mientras la propuesta está en revisión', () => {
    const [row] = rowsFor([buildGarment()], [buildProposal()]);

    expect(row.proposalId).toBe('p1');
    expect(row.consignorPrice).toBe(6000);
    expect(row.salePrice).toBe(10000);
  });

  it('muestra los montos de la contraoferta cuando la prenda está en contraoferta', () => {
    const counteroffer = { consignorPrice: 5000, salePrice: 8500, date: new Date('2026-10-03') };
    const [row] = rowsFor(
      [buildGarment({ status: 'counteroffer' })],
      [buildProposal({ status: 'counteroffer', counteroffer })],
    );

    expect(row.consignorPrice).toBe(5000);
    expect(row.salePrice).toBe(8500);
  });

  it('ignora una contraoferta vieja si la prenda ya no está en contraoferta', () => {
    const counteroffer = { consignorPrice: 5000, salePrice: 8500, date: new Date('2026-10-03') };
    const [row] = rowsFor(
      [buildGarment({ status: 'no_agreement' })],
      [buildProposal({ status: 'no_agreement', counteroffer })],
    );

    expect(row.consignorPrice).toBe(6000);
    expect(row.salePrice).toBe(10000);
  });

  it('completa nombre de cedente, punto de venta y primera foto', () => {
    const [row] = rowsFor([buildGarment()], [buildProposal()]);

    expect(row.consignorName).toBe('Marcela Bazán');
    expect(row.salesPointName).toBe('Local Güemes');
    expect(row.photo).toBe('foto-1.jpg');
  });

  it('usa un guion cuando falta el cedente o el punto de venta', () => {
    const [row] = rowsFor([
      buildGarment({ consignorId: 'desconocido', salesPointId: undefined, photos: [] }),
    ]);

    expect(row.consignorName).toBe(MISSING_LABEL);
    expect(row.salesPointName).toBe(MISSING_LABEL);
    expect(row.photo).toBeUndefined();
  });

  it('ordena de la propuesta más reciente a la más antigua', () => {
    const rows = rowsFor(
      [buildGarment({ id: 'vieja' }), buildGarment({ id: 'nueva' }), buildGarment({ id: 'media' })],
      [
        buildProposal({ id: 'p-vieja', garmentId: 'vieja', createdAt: new Date('2026-10-01') }),
        buildProposal({ id: 'p-nueva', garmentId: 'nueva', createdAt: new Date('2026-10-20') }),
        buildProposal({ id: 'p-media', garmentId: 'media', createdAt: new Date('2026-10-10') }),
      ],
    );

    expect(rows.map((row) => row.garmentId)).toEqual(['nueva', 'media', 'vieja']);
  });

  it('sin propuesta, usa la fecha de carga de la prenda para ordenar', () => {
    const rows = rowsFor(
      [
        buildGarment({ id: 'sin-propuesta', createdAt: new Date('2026-10-15') }),
        buildGarment({ id: 'con-propuesta' }),
      ],
      [buildProposal({ garmentId: 'con-propuesta', createdAt: new Date('2026-10-05') })],
    );

    expect(rows.map((row) => row.garmentId)).toEqual(['sin-propuesta', 'con-propuesta']);
  });

  describe('proposalLink', () => {
    it('lleva a revisar la propuesta cuando espera al comercio', () => {
      const [row] = rowsFor([buildGarment()], [buildProposal()]);
      expect(proposalLink(row)).toEqual(['/m/proposal', 'p1']);
    });

    it('lleva al seguimiento de la prenda en los demás estados', () => {
      const [row] = rowsFor(
        [buildGarment({ status: 'counteroffer' })],
        [buildProposal({ status: 'counteroffer' })],
      );
      expect(proposalLink(row)).toEqual(['/m/garment', 'g1']);
    });

    it('lleva al seguimiento si la prenda en revisión no tiene propuesta', () => {
      const [row] = rowsFor([buildGarment()]);
      expect(proposalLink(row)).toEqual(['/m/garment', 'g1']);
    });
  });

  describe('summarizeProposals', () => {
    it('cuenta las que esperan al comercio, las que esperan al cedente y suma su valor', () => {
      const rows = rowsFor(
        [
          buildGarment({ id: 'a' }),
          buildGarment({ id: 'b' }),
          buildGarment({ id: 'c', status: 'counteroffer' }),
          buildGarment({ id: 'd', status: 'no_agreement' }),
        ],
        [
          buildProposal({ id: 'pa', garmentId: 'a', calculatedSalePrice: 10000 }),
          buildProposal({ id: 'pb', garmentId: 'b', calculatedSalePrice: 4500 }),
          buildProposal({ id: 'pc', garmentId: 'c', calculatedSalePrice: 8000 }),
          buildProposal({ id: 'pd', garmentId: 'd', calculatedSalePrice: 7000 }),
        ],
      );

      expect(summarizeProposals(rows)).toEqual({
        toReview: 2,
        waitingConsignor: 1,
        toReviewSaleValue: 14500,
      });
    });

    it('sin propuestas todo da cero', () => {
      expect(summarizeProposals([])).toEqual({
        toReview: 0,
        waitingConsignor: 0,
        toReviewSaleValue: 0,
      });
    });
  });
});
