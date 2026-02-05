import React from 'react';
import { AppData, Friend } from '../types';
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
  const { stats, exercise, food, friends, sets, trains } = data;

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const renderHistoryBar = (value: number, max: number, colorClass: string, isCurrent: boolean = false) => {
    const height = max === 0 ? 0 : (value / max) * 100;
    return (
      <div className="flex-1 flex flex-col items-center gap-1 group">
        <div className="flex-1 w-full flex items-end bg-stone-950/40 rounded-t-sm">
          <div 
            className={`w-full rounded-t-sm transition-all duration-700 ${colorClass} ${isCurrent ? 'opacity-100 shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'opacity-60'}`} 
            style={{ height: `${Math.max(5, height)}%` }}
          ></div>
        </div>
        <span className={`text-[8px] font-mono ${isCurrent ? 'text-white font-bold' : 'text-stone-600'} group-hover:text-stone-400`}>{value}</span>
      </div>
    );
  };

  // Logic for 10-week set evolution
  const currentSetCount = sets.filter(t => t.completed).length;
  const setsHistoryToDisplay = [...stats.setsHistory.slice(-9), currentSetCount];
  const paddedSetsHistory = Array(Math.max(0, 10 - setsHistoryToDisplay.length)).fill(0).concat(setsHistoryToDisplay);
  const setsMax = sets.length || 8;

  // Logic for 6-month train evolution
  const currentTrainCount = trains.filter(t => t.completed).length;
  const trainsHistoryToDisplay = [...stats.trainsHistory.slice(-5), currentTrainCount];
  const paddedTrainsHistory = Array(Math.max(0, 6 - trainsHistoryToDisplay.length)).fill(0).concat(trainsHistoryToDisplay);
  const trainsMax = trains.length || 37;

  // Logic for 6-month interaction evolution
  const calculateTotalInteractions = (friendsList: Friend[]) => {
      return friendsList.reduce((acc, friend) => {
          const interactions = (Object.values(friend.interactions || {}) as number[]).reduce((a, b) => a + b, 0);
          return acc + interactions;
      }, 0);
  };
  const currentTotal = calculateTotalInteractions(friends);
  const currentMonthInteractions = Math.max(0, currentTotal - (stats.lastTotalInteractions || 0));
  const interactionsHistoryToDisplay = [...stats.interactionsHistory.slice(-5), currentMonthInteractions];
  const paddedInteractionsHistory = Array(Math.max(0, 6 - interactionsHistoryToDisplay.length)).fill(0).concat(interactionsHistoryToDisplay);
  const interactionsMax = Math.max(...paddedInteractionsHistory, 10); // Floor of 10 for better scaling

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
            <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MushroomIcon className="w-4 h-4 text-red-500" /> Evolución de Setas (10 sem)
              </div>
              <span className="text-[9px] text-stone-500 font-mono">Última barra: Actual</span>
            </h2>
            <div className="h-24 flex gap-1 px-1">
              {paddedSetsHistory.map((v, i) => renderHistoryBar(v, setsMax, 'bg-red-600', i === 9))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Train className="w-4 h-4 text-blue-500" /> Evolución de Trenes (6 meses)
              </div>
              <span className="text-[9px] text-stone-500 font-mono">Última barra: Actual</span>
            </h2>
            <div className="h-24 flex gap-1 px-1">
              {paddedTrainsHistory.map((v, i) => renderHistoryBar(v, trainsMax, 'bg-blue-600', i === 5))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-pink-500" /> Interacciones Sociales (6 meses)
              </div>
              <span className="text-[9px] text-stone-500 font-mono">Última barra: Actual</span>
            </h2>
            <div className="h-24 flex gap-1 px-1">
              {paddedInteractionsHistory.map((v, i) => renderHistoryBar(v, interactionsMax, 'bg-pink-600', i === 5))}
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