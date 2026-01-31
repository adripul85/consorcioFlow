
import React, { useState, useRef } from 'react';
import { Building, Expense } from '../types';
import { extractDataFromInvoice } from '../services/geminiService';
import { getCategoryIcon, handleAccountingInput, parseAccountingValue, formatMoney } from './Dashboard';

interface ProviderPortalProps {
  buildings: Building[];
  onAddExpense: (buildingId: string, expense: Expense) => void;
}

const ProviderPortal: React.FC<ProviderPortalProps> = ({ buildings, onAddExpense }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [step, setStep] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '0.00',
    category: 'mantenimiento',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const activeBuilding = buildings.find(b => b.id === selectedBuildingId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBuilding) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = (event.target?.result as string).split(',')[1];
        const result = await extractDataFromInvoice(
          base64Data, 
          file.type, 
          activeBuilding.categories
        );

        if (result) {
          setFormData({
            description: result.description || '',
            amount: result.amount ? formatMoney(result.amount) : '0.00',
            category: result.category || 'otros',
            date: result.date || new Date().toISOString().split('T')[0],
            notes: result.notes || ''
          });
        }
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsScanning(false);
      alert("No se pudo escanear la imagen. Por favor completa los datos manualmente.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseAccountingValue(formData.amount);
    
    if (!selectedBuildingId || amountNum <= 0) return;

    onAddExpense(selectedBuildingId, {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      amount: amountNum,
      paid: false,
      status: 'pending' 
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-6">
        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-xl animate-bounce-short">✅</div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">¡Factura Enviada!</h2>
        <p className="text-slate-500 font-medium px-8">La administración ha recibido el comprobante y lo validará a la brevedad. Ya puedes cerrar esta ventana.</p>
        <button onClick={() => { setSubmitted(false); setStep(1); setSelectedBuildingId(''); }} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Cargar Otra</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-slate-900 p-10 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
          </div>
          <p className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.3em] mb-2">Portal de Autogestión</p>
          <h2 className="text-3xl font-black">Carga de Facturas</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Consorcio Destino</label>
                 <select 
                   className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all"
                   value={selectedBuildingId}
                   onChange={e => setSelectedBuildingId(e.target.value)}
                   required
                 >
                   <option value="">-- ¿A qué edificio factura? --</option>
                   {buildings.map(b => <option key={b.id} value={b.id}>{b.name} ({b.address})</option>)}
                 </select>
               </div>
               <button 
                type="button" 
                disabled={!selectedBuildingId}
                onClick={() => setStep(2)}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-50 transition-all active:scale-95"
               >
                Siguiente Paso →
               </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex-1">
                  <span className="text-xl">🏢</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Facturando a:</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{activeBuilding?.name}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setStep(1)} className="ml-4 p-4 text-slate-400 hover:text-indigo-600 bg-slate-50 dark:bg-slate-800 rounded-2xl transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
              </div>

              {/* Botón de Escaneo IA */}
              <div className="relative">
                <button 
                  type="button"
                  disabled={isScanning}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full py-8 border-4 border-dashed rounded-[2rem] transition-all flex flex-col items-center justify-center gap-3 group ${isScanning ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  {isScanning ? (
                    <>
                      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] animate-pulse">Gemini Escaneando Factura...</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">✨</div>
                      <div className="text-center">
                        <p className="font-black text-slate-800 dark:text-slate-100 uppercase text-xs tracking-widest">Subir Foto de Factura</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">La IA completará los datos automáticamente</p>
                      </div>
                    </>
                  )}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*,application/pdf"
                  capture="environment"
                />
                
                {isScanning && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[2rem]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.8)] animate-scan-line"></div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Concepto / Servicio Prestado</label>
                  <input type="text" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none focus:border-indigo-500 transition-all" placeholder="Ej: Reparación bomba de agua PB" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto de Factura ($)</label>
                  <input type="text" className="w-full px-5 py-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/20 dark:bg-slate-950 font-black text-lg text-indigo-600 outline-none focus:border-indigo-500 text-right tabular-nums transition-all" value={formData.amount} onChange={e => setFormData({...formData, amount: handleAccountingInput(e.target.value)})} required />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                  <select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none transition-all" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {activeBuilding?.categories.map(c => <option key={c} value={c}>{getCategoryIcon(c)} {c.toUpperCase()}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha del Comprobante</label>
                  <input type="date" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none transition-all" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas / Observaciones</label>
                  <input type="text" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-sm outline-none transition-all" placeholder="Opcional..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="submit" 
                  disabled={isScanning}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-widest text-xs disabled:opacity-50"
                >
                  Enviar para Revisión
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
      
      <style>{`
        @keyframes scan-line {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan-line {
          animation: scan-line 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default ProviderPortal;
