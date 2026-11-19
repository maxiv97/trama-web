export interface ChartPoint {
  label: string;
  value: number;
  display?: string;
  tone?: ChartTone;
}

export type ChartTone = 'main' | 'highlight' | 'secondary' | 'alert';

// Para que ningun valor menor a 1 quede invisible
export function proportions(points: readonly ChartPoint[], minimum = 0.04): number[] {
  const max = Math.max(0, ...points.map((point) => point.value));
  return points.map((point) =>
    max > 0 && point.value > 0 ? Math.max(minimum, point.value / max) : 0,
  );
}
