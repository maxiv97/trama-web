import { jsPDF } from 'jspdf';
import { MonthlyPayout, PayoutStatus } from '../../core/models/payout.model';
import { monthLabel } from '../../core/utils/month.util';

interface PayoutPdfContext {
  merchantName: string;
  consignorName: string;
}

const STATUS_LABEL: Record<PayoutStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagada',
  overdue: 'Vencida',
};

const MONEY_FORMATTER = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function downloadPayoutPdf(payout: MonthlyPayout, context: PayoutPdfContext): void {
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.text('Trama · Liquidación', 20, y);
  y += 10;

  doc.setFontSize(11);
  doc.text(`Comercio: ${context.merchantName}`, 20, y);
  y += 6;
  doc.text(`Cedente: ${context.consignorName}`, 20, y);
  y += 6;
  doc.text(`Período: ${monthLabel(payout.month)}`, 20, y);
  y += 6;
  doc.text(`Estado: ${STATUS_LABEL[payout.status]}`, 20, y);
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.text('Prenda', 20, y);
  doc.text('Vendida', 120, y);
  doc.text('Monto', 190, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y += 3;
  doc.line(20, y, 190, y);
  y += 7;

  for (const line of payout.lines) {
    doc.text(line.garmentName, 20, y);
    doc.text(DATE_FORMATTER.format(line.soldAt), 120, y);
    doc.text(MONEY_FORMATTER.format(line.consignorAmount), 190, y, { align: 'right' });
    y += 7;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  }

  y += 1;
  doc.line(20, y, 190, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Total a liquidar', 20, y);
  doc.text(MONEY_FORMATTER.format(payout.totalAmount), 190, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y += 10;

  if (payout.status === 'paid' && payout.paidAt) {
    doc.text(`Fecha de pago: ${DATE_FORMATTER.format(payout.paidAt)}`, 20, y);
  } else {
    doc.text(`Vencimiento: ${DATE_FORMATTER.format(payout.dueDate)}`, 20, y);
  }

  doc.setFontSize(9);
  doc.setTextColor(130);
  doc.text('Este detalle es informativo y no tiene validez como comprobante fiscal.', 20, 285);

  doc.save(`liquidacion-${payout.month}-${slugify(context.consignorName)}.pdf`);
}
