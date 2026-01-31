
import React, { useState, useMemo } from 'react';
import { Unit, UnitPayment } from '../types';
import { getIncomeAnalysis } from '../services/geminiService';
import { generatePaymentReceipt } from '../services/pdfService';
import { formatMoney, handleAccountingInput, parseAccountingValue } from './Dashboard';

interface IncomeManagerProps {
  units: Unit[];
  onUpdateUnit: (unit: Unit) => void;
  buildingName: string;
  buildingAddress: string;
}

const IncomeManager: React.FC<IncomeManagerProps> = ({ units, onUpdateUnit, buildingName, buildingAddress }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [originalUnitId, setOriginalUnitId] = useState<string | null>(null);
  
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [amount, setAmount] = useState('0.00');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterText, setFilterText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState<string | null>(null);

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const allPayments = useMemo(() => {
    const payments: (UnitPayment & { unitId: string; floor: string; department: string; owner: string })[] = [];
    units.forEach(unit => {
      (unit.payments || []).forEach(p => {
        payments.push({ 
          ...p, 
          unitId: unit.id, 
          floor: unit.floor, 
          department: unit.department, 
          owner: unit.owner 
        });
      });
    });
    return payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [units]);

  const stats = useMemo(() => {
    const total = allPayments.reduce((sum, p) => sum + p.amount, 0);
    
    // Comparativa Mensual
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    
    const prevDate = new Date(curYear, curMonth - 1, 1);
    const prevMonth = prevDate.getMonth();
    const prevYear = prevDate.getFullYear();

    const currentMonthTotal = allPayments
      .filter(p => {
        const d = new Date(p.date + 'T00:00:00');
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    const prevMonthTotal = allPayments
      .filter(p => {
        const d = new Date(p.date + 'T00:00:00');
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    const diff = currentMonthTotal - prevMonthTotal;
    const percentChange = prevMonthTotal > 0 ? (diff / prevMonthTotal) * 100 : (currentMonthTotal > 0 ? 100 : 0);

    return { 
      total, 
      count: allPayments.length,
      currentMonthTotal,
      prevMonthTotal,
      percentChange,
      diff,
      curMonthName: months[curMonth],
      prevMonthName: months[prevMonth]
    };
  }, [allPayments]);

  const resetForm = () => {
    setIsAdding(false);
    setEditingPaymentId(null);
    setOriginalUnitId(null);
    setSelectedUnitId('');
    setAmount('0.00');
    setDate(new Date().toISOString().split('T')[0]);
    setError(null);
  };

  const handleEditClick = (payment: any) => {
    setEditingPaymentId(payment.id);
    setOriginalUnitId(payment.unitId);
    setSelectedUnitId(payment.unitId);
    setAmount(formatMoney(payment.amount));
    setDate(payment.date);
    setIsAdding(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const numAmount = parseAccountingValue(amount);
    if (!selectedUnitId || numAmount <= 0) { 
      setError('Error: El monto debe ser positivo y debe seleccionar una unidad.'); 
      return; 
    }

    const unit = units.find(u => u.id === selectedUnitId);
    if (!unit) return;

    if (editingPaymentId && originalUnitId) {
      if (originalUnitId === selectedUnitId) {
        onUpdateUnit({
          ...unit,
          payments: (unit.payments || []).map(p => 
            p.id === editingPaymentId ? { ...p, amount: numAmount, date } : p
          )
        });
      } else {
        const oldUnit = units.find(u => u.id === originalUnitId);
        if (oldUnit) {
          onUpdateUnit({ 
            ...oldUnit, 
            payments: (oldUnit.payments || []).filter(p => p.id !== editingPaymentId) 
          });
        }
        onUpdateUnit({ 
          ...unit, 
          payments: [...(unit.payments || []), { id: editingPaymentId, amount: numAmount, date }] 
        });
      }
    } else {
      const newPayment = { 
        id: Math.random().toString(36).substr(2, 9), 
        amount: numAmount, 
        date 
      };
      onUpdateUnit({ ...unit, payments: [...(unit.payments || []), newPayment] });
    }
    resetForm();
  };

  const handleDeletePayment = (unitId: string, paymentId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro de ingreso?')) return;
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;
    onUpdateUnit({ ...unit, payments: (unit.payments || []).filter(p => p.id !== paymentId) });
  };

  const handleDownloadPdf = async (payment: any) => {
    setIsPdfLoading(payment.id);
    try {
      await generatePaymentReceipt({
        buildingName, 
        buildingAddress, 
        paymentId: payment.id,
        date: payment.date.split('-').reverse().join('/'),
        amount: payment.amount, 
        owner: payment.owner, 
        unit: `${payment.floor}${payment.department}`
      });
    } catch { 
      alert("Error al generar PDF."); 
    }
    setIsPdfLoading(null);
  };

  const filteredPayments = useMemo(() => {
    return allPayments.filter(p => 
      p.owner.toLowerCase().includes(filterText.toLowerCase()) || 
      `${p.floor}${p.department}`.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [allPayments, filterText]);

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header Consolidated Balance */}
      <div className="bg-slate-900 rounded-[2rem] p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
           <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
          <div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2 block">Recaudación Histórica</span>
            <h3 className="text-6xl font-black tabular-nums">${formatMoney(stats.total)}</h3>
            <div className="flex items-center gap-2 mt-2 text-slate-400 font-bold text-sm">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               {stats.count} ingresos totales procesados
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 text-right">
             <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Último Movimiento</p>
             <p className="text-lg font-bold">{allPayments[0]?.date.split('-').reverse().join('/') || '--/--/----'}</p>
          </div>
        </div>
      </div>

      {/* Comparison Monthly Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:border-indigo-100 group">
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Este Mes ({stats.curMonthName})</p>
          <div className="flex items-end justify-between">
            <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 tabular-nums">${formatMoney(stats.currentMonthTotal)}</h4>
            <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${stats.diff >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30'}`}>
              {stats.diff >= 0 ? '▲' : '▼'} {Math.abs(stats.percentChange).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:border-indigo-100 group">
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Mes Anterior ({stats.prevMonthName})</p>
          <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 tabular-nums">${formatMoney(stats.prevMonthTotal)}</h4>
          <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase">Cierre de período anterior</p>
        </div>

        <div className="bg-indigo-600 p-6 rounded-3xl shadow-xl shadow-indigo-100 dark:shadow-none flex flex-col justify-center">
          <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Variación de Caja</p>
          <h4 className="text-2xl font-black text-white tabular-nums">
            {stats.diff >= 0 ? '+' : '-'}${formatMoney(Math.abs(stats.diff))}
          </h4>
          <p className="text-[9px] text-indigo-300 mt-2 font-bold uppercase">Delta de recaudación mensual</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex-1">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-3">
              <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
              Libro de Ingresos
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">Bitácora oficial de cobros realizados a copropietarios</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
               <input 
                  type="text" 
                  placeholder="Buscar por UF o titular..." 
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
               />
               <svg className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            
            <button 
              onClick={() => { if (isAdding) resetForm(); else setIsAdding(true); }} 
              className={`${isAdding ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300' : 'bg-emerald-600 text-white shadow-xl shadow-emerald-100 dark:shadow-none hover:bg-emerald-700'} px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95`}
            >
              {isAdding ? 'Cerrar Registro' : '+ Registrar Cobro'}
            </button>
          </div>
        </div>

        {isAdding && (
          <div className="p-10 bg-emerald-50/30 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900 animate-in slide-in-from-top-4">
             <div className="mb-6 flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">💰</div>
               <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest">
                 {editingPaymentId ? 'Edición de Cobro Existente' : 'Alta de Nuevo Ingreso a Caja'}
               </h4>
             </div>
             {error && <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-bold rounded-xl animate-bounce-short border-l-4 border-red-500">{error}</div>}
             <form onSubmit={handleSavePayment} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidad Funcional</label>
                  <select 
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer" 
                    value={selectedUnitId} 
                    onChange={e => setSelectedUnitId(e.target.value)} 
                    required
                  >
                    <option value="">Seleccionar Unidad...</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.floor}{u.department} - {u.owner}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Importe Cobrado ($)</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-emerald-100 dark:border-emerald-900/40 bg-white dark:bg-slate-800 font-black text-sm text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-right tabular-nums" 
                    placeholder="0.00" 
                    value={amount} 
                    onChange={e => setAmount(handleAccountingInput(e.target.value))} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Recibo</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    required 
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95">
                    {editingPaymentId ? 'Actualizar' : 'Guardar'}
                  </button>
                  {editingPaymentId && (
                    <button type="button" onClick={resetForm} className="px-4 py-4 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-black text-[10px] uppercase hover:bg-slate-300 transition-colors">
                      Cancelar
                    </button>
                  )}
                </div>
             </form>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100/50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-8 py-6 w-48">Fecha de Cobro</th>
                <th className="px-8 py-6 w-32">Unidad</th>
                <th className="px-8 py-6">Titular Responsable</th>
                <th className="px-8 py-6 text-right w-56">Monto Percibido</th>
                <th className="px-8 py-6 text-right w-44">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPayments.map((p, idx) => (
                <tr 
                  key={p.id} 
                  className={`group transition-all ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-800/20'} hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10`}
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <span className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors">📅</span>
                       <span className="text-sm font-black text-slate-700 dark:text-slate-200 tabular-nums">
                        {p.date.split('-').reverse().join('/')}
                       </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="bg-slate-900 dark:bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-black text-[11px] uppercase shadow-sm">
                      {p.floor}{p.department}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                       <span className="text-slate-700 dark:text-slate-200 font-bold">{p.owner}</span>
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Liquidación Provisoria</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="inline-flex flex-col items-end">
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-xl tabular-nums leading-none">
                        ${formatMoney(p.amount)}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-500/50 uppercase mt-1">Ingreso Confirmado</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <button 
                        onClick={() => handleDownloadPdf(p)} 
                        className="bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 p-2.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-indigo-100 transition-all"
                        title="Generar Recibo PDF"
                      >
                        {isPdfLoading === p.id ? (
                           <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : '📄'}
                      </button>
                      <button 
                        onClick={() => handleEditClick(p)} 
                        className="bg-white dark:bg-slate-800 text-slate-400 hover:text-amber-600 p-2.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-amber-100 transition-all"
                        title="Corregir Registro"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button 
                        onClick={() => handleDeletePayment(p.unitId, p.id)} 
                        className="bg-white dark:bg-slate-800 text-slate-400 hover:text-red-600 p-2.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-red-100 transition-all"
                        title="Eliminar Cobro"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center text-slate-300 dark:text-slate-700">
                    <div className="flex flex-col items-center gap-4 opacity-40 grayscale">
                       <div className="text-6xl">🗂️</div>
                       <p className="font-black text-xs uppercase tracking-widest">No se encontraron movimientos</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IncomeManager;
