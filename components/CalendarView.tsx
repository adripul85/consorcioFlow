
import React, { useState, useMemo } from 'react';
import { CalendarEvent, Expense } from '../types';
import { getCalendarSuggestions } from '../services/geminiService';

interface CalendarViewProps {
  events: CalendarEvent[];
  expenses: Expense[];
  onAddEvent: (event: CalendarEvent) => void;
  onRemoveEvent: (id: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, expenses, onAddEvent, onRemoveEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    type: 'meeting' as CalendarEvent['type'],
    notes: ''
  });

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const totalDays = daysInMonth(month, year);
    const startOffset = firstDayOfMonth(month, year);
    
    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const changeMonth = (offset: number) => {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(nextDate);
  };

  const handleAiSuggest = async () => {
    setIsAiLoading(true);
    try {
      const suggestions = await getCalendarSuggestions(expenses);
      setAiSuggestions(suggestions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const addSuggestedEvent = (suggestion: any) => {
    onAddEvent({
      id: Math.random().toString(36).substr(2, 9),
      title: suggestion.title,
      date: suggestion.date,
      type: suggestion.type,
      notes: suggestion.reasoning
    });
    setAiSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    onAddEvent({
      id: Math.random().toString(36).substr(2, 9),
      title: formData.title,
      date: formData.date,
      type: formData.type,
      notes: formData.notes
    });
    
    setFormData({
      title: '',
      date: new Date().toISOString().split('T')[0],
      type: 'meeting',
      notes: ''
    });
    setIsAdding(false);
  };

  const getEventsForDay = (day: number) => {
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    const dateStr = `${currentDate.getFullYear()}-${month}-${dayStr}`;
    return events.filter(e => e.date === dateStr);
  };

  const getTypeStyles = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'meeting': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'payment': return 'bg-red-100 text-red-700 border-red-200';
      case 'collection': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)))
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [events]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in duration-500">
      {/* Panel de Control y Próximos Eventos */}
      <div className="lg:col-span-1 space-y-6">
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
        >
          {isAdding ? 'Cerrar Formulario' : 'Agendar Nueva Fecha'}
        </button>

        <button 
          onClick={handleAiSuggest}
          disabled={isAiLoading}
          className="w-full bg-slate-900 dark:bg-slate-800 text-indigo-400 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:text-white transition-all flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-50"
        >
          {isAiLoading ? (
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          ) : '✨ IA Sugerencias'}
        </button>

        {aiSuggestions.length > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-800 animate-in zoom-in-95">
             <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4">Sugerencias Inteligentes</h4>
             <div className="space-y-3">
                {aiSuggestions.map((s, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm text-[10px]">
                    <p className="font-black text-slate-800 dark:text-slate-100 leading-tight mb-1">{s.title}</p>
                    <p className="text-slate-400 font-bold mb-2">{s.date.split('-').reverse().join('/')}</p>
                    <button 
                      onClick={() => addSuggestedEvent(s)}
                      className="w-full py-1.5 bg-indigo-600 text-white rounded-lg font-black uppercase tracking-tighter hover:bg-indigo-700"
                    >
                      Aceptar Sugerencia
                    </button>
                  </div>
                ))}
             </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Próximos Eventos</h4>
          <div className="space-y-4">
            {upcomingEvents.map(e => (
              <div key={e.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group">
                <div className="flex justify-between items-start mb-1">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${getTypeStyles(e.type)}`}>
                    {e.type}
                  </span>
                  <button 
                    onClick={() => onRemoveEvent(e.id)}
                    className="text-slate-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
                <p className="text-sm font-black text-slate-800 dark:text-slate-200 leading-tight">{e.title}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">{e.date.split('-').reverse().join('/')}</p>
              </div>
            ))}
            {upcomingEvents.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8 italic">No hay eventos próximos.</p>
            )}
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div className="lg:col-span-3 space-y-6">
        {isAdding && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border-2 border-indigo-100 dark:border-indigo-900 shadow-xl animate-in slide-in-from-top-4">
            <h4 className="font-black text-slate-800 dark:text-slate-100 uppercase text-xs tracking-widest mb-6">Nuevo Evento en la Agenda</h4>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Título del Evento</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej: Asamblea Extraordinaria" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                <input type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Evento</label>
                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as CalendarEvent['type']})}>
                  <option value="meeting">Reunión / Asamblea</option>
                  <option value="payment">Día de Pago (Egresos)</option>
                  <option value="collection">Día de Cobro (Ingresos)</option>
                  <option value="other">Otros / Mantenimiento</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas Adicionales</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Opcional..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
              <div className="md:col-span-2 flex justify-end gap-4 pt-4">
                 <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2 text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                 <button type="submit" className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100 uppercase text-[10px] tracking-widest">Guardar en Calendario</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">
              {months[currentDate.getMonth()]} <span className="text-indigo-600">{currentDate.getFullYear()}</span>
            </h3>
            <div className="flex gap-2">
              <button onClick={() => changeMonth(-1)} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={() => changeMonth(1)} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/30 dark:bg-slate-800/30">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dayEvents = day ? getEventsForDay(day) : [];
              const isToday = day && new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

              return (
                <div 
                  key={idx} 
                  className={`min-h-[120px] p-2 border-r border-b border-slate-50 dark:border-slate-800 relative group transition-colors ${day ? 'hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10' : 'bg-slate-50/10 dark:bg-slate-800/10'}`}
                >
                  {day && (
                    <>
                      <span className={`inline-flex w-7 h-7 items-center justify-center rounded-lg text-xs font-black transition-all ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-600'}`}>
                        {day}
                      </span>
                      
                      <div className="mt-2 space-y-1">
                        {dayEvents.map(e => (
                          <div 
                            key={e.id} 
                            className={`px-2 py-1 rounded-md text-[9px] font-bold truncate border shadow-sm ${getTypeStyles(e.type)}`}
                            title={e.title}
                          >
                            {e.title}
                          </div>
                        ))}
                      </div>

                      {dayEvents.length > 0 && (
                        <div className="absolute top-2 right-2 flex gap-0.5">
                          {dayEvents.slice(0, 3).map(e => (
                             <div key={e.id} className={`w-1.5 h-1.5 rounded-full ${e.type === 'meeting' ? 'bg-indigo-400' : e.type === 'payment' ? 'bg-red-400' : 'bg-emerald-400'}`}></div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
