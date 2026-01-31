
import React, { useMemo } from 'react';
import { Building, Expense, Unit } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatMoney } from './Dashboard';

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

  const filteredExpenses = useMemo(() => {
    return building.expenses.filter(e => {
      const d = new Date(e.date + 'T00:00:00');
      return d.getMonth() === monthIdx && d.getFullYear() === year;
    });
  }, [building, monthIdx, year]);

  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);

  // Recaudación del período actual (pagos realizados en el mes/año seleccionado)
  const currentIncomes = useMemo(() => {
    const list: { unit: string; owner: string; amount: number; date: string }[] = [];
    building.units.forEach(u => {
      (u.payments || []).forEach(p => {
        const d = new Date(p.date + 'T00:00:00');
        if (d.getMonth() === monthIdx && d.getFullYear() === year) {
          list.push({
            unit: `${u.floor}${u.department}`,
            owner: u.owner,
            amount: p.amount,
            date: p.date
          });
        }
      });
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [building, monthIdx, year]);

  const totalCurrentIncome = useMemo(() => currentIncomes.reduce((s, i) => s + i.amount, 0), [currentIncomes]);

  // Histórico de ingresos por mes (últimos 6 meses)
  const historicalIncomes = useMemo(() => {
    const data: Record<string, number> = {};
    building.units.forEach(u => {
      (u.payments || []).forEach(p => {
        const d = new Date(p.date + 'T00:00:00');
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        data[key] = (data[key] || 0) + p.amount;
      });
    });

    const result = [];
    const now = new Date(year, monthIdx);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      result.push({
        name: months[d.getMonth()].substring(0, 3),
        total: data[key] || 0
      });
    }
    return result;
  }, [building, monthIdx, year]);

  const maintenanceExpenses = filteredExpenses.filter(e => e.category.toLowerCase().includes('mant'));
  const salaryExpenses = filteredExpenses.filter(e => e.category.toLowerCase().includes('suel'));
  
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  }, [filteredExpenses]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        
        {/* Barra de Navegación de Previsualización */}
        {onBack && (
          <div className="bg-indigo-600 p-4 rounded-2xl text-white flex justify-between items-center shadow-lg animate-in slide-in-from-top-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">👁️</span>
              <p className="text-xs font-black uppercase tracking-widest">Modo Previsualización Admin</p>
            </div>
            <button 
              onClick={onBack}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all"
            >
              Volver al Panel
            </button>
          </div>
        )}

        {/* Cabecera Pública */}
        <header className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100">Transparencia Online</h1>
          <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">ConsorcioFlow • Portal del Vecino</p>
          
          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">{building.name}</h2>
            <p className="text-sm text-slate-400 font-medium">{building.address}</p>
            <div className="mt-4 inline-block px-6 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-black text-xs uppercase">
              Período: {months[monthIdx]} {year}
            </div>
          </div>
        </header>

        {/* Resumen Financiero: Gastos vs Ingresos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-indigo-600 text-white p-8 rounded-[2rem] shadow-xl flex flex-col justify-center">
            <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-2">Total de Gastos del Mes</p>
            <h3 className="text-5xl font-black tabular-nums">${formatMoney(totalExpenses)}</h3>
            <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
              <div>
                <p className="text-white/60 text-[8px] font-black uppercase tracking-widest">Recaudado</p>
                <p className="text-xl font-bold text-emerald-400">${formatMoney(totalCurrentIncome)}</p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-[8px] font-black uppercase tracking-widest">Déficit/Superávit</p>
                <p className={`text-xl font-bold ${totalCurrentIncome >= totalExpenses ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${formatMoney(totalCurrentIncome - totalExpenses)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-800">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Distribución de Gastos</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '15px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }}
                    formatter={(val: number) => `$${formatMoney(val)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Ingresos del Período y Evolución Histórica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-900 flex items-center gap-3">
               <span className="text-xl">💰</span>
               <h4 className="font-black text-indigo-900 dark:text-indigo-400 uppercase text-xs tracking-widest">Ingresos Recientes</h4>
            </div>
            <div className="p-4 flex-1">
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {currentIncomes.length > 0 ? (
                  currentIncomes.map((inc, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] font-black text-indigo-500 uppercase">{inc.unit}</span>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate w-32">{inc.owner}</p>
                      </div>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">${formatMoney(inc.amount)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-12 text-slate-400 italic text-xs">Aún no se registran cobros en este mes.</p>
                )}
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
               <span className="text-xl">📈</span>
               <h4 className="font-black text-slate-500 uppercase text-xs tracking-widest">Histórico de Recaudación</h4>
            </div>
            <div className="p-6 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historicalIncomes}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '15px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }}
                    formatter={(val: number) => `$${formatMoney(val)}`}
                  />
                  <Bar dataKey="total" fill="#4f46e5" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Últimos 6 meses</p>
            </div>
          </section>
        </div>

        {/* Detalle de Gastos Específicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900 flex items-center gap-3">
               <span className="text-xl">🛠️</span>
               <h4 className="font-black text-amber-900 dark:text-amber-400 uppercase text-xs tracking-widest">Mantenimiento y Arreglos</h4>
            </div>
            <div className="p-4">
              {maintenanceExpenses.length > 0 ? (
                <div className="space-y-3">
                  {maintenanceExpenses.map(e => (
                    <div key={e.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{e.description}</span>
                      <span className="font-black text-slate-900 dark:text-slate-100 tabular-nums">${formatMoney(e.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-slate-400 italic text-sm">No se registraron gastos de mantenimiento.</p>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900 flex items-center gap-3">
               <span className="text-xl">👥</span>
               <h4 className="font-black text-emerald-900 dark:text-emerald-400 uppercase text-xs tracking-widest">Sueldos y Cargas Sociales</h4>
            </div>
            <div className="p-4">
              {salaryExpenses.length > 0 ? (
                <div className="space-y-3">
                  {salaryExpenses.map(e => (
                    <div key={e.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{e.description}</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">${formatMoney(e.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-slate-400 italic text-sm">No hay registros de sueldos.</p>
              )}
            </div>
          </section>
        </div>

        <footer className="text-center py-12">
          <p className="text-slate-400 text-xs font-medium">Este reporte es provisorio y sujeto a revisión por la administración.</p>
          <p className="text-indigo-400 font-black text-[9px] uppercase tracking-[0.3em] mt-2">Tecnología de ConsorcioFlow</p>
        </footer>
      </div>
    </div>
  );
};

export default NeighborPortal;
