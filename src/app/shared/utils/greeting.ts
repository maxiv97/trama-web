// Según el momento del día
export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 13) return 'Buen día';
  if (hour >= 13 && hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// Según el rol
export function greetingName(name: string, role: 'consignor' | 'merchant' | null): string {
  const clean = name.trim();
  return role === 'consignor' ? (clean.split(/\s+/)[0] ?? clean) : clean;
}
