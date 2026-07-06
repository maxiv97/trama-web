const MONTH_FORMATTER = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });

export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const label = MONTH_FORMATTER.format(new Date(year, monthNumber - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
