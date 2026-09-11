import React from 'react';
import { AppData, Task, ViewState } from '../types';
import { ArrowLeft, CheckCircle2, ChevronRight, Check, Target, Compass, Sparkles, Shield, Anchor } from 'lucide-react';

interface TasksHubViewProps {
  data: AppData;
  onUpdateData: (data: AppData) => void;
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
}

export const TasksHubView: React.FC<TasksHubViewProps> = ({
  data,
  onUpdateData,
  onBack,
  onNavigate
}) => {
  // 1. Metas semanales
  const weekly = data.weeklyGoals;

  const toggleWeeklyGoal = (key: 'leones' | 'forjas' | 'puerto') => {
    if (!weekly) return;
    const currentGoal = weekly[key];
    const updatedWeekly = {
      ...weekly,
      [key]: {
        ...currentGoal,
        completed: !currentGoal.completed
      }
    };
    onUpdateData({
      ...data,
      weeklyGoals: updatedWeekly
    });
  };

  // 2. Extraer la primera tarea no completada de cada sección
  // Principal: Primer objetivo de forjas
  const principalGoal = data.forjas?.[0];

  // Yunque: Primera rápida o larga pendiente
  const nextYunqueRapida = (data.yunqueRapidas || []).find(t => !t.completed);
  const nextYunqueLarga = (data.yunqueLargas || []).find(t => !t.completed);
  const nextYunque = nextYunqueRapida || nextYunqueLarga;
  const isYunqueRapida = !!nextYunqueRapida;

  const toggleYunqueTask = (taskId: string) => {
    if (isYunqueRapida) {
      const updated = (data.yunqueRapidas || []).map(t => 
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      onUpdateData({ ...data, yunqueRapidas: updated });
    } else {
      const updated = (data.yunqueLargas || []).map(t => 
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      onUpdateData({ ...data, yunqueLargas: updated });
    }
  };

  // Roble: Primera tarea de forjaTasks pendiente
  const nextRoble = (data.forjaTasks || []).find(t => !t.completed);
  const toggleRobleTask = (taskId: string) => {
    const updated = (data.forjaTasks || []).map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    onUpdateData({ ...data, forjaTasks: updated });
  };

  // Leones: Primer objetivo pendiente (current < target)
  const nextLeones = (data.leones || []).find(t => t.current < t.target);

  // Brotes: Primer proyecto pendiente
  const nextBrotes = (data.projects || []).find(t => !t.completed);
  const toggleBrotesTask = (taskId: string) => {
    const updated = (data.projects || []).map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    onUpdateData({ ...data, projects: updated });
  };

  // Setas: Primera seta no completada
  const nextSetas = (data.sets || []).find(t => !t.completed);
  const toggleSetasTask = (taskId: string) => {
    const updated = (data.sets || []).map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    onUpdateData({ ...data, sets: updated });
  };

  // Trenes: Primer tren no completado
  const nextTrains = (data.trains || []).find(t => !t.completed);
  const toggleTrainsTask = (taskId: string) => {
    const updated = (data.trains || []).map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    onUpdateData({ ...data, trains: updated });
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-stone-950 p-6 pb-32 text-stone-200">
      {/* Cabecera */}
      <header className="flex items-center justify-between mb-6 pt-2 border-b border-stone-800/80 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-stone-900 rounded-xl text-stone-400 hover:text-stone-100 transition-colors cursor-pointer"
            title="Volver al inicio"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-black text-stone-100 flex items-center gap-2 tracking-tight">
              <CheckCircle2 className="w-5 h-5 text-purple-400" />
              Siguiente Tarea
            </h1>
            <p className="text-xs text-stone-400 font-medium">
              El siguiente paso físico de cada dominio
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {/* BLOQUE 1: Tareas Semanales (Foco Semanal) */}
        {weekly && (
          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5 px-1">
              <Target className="w-3.5 h-3.5" />
              Foco Semanal
            </h2>

            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3.5 space-y-2.5">
              {/* Leones */}
              <div 
                onClick={() => toggleWeeklyGoal('leones')}
                className="flex items-center justify-between p-2 rounded-xl bg-stone-950/60 hover:bg-stone-950 border border-stone-800/80 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                    weekly.leones.completed 
                      ? 'bg-purple-600 border-purple-500 text-white' 
                      : 'border-stone-700 bg-stone-900 group-hover:border-stone-500'
                  }`}>
                    {weekly.leones.completed && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-amber-400 block uppercase tracking-wider">🦁 Leones</span>
                    <span className={`text-xs font-medium truncate block ${
                      weekly.leones.completed ? 'line-through text-stone-500' : 'text-stone-200'
                    }`}>
                      {weekly.leones.text || 'Sin definir'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Roble */}
              <div 
                onClick={() => toggleWeeklyGoal('forjas')}
                className="flex items-center justify-between p-2 rounded-xl bg-stone-950/60 hover:bg-stone-950 border border-stone-800/80 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                    weekly.forjas.completed 
                      ? 'bg-purple-600 border-purple-500 text-white' 
                      : 'border-stone-700 bg-stone-900 group-hover:border-stone-500'
                  }`}>
                    {weekly.forjas.completed && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-emerald-400 block uppercase tracking-wider">🌳 Roble</span>
                    <span className={`text-xs font-medium truncate block ${
                      weekly.forjas.completed ? 'line-through text-stone-500' : 'text-stone-200'
                    }`}>
                      {weekly.forjas.text || 'Sin definir'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Yunque */}
              <div 
                onClick={() => toggleWeeklyGoal('puerto')}
                className="flex items-center justify-between p-2 rounded-xl bg-stone-950/60 hover:bg-stone-950 border border-stone-800/80 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                    weekly.puerto.completed 
                      ? 'bg-purple-600 border-purple-500 text-white' 
                      : 'border-stone-700 bg-stone-900 group-hover:border-stone-500'
                  }`}>
                    {weekly.puerto.completed && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-sky-400 block uppercase tracking-wider">🚢 Yunque</span>
                    <span className={`text-xs font-medium truncate block ${
                      weekly.puerto.completed ? 'line-through text-stone-500' : 'text-stone-200'
                    }`}>
                      {weekly.puerto.text || 'Sin definir'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* BLOQUE 2: Una de cada dominio */}
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5 px-1">
            <Compass className="w-3.5 h-3.5 text-stone-400" />
            Un Paso Físico por Dominio
          </h2>

          <div className="space-y-2.5">
            {/* 1. Tarea Principal */}
            <div className="bg-stone-900/90 border border-purple-500/30 rounded-2xl p-3.5 shadow-lg shadow-purple-950/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1">
                  👑 Principal
                </span>
                <span className="text-[10px] font-bold text-stone-500">
                  {principalGoal ? `${principalGoal.current}/${principalGoal.target} ${principalGoal.unit}` : ''}
                </span>
              </div>
              <p className="text-sm font-bold text-stone-100">
                {principalGoal?.name || 'Completar objetivos prioritarios del Reino'}
              </p>
            </div>

            {/* 2. Yunque */}
            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                  🚢 Yunque {nextYunque ? (isYunqueRapida ? '• Rápida' : '• Larga') : ''}
                </span>
                <button 
                  onClick={() => onNavigate('yunque')}
                  className="text-[10px] text-stone-500 hover:text-stone-300 flex items-center gap-0.5 transition-colors cursor-pointer"
                >
                  Ver todo <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {nextYunque ? (
                <div 
                  onClick={() => toggleYunqueTask(nextYunque.id)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-5 h-5 rounded-md border border-stone-700 bg-stone-950 flex items-center justify-center shrink-0 group-hover:border-sky-500 transition-colors">
                    {nextYunque.completed && <Check className="w-3.5 h-3.5 text-sky-400 stroke-[3]" />}
                  </div>
                  <span className="text-xs font-medium text-stone-200 group-hover:text-white transition-colors">
                    {nextYunque.text}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-stone-500 italic">✅ Yunque al día, sin tareas pendientes</span>
              )}
            </div>

            {/* 3. Roble */}
            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  🌳 Roble
                </span>
                <button 
                  onClick={() => onNavigate('forjas')}
                  className="text-[10px] text-stone-500 hover:text-stone-300 flex items-center gap-0.5 transition-colors cursor-pointer"
                >
                  Ver todo <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {nextRoble ? (
                <div 
                  onClick={() => toggleRobleTask(nextRoble.id)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-5 h-5 rounded-md border border-stone-700 bg-stone-950 flex items-center justify-center shrink-0 group-hover:border-emerald-500 transition-colors">
                    {nextRoble.completed && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />}
                  </div>
                  <span className="text-xs font-medium text-stone-200 group-hover:text-white transition-colors">
                    {nextRoble.text}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-stone-500 italic">✅ Roble al día, sin tareas pendientes</span>
              )}
            </div>

            {/* 4. Leones */}
            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  🦁 Leones
                </span>
                <button 
                  onClick={() => onNavigate('leones')}
                  className="text-[10px] text-stone-500 hover:text-stone-300 flex items-center gap-0.5 transition-colors cursor-pointer"
                >
                  Ver todo <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {nextLeones ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-200">
                    {nextLeones.name}
                  </span>
                  <span className="text-[11px] font-bold text-amber-400 font-mono">
                    {nextLeones.current} / {nextLeones.target} {nextLeones.unit}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-stone-500 italic">✅ Leones al día</span>
              )}
            </div>

            {/* 5. Brotes (Proyectos) */}
            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">
                  🌱 Brotes (Proyectos)
                </span>
              </div>
              {nextBrotes ? (
                <div 
                  onClick={() => toggleBrotesTask(nextBrotes.id)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-5 h-5 rounded-md border border-stone-700 bg-stone-950 flex items-center justify-center shrink-0 group-hover:border-teal-500 transition-colors">
                    {nextBrotes.completed && <Check className="w-3.5 h-3.5 text-teal-400 stroke-[3]" />}
                  </div>
                  <span className="text-xs font-medium text-stone-200 group-hover:text-white transition-colors">
                    {nextBrotes.text}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-stone-500 italic">✅ Brotes al día</span>
              )}
            </div>

            {/* 6. Setas */}
            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                  🍄 Setas
                </span>
                <button 
                  onClick={() => onNavigate('sets')}
                  className="text-[10px] text-stone-500 hover:text-stone-300 flex items-center gap-0.5 transition-colors cursor-pointer"
                >
                  Ver todo <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {nextSetas ? (
                <div 
                  onClick={() => toggleSetasTask(nextSetas.id)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-5 h-5 rounded-md border border-stone-700 bg-stone-950 flex items-center justify-center shrink-0 group-hover:border-rose-500 transition-colors">
                    {nextSetas.completed && <Check className="w-3.5 h-3.5 text-rose-400 stroke-[3]" />}
                  </div>
                  <span className="text-xs font-medium text-stone-200 group-hover:text-white transition-colors">
                    {nextSetas.text}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-stone-500 italic">✅ Setas al día</span>
              )}
            </div>

            {/* 7. Trenes */}
            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                  🚂 Trenes
                </span>
                <button 
                  onClick={() => onNavigate('trains')}
                  className="text-[10px] text-stone-500 hover:text-stone-300 flex items-center gap-0.5 transition-colors cursor-pointer"
                >
                  Ver todo <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {nextTrains ? (
                <div 
                  onClick={() => toggleTrainsTask(nextTrains.id)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-5 h-5 rounded-md border border-stone-700 bg-stone-950 flex items-center justify-center shrink-0 group-hover:border-indigo-500 transition-colors">
                    {nextTrains.completed && <Check className="w-3.5 h-3.5 text-indigo-400 stroke-[3]" />}
                  </div>
                  <span className="text-xs font-medium text-stone-200 group-hover:text-white transition-colors">
                    {nextTrains.text}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-stone-500 italic">✅ Trenes al día</span>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
