import React, { useState, useMemo } from 'react';
import { Building, Expense, Unit } from '../types';
import { formatMoney } from '../services/accountingUtils';
import { generateDetailedReceiptPdf } from '../services/pdfService';

interface ReceiptManagerProps {
  building: Building;
}

const ReceiptManager: React.FC<ReceiptManagerProps> = ({ building }) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const periodData = useMemo(() => {
    const expensesInPeriod = building.expenses.filter(e => {
      const d = new Date(e.date + 'T00:00:00');
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    const ord = expensesInPeriod
      .filter(e => !e.category.toLowerCase().includes('extraordinaria'))
      .reduce((s, e) => s + e.amount, 0);

    const ext = expensesInPeriod
      .filter(e => e.category.toLowerCase().includes('extraordinaria'))
      .reduce((s, e) => s + e.amount, 0);

    const aysa = expensesInPeriod
      .filter(e => e.category.toLowerCase().includes('aysa') || e.category.toLowerCase().includes('agua'))
      .reduce((s, e) => s + e.amount, 0);

    return { ord, ext, aysa, total: ord + ext };
  }, [building.expenses, selectedMonth, selectedYear]);

  const handleGeneratePdf = (unit: Unit, index: number) => {
    const ordPart = periodData.ord * unit.coefficient;
    const extPart = periodData.ext * unit.coefficient;
    const aysaPart = periodData.aysa * unit.coefficient;

    // Simulación de deuda (esto se conectaría con la base de pagos real)
    const deuda = 0;
    const intereses = deuda > 0 ? deuda * 0.03 : 0;

    generateDetailedReceiptPdf({
      buildingName: building.name,
      buildingAddress: building.address,
      buildingCuit: '30-55950114-6', // CUIT del consorcio (del modelo)
      adminName: 'Administración Farzati',
      adminAddress: 'San Carlos 5580 piso 4º "26"',
      adminCuit: '27-05266581-2',
      adminRpa: '16082',
      receiptNumber: (367 + index).toString().padStart(5, '0'),
      unitId: `${unit.floor} "${unit.department}"`,
      ufNumber: (index + 1).toString(),
      owner: unit.owner,
      period: `${months[selectedMonth].toUpperCase()} ${selectedYear}`,
      items: {
        deuda,
        intereses,
        expensaOrdinaria: ordPart,
        expensaExtraordinaria: extPart,
        aysa: aysaPart
      },
      dueDate1: '20/02/2026', // Fechas calculadas o estáticas según modelo
      dueDate2: '25/02/2026'
    });
  };

  const handleDownloadAll = async () => {
    setIsGeneratingBatch(true);
    let i = 0;
    for (const unit of building.units) {
      handleGeneratePdf(unit, i);
      i++;
      await new Promise(r => setTimeout(r, 600));
    }
    setIsGeneratingBatch(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">🖨️</div>
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Centro de Facturación</h3>
            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(parseInt(e.target.value))}
                className="bg-transparent font-black text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
              >
                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent font-black text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
              >
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDownloadAll}
            disabled={isGeneratingBatch || building.units.length === 0}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {isGeneratingBatch ? 'Generando PDF...' : 'Emitir Todos los Recibos'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
            <tr>
              <th className="px-8 py-5">U.F.</th>
              <th className="px-8 py-5">Piso/Depto</th>
              <th className="px-8 py-5">Copropietario</th>
              <th className="px-8 py-5 text-right">Monto Total</th>
              <th className="px-8 py-5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {building.units.map((unit, index) => {
              const total = periodData.total * unit.coefficient;
              return (
                <tr key={unit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-8 py-6 font-bold text-slate-400">#{index + 1}</td>
                  <td className="px-8 py-6 font-black text-slate-800 dark:text-slate-100">{unit.floor}{unit.department}</td>
                  <td className="px-8 py-6 font-bold text-slate-600 dark:text-slate-400">{unit.owner}</td>
                  <td className="px-8 py-6 text-right tabular-nums text-sm font-black text-indigo-600 dark:text-indigo-400">${formatMoney(total)}</td>
                  <td className="px-8 py-6 text-right">
                    <button
                      onClick={() => handleGeneratePdf(unit, index)}
                      className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"
                    >
                      📄 Ver Recibo
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReceiptManager;
