
import React, { useState, useEffect } from 'react';
import { Unit, Expense, View, Building, CalendarEvent, BankAccount, BankTransaction, CashAudit, Liquidation, Cheque } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import UnitManager from './components/UnitManager';
import ExpenseManager from './components/ExpenseManager';
import IncomeManager from './components/IncomeManager';
import SettlementView from './components/SettlementView';
import AIHelper from './components/AIHelper';
import BuildingManager from './components/BuildingManager';
import CalendarView from './components/CalendarView';
import NeighborPortal from './components/NeighborPortal';
import BankBalanceManager from './components/BankBalanceManager';
import ProviderPortal from './components/ProviderPortal';
import { db } from './services/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const App: React.FC = () => {
  const [view, setView] = useState<View>('buildings');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [activeBuildingId, setActiveBuildingId] = useState<string | null>(null);
  const [portalData, setPortalData] = useState<{ bid: string, m: number, y: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('consorcio_dark_mode');
    return saved === 'true';
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('v');
    const bid = params.get('bid');
    const m = params.get('m');
    const y = params.get('y');

    if (v === 'portal' && bid && m && y) {
      setPortalData({ bid, m: parseInt(m), y: parseInt(y) });
      setView('neighbor-portal');
      setActiveBuildingId(bid);
    } else if (v === 'provider') {
      setView('provider-portal');
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('consorcio_dark_mode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    // Escuchar cambios en tiempo real desde Firestore
    const unsub = onSnapshot(doc(db, 'data', 'consorcio'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const firebaseBuildings = data.buildings || [];

        // Sincronizar estado local si es diferente
        setBuildings(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(firebaseBuildings)) {
            return firebaseBuildings;
          }
          return prev;
        });

        const lastActive = localStorage.getItem('consorcio_active_id');
        if (!portalData) {
          if (lastActive) setActiveBuildingId(lastActive);
          else if (firebaseBuildings.length > 0) setActiveBuildingId(firebaseBuildings[0].id);
        }
      } else {
        // Si no hay datos en Firebase, inicializar con el edificio por defecto
        const initialBuildings: Building[] = [{
          id: 'b1',
          name: 'Edificio Central',
          address: 'Av. Libertador 450',
          categories: ['mantenimiento', 'servicios', 'servicios públicos', 'sueldos', 'otros'],
          units: [
            { id: '1', floor: '1', department: 'A', coefficient: 0.25, owner: 'Juan Pérez', payments: [] },
            { id: '2', floor: '1', department: 'B', coefficient: 0.25, owner: 'María García', payments: [] },
            { id: '3', floor: '2', department: 'A', coefficient: 0.25, owner: 'Carlos Ruiz', payments: [] },
            { id: '4', floor: '2', department: 'B', coefficient: 0.25, owner: 'Elena López', payments: [] },
          ],
          expenses: [],
          events: [],
          bankAccounts: [],
          bankTransactions: [],
          cheques: [],
          cashAudits: [],
          liquidations: []
        }];
        setBuildings(initialBuildings);
        if (!portalData) setActiveBuildingId('b1');
        setDoc(doc(db, 'data', 'consorcio'), { buildings: initialBuildings });
      }
      setLoading(false);
    });

    return () => unsub();
  }, [portalData]);

  useEffect(() => {
    if (buildings.length > 0) {
      setDoc(doc(db, 'data', 'consorcio'), { buildings });
    }
  }, [buildings]);

  const activeBuilding = buildings.find(b => b.id === activeBuildingId);

  const updateActiveBuilding = (updater: (b: Building) => Building) => {
    setBuildings(prev => prev.map(b => b.id === activeBuildingId ? updater(b) : b));
  };

  const addBuilding = (b: Building) => {
    const newBuilding = {
      ...b,
      liquidations: b.liquidations || [],
      cheques: b.cheques || [],
      bankAccounts: b.bankAccounts || [],
      bankTransactions: b.bankTransactions || []
    };
    setBuildings([...buildings, newBuilding]);
    setActiveBuildingId(b.id);
    setView('dashboard');
  };

  const updateBuilding = (updatedBuilding: Building) => {
    setBuildings(prev => prev.map(b => b.id === updatedBuilding.id ? updatedBuilding : b));
  };

  const removeBuilding = (id: string) => {
    const remaining = buildings.filter(b => b.id !== id);
    setBuildings(remaining);
    if (activeBuildingId === id) {
      setActiveBuildingId(remaining.length > 0 ? remaining[0].id : null);
      setView('buildings');
    }
  };

  const addUnit = (unit: Unit) => updateActiveBuilding(b => ({ ...b, units: [...b.units, unit] }));
  const removeUnit = (id: string) => updateActiveBuilding(b => ({ ...b, units: b.units.filter(u => u.id !== id) }));
  const updateUnit = (updatedUnit: Unit) => updateActiveBuilding(b => ({
    ...b, units: b.units.map(u => u.id === updatedUnit.id ? updatedUnit : u)
  }));

  const addExpense = (expense: Expense) => updateActiveBuilding(b => ({ ...b, expenses: [...b.expenses, expense] }));

  const addExpenseToBuilding = (buildingId: string, expense: Expense) => {
    setBuildings(prev => prev.map(b => b.id === buildingId ? { ...b, expenses: [...(b.expenses || []), expense] } : b));
  };

  const removeExpense = (id: string) => updateActiveBuilding(b => ({ ...b, expenses: b.expenses.filter(e => e.id !== id) }));
  const updateExpense = (updatedExpense: Expense) => updateActiveBuilding(b => ({
    ...b, expenses: b.expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e)
  }));

  const bulkUpdateExpenses = (updatedExpenses: Expense[]) => updateActiveBuilding(b => ({
    ...b, expenses: updatedExpenses
  }));

  const handleUpdateCategories = (newCats: string[]) => updateActiveBuilding(b => ({ ...b, categories: newCats }));

  const addEvent = (event: CalendarEvent) => updateActiveBuilding(b => ({ ...b, events: [...(b.events || []), event] }));
  const removeEvent = (id: string) => updateActiveBuilding(b => ({ ...b, events: (b.events || []).filter(e => e.id !== id) }));

  // Bank & Cheque Handlers
  const addBankAccount = (acc: BankAccount) => updateActiveBuilding(b => ({ ...b, bankAccounts: [...(b.bankAccounts || []), acc] }));
  const addBankTransaction = (tx: BankTransaction) => updateActiveBuilding(b => ({ ...b, bankTransactions: [...(b.bankTransactions || []), tx] }));
  const bulkAddBankTransactions = (txs: BankTransaction[]) => updateActiveBuilding(b => ({ ...b, bankTransactions: [...(b.bankTransactions || []), ...txs] }));

  const addCheque = (cheque: Cheque) => updateActiveBuilding(b => ({ ...b, cheques: [...(b.cheques || []), cheque] }));
  const updateCheque = (updated: Cheque) => updateActiveBuilding(b => ({ ...b, cheques: (b.cheques || []).map(c => c.id === updated.id ? updated : c) }));
  const removeCheque = (id: string) => updateActiveBuilding(b => ({ ...b, cheques: (b.cheques || []).filter(c => c.id !== id) }));

  const addCashAudit = (audit: CashAudit) => updateActiveBuilding(b => ({ ...b, cashAudits: [...(b.cashAudits || []), audit] }));

  // Liquidations Handler
  const addLiquidation = (liq: Liquidation) => updateActiveBuilding(b => ({ ...b, liquidations: [...(b.liquidations || []), liq] }));

  const handlePreviewPortal = (m: number, y: number) => {
    if (activeBuilding) {
      setPortalData({ bid: activeBuilding.id, m, y });
      setView('neighbor-portal');
    }
  };

  if (view === 'neighbor-portal' && activeBuilding && portalData) {
    return <NeighborPortal
      building={activeBuilding}
      monthIdx={portalData.m}
      year={portalData.y}
      onBack={() => setView('settlements')}
    />;
  }

  const getViewTitle = (currentView: View) => {
    switch (currentView) {
      case 'buildings': return 'Mis Edificios';
      case 'dashboard': return 'Resumen General';
      case 'calendar': return 'Agenda del Consorcio';
      case 'units': return 'Unidades';
      case 'expenses': return 'Egresos / Gastos';
      case 'income': return 'Libro de Ingresos';
      case 'settlements': return 'Liquidaciones';
      case 'ai-helper': return 'Asistente IA';
      case 'bank-balance': return 'Balance Bancario';
      case 'provider-portal': return 'Terminal de Proveedores';
      default: return 'Panel';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Cargando ConsorcioFlow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar
        currentView={view}
        setView={setView}
        activeBuildingName={activeBuilding?.name}
        isDarkMode={darkMode}
        toggleDarkMode={() => setDarkMode(!darkMode)}
      />

      <main
        key={view}
        className="flex-1 overflow-y-auto h-screen p-8 animate-fade-in"
      >
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              {getViewTitle(view)}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {activeBuilding ? `Edificio: ${activeBuilding.name}` : 'Selecciona un edificio para comenzar.'}
            </p>
          </div>
          {activeBuilding && view !== 'provider-portal' && (
            <div className="flex gap-4">
              <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase text-[10px] tracking-widest">Unidades: {activeBuilding.units.length}</span>
              </div>
            </div>
          )}
        </header>

        <div className="max-w-6xl mx-auto pb-20">
          {view === 'buildings' && (
            <BuildingManager
              buildings={buildings}
              activeBuildingId={activeBuildingId}
              onSelect={(id) => { setActiveBuildingId(id); setView('dashboard'); }}
              onAdd={addBuilding}
              onUpdate={updateBuilding}
              onRemove={removeBuilding}
            />
          )}

          {view === 'provider-portal' && (
            <ProviderPortal buildings={buildings} onAddExpense={addExpenseToBuilding} />
          )}

          {!activeBuilding && view !== 'buildings' && view !== 'provider-portal' ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">No hay edificio seleccionado</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6">Debes seleccionar o crear un edificio antes de gestionar sus datos.</p>
              <button onClick={() => setView('buildings')} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100">Ir a Mis Edificios</button>
            </div>
          ) : (
            <>
              {view === 'dashboard' && activeBuilding && (
                <Dashboard units={activeBuilding.units} expenses={activeBuilding.expenses} />
              )}
              {view === 'calendar' && activeBuilding && (
                <CalendarView
                  events={activeBuilding.events || []}
                  expenses={activeBuilding.expenses || []}
                  onAddEvent={addEvent}
                  onRemoveEvent={removeEvent}
                />
              )}
              {view === 'units' && activeBuilding && (
                <UnitManager
                  units={activeBuilding.units}
                  onAdd={addUnit}
                  onRemove={removeUnit}
                  onUpdate={updateUnit}
                />
              )}
              {view === 'expenses' && activeBuilding && (
                <ExpenseManager
                  expenses={activeBuilding.expenses}
                  onAdd={addExpense}
                  onRemove={removeExpense}
                  onUpdate={updateExpense}
                  onBulkUpdate={bulkUpdateExpenses}
                  categories={activeBuilding.categories}
                  onUpdateCategories={handleUpdateCategories}
                />
              )}
              {view === 'income' && activeBuilding && (
                <IncomeManager
                  units={activeBuilding.units}
                  onUpdateUnit={updateUnit}
                  buildingName={activeBuilding.name}
                  buildingAddress={activeBuilding.address}
                />
              )}
              {view === 'settlements' && activeBuilding && (
                <SettlementView
                  buildingId={activeBuilding.id}
                  units={activeBuilding.units}
                  expenses={activeBuilding.expenses}
                  liquidations={activeBuilding.liquidations || []}
                  buildingName={activeBuilding.name}
                  buildingAddress={activeBuilding.address}
                  onPreviewPortal={handlePreviewPortal}
                  onAddLiquidation={addLiquidation}
                />
              )}
              {view === 'ai-helper' && activeBuilding && (
                <AIHelper units={activeBuilding.units} expenses={activeBuilding.expenses} />
              )}
              {view === 'bank-balance' && activeBuilding && (
                <BankBalanceManager
                  buildingName={activeBuilding.name}
                  accounts={activeBuilding.bankAccounts || []}
                  transactions={activeBuilding.bankTransactions || []}
                  cheques={activeBuilding.cheques || []}
                  audits={activeBuilding.cashAudits || []}
                  onAddAccount={addBankAccount}
                  onAddTransaction={addBankTransaction}
                  onBulkAddTransactions={bulkAddBankTransactions}
                  onAddCheque={addCheque}
                  onUpdateCheque={updateCheque}
                  onRemoveCheque={removeCheque}
                  onAddAudit={addCashAudit}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
