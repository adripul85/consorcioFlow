import React, { useState, useMemo, useRef } from 'react';
import { Unit, UnitPayment, Expense } from '../types';
import { exportToCSV, exportToExcel, parseFile } from '../services/dataService';
import { extractUnitsFromDocument } from '../services/geminiService';
import { formatMoney, handleAccountingInput, parseAccountingValue } from '../services/accountingUtils';

interface UnitManagerProps {
  units: Unit[];
  expenses: Expense[];
  onAdd: (unit: Unit) => void;
  onRemove: (id: string) => void;
  onUpdate: (unit: Unit) => void;
}

const UnitManager: React.FC<UnitManagerProps> = ({ units, expenses, onAdd, onRemove, onUpdate }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null);
  const [tempOwnerName, setTempOwnerName] = useState('');

  const [formData, setFormData] = useState({
    floor: '',
    department: '',
    coefficient: '',
    owner: ''
  });

  const totalCoefficient = useMemo(() => {
    return units.reduce((sum, unit) => sum + unit.coefficient, 0) * 100;
  }, [units]);

  const totalCollected = useMemo(() => {
    return units.reduce((acc, u) => acc + (u.payments?.reduce((s, p) => s + p.amount, 0) || 0), 0);
  }, [units]);

  const [selectedMonth] = useState(new Date().getMonth());
  const [selectedYear] = useState(new Date().getFullYear());

  const totalPeriodExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        const d = new Date(e.date + 'T00:00:00');
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      })
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses, selectedMonth, selectedYear]);

  const totals = useMemo(() => {
    return units.reduce((acc, u) => {
      const saldoAnt = u.previousBalance || 0;
      const totalAbonado = u.payments?.reduce((s, p) => s + p.amount, 0) || 0;
      const deuda = u.deuda || 0;
      const interes = u.intereses || (deuda * 0.03);
      const ufPorc = u.coefficient;
      const expensa = totalPeriodExpenses * ufPorc;
      const totalAPagar = deuda + interes + expensa;

      return {
        saldoAnt: acc.saldoAnt + saldoAnt,
        totalAbonado: acc.totalAbonado + totalAbonado,
        deuda: acc.deuda + deuda,
        interes: acc.interes + interes,
        ufPorc: acc.ufPorc + ufPorc,
        expensa: acc.expensa + expensa,
        totalAPagar: acc.totalAPagar + totalAPagar
      };
    }, {
      saldoAnt: 0, totalAbonado: 0, deuda: 0, interes: 0, ufPorc: 0, expensa: 0, totalAPagar: 0
    });
  }, [units, totalPeriodExpenses]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { floor, department, coefficient, owner } = formData;

    if (!floor.trim() || !department.trim() || !coefficient.trim()) {
      setError('Piso, Depto y Coeficiente son obligatorios.');
      return;
    }

    const coefNum = parseFloat(coefficient.replace(',', '.'));
    if (isNaN(coefNum) || coefNum <= 0 || coefNum > 100) {
      setError('Coeficiente inválido (1-100).');
      return;
    }

    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      floor: floor.trim(),
      department: department.trim().toUpperCase(),
      coefficient: coefNum / 100,
      owner: owner.trim() || 'Sin Propietario',
      payments: []
    });

    setFormData({ floor: '', department: '', coefficient: '', owner: '' });
    setIsAdding(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseFile(file);
      let count = 0;
      data.forEach((row: any) => {
        const floor = (row.Piso || row.piso || row.PISO || '').toString().trim();
        const dept = (row.Departamento || row.depto || row.DPTO || '').toString().trim();

        // Soporte para "Coeficiente" o "UF %"
        let rawCoef = (row.Coeficiente || row.coeficiente || row["UF %"] || '0').toString().replace(',', '.');
        const coef = parseFloat(rawCoef);

        if (floor && dept && !isNaN(coef) && coef > 0) {
          onAdd({
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
            floor,
            department: dept.toUpperCase(),
            coefficient: coef / 100,
            owner: (row.Propietario || row.propietario || row.PROPIETARIO || '').toString().trim() || 'Sin Propietario',
            payments: []
          });
          count++;
        }
      });
      alert(`Se importaron ${count} unidades.`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleIAImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAiScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = (event.target?.result as string).split(',')[1];
        const result = await extractUnitsFromDocument(base64Data, file.type);
        if (result && Array.isArray(result)) {
          let count = 0;
          result.forEach((item: any) => {
            if (item.floor && item.department) {
              onAdd({
                id: Math.random().toString(36).substr(2, 9),
                floor: item.floor.toString(),
                department: item.department.toString().toUpperCase(),
                coefficient: (parseFloat(item.coefficient?.toString().replace(',', '.') || '0') || 0) / 100,
                owner: item.owner || 'Sin Propietario',
                payments: []
              });
              count++;
            }
          });
          alert(`IA procesó ${count} unidades.`);
        } else {
          alert("No se pudo procesar el documento.");
        }
        setIsAiScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsAiScanning(false);
      alert("Error en IA.");
    } finally {
      if (aiFileInputRef.current) aiFileInputRef.current.value = '';
    }
  };

  const handleRemoveUnit = (e: React.MouseEvent, unitId: string) => {
    e.stopPropagation();
    if (window.confirm('¿Borrar unidad?')) onRemove(unitId);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Unidades</p>
            <p className="text-2xl font-black">{units.length}</p>
          </div>
          <div className="text-xl">🏠</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Coeficientes</p>
            <p className={`text-2xl font-black ${Math.abs(100 - totalCoefficient) < 0.01 ? 'text-emerald-600' : ''}`}>
              {totalCoefficient.toFixed(2)}%
            </p>
          </div>
          <div className="font-black text-amber-600">%</div>
        </div>
        <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-xl flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Recaudación</p>
            <p className="text-2xl font-black">${formatMoney(totalCollected)}</p>
          </div>
          <div className="text-xl">💰</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 gap-4">
          <div className="text-left w-full md:w-auto">
            <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase text-xs tracking-widest">Censo de Unidades (Porcentajes)</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Gestión de coeficientes y estados de cuenta consolidados</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
            <button onClick={() => aiFileInputRef.current?.click()} disabled={isAiScanning} className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2">
              {isAiScanning ? 'Analizando...' : '✨ Escanear (IA)'}
            </button>
            <input type="file" ref={aiFileInputRef} onChange={handleIAImport} className="hidden" accept="image/*,application/pdf" />
            <button onClick={() => fileInputRef.current?.click()} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">📥 Importar</button>
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".csv, .xlsx, .xls" />
            <button onClick={() => setIsAdding(!isAdding)} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
              {isAdding ? 'Cerrar' : '+ Nueva'}
            </button>
          </div>
        </div>

        {isAiScanning && (
          <div className="absolute inset-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
            <div className="relative w-48 h-48 border-4 border-indigo-500/20 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xl">
              <div className="absolute inset-0 flex items-center justify-center text-4xl">📄</div>
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,1)] animate-scan-line"></div>
            </div>
            <p className="mt-6 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest animate-pulse">Gemini 1.5 Flash Analizando...</p>
          </div>
        )}

        {isAdding && (
          <form onSubmit={handleSubmit} className="p-8 bg-indigo-50/30 dark:bg-indigo-900/10 border-b border-indigo-100 dark:border-indigo-900 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4">
            <input type="text" placeholder="Piso" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-sm" value={formData.floor} onChange={e => setFormData({ ...formData, floor: e.target.value })} />
            <input type="text" placeholder="Depto" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-sm" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} />
            <input type="text" placeholder="Coef %" className="w-full px-4 py-2 rounded-xl border-2 border-indigo-100 bg-white dark:bg-slate-800 font-bold text-sm" value={formData.coefficient} onChange={e => setFormData({ ...formData, coefficient: e.target.value })} />
            <div className="flex gap-2">
              <input type="text" placeholder="Propietario" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-sm" value={formData.owner} onChange={e => setFormData({ ...formData, owner: e.target.value })} />
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase">OK</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-bold border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[9px] tracking-widest">
              <tr>
                <th className="px-4 py-3 border border-slate-100 dark:border-slate-800">UF</th>
                <th className="px-2 py-3 border border-slate-100 dark:border-slate-800">Piso</th>
                <th className="px-2 py-3 border border-slate-100 dark:border-slate-800">Depto</th>
                <th className="px-4 py-3 border border-slate-100 dark:border-slate-800 text-left">Propietario</th>
                <th className="px-4 py-3 border border-slate-100 dark:border-slate-800 text-right">Saldo Ant.</th>
                <th className="px-4 py-3 border border-slate-100 dark:border-slate-800 text-right">Su Pago</th>
                <th className="px-4 py-3 border border-slate-100 dark:border-slate-800 text-right">Deuda</th>
                <th className="px-4 py-3 border border-slate-100 dark:border-slate-800 text-right">Int. 3%</th>
                <th className="px-4 py-3 border border-slate-100 dark:border-slate-800 text-center">UF %</th>
                <th className="px-4 py-3 border border-slate-100 dark:border-slate-800 text-right">Expensa</th>
                <th className="px-4 py-3 border border-slate-100 dark:border-slate-800 text-right font-black">Total</th>
                <th className="px-2 py-3 border border-slate-100 dark:border-slate-800"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {units.map((unit, index) => {
                const totalAbonado = unit.payments?.reduce((s, p) => s + p.amount, 0) || 0;
                const interes = unit.intereses || ((unit.deuda || 0) * 0.03);
                const expensa = unit.ordinariaSiguiente || (totalPeriodExpenses * unit.coefficient);
                const totalAPagar = (unit.deuda || 0) + interes + expensa;

                return (
                  <tr key={unit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-center">#{index + 1}</td>
                    <td className="px-1 py-1">
                      <input type="text" className="w-full text-center bg-transparent outline-none focus:bg-indigo-50 rounded px-1 uppercase" value={unit.floor} onChange={e => onUpdate({ ...unit, floor: e.target.value })} />
                    </td>
                    <td className="px-1 py-1">
                      <input type="text" className="w-full text-center bg-transparent outline-none focus:bg-indigo-50 rounded px-1 uppercase" value={unit.department} onChange={e => onUpdate({ ...unit, department: e.target.value.toUpperCase() })} />
                    </td>
                    <td className="px-1 py-1">
                      <input type="text" className="w-full text-left bg-transparent outline-none focus:bg-indigo-50 rounded px-2 uppercase text-[10px]" value={unit.owner} onChange={e => onUpdate({ ...unit, owner: e.target.value })} />
                    </td>
                    <td className="px-2 py-1">
                      <input type="text" className="w-full text-right bg-transparent outline-none focus:bg-indigo-50 rounded px-1" value={formatMoney(unit.previousBalance || 0)} onChange={e => onUpdate({ ...unit, previousBalance: parseAccountingValue(handleAccountingInput(e.target.value)) })} />
                    </td>
                    <td className="px-4 py-3 text-right text-indigo-600">{formatMoney(totalAbonado)}</td>
                    <td className="px-2 py-1 text-red-600">
                      <input type="text" className="w-full text-right bg-transparent outline-none focus:bg-indigo-50 rounded px-1" value={formatMoney(unit.deuda || 0)} onChange={e => onUpdate({ ...unit, deuda: parseAccountingValue(handleAccountingInput(e.target.value)) })} />
                    </td>
                    <td className="px-2 py-1 italic text-slate-500">
                      <input type="text" className="w-full text-right bg-transparent outline-none focus:bg-indigo-50 rounded px-1" value={formatMoney(interes)} onChange={e => onUpdate({ ...unit, intereses: parseAccountingValue(handleAccountingInput(e.target.value)) })} />
                    </td>
                    <td className="px-2 py-1">
                      <input type="text" className="w-full text-center bg-transparent outline-none focus:bg-indigo-50 rounded px-1 font-black text-indigo-600" value={(unit.coefficient * 100).toFixed(2)} onChange={e => onUpdate({ ...unit, coefficient: (parseFloat(e.target.value.replace(',', '.')) || 0) / 100 })} />
                    </td>
                    <td className="px-2 py-1">
                      <input type="text" className="w-full text-right bg-transparent outline-none focus:bg-indigo-50 rounded px-1 text-emerald-600 font-bold" value={formatMoney(expensa)} onChange={e => onUpdate({ ...unit, ordinariaSiguiente: parseAccountingValue(handleAccountingInput(e.target.value)) })} />
                    </td>
                    <td className="px-4 py-3 text-right font-black bg-slate-50/50 dark:bg-emerald-900/10 text-lg">${formatMoney(totalAPagar)}</td>
                    <td className="px-2 py-3 text-center">
                      <button onClick={(e) => handleRemoveUnit(e, unit.id)} className="text-slate-300 hover:text-red-500 p-2">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-black">
              <tr>
                <td colSpan={4} className="px-4 py-4 text-right text-[10px] uppercase tracking-widest">Totales</td>
                <td className="px-4 py-4 text-right">${formatMoney(totals.saldoAnt)}</td>
                <td className="px-4 py-4 text-right text-indigo-400">${formatMoney(totals.totalAbonado)}</td>
                <td className="px-4 py-4 text-right text-red-400">${formatMoney(totals.deuda)}</td>
                <td className="px-4 py-4 text-right italic">${formatMoney(totals.interes)}</td>
                <td className="px-4 py-4 text-center">{(totals.ufPorc * 100).toFixed(2)}%</td>
                <td className="px-4 py-4 text-right text-emerald-400">${formatMoney(totals.expensa)}</td>
                <td className="px-4 py-4 text-right text-xl" colSpan={2}>${formatMoney(totals.totalAPagar)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes scan-line { 0% { top: 0; } 100% { top: 100%; } }
        .animate-scan-line { animation: scan-line 2.5s linear infinite; }
      `}</style>
    </div>
  );
};

export default UnitManager;
