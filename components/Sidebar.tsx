
import React from 'react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  activeBuildingName?: string;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, activeBuildingName, isDarkMode, toggleDarkMode }) => {
  const menuItems = [
    { id: 'buildings' as View, label: 'Edificios', icon: '🏢' },
    { id: 'dashboard' as View, label: 'Panel Control', icon: '📊' },
    { id: 'calendar' as View, label: 'Calendario', icon: '📅' },
    { id: 'units' as View, label: 'Unidades', icon: '🏠' },
    { id: 'expenses' as View, label: 'Egresos', icon: '💸' },
    { id: 'income' as View, label: 'Ingresos', icon: '💰' },
    { id: 'settlements' as View, label: 'Liquidaciones', icon: '🧾' },
    { id: 'bank-balance' as View, label: 'Balance Bancario', icon: '🏦' },
    { id: 'ai-helper' as View, label: 'Asistente IA', icon: '✨' },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Consorcio<span className="text-indigo-600 dark:text-indigo-400">Flow</span></h2>

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-90 border border-slate-200 dark:border-slate-700 shadow-sm"
          title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
        >
          {isDarkMode ? (
            <span className="text-lg animate-in zoom-in spin-in-180 duration-300">☀️</span>
          ) : (
            <span className="text-lg animate-in zoom-in spin-in-180 duration-300">🌙</span>
          )}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-105 active:scale-95 ${currentView === item.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}

        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="px-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Accesos Públicos</p>
          <button
            onClick={() => setView('provider-portal')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'provider-portal'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <span className="text-xl">🛠️</span>
            <span className="font-medium">Carga Proveedores</span>
          </button>
        </div>
      </nav>

      <div className="p-6 border-t border-slate-100 dark:border-slate-800">
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 flex items-center gap-3 border border-slate-200 dark:border-slate-800/50">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-sm font-black shadow-inner text-white">
            {activeBuildingName ? activeBuildingName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-0.5">Activo</p>
            <p className="text-sm text-slate-900 dark:text-white font-bold truncate">
              {activeBuildingName || 'Sin edificio'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
