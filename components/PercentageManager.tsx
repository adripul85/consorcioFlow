
import React, { useState, useMemo, useRef } from 'react';
import { Unit, Expense } from '../types';
import { exportToCSV, exportToExcel, parseFile } from '../services/dataService';
import { extractUnitsFromDocument } from '../services/geminiService';
import { formatMoney, handleAccountingInput, parseAccountingValue } from '../services/accountingUtils';

interface PercentageManagerProps {
  units: Unit[];
  expenses: Expense[];
  onUpdateUnit: (unit: Unit) => void;
  onAddUnit: (unit: Unit) => void;
}

const PercentageManager: React.FC<PercentageManagerProps> = ({ units, expenses, onUpdateUnit, onAddUnit }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isAiScanning, setIsAiScanning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Calcular total de gastos del periodo para el prorrateo
  const totalPeriodExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        const d = new Date(e.date + 'T00:00:00');
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      })
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses, selectedMonth, selectedYear]);

  const handleUpdateUnitField = (unit: Unit, field: keyof Unit, value: any) => {
    onUpdateUnit({ ...unit, [field]: value });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseFile(file);
      let count = 0;
      data.forEach((row: any) => {
        const floor = (row.Piso || row.piso || '').toString().trim();
        const dept = (row.Departamento || row.depto || row.Depto || '').toString().trim();
        const rawCoef = (row.Coeficiente || row.coeficiente || '0').toString().replace(',', '.');
        const coef = parseFloat(rawCoef);
        const ownerRaw = (row.Propietario || row.propietario || '').toString().trim();
        const owner = ownerRaw === '' ? 'Sin Propietario' : ownerRaw;

        if (floor && dept && !isNaN(coef) && coef > 0 && coef <= 100) {
          onAddUnit({
            id: Math.random().toString(36).substr(2, 9),
            floor: floor,
            department: dept.toUpperCase(),
            coefficient: coef / 100,
            owner: owner,
            payments: []
          });
          count++;
        }
      });
      alert(`Importación exitosa: se agregaron ${count} unidades.`);
    } catch (err: any) {
      alert(`Error al importar: ${err.message}`);
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
            if (item.floor && item.department && item.coefficient) {
              onAddUnit({
                id: Math.random().toString(36).substr(2, 9),
                floor: item.floor.toString(),
                department: item.department.toString().toUpperCase(),
                coefficient: parseFloat(item.coefficient.toString().replace(',', '.')) / 100,
                owner: item.owner || 'Sin Propietario',
                payments: []
              });
              count++;
            }
          });
          alert(`IA completó el escaneo: se procesaron ${count} unidades.`);
        } else {
          alert("La IA no pudo procesar el documento. Intenta con una foto más clara.");
        }
        setIsAiScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsAiScanning(false);
      alert("Error en el procesamiento de IA.");
    } finally {
      if (aiFileInputRef.current) aiFileInputRef.current.value = '';
    }
  };

  const totals = useMemo(() => {
    return units.reduce((acc, u) => {
      const saldoAnt = u.previousBalance || 0;
      const ordinariaAbonada = u.ordinariaAbonada || 0;
      const extraordinariaAbonada = u.extraordinariaAbonada || 0;
      const aysaAbonada = u.aysaAbonada || 0;
      const totalAbonado = ordinariaAbonada + extraordinariaAbonada + aysaAbonada;

      const deuda = u.deuda || 0;
      const interes = u.intereses || (deuda * 0.03);
      const ufPorc = u.coefficient;

      const ordinariaSiguiente = u.ordinariaSiguiente || (totalPeriodExpenses * ufPorc);
      const extraordinariaSiguiente = u.extraordinariaSiguiente || 0;
      const aysaSiguiente = u.aysaSiguiente || 0;
      const totalAPagar = deuda + interes + ordinariaSiguiente + extraordinariaSiguiente + aysaSiguiente;

      return {
        saldoAnt: acc.saldoAnt + saldoAnt,
        ordinariaAbonada: acc.ordinariaAbonada + ordinariaAbonada,
        extraordinariaAbonada: acc.extraordinariaAbonada + extraordinariaAbonada,
        aysaAbonada: acc.aysaAbonada + aysaAbonada,
        totalAbonado: acc.totalAbonado + totalAbonado,
        deuda: acc.deuda + deuda,
        interes: acc.interes + interes,
        ufPorc: acc.ufPorc + ufPorc,
        ordinariaSiguiente: acc.ordinariaSiguiente + ordinariaSiguiente,
        extraordinariaSiguiente: acc.extraordinariaSiguiente + extraordinariaSiguiente,
        aysaSiguiente: acc.aysaSiguiente + aysaSiguiente,
        totalAPagar: acc.totalAPagar + totalAPagar
      };
    }, {
      saldoAnt: 0, ordinariaAbonada: 0, extraordinariaAbonada: 0, aysaAbonada: 0, totalAbonado: 0,
      deuda: 0, interes: 0, ufPorc: 0, ordinariaSiguiente: 0, extraordinariaSiguiente: 0, aysaSiguiente: 0, totalAPagar: 0
    });
  }, [units, totalPeriodExpenses]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Filtros de Período */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white text-lg">🔢</div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prorrateo de Expensas</p>
            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(parseInt(e.target.value))}
                className="bg-transparent font-black text-slate-800 dark:text-slate-100 outline-none cursor-pointer text-sm"
              >
                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent font-black text-slate-800 dark:text-slate-100 outline-none cursor-pointer text-sm"
              >
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => aiFileInputRef.current?.click()}
            disabled={isAiScanning}
            className={`flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-100 text-slate-900 border border-slate-200 dark:border-white rounded-full text-[11px] font-black uppercase tracking-wider shadow-lg shadow-white/10 hover:scale-105 active:scale-95 transition-all ${isAiScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isAiScanning ? (
              <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            ) : <span className="text-amber-500">✨</span>}
            ESCANEAR CENSO (IA)
          </button>
          <input type="file" ref={aiFileInputRef} onChange={handleIAImport} className="hidden" accept="image/*,application/pdf" capture="environment" />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/80 dark:bg-slate-800 text-white border border-slate-700/50 rounded-full text-[11px] font-black uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <span className="text-indigo-400">📥</span>
            IMPORTAR EXCEL/CSV
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".csv, .xlsx, .xls" />
        </div>

        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gasto Total Período</p>
          <p className="text-xl font-black text-indigo-600 tabular-nums">${formatMoney(totalPeriodExpenses)}</p>
        </div>
      </div>

      {/* Tabla Estilo Planilla Oficial */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-[#f0f8eb] dark:bg-emerald-900/10 p-4 border-b border-slate-200 dark:border-slate-800 text-center font-black text-xs uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
          Estado de Cuentas y Prorrateo
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-bold border-collapse">
            <thead className="bg-[#f0f8eb] dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-300">
              <tr className="border-b-2 border-slate-300 dark:border-slate-700">
                <th colSpan={4} className="px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/50 text-slate-500">DATOS DE LA UNIDAD</th>
                <th colSpan={5} className="px-3 py-2 border border-slate-200 dark:border-slate-800 bg-indigo-50/30 dark:bg-indigo-900/10 text-indigo-600">PAGOS REALIZADOS</th>
                <th colSpan={7} className="px-3 py-2 border border-slate-200 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-900/10 text-emerald-600">A PAGAR MES SIGUIENTE</th>
              </tr>
              <tr>
                <th className="px-2 py-3 border border-slate-200 dark:border-slate-800">U.F.</th>
                <th className="px-2 py-3 border border-slate-200 dark:border-slate-800">PISO</th>
                <th className="px-2 py-3 border border-slate-200 dark:border-slate-800">DPTO.</th>
                <th className="px-2 py-3 border border-slate-200 dark:border-slate-800 text-left">PROPIETARIO</th>

                <th className="px-2 py-3 border border-slate-200 dark:border-slate-800 text-right bg-slate-50 dark:bg-slate-800/30">SALDO ANT.</th>
                <th className="px-2 py-3 border border-slate-200 dark:border-slate-800 text-right">ORD. ABONADA</th>
                <th className="px-2 py-3 border border-slate-200 dark:border-slate-800 text-right">EXT. ABONADA</th>
                <th className="px-2 py-3 border border-slate-200 dark:border-slate-800 text-right">AYSA</th>
                <th className="px-2 py-3 border border-slate-200 dark:border-slate-800 text-right font-black">TOTAL ABON.</th>

                <th className="px-2 py-3 border border-slate-200 dark:border-slate-800 text-right">DEUDA</th>
                <th className="px-2 py-3 border border-slate-200 dark:border-slate-800 text-right">INT. 3%</th>
                <th className="px-2 py-3 border border-slate-200 dark:border-slate-800 text-center">UF %</th>
                <th className="px-2 py-3 border border-slate-200 dark:border-slate-800 text-right">ORD. SIG.</th>
                <th className="px-2 py-3 border border-slate-200 dark:border-slate-800 text-right">EXT. SIG.</th>
                <th className="px-2 py-3 border border-slate-200 dark:border-slate-800 text-right">AYSA SIG.</th>
                <th className="px-2 py-3 border border-slate-200 dark:border-slate-800 text-right font-black bg-[#e2f0d9] dark:bg-emerald-800/30">TOTAL A PAGAR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {units.map((unit, index) => {
                const totalAbonado = (unit.ordinariaAbonada || 0) + (unit.extraordinariaAbonada || 0) + (unit.aysaAbonada || 0);
                const interes = unit.intereses || ((unit.deuda || 0) * 0.03);
                const ordinariaSig = unit.ordinariaSiguiente || (totalPeriodExpenses * unit.coefficient);
                const totalAPagar = (unit.deuda || 0) + interes + ordinariaSig + (unit.extraordinariaSiguiente || 0) + (unit.aysaSiguiente || 0);

                return (
                  <tr key={unit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-2 py-3 border border-slate-100 dark:border-slate-800 text-center text-slate-400">#{index + 1}</td>
                    <td className="p-0 border border-slate-100 dark:border-slate-800">
                      <input type="text" className="w-full h-full px-1 py-3 bg-transparent text-center outline-none focus:bg-indigo-50 dark:focus:bg-indigo-900/20 uppercase" value={unit.floor} onChange={e => handleUpdateUnitField(unit, 'floor', e.target.value)} />
                    </td>
                    <td className="p-0 border border-slate-100 dark:border-slate-800">
                      <input type="text" className="w-full h-full px-1 py-3 bg-transparent text-center outline-none focus:bg-indigo-50 dark:focus:bg-indigo-900/20 uppercase" value={unit.department} onChange={e => handleUpdateUnitField(unit, 'department', e.target.value.toUpperCase())} />
                    </td>
                    <td className="p-0 border border-slate-100 dark:border-slate-800">
                      <input type="text" className="w-full h-full px-2 py-3 bg-transparent text-left outline-none focus:bg-indigo-50 dark:focus:bg-indigo-900/20 uppercase text-[10px]" value={unit.owner} onChange={e => handleUpdateUnitField(unit, 'owner', e.target.value)} />
                    </td>

                    {/* PAGOS REALIZADOS */}
                    <td className="p-0 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/10">
                      <input
                        type="text"
                        className="w-full h-full px-2 py-3 bg-transparent text-right outline-none focus:bg-indigo-50 dark:focus:bg-indigo-900/20 tabular-nums"
                        value={formatMoney(unit.previousBalance || 0)}
                        onChange={e => handleUpdateUnitField(unit, 'previousBalance', parseAccountingValue(handleAccountingInput(e.target.value)))}
                      />
                    </td>
                    <td className="p-0 border border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        className="w-full h-full px-2 py-3 bg-transparent text-right outline-none focus:bg-indigo-50 dark:focus:bg-indigo-900/20 tabular-nums"
                        value={formatMoney(unit.ordinariaAbonada || 0)}
                        onChange={e => handleUpdateUnitField(unit, 'ordinariaAbonada', parseAccountingValue(handleAccountingInput(e.target.value)))}
                      />
                    </td>
                    <td className="p-0 border border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        className="w-full h-full px-2 py-3 bg-transparent text-right outline-none focus:bg-indigo-50 dark:focus:bg-indigo-900/20 tabular-nums"
                        value={formatMoney(unit.extraordinariaAbonada || 0)}
                        onChange={e => handleUpdateUnitField(unit, 'extraordinariaAbonada', parseAccountingValue(handleAccountingInput(e.target.value)))}
                      />
                    </td>
                    <td className="p-0 border border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        className="w-full h-full px-2 py-3 bg-transparent text-right outline-none focus:bg-indigo-50 dark:focus:bg-indigo-900/20 tabular-nums"
                        value={formatMoney(unit.aysaAbonada || 0)}
                        onChange={e => handleUpdateUnitField(unit, 'aysaAbonada', parseAccountingValue(handleAccountingInput(e.target.value)))}
                      />
                    </td>
                    <td className="px-2 py-3 border border-slate-100 dark:border-slate-800 text-right tabular-nums font-black text-indigo-600">
                      {formatMoney(totalAbonado)}
                    </td>

                    {/* A PAGAR MES SIGUIENTE */}
                    <td className="p-0 border border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        className="w-full h-full px-2 py-3 bg-transparent text-right outline-none focus:bg-emerald-50 dark:focus:bg-emerald-900/20 tabular-nums font-black"
                        value={formatMoney(unit.deuda || 0)}
                        onChange={e => handleUpdateUnitField(unit, 'deuda', parseAccountingValue(handleAccountingInput(e.target.value)))}
                      />
                    </td>
                    <td className="p-0 border border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        className="w-full h-full px-2 py-3 bg-transparent text-right outline-none focus:bg-emerald-50 dark:focus:bg-emerald-900/20 tabular-nums text-rose-500"
                        value={formatMoney(interes)}
                        onChange={e => handleUpdateUnitField(unit, 'intereses', parseAccountingValue(handleAccountingInput(e.target.value)))}
                      />
                    </td>
                    <td className="p-0 border border-slate-100 dark:border-slate-800">
                      <input
                        type="number"
                        step="0.0001"
                        className="w-full h-full px-2 py-3 bg-[#fff9c4] dark:bg-amber-900/20 text-center outline-none focus:ring-1 focus:ring-amber-500 font-black"
                        value={unit.coefficient * 100}
                        onChange={e => handleUpdateUnitField(unit, 'coefficient', parseFloat(e.target.value) / 100)}
                      />
                    </td>
                    <td className="p-0 border border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        className="w-full h-full px-2 py-3 bg-transparent text-right outline-none focus:bg-emerald-50 dark:focus:bg-emerald-900/20 tabular-nums"
                        value={formatMoney(ordinariaSig)}
                        onChange={e => handleUpdateUnitField(unit, 'ordinariaSiguiente', parseAccountingValue(handleAccountingInput(e.target.value)))}
                      />
                    </td>
                    <td className="p-0 border border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        className="w-full h-full px-2 py-3 bg-transparent text-right outline-none focus:bg-emerald-50 dark:focus:bg-emerald-900/20 tabular-nums"
                        value={formatMoney(unit.extraordinariaSiguiente || 0)}
                        onChange={e => handleUpdateUnitField(unit, 'extraordinariaSiguiente', parseAccountingValue(handleAccountingInput(e.target.value)))}
                      />
                    </td>
                    <td className="p-0 border border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        className="w-full h-full px-2 py-3 bg-transparent text-right outline-none focus:bg-emerald-50 dark:focus:bg-emerald-900/20 tabular-nums"
                        value={formatMoney(unit.aysaSiguiente || 0)}
                        onChange={e => handleUpdateUnitField(unit, 'aysaSiguiente', parseAccountingValue(handleAccountingInput(e.target.value)))}
                      />
                    </td>
                    <td className="px-2 py-3 border border-slate-100 dark:border-slate-800 text-right tabular-nums font-black bg-[#e2f0d9] dark:bg-emerald-900/20 text-lg">
                      {formatMoney(totalAPagar)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#f0f8eb] dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-400 font-black">
              <tr>
                <td colSpan={4} className="px-4 py-4 border border-slate-200 dark:border-slate-800 uppercase text-right">Totales Consolidados</td>

                <td className="px-2 py-4 border border-slate-200 dark:border-slate-800 text-right tabular-nums">{formatMoney(totals.saldoAnt)}</td>
                <td className="px-2 py-4 border border-slate-200 dark:border-slate-800 text-right tabular-nums">{formatMoney(totals.ordinariaAbonada)}</td>
                <td className="px-2 py-4 border border-slate-200 dark:border-slate-800 text-right tabular-nums">{formatMoney(totals.extraordinariaAbonada)}</td>
                <td className="px-2 py-4 border border-slate-200 dark:border-slate-800 text-right tabular-nums">{formatMoney(totals.aysaAbonada)}</td>
                <td className="px-2 py-4 border border-slate-200 dark:border-slate-800 text-right tabular-nums">{formatMoney(totals.totalAbonado)}</td>

                <td className="px-2 py-4 border border-slate-200 dark:border-slate-800 text-right tabular-nums">{formatMoney(totals.deuda)}</td>
                <td className="px-2 py-4 border border-slate-200 dark:border-slate-800 text-right tabular-nums">{formatMoney(totals.interes)}</td>
                <td className="px-2 py-4 border border-slate-200 dark:border-slate-800 text-center tabular-nums">{(totals.ufPorc * 100).toFixed(2)}%</td>
                <td className="px-2 py-4 border border-slate-200 dark:border-slate-800 text-right tabular-nums">{formatMoney(totals.ordinariaSiguiente)}</td>
                <td className="px-2 py-4 border border-slate-200 dark:border-slate-800 text-right tabular-nums">{formatMoney(totals.extraordinariaSiguiente)}</td>
                <td className="px-2 py-4 border border-slate-200 dark:border-slate-800 text-right tabular-nums">{formatMoney(totals.aysaSiguiente)}</td>
                <td className="px-2 py-4 border border-slate-200 dark:border-slate-800 text-right tabular-nums bg-[#e2f0d9] dark:bg-emerald-800/40">{formatMoney(totals.totalAPagar)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Nota Informativa */}
      <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-400 leading-relaxed font-bold">
        <p>⚠️ Nota: Los porcentajes (UF %) aquí editados modifican directamente la base de datos de las unidades. El cálculo de "Expensa" se basa en el total de egresos del período seleccionado (${formatMoney(totalPeriodExpenses)}). El interés se calcula automáticamente al 3% sobre el campo "Deuda".</p>
      </div>

      {isAiScanning && (
        <div className="fixed inset-0 z-100 bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 animate-in fade-in">
          <div className="relative w-64 h-64 border-4 border-indigo-500/30 rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900">
            <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center">
              <span className="text-4xl animate-pulse">📄</span>
            </div>
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.8)] animate-scan-line"></div>
          </div>
          <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] animate-pulse">Gemini 1.5 Pro Analizando Documento...</p>
        </div>
      )}

      <style>{`
        @keyframes scan-line {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan-line {
          animation: scan-line 2.5s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default PercentageManager;
