
import React, { useState, useMemo } from 'react';
import { Unit, Expense } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface DashboardProps {
  units: Unit[];
  expenses: Expense[];
}

export const formatMoney = (amount: number) => {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Toma un string (input crudo) y lo convierte al formato 0,000.00 en vivo
 */
export const handleAccountingInput = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "0.00";
  const cents = parseInt(digits);
  return (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Convierte el string formateado (con comas) de vuelta a un número puro
 */
export const parseAccountingValue = (formattedValue: string): number => {
  return parseFloat(formattedValue.replace(/,/g, '')) || 0;
};

export const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('sueldo') || cat.includes('haberes') || cat.includes('jornal')) return '👥';
  if (cat.includes('cargas social') || cat.includes('afip') || cat.includes('suterh')) return '📜';
  if (cat.includes('luz') || cat.includes('elec') || cat.includes('edenor') || cat.includes('edesur') || cat.includes('servicios públicos')) return '💡';
  if (cat.includes('agua') || cat.includes('aysa')) return '🚰';
  if (cat.includes('gas') || cat.includes('metrogas')) return '🔥';
  if (cat.includes('ascensor') || cat.includes('elevador')) return '🛗';
  if (cat.includes('mant') || cat.includes('abono')) return '🛠️';
  if (cat.includes('limp') || cat.includes('insumo')) return '🧹';
  if (cat.includes('segur') || cat.includes('vigil') || cat.includes('tótem')) return '🛡️';
  if (cat.includes('adm') || cat.includes('honorario') || cat.includes('gestión')) return '👔';
  if (cat.includes('banc') || cat.includes('comis') || cat.includes('impuesto deb')) return '🏦';
  if (cat.includes('seguro') || cat.includes('póliza') || cat.includes('incendio')) return '📑';
  if (cat.includes('repara') || cat.includes('arregl') || cat.includes('plomer') || cat.includes('gasista')) return '🔧';
  if (cat.includes('jard') || cat.includes('piscina') || cat.includes('pileta')) return '🌿';
  if (cat.includes('reserva') || cat.includes('fondo') || cat.includes('extraordinaria')) return '💰';
  if (cat.includes('pint') || cat.includes('fachada')) return '🎨';
  if (cat.includes('fumig') || cat.includes('plaga') || cat.includes('desinfe')) return '🐜';
  if (cat.includes('tel') || cat.includes('internet') || cat.includes('wifi') || cat.includes('cable')) return '🌐';
  if (cat.includes('judic') || cat.includes('legal') || cat.includes('abogado') || cat.includes('mediac')) return '⚖️';
  if (cat.includes('matafuego') || cat.includes('extintor') || cat.includes('incendio')) return '🧯';
  if (cat.includes('flete') || cat.includes('mudanza') || cat.includes('transp')) return '🚚';
  return '📦';
};

const Dashboard: React.FC<DashboardProps> = ({ units, expenses }) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  const periodExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.date + 'T00:00:00');
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [expenses, selectedMonth, selectedYear]);

  const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalCoef = units.reduce((sum, u) => sum + u.coefficient, 0);

  const categoryDataMap = periodExpenses.reduce((acc: any, curr) => {
    const cat = curr.category || 'otros';
    if (!acc[cat]) {
      acc[cat] = { value: 0, count: 0 };
    }
    acc[cat].value += curr.amount;
    acc[cat].count += 1;
    return acc;
  }, {});

  const categoryData = Object.keys(categoryDataMap)
    .map(key => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: categoryDataMap[key].value,
      count: categoryDataMap[key].count,
      rawKey: key
    }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#0ea5e9', '#f43f5e'];

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-lg shadow-lg shadow-indigo-100 dark:shadow-none">📅</div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Período de Análisis</p>
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(parseInt(e.target.value))}
                className="bg-transparent font-black text-slate-800 dark:text-slate-100 outline-none cursor-pointer text-sm"
              >
                {months.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent font-black text-slate-800 dark:text-slate-100 outline-none cursor-pointer text-sm"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            {periodExpenses.length} Comprobantes en {months[selectedMonth]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Egresos del Período</p>
          <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums">${formatMoney(totalExpenses)}</h3>
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest">Total Acumulado</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Carga Operativa</p>
          <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">{categoryData.length}</h3>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-full"></div>
            </div>
            <span className="text-[10px] font-black text-slate-400">Categorías</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Promedio UF</p>
          <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">
            ${units.length ? formatMoney(totalExpenses / units.length) : '0.00'}
          </h3>
          <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest">Gasto base por unidad</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Participación</p>
          <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">{(totalCoef * 100).toFixed(1)}%</h3>
          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-3 font-bold uppercase tracking-widest">Coeficiente Total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h4 className="font-black text-slate-800 dark:text-slate-100 uppercase text-xs tracking-[0.2em]">Desglose de Egresos</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">Comparativa visual por categoría en {months[selectedMonth]}</p>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9', opacity: 0.1 }}
                  contentStyle={{ borderRadius: '20px', border: 'none', backgroundColor: '#1e293b', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)', padding: '15px' }}
                  itemStyle={{ fontWeight: 800, color: '#f1f5f9' }}
                  formatter={(value: number) => [`$${formatMoney(value)}`, 'Total']}
                />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={45}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-slate-800 dark:text-slate-100 uppercase text-xs tracking-[0.2em]">Ranking de Gastos</h4>
            <div className="w-10 h-10 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center text-xs">📊</div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            {categoryData.map((entry, index) => {
              const percentage = totalExpenses > 0 ? (entry.value / totalExpenses) * 100 : 0;
              const color = COLORS[index % COLORS.length];

              return (
                <div key={entry.name} className="group animate-in slide-in-from-right-4" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex items-center gap-4 mb-2">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm border transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
                    >
                      {getCategoryIcon(entry.rawKey)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter truncate pr-2">
                          {entry.name}
                        </span>
                        <span className="text-sm font-black text-slate-900 dark:text-slate-100 tabular-nums">
                          ${formatMoney(entry.value)}
                        </span>
                      </div>

                      <div className="h-2 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100 dark:border-slate-700">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: color
                          }}
                        ></div>
                      </div>

                      <div className="flex justify-between items-center mt-1.5">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                          {entry.count} {entry.count === 1 ? 'Movimiento' : 'Movimientos'}
                        </span>
                        <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {categoryData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <span className="text-5xl mb-4">📂</span>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sin datos en el período</p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none text-white">
              <span className="text-[10px] font-black uppercase tracking-widest">Total Gastos {months[selectedMonth]}</span>
              <span className="text-xl font-black tabular-nums">${formatMoney(totalExpenses)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
