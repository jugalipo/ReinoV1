import React, { useState, useEffect } from 'react';
import { AppData, ViewState } from '../types';
import { ArrowLeft, CheckCircle2, Target } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getCanonicalHunoShortcut } from '../App';

interface TasksHubViewProps {
  data: AppData;
  onUpdateData: (data: AppData) => void;
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
}

interface DailyFrontData {
  text: string;
  completed: boolean;
}

interface DailyFrontsState {
  date: string;
  fronts: {
    tren?: DailyFrontData;
    seta?: DailyFrontData;
    roble?: DailyFrontData;
    yunque?: DailyFrontData;
    leones?: DailyFrontData;
    brotes?: DailyFrontData;
  };
}

interface FrontTaskItem {
  id: string;
  category: 'foco' | 'trains' | 'sets' | 'roble' | 'yunque' | 'leones' | 'love' | 'projects';
  name: string;
  emoji: string;
  taskText: string;
  completed: boolean;
  notes?: string;
  navigateView?: ViewState;
  onToggle: () => void;
}

export const TasksHubView: React.FC<TasksHubViewProps> = ({
  data,
  onUpdateData,
  onBack,
  onNavigate
}) => {
  const [dailyFocus, setDailyFocus] = useState<{ date: string; text: string; completed: boolean } | null>(null);
  const [injectedFronts, setInjectedFronts] = useState<DailyFrontsState | null>(null);

  // Escuchar Foco Ineludible de Hoy
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

  // Escuchar Frentes Diarios Inyectados por Sebastian
  useEffect(() => {
    try {
      const frontsRef = doc(db, 'users', 'rrhzO4FVdwNTQW4DiVsJYBsuLbK2', 'habits', 'daily_fronts');
      const unsub = onSnapshot(frontsRef, (snap) => {
        if (snap.exists()) {
          setInjectedFronts(snap.data() as any);
        } else {
          setInjectedFronts(null);
        }
      }, (err) => {
        console.warn('Firestore daily_fronts onSnapshot error:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Error listening to daily_fronts:', e);
    }
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Alternar el foco diario en Firestore
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

  // Helper de sincronización: commitea el Huno en AppData SIN alterar las subtareas internas de trenes, setas ni roble
  const syncHunoState = (targetCompleted: boolean, matchFn: (huno: typeof data.hunos[0]) => boolean) => {
    const todayKey = new Date().toDateString();
    const targetHuno = (data.hunos || []).find(matchFn);
    if (!targetHuno) return;

    const updatedHunos = (data.hunos || []).map(h => {
      if (h.id === targetHuno.id) {
        return { ...h, completed: targetCompleted };
      }
      return h;
    });

    const completedIds = updatedHunos.filter(t => t.completed).map(t => t.id);
    const updatedHistory = { ...(data.hunosHistory || {}), [todayKey]: completedIds };

    onUpdateData({
      ...data,
      hunos: updatedHunos,
      hunosHistory: updatedHistory
    });
  };

  // Guardar cambio de estado en Firestore para el frente inyectado
  const updateInjectedFrontStatus = async (frontKey: 'tren' | 'seta' | 'roble' | 'yunque' | 'leones' | 'brotes', newCompleted: boolean) => {
    try {
      const frontsRef = doc(db, 'users', 'rrhzO4FVdwNTQW4DiVsJYBsuLbK2', 'habits', 'daily_fronts');
      const prevData = injectedFronts || { date: todayStr, fronts: {} };
      const currentItem = prevData.fronts?.[frontKey] || { text: '', completed: false };

      await setDoc(frontsRef, {
        ...prevData,
        date: prevData.date || todayStr,
        updatedAt: Date.now(),
        fronts: {
          ...prevData.fronts,
          [frontKey]: {
            ...currentItem,
            completed: newCompleted
          }
        }
      }, { merge: true });
    } catch (e) {
      console.error(`Error actualizando frente inyectado ${frontKey}:`, e);
    }
  };

  // Detectar estado cumplido del Huno correspondiente en la ventana de inicio
  const isHunoDone = (matchFn: (huno: typeof data.hunos[0]) => boolean): boolean => {
    const found = (data.hunos || []).find(matchFn);
    return found ? found.completed : false;
  };

  // 1. TRENES (Huno: trains / tren)
  const hunoTrenDone = isHunoDone(h => {
    const sc = h.shortcut || getCanonicalHunoShortcut(h);
    return sc === 'trains' || h.text.toLowerCase().includes('tren');
  });
  const trenInjected = injectedFronts?.fronts?.tren;
  const isTrenDone = trenInjected !== undefined ? trenInjected.completed : hunoTrenDone;
  const toggleTrain = () => {
    const nextVal = !isTrenDone;
    updateInjectedFrontStatus('tren', nextVal);
    syncHunoState(nextVal, h => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return sc === 'trains' || h.text.toLowerCase().includes('tren');
    });
  };

  // 2. SETAS (Huno: sets / seta)
  const hunoSetaDone = isHunoDone(h => {
    const sc = h.shortcut || getCanonicalHunoShortcut(h);
    return sc === 'sets' || h.text.toLowerCase().includes('seta');
  });
  const setaInjected = injectedFronts?.fronts?.seta;
  const isSetaDone = setaInjected !== undefined ? setaInjected.completed : hunoSetaDone;
  const toggleSeta = () => {
    const nextVal = !isSetaDone;
    updateInjectedFrontStatus('seta', nextVal);
    syncHunoState(nextVal, h => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return sc === 'sets' || h.text.toLowerCase().includes('seta');
    });
  };

  // 3. ROBLE (Huno: forjas / roble / T2)
  const hunoRobleDone = isHunoDone(h => {
    const sc = h.shortcut || getCanonicalHunoShortcut(h);
    return sc === 'forjas' || h.text.toLowerCase().includes('roble') || h.text.includes('T2');
  });
  const robleInjected = injectedFronts?.fronts?.roble;
  const isRobleDone = robleInjected !== undefined ? robleInjected.completed : hunoRobleDone;
  const toggleRoble = () => {
    const nextVal = !isRobleDone;
    updateInjectedFrontStatus('roble', nextVal);
    syncHunoState(nextVal, h => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return sc === 'forjas' || h.text.toLowerCase().includes('roble') || h.text.includes('T2');
    });
  };

  // 4. YUNQUE (Huno: yunque / T3 / huno-8)
  const hunoYunqueDone = isHunoDone(h =>
    h.text.toLowerCase().includes('yunque') || h.text.includes('T3') || h.id === 'huno-8'
  );
  const yunqueInjected = injectedFronts?.fronts?.yunque;
  const isYunqueDone = yunqueInjected !== undefined ? yunqueInjected.completed : hunoYunqueDone;
  const toggleYunque = () => {
    const nextVal = !isYunqueDone;
    updateInjectedFrontStatus('yunque', nextVal);
    syncHunoState(nextVal, h =>
      h.text.toLowerCase().includes('yunque') || h.text.includes('T3') || h.id === 'huno-8'
    );
  };

  // 5. LEONES (Huno: leones / T1)
  const hunoLeonesDone = isHunoDone(h => {
    const sc = h.shortcut || getCanonicalHunoShortcut(h);
    return sc === 'leones' || h.text.toLowerCase().includes('león') || h.text.toLowerCase().includes('leon') || h.text.includes('T1');
  });
  const leonesInjected = injectedFronts?.fronts?.leones;
  const isLeonDone = leonesInjected !== undefined ? leonesInjected.completed : hunoLeonesDone;
  const toggleLeon = () => {
    const nextVal = !isLeonDone;
    updateInjectedFrontStatus('leones', nextVal);
    syncHunoState(nextVal, h => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return sc === 'leones' || h.text.toLowerCase().includes('león') || h.text.toLowerCase().includes('leon') || h.text.includes('T1');
    });
  };

  // 6. BROTES (Huno: huno-2 / love / ❤️ Brotes)
  const hunoBrotesDone = isHunoDone(h => {
    const sc = h.shortcut || getCanonicalHunoShortcut(h);
    return sc === 'love' || h.id === 'huno-2' || h.text.includes('❤️') || h.text.toLowerCase().includes('brote');
  });
  const brotesInjected = injectedFronts?.fronts?.brotes;
  const isBrotesDone = brotesInjected !== undefined ? brotesInjected.completed : hunoBrotesDone;
  const toggleBrotes = () => {
    const nextVal = !isBrotesDone;
    updateInjectedFrontStatus('brotes', nextVal);
    syncHunoState(nextVal, h => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return sc === 'love' || h.id === 'huno-2' || h.text.includes('❤️') || h.text.toLowerCase().includes('brote');
    });
  };

  // Fallbacks elegantes solo si aún no se ha ejecutado el rito matinal de inyección
  const fallbackTrain = (data.trains || []).find(t => !t.completed)?.text || 'Mantenimiento mensual';
  const fallbackSeta = (data.sets || []).find(t => !t.completed)?.text || 'Mantenimiento semanal';
  const fallbackRoble = (data.forjaTasks || []).find(t => !t.completed)?.text || 'Propósito trimestral';
  const fallbackLeon = (data.leones || []).find(t => t.current < t.target)?.name || 'Avance patrimonio';
  const urgentFriendForFallback = [...(data.friends || [])]
    .filter(f => !f.isSporadic && f.orbit !== 'hogar' && f.lastInteraction > 0)
    .sort((a, b) => a.lastInteraction - b.lastInteraction)[0];
  const fallbackBrotes = urgentFriendForFallback ? `Cuidar vínculo: ${urgentFriendForFallback.name}` : 'Cuidar un vínculo hoy';

  // Cuadrícula de frentes
  const dailyFronts: FrontTaskItem[] = [
    ...(dailyFocus ? [{
      id: 'foco-diario',
      category: 'foco' as const,
      name: 'Foco Diario',
      emoji: '⚡',
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
      taskText: trenInjected?.text || fallbackTrain,
      completed: isTrenDone,
      navigateView: 'trains',
      onToggle: toggleTrain
    },
    {
      id: 'setas-front',
      category: 'sets',
      name: 'Setas',
      emoji: '🍄',
      taskText: setaInjected?.text || fallbackSeta,
      completed: isSetaDone,
      navigateView: 'sets',
      onToggle: toggleSeta
    },
    {
      id: 'roble-front',
      category: 'roble',
      name: 'Roble',
      emoji: '🌳',
      taskText: robleInjected?.text || fallbackRoble,
      completed: isRobleDone,
      navigateView: 'forjas',
      onToggle: toggleRoble
    },
    {
      id: 'yunque-front',
      category: 'yunque',
      name: 'Yunque',
      emoji: '⚔️',
      taskText: yunqueInjected?.text || 'Despacho de grapas y argollas',
      completed: isYunqueDone,
      notes: 'Despacho (20\')',
      onToggle: toggleYunque
    },
    {
      id: 'leones-front',
      category: 'leones',
      name: 'Leones',
      emoji: '🦁',
      taskText: leonesInjected?.text || fallbackLeon,
      completed: isLeonDone,
      onToggle: toggleLeon
    },
    {
      id: 'brotes-front',
      category: 'love',
      name: 'Brotes',
      emoji: '❤️',
      taskText: brotesInjected?.text || fallbackBrotes,
      completed: isBrotesDone,
      navigateView: 'love',
      onToggle: toggleBrotes
    }
  ];

  // ORDENACIÓN: PENDIENTES ARRIBA, CUMPLIDOS ABAJO
  const sortedFronts = [...dailyFronts].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  // Metas semanales para la cabecera
  const weeklyLeones = data.weeklyGoals?.leones?.text?.trim() || 'Subir voluminoso Wallapop';
  const weeklyRoble = data.weeklyGoals?.forjas?.text?.trim() || 'Estatutos CBT PDF';
  const weeklyYunque = data.weeklyGoals?.puerto?.text?.trim() || 'Plan Códice Dagda';

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

  const getFrontItemClass = (item: FrontTaskItem) => {
    if (item.completed) {
      switch (item.category) {
        case 'foco':
          return 'bg-amber-500/25 border-amber-500/70 text-amber-100 shadow-sm shadow-amber-950/20';
        case 'trains':
          return 'bg-sky-500/25 border-sky-500/70 text-sky-100 shadow-sm shadow-sky-950/20';
        case 'sets':
          return 'bg-purple-500/25 border-purple-500/70 text-purple-100 shadow-sm shadow-purple-950/20';
        case 'roble':
          return 'bg-emerald-500/25 border-emerald-500/70 text-emerald-100 shadow-sm shadow-emerald-950/20';
        case 'yunque':
          return 'bg-blue-500/25 border-blue-500/70 text-blue-100 shadow-sm shadow-blue-950/20';
        case 'leones':
          return 'bg-amber-500/25 border-amber-500/70 text-amber-100 shadow-sm shadow-amber-950/20';
        case 'love':
          return 'bg-rose-500/25 border-rose-500/70 text-rose-100 shadow-sm shadow-rose-950/20';
        default:
          return 'bg-emerald-500/25 border-emerald-500/70 text-emerald-100 shadow-sm shadow-emerald-950/20';
      }
    }
    if (item.category === 'foco') {
      return 'bg-gradient-to-r from-amber-950/30 via-stone-900 to-stone-900 border-amber-500/50 hover:border-amber-400/70 text-stone-100 shadow-sm';
    }
    return 'bg-stone-900/90 border-stone-800 hover:border-stone-700 text-stone-200 shadow-sm';
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
            <h1 className="text-xl font-black text-stone-100 flex items-center gap-2 tracking-tight">
              <CheckCircle2 className="w-5 h-5 text-purple-400" />
              Cuadro de Mando
            </h1>
          </div>
        </div>
      </header>

      <div className="space-y-5">
        {/* CABECERA SEMANAL: 3 Metas apiladas */}
        <section className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between mb-1 px-0.5">
            <span className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              Metas Semanales
            </span>
            <span className="text-xs font-bold text-stone-400 font-mono">
              {[isWeeklyLeonesDone, isWeeklyRobleDone, isWeeklyYunqueDone].filter(Boolean).length}/3
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Meta 1: Leones */}
            <div
              onClick={() => toggleWeeklyGoal('leones')}
              className={`w-full p-3.5 rounded-xl border flex items-center gap-3.5 cursor-pointer transition-all active:scale-[0.99] ${
                isWeeklyLeonesDone
                  ? 'bg-amber-500/25 border-amber-500/70 text-amber-100 shadow-sm shadow-amber-950/20'
                  : 'bg-stone-950/80 border-stone-800 hover:border-amber-500/50 text-stone-200'
              }`}
              title="Alternar estado meta Leones"
            >
              <span className="text-2xl select-none flex-shrink-0">🦁</span>
              <span className={`text-[15px] sm:text-base font-semibold leading-snug flex-1 ${
                isWeeklyLeonesDone ? 'line-through text-amber-200/90' : 'text-stone-100'
              }`}>
                {weeklyLeones}
              </span>
            </div>

            {/* Meta 2: Roble */}
            <div
              onClick={() => toggleWeeklyGoal('forjas')}
              className={`w-full p-3.5 rounded-xl border flex items-center gap-3.5 cursor-pointer transition-all active:scale-[0.99] ${
                isWeeklyRobleDone
                  ? 'bg-emerald-500/25 border-emerald-500/70 text-emerald-100 shadow-sm shadow-emerald-950/20'
                  : 'bg-stone-950/80 border-stone-800 hover:border-emerald-500/50 text-stone-200'
              }`}
              title="Alternar estado meta Roble"
            >
              <span className="text-2xl select-none flex-shrink-0">🌳</span>
              <span className={`text-[15px] sm:text-base font-semibold leading-snug flex-1 ${
                isWeeklyRobleDone ? 'line-through text-emerald-200/90' : 'text-stone-100'
              }`}>
                {weeklyRoble}
              </span>
            </div>

            {/* Meta 3: Yunque */}
            <div
              onClick={() => toggleWeeklyGoal('puerto')}
              className={`w-full p-3.5 rounded-xl border flex items-center gap-3.5 cursor-pointer transition-all active:scale-[0.99] ${
                isWeeklyYunqueDone
                  ? 'bg-blue-500/25 border-blue-500/70 text-blue-100 shadow-sm shadow-blue-950/20'
                  : 'bg-stone-950/80 border-stone-800 hover:border-blue-500/50 text-stone-200'
              }`}
              title="Alternar estado meta Yunque"
            >
              <span className="text-2xl select-none flex-shrink-0">🚢</span>
              <span className={`text-[15px] sm:text-base font-semibold leading-snug flex-1 ${
                isWeeklyYunqueDone ? 'line-through text-blue-200/90' : 'text-stone-100'
              }`}>
                {weeklyYunque}
              </span>
            </div>
          </div>
        </section>

        {/* LISTA DE FRENTES DIARIOS: 1 por fila apilados */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
              <span>Frentes Activos de Hoy</span>
            </h2>
            <span className="text-xs font-bold text-stone-400 font-mono">
              {sortedFronts.filter(f => !f.completed).length} pendientes
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {sortedFronts.map((item) => (
              <div
                key={item.id}
                onClick={item.onToggle}
                className={`w-full p-3.5 rounded-2xl border flex items-center gap-3.5 cursor-pointer transition-all active:scale-[0.99] ${getFrontItemClass(item)}`}
                title={item.completed ? 'Marcar pendiente' : 'Marcar completado'}
              >
                <span className="text-2xl select-none flex-shrink-0">
                  {item.emoji}
                </span>
                <span className={`text-[15px] sm:text-base font-semibold leading-snug flex-1 ${
                  item.completed ? 'line-through opacity-90' : 'text-stone-100'
                }`}>
                  {item.taskText}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
