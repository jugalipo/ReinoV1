import React, { useState, useEffect } from 'react';
import { AppData, Task, ViewState } from '../types';
import { ArrowLeft, CheckCircle2, ChevronRight, Check, Target, Compass, Sparkles, Shield, Anchor, Plus, Zap } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const DebouncedInput = ({ value, onChange, ...props }: any) => {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => { setLocalValue(value); }, [value]);
  return (
    <input
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => { if (localValue !== value) onChange(localValue); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          if (localValue !== value) onChange(localValue);
          e.currentTarget.blur();
        }
      }}
    />
  );
};

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
  const [dailyFocus, setDailyFocus] = useState<{ date: string; text: string; completed: boolean } | null>(null);

  useEffect(() => {
    try {
      const focusRef = doc(db, 'users', 'rrhzO4FVdwNTQW4DiVsJYBsuLbK2', 'habits', 'daily_focus');
      const unsub = onSnapshot(focusRef, (snap) => {
        if (snap.exists()) {
          setDailyFocus(snap.data() as any);
        } else {
          setDailyFocus(null);
        }
      }, (err) => {
        console.warn('Firestore daily_focus onSnapshot error:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Error listening to daily_focus:', e);
    }
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const toggleDailyFocus = async () => {
    if (!dailyFocus) return;
    try {
      const focusRef = doc(db, 'users', 'rrhzO4FVdwNTQW4DiVsJYBsuLbK2', 'habits', 'daily_focus');
      await setDoc(focusRef, {
        ...dailyFocus,
        completed: !dailyFocus.completed,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.error('Error toggling daily focus:', e);
    }
  };

  const updateWeeklyGoal = (type: 'leones' | 'forjas' | 'puerto', field: 'text' | 'completed', value: string | boolean) => {
    const currentGoals = data.weeklyGoals || {
      leones: { text: "", completed: false },
      forjas: { text: "", completed: false },
      puerto: { text: "", completed: false },
      lastReset: Date.now()
    };
    onUpdateData({
      ...data,
      weeklyGoals: {
        ...currentGoals,
        [type]: {
          ...currentGoals[type],
          [field]: value
        }
      }
    });
  };

  // 2. Extraer la primera tarea no completada de cada sección
  // Principal: Primer objetivo de forjas
  const principalGoal = data.forjas?.[0];

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
        {/* BLOQUE 1: Tareas Semanales (Idéntico a Inicio con Timeline y Edición) */}
        {(() => {
          const now = new Date();
          const day = now.getDay(); // 0 is Sunday, 6 is Saturday
          const diff = now.getDate() - day;
          const startOfCurrentWeek = new Date(now.getFullYear(), now.getMonth(), diff);
          startOfCurrentWeek.setHours(0, 0, 0, 0);

          const goalsLastReset = new Date(data.weeklyGoals?.lastReset || 0);
          const isExpired = goalsLastReset.getTime() < startOfCurrentWeek.getTime();

          return (
            <section className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5 px-1">
                <Target className="w-3.5 h-3.5" />
                Foco Semanal
              </h2>

              <div className="w-full relative overflow-hidden bg-stone-900/80 border border-stone-800 rounded-2xl p-4 shadow-sm">
                {/* Expired Overlay */}
                {isExpired && (
                  <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <span className="text-5xl mb-3 animate-bounce">⏳</span>
                    <h3 className="text-stone-100 font-black tracking-tighter text-xl uppercase italic">Tiempo Agotado</h3>
                    <p className="text-stone-500 text-[10px] font-bold tracking-widest uppercase mb-6">La semana ha terminado</p>
                    <button 
                      onClick={() => {
                        onUpdateData({
                          ...data,
                          weeklyGoals: {
                            leones: { text: '', completed: false },
                            forjas: { text: '', completed: false },
                            puerto: { text: '', completed: false },
                            lastReset: Date.now()
                          }
                        });
                      }}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-black px-6 py-3 rounded-xl text-xs transition-all hover:scale-105 active:scale-95 shadow-xl uppercase tracking-widest flex items-center gap-2"
                    >
                       <Plus className="w-4 h-4" /> Nuevas Tareas
                    </button>
                  </div>
                )}

                <div className={`space-y-3 transition-opacity duration-500 ${isExpired ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'}`}>
                  {/* Leones */}
                  <div className="flex items-center gap-3">
                    <span className="text-2xl flex-shrink-0">🦁</span>
                    {(() => {
                      const completed = !!data.weeklyGoals?.leones.completed;
                      return (
                        <DebouncedInput
                          type="text"
                          value={data.weeklyGoals?.leones.text || ''}
                          onChange={(val: string) => updateWeeklyGoal('leones', 'text', val)}
                          disabled={completed}
                          className={`flex-1 min-w-0 rounded-lg px-3 py-2 transition-colors text-xs font-medium ${
                            completed 
                              ? 'bg-amber-900/20 border border-amber-700/40 text-stone-400 cursor-not-allowed line-through' 
                              : 'bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500'
                          }`}
                          placeholder="Objetivo Leones..."
                        />
                      );
                    })()}
                    <button
                      onClick={() => !isExpired && updateWeeklyGoal('leones', 'completed', !(data.weeklyGoals?.leones.completed || false))}
                      className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${data.weeklyGoals?.leones.completed ? 'bg-amber-600 border-amber-600' : 'border-stone-700 hover:border-amber-500'}`}
                    >
                      {data.weeklyGoals?.leones.completed && <Check className="w-5 h-5 text-white" />}
                    </button>
                  </div>

                  {/* Forjas */}
                  <div className="flex items-center gap-3">
                    <span className="text-2xl flex-shrink-0">🍁</span>
                    {(() => {
                      const completed = !!data.weeklyGoals?.forjas.completed;
                      return (
                        <DebouncedInput
                          type="text"
                          value={data.weeklyGoals?.forjas.text || ''}
                          onChange={(val: string) => updateWeeklyGoal('forjas', 'text', val)}
                          disabled={completed}
                          className={`flex-1 min-w-0 rounded-lg px-3 py-2 transition-colors text-xs font-medium ${
                            completed 
                              ? 'bg-orange-900/20 border border-orange-700/40 text-stone-400 cursor-not-allowed line-through' 
                              : 'bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none focus:border-orange-500'
                          }`}
                          placeholder="Objetivo Roble..."
                        />
                      );
                    })()}
                    <button
                      onClick={() => !isExpired && updateWeeklyGoal('forjas', 'completed', !(data.weeklyGoals?.forjas.completed || false))}
                      className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${data.weeklyGoals?.forjas.completed ? 'bg-orange-600 border-orange-600' : 'border-stone-700 hover:border-orange-500'}`}
                    >
                      {data.weeklyGoals?.forjas.completed && <Check className="w-5 h-5 text-white" />}
                    </button>
                  </div>

                  {/* Puerto */}
                  <div className="flex items-center gap-3">
                    <span className="text-2xl flex-shrink-0">⚔️</span>
                    {(() => {
                      const completed = !!data.weeklyGoals?.puerto.completed;
                      return (
                        <DebouncedInput
                          type="text"
                          value={data.weeklyGoals?.puerto.text || ''}
                          onChange={(val: string) => updateWeeklyGoal('puerto', 'text', val)}
                          disabled={completed}
                          className={`flex-1 min-w-0 rounded-lg px-3 py-2 transition-colors text-xs font-medium ${
                            completed 
                              ? 'bg-blue-900/20 border border-blue-700/40 text-stone-400 cursor-not-allowed line-through' 
                              : 'bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none focus:border-blue-500'
                          }`}
                          placeholder="Objetivo Yunque..."
                        />
                      );
                    })()}
                    <button
                      onClick={() => !isExpired && updateWeeklyGoal('puerto', 'completed', !(data.weeklyGoals?.puerto.completed || false))}
                      className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${data.weeklyGoals?.puerto.completed ? 'bg-blue-600 border-blue-600' : 'border-stone-700 hover:border-blue-500'}`}
                    >
                      {data.weeklyGoals?.puerto.completed && <Check className="w-5 h-5 text-white" />}
                    </button>
                  </div>
                </div>

                {/* Weekly Timeline - Linea discontinua de 7 secciones */}
                <div className={`mt-4 transition-opacity duration-500 ${isExpired ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                  <div className="flex gap-1.5 h-1.5 w-full">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const isPassed = i < day;
                      const isToday = i === day;
                      
                      let bgColor = 'bg-stone-800';
                      if (isPassed) bgColor = 'bg-stone-500';
                      if (isToday) bgColor = 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]';

                      return (
                        <div 
                          key={i} 
                          className={`flex-1 rounded-full transition-all duration-700 ${bgColor}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* BLOQUE 2: Foco Ineludible de Hoy (daily_focus) */}
        {dailyFocus && (
          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5 px-1">
              <Zap className="w-3.5 h-3.5 fill-amber-400/20" />
              Foco Ineludible de Hoy
            </h2>

            <div className={`p-4 rounded-2xl border transition-all ${
              dailyFocus.completed 
                ? 'bg-amber-950/20 border-amber-800/40 text-stone-400' 
                : 'bg-gradient-to-r from-amber-950/40 via-stone-900 to-amber-950/20 border-amber-500/40 text-stone-100 shadow-lg shadow-amber-950/20'
            }`}>
              <div className="flex items-start gap-3">
                <button
                  onClick={toggleDailyFocus}
                  className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${
                    dailyFocus.completed 
                      ? 'bg-amber-600 border-amber-600 text-white' 
                      : 'border-stone-700 hover:border-amber-400 bg-stone-950'
                  }`}
                  title={dailyFocus.completed ? "Marcar pendiente" : "Marcar completado"}
                >
                  {dailyFocus.completed && <Check className="w-4 h-4 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-bold leading-relaxed block ${
                    dailyFocus.completed ? 'line-through text-stone-500' : 'text-amber-200'
                  }`}>
                    {dailyFocus.text}
                  </span>
                  <span className="text-[10px] text-stone-500 font-semibold block mt-1">
                    {dailyFocus.date === todayStr ? 'Prioridad establecida para hoy' : `Foco del ${dailyFocus.date}`}
                  </span>
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

            {/* 2. Roble */}
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
