// The "recorte" the dashboard applies across every report. All optional — an empty filter is
// the whole merchant. `from`/`to` are YYYY-MM-DD strings; the date range scopes sale-derived
// figures, the three dimensions scope the garments a report looks at.
export interface ReportFilters {
  from?: string;
  to?: string;
  salesPointId?: string;
  category?: string;
  consignorId?: string;
}

// Drops empty values so the query string only carries the filters actually set.
export function toReportParams(filters?: ReportFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (!filters) return params;
  for (const [key, value] of Object.entries(filters)) {
    if (value) params[key] = value;
  }
  return params;
}
