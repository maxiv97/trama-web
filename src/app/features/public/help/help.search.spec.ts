import { describe, expect, it } from 'vitest';
import { FAQS, GUIDES } from './help.content';
import { normalize, queryTerms, searchHelp, segments } from './help.search';

describe('búsqueda de ayuda', () => {
  it('normaliza sin tildes, minúsculas y sin signos', () => {
    expect(normalize('¿Cuándo COBRO la liquidación?')).toBe('cuando cobro la liquidacion');
  });

  it('descarta palabras de menos de 3 letras', () => {
    expect(queryTerms('la liquidación de mi prenda')).toEqual(['liquidacion', 'prenda']);
  });

  it('encuentra por términos sin tildes (criterio 4)', () => {
    const hits = searchHelp('liquidacion', 'todos', FAQS, GUIDES);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.id === 'cuando-cobro')).toBe(true);
  });

  it('respeta el rol elegido', () => {
    const cedente = searchHelp('pago', 'cedente', FAQS, GUIDES);
    expect(cedente.every((h) => h.rol !== 'comercio')).toBe(true);
    const comercio = searchHelp('pago', 'comercio', FAQS, GUIDES);
    expect(comercio.every((h) => h.rol !== 'cedente')).toBe(true);
  });

  it('exige que todas las palabras aparezcan', () => {
    expect(searchHelp('liquidacion zzzzqx', 'todos', FAQS, GUIDES)).toEqual([]);
  });

  it('pondera más el título que la respuesta', () => {
    const [first] = searchHelp('contraoferta', 'todos', FAQS, GUIDES);
    expect(normalize(first.title)).toContain('contraoferta');
  });

  it('marca las coincidencias sobre el texto original con tildes', () => {
    const segs = segments('¿Cuándo cobro?', ['cuando']);
    expect(segs).toEqual([
      { text: '¿', mark: false },
      { text: 'Cuándo', mark: true },
      { text: ' cobro?', mark: false },
    ]);
  });
});
