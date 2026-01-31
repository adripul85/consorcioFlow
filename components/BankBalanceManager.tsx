import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BankAccount, BankTransaction, CashAudit, Cheque } from '../types';
import { parseFile } from '../services/dataService';
import { standardizeBankTransactions } from '../services/geminiService';
import { formatMoney, handleAccountingInput, parseAccountingValue } from '../services/accountingUtils';

interface BankBalanceManagerProps {
   buildingName: string;
   accounts: BankAccount[];
   transactions: BankTransaction[];
   cheques: Cheque[];
   audits: CashAudit[];
   onAddAccount: (acc: BankAccount) => void;
   onAddTransaction: (tx: BankTransaction) => void;
   onBulkAddTransactions: (txs: BankTransaction[]) => void;
   onAddCheque: (cheque: Cheque) => void;
   onUpdateCheque: (cheque: Cheque) => void;
   onRemoveCheque: (id: string) => void;
   onAddAudit: (audit: CashAudit) => void;
}

type Tab = 'ledger' | 'cheques' | 'accounts' | 'audits';

const BankBalanceManager: React.FC<BankBalanceManagerProps> = ({
   buildingName, accounts, transactions, cheques, audits, onAddAccount, onAddTransaction, onBulkAddTransactions, onAddCheque, onUpdateCheque, onRemoveCheque, onAddAudit
}) => {
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [activeTab, setActiveTab] = useState<Tab>('ledger');
   const [isAddingTransaction, setIsAddingTransaction] = useState(false);
   const [isAddingAccount, setIsAddingAccount] = useState(false);
   const [isAddingAudit, setIsAddingAudit] = useState(false);
   const [isAddingCheque, setIsAddingCheque] = useState(false);
   const [isAiProcessing, setIsAiProcessing] = useState(false);

   // States para formularios
   const [txForm, setTxForm] = useState({
      accountId: '', description: '', type: 'debit' as 'debit' | 'credit', amount: '0.00', reference: '', entityName: '', date: new Date().toISOString().split('T')[0]
   });

   const [chequeForm, setChequeForm] = useState({
      number: '', bank: '', amount: '0.00', issueDate: new Date().toISOString().split('T')[0], dueDate: new Date().toISOString().split('T')[0], entityName: '', type: 'received' as 'received' | 'issued', status: 'pending' as any
   });

   const [accountForm, setAccountForm] = useState({
      bankName: '',
      accountNumber: '',
      fantasyName: '',
      businessName: '',
      ownerFullName: '',
      initialBalance: '0.00'
   });

   // Cálculos de saldos
   const accountBalances = useMemo(() => {
      const balances: Record<string, number> = {};
      accounts.forEach(acc => { balances[acc.id] = acc.initialBalance; });
      transactions.forEach(tx => {
         if (balances[tx.accountId] !== undefined) {
            if (tx.type === 'credit') balances[tx.accountId] += tx.amount;
            else balances[tx.accountId] -= tx.amount;
         }
      });
      return balances;
   }, [accounts, transactions]);

   const totalBalance = useMemo(() => {
      const values = Object.values(accountBalances);
      // Fix: Explicitly type reduce parameters to resolve 'unknown' type error in line 68
      return values.length > 0 ? values.reduce((sum: number, b: number) => sum + b, 0) : 0;
   }, [accountBalances]);

   const chequesSummary = useMemo(() => {
      const received = cheques.filter(c => c.type === 'received' && c.status === 'pending');
      const inPortfolio = received.reduce((s, c) => s + c.amount, 0);
      const totalIssued = cheques.filter(c => c.type === 'issued' && c.status === 'pending').reduce((s, c) => s + c.amount, 0);
      return { inPortfolio, totalIssued };
   }, [cheques]);

   const handleAddTx = (e: React.FormEvent) => {
      e.preventDefault();
      const amountNum = parseAccountingValue(txForm.amount);
      if (!txForm.accountId || amountNum <= 0) return;
      onAddTransaction({ id: Math.random().toString(36).substr(2, 9), ...txForm, amount: amountNum });
      setIsAddingTransaction(false);
      setTxForm({ accountId: '', description: '', type: 'debit', amount: '0.00', reference: '', entityName: '', date: new Date().toISOString().split('T')[0] });
   };

   const handleAddCheque = (e: React.FormEvent) => {
      e.preventDefault();
      const amountNum = parseAccountingValue(chequeForm.amount);
      if (amountNum <= 0) return;
      onAddCheque({ id: Math.random().toString(36).substr(2, 9), ...chequeForm, amount: amountNum });
      setIsAddingCheque(false);
      setChequeForm({ number: '', bank: '', amount: '0.00', issueDate: new Date().toISOString().split('T')[0], dueDate: new Date().toISOString().split('T')[0], entityName: '', type: 'received', status: 'pending' });
   };

   const handleAddAccount = (e: React.FormEvent) => {
      e.preventDefault();
      const initialBal = parseAccountingValue(accountForm.initialBalance);
      if (!accountForm.bankName || !accountForm.fantasyName) {
         alert("Por favor completa el nombre del banco y el alias de la cuenta.");
         return;
      }

      onAddAccount({
         id: Math.random().toString(36).substr(2, 9),
         bankName: accountForm.bankName,
         accountNumber: accountForm.accountNumber,
         fantasyName: accountForm.fantasyName,
         businessName: accountForm.businessName || accountForm.bankName,
         ownerFullName: accountForm.ownerFullName,
         initialBalance: initialBal
      });

      setIsAddingAccount(false);
      setAccountForm({
         bankName: '',
         accountNumber: '',
         fantasyName: '',
         businessName: '',
         ownerFullName: '',
         initialBalance: '0.00'
      });
   };

   const clearCheque = (cheque: Cheque) => {
      if (accounts.length === 0) {
         alert("Debes tener al menos una cuenta bancaria para cobrar un cheque.");
         return;
      }
      const accId = accounts[0].id;
      onUpdateCheque({ ...cheque, status: 'cleared' });
      onAddTransaction({
         id: Math.random().toString(36).substr(2, 9),
         accountId: accId,
         date: new Date().toISOString().split('T')[0],
         description: `COBRO CHEQUE #${cheque.number} - ${cheque.bank}`,
         type: cheque.type === 'received' ? 'credit' : 'debit',
         amount: cheque.amount,
         reference: `CHQ ${cheque.number}`,
         entityName: cheque.entityName
      });
   };

   const ledgerEntries = useMemo(() => {
      let currentTotal = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
      return [...transactions]
         .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
         .map(tx => {
            if (tx.type === 'credit') currentTotal += tx.amount;
            else currentTotal -= tx.amount;
            return { ...tx, runningBalance: currentTotal };
         })
         .reverse();
   }, [transactions, accounts]);

   return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">

         {/* Header Consolidated */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-12 opacity-5"><span className="text-9xl">🏦</span></div>
               <div className="relative z-10">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] block mb-2">Liquidez Total Consolidada</span>
                  <h3 className="text-6xl font-black tabular-nums">${formatMoney(totalBalance)}</h3>
                  <div className="flex gap-8 mt-8">
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cheques en Cartera</p>
                        <p className="text-lg font-bold text-emerald-400">${formatMoney(chequesSummary.inPortfolio)}</p>
                     </div>
                     <div className="border-l border-white/10 pl-8">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cheques Diferidos (A Pagar)</p>
                        <p className="text-lg font-bold text-rose-400">${formatMoney(chequesSummary.totalIssued)}</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
               <div className="space-y-6">
                  <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Conciliación Bancaria</p>
                     <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{transactions.length}</span>
                        <span className="text-xs font-bold text-slate-400">Movimientos</span>
                     </div>
                  </div>
                  <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                     <button
                        onClick={() => setIsAddingCheque(true)}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all"
                     >
                        + Cargar Cheque
                     </button>
                  </div>
               </div>
            </div>
         </div>

         {/* Tabs Navigation */}
         <div className="flex gap-8 border-b border-slate-200 dark:border-slate-800">
            {(['ledger', 'cheques', 'accounts', 'audits'] as Tab[]).map(tab => (
               <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                     }`}
               >
                  {tab === 'ledger' ? 'Libro Diario' : tab === 'cheques' ? 'Cartera de Cheques' : tab === 'accounts' ? 'Cuentas' : 'Arqueos'}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full" />}
               </button>
            ))}
         </div>

         {/* Tab Content: Ledger */}
         {activeTab === 'ledger' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
               <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Movimientos de Fondos</h4>
                  <button onClick={() => setIsAddingTransaction(true)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">+ Nuevo Movimiento</button>
               </div>

               <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase text-[9px] font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                           <tr>
                              <th className="px-8 py-5">Fecha</th>
                              <th className="px-8 py-5">Concepto / Entidad</th>
                              <th className="px-8 py-5">Ref.</th>
                              <th className="px-8 py-5 text-right">Egresos</th>
                              <th className="px-8 py-5 text-right">Ingresos</th>
                              <th className="px-8 py-5 text-right">Saldo</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           {ledgerEntries.map(entry => (
                              <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                 <td className="px-8 py-5 text-[10px] font-black tabular-nums text-slate-400">{entry.date.split('-').reverse().join('/')}</td>
                                 <td className="px-8 py-5">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{entry.description}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase">{entry.entityName}</p>
                                 </td>
                                 <td className="px-8 py-5 text-[10px] font-bold text-slate-400">{entry.reference || '-'}</td>
                                 <td className="px-8 py-5 text-right text-sm font-black text-rose-500 tabular-nums">{entry.type === 'debit' ? `$${formatMoney(entry.amount)}` : ''}</td>
                                 <td className="px-8 py-5 text-right text-sm font-black text-emerald-500 tabular-nums">{entry.type === 'credit' ? `$${formatMoney(entry.amount)}` : ''}</td>
                                 <td className="px-8 py-5 text-right text-sm font-black text-indigo-600 dark:text-indigo-400 tabular-nums">${formatMoney(entry.runningBalance)}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         )}

         {/* Tab Content: Cheques */}
         {activeTab === 'cheques' && (
            <div className="space-y-8 animate-in slide-in-from-right-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm">
                     <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
                        <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Cheques Recibidos</h4>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">EN CARTERA</span>
                     </div>
                     <div className="p-4 flex-1">
                        <div className="space-y-3">
                           {cheques.filter(c => c.type === 'received').map(c => (
                              <div key={c.id} className={`p-5 rounded-2xl border transition-all ${c.status === 'cleared' ? 'bg-slate-50 dark:bg-slate-800 opacity-60 grayscale' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm'}`}>
                                 <div className="flex justify-between items-start mb-3">
                                    <div>
                                       <p className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">{c.bank}</p>
                                       <p className="text-sm font-black text-slate-800 dark:text-slate-100"># {c.number}</p>
                                    </div>
                                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">${formatMoney(c.amount)}</p>
                                 </div>
                                 <div className="flex justify-between items-end">
                                    <div>
                                       <p className="text-[8px] font-bold text-slate-400 uppercase">Emisor</p>
                                       <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{c.entityName}</p>
                                    </div>
                                    {c.status === 'pending' ? (
                                       <button
                                          onClick={() => clearCheque(c)}
                                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg transition-all"
                                       >
                                          Depositar
                                       </button>
                                    ) : (
                                       <span className="text-[9px] font-black text-slate-400 uppercase">DEPÓSITADO</span>
                                    )}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm">
                     <div className="p-6 bg-rose-50 dark:bg-rose-900/20 border-b border-rose-100 dark:border-rose-800 flex justify-between items-center">
                        <h4 className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">Cheques Emitidos</h4>
                        <span className="text-[10px] font-black text-rose-600 bg-rose-100 px-3 py-1 rounded-full">PASIVOS</span>
                     </div>
                     <div className="p-4 flex-1">
                        <div className="space-y-3">
                           {cheques.filter(c => c.type === 'issued').map(c => (
                              <div key={c.id} className={`p-5 rounded-2xl border transition-all ${c.status === 'cleared' ? 'bg-slate-50 dark:bg-slate-800 opacity-60 grayscale' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm'}`}>
                                 <div className="flex justify-between items-start mb-3">
                                    <div>
                                       <p className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">{c.bank}</p>
                                       <p className="text-sm font-black text-slate-800 dark:text-slate-100"># {c.number}</p>
                                    </div>
                                    <p className="text-lg font-black text-rose-500 tabular-nums">${formatMoney(c.amount)}</p>
                                 </div>
                                 <div className="flex justify-between items-end">
                                    <div>
                                       <p className="text-[8px] font-bold text-slate-400 uppercase">A la orden de</p>
                                       <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{c.entityName}</p>
                                    </div>
                                    {c.status === 'pending' ? (
                                       <button
                                          onClick={() => clearCheque(c)}
                                          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black shadow-lg transition-all"
                                       >
                                          Conciliar
                                       </button>
                                    ) : (
                                       <span className="text-[9px] font-black text-slate-400 uppercase">CONCILIADO</span>
                                    )}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Tab Content: Accounts */}
         {activeTab === 'accounts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-right-4">
               {accounts.map(acc => (
                  <div key={acc.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col group hover:border-indigo-500 transition-all">
                     <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">💳</div>
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">{acc.bankName}</span>
                     </div>
                     <h5 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-1">{acc.fantasyName}</h5>
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-6 truncate">{acc.accountNumber}</p>
                     <div className="mt-auto">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Sistema</p>
                        <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">${formatMoney(accountBalances[acc.id] || 0)}</p>
                     </div>
                  </div>
               ))}
               <button
                  onClick={() => setIsAddingAccount(true)}
                  className="border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 text-slate-300 hover:text-indigo-400 hover:border-indigo-100 transition-all min-h-[220px]"
               >
                  <span className="text-4xl">+</span>
                  <p className="text-[10px] font-black uppercase tracking-widest">Nueva Cuenta</p>
               </button>
            </div>
         )}

         {/* Modal Nueva Cuenta */}
         {isAddingAccount && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddingAccount(false)} />
               <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center">
                     <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Vincular Cuenta Bancaria</h3>
                     <button onClick={() => setIsAddingAccount(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors text-2xl">×</button>
                  </div>
                  <form onSubmit={handleAddAccount} className="p-10 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Banco</label>
                           <input
                              type="text"
                              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                              placeholder="Ej: Banco Galicia"
                              value={accountForm.bankName}
                              onChange={e => setAccountForm({ ...accountForm, bankName: e.target.value })}
                              required
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alias de la Cuenta</label>
                           <input
                              type="text"
                              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                              placeholder="Ej: Cuenta Principal"
                              value={accountForm.fantasyName}
                              onChange={e => setAccountForm({ ...accountForm, fantasyName: e.target.value })}
                              required
                           />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CBU / CVU / Nro de Cuenta</label>
                           <input
                              type="text"
                              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                              placeholder="007000123000..."
                              value={accountForm.accountNumber}
                              onChange={e => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                              required
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titular de la Cuenta</label>
                           <input
                              type="text"
                              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                              placeholder="Nombre completo"
                              value={accountForm.ownerFullName}
                              onChange={e => setAccountForm({ ...accountForm, ownerFullName: e.target.value })}
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Saldo Inicial ($)</label>
                           <input
                              type="text"
                              className="w-full px-5 py-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/20 dark:bg-slate-950 font-black text-lg text-indigo-600 outline-none focus:border-indigo-500 text-right tabular-nums transition-all"
                              value={accountForm.initialBalance}
                              onChange={e => setAccountForm({ ...accountForm, initialBalance: handleAccountingInput(e.target.value) })}
                              required
                           />
                        </div>
                     </div>
                     <div className="pt-6 flex gap-4">
                        <button type="button" onClick={() => setIsAddingAccount(false)} className="flex-1 px-8 py-5 rounded-2xl font-black text-slate-400 uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-colors">Cancelar</button>
                        <button type="submit" className="flex-[2] bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-indigo-100 uppercase tracking-widest text-[10px] hover:bg-indigo-700 active:scale-95 transition-all">Vincular Cuenta</button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* Modal Nueva Transacción */}
         {isAddingTransaction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddingTransaction(false)} />
               <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center">
                     <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Nuevo Movimiento Bancario</h3>
                     <button onClick={() => setIsAddingTransaction(false)} className="p-2 text-slate-400">×</button>
                  </div>
                  <form onSubmit={handleAddTx} className="p-10 space-y-6">
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cuenta</label>
                           <select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none focus:border-indigo-500" value={txForm.accountId} onChange={e => setTxForm({ ...txForm, accountId: e.target.value })} required>
                              <option value="">Seleccionar...</option>
                              {accounts.map(a => <option key={a.id} value={a.id}>{a.fantasyName}</option>)}
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                           <select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none focus:border-indigo-500" value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value as any })}>
                              <option value="debit">DEBE (Salida)</option>
                              <option value="credit">HABER (Entrada)</option>
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Importe ($)</label>
                           <input type="text" className="w-full px-5 py-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/20 dark:bg-slate-950 font-black text-lg text-indigo-600 outline-none focus:border-indigo-500 text-right tabular-nums" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: handleAccountingInput(e.target.value) })} required />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Concepto</label>
                           <input type="text" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none focus:border-indigo-500" value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} placeholder="Ej: Transferencia Recibida" required />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entidad/Contraparte</label>
                           <input type="text" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none focus:border-indigo-500" value={txForm.entityName} onChange={e => setTxForm({ ...txForm, entityName: e.target.value })} placeholder="Juan Perez o AySA" required />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CBU/ALIAS (Opcional)</label>
                           <input type="text" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none focus:border-indigo-500" value={txForm.reference} onChange={e => setTxForm({ ...txForm, reference: e.target.value })} placeholder="Para transferencias..." />
                        </div>
                     </div>
                     <div className="pt-6 flex gap-4">
                        <button type="button" onClick={() => setIsAddingTransaction(false)} className="flex-1 px-8 py-5 rounded-2xl font-black text-slate-400 uppercase tracking-widest text-[10px]">Descartar</button>
                        <button type="submit" className="flex-[2] bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-indigo-100 uppercase tracking-widest text-[10px]">Cargar Movimiento</button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* Modal Nuevo Cheque */}
         {isAddingCheque && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddingCheque(false)} />
               <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center">
                     <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Carga de Valores</h3>
                     <button onClick={() => setIsAddingCheque(false)} className="p-2 text-slate-400">×</button>
                  </div>
                  <form onSubmit={handleAddCheque} className="p-10 space-y-6">
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Cheque</label>
                           <select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none focus:border-indigo-500" value={chequeForm.type} onChange={e => setChequeForm({ ...chequeForm, type: e.target.value as any })}>
                              <option value="received">RECIBIDO (Cobro Expensa)</option>
                              <option value="issued">EMITIDO (Pago Proveedor)</option>
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Banco Emisor</label>
                           <input type="text" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none focus:border-indigo-500" value={chequeForm.bank} onChange={e => setChequeForm({ ...chequeForm, bank: e.target.value })} required />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Cheque</label>
                           <input type="text" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none focus:border-indigo-500" value={chequeForm.number} onChange={e => setChequeForm({ ...chequeForm, number: e.target.value })} required />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Importe ($)</label>
                           <input type="text" className="w-full px-5 py-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/20 dark:bg-slate-950 font-black text-lg text-indigo-600 outline-none focus:border-indigo-500 text-right tabular-nums" value={chequeForm.amount} onChange={e => setChequeForm({ ...chequeForm, amount: handleAccountingInput(e.target.value) })} required />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Cobro/Vto</label>
                           <input type="date" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none focus:border-indigo-500" value={chequeForm.dueDate} onChange={e => setChequeForm({ ...chequeForm, dueDate: e.target.value })} required />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social Entidad</label>
                           <input type="text" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none focus:border-indigo-500" value={chequeForm.entityName} onChange={e => setChequeForm({ ...chequeForm, entityName: e.target.value })} required />
                        </div>
                     </div>
                     <div className="pt-6 flex gap-4">
                        <button type="button" onClick={() => setIsAddingCheque(false)} className="flex-1 px-8 py-5 rounded-2xl font-black text-slate-400 uppercase tracking-widest text-[10px]">Descartar</button>
                        <button type="submit" className="flex-[2] bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-indigo-100 uppercase tracking-widest text-[10px]">Guardar Cheque</button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

export default BankBalanceManager;
