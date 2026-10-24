const DAY_MS = 24 * 60 * 60 * 1000;

// Días que faltan hasta una fecha límite (negativo si ya pasó), contados por día calendario.
export function daysUntil(deadline: Date | string, now: Date = new Date()): number {
  const end = new Date(deadline);
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b - a) / DAY_MS);
}

// "Hoy", "Mañana", "Quedan N días" o "Venció hace N días".
export function countdownLabel(deadline: Date | string, now: Date = new Date()): string {
  const days = daysUntil(deadline, now);
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  if (days > 1) return `Quedan ${days} días`;
  return days === -1 ? 'Venció ayer' : `Venció hace ${-days} días`;
}
