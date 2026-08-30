import writeXlsxFile from 'write-excel-file/browser';

// The browser build returns { toBlob, toFile } instead of downloading directly, and its shipped
// overloads don't model the multi-sheet + toFile path, so we call it through a narrow cast.
const writeXlsx = writeXlsxFile as unknown as (sheets: unknown) => {
  toFile: (fileName: string) => Promise<void>;
};

export type XlsxCell = string | number | null;

export interface XlsxSheet {
  name: string;
  columns: string[];
  rows: XlsxCell[][];
}

// Builds a multi-sheet .xlsx (one tab per sheet) and hands it to the browser as a download.
// Numbers stay numeric so the spreadsheet can sum them; empty cells stay blank.
export async function downloadXlsx(fileName: string, sheets: XlsxSheet[]): Promise<void> {
  const toCell = (value: XlsxCell) =>
    value === null || value === undefined
      ? null
      : { value, type: typeof value === 'number' ? Number : String };

  const sheetObjects = sheets.map((sheet) => ({
    sheet: sheet.name,
    data: [
      sheet.columns.map((column) => ({ value: column, fontWeight: 'bold' as const })),
      ...sheet.rows.map((row) => row.map(toCell)),
    ],
  }));

  await writeXlsx(sheetObjects).toFile(
    fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`,
  );
}
