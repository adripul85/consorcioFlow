
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Expense } from '../types';
import { exportToCSV, exportToExcel, parseFile } from '../services/dataService';
import { getCategoryIcon, formatMoney, handleAccountingInput, parseAccountingValue } from './Dashboard';

interface ExpenseManagerProps {
  expenses: Expense[];
  onAdd: (expense: Expense) => void;
  onRemove: (id: string) => void;
  onUpdate: (expense: Expense) => void;
  onBulkUpdate: (expenses: Expense[]) => void;
  categories: string[];
  onUpdateCategories: (newCategories: string[]) => void;
}

type SortKey = 'date' | 'description' | 'amount';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'pending' | 'paid' | 'to_approve';

const ExpenseManager: React.FC<ExpenseManagerProps> = ({
  expenses,
  onAdd,
  onRemove,
  onUpdate,
  onBulkUpdate,
  categories,
  onUpdateCategories
}) => {
  const importFileRef = useRef<HTMLInputElement>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  const [isAddingNewCategoryInForm, setIsAddingNewCategoryInForm] = useState(false);
  const [newCategoryNameInForm, setNewCategoryNameInForm] = useState('');

  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection }>({
    key: 'date',
    direction: 'desc'
  });
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterText, setFilterText] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const getTodayISO = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    description: '',
    amount: '0.00',
    category: categories[0] || 'otros',
    date: getTodayISO(),
    paid: false,
    notes: '',
    receiptUrl: ''
  });

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ ...toast, show: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showSuccessToast = (msg: string) => {
    setToast({ show: true, message: msg });
  };

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const pendingApprovalCount = useMemo(() => expenses.filter(e => e.status === 'pending').length, [expenses]);

  const displayedExpenses = useMemo(() => {
    let result = [...expenses];

    if (filterStatus === 'to_approve') {
      result = result.filter(e => e.status === 'pending');
    } else {
      // Excluir pendientes si no estamos en 'para aprobar'
      result = result.filter(e => e.status !== 'pending');

      if (filterStatus === 'pending') result = result.filter(e => !e.paid);
      else if (filterStatus === 'paid') result = result.filter(e => e.paid);
    }

    if (filterText) {
      const search = filterText.toLowerCase();
      result = result.filter(e => e.description.toLowerCase().includes(search));
    }

    if (filterCategory !== 'all') {
      result = result.filter(e => e.category === filterCategory);
    }

    // Lógica de ordenamiento mejorada
    result.sort((a, b) => {
      if (sortConfig.key === 'amount') {
        return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      if (sortConfig.key === 'date') {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
      }
      if (sortConfig.key === 'description') {
        const descA = a.description.toLowerCase();
        const descB = b.description.toLowerCase();
        return sortConfig.direction === 'asc'
          ? descA.localeCompare(descB)
          : descB.localeCompare(descA);
      }
      return 0;
    });
    return result;
  }, [expenses, sortConfig, filterStatus, filterText, filterCategory]);

  const isoToDisplayDate = (isoDate: string) => {
    try {
      const parts = isoDate.split('-');
      if (parts.length !== 3) return isoDate;
      const [y, m, d] = parts;
      return `${d}/${m}/${y}`;
    } catch { return isoDate; }
  };

  const handleExport = (type: 'csv' | 'excel') => {
    const dataToExport = expenses.map(e => ({
      Fecha: isoToDisplayDate(e.date),
      Descripcion: e.description,
      Categoria: e.category.toUpperCase(),
      Monto: e.amount,
      Estado: e.paid ? 'PAGADO' : 'PENDIENTE',
      Notas: e.notes || ''
    }));
    if (type === 'csv') exportToCSV(dataToExport, 'Gastos_Consorcio');
    else exportToExcel(dataToExport, 'Gastos_Consorcio', 'Gastos');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseFile(file);
      let count = 0;
      data.forEach((row: any) => {
        const desc = row.Descripcion || row.descripcion || row.Concepto || '';
        const amountStr = (row.Monto || row.monto || row.Importe || '0').toString().replace(',', '.');
        const amount = parseFloat(amountStr);
        const dateStr = row.Fecha || row.fecha || getTodayISO();
        const cat = (row.Categoria || row.categoria || 'otros').toLowerCase();
        const isPaid = (row.Estado || row.estado || '').toLowerCase() === 'pagado';

        if (desc && amount > 0) {
          let isoDate = getTodayISO();
          try {
            if (dateStr.includes('-')) {
              const parts = dateStr.split('-');
              if (parts[0].length === 4) isoDate = dateStr;
              else isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          } catch { }
          onAdd({
            id: Math.random().toString(36).substr(2, 9),
            description: desc.toString(),
            amount: amount,
            category: categories.includes(cat) ? cat : 'otros',
            date: isoDate,
            paid: isPaid,
            status: 'approved',
            notes: row.Notas || row.notes || ''
          });
          count++;
        }
      });
      showSuccessToast('Gasto guardado con éxito');
    } catch (err: any) {
      alert(`Error al importar: ${err.message}`);
    } finally {
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingExpenseId(null);
    setFormError(null);
    setIsAddingNewCategoryInForm(false);
    setNewCategoryNameInForm('');
    setFormData({
      description: '',
      amount: '0.00',
      category: categories[0] || 'otros',
      date: getTodayISO(),
      paid: false,
      notes: '',
      receiptUrl: ''
    });
  };

  const handleAddNewCategory = () => {
    const newCat = newCategoryNameInForm.trim().toLowerCase();
    if (newCat && !categories.includes(newCat)) {
      onUpdateCategories([...categories, newCat]);
      setFormData({ ...formData, category: newCat });
      setIsAddingNewCategoryInForm(false);
      setNewCategoryNameInForm('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    let { description, amount, date, category, paid, notes, receiptUrl } = formData;

    if (!description.trim()) {
      setFormError('La descripción es obligatoria.');
      return;
    }

    const numAmount = parseAccountingValue(amount);
    if (numAmount <= 0) {
      setFormError('Monto inválido.');
      return;
    }

    onAdd({
      id: editingExpenseId || Math.random().toString(36).substr(2, 9),
      description: description.trim(),
      amount: numAmount,
      category: category,
      date: date,
      paid: paid,
      status: 'approved',
      notes: notes.trim(),
      receiptUrl: receiptUrl
    });
    showSuccessToast('Gasto guardado con éxito');
    cancelForm();
  };

  const handleApprove = (expense: Expense) => {
    onUpdate({ ...expense, status: 'approved' });
    showSuccessToast('Gasto guardado con éxito');
  };

  const handleRemoveExpense = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este gasto?')) {
      onRemove(id);
    }
  };

  const totalAmount = expenses.filter(e => e.status !== 'pending').reduce((sum, e) => sum + e.amount, 0);

  const SortIndicator = ({ columnKey }: { columnKey: SortKey }) => {
    const isActive = sortConfig.key === columnKey;
    return (
      <span className={`inline-flex flex-col ml-1 align-middle ${isActive ? 'text-indigo-600' : 'text-slate-300'}`}>
        <span className={`leading-none text-[7px] ${isActive && sortConfig.direction === 'asc' ? 'opacity-100' : 'opacity-30'}`}>▲</span>
        <span className={`leading-none text-[7px] ${isActive && sortConfig.direction === 'desc' ? 'opacity-100' : 'opacity-30'}`}>▼</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 relative min-h-screen">
      {/* Alerta de Gastos Pendientes de Proveedores */}
      {pendingApprovalCount > 0 && filterStatus !== 'to_approve' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 p-6 rounded-3xl flex items-center justify-between animate-bounce-short">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 text-2xl shadow-lg">📥</div>
            <div>
              <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Revisión de Proveedores</h4>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Tienes {pendingApprovalCount} gastos pendientes de validación.</p>
            </div>
          </div>
          <button
            onClick={() => setFilterStatus('to_approve')}
            className="px-6 py-3 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-amber-700 transition-all"
          >
            Revisar Bandeja
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-100 dark:shadow-none">💸</div>
            <div>
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Libro Oficial de Egresos</h3>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100 tabular-nums">${formatMoney(totalAmount)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdding(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
            >
              + Gasto Directo
            </button>
            <div className="relative group">
              <button className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:text-indigo-600 transition-colors" title="Exportar">
                📤
              </button>
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 hidden group-hover:block z-20 overflow-hidden">
                <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase hover:bg-indigo-50 dark:hover:bg-slate-800">CSV</button>
                <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase hover:bg-indigo-50 dark:hover:bg-slate-800">Excel</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border-2 border-indigo-100 dark:border-indigo-900 shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Registrar Nuevo Gasto</h4>
            <button onClick={cancelForm} className="text-slate-400 hover:text-rose-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {formError && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl animate-bounce-short border border-rose-100 dark:border-rose-800">
              ⚠️ {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción / Concepto</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Mantenimiento Ascensor #1"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto ($)</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl border-2 border-indigo-50 dark:border-indigo-900 bg-white dark:bg-slate-900 font-black text-sm text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500 text-right tabular-nums"
                placeholder="0.00"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: handleAccountingInput(e.target.value) })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
              {!isAddingNewCategoryInForm ? (
                <div className="flex gap-2">
                  <select
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {getCategoryIcon(cat)} {cat.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setIsAddingNewCategoryInForm(true)} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600" title="Nueva Categoría">+</button>
                </div>
              ) : (
                <div className="flex gap-2 animate-in zoom-in-95">
                  <input
                    type="text"
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-indigo-200 bg-white dark:bg-slate-900 font-bold text-sm outline-none"
                    placeholder="Nueva..."
                    value={newCategoryNameInForm}
                    onChange={e => setNewCategoryNameInForm(e.target.value)}
                    autoFocus
                  />
                  <button type="button" onClick={handleAddNewCategory} className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase">Ok</button>
                  <button type="button" onClick={() => setIsAddingNewCategoryInForm(false)} className="px-3 py-3 bg-slate-100 rounded-xl text-slate-400">×</button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
              <input
                type="date"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="flex items-end gap-6">
              <label className="flex items-center gap-3 cursor-pointer group pb-1">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded-lg border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                  checked={formData.paid}
                  onChange={e => setFormData({ ...formData, paid: e.target.checked })}
                />
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest group-hover:text-indigo-600">¿Ya está pagado?</span>
              </label>
              <button
                type="submit"
                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
              >
                Guardar Gasto
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3 transition-all">
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full md:w-auto">
          {(['all', 'pending', 'paid', 'to_approve'] as FilterStatus[]).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === status ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100 dark:border-slate-700' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              {status === 'all' ? `Oficiales` : status === 'pending' ? `Pendientes Pago` : status === 'paid' ? `Pagados` : `Por Aprobar (${pendingApprovalCount})`}
            </button>
          ))}
        </div>

        <div className="flex-1 relative w-full">
          <input
            type="text"
            placeholder="Buscar por concepto..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border-none bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
        </div>

        <div className="w-full md:w-48">
          <select
            className="w-full px-4 py-2.5 rounded-xl border-none bg-slate-100 dark:bg-slate-900 font-bold text-[9px] uppercase text-slate-500 dark:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="all">Todas las Categorías</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {getCategoryIcon(cat)} {cat.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed min-w-[900px]">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase text-[9px] font-black tracking-widest border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="w-32 px-8 py-5 cursor-pointer group" onClick={() => requestSort('date')}>
                  <div className="flex items-center">
                    Fecha <SortIndicator columnKey="date" />
                  </div>
                </th>
                <th className="w-auto px-8 py-5 cursor-pointer group" onClick={() => requestSort('description')}>
                  <div className="flex items-center">
                    Concepto <SortIndicator columnKey="description" />
                  </div>
                </th>
                <th className="w-48 px-8 py-5">Categoría</th>
                <th className="w-44 px-8 py-5 text-right cursor-pointer group" onClick={() => requestSort('amount')}>
                  <div className="flex items-center justify-end">
                    Monto <SortIndicator columnKey="amount" />
                  </div>
                </th>
                <th className="w-32 px-8 py-5 text-center">Estado</th>
                <th className="w-44 px-8 py-5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedExpenses.map((expense) => (
                <tr key={expense.id} className={`hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-colors ${expense.status === 'pending' ? 'bg-amber-50/40 dark:bg-amber-900/10 border-l-4 border-amber-500' : ''}`}>
                  <td className="px-8 py-5 text-[10px] font-black tabular-nums">{isoToDisplayDate(expense.date)}</td>
                  <td className={`px-8 py-5 font-bold text-xs ${expense.paid ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                    {expense.description}
                    {expense.status === 'pending' && <span className="ml-2 px-1.5 py-0.5 bg-amber-600 text-white rounded text-[8px] font-black uppercase">Externo</span>}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <span className="text-base" title={expense.category}>{getCategoryIcon(expense.category)}</span>
                      <span className="px-2 py-1 rounded-lg text-[8px] font-black uppercase border bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800 truncate">
                        {expense.category}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right font-black tabular-nums text-sm text-slate-900 dark:text-slate-100">${formatMoney(expense.amount)}</td>
                  <td className="px-8 py-5 text-center">
                    <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase border ${expense.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' : (expense.paid ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800')}`}>
                      {expense.status === 'pending' ? 'Revisión' : (expense.paid ? 'Pagado' : 'Pendiente')}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      {expense.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(expense)}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[8px] font-black uppercase shadow-lg hover:bg-emerald-700"
                        >
                          Aprobar
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveExpense(expense.id)}
                        className="text-slate-300 hover:text-rose-500 transition-all p-2 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayedExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center text-slate-400 italic font-black uppercase tracking-widest opacity-50">
                    No hay egresos en esta bandeja
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <span className="text-lg">✅</span>
            <span className="font-black text-xs uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManager;
