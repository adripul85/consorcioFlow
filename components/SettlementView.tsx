
import React, { useState, useMemo } from 'react';
import { Unit, Expense, Liquidation } from '../types';
import { getSmartAnalysis, getSettlementNotice } from '../services/geminiService';
import { generateSettlementPdf } from '../services/pdfService';
import { formatMoney } from './Dashboard';

interface SettlementViewProps {
  buildingId: string;
  units: Unit[];
  expenses: Expense[];
  liquidations: Liquidation[];
  buildingName: string;
  buildingAddress: string;
  onPreviewPortal: (month: number, year: number) => void;
  onAddLiquidation: (liq: Liquidation) => void;
}

type Tab = 'live' | 'history';

const SettlementView: React.FC<SettlementViewProps> = ({ 
  buildingId, units, expenses, liquidations, buildingName, buildingAddress, onPreviewPortal, onAddLiquidation 
}) => {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<Tab>('live');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isClosingMonth, setIsClosingMonth] = useState(false);

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const range = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      range.push(i);
    }
    return range;
  }, []);

  // Gastos filtrados por el período seleccionado
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const expDate = new Date(expense.date + 'T00:00:00');
      return expDate.getMonth() === selectedMonth && expDate.getFullYear() === selectedYear;
    });
  }, [expenses, selectedMonth, selectedYear]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Recaudación en vivo para el período seleccionado
  const periodCollection = useMemo(() => {
    let total = 0;
    units.forEach(u => {
      (u.payments || []).forEach(p => {
        const pDate = new Date(p.date + 'T00:00:00');
        if (pDate.getMonth() === selectedMonth && pDate.getFullYear() === selectedYear) {
          total += p.amount;
        }
      });
    });
    return total;
  }, [units, selectedMonth, selectedYear]);

  const collectionRate = totalExpenses > 0 ? (periodCollection / totalExpenses) * 100 : 0;
  const financialBalance = periodCollection - totalExpenses;
  const totalCoefficient = units.reduce((sum, u) => sum + u.coefficient, 0);

  const handleDownloadPdf = async () => {
    if (filteredExpenses.length === 0) {
      alert("No hay gastos registrados en este período para generar el PDF.");
      return;
    }
    
    setIsPdfLoading(true);
    try {
      await generateSettlementPdf({
        buildingId,
        buildingName,
        buildingAddress,
        month: months[selectedMonth],
        monthIdx: selectedMonth,
        year: selectedYear,
        totalExpenses,
        expenses: filteredExpenses,
        units
      });
    } catch (error) {
      console.error(error);
      alert("Error al generar el archivo PDF.");
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleCloseMonth = () => {
    if (totalExpenses === 0) {
      alert("No se puede cerrar un mes sin gastos.");
      return;
    }
    if (!window.confirm(`¿Seguro que deseas cerrar la liquidación de ${months[selectedMonth]} ${selectedYear}? Se archivará una copia permanente.`)) return;

    setIsClosingMonth(true);
    
    const unitsData = units.map(u => {
      const amountDue = totalExpenses * u.coefficient;
      const paidThisMonth = (u.payments || []).reduce((acc, p) => {
        const pDate = new Date(p.date + 'T00:00:00');
        return (pDate.getMonth() === selectedMonth && pDate.getFullYear() === selectedYear) ? acc + p.amount : acc;
      }, 0);
      
      let status: 'paid' | 'partial' | 'pending' = 'pending';
      if (paidThisMonth >= amountDue) status = 'paid';
      else if (paidThisMonth > 0) status = 'partial';

      return {
        unitId: u.id,
        amount: amountDue,
        owner: u.owner,
        pisoDepto: `${u.floor}${u.department}`,
        paidStatus: status
      };
    });

    const newLiq: Liquidation = {
      id: Math.random().toString(36).substr(2, 9),
      period: `${months[selectedMonth]} ${selectedYear}`,
      monthIdx: selectedMonth,
      year: selectedYear,
      totalExpenses,
      dateGenerated: new Date().toISOString(),
      unitsData
    };

    onAddLiquidation(newLiq);
    setIsClosingMonth(false);
    setActiveTab('history');
    alert(`Liquidación de ${newLiq.period} archivada correctamente.`);
  };

  const handleGenerateAiSummary = async () => {
    setIsAiLoading(true);
    setAiAnalysis(null);
    setAiNotice(null);
    try {
      const result = await getSmartAnalysis(filteredExpenses, units);
      setAiAnalysis(result || "No se pudo generar el análisis.");
    } catch (error) {
      setAiAnalysis("Error al conectar con la IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGenerateNotice = async () => {
    setIsAiLoading(true);
    setAiNotice(null);
    setAiAnalysis(null);
    try {
      const result = await getSettlementNotice(
        months[selectedMonth], 
        selectedYear, 
        totalExpenses, 
        [...filteredExpenses].sort((a,b) => b.amount - a.amount)
      );
      setAiNotice(result || "No se pudo generar el aviso.");
    } catch (error) {
      setAiNotice("Error al conectar con la IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Tabs Navigation */}
      <div className="flex gap-8 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('live')}
          className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${
            activeTab === 'live' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Liquidación en Vivo
          {activeTab === 'live' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${
            activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Historial de Cierres ({liquidations.length})
          {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full" />}
        </button>
      </div>

      {activeTab === 'live' && (
        <>
          {/* Barra de Herramientas y Filtros */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                📅
              </div>
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liquidación del Mes</h4>
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedMonth}
                    onChange={(e) => { setSelectedMonth(parseInt(e.target.value)); setAiAnalysis(null); setAiNotice(null); }}
                    className="bg-transparent font-black text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                  >
                    {months.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                  <select 
                    value={selectedYear}
                    onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setAiAnalysis(null); setAiNotice(null); }}
                    className="bg-transparent font-black text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => onPreviewPortal(selectedMonth, selectedYear)}
                className="px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition-all"
              >
                Vista Vecino
              </button>
              <button 
                onClick={handleDownloadPdf}
                disabled={isPdfLoading || filteredExpenses.length === 0}
                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
              >
                {isPdfLoading ? 'Generando...' : '📄 Exportar PDF'}
              </button>
              <button 
                onClick={handleCloseMonth}
                disabled={isClosingMonth || totalExpenses === 0}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                {isClosingMonth ? 'Cerrando...' : '🔒 Cerrar y Archivar'}
              </button>
              <button 
                onClick={handleGenerateAiSummary}
                className="w-12 h-12 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"
                title="Analizar con IA"
              >
                ✨
              </button>
            </div>
          </div>

          {/* Monitor en Vivo - Datos en Tiempo Real */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Egresos Totales</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100 tabular-nums">${formatMoney(totalExpenses)}</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500 w-full"></div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Ingresos del Mes</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">${formatMoney(periodCollection)}</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min(100, collectionRate)}%` }}></div>
                </div>
                <span className="text-[10px] font-black text-emerald-600">{collectionRate.toFixed(0)}%</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Balance Operativo</p>
              <p className={`text-2xl font-black tabular-nums ${financialBalance >= 0 ? 'text-indigo-600' : 'text-rose-500'}`}>
                {financialBalance >= 0 ? '+' : '-'}${formatMoney(Math.abs(financialBalance))}
              </p>
              <div className={`mt-2 text-[9px] font-black uppercase ${financialBalance >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                {financialBalance >= 0 ? 'Superávit en Caja' : 'Déficit del Período'}
              </div>
            </div>

            <div className={`p-6 rounded-3xl border shadow-sm transition-all duration-500 ${Math.abs(1 - totalCoefficient) < 0.001 ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 animate-pulse-slow'}`}>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Integridad de Coeficientes</p>
              <p className={`text-2xl font-black tabular-nums ${Math.abs(1 - totalCoefficient) < 0.001 ? 'text-slate-800 dark:text-slate-100' : 'text-amber-600'}`}>
                {(totalCoefficient * 100).toFixed(2)}%
              </p>
              <div className="mt-2 text-[9px] font-black uppercase">
                {Math.abs(1 - totalCoefficient) < 0.001 ? '✓ Distribución Correcta' : '⚠ Error en Porcentajes'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Prorrateo UF del Período</h3>
                  <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase animate-pulse">En Vivo</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-8 py-5">Unidad</th>
                        <th className="px-8 py-5 text-center">%</th>
                        <th className="px-8 py-5 text-right">A Liquidar</th>
                        <th className="px-8 py-5 text-center">Estado Pago</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {units.map(u => {
                        const amountDue = totalExpenses * u.coefficient;
                        const paidThisMonth = (u.payments || []).reduce((acc, p) => {
                          const pDate = new Date(p.date + 'T00:00:00');
                          return (pDate.getMonth() === selectedMonth && pDate.getFullYear() === selectedYear) ? acc + p.amount : acc;
                        }, 0);
                        const isFullyPaid = paidThisMonth >= amountDue && amountDue > 0;

                        return (
                          <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-8 py-6">
                              <div className="flex flex-col">
                                <span className="font-black text-slate-800 dark:text-slate-100">{u.floor}{u.department}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{u.owner}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <span className="text-xs font-black text-slate-400">{(u.coefficient * 100).toFixed(2)}%</span>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">${formatMoney(amountDue)}</span>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <div className="flex justify-center">
                                 {amountDue === 0 ? (
                                   <span className="text-slate-200 dark:text-slate-700">-</span>
                                 ) : isFullyPaid ? (
                                   <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase border border-emerald-100 dark:border-emerald-800">Pagado</span>
                                 ) : paidThisMonth > 0 ? (
                                   <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-[9px] font-black uppercase border border-amber-100 dark:border-amber-800">Parcial</span>
                                 ) : (
                                   <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full text-[9px] font-black uppercase border border-slate-200 dark:border-slate-700">Pendiente</span>
                                 )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Detalle de Egresos ({filteredExpenses.length})</h4>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredExpenses.map(exp => (
                    <div key={exp.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 group hover:border-indigo-200 transition-all">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter">{exp.category}</span>
                        <span className={`w-2 h-2 rounded-full ${exp.paid ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">{exp.description}</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white mt-2 tabular-nums">${formatMoney(exp.amount)}</p>
                    </div>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <div className="py-20 text-center opacity-40">
                      <span className="text-4xl mb-4 block">📦</span>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sin gastos este mes</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden group">
                <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Asistente Gemini</h5>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">¿Necesitas un informe detallado o un aviso para los vecinos?</p>
                <button 
                  onClick={handleGenerateNotice}
                  disabled={isAiLoading || totalExpenses === 0}
                  className="mt-6 w-full py-3 bg-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg"
                >
                  Generar Aviso IA
                </button>
              </div>
            </div>
          </div>

          {(aiAnalysis || aiNotice) && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 border-indigo-100 dark:border-indigo-900 shadow-2xl animate-in slide-in-from-bottom-4">
               <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-[0.2em]">Generación IA Completada</h4>
                  <button onClick={() => { setAiAnalysis(null); setAiNotice(null); }} className="text-slate-400 hover:text-red-500 transition-colors">Cerrar</button>
               </div>
               <div className="p-8 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 whitespace-pre-wrap text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                  {aiAnalysis || aiNotice}
               </div>
               <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => { navigator.clipboard.writeText(aiAnalysis || aiNotice || ""); alert("Copiado!"); }} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Copiar Texto</button>
               </div>
            </div>
          )}

          {isAiLoading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
               <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
               <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] animate-pulse">Gemini analizando liquidación...</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
          {liquidations.map((liq) => (
            <div key={liq.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-indigo-200 transition-all">
               <div className="flex justify-between items-start mb-6">
                 <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-2xl text-indigo-600">📜</div>
                 <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full uppercase tracking-widest">ARCHIVADA</span>
               </div>
               <h5 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-1">{liq.period}</h5>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Cerrada el {new Date(liq.dateGenerated).toLocaleDateString()}</p>
               
               <div className="space-y-3 py-4 border-y border-slate-50 dark:border-slate-800 mb-6">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Egresos Totales</span>
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">${formatMoney(liq.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Unidades Incluidas</span>
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">{liq.unitsData.length}</span>
                  </div>
               </div>

               <div className="flex gap-2">
                 <button 
                  onClick={() => onPreviewPortal(liq.monthIdx, liq.year)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest"
                 >
                  Ver Portal
                 </button>
                 <button 
                  onClick={() => generateSettlementPdf({
                    buildingId,
                    buildingName,
                    buildingAddress,
                    month: months[liq.monthIdx],
                    monthIdx: liq.monthIdx,
                    year: liq.year,
                    totalExpenses: liq.totalExpenses,
                    expenses: expenses.filter(e => {
                      const d = new Date(e.date + 'T00:00:00');
                      return d.getMonth() === liq.monthIdx && d.getFullYear() === liq.year;
                    }),
                    units
                  })}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                 >
                  Bajar PDF
                 </button>
               </div>
            </div>
          ))}

          {liquidations.length === 0 && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] opacity-50 grayscale">
               <span className="text-6xl mb-6">🗂️</span>
               <p className="text-xs font-black uppercase tracking-widest text-slate-400">Historial de liquidaciones vacío</p>
               <p className="text-[10px] font-bold text-slate-400 mt-2 italic">Los cierres mensuales aparecerán aquí una vez generados.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SettlementView;
