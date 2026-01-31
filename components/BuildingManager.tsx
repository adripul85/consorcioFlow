
import React, { useState, useEffect } from 'react';
import { Building, Unit } from '../types';

interface BuildingManagerProps {
  buildings: Building[];
  activeBuildingId: string | null;
  onSelect: (id: string) => void;
  onAdd: (building: Building) => void;
  onUpdate: (building: Building) => void;
  onRemove: (id: string) => void;
}

const BuildingManager: React.FC<BuildingManagerProps> = ({
  buildings,
  activeBuildingId,
  onSelect,
  onAdd,
  onUpdate,
  onRemove
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    cuit: '',
    adminName: '',
    adminCuit: '',
    adminRpa: ''
  });
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);

  const [isAutoConfigUnits, setIsAutoConfigUnits] = useState(false);
  const [autoConfig, setAutoConfig] = useState({
    numFloors: 1,
    unitsPerFloor: 1,
    numLocales: 0,
    deptType: 'alpha' as 'alpha' | 'numeric'
  });
  const [previewUnits, setPreviewUnits] = useState<Unit[]>([]);

  useEffect(() => {
    if (buildings.length === 0) {
      setActiveTab('add');
    }
  }, [buildings.length]);

  const generateUnits = (): Unit[] => {
    const generated: Unit[] = [];
    const totalUnits = (autoConfig.numFloors * autoConfig.unitsPerFloor) + autoConfig.numLocales;
    const coefficient = 1 / totalUnits;

    // Generar Locales en Planta Baja (PB)
    for (let l = 1; l <= autoConfig.numLocales; l++) {
      let localeLabel = '';
      if (autoConfig.deptType === 'alpha') {
        localeLabel = `LOCAL ${String.fromCharCode(64 + l)}`;
      } else {
        localeLabel = `LOCAL ${l}`;
      }

      generated.push({
        id: Math.random().toString(36).substr(2, 9),
        floor: 'PB',
        department: localeLabel,
        coefficient: coefficient,
        owner: 'Sin Propietario',
        payments: []
      });
    }

    // Generar Departamentos por Piso
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

  useEffect(() => {
    if (isAutoConfigUnits && !editingBuildingId) {
      setPreviewUnits(generateUnits());
    } else if (!isAutoConfigUnits) {
      setPreviewUnits([]);
    }
  }, [autoConfig, isAutoConfigUnits, editingBuildingId]);

  const removePreviewUnit = (id: string) => {
    setPreviewUnits(prev => prev.filter(u => u.id !== id));
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
          address: formData.address.trim(),
          cuit: formData.cuit.trim(),
          adminName: formData.adminName.trim(),
          adminCuit: formData.adminCuit.trim(),
          adminRpa: formData.adminRpa.trim()
        });
      }
      setEditingBuildingId(null);
    } else {
      // Recalc coefficients for preview units so they sum to 100% (or just 1)
      const finalUnits = previewUnits.map(u => ({
        ...u,
        coefficient: previewUnits.length > 0 ? (1 / previewUnits.length) : 0
      }));

      onAdd({
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name.trim(),
        address: formData.address.trim(),
        cuit: formData.cuit.trim(),
        adminName: formData.adminName.trim(),
        adminCuit: formData.adminCuit.trim(),
        adminRpa: formData.adminRpa.trim(),
        units: finalUnits,
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

    setFormData({ name: '', address: '', cuit: '', adminName: '', adminCuit: '', adminRpa: '' });
    setIsAutoConfigUnits(false);
    setActiveTab('list');
  };

  const handleEdit = (building: Building) => {
    setEditingBuildingId(building.id);
    setFormData({
      name: building.name,
      address: building.address,
      cuit: building.cuit || '',
      adminName: building.adminName || '',
      adminCuit: building.adminCuit || '',
      adminRpa: building.adminRpa || ''
    });
    setActiveTab('add');
    setIsAutoConfigUnits(false);
  };

  const handleCancel = () => {
    setEditingBuildingId(null);
    setFormData({ name: '', address: '', cuit: '', adminName: '', adminCuit: '', adminRpa: '' });
    setIsAutoConfigUnits(false);
    setPreviewUnits([]);
    setActiveTab('list');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex gap-8">
          <button
            onClick={() => { setActiveTab('list'); setEditingBuildingId(null); }}
            className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'list'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
          >
            Listado de Consorcios
            {activeTab === 'list' && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full animate-in slide-in-from-bottom-1" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'add'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-300">
          {buildings.map(building => {
            const isSelected = activeBuildingId === building.id;
            return (
              <div
                key={building.id}
                className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 transition-all group relative overflow-hidden ${isSelected
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
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-500 group-hover:scale-110 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                      🏢
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(building); }}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all border border-slate-100 dark:border-slate-700 hover:border-indigo-100 opacity-60 group-hover:opacity-100"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (window.confirm(`¿Estás seguro de eliminar "${building.name}"?`)) onRemove(building.id) }}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-all border border-slate-100 dark:border-slate-700 hover:border-rose-100 opacity-60 group-hover:opacity-100"
                        title="Eliminar"
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
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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
                      disabled={isSelected}
                      className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 ${isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 cursor-default'
                        : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-indigo-600 dark:hover:bg-white hover:text-white shadow-lg'
                        }`}
                    >
                      {isSelected ? 'Seleccionado' : 'Administrar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {buildings.length === 0 && (
            <div className="col-span-full py-24 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] flex flex-col items-center justify-center text-center px-8 shadow-inner">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl mb-6">🏙️</div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Sin Edificios</h3>
              <p className="text-slate-400 dark:text-slate-500 max-w-xs text-xs font-medium leading-relaxed">Comienza registrando tu primer consorcio para gestionar sus unidades y gastos.</p>
              <button
                onClick={() => setActiveTab('add')}
                className="mt-8 bg-indigo-600 text-white px-8 py-4 rounded-xl font-black shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all uppercase tracking-widest text-[10px]"
              >
                Crear Edificio
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'add' && (
        <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-300 pb-20">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-10 md:p-14 rounded-[3rem] shadow-2xl shadow-slate-200 dark:shadow-none border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-6 mb-12">
              <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 dark:shadow-none">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-tight">{editingBuildingId ? 'Modificar Consorcio' : 'Alta de Edificio'}</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-1">
                  {editingBuildingId ? 'Actualiza los datos base del edificio seleccionado.' : 'Configura la identidad del nuevo consorcio para iniciar la gestión.'}
                </p>
              </div>
            </div>

            <div className="space-y-10">
              <div className="group">
                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-4 ml-1 group-focus-within:text-indigo-600 transition-colors">
                  Identificación del Edificio
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 dark:text-slate-700 group-focus-within:text-indigo-500 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <input
                    type="text"
                    className="w-full pl-16 pr-8 py-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 text-xl font-black text-slate-900 dark:text-slate-100 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                    placeholder="Ej: Torre Libertador 500"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    autoFocus
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-4 ml-1 group-focus-within:text-indigo-600 transition-colors">
                  Ubicación Geográfica
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 dark:text-slate-700 group-focus-within:text-indigo-500 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <input
                    type="text"
                    className="w-full pl-16 pr-8 py-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 text-xl font-bold text-slate-900 dark:text-slate-100 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                    placeholder="Calle, Número, Ciudad"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">CUIT Consorcio</label>
                  <input
                    type="text"
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 focus:bg-white dark:focus:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all"
                    placeholder="30-XXXXXXXX-X"
                    value={formData.cuit}
                    onChange={e => setFormData({ ...formData, cuit: e.target.value })}
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Nombre Administrador</label>
                  <input
                    type="text"
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 focus:bg-white dark:focus:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all"
                    placeholder="Ej: Juan Pérez"
                    value={formData.adminName}
                    onChange={e => setFormData({ ...formData, adminName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">CUIT Administrador</label>
                  <input
                    type="text"
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 focus:bg-white dark:focus:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all"
                    placeholder="20-XXXXXXXX-X"
                    value={formData.adminCuit}
                    onChange={e => setFormData({ ...formData, adminCuit: e.target.value })}
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Matrícula R.P.A.</label>
                  <input
                    type="text"
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 focus:bg-white dark:focus:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all"
                    placeholder="Ej: 123456"
                    value={formData.adminRpa}
                    onChange={e => setFormData({ ...formData, adminRpa: e.target.value })}
                  />
                </div>
              </div>

              {!editingBuildingId && (
                <div className="bg-slate-50 dark:bg-slate-800/40 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 space-y-8 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center text-2xl">⚡</div>
                      <div>
                        <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-tight">Estructura de Unidades</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Autogenerar plano del edificio.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAutoConfigUnits(!isAutoConfigUnits)}
                      className={`w-14 h-7 rounded-full transition-all relative ${isAutoConfigUnits ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${isAutoConfigUnits ? 'left-8' : 'left-1'}`} />
                    </button>
                  </div>

                  {isAutoConfigUnits && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 animate-in zoom-in-95 duration-200">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">N° de Pisos</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-base text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                            value={autoConfig.numFloors}
                            onChange={e => setAutoConfig({ ...autoConfig, numFloors: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">UF por Piso</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-base text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                            value={autoConfig.unitsPerFloor}
                            onChange={e => setAutoConfig({ ...autoConfig, unitsPerFloor: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">N° de Locales (PB)</label>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-base text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                            value={autoConfig.numLocales}
                            onChange={e => setAutoConfig({ ...autoConfig, numLocales: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Letra/N°</label>
                          <select
                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-base text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            value={autoConfig.deptType}
                            onChange={e => setAutoConfig({ ...autoConfig, deptType: e.target.value as 'alpha' | 'numeric' })}
                          >
                            <option value="alpha">A, B, C...</option>
                            <option value="numeric">1, 2, 3...</option>
                          </select>
                        </div>
                      </div>

                      {previewUnits.length > 0 && (
                        <div className="pt-6 space-y-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex justify-between items-center">
                            <h5 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                              Vista Previa Estructura ({previewUnits.length} un)
                            </h5>
                            <p className="text-[9px] text-slate-400 italic font-medium">Elimina unidades para darlas de baja del plano.</p>
                          </div>
                          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto shadow-inner">
                            <table className="w-full text-left text-[11px]">
                              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                  <th className="px-4 py-2 font-black text-slate-400 uppercase">Piso</th>
                                  <th className="px-4 py-2 font-black text-slate-400 uppercase">Depto</th>
                                  <th className="px-4 py-2 font-black text-slate-400 uppercase text-right">Quitar</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {previewUnits.sort((a, b) => (a.floor === 'PB' ? -1 : b.floor === 'PB' ? 1 : parseInt(a.floor) - parseInt(b.floor)) || a.department.localeCompare(b.department)).map(u => (
                                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-indigo-900/10 transition-colors group">
                                    <td className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400">{u.floor}</td>
                                    <td className="px-4 py-2 font-black text-slate-900 dark:text-slate-100">{u.department}</td>
                                    <td className="px-4 py-2 text-right">
                                      <button
                                        type="button"
                                        onClick={() => removePreviewUnit(u.id)}
                                        className="text-slate-300 hover:text-rose-500 transition-colors"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-8 py-5 rounded-3xl font-black text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all uppercase tracking-[0.2em] text-[10px]"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-[0.2em] text-[10px]"
                >
                  {editingBuildingId ? 'Actualizar Información' : 'Confirmar y Crear Edificio'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default BuildingManager;
