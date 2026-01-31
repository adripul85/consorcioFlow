
import React, { useState } from 'react';
import { Building, Unit } from '../types';

interface BuildingManagerProps {
  buildings: Building[];
  onAdd: (building: Building) => void;
  onRemove: (id: string) => void;
  onUpdate: (building: Building) => void;
  onSelect: (id: string) => void;
  activeBuildingId: string | null;
  setView: (view: any) => void;
}

const BuildingManager: React.FC<BuildingManagerProps> = ({
  buildings, onAdd, onRemove, onUpdate, onSelect, activeBuildingId, setView
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [formData, setFormData] = useState({ name: '', address: '' });
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [isAutoConfigUnits, setIsAutoConfigUnits] = useState(false);
  const [autoConfig, setAutoConfig] = useState({
    numFloors: 1,
    unitsPerFloor: 1,
    deptType: 'alpha' as 'alpha' | 'numeric'
  });

  const generateUnits = () => {
    const generated: Unit[] = [];
    const totalUnits = autoConfig.numFloors * autoConfig.unitsPerFloor;
    const coefficient = totalUnits > 0 ? 1 / totalUnits : 0;

    for (let f = 1; f <= autoConfig.numFloors; f++) {
      for (let u = 1; u <= autoConfig.unitsPerFloor; u++) {
        let deptLabel = '';
        if (autoConfig.deptType === 'alpha') {
          deptLabel = String.fromCharCode(64 + u);
        } else {
          deptLabel = u.toString();
        }

        generated.push({
          id: Math.random().toString(36).substr(2, 9),
          floor: f.toString(),
          department: deptLabel,
          coefficient: coefficient,
          owner: 'Sin Propietario',
          payments: []
        });
      }
    }
    return generated;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingBuildingId) {
      const existing = buildings.find(b => b.id === editingBuildingId);
      if (existing) {
        onUpdate({
          ...existing,
          name: formData.name.trim(),
          address: formData.address.trim()
        });
      }
      setEditingBuildingId(null);
    } else {
      const generatedUnits = isAutoConfigUnits ? generateUnits() : [];

      onAdd({
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name.trim(),
        address: formData.address.trim(),
        units: generatedUnits,
        expenses: [],
        events: [],
        categories: ['mantenimiento', 'servicios', 'servicios públicos', 'sueldos', 'otros'],
        bankAccounts: [],
        bankTransactions: [],
        cheques: [],
        cashAudits: [],
        liquidations: []
      });
    }

    setFormData({ name: '', address: '' });
    setIsAutoConfigUnits(false);
    setActiveTab('list');
  };

  const handleEdit = (building: Building) => {
    setEditingBuildingId(building.id);
    setFormData({ name: building.name, address: building.address });
    setActiveTab('add');
  };

  const handleCancel = () => {
    setEditingBuildingId(null);
    setFormData({ name: '', address: '' });
    setActiveTab('list');
  };

  return (
    <div className="animate-slide-up">
      <div className="border-b border-slate-200 dark:border-slate-800 mb-8">
        <nav className="flex gap-8">
          <button
            onClick={() => { setActiveTab('list'); setEditingBuildingId(null); }}
            className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'list' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
          >
            Listado de Consorcios
            {activeTab === 'list' && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full animate-in slide-in-from-bottom-1" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'add' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
          >
            {editingBuildingId ? 'Editar Consorcio' : 'Registrar Nuevo Edificio'}
            {activeTab === 'add' && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full animate-in slide-in-from-bottom-1" />
            )}
          </button>
        </nav>
      </div>

      {activeTab === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {buildings.map((building, index) => {
            const isSelected = activeBuildingId === building.id;
            return (
              <div
                key={building.id}
                className="animate-slide-up animate-fill-both"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  onClick={() => onSelect(building.id)}
                  className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 transition-all group relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${isSelected
                    ? 'border-indigo-600 dark:border-indigo-500 shadow-2xl shadow-indigo-100 dark:shadow-indigo-900/10 ring-4 ring-indigo-50 dark:ring-indigo-950/30 scale-[1.02]'
                    : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-xl'
                    }`}
                >
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 px-4 py-2 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-bl-2xl shadow-lg z-10 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                      Gestionando
                    </div>
                  )}

                  <div className="p-8">
                    <div className="flex items-start justify-between mb-8">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-500 group-hover:scale-110 ${isSelected ? 'bg-indigo-600 text-white shadow-xl rotate-3' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
                        }`}>
                        🏢
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(building); }}
                          className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all border border-slate-100 dark:border-slate-700 opacity-60 group-hover:opacity-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (window.confirm(`¿Eliminar "${building.name}"?`)) onRemove(building.id) }}
                          className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-all border border-slate-100 dark:border-slate-700 opacity-60 group-hover:opacity-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className={`text-xl font-black leading-tight transition-colors ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                        {building.name}
                      </h3>
                      <p className={`text-xs font-bold flex items-center gap-1.5 ${isSelected ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'
                        }`}>
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="line-clamp-1">{building.address || 'Dirección no especificada'}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <div className={`p-3.5 rounded-2xl border transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                        }`}>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Unidades</p>
                        <p className={`text-base font-black ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {building.units.length}
                        </p>
                      </div>
                      <div className={`p-3.5 rounded-2xl border transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                        }`}>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Gastos</p>
                        <p className={`text-base font-black ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {building.expenses.length}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => onSelect(building.id)}
                        className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 ${isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 cursor-default'
                          : 'bg-indigo-600 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-indigo-700 dark:hover:bg-white shadow-lg'
                          }`}
                      >
                        {isSelected ? 'Seleccionado' : 'Administrar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {buildings.length === 0 && (
            <div className="col-span-full py-24 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] flex flex-col items-center justify-center text-center px-8 shadow-inner animate-fade-in">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl mb-6">🏙️</div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Sin Edificios</h3>
              <p className="text-slate-400 dark:text-slate-500 max-w-xs text-xs font-medium leading-relaxed">Comienza registrando tu primer consorcio para gestionar sus unidades y gastos.</p>
              <button
                onClick={() => setActiveTab('add')}
                className="mt-8 bg-indigo-600 text-white px-8 py-4 rounded-xl font-black shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-[10px]"
              >
                Crear Edificio
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'add' && (
        <div className="max-w-3xl mx-auto animate-slide-up pb-20">
          <div className="bg-white dark:bg-slate-950 p-10 md:p-16 rounded-[3rem] shadow-2xl shadow-slate-200 dark:shadow-none border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-6 mb-12">
              <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 shrink-0">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
              <div>
                <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                  {editingBuildingId ? 'Editar Edificio' : 'Alta de Edificio'}
                </h2>
                <p className="text-slate-400 dark:text-slate-500 font-bold text-sm mt-1">Configura la identidad del nuevo consorcio para iniciar la gestión.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-12">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-2">Identificación del Edificio</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-7 flex items-center pointer-events-none text-slate-300 dark:text-slate-600">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Torre Libertador 500"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-20 pr-8 py-7 rounded-[2rem] border-2 border-slate-50 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50 font-black text-2xl text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-2">Ubicación Geográfica</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-7 flex items-center pointer-events-none text-slate-300 dark:text-slate-600">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Calle, Número, Ciudad"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pl-20 pr-8 py-7 rounded-[2rem] border-2 border-slate-50 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50 font-bold text-2xl text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                  />
                </div>
              </div>

              {!editingBuildingId && (
                <div className="bg-slate-50/30 dark:bg-slate-900/20 p-10 rounded-[2.5rem] border border-slate-100/50 dark:border-slate-800/50 space-y-8">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center text-2xl">⚡</div>
                      <div>
                        <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-tight">Estructura de Unidades</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">Autogenerar plano del edificio.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAutoConfigUnits(!isAutoConfigUnits)}
                      className={`w-16 h-8 rounded-full transition-all relative ${isAutoConfigUnits ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${isAutoConfigUnits ? 'left-9' : 'left-1'}`} />
                    </button>
                  </div>

                  {isAutoConfigUnits && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 animate-slide-up">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">N° de Pisos</label>
                        <input
                          type="number"
                          min="1"
                          value={autoConfig.numFloors}
                          onChange={e => setAutoConfig({ ...autoConfig, numFloors: parseInt(e.target.value) || 1 })}
                          className="w-full px-6 py-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 font-black text-xl text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">UF por Piso</label>
                        <input
                          type="number"
                          min="1"
                          value={autoConfig.unitsPerFloor}
                          onChange={e => setAutoConfig({ ...autoConfig, unitsPerFloor: parseInt(e.target.value) || 1 })}
                          className="w-full px-6 py-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 font-black text-xl text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Letra/N°</label>
                        <select
                          value={autoConfig.deptType}
                          onChange={e => setAutoConfig({ ...autoConfig, deptType: e.target.value as 'alpha' | 'numeric' })}
                          className="w-full px-6 py-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 font-black text-lg text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all cursor-pointer appearance-none"
                        >
                          <option value="alpha">A, B, C...</option>
                          <option value="numeric">1, 2, 3...</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-12 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-8">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-sm font-black text-slate-400 dark:text-slate-600 hover:text-red-500 transition-colors uppercase tracking-[0.3em]"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-16 py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  Confirmar y Crear Edificio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildingManager;
