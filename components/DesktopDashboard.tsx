import React, { useState, useEffect } from 'react';
import { AppData, Task, ViewState, WeeklyTask } from '../types';
import {
  BarChart3,
  CalendarClock,
  Check,
  ChevronRight,
  Cloud,
  Edit2,
  Heart,
  Info,
  LogOut,
  Map as MapIcon,
  Music,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  TreeDeciduous,
  Trophy,
  Utensils,
  Zap
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getCanonicalHunoShortcut } from '../App';
import { DailyHunos } from './DailyHunos';
import { SetsView } from './SetsView';
import { TrainView } from './TrainView';

const DebouncedInput = ({ value, onChange, ...props }: any) => {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  return (
    <input
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== value) onChange(localValue);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          if (localValue !== value) onChange(localValue);
          e.currentTarget.blur();
        }
      }}
    />
  );
};

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
    gimnasia?: DailyFrontData;
    lectura?: DailyFrontData;
    nubes?: DailyFrontData;
  };
}

interface FrontTaskItem {
  id: string;
  category: 'trains' | 'sets' | 'roble' | 'yunque' | 'leones' | 'projects' | 'workout' | 'read';
  name: string;
  emoji: string;
  taskText: string;
  completed: boolean;
  notes?: string;
  navigateView?: ViewState;
  onToggle: () => void;
}

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

export interface DesktopDashboardProps {
  data: AppData;
  onUpdateData: React.Dispatch<React.SetStateAction<AppData>>;
  onNavigate: (view: ViewState) => void;
  onTriggerFocus: () => void;
  onOpenGympiezaModal: () => void;
  onOpenHistory: () => void;
  onLogout: () => void;
  pastDays: Date[];
  onToggleStreakDayReview: (d: Date) => void;
  currentStreak: number;
  bosqueWeeklyMinutes: number;
  hasImportantLoveEventToday: boolean;
  loveProgress: number;
  forjasProgress: number;
  currentFoodScore: number;
  isFoodPleno: boolean;
  shouldJumangiareBounce: boolean;
  onFoodClick: () => void;
  lockedHunoIds: string[];
  onHunosUpdate: (tasks: Task[], isPleno?: boolean) => void;
  onSetsUpdate: (tasks: WeeklyTask[]) => void;
  onTrainsUpdate: (tasks: Task[]) => void;
  isNubesCollapsed: boolean;
  setIsNubesCollapsed: (val: boolean) => void;
  isEditingProjects: boolean;
  setIsEditingProjects: (val: boolean) => void;
  onToggleProject: (idx: number) => void;
  onProjectTextChange: (id: string, val: string) => void;
  onInitiateDeleteProject: (id: string) => void;
  onInitiateAddProject: () => void;
  onOpenProjectNotes: (id: string, currentNotes: string) => void;
  getEmoji: (text: string) => string;
}

