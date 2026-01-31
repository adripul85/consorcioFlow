
import React, { useState } from 'react';
import { Unit, Expense } from '../types';
import { getSmartAnalysis, draftAnnouncement } from '../services/geminiService';

interface AIHelperProps {
  units: Unit[];
  expenses: Expense[];
}

const AIHelper: React.FC<AIHelperProps> = ({ units, expenses }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [topic, setTopic] = useState('');

  const handleAnalysis = async () => {
    setLoading(true);
    const analysis = await getSmartAnalysis(expenses, units);
    setResult(analysis || "No hay análisis disponible.");
    setLoading(false);
  };

  const handleAnnouncement = async () => {
    if (!topic) return;
    setLoading(true);
    const draft = await draftAnnouncement(topic);
    setResult(draft || "No se pudo generar el borrador.");
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <span className="text-indigo-500">✨</span> Herramientas IA
          </h3>
          <p className="text-slate-500 text-sm mb-6">
            Utiliza la IA para analizar las finanzas del consorcio y mejorar la comunicación con los vecinos.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={handleAnalysis}
              disabled={loading}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Analizar Presupuesto Mensual
            </button>
            
            <div className="pt-4 border-t border-slate-100">
               <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Redactar Comunicado</label>
               <textarea 
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 min-h-[100px] text-sm"
                  placeholder="Ej: Ascensor roto en piso 3, mantenimiento el próximo martes..."
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
               />
               <button 
                onClick={handleAnnouncement}
                disabled={loading || !topic}
                className="w-full mt-3 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
               >
                Generar Borrador
               </button>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
            <h4 className="font-bold text-indigo-900 text-sm">¿Cómo funciona?</h4>
            <ul className="mt-3 space-y-2 text-xs text-indigo-700 list-disc list-inside">
                <li>Analiza patrones de gasto</li>
                <li>Identifica desvíos en costos de mantenimiento</li>
                <li>Genera textos profesionales para boletines</li>
                <li>Sugiere optimizaciones para futuros presupuestos</li>
            </ul>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white min-h-[500px] rounded-2xl shadow-sm border border-slate-200 p-8">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 font-medium animate-pulse">Gemini está pensando...</p>
            </div>
          ) : result ? (
            <div className="prose prose-slate max-w-none">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 m-0">Contenido Generado</h3>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(result);
                    alert("¡Copiado al portapapeles!");
                  }}
                  className="text-xs bg-slate-100 px-3 py-1 rounded-full font-bold text-slate-600 hover:bg-slate-200"
                >
                  Copiar Texto
                </button>
              </div>
              <div className="whitespace-pre-wrap text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-xl border border-slate-100">
                {result}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <p className="text-lg font-medium">¡Listo para tu primera consulta!</p>
              <p className="text-sm max-w-xs text-center">Selecciona una herramienta a la izquierda para comenzar a generar insights.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIHelper;
