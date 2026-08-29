type Cell = string | number | null | undefined;

function escape(value: Cell): string {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Serializes headers + rows to a CSV string (CRLF line breaks, quoted where needed).
export function toCsv(headers: string[], rows: Cell[][]): string {
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
}

// Hands the CSV to the browser as a download. The BOM keeps Excel from mangling the accents;
// raw numbers stay numeric so the sheet can sum them.
export function downloadCsv(filename: string, headers: string[], rows: Cell[][]): void {
  const blob = new Blob(['﻿' + toCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
