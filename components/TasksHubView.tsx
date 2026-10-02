import React, { useState, useEffect } from 'react';
import { AppData, ViewState } from '../types';
import { ArrowLeft, CheckCircle2, ChevronRight, Check, Target, Zap } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getCanonicalHunoShortcut } from '../App';

interface TasksHubViewProps {
  data: AppData;
  onUpdateData: (data: AppData) => void;
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
}

interface FrontTaskItem {
  id: string;
  category: 'foco' | 'trains' | 'sets' | 'roble' | 'yunque' | 'leones' | 'projects';
  name: string;
  emoji: string;
  color: string;
  taskText: string;
  completed: boolean;
  notes?: string;
  navigateView?: ViewState;
  onToggle: () => void;
}

// Resumir texto a máximo 3 palabras clave
const summarizeToThreeWords = (text: string, fallback: string): string => {
  if (!text || !text.trim()) return fallback;
  const words = text
    .trim()
    .replace(/[«»"'\(\)\[\]]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= 3) return words.join(' ');
  return words.slice(0, 3).join(' ');
};

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

  // Helper para alternar el foco diario en Firestore
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

  // Sincronización bidireccional con Hunos
  const syncHunoState = (currentHunos: typeof data.hunos, targetCompleted: boolean, matchFn: (huno: typeof data.hunos[0]) => boolean) => {
    const todayKey = new Date().toDateString();
    const targetHuno = currentHunos.find(matchFn);
    if (!targetHuno) return { updatedHunos: currentHunos, updatedHistory: data.hunosHistory || {} };

    const updatedHunos = currentHunos.map(h => {
      if (h.id === targetHuno.id) {
        return { ...h, completed: targetCompleted };
      }
      return h;
    });

    const completedIds = updatedHunos.filter(t => t.completed).map(t => t.id);
    const updatedHistory = { ...(data.hunosHistory || {}), [todayKey]: completedIds };

    return { updatedHunos, updatedHistory };
  };

  // 1. TRENES
  const nextTrain = (data.trains || []).find(t => !t.completed) || (data.trains || [])[0];
  const isTrainDone = nextTrain ? nextTrain.completed : false;
  const toggleTrain = () => {
    if (!nextTrain) return;
    const nextCompleted = !nextTrain.completed;
    const updatedTrains = (data.trains || []).map(t =>
      t.id === nextTrain.id ? { ...t, completed: nextCompleted } : t
    );
    const { updatedHunos, updatedHistory } = syncHunoState(
      data.hunos,
      nextCompleted,
      h => {
        const sc = h.shortcut || getCanonicalHunoShortcut(h);
        return sc === 'trains' || h.text.toLowerCase().includes('tren');
      }
    );
    onUpdateData({
      ...data,
      trains: updatedTrains,
      hunos: updatedHunos,
      hunosHistory: updatedHistory
    });
  };

  // 2. SETAS
  const nextSeta = (data.sets || []).find(t => !t.completed) || (data.sets || [])[0];
  const isSetaDone = nextSeta ? nextSeta.completed : false;
  const toggleSeta = () => {
    if (!nextSeta) return;
    const nextCompleted = !nextSeta.completed;
    const updatedSets = (data.sets || []).map(t =>
      t.id === nextSeta.id ? { ...t, completed: nextCompleted } : t
    );
    const { updatedHunos, updatedHistory } = syncHunoState(
      data.hunos,
      nextCompleted,
      h => {
        const sc = h.shortcut || getCanonicalHunoShortcut(h);
        return sc === 'sets' || h.text.toLowerCase().includes('seta');
      }
    );
    onUpdateData({
      ...data,
      sets: updatedSets,
      hunos: updatedHunos,
      hunosHistory: updatedHistory
    });
  };

  // 3. ROBLE
  const nextRoble = (data.forjaTasks || []).find(t => !t.completed) || (data.forjaTasks || [])[0];
  const isRobleDone = nextRoble ? nextRoble.completed : false;
  const toggleRoble = () => {
    if (!nextRoble) return;
    const nextCompleted = !nextRoble.completed;
    const updatedRoble = (data.forjaTasks || []).map(t =>
      t.id === nextRoble.id ? { ...t, completed: nextCompleted } : t
    );
    const { updatedHunos, updatedHistory } = syncHunoState(
      data.hunos,
      nextCompleted,
      h => {
        const sc = h.shortcut || getCanonicalHunoShortcut(h);
        return sc === 'forjas' || h.text.toLowerCase().includes('roble') || h.text.includes('T2');
      }
    );
    onUpdateData({
      ...data,
      forjaTasks: updatedRoble,
      hunos: updatedHunos,
      hunosHistory: updatedHistory
    });
  };

  // 4. YUNQUE
  const hunoYunque = (data.hunos || []).find(h =>
    h.text.toLowerCase().includes('yunque') || h.text.includes('T3') || h.id === 'huno-8'
  );
  const isYunqueDone = hunoYunque ? hunoYunque.completed : false;
  const toggleYunque = () => {
    if (!hunoYunque) return;
    const nextCompleted = !hunoYunque.completed;
    const { updatedHunos, updatedHistory } = syncHunoState(
      data.hunos,
      nextCompleted,
      h => h.id === hunoYunque.id
    );
    onUpdateData({
      ...data,
      hunos: updatedHunos,
      hunosHistory: updatedHistory
    });
  };

  // 5. LEONES
  const nextLeon = (data.leones || []).find(t => t.current < t.target) || (data.leones || [])[0];
  const isLeonDone = nextLeon ? nextLeon.current >= nextLeon.target : false;
  const toggleLeon = () => {
    if (!nextLeon) return;
    const nextTargetReached = !isLeonDone;
    const updatedLeones = (data.leones || []).map(t =>
      t.id === nextLeon.id ? { ...t, current: nextTargetReached ? t.target : 0 } : t
    );
    const { updatedHunos, updatedHistory } = syncHunoState(
      data.hunos,
      nextTargetReached,
      h => {
        const sc = h.shortcut || getCanonicalHunoShortcut(h);
        return sc === 'leones' || h.text.toLowerCase().includes('león') || h.text.toLowerCase().includes('leon') || h.text.includes('T1');
      }
    );
    onUpdateData({
      ...data,
      leones: updatedLeones,
      hunos: updatedHunos,
      hunosHistory: updatedHistory
    });
  };

  // 6. BROTES (PROYECTOS / RELACIONES)
  const nextProject = (data.projects || []).find(t => !t.completed) || (data.projects || [])[0];
  const isProjectDone = nextProject ? nextProject.completed : false;
  const toggleProject = () => {
    if (!nextProject) return;
    const nextCompleted = !nextProject.completed;
    const updatedProjects = (data.projects || []).map(t =>
      t.id === nextProject.id ? { ...t, completed: nextCompleted } : t
    );
    const { updatedHunos, updatedHistory } = syncHunoState(
      data.hunos,
      nextCompleted,
      h => {
        const sc = h.shortcut || getCanonicalHunoShortcut(h);
        return sc === 'projects' || h.text.toLowerCase().includes('nube') || h.text.toLowerCase().includes('proyecto') || h.text.startsWith('P ');
      }
    );
    onUpdateData({
      ...data,
      projects: updatedProjects,
      hunos: updatedHunos,
      hunosHistory: updatedHistory
    });
  };

  // Construcción de la lista de frentes diarios
  const dailyFronts: FrontTaskItem[] = [
    ...(dailyFocus ? [{
      id: 'foco-diario',
      category: 'foco' as const,
      name: 'Foco Diario',
      emoji: '⚡',
      color: 'amber',
      taskText: dailyFocus.text || 'Sin foco establecido',
      completed: dailyFocus.completed,
      notes: dailyFocus.date === todayStr ? 'Ineludible de hoy' : dailyFocus.date,
      onToggle: toggleDailyFocus
    }] : []),
    {
      id: 'trenes-front',
      category: 'trains',
      name: 'Trenes',
      emoji: '🚂',
      color: 'indigo',
      taskText: nextTrain?.text || 'Mantenimiento mensual al día',
      completed: isTrainDone,
      navigateView: 'trains',
      onToggle: toggleTrain
    },
    {
      id: 'setas-front',
      category: 'sets',
      name: 'Setas',
      emoji: '🍄',
      color: 'rose',
      taskText: nextSeta?.text || 'Mantenimiento semanal al día',
      completed: isSetaDone,
      navigateView: 'sets',
      onToggle: toggleSeta
    },
    {
      id: 'roble-front',
      category: 'roble',
      name: 'Roble',
      emoji: '🌳',
      color: 'emerald',
      taskText: nextRoble?.text || (data.forjas?.[0]?.name ? `Avance en ${data.forjas[0].name}` : 'Propósitos trimestrales al día'),
      completed: isRobleDone,
      navigateView: 'forjas',
      onToggle: toggleRoble
    },
    {
      id: 'yunque-front',
      category: 'yunque',
      name: 'Yunque',
      emoji: '⚔️',
      color: 'blue',
      taskText: hunoYunque?.text || 'Despacho de grapas y argollas',
      completed: isYunqueDone,
      notes: 'Despacho diario (20\')',
      onToggle: toggleYunque
    },
    {
      id: 'leones-front',
      category: 'leones',
      name: 'Leones',
      emoji: '🦁',
      color: 'amber',
      taskText: nextLeon ? `${nextLeon.name} (${nextLeon.current}/${nextLeon.target} ${nextLeon.unit})` : 'Patrimonio y finanzas al día',
      completed: isLeonDone,
      navigateView: 'leones',
      onToggle: toggleLeon
    },
    {
      id: 'brotes-front',
      category: 'projects',
      name: 'Brotes',
      emoji: '🌱',
      color: 'teal',
      taskText: nextProject?.text || 'Vínculos y proyectos al día',
      completed: isProjectDone,
      onToggle: toggleProject
    }
  ];

  // Ordenación estricta: PENDIENTES ARRIBA, COMPLETADOS ABAJO
  const sortedFronts = [...dailyFronts].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  // Metas semanales para la cabecera (3 palabras por meta)
  const weeklyLeones = summarizeToThreeWords(data.weeklyGoals?.leones?.text || '', 'Subir voluminoso Wallapop');
  const weeklyRoble = summarizeToThreeWords(data.weeklyGoals?.forjas?.text || '', 'Estatutos CBT PDF');
  const weeklyYunque = summarizeToThreeWords(data.weeklyGoals?.puerto?.text || '', 'Plan Códice Dagda');

  const isWeeklyLeonesDone = !!data.weeklyGoals?.leones?.completed;
  const isWeeklyRobleDone = !!data.weeklyGoals?.forjas?.completed;
  const isWeeklyYunqueDone = !!data.weeklyGoals?.puerto?.completed;

  const toggleWeeklyGoal = (type: 'leones' | 'forjas' | 'puerto') => {
    const currentGoals = data.weeklyGoals || {
      leones: { text: '', completed: false },
      forjas: { text: '', completed: false },
      puerto: { text: '', completed: false },
      lastReset: Date.now()
    };
    onUpdateData({
      ...data,
      weeklyGoals: {
        ...currentGoals,
        [type]: {
          ...currentGoals[type],
          completed: !currentGoals[type]?.completed
        }
      }
    });
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-stone-950 p-4 pb-28 text-stone-200">
      {/* Cabecera Principal */}
      <header className="flex items-center justify-between mb-4 pt-1 border-b border-stone-800/80 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-stone-900 rounded-xl text-stone-400 hover:text-stone-100 transition-colors cursor-pointer"
            title="Volver al inicio"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-black text-stone-100 flex items-center gap-2 tracking-tight">
              <CheckCircle2 className="w-5 h-5 text-purple-400" />
              Cuadro de Mando Diario
            </h1>
            <p className="text-[11px] text-stone-400 font-medium">
              Frentes del día y sincronización con Hunos
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-5">
        {/* CABECERA SEMANAL: 3 Metas resumidas en 3 palabras */}
        <section className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Metas Semanales
            </span>
            <span className="text-[10px] font-bold text-stone-500 font-mono">
              {[isWeeklyLeonesDone, isWeeklyRobleDone, isWeeklyYunqueDone].filter(Boolean).length}/3
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Meta 1: Leones */}
            <div
              onClick={() => toggleWeeklyGoal('leones')}
              className={`p-2 rounded-xl border flex flex-col items-center text-center cursor-pointer transition-all active:scale-95 ${
                isWeeklyLeonesDone
                  ? 'bg-amber-950/20 border-amber-800/40 text-stone-400 line-through'
                  : 'bg-stone-950/80 border-stone-800 hover:border-amber-500/50 text-stone-200'
              }`}
              title="Alternar estado meta Leones"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-base">🦁</span>
                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                  isWeeklyLeonesDone ? 'bg-amber-600 border-amber-600' : 'border-stone-700'
                }`}>
                  {isWeeklyLeonesDone && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </div>
              </div>
              <span className="text-[11px] font-black uppercase tracking-tight leading-tight line-clamp-2">
                {weeklyLeones}
              </span>
            </div>

            {/* Meta 2: Roble */}
            <div
              onClick={() => toggleWeeklyGoal('forjas')}
              className={`p-2 rounded-xl border flex flex-col items-center text-center cursor-pointer transition-all active:scale-95 ${
                isWeeklyRobleDone
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-stone-400 line-through'
                  : 'bg-stone-950/80 border-stone-800 hover:border-emerald-500/50 text-stone-200'
              }`}
              title="Alternar estado meta Roble"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-base">🌳</span>
                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                  isWeeklyRobleDone ? 'bg-emerald-600 border-emerald-600' : 'border-stone-700'
                }`}>
                  {isWeeklyRobleDone && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </div>
              </div>
              <span className="text-[11px] font-black uppercase tracking-tight leading-tight line-clamp-2">
                {weeklyRoble}
              </span>
            </div>

            {/* Meta 3: Yunque */}
            <div
              onClick={() => toggleWeeklyGoal('puerto')}
              className={`p-2 rounded-xl border flex flex-col items-center text-center cursor-pointer transition-all active:scale-95 ${
                isWeeklyYunqueDone
                  ? 'bg-blue-950/20 border-blue-800/40 text-stone-400 line-through'
                  : 'bg-stone-950/80 border-stone-800 hover:border-blue-500/50 text-stone-200'
              }`}
              title="Alternar estado meta Yunque"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-base">🚢</span>
                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                  isWeeklyYunqueDone ? 'bg-blue-600 border-blue-600' : 'border-stone-700'
                }`}>
                  {isWeeklyYunqueDone && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </div>
              </div>
              <span className="text-[11px] font-black uppercase tracking-tight leading-tight line-clamp-2">
                {weeklyYunque}
              </span>
            </div>
          </div>
        </section>

        {/* CUADRÍCULA DE FRENTES DIARIOS: 2 por fila en móvil */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
              <span>Frentes Activos de Hoy</span>
            </h2>
            <span className="text-[10px] font-bold text-stone-500">
              {sortedFronts.filter(f => !f.completed).length} pendientes
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {sortedFronts.map((item) => (
              <div
                key={item.id}
                className={`relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-300 ${
                  item.completed
                    ? 'bg-stone-900/40 border-stone-800/50 opacity-60'
                    : item.category === 'foco'
                    ? 'bg-gradient-to-b from-amber-950/40 via-stone-900 to-stone-900/90 border-amber-500/40 shadow-md shadow-amber-950/20'
                    : 'bg-stone-900/90 border-stone-800 hover:border-stone-700 shadow-sm'
                }`}
              >
                {/* Cabecera del cuadro: Emoji grande y Check */}
                <div className="flex items-start justify-between mb-2">
                  <span className="text-3xl select-none filter drop-shadow">
                    {item.emoji}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onToggle();
                    }}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
                      item.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-stone-700 hover:border-emerald-500 bg-stone-950'
                    }`}
                    title={item.completed ? 'Marcar pendiente' : 'Marcar completado'}
                  >
                    {item.completed && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                </div>

                {/* Frente y tarea acordada */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <span className={`text-[11px] font-black uppercase tracking-wider ${
                        item.completed
                          ? 'text-stone-500 line-through'
                          : item.category === 'foco'
                          ? 'text-amber-400'
                          : 'text-stone-300'
                      }`}>
                        {item.name}
                      </span>
                    </div>

                    <p className={`text-xs font-semibold mt-1 leading-snug line-clamp-3 ${
                      item.completed ? 'line-through text-stone-500' : 'text-stone-100'
                    }`}>
                      {item.taskText}
                    </p>
                  </div>

                  {/* Pie de tarjeta / Enlace rápido si aplica */}
                  <div className="mt-2.5 pt-1.5 border-t border-stone-800/40 flex items-center justify-between text-[10px]">
                    {item.notes ? (
                      <span className="text-stone-500 italic truncate max-w-[100px]">
                        {item.notes}
                      </span>
                    ) : (
                      <span className="text-stone-600">
                        {item.completed ? 'Completado' : 'Pendiente'}
                      </span>
                    )}

                    {item.navigateView && (
                      <button
                        onClick={() => onNavigate(item.navigateView!)}
                        className="text-stone-400 hover:text-stone-200 flex items-center gap-0.5 ml-auto font-medium transition-colors cursor-pointer"
                        title={`Ir a ${item.name}`}
                      >
                        Ver <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
