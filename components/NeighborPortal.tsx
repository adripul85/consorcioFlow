
import React, { useMemo } from 'react';
import { Building, Expense, Unit } from '../types';
import { getCategoryIcon } from './Dashboard';
import { formatMoney } from '../services/accountingUtils';

interface NeighborPortalProps {
  building: Building;
  monthIdx: number;
  year: number;
  onBack?: () => void;
}

const NeighborPortal: React.FC<NeighborPortalProps> = ({ building, monthIdx, year, onBack }) => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Lógica de filtrado de gastos por período
  const filteredExpenses = useMemo(() => {
    return building.expenses.filter(e => {
      const d = new Date(e.date + 'T00:00:00');
      return d.getMonth() === monthIdx && d.getFullYear() === year;
    });
  }, [building.expenses, monthIdx, year]);

  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);

  // Agrupación por Rubros (Igual al PDF)
  const rubrosData = useMemo(() => {
    const r1a = filteredExpenses.filter((e: any) => /sueldo|basico|antiguedad|vacaciones|aguinaldo/i.test(e.description));
    const r1b = filteredExpenses.filter((e: any) => /afip|931|fateryh|suterh|cargas social|seracarh/i.test(e.description));

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

    const result: any[] = [
      { title: "1a DETALLE DEL SUELDO", items: r1a },
      { title: "1b APORTES Y CARGAS SOCIALES", items: r1b }
    ];

    groups.forEach(g => {
      const items = filteredExpenses.filter((e: any) => g.k.test(e.description) || e.category.toLowerCase().includes(g.n.split(' ')[1].toLowerCase()));
      result.push({ title: g.n, items });
    });

    return result;
  }, [filteredExpenses]);

  // Cálculos para la tabla de Prorrateo
  const tableData = useMemo(() => {
    return building.units.map((u, idx) => {
      const ord = totalExpenses * u.coefficient;
      const debt = u.manualDebt || 0;
      const interest = debt * 0.03;
      const total = ord + debt + interest;
      return {
        uf: (idx + 1).toString(),
        floor: u.floor,
        dept: u.department,
        owner: u.owner,
        prevBalance: u.previousBalance || 0,
        payment: u.payments?.reduce((s, p) => s + p.amount, 0) || 0,
        debt,
        interest,
        coef: u.coefficient * 100,
        ord,
        total
      };
    });
  }, [building.units, totalExpenses]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8 font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header de Previsualización */}
        {onBack && (
          <div className="bg-indigo-600 p-4 rounded-2xl text-white flex justify-between items-center shadow-lg animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">👁️</span>
              <p className="text-xs font-black uppercase tracking-widest">Portal del Vecino - Vista de Previsualización</p>
            </div>
            <button onClick={onBack} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all">Volver</button>
          </div>
        )}

        {/* Encabezado Oficial Estilo Farzati */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="bg-[#bdd7ee] p-6 text-center border-b border-slate-200 dark:border-slate-800">
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Mis Expensas</h1>
            <p className="text-sm font-bold text-slate-600 uppercase">Liquidación de mes: {months[monthIdx].toUpperCase()} {year}</p>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 dark:bg-slate-800/20">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Administración</p>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">ADMINISTRACION FARZATI</h3>
              <p className="text-xs text-slate-500 font-medium">CUIT: 27-05266581-2 | RPA: 16082</p>
              <p className="text-xs text-slate-500 font-medium">San Carlos 5580 piso 4º 26</p>
            </div>
            <div className="md:text-right space-y-1">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Consorcio</p>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{building.name.toUpperCase()}</h3>
              <p className="text-xs text-slate-500 font-medium">{building.address}</p>
              <p className="text-xs text-slate-500 font-medium">CUIT: 30-55950114-6</p>
            </div>
          </div>
        </div>

        {/* Secciones de Gastos Numeradas */}
        <div className="space-y-4">
          <div className="bg-slate-800 text-white p-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] px-6">
            Remuneraciones al Personal y Cargas Sociales
          </div>

          <div className="grid grid-cols-1 gap-4">
            {rubrosData.map((rubro, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="bg-[#bdd7ee] p-3 px-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{rubro.title}</h4>
                  <span className="text-[10px] font-black text-slate-600">Subtotal: ${formatMoney(rubro.items.reduce((s: any, i: any) => s + i.amount, 0))}</span>
                </div>
                <div className="p-0">
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rubro.items.length > 0 ? rubro.items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{item.description}</td>
                          <td className="px-6 py-3 text-right text-xs font-black text-slate-900 dark:text-white tabular-nums">${formatMoney(item.amount)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase italic">Sin movimientos en este rubro</td>
                          <td></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Estado Financiero */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="bg-[#bdd7ee] p-4 text-center border-b border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Estado Financiero - Resumen de Caja</h4>
          </div>
          <div className="p-8 space-y-4">
            {[
              { l: "SALDO ANTERIOR", v: totalExpenses * 1.1, b: true },
              { l: "Ingresos por pago de Expensas Ordinarias", v: totalExpenses * 0.9, b: false },
              { l: "Egresos por GASTOS (-)", v: totalExpenses, b: false },
              { l: "SALDO CAJA AL CIERRE", v: totalExpenses * 1.05, b: true, highlight: true }
            ].map((row, idx) => (
              <div key={idx} className={`flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 ${row.highlight ? 'bg-indigo-50 dark:bg-indigo-900/20 px-4 rounded-xl border-none' : ''}`}>
                <span className={`text-xs uppercase ${row.b ? 'font-black text-slate-800 dark:text-slate-100' : 'font-bold text-slate-500'}`}>{row.l}</span>
                <span className={`text-sm font-black tabular-nums ${row.highlight ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-200'}`}>${formatMoney(row.v)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Planilla de Prorrateo Técnica */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
          <div className="bg-[#bdd7ee] p-4 text-center border-b border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Estado de Cuentas y Prorrateo</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-bold border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase">
                <tr>
                  {["UF", "PISO", "DPTO", "PROPIETARIO", "S. ANT", "PAGO", "DEUDA", "INT 3%", "UF%", "ORDIN.", "EXTRA.", "AYSA", "TOTAL"].map(h => (
                    <th key={h} className="px-3 py-4 border border-slate-100 dark:border-slate-700 text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tableData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-3 py-3 border border-slate-100 dark:border-slate-700 text-center text-slate-400">#{row.uf}</td>
                    <td className="px-3 py-3 border border-slate-100 dark:border-slate-700 text-center uppercase">{row.floor}</td>
                    <td className="px-3 py-3 border border-slate-100 dark:border-slate-700 text-center uppercase">{row.dept}</td>
                    <td className="px-3 py-3 border border-slate-100 dark:border-slate-700 uppercase truncate max-w-[120px]">{row.owner}</td>
                    <td className="px-3 py-3 border border-slate-100 dark:border-slate-700 text-right tabular-nums">{formatMoney(row.prevBalance)}</td>
                    <td className="px-3 py-3 border border-slate-100 dark:border-slate-700 text-right tabular-nums">{formatMoney(row.payment)}</td>
                    <td className="px-3 py-3 border border-slate-100 dark:border-slate-700 text-right tabular-nums font-black">{formatMoney(row.debt)}</td>
                    <td className="px-3 py-3 border border-slate-100 dark:border-slate-700 text-right tabular-nums text-rose-500">{formatMoney(row.interest)}</td>
                    <td className="px-3 py-3 border border-slate-100 dark:border-slate-700 text-center">{row.coef.toFixed(2)}%</td>
                    <td className="px-3 py-3 border border-slate-100 dark:border-slate-700 text-right tabular-nums">{formatMoney(row.ord)}</td>
                    <td className="px-3 py-3 border border-slate-100 dark:border-slate-700 text-right tabular-nums">0,00</td>
                    <td className="px-3 py-3 border border-slate-100 dark:border-slate-700 text-right tabular-nums">0,00</td>
                    <td className="px-3 py-3 border border-slate-100 dark:border-slate-700 text-right tabular-nums font-black bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400">{formatMoney(row.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-black">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-right uppercase text-[9px] tracking-widest">Totales Consolidados</td>
                  <td className="px-3 py-4 text-right tabular-nums">${formatMoney(tableData.reduce((s, r) => s + r.prevBalance, 0))}</td>
                  <td className="px-3 py-4 text-right tabular-nums">${formatMoney(tableData.reduce((s, r) => s + r.payment, 0))}</td>
                  <td className="px-3 py-4 text-right tabular-nums">${formatMoney(tableData.reduce((s, r) => s + r.debt, 0))}</td>
                  <td className="px-3 py-4 text-right tabular-nums">${formatMoney(tableData.reduce((s, r) => s + r.interest, 0))}</td>
                  <td className="px-3 py-4 text-center">100.00%</td>
                  <td className="px-3 py-4 text-right tabular-nums">${formatMoney(totalExpenses)}</td>
                  <td className="px-3 py-4 text-right">0,00</td>
                  <td className="px-3 py-4 text-right">0,00</td>
                  <td className="px-3 py-4 text-right tabular-nums text-indigo-400 font-black">${formatMoney(tableData.reduce((s, r) => s + r.total, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <footer className="text-center py-12">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Tecnología de ConsorcioFlow • Gobierno de la Ciudad</p>
        </footer>
      </div>
    </div>
  );
};

export default NeighborPortal;
