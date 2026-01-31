
import React, { useState, useMemo, useRef } from 'react';
import { Unit, UnitPayment } from '../types';
import { exportToCSV, exportToExcel, parseFile } from '../services/dataService';
import { formatMoney, handleAccountingInput, parseAccountingValue } from './Dashboard';

interface UnitManagerProps {
  units: Unit[];
  onAdd: (unit: Unit) => void;
  onRemove: (id: string) => void;
  onUpdate: (unit: Unit) => void;
}

const UnitManager: React.FC<UnitManagerProps> = ({ units, onAdd, onRemove, onUpdate }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null);
  const [tempOwnerName, setTempOwnerName] = useState('');

  // Estados para edición de pagos
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [tempPaymentAmount, setTempPaymentAmount] = useState('0.00');
  const [tempPaymentDate, setTempPaymentDate] = useState('');

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedUnitId(expandedUnitId === id ? null : id);
    setEditingPaymentId(null);
  };

  const startEditingOwner = (e: React.MouseEvent, unit: Unit) => {
    e.stopPropagation();
    setEditingOwnerId(unit.id);
    setTempOwnerName(unit.owner);
  };

  const saveOwnerEdit = (e: React.MouseEvent | React.KeyboardEvent, unit: Unit) => {
    if (e) e.stopPropagation();
    const finalName = tempOwnerName.trim() === '' ? 'Sin Propietario' : tempOwnerName.trim();
    onUpdate({ ...unit, owner: finalName });
    setEditingOwnerId(null);
  };

  const cancelOwnerEdit = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    setEditingOwnerId(null);
  };

  const startEditingPayment = (e: React.MouseEvent, payment: UnitPayment) => {
    e.stopPropagation();
    setEditingPaymentId(payment.id);
    setTempPaymentAmount(formatMoney(payment.amount));
    setTempPaymentDate(payment.date);
  };

  const savePaymentEdit = (e: React.MouseEvent, unit: Unit) => {
    e.stopPropagation();
    const numAmount = parseAccountingValue(tempPaymentAmount);
    if (numAmount <= 0) {
      alert("Por favor ingrese un monto válido.");
      return;
    }

    const updatedPayments = (unit.payments || []).map(p =>
      p.id === editingPaymentId ? { ...p, amount: numAmount, date: tempPaymentDate } : p
    );

    onUpdate({ ...unit, payments: updatedPayments });
    setEditingPaymentId(null);
  };

  const cancelPaymentEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPaymentId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { floor, department, coefficient, owner } = formData;

    if (!floor.trim()) {
      setError('El campo "Piso" es obligatorio.');
      return;
    }
    if (!department.trim()) {
      setError('El campo "Departamento" es obligatorio.');
      return;
    }
    if (!coefficient.trim()) {
      setError('El campo "Coeficiente" es obligatorio para calcular las expensas.');
      return;
    }

    const normalizedCoef = coefficient.replace(',', '.');
    const coefNum = parseFloat(normalizedCoef);

    if (isNaN(coefNum)) {
      setError('El coeficiente debe ser un valor numérico válido.');
      return;
    }

    if (coefNum <= 0 || coefNum > 100) {
      setError('El coeficiente debe ser un número mayor a 0 y menor o igual a 100.');
      return;
    }

    const validatedOwner = owner.trim() === '' ? 'Sin Propietario' : owner.trim();

    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      floor: floor.trim(),
      department: department.trim().toUpperCase(),
      coefficient: coefNum / 100,
      owner: validatedOwner,
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
        const floor = (row.Piso || row.piso || '').toString().trim();
        const dept = (row.Departamento || row.depto || row.Depto || '').toString().trim();
        const rawCoef = (row.Coeficiente || row.coeficiente || '0').toString().replace(',', '.');
        const coef = parseFloat(rawCoef);
        const ownerRaw = (row.Propietario || row.propietario || '').toString().trim();
        const owner = ownerRaw === '' ? 'Sin Propietario' : ownerRaw;

        if (floor && dept && !isNaN(coef) && coef > 0 && coef <= 100) {
          onAdd({
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

  const handleDeletePayment = (e: React.MouseEvent, unitId: string, paymentId: string) => {
    e.stopPropagation();
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;
    if (!window.confirm('¿Eliminar este registro de pago?')) return;
    onUpdate({ ...unit, payments: (unit.payments || []).filter(p => p.id !== paymentId) });
  };

  const handleRemoveUnit = (e: React.MouseEvent, unitId: string) => {
    e.stopPropagation();
    if (window.confirm('¿Borrar unidad? Esta acción eliminará también su historial de pagos.')) {
      onRemove(unitId);
    }
  };

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Unidades Totales</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{units.length}</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-slate-400 rounded-xl flex items-center justify-center text-xl">🏠</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Carga de Coeficientes</p>
            <p className={`text-2xl font-black ${Math.abs(100 - totalCoefficient) < 0.01 ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100'}`}>
              {totalCoefficient.toFixed(2)}%
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-600 font-black">%</div>
        </div>

        <div className="bg-indigo-600 p-6 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-between text-white">
          <div>
            <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Recaudación Acumulada</p>
            <p className="text-2xl font-black tabular-nums">${formatMoney(totalCollected)}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-xl">💰</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 gap-4">
          <div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase text-xs tracking-[0.2em]">Censo de Unidades</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">Clic en una fila para ver el detalle de pagos</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">📥 Importar</button>
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".csv, .xlsx, .xls" />

            <button onClick={() => { setIsAdding(!isAdding); setError(null); }} className={`${isAdding ? 'bg-slate-200 text-slate-700' : 'bg-indigo-600 text-white shadow-lg'} px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95`}>
              {isAdding ? 'Cerrar Alta' : 'Nueva Unidad'}
            </button>
          </div>
        </div>

        {isAdding && (
          <div className="p-8 bg-indigo-50/30 dark:bg-indigo-900/10 border-b border-indigo-100 dark:border-indigo-900 animate-in slide-in-from-top-4 duration-300">
            {error && (
              <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border-2 border-red-500/20 text-red-700 dark:text-red-400 text-xs font-bold rounded-xl flex items-center gap-3 shadow-md animate-bounce-short">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Piso</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Ej: 1" value={formData.floor} onChange={e => handleInputChange('floor', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Depto</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Ej: A" value={formData.department} onChange={e => handleInputChange('department', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Coeficiente (%)</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border-2 border-indigo-100 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Ej: 1.25" value={formData.coefficient} onChange={e => handleInputChange('coefficient', e.target.value)} />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Propietario</label>
                <div className="flex gap-3">
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Nombre completo" value={formData.owner} onChange={e => handleInputChange('owner', e.target.value)} />
                  <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">Guardar</button>
                </div>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-8 py-6 w-16"></th>
                <th className="px-8 py-6">Unidad</th>
                <th className="px-8 py-6">Titular</th>
                <th className="px-8 py-6 text-center">Incidencia</th>
                <th className="px-8 py-6 text-right">Recaudado</th>
                <th className="px-8 py-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {units.map((unit, idx) => {
                const isExpanded = expandedUnitId === unit.id;
                const isEditingOwner = editingOwnerId === unit.id;
                const unitTotalPaid = unit.payments?.reduce((s, p) => s + p.amount, 0) || 0;
                const sortedPayments = unit.payments ? [...unit.payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

                return (
                  <React.Fragment key={unit.id}>
                    <tr
                      onClick={() => toggleExpand(unit.id)}
                      className={`group cursor-pointer transition-all duration-300 animate-slide-up animate-fill-both ${isExpanded ? 'bg-indigo-50/50 dark:bg-indigo-900/20 shadow-inner' : (idx % 2 !== 0 ? 'bg-slate-50/40 dark:bg-slate-800/20' : 'bg-white dark:bg-slate-900')} hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10`}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <td className="px-8 py-7">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isExpanded ? 'bg-indigo-600 text-white rotate-90' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-700'}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-xl text-slate-800 dark:text-slate-100">{unit.floor}{unit.department}</span>
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Piso {unit.floor}</span>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        {isEditingOwner ? (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <input type="text" className="px-4 py-2 rounded-xl border-2 border-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm outline-none" value={tempOwnerName} onChange={e => setTempOwnerName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' ? saveOwnerEdit(e as any, unit) : e.key === 'Escape' ? cancelOwnerEdit(e as any) : null} />
                            <button onClick={(e) => saveOwnerEdit(e, unit)} className="p-2 bg-emerald-500 text-white rounded-xl">✓</button>
                            <button onClick={(e) => cancelOwnerEdit(e)} className="p-2 bg-slate-200 text-slate-500 rounded-xl">×</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 group/name">
                            <span className="font-bold text-lg text-slate-700 dark:text-slate-200">{unit.owner}</span>
                            <button onClick={(e) => startEditingOwner(e, unit)} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-xl transition-all opacity-0 group-hover/name:opacity-100" title="Editar Propietario">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-7 text-center">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-black border border-slate-200 dark:border-slate-700">
                          {(unit.coefficient * 100).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-8 py-7 text-right">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums text-lg">${formatMoney(unitTotalPaid)}</span>
                      </td>
                      <td className="px-8 py-7 text-right">
                        <button onClick={(e) => handleRemoveUnit(e, unit.id)} className="text-slate-300 hover:text-red-500 transition-all p-2 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-50/50 dark:bg-slate-800/10">
                        <td colSpan={6} className="px-12 py-8 animate-in slide-in-from-top-2 duration-300">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-4">
                              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Información de Unidad</h5>
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 font-bold">Participación en Expensas:</span>
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">{(unit.coefficient * 100).toFixed(2)}%</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 font-bold">Total Cobros Recibidos:</span>
                                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{unit.payments?.length || 0}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 font-bold">Monto Acumulado:</span>
                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">${formatMoney(unitTotalPaid)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="lg:col-span-2">
                              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historial Cronológico de Pagos</h5>
                                </div>
                                {sortedPayments.length > 0 ? (
                                  <table className="w-full text-left">
                                    <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                                      <tr>
                                        <th className="px-6 py-3">Fecha de Recibo</th>
                                        <th className="px-6 py-3">Monto Cobrado</th>
                                        <th className="px-6 py-3 text-right">Acción</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                      {sortedPayments.map((p) => {
                                        const isEditingPayment = editingPaymentId === p.id;

                                        return (
                                          <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isEditingPayment ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}>
                                            <td className="px-6 py-4">
                                              {isEditingPayment ? (
                                                <input
                                                  type="date"
                                                  className="px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-xs font-bold"
                                                  value={tempPaymentDate}
                                                  onChange={e => setTempPaymentDate(e.target.value)}
                                                  onClick={e => e.stopPropagation()}
                                                />
                                              ) : (
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{formatDate(p.date)}</span>
                                              )}
                                            </td>
                                            <td className="px-6 py-4">
                                              {isEditingPayment ? (
                                                <div className="flex items-center gap-1">
                                                  <span className="text-emerald-600 font-black">$</span>
                                                  <input
                                                    type="text"
                                                    className="w-32 px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-xs font-black text-emerald-600 text-right tabular-nums"
                                                    value={tempPaymentAmount}
                                                    onChange={e => setTempPaymentAmount(handleAccountingInput(e.target.value))}
                                                    onClick={e => e.stopPropagation()}
                                                  />
                                                </div>
                                              ) : (
                                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">${formatMoney(p.amount)}</span>
                                              )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                              {isEditingPayment ? (
                                                <div className="flex justify-end gap-1">
                                                  <button onClick={(e) => savePaymentEdit(e, unit)} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm" title="Guardar cambios">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                  </button>
                                                  <button onClick={cancelPaymentEdit} className="p-1.5 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300" title="Cancelar">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                                  </button>
                                                </div>
                                              ) : (
                                                <div className="flex justify-end gap-1.5">
                                                  <button onClick={(e) => startEditingPayment(e, p)} className="text-slate-300 hover:text-indigo-500 p-1.5 transition-colors" title="Editar este pago">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                  </button>
                                                  <button onClick={(e) => handleDeletePayment(e, unit.id, p.id)} className="text-slate-300 hover:text-red-500 p-1.5 transition-colors" title="Eliminar este pago">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                  </button>
                                                </div>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div className="py-12 text-center">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic opacity-60">Sin movimientos registrados</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {units.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center text-slate-400 italic font-black uppercase tracking-widest opacity-50">
                    No hay unidades registradas en este edificio
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

export default UnitManager;
