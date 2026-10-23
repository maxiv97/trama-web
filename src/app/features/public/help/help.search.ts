import { Faq, Guide, HelpRoleFilter, matchesRole, topicTitle } from './help.content';

// Búsqueda del centro de ayuda (handoff §3): del lado del cliente, sin librería.
// 34 FAQs + 13 guías entran en memoria, así que se recorre todo en cada consulta.

const DIACRITICS = /[̀-ͯ]/g;

/** Minúsculas, sin tildes y sin signos (los signos pasan a espacio). */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();
}

/** Palabras de la consulta: se descartan las de menos de 3 letras. */
export function queryTerms(query: string): string[] {
  const words = normalize(query).split(' ').filter(Boolean);
  const terms = words.filter((w) => w.length >= 3);
  return [...new Set(terms)];
}

export interface HelpHit {
  kind: 'faq' | 'guia';
  id: string;
  title: string;
  /** Texto de apoyo: la respuesta o los pasos, recortado alrededor de la primera coincidencia. */
  snippet: string;
  tema?: string;
  rol: Faq['rol'];
  score: number;
}

interface Doc {
  hit: Omit<HelpHit, 'score' | 'snippet'>;
  title: string;
  topic: string;
  body: string;
  rawBody: string;
}

function docs(faqs: readonly Faq[], guides: readonly Guide[]): Doc[] {
  return [
    ...faqs.map((f) => ({
      hit: { kind: 'faq' as const, id: f.id, title: f.pregunta, tema: f.tema, rol: f.rol },
      title: normalize(f.pregunta),
      topic: normalize(topicTitle(f.tema)),
      body: normalize(f.respuesta),
      rawBody: f.respuesta,
    })),
    ...guides.map((g) => {
      const raw = [...g.pasos, g.consejo ?? ''].join(' ');
      return {
        hit: { kind: 'guia' as const, id: g.slug, title: g.titulo, rol: g.rol },
        title: normalize(g.titulo),
        topic: normalize('guia guias'),
        body: normalize(raw),
        rawBody: raw,
      };
    }),
  ];
}

/**
 * Puntaje: coincidencia en pregunta/título ×3, en tema ×2, en respuesta ×1.
 * Todas las palabras tienen que aparecer en algún campo. Respeta el rol elegido.
 */
export function searchHelp(
  query: string,
  role: HelpRoleFilter,
  faqs: readonly Faq[],
  guides: readonly Guide[],
): HelpHit[] {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  const hits: HelpHit[] = [];
  for (const d of docs(faqs, guides)) {
    if (!matchesRole(d.hit.rol, role)) continue;
    let score = 0;
    let all = true;
    for (const t of terms) {
      const s = (d.title.includes(t) ? 3 : 0) + (d.topic.includes(t) ? 2 : 0) + (d.body.includes(t) ? 1 : 0);
      if (!s) {
        all = false;
        break;
      }
      score += s;
    }
    if (all) hits.push({ ...d.hit, score, snippet: snippet(d.rawBody, terms) });
  }
  // A igual puntaje, primero las preguntas (responden directo) y después las guías.
  return hits.sort((a, b) => b.score - a.score || (a.kind === b.kind ? 0 : a.kind === 'faq' ? -1 : 1));
}

const SNIPPET_LEN = 150;

function snippet(raw: string, terms: string[]): string {
  if (raw.length <= SNIPPET_LEN) return raw;
  const first = segments(raw, terms).findIndex((s) => s.mark);
  const offset = first < 0 ? 0 : segments(raw, terms).slice(0, first).reduce((n, s) => n + s.text.length, 0);
  const start = Math.max(0, offset - 40);
  const cut = raw.slice(start, start + SNIPPET_LEN).trim();
  return (start > 0 ? '…' : '') + cut + (start + SNIPPET_LEN < raw.length ? '…' : '');
}

export interface TextSegment {
  text: string;
  mark: boolean;
}

/**
 * Parte el texto original en tramos marcados y no marcados según los términos, comparando sin
 * tildes ni mayúsculas pero devolviendo el texto tal cual (para resaltar con <mark>).
 */
export function segments(text: string, terms: string[]): TextSegment[] {
  if (!terms.length || !text) return [{ text, mark: false }];
  // Texto normalizado carácter a carácter, con el índice del carácter original de cada uno.
  let norm = '';
  const origin: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const n = text[i].normalize('NFD').replace(DIACRITICS, '').toLowerCase();
    for (const ch of n) {
      norm += ch;
      origin.push(i);
    }
  }
  const marked = new Array<boolean>(text.length).fill(false);
  for (const t of terms) {
    let from = 0;
    for (let at = norm.indexOf(t, from); at >= 0; at = norm.indexOf(t, from)) {
      for (let k = at; k < at + t.length; k++) marked[origin[k]] = true;
      from = at + t.length;
    }
  }
  const out: TextSegment[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = out[out.length - 1];
    if (last && last.mark === marked[i]) last.text += text[i];
    else out.push({ text: text[i], mark: marked[i] });
  }
  return out;
}
