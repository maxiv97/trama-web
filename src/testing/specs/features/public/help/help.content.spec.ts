import { describe, expect, it } from 'vitest';
import {
  ALL_FAQS,
  ALL_GUIDES,
  ALL_STAGES,
  FAQS,
  FEATURED_FAQ_IDS,
  GUIDES,
  MOTIVOS,
  STAGES,
  TOPICS,
} from '../../../../../app/features/public/help/help.content';

const slugs = new Set(ALL_GUIDES.map((g) => g.slug));
const motivos = new Set(MOTIVOS.map((m) => m.value));
const topics = new Set(TOPICS.map((t) => t.id));

describe('contenido de ayuda', () => {
  it('todo guias[] del recorrido apunta a una guía existente', () => {
    for (const s of ALL_STAGES) for (const g of s.guias) expect(slugs.has(g), `${s.id} → ${g}`).toBe(true);
  });

  it('toda guia de una FAQ apunta a una guía existente', () => {
    for (const f of ALL_FAQS) if (f.guia) expect(slugs.has(f.guia), `${f.id} → ${f.guia}`).toBe(true);
  });

  it('todo motivo existe en la lista de motivos', () => {
    for (const f of ALL_FAQS) expect(motivos.has(f.motivo), f.id).toBe(true);
    for (const g of ALL_GUIDES) expect(motivos.has(g.motivo), g.slug).toBe(true);
  });

  it('todo tema de FAQ existe', () => {
    for (const f of ALL_FAQS) expect(topics.has(f.tema), f.id).toBe(true);
  });

  it('ids y slugs son únicos y no chocan con los anclas de tema', () => {
    const ids = ALL_FAQS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(slugs.size).toBe(ALL_GUIDES.length);
    for (const id of ids) expect(topics.has(id), id).toBe(false);
  });

  it('no publica nada con validar ni [Definir: …] (criterio 9)', () => {
    const published = JSON.stringify([FAQS, GUIDES, STAGES]);
    expect(published).not.toContain('[Definir');
    expect(FAQS.some((f) => f.validar)).toBe(false);
    expect(GUIDES.some((g) => g.validar)).toBe(false);
    const pub = new Set(GUIDES.map((g) => g.slug));
    for (const s of STAGES) for (const g of s.guias) expect(pub.has(g)).toBe(true);
    for (const f of FAQS) if (f.guia) expect(pub.has(f.guia)).toBe(true);
  });

  it('las destacadas de la landing están publicadas', () => {
    for (const id of FEATURED_FAQ_IDS) expect(FAQS.some((f) => f.id === id), id).toBe(true);
  });
});
