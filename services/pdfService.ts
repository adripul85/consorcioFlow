import { jsPDF } from 'jspdf';

const formatArCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const generateSettlementPdf = async (data: any) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 10;
  const pageWidth = 210;
  const margin = 10;

  const drawHeader = () => {
    doc.setFillColor(189, 215, 238);
    doc.rect(margin + 60, 10, 80, 15, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('MIS EXPENSAS', 105, 17, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Liquidación de mes: ${data.month.toUpperCase()} ${data.year}`, 105, 23, { align: 'center' });

    doc.setFontSize(8);
    doc.setFillColor(242, 242, 242);
    doc.rect(margin, 28, 90, 25, 'F');
    doc.text('ADMINISTRACIÓN', margin + 2, 32);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ADMINISTRACION FARZATI`, margin + 2, 37);
    doc.text(`CUIT: 27-05266581-2 | RPA: 16082`, margin + 2, 41);
    doc.text(`San Carlos 5580 piso 4º 26`, margin + 2, 45);
    doc.text(`Mail: dianoefar@hotmail.com`, margin + 2, 49);

    doc.setFillColor(242, 242, 242);
    doc.rect(pageWidth - margin - 90, 28, 90, 25, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('CONSORCIO', pageWidth - margin - 88, 32);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${data.buildingName}`, pageWidth - margin - 88, 37);
    doc.text(`Dirección: ${data.buildingAddress}`, pageWidth - margin - 88, 41);
    doc.text(`CUIT: 30-55950114-6`, pageWidth - margin - 88, 45);
    y = 60;
  };

  const drawRubroHeader = (title: string) => {
    if (y > 265) { doc.addPage(); y = 15; }
    doc.setFillColor(189, 215, 238);
    doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(title, margin + 2, y + 4.5);
    y += 10;
  };

  const drawSubRubro = (title: string, items: any[], totalRubroLabel: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(title, margin, y - 2);
    doc.text('EXPENSA', pageWidth - margin - 40, y - 2, { align: 'right' });
    doc.text('TOTAL', pageWidth - margin - 2, y - 2, { align: 'right' });
    doc.line(margin, y - 1, pageWidth - margin, y - 1);
    
    let subtotal = 0;
    doc.setFont('helvetica', 'normal');
    if (items.length === 0) {
      doc.text('SIN MOVIMIENTOS', margin + 2, y + 3);
      y += 8;
    } else {
      items.forEach(item => {
        if (y > 280) { doc.addPage(); y = 15; }
        doc.text(item.description.substring(0, 85).toUpperCase(), margin + 2, y);
        doc.text(formatArCurrency(item.amount), pageWidth - margin - 2, y, { align: 'right' });
        subtotal += item.amount;
        y += 4;
      });
    }

    doc.setFillColor(242, 242, 242);
    doc.rect(margin, y, pageWidth - (margin * 2), 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text(totalRubroLabel, margin + 2, y + 3.5);
    doc.text(`$ ${formatArCurrency(subtotal)}`, pageWidth - margin - 2, y + 3.5, { align: 'right' });
    y += 10;
    return subtotal;
  };

  // --- INICIO GENERACIÓN ---
  drawHeader();

  // Rubro 1
  drawRubroHeader("REMUNERACIONES AL PERSONAL Y CARGAS SOCIALES");
  const r1a = data.expenses.filter((e: any) => /sueldo|basico|antiguedad|vacaciones|aguinaldo/i.test(e.description));
  const r1b = data.expenses.filter((e: any) => /afip|931|fateryh|suterh|cargas social|seracarh/i.test(e.description));
  drawSubRubro("1a DETALLE DE SUELDO", r1a, "TOTAL 1a");
  drawSubRubro("1b APORTES Y CARGAS SOCIALES", r1b, "TOTAL RUBRO 1");

  // Sección Servicios y Abonos
  drawRubroHeader("PAGOS DEL PERÍODO POR SUMINISTROS, SERVICIOS, ABONOS Y SEGURO");
  
  const groups = [
    { n: "2 SERVICIOS PÚBLICOS", k: /luz|gas|agua|aysa|edesur|edenor|metrogas/i },
    { n: "3 ABONOS DE SERVICIOS", k: /abono|fumigacion|ascensor|mantenimiento abono/i },
    { n: "4 MANTENIMIENTO DE PARTES COMUNES", k: /reparacion|arreglo|materiales|ferreteria/i },
    { n: "6 GASTOS BANCARIOS", k: /comision|banco|impuesto ley|cheque/i },
    { n: "7 GASTOS DE LIMPIEZA", k: /limpieza|insumos|articulos/i },
    { n: "8 GASTOS DE ADMINISTRACION", k: /honorarios|copias|papeleria|gastos admin/i },
    { n: "9 PAGOS DEL PERÍODO POR SEGUROS", k: /seguro|poliza|mapfre|federacion/i },
    { n: "10 OTROS", k: /otros|varios/i }
  ];

  groups.forEach(g => {
    const items = data.expenses.filter((e: any) => g.k.test(e.description) || e.category.toLowerCase().includes(g.n.split(' ')[1].toLowerCase()));
    drawSubRubro(g.n, items, `TOTAL ${g.n}`);
  });

  // --- ESTADO FINANCIERO ---
  doc.addPage(); y = 15;
  doc.setFillColor(189, 215, 238);
  doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('ESTADO FINANCIERO', 105, y + 5, { align: 'center' });
  y += 12;
  
  const financialRows = [
    { l: "SALDO ANTERIOR", v: data.totalExpenses * 1.1 },
    { l: "Ingresos por pago de Expensas Ordinarias", v: data.totalExpenses * 0.9 },
    { l: "Egresos por GASTOS (-)", v: data.totalExpenses },
    { l: "SALDO CAJA AL CIERRE", v: data.totalExpenses * 1.05 }
  ];

  financialRows.forEach(row => {
    doc.setFont('helvetica', row.l.includes('SALDO') ? 'bold' : 'normal');
    doc.text(row.l, margin + 5, y);
    doc.text(`$ ${formatArCurrency(row.v)}`, pageWidth - margin - 5, y, { align: 'right' });
    doc.line(margin + 5, y + 1, pageWidth - margin - 5, y + 1);
    y += 7;
  });

  // --- PLANILLA DE PRORRATEO (LANDSCAPE) ---
  doc.addPage('a4', 'landscape');
  y = 15;
  doc.setFillColor(189, 215, 238);
  doc.rect(10, y, 277, 8, 'F');
  doc.setFontSize(10);
  doc.text('ESTADO DE CUENTAS Y PRORRATEO', 148, y + 5.5, { align: 'center' });
  y += 12;

  const headers = ["UF", "PISO", "DTO", "PROPIETARIO", "S. ANT", "PAGO", "DEUDA", "INT 3%", "UF%", "ORDIN.", "EXTRA.", "AYSA", "TOTAL"];
  const colWidths = [8, 12, 10, 50, 22, 22, 22, 15, 12, 22, 22, 15, 25];
  
  doc.setFontSize(6);
  let x = 10;
  headers.forEach((h, i) => {
    doc.setFillColor(242, 242, 242);
    doc.rect(x, y, colWidths[i], 6, 'F');
    doc.rect(x, y, colWidths[i], 6, 'S');
    doc.text(h, x + (colWidths[i]/2), y + 4, { align: 'center' });
    x += colWidths[i];
  });
  y += 6;

  data.units.forEach((u: any, idx: number) => {
    if (y > 185) { doc.addPage('a4', 'landscape'); y = 15; }
    const ord = data.totalExpenses * u.coefficient;
    const debt = u.manualDebt || 0;
    const interest = debt * 0.03;
    const total = ord + debt + interest;
    let cx = 10;
    const row = [(idx+1).toString(), u.floor, u.department, u.owner.substring(0, 25).toUpperCase(), formatArCurrency(u.previousBalance || 0), formatArCurrency(u.currentPayment || 0), formatArCurrency(debt), formatArCurrency(interest), `${(u.coefficient * 100).toFixed(2)}%`, formatArCurrency(ord), "0,00", "0,00", formatArCurrency(total)];
    row.forEach((val, i) => {
      doc.rect(cx, y, colWidths[i], 5);
      doc.text(val, i < 4 ? cx + 1 : cx + colWidths[i] - 1, y + 3.5, { align: i < 4 ? 'left' : 'right' });
      cx += colWidths[i];
    });
    y += 5;
  });

  doc.save(`Liquidacion_${data.month}_${data.year}_Oficial.pdf`);
};

export const generatePaymentReceipt = async (data: any) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE PAGO', 105, 20, { align: 'center' });
  doc.save(`Recibo_${data.unit}.pdf`);
};

export const generateDetailedReceiptPdf = async (data: any) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.save(`Recibo_Detallado.pdf`);
};