export const DesktopDashboard: React.FC<DesktopDashboardProps> = ({
  data,
  onUpdateData,
  onNavigate,
  onTriggerFocus,
  onOpenGympiezaModal,
  onOpenHistory,
  onLogout,
  pastDays,
  onToggleStreakDayReview,
  currentStreak,
  bosqueWeeklyMinutes,
  hasImportantLoveEventToday,
  loveProgress,
  forjasProgress,
  currentFoodScore,
  isFoodPleno,
  shouldJumangiareBounce,
  onFoodClick,
  lockedHunoIds,
  onHunosUpdate,
  onSetsUpdate,
  onTrainsUpdate,
  isNubesCollapsed,
  setIsNubesCollapsed,
  isEditingProjects,
  setIsEditingProjects,
  onToggleProject,
  onProjectTextChange,
  onInitiateDeleteProject,
  onInitiateAddProject,
  onOpenProjectNotes,
  getEmoji
}) => {
  const [dailyFocus, setDailyFocus] = useState<{ date: string; text: string; completed: boolean } | null>(null);
  const [injectedFronts, setInjectedFronts] = useState<DailyFrontsState | null>(null);

  useEffect(() => {
    try {
      const focusRef = doc(db, 'users', 'rrhzO4FVdwNTQW4DiVsJYBsuLbK2', 'habits', 'daily_focus');
      const unsub = onSnapshot(
        focusRef,
        (snap) => {
          if (snap.exists()) {
            setDailyFocus(snap.data() as any);
          } else {
            setDailyFocus(null);
          }
        },
        (err) => {
          console.warn('Firestore daily_focus onSnapshot error:', err);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn('Error listening to daily_focus:', e);
    }
  }, []);

  useEffect(() => {
    try {
      const frontsRef = doc(db, 'users', 'rrhzO4FVdwNTQW4DiVsJYBsuLbK2', 'habits', 'daily_fronts');
      const unsub = onSnapshot(
        frontsRef,
        (snap) => {
          if (snap.exists()) {
            setInjectedFronts(snap.data() as any);
          } else {
            setInjectedFronts(null);
          }
        },
        (err) => {
          console.warn('Firestore daily_fronts onSnapshot error:', err);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn('Error listening to daily_fronts:', e);
    }
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const toggleDailyFocus = async () => {
    if (!dailyFocus) return;
    try {
      const focusRef = doc(db, 'users', 'rrhzO4FVdwNTQW4DiVsJYBsuLbK2', 'habits', 'daily_focus');
      await setDoc(
        focusRef,
        {
          ...dailyFocus,
          completed: !dailyFocus.completed,
          updatedAt: Date.now()
        },
        { merge: true }
      );
    } catch (e) {
      console.error('Error toggling daily focus:', e);
    }
  };

  const syncHunoState = (targetCompleted: boolean, matchFn: (huno: typeof data.hunos[0]) => boolean) => {
    const todayKey = new Date().toDateString();
    const targetHuno = (data.hunos || []).find(matchFn);
    if (!targetHuno) return;

    const updatedHunos = (data.hunos || []).map((h) => {
      if (h.id === targetHuno.id) {
        return { ...h, completed: targetCompleted };
      }
      return h;
    });

    const completedIds = updatedHunos.filter((t) => t.completed).map((t) => t.id);
    const updatedHistory = { ...(data.hunosHistory || {}), [todayKey]: completedIds };

    onUpdateData((prev) => ({
      ...prev,
      hunos: updatedHunos,
      hunosHistory: updatedHistory
    }));
  };

  const updateInjectedFrontStatus = async (
    frontKey: 'tren' | 'seta' | 'roble' | 'yunque' | 'leones' | 'brotes' | 'gimnasia' | 'lectura' | 'nubes',
    newCompleted: boolean
  ) => {
    try {
      const frontsRef = doc(db, 'users', 'rrhzO4FVdwNTQW4DiVsJYBsuLbK2', 'habits', 'daily_fronts');
      const prevData = injectedFronts || { date: todayStr, fronts: {} };
      const currentItem = prevData.fronts?.[frontKey] || { text: '', completed: false };

      await setDoc(
        frontsRef,
        {
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
        },
        { merge: true }
      );
    } catch (e) {
      console.error(`Error actualizando frente inyectado ${frontKey}:`, e);
    }
  };

  const isFrontFromToday = injectedFronts?.date === todayStr;

  // 1. TRENES
  const trenInjected = isFrontFromToday ? injectedFronts?.fronts?.tren : undefined;
  const isTrenDone = trenInjected?.completed === true;
  const toggleTrain = () => {
    const nextVal = !isTrenDone;
    updateInjectedFrontStatus('tren', nextVal);
    syncHunoState(nextVal, (h) => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return sc === 'trains' || h.text.toLowerCase().includes('tren');
    });
  };

  // 2. SETAS
  const setaInjected = isFrontFromToday ? injectedFronts?.fronts?.seta : undefined;
  const isSetaDone = setaInjected?.completed === true;
  const toggleSeta = () => {
    const nextVal = !isSetaDone;
    updateInjectedFrontStatus('seta', nextVal);
    syncHunoState(nextVal, (h) => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return sc === 'sets' || h.text.toLowerCase().includes('seta');
    });
  };

  // 3. ROBLE
  const robleInjected = isFrontFromToday ? injectedFronts?.fronts?.roble : undefined;
  const isRobleDone = robleInjected?.completed === true;
  const toggleRoble = () => {
    const nextVal = !isRobleDone;
    updateInjectedFrontStatus('roble', nextVal);
    syncHunoState(nextVal, (h) => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return sc === 'forjas' || h.text.toLowerCase().includes('roble') || h.text.includes('T2');
    });
  };

  // 4. YUNQUE
  const yunqueInjected = isFrontFromToday ? injectedFronts?.fronts?.yunque : undefined;
  const isYunqueDone = yunqueInjected?.completed === true;
  const toggleYunque = () => {
    const nextVal = !isYunqueDone;
    updateInjectedFrontStatus('yunque', nextVal);
    syncHunoState(
      nextVal,
      (h) => h.text.toLowerCase().includes('yunque') || h.text.includes('T3') || h.id === 'huno-8'
    );
  };

  // 5. LEONES
  const leonesInjected = isFrontFromToday ? injectedFronts?.fronts?.leones : undefined;
  const isLeonDone = leonesInjected?.completed === true;
  const toggleLeon = () => {
    const nextVal = !isLeonDone;
    updateInjectedFrontStatus('leones', nextVal);
    syncHunoState(nextVal, (h) => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return (
        sc === 'leones' ||
        h.text.toLowerCase().includes('león') ||
        h.text.toLowerCase().includes('leon') ||
        h.text.includes('T1')
      );
    });
  };

  // 6. BROTES (Huno: huno-2 / love / ❤️ Brotes)
  const brotesInjected = isFrontFromToday ? injectedFronts?.fronts?.brotes : undefined;
  const isBrotesDone = brotesInjected?.completed === true;
  const toggleBrotes = () => {
    const nextVal = !isBrotesDone;
    updateInjectedFrontStatus('brotes', nextVal);
    syncHunoState(nextVal, (h) => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return (
        sc === 'love' ||
        h.id === 'huno-2' ||
        h.text.includes('❤️') ||
        h.text.toLowerCase().includes('brote')
      );
    });
  };

  // 7. GIMNASIA (Huno: huno-1 / exercise / 🏋️)
  const gimnasiaInjected = isFrontFromToday ? injectedFronts?.fronts?.gimnasia : undefined;
  const isGimnasiaDone = gimnasiaInjected?.completed === true;
  const toggleGimnasia = () => {
    const nextVal = !isGimnasiaDone;
    updateInjectedFrontStatus('gimnasia', nextVal);
    syncHunoState(nextVal, (h) => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return (
        sc === 'exercise' ||
        h.id === 'huno-1' ||
        h.text.includes('🏋️') ||
        h.text.toLowerCase().includes('fuerza') ||
        h.text.toLowerCase().includes('desencadenado')
      );
    });
  };

  // 8. LECTURA (Huno: huno-3 / read / 📖)
  const lecturaInjected = isFrontFromToday ? injectedFronts?.fronts?.lectura : undefined;
  const isLecturaDone = lecturaInjected?.completed === true;
  const toggleLectura = () => {
    const nextVal = !isLecturaDone;
    updateInjectedFrontStatus('lectura', nextVal);
    syncHunoState(nextVal, (h) => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return (
        sc === 'read' ||
        h.id === 'huno-3' ||
        h.text.includes('📖') ||
        h.text.toLowerCase().includes('leer') ||
        h.text.toLowerCase().includes('lectura')
      );
    });
  };

  // 9. NUBES (Huno: huno-13 / cloud / ☁️)
  const nubesInjected = isFrontFromToday ? injectedFronts?.fronts?.nubes : undefined;
  const isNubesDone = nubesInjected?.completed === true;
  const toggleNubes = () => {
    const nextVal = !isNubesDone;
    updateInjectedFrontStatus('nubes', nextVal);
    syncHunoState(nextVal, (h) => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return (
        sc === 'cloud' ||
        h.id === 'huno-13' ||
        h.text.includes('☁️') ||
        h.text.toLowerCase().includes('nube')
      );
    });
  };

  const fallbackTrain = (data.trains || []).find((t) => !t.completed)?.text || 'Mantenimiento mensual';
  const fallbackSeta = (data.sets || []).find((t) => !t.completed)?.text || 'Mantenimiento semanal';
  const fallbackRoble = (data.forjaTasks || []).find((t) => !t.completed)?.text || 'Propósito trimestral';
  const fallbackLeon = (data.leones || []).find((t) => t.current < t.target)?.name || 'Avance patrimonio';
  const urgentFriendDesktop = [...(data.friends || [])]
    .filter((f) => !f.isSporadic && f.orbit !== 'hogar' && f.lastInteraction > 0)
    .sort((a, b) => a.lastInteraction - b.lastInteraction)[0];
  const fallbackBrotes = urgentFriendDesktop ? `Cuidar vínculo: ${urgentFriendDesktop.name}` : 'Cuidar un vínculo hoy';
  const fallbackGimnasia = 'Desencadenado / Fuerza o Pausas activas';
  const fallbackLectura = 'Lectura canónica del día (30 min)';
  const fallbackNubes = (data.nubes || []).find((n) => !n.completed)?.text || 'Poda o avance en Nubes';

  const dailyFronts: FrontTaskItem[] = [
    {
      id: 'trenes-front',
      category: 'trains',
      name: 'Trenes',
      emoji: '🚂',
      taskText: trenInjected?.text || fallbackTrain,
      completed: isTrenDone,
      onToggle: toggleTrain
    },
    {
      id: 'setas-front',
      category: 'sets',
      name: 'Setas',
      emoji: '🍄',
      taskText: setaInjected?.text || fallbackSeta,
      completed: isSetaDone,
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
      notes: "Despacho (20')",
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
      category: 'projects',
      name: 'Brotes',
      emoji: '❤️',
      taskText: brotesInjected?.text || fallbackBrotes,
      completed: isBrotesDone,
      onToggle: toggleBrotes
    },
    {
      id: 'gimnasia-front',
      category: 'workout',
      name: 'Gimnasia',
      emoji: '🏋️',
      taskText: gimnasiaInjected?.text || fallbackGimnasia,
      completed: isGimnasiaDone,
      onToggle: toggleGimnasia
    },
    {
      id: 'lectura-front',
      category: 'read',
      name: 'Lectura',
      emoji: '📖',
      taskText: lecturaInjected?.text || fallbackLectura,
      completed: isLecturaDone,
      onToggle: toggleLectura
    },
    {
      id: 'nubes-front',
      category: 'projects',
      name: 'Nubes',
      emoji: '☁️',
      taskText: nubesInjected?.text || fallbackNubes,
      completed: isNubesDone,
      onToggle: toggleNubes
    }
  ];

  const sortedFronts = [...dailyFronts].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  const weeklyLeones = summarizeToThreeWords(data.weeklyGoals?.leones?.text || '', 'Subir voluminoso Wallapop');
  const weeklyRoble = summarizeToThreeWords(data.weeklyGoals?.forjas?.text || '', 'Estatutos CBT PDF');
  const weeklyYunque = summarizeToThreeWords(data.weeklyGoals?.puerto?.text || '', 'Plan Códice Dagda');

  const isWeeklyLeonesDone = !!data.weeklyGoals?.leones?.completed;
  const isWeeklyRobleDone = !!data.weeklyGoals?.forjas?.completed;
  const isWeeklyYunqueDone = !!data.weeklyGoals?.puerto?.completed;

  const toggleWeeklyGoal = (type: 'leones' | 'forjas' | 'puerto') => {
    onUpdateData((prev) => {
      const currentGoals = prev.weeklyGoals || {
        leones: { text: '', completed: false },
        forjas: { text: '', completed: false },
        puerto: { text: '', completed: false },
        lastReset: Date.now()
      };
      return {
        ...prev,
        weeklyGoals: {
          ...currentGoals,
          [type]: {
            ...currentGoals[type],
            completed: !currentGoals[type]?.completed
          }
        }
      };
    });
  };

  return (
    <div className="hidden lg:flex lg:flex-col h-screen w-full max-w-[1920px] mx-auto bg-stone-950 text-stone-200 overflow-hidden px-5 py-3 gap-3">
      {/* =====================================================================
          BARRA SUPERIOR TRANSVERSAL (SIN SOLAPAMIENTOS EN NINGÚN ANCHO)
          - En pantallas muy anchas (2xl:) fluye en 1 línea; en ventanas medias
            (lg:/xl:) los botones superiores quedan arriba y el Foco + 3 Metas
            ocupan limpiamente una segunda línea de 4 columnas.
      ===================================================================== */}
      <header className="bg-stone-900/90 border border-stone-800 rounded-2xl px-4 py-2.5 shadow-md shrink-0 flex flex-col gap-2.5">
        {/* FILA 1 DE CABECERA: Pulso + Bosque a la izquierda | Enfoque + 5 Accesos + Stats a la derecha */}
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          {/* IZQUIERDA: Racha de 5 días + Insignia + 12 bloques de Bosque */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center gap-2 px-1">
                <div className="absolute top-1/2 -translate-y-1/2 left-3 right-3 h-[2px] bg-stone-800 -z-0" />
                {pastDays.map((d) => {
                  const dateKey = d.toDateString();
                  const isMarked = !!data.streakReviewedDays?.[dateKey];
                  const dayNumber = d.getDate();
                  return (
                    <button
                      key={dateKey}
                      onClick={() => onToggleStreakDayReview(d)}
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2 cursor-pointer ${
                        isMarked
                          ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)] scale-105 hover:bg-purple-500'
                          : 'bg-stone-950 border-stone-800 text-stone-600 hover:border-stone-600 hover:text-stone-400'
                      }`}
                      title={`Revisar ${d.toLocaleDateString()}`}
                    >
                      {isMarked ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <span className="text-[11px] font-black">{dayNumber}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <div
                  className={`bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-stone-950 px-3.5 h-9 rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.4)] flex items-center justify-center min-w-[44px] relative ${
                    currentStreak === 0 ? 'animate-pulse duration-[3000ms]' : ''
                  }`}
                >
                  <span className="text-lg font-black tracking-tighter leading-none">{currentStreak}</span>
                  <div
                    className="absolute top-1/2 -left-1 -translate-y-1/2 w-2.5 h-2.5 bg-orange-500 rotate-45"
                    style={{ zIndex: -1 }}
                  />
                </div>
              </div>
            </div>

            <div className="h-8 w-px bg-stone-800 shrink-0" />

            {/* Cuadrícula de 12 recuadros semanales de Bosque */}
            <div className="flex flex-col gap-1 w-28" title="Progreso semanal Bosque (bloques de 20 min)">
              <div className="flex gap-1 w-full">
                {Array.from({ length: 6 }).map((_, i) => {
                  const isFilled = i < Math.floor(bosqueWeeklyMinutes / 20);
                  const bgClass = isFilled
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                    : 'bg-slate-200 dark:bg-emerald-950/40 border border-slate-300 dark:border-emerald-900/30';
                  return (
                    <div key={i} className={`flex-1 aspect-square rounded-[4px] transition-all duration-300 ${bgClass}`} />
                  );
                })}
              </div>
              <div className="flex gap-1 w-full">
                {Array.from({ length: 6 }).map((_, i) => {
                  const absIndex = i + 6;
                  const isFilled = absIndex < Math.floor(bosqueWeeklyMinutes / 20);
                  const bgClass = isFilled
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                    : 'bg-slate-200 dark:bg-emerald-950/40 border border-slate-300 dark:border-emerald-900/30';
                  return (
                    <div key={i} className={`flex-1 aspect-square rounded-[4px] transition-all duration-300 ${bgClass}`} />
                  );
                })}
              </div>
            </div>
          </div>

          {/* DERECHA: Modo Enfoque ⚡ fijo + 3 Accesos con barra + 📊 Estadísticas */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              type="button"
              onClick={onTriggerFocus}
              className="h-10 px-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-black text-xs uppercase tracking-wider italic transition-all active:scale-95 shadow-sm cursor-pointer"
              title="Modo Enfoque (Sebastian)"
            >
              <Zap className="w-4 h-4 fill-amber-400/30 shrink-0" />
              <span>Enfoque</span>
            </button>

            <div className="h-7 w-px bg-stone-800 mx-0.5" />

            <div className="flex items-center gap-2">
              {/* Brotes (Love) */}
              <button
                onClick={() => onNavigate('love')}
                title="Brotes"
                className="w-10 h-10 bg-pink-50 dark:bg-pink-950/30 rounded-xl flex items-center justify-center p-1.5 hover:bg-pink-100 dark:hover:bg-pink-900/50 transition-colors group relative cursor-pointer"
              >
                {(() => {
                  const loveProg = loveProgress;
                  const isGolden = hasImportantLoveEventToday;
                  const fillGradId = "brotes-heart-fill-desktop";
                  return (
                    <svg
                      viewBox="0 0 24 24"
                      className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                        isGolden ? 'scale-110 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]' : ''
                      }`}
                      fill="none"
                      strokeWidth="2"
                    >
                      <defs>
                        <linearGradient id={fillGradId} x1="0" y1="1" x2="0" y2="0">
                          <stop
                            offset={`${loveProg}%`}
                            stopColor={isGolden ? "#eab308" : "#ec4899"}
                          />
                          <stop
                            offset={`${loveProg}%`}
                            stopColor={isGolden ? "rgba(234, 179, 8, 0.15)" : "rgba(236, 72, 153, 0.15)"}
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
                        fill={`url(#${fillGradId})`}
                        stroke={isGolden ? "#eab308" : "#ec4899"}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  );
                })()}
              </button>

              {/* Roble */}
              <button
                onClick={() => onNavigate('forjas')}
                title="Roble"
                className="w-10 h-10 bg-orange-50 dark:bg-orange-950/30 rounded-xl flex flex-col items-center justify-between p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors border border-orange-200 dark:border-orange-900/50 group relative cursor-pointer"
              >
                <div className="flex-1 flex items-center justify-center">
                  <TreeDeciduous className="w-4 h-4 text-orange-500 group-hover:text-orange-400 transition-colors" />
                </div>
                <div className="w-full h-1 bg-orange-200 dark:bg-orange-900/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 transition-all duration-300"
                    style={{ width: `${forjasProgress}%` }}
                  />
                </div>
              </button>

              {/* Jumangiare */}
              <button
                onClick={onFoodClick}
                title="Jumangiare"
                className={`w-10 h-10 bg-lime-50 dark:bg-lime-950/30 rounded-xl flex flex-col items-center justify-between p-1.5 hover:bg-lime-100 dark:hover:bg-lime-900/50 transition-colors border border-lime-200 dark:border-lime-900/50 group relative cursor-pointer ${
                  currentFoodScore < 0 ? 'animate-blink' : isFoodPleno ? 'scale-[1.05] animate-pulse' : ''
                }`}
              >
                <div className="flex-1 flex items-center justify-center">
                  <Utensils
                    className={`w-4 h-4 transition-colors ${
                      shouldJumangiareBounce
                        ? 'animate-cutlery-bounce text-lime-400'
                        : currentFoodScore < 0
                        ? 'text-red-500'
                        : isFoodPleno
                        ? 'text-lime-200'
                        : 'text-lime-500 group-hover:text-lime-400'
                    }`}
                  />
                </div>
                <div
                  className={`w-full h-1 bg-lime-200 dark:bg-lime-900/40 rounded-full overflow-hidden transition-opacity duration-300 ${
                    currentFoodScore < 0 ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  <div
                    className="h-full bg-lime-500 transition-all duration-500"
                    style={{ width: `${Math.max(0, Math.min(100, (currentFoodScore / 200) * 100))}%` }}
                  />
                </div>
              </button>
            </div>

            {/* Botón Estadísticas */}
            <button
              onClick={() => onNavigate('stats')}
              title="Estadísticas"
              className="h-10 w-10 bg-stone-950 rounded-xl hover:bg-stone-800 transition-colors border border-stone-800 flex items-center justify-center shadow-sm cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-stone-400" />
            </button>
          </div>
        </div>

        {/* FILA 2 DE CABECERA: Foco del Día + 3 Metas Semanales en 4 columnas limpias sin solapamiento */}
        <div className="grid grid-cols-4 gap-2.5 pt-2 border-t border-stone-800/80">
          {/* Col 1: Foco Ineludible del Día */}
          <div
            onClick={() => dailyFocus && toggleDailyFocus()}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all min-w-0 ${
              dailyFocus ? 'cursor-pointer' : ''
            } ${
              dailyFocus?.completed
                ? 'bg-stone-950/50 border-stone-800 opacity-60'
                : 'bg-gradient-to-r from-amber-950/40 via-stone-950/90 to-stone-950/90 border-amber-500/40 shadow-sm'
            }`}
            title="Foco Ineludible de Hoy"
          >
            <span className="text-lg select-none shrink-0">⚡</span>
            <div className="flex-1 min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-widest text-amber-400 leading-none mb-0.5">
                Foco del Día
              </span>
              <p
                className={`text-xs font-bold truncate ${
                  dailyFocus?.completed ? 'line-through text-stone-500' : 'text-stone-100'
                }`}
              >
                {dailyFocus?.text || 'Sin foco asignado hoy'}
              </p>
            </div>
            {dailyFocus && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDailyFocus();
                }}
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  dailyFocus.completed
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-stone-700 hover:border-amber-400 bg-stone-900'
                }`}
              >
                {dailyFocus.completed && <Check className="w-3 h-3 text-white stroke-[3]" />}
              </button>
            )}
          </div>

          {/* Col 2: Meta Semanal Leones */}
          <div
            onClick={() => toggleWeeklyGoal('leones')}
            className={`px-3 py-1.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 min-w-0 ${
              isWeeklyLeonesDone
                ? 'bg-amber-950/20 border-amber-800/40 text-stone-500 line-through'
                : 'bg-stone-950/80 border-stone-800 hover:border-amber-500/50 text-stone-200'
            }`}
            title="Meta Semanal Leones"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">🦁</span>
              <div className="min-w-0">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-stone-500 leading-none mb-0.5">
                  Meta Leones
                </span>
                <span className="block text-xs font-black uppercase tracking-tight truncate">{weeklyLeones}</span>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                isWeeklyLeonesDone ? 'bg-amber-600 border-amber-600' : 'border-stone-700'
              }`}
            >
              {isWeeklyLeonesDone && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </div>
          </div>

          {/* Col 3: Meta Semanal Roble */}
          <div
            onClick={() => toggleWeeklyGoal('forjas')}
            className={`px-3 py-1.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 min-w-0 ${
              isWeeklyRobleDone
                ? 'bg-emerald-950/20 border-emerald-800/40 text-stone-500 line-through'
                : 'bg-stone-950/80 border-stone-800 hover:border-emerald-500/50 text-stone-200'
            }`}
            title="Meta Semanal Roble"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">🌳</span>
              <div className="min-w-0">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-stone-500 leading-none mb-0.5">
                  Meta Roble
                </span>
                <span className="block text-xs font-black uppercase tracking-tight truncate">{weeklyRoble}</span>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                isWeeklyRobleDone ? 'bg-emerald-600 border-emerald-600' : 'border-stone-700'
              }`}
            >
              {isWeeklyRobleDone && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </div>
          </div>

          {/* Col 4: Meta Semanal Yunque */}
          <div
            onClick={() => toggleWeeklyGoal('puerto')}
            className={`px-3 py-1.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 min-w-0 ${
              isWeeklyYunqueDone
                ? 'bg-blue-950/20 border-blue-800/40 text-stone-500 line-through'
                : 'bg-stone-950/80 border-stone-800 hover:border-blue-500/50 text-stone-200'
            }`}
            title="Meta Semanal Yunque"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">🚢</span>
              <div className="min-w-0">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-stone-500 leading-none mb-0.5">
                  Meta Yunque ({[isWeeklyLeonesDone, isWeeklyRobleDone, isWeeklyYunqueDone].filter(Boolean).length}/3)
                </span>
                <span className="block text-xs font-black uppercase tracking-tight truncate">{weeklyYunque}</span>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                isWeeklyYunqueDone ? 'bg-blue-600 border-blue-600' : 'border-stone-700'
              }`}
            >
              {isWeeklyYunqueDone && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          CUERPO INFERIOR:
          - IZQUIERDA (1/3): Columna de Hunos + Nubes + Caminos/Bitácora/Salir
          - DERECHA (2/3):
              * Arriba (ancho de las 2 columnas): Frentes Activos de Hoy apaisado
              * Debajo (2 columnas en paralelo): Setas Semanales | Trenes Mensuales
      ===================================================================== */}
      <div className="flex-1 min-h-0 grid grid-cols-3 gap-4">
        {/* COLUMNA IZQUIERDA (1/3): HUNOS + NUBES + UTILIDADES */}
        <div className="col-span-1 h-full overflow-y-auto space-y-4 pr-1">
          <DailyHunos
            tasks={data.hunos}
            hunosHistory={data.hunosHistory || {}}
            lockedTaskIds={lockedHunoIds}
            onUpdate={onHunosUpdate}
            energy={data.energy || 1}
            onUpdateEnergy={(val) => {
              const todayKey = new Date().toDateString();
              onUpdateData((prev) => ({
                ...prev,
                energy: val,
                energyHistory: {
                  ...(prev.energyHistory || {}),
                  [todayKey]: val
                }
              }));
            }}
          />

          {/* NUBES */}
          <div className="bg-stone-900 rounded-2xl shadow-sm p-5 w-full border border-stone-800 transition-all duration-300">
            <div
              onClick={() => setIsNubesCollapsed(!isNubesCollapsed)}
              className="flex items-center justify-between gap-4 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 shrink-0">
                <Cloud className="w-5 h-5 text-stone-400" />
                <h2 className="text-lg font-bold text-stone-200">Nubes</h2>
              </div>

              {/* Línea de progreso segmentada en rayas verticales (estilo Hunos) */}
              {(data.projects || []).length > 0 && (
                <div 
                  className="flex-1 flex items-center gap-[2.5px] sm:gap-1 h-3.5 px-0.5"
                  title={`${(data.projects || []).filter((p) => p.completed).length} de ${(data.projects || []).length} completados`}
                >
                  {(data.projects || []).map((_, idx) => {
                    const completedCount = (data.projects || []).filter((p) => p.completed).length;
                    const isFilled = idx < completedCount;
                    return (
                      <div 
                        key={idx}
                        className={`flex-1 h-full rounded-[1.5px] transition-all duration-300 ${
                          isFilled 
                            ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' 
                            : 'bg-stone-800 border border-stone-800/80'
                        }`}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {!isNubesCollapsed && (
              <div className="mt-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-4 gap-2.5">
                  {data.projects.length === 0 && (
                    <p className="col-span-4 text-center text-stone-600 italic py-2 text-sm">Sin nubes activas.</p>
                  )}
                  {data.projects.map((proj, idx) => (
                    <button
                      key={proj.id}
                      onClick={() => onToggleProject(idx)}
                      title={proj.text}
                      className={`aspect-square rounded-xl border-2 text-2xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
                        proj.completed
                          ? 'bg-yellow-500/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)] scale-105'
                          : 'bg-stone-950 border-stone-800 hover:border-stone-700 text-stone-500 grayscale opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className={proj.completed ? 'grayscale-0' : 'grayscale'}>{getEmoji(proj.text)}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2.5 mt-3">
                      <button
                        onClick={() => onNavigate('piano')}
                        className="py-2.5 bg-indigo-950/30 border border-indigo-900/50 rounded-xl flex items-center justify-center gap-2 text-sm text-indigo-400 hover:bg-indigo-900/50 hover:text-indigo-300 transition-all cursor-pointer"
                      >
                        <Music className="w-4 h-4" />
                        <span className="font-bold">Piano</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenGympiezaModal();
                        }}
                        className="py-2.5 bg-emerald-950/30 border border-emerald-900/50 rounded-xl flex items-center justify-center gap-2 text-sm text-emerald-400 hover:bg-emerald-900/50 hover:text-emerald-300 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span className="font-bold">Gympieza</span>
                      </button>
                    </div>
                </div>
              )}
          </div>

          {/* Botones Inferiores de Columna 1: Caminos | Bitácora | Salir */}
          <div className="grid grid-cols-3 gap-2.5 pb-2">
            <button
              onClick={() => onNavigate('caminos')}
              className="py-3 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-center gap-2 text-stone-200 hover:bg-stone-800 hover:border-stone-700 transition-all shadow-sm group cursor-pointer"
            >
              <MapIcon className="w-4 h-4 text-stone-400" />
              <span className="font-black text-xs uppercase tracking-tight italic">Caminos</span>
            </button>

            <button
              onClick={onOpenHistory}
              className="py-3 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-center gap-2 text-stone-200 hover:bg-stone-800 hover:border-stone-700 transition-all shadow-sm group cursor-pointer"
            >
              <CalendarClock className="w-4 h-4 text-stone-400" />
              <span className="font-black text-xs uppercase tracking-tight italic">Bitácora</span>
            </button>

            <button
              onClick={onLogout}
              className="py-3 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-center gap-2 text-stone-200 hover:bg-stone-800 hover:border-red-900/50 transition-all shadow-sm group cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-stone-400 group-hover:text-red-400" />
              <span className="font-black text-xs uppercase tracking-tight italic group-hover:text-red-400">
                Salir
              </span>
            </button>
          </div>
        </div>

        {/* BLOQUE DERECHO (2/3): ARRIBA FRENTES ACTIVOS APAISADOS, DEBAJO SETAS Y TRENES */}
        <div className="col-span-2 h-full min-h-0 flex flex-col gap-3">
          {/* FRENTES ACTIVOS DE HOY (Ancho de las 2 columnas derechas, formato apaisado 3x2) */}
          <section className="bg-stone-900/90 border border-stone-800 rounded-2xl px-4 py-3 shadow-sm shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-stone-300 flex items-center gap-1.5">
                <span>⚔️ Frentes Activos de Hoy</span>
              </h2>
              <span className="text-[11px] font-bold text-stone-500">
                {sortedFronts.filter((f) => !f.completed).length} pendientes
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {sortedFronts.map((item) => (
                <div
                  key={item.id}
                  onClick={() => item.onToggle()}
                  className={`relative flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                    item.completed
                      ? 'bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                      : 'bg-stone-950/80 border-stone-800 hover:border-stone-700 shadow-sm'
                  }`}
                >
                  <span className="text-2xl select-none filter drop-shadow shrink-0">{item.emoji}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider ${
                          item.completed ? 'text-stone-500 line-through' : 'text-stone-400'
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.navigateView && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate(item.navigateView!);
                          }}
                          className="text-[10px] text-stone-400 hover:text-stone-200 flex items-center gap-0.5 font-medium transition-colors cursor-pointer"
                          title={`Abrir ${item.name}`}
                        >
                          Abrir <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p
                      className={`text-xs font-semibold mt-0.5 leading-snug line-clamp-2 ${
                        item.completed ? 'line-through text-stone-500' : 'text-stone-100'
                      }`}
                      title={item.taskText}
                    >
                      {item.taskText}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onToggle();
                    }}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      item.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-stone-700 hover:border-emerald-500 bg-stone-900'
                    }`}
                    title={item.completed ? 'Marcar pendiente' : 'Marcar completado'}
                  >
                    {item.completed && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* DEBAJO: LAS 2 COLUMNAS PARALELAS DE SETAS Y TRENES */}
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">
            {/* SUBCOLUMNA 1: SEMANAL (Setas Semanales 🍄) */}
            <div className="h-full min-h-0">
              <SetsView tasks={data.sets} onUpdate={onSetsUpdate} embedded={true} />
            </div>

            {/* SUBCOLUMNA 2: MENSUAL Y ANUAL (Trenes Mensuales y Anuales 🚂) */}
            <div className="h-full min-h-0">
              <TrainView
                tasks={data.trains}
                annualTasks={data.annualTrains}
                onUpdate={onTrainsUpdate}
                onUpdateAnnual={(t) => onUpdateData((prev) => ({ ...prev, annualTrains: t }))}
                embedded={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
