
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

const pdfFormatMoney = (amount: number) => {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface ReceiptData {
  buildingName: string;
  buildingAddress: string;
  paymentId: string;
  date: string;
  amount: number;
  owner: string;
  unit: string;
}

interface SettlementPdfData {
  buildingId: string;
  buildingName: string;
  buildingAddress: string;
  month: string;
  monthIdx: number;
  year: number;
  totalExpenses: number;
  expenses: any[];
  units: any[];
}

export const generatePaymentReceipt = async (data: ReceiptData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const qrContent = `https://consorcioflow.app/verify/payment/${data.paymentId}`;
  const qrDataUrl = await QRCode.toDataURL(qrContent, { margin: 1, width: 100 });

  const primaryColor = '#4f46e5'; 
  const secondaryColor = '#1e293b';
  const lightGray = '#f8fafc';

  doc.setFillColor(lightGray);
  doc.rect(0, 0, 210, 60, 'F');
  
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('ConsorcioFlow', 20, 25);
  
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text('GESTIÓN INTELIGENTE DE CONSORCIOS', 20, 32);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(data.buildingName.toUpperCase(), 190, 25, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(data.buildingAddress, 190, 30, { align: 'right' });
  doc.text(`ID Comprobante: #${data.paymentId.toUpperCase()}`, 190, 35, { align: 'right' });

  doc.setDrawColor(primaryColor);
  doc.setLineWidth(1);
  doc.line(20, 50, 190, 50);
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE PAGO', 105, 75, { align: 'center' });

  doc.setFillColor(lightGray);
  doc.roundedRect(20, 85, 170, 100, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setTextColor(secondaryColor);
  
  const startY = 100;
  const lineSpacing = 12;

  const fields = [
    { label: 'FECHA DE COBRO:', value: data.date },
    { label: 'UNIDAD FUNCIONAL:', value: data.unit },
    { label: 'PROPIETARIO:', value: data.owner },
  ];

  fields.forEach((field, i) => {
    doc.setFont('helvetica', 'bold');
    doc.text(field.label, 30, startY + (i * lineSpacing));
    doc.setFont('helvetica', 'normal');
    doc.text(field.value, 80, startY + (i * lineSpacing));
  });

  doc.setDrawColor('#e2e8f0');
  doc.line(30, 140, 180, 140);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL RECAUDADO:', 30, 155);
  
  doc.setFontSize(22);
  doc.setTextColor(primaryColor);
  doc.text(`$${pdfFormatMoney(data.amount)}`, 180, 155, { align: 'right' });

  doc.addImage(qrDataUrl, 'PNG', 145, 195, 45, 45);
  
  doc.setFontSize(9);
  doc.setTextColor('#94a3b8');
  doc.text('Escanee el código QR para verificar la validez', 140, 245, { align: 'right' });
  doc.text('de este comprobante de forma online.', 140, 250, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor('#cbd5e1');
  doc.text('Este documento es un comprobante de pago válido para el consorcio especificado.', 105, 280, { align: 'center' });
  doc.text('Documento generado automáticamente por el sistema ConsorcioFlow.', 105, 285, { align: 'center' });

  doc.save(`Recibo_${data.unit}_${data.date.replace(/\//g, '-')}.pdf`);
};

export const generateSettlementPdf = async (data: SettlementPdfData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Generamos el link al portal público usando la URL actual y parámetros
  const baseUrl = window.location.origin + window.location.pathname;
  const publicUrl = `${baseUrl}?v=portal&bid=${data.buildingId}&m=${data.monthIdx}&y=${data.year}`;
  
  const qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 100 });

  const primaryColor = '#4f46e5'; 
  const secondaryColor = '#1e293b';
  const lightGray = '#f8fafc';

  // Encabezado
  doc.setFillColor(lightGray);
  doc.rect(0, 0, 210, 45, 'F');
  
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('ConsorcioFlow', 20, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text('LIQUIDACIÓN OFICIAL DE EXPENSAS', 20, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(data.buildingName.toUpperCase(), 190, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(data.buildingAddress, 190, 26, { align: 'right' });
  doc.text(`Período: ${data.month} ${data.year}`, 190, 32, { align: 'right' });

  // Resumen Financiero
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, 50, 190, 50);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN DE EGRESOS', 20, 60);
  
  doc.setFontSize(20);
  doc.text(`$${pdfFormatMoney(data.totalExpenses)}`, 190, 60, { align: 'right' });

  // Tabla de Gastos
  let currentY = 70;
  doc.setFillColor(secondaryColor);
  doc.rect(20, currentY, 170, 8, 'F');
  doc.setTextColor('#ffffff');
  doc.setFontSize(8);
  doc.text('DESCRIPCIÓN', 25, currentY + 5);
  doc.text('CATEGORÍA', 105, currentY + 5);
  doc.text('MONTO', 185, currentY + 5, { align: 'right' });

  currentY += 8;
  doc.setTextColor(secondaryColor);
  data.expenses.forEach((exp, i) => {
    if (currentY > 260) { doc.addPage(); currentY = 20; }
    if (i % 2 === 0) { doc.setFillColor('#f8fafc'); doc.rect(20, currentY, 170, 7, 'F'); }
    doc.text(exp.description.substring(0, 55), 25, currentY + 5);
    doc.text(exp.category.toUpperCase(), 105, currentY + 5);
    doc.text(`$${pdfFormatMoney(exp.amount)}`, 185, currentY + 5, { align: 'right' });
    currentY += 7;
  });

  // Prorrateo por Unidades
  currentY += 15;
  if (currentY > 240) { doc.addPage(); currentY = 20; }
  
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('PRORRATEO POR UNIDAD FUNCIONAL', 20, currentY);
  currentY += 8;

  doc.setFillColor(primaryColor);
  doc.rect(20, currentY, 170, 8, 'F');
  doc.setTextColor('#ffffff');
  doc.setFontSize(8);
  doc.text('UF', 25, currentY + 5);
  doc.text('TITULAR', 50, currentY + 5);
  doc.text('PARTIC.', 120, currentY + 5);
  doc.text('A PAGAR', 185, currentY + 5, { align: 'right' });

  currentY += 8;
  doc.setTextColor(secondaryColor);
  data.units.forEach((u, i) => {
    if (currentY > 270) { doc.addPage(); currentY = 20; }
    if (i % 2 === 0) { doc.setFillColor('#f8fafc'); doc.rect(20, currentY, 170, 7, 'F'); }
    doc.text(`${u.floor}${u.department}`, 25, currentY + 5);
    doc.text(u.owner.substring(0, 30), 50, currentY + 5);
    doc.text(`${(u.coefficient * 100).toFixed(2)}%`, 120, currentY + 5);
    const amount = data.totalExpenses * u.coefficient;
    doc.text(`$${pdfFormatMoney(amount)}`, 185, currentY + 5, { align: 'right' });
    currentY += 7;
  });

  // Footer y QR
  if (currentY > 230) { doc.addPage(); currentY = 20; }
  doc.addImage(qrDataUrl, 'PNG', 160, 240, 30, 30);
  doc.setFontSize(8);
  doc.setTextColor('#94a3b8');
  doc.text('Escanee para ver detalle online', 155, 245, { align: 'right' });
  doc.text('Transparencia ConsorcioFlow', 20, 280);

  doc.save(`Liquidacion_${data.month}_${data.year}_${data.buildingName.replace(/\s/g, '_')}.pdf`);
};
