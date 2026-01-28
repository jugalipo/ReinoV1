import React from 'react';
import { AppData } from '../types';
import { ArrowLeft, Trophy, Flame, Target, Train, Heart, Dumbbell, Utensils, MessageCircle, Star } from 'lucide-react';

interface StatsViewProps {
  data: AppData;
  onBack: () => void;
}

const MushroomIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 10C2 13.5 4.5 16 8 16V20C8 21.1 8.9 22 10 22H14C15.1 22 16 21.1 16 20V16C19.5 16 22 13.5 22 10C22 6.48 17.52 2 12 2ZM12 4C14.5 4 16.5 6 16.5 6C16.5 6 15 8 12 8C9 8 7.5 6 7.5 6C7.5 6 9.5 4 12 4Z" />
  </svg>
);

export const StatsView: React.FC<StatsViewProps> = ({ data, onBack }) => {
  const { stats, exercise, food, friends } = data;

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const renderHistoryBar = (value: number, max: number, colorClass: string) => {
    const height = max === 0 ? 0 : (value / max) * 100;
    return (
      <div className="flex-1 flex flex-col items-center gap-1 group">
        <div className="flex-1 w-full flex items-end bg-stone-950/40 rounded-t-sm">
          <div 
            className={`w-full rounded-t-sm transition-all duration-700 ${colorClass}`} 
            style={{ height: `${Math.max(5, height)}%` }}
          ></div>
        </div>
        <span className="text-[8px] font-mono text-stone-600 group-hover:text-stone-400">{value}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 overflow-y-auto no-scrollbar pb-12">
      <div className="p-4 bg-stone-900 shadow-sm flex items-center gap-4 sticky top-0 z-10 border-b border-stone-800">
        <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-stone-400" />
        </button>
        <h1 className="text-xl font-bold text-stone-100">Estadísticas</h1>
      </div>

      <div className="p-6 space-y-8">
        
        {/* LOGROS / PLENOS */}
        <section>
          <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Logros del Reino
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-stone-900 p-4 rounded-2xl border border-orange-900/30 flex flex-col items-center">
              <Flame className="w-8 h-8 text-orange-500 mb-2" />
              <span className="text-3xl font-black text-white">{stats.hunoPlenos}</span>
              <span className="text-[10px] font-bold text-stone-500 uppercase">Huno Plenos</span>
            </div>
            <div className="bg-stone-900 p-4 rounded-2xl border border-yellow-900/30 flex flex-col items-center">
              <Star className="w-8 h-8 text-yellow-500 mb-2" />
              <span className="text-3xl font-black text-white">{stats.projectPlenos}</span>
              <span className="text-[10px] font-bold text-stone-500 uppercase">Proyectos</span>
            </div>
            <div className="bg-stone-900 p-4 rounded-2xl border border-blue-900/30 flex flex-col items-center">
              <Train className="w-8 h-8 text-blue-500 mb-2" />
              <span className="text-3xl font-black text-white">{stats.perfectTrainMonths}</span>
              <span className="text-[10px] font-bold text-stone-500 uppercase">Meses Trenes</span>
            </div>
            <div className="bg-stone-900 p-4 rounded-2xl border border-red-900/30 flex flex-col items-center">
              <MushroomIcon className="w-8 h-8 text-red-500 mb-2" />
              <span className="text-3xl font-black text-white">{stats.perfectSetsWeeks}</span>
              <span className="text-[10px] font-bold text-stone-500 uppercase">Semanas Setas</span>
            </div>
          </div>
        </section>

        {/* CUERPO Y ACCION */}
        <section>
          <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Dumbbell className="w-4 h-4" /> Cuerpo y Esfuerzo
          </h2>
          <div className="bg-stone-900 rounded-3xl p-6 border border-stone-800 space-y-6">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase block mb-1">Días Entrenados</span>
                <span className="text-2xl font-black text-indigo-400">{exercise.daysTrained}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase block mb-1">Tiempo Total</span>
                <span className="text-2xl font-black text-indigo-400">{formatMinutes(exercise.totalMinutes || 0)}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase block mb-1">Sprints</span>
                <span className="text-2xl font-black text-cyan-400">{exercise.sprintCount}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase block mb-1">Estiramientos</span>
                <span className="text-2xl font-black text-emerald-400">{exercise.stretchCount}</span>
              </div>
            </div>
          </div>
        </section>

        {/* HISTORICOS (CHARTS) */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MushroomIcon className="w-4 h-4 text-red-500" /> Evolución de Setas (Semanas)
            </h2>
            <div className="h-24 flex gap-1 px-1">
              {stats.setsHistory.length > 0 ? (
                stats.setsHistory.map((v, i) => renderHistoryBar(v, 8, 'bg-red-600/80'))
              ) : (
                <div className="flex-1 flex items-center justify-center text-stone-800 text-[10px] border border-dashed border-stone-900 rounded-xl">Sin historial aún</div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Train className="w-4 h-4" /> Evolución de Trenes (Meses)
            </h2>
            <div className="h-24 flex gap-1 px-1">
              {stats.trainsHistory.length > 0 ? (
                stats.trainsHistory.map((v, i) => renderHistoryBar(v, 37, 'bg-blue-600/80'))
              ) : (
                <div className="flex-1 flex items-center justify-center text-stone-800 text-[10px] border border-dashed border-stone-900 rounded-xl">Sin historial aún</div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Interacciones Sociales (Meses)
            </h2>
            <div className="h-24 flex gap-1 px-1">
              {stats.interactionsHistory.length > 0 ? (
                stats.interactionsHistory.map((v, i) => renderHistoryBar(v, Math.max(...stats.interactionsHistory), 'bg-pink-600/80'))
              ) : (
                <div className="flex-1 flex items-center justify-center text-stone-800 text-[10px] border border-dashed border-stone-900 rounded-xl">Sin historial aún</div>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2">
             <Utensils className="w-4 h-4" /> Nutrición
          </h2>
          <div className="bg-stone-900 rounded-2xl p-4 border border-lime-900/20 flex items-center justify-between">
              <span className="font-bold text-stone-300">Puntuación Actual</span>
              <span className="text-3xl font-black text-lime-500">{food.score}</span>
          </div>
        </section>

      </div>
      
      <p className="text-center text-[10px] text-stone-700 font-bold uppercase tracking-[0.3em] mt-8">El Reino no olvida tu esfuerzo</p>
    </div>
  );
};