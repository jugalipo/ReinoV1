import React, { useState, useEffect } from 'react';
import { AppData, Task, ViewState, WeeklyTask } from '../types';
import {
  BarChart3,
  CalendarClock,
  Cat,
  Check,
  ChevronRight,
  Cloud,
  Edit2,
  Footprints,
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
  };
}

interface FrontTaskItem {
  id: string;
  category: 'trains' | 'sets' | 'roble' | 'yunque' | 'leones' | 'projects';
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
  onOpenFootModal: () => void;
  onOpenGympiezaModal: () => void;
  onOpenHistory: () => void;
  onLogout: () => void;
  pastDays: Date[];
  onToggleStreakDayReview: (d: Date) => void;
  currentStreak: number;
  bosqueWeeklyMinutes: number;
  hasImportantLoveEventToday: boolean;
  loveProgress: number;
  leonesProgress: number;
  forjasProgress: number;
  footProgress: number;
  currentFoodScore: number;
  isFoodPleno: boolean;
  shouldJumangiareBounce: boolean;
  onFoodClick: () => void;
  pendingHunoIds: string[];
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
  onOpenFootModal,
  onOpenGympiezaModal,
  onOpenHistory,
  onLogout,
  pastDays,
  onToggleStreakDayReview,
  currentStreak,
  bosqueWeeklyMinutes,
  hasImportantLoveEventToday,
  loveProgress,
  leonesProgress,
  forjasProgress,
  footProgress,
  currentFoodScore,
  isFoodPleno,
  shouldJumangiareBounce,
  onFoodClick,
  pendingHunoIds,
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
    frontKey: 'tren' | 'seta' | 'roble' | 'yunque' | 'leones' | 'brotes',
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

  const isHunoDone = (matchFn: (huno: typeof data.hunos[0]) => boolean): boolean => {
    const found = (data.hunos || []).find(matchFn);
    return found ? found.completed : false;
  };

  // 1. TRENES
  const hunoTrenDone = isHunoDone((h) => {
    const sc = h.shortcut || getCanonicalHunoShortcut(h);
    return sc === 'trains' || h.text.toLowerCase().includes('tren');
  });
  const trenInjected = injectedFronts?.fronts?.tren;
  const isTrenDone = trenInjected !== undefined ? trenInjected.completed : hunoTrenDone;
  const toggleTrain = () => {
    const nextVal = !isTrenDone;
    updateInjectedFrontStatus('tren', nextVal);
    syncHunoState(nextVal, (h) => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return sc === 'trains' || h.text.toLowerCase().includes('tren');
    });
  };

  // 2. SETAS
  const hunoSetaDone = isHunoDone((h) => {
    const sc = h.shortcut || getCanonicalHunoShortcut(h);
    return sc === 'sets' || h.text.toLowerCase().includes('seta');
  });
  const setaInjected = injectedFronts?.fronts?.seta;
  const isSetaDone = setaInjected !== undefined ? setaInjected.completed : hunoSetaDone;
  const toggleSeta = () => {
    const nextVal = !isSetaDone;
    updateInjectedFrontStatus('seta', nextVal);
    syncHunoState(nextVal, (h) => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return sc === 'sets' || h.text.toLowerCase().includes('seta');
    });
  };

  // 3. ROBLE
  const hunoRobleDone = isHunoDone((h) => {
    const sc = h.shortcut || getCanonicalHunoShortcut(h);
    return sc === 'forjas' || h.text.toLowerCase().includes('roble') || h.text.includes('T2');
  });
  const robleInjected = injectedFronts?.fronts?.roble;
  const isRobleDone = robleInjected !== undefined ? robleInjected.completed : hunoRobleDone;
  const toggleRoble = () => {
    const nextVal = !isRobleDone;
    updateInjectedFrontStatus('roble', nextVal);
    syncHunoState(nextVal, (h) => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return sc === 'forjas' || h.text.toLowerCase().includes('roble') || h.text.includes('T2');
    });
  };

  // 4. YUNQUE
  const hunoYunqueDone = isHunoDone(
    (h) => h.text.toLowerCase().includes('yunque') || h.text.includes('T3') || h.id === 'huno-8'
  );
  const yunqueInjected = injectedFronts?.fronts?.yunque;
  const isYunqueDone = yunqueInjected !== undefined ? yunqueInjected.completed : hunoYunqueDone;
  const toggleYunque = () => {
    const nextVal = !isYunqueDone;
    updateInjectedFrontStatus('yunque', nextVal);
    syncHunoState(
      nextVal,
      (h) => h.text.toLowerCase().includes('yunque') || h.text.includes('T3') || h.id === 'huno-8'
    );
  };

  // 5. LEONES
  const hunoLeonesDone = isHunoDone((h) => {
    const sc = h.shortcut || getCanonicalHunoShortcut(h);
    return (
      sc === 'leones' ||
      h.text.toLowerCase().includes('león') ||
      h.text.toLowerCase().includes('leon') ||
      h.text.includes('T1')
    );
  });
  const leonesInjected = injectedFronts?.fronts?.leones;
  const isLeonDone = leonesInjected !== undefined ? leonesInjected.completed : hunoLeonesDone;
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

  // 6. BROTES
  const hunoBrotesDone = isHunoDone((h) => {
    const sc = h.shortcut || getCanonicalHunoShortcut(h);
    return (
      sc === 'projects' ||
      h.text.toLowerCase().includes('nube') ||
      h.text.toLowerCase().includes('proyecto') ||
      h.text.startsWith('P ')
    );
  });
  const brotesInjected = injectedFronts?.fronts?.brotes;
  const isBrotesDone = brotesInjected !== undefined ? brotesInjected.completed : hunoBrotesDone;
  const toggleBrotes = () => {
    const nextVal = !isBrotesDone;
    updateInjectedFrontStatus('brotes', nextVal);
    syncHunoState(nextVal, (h) => {
      const sc = h.shortcut || getCanonicalHunoShortcut(h);
      return (
        sc === 'projects' ||
        h.text.toLowerCase().includes('nube') ||
        h.text.toLowerCase().includes('proyecto') ||
        h.text.startsWith('P ')
      );
    });
  };

  const fallbackTrain = (data.trains || []).find((t) => !t.completed)?.text || 'Mantenimiento mensual';
  const fallbackSeta = (data.sets || []).find((t) => !t.completed)?.text || 'Mantenimiento semanal';
  const fallbackRoble = (data.forjaTasks || []).find((t) => !t.completed)?.text || 'Propósito trimestral';
  const fallbackLeon = (data.leones || []).find((t) => t.current < t.target)?.name || 'Avance patrimonio';
  const fallbackBrotes = (data.projects || []).find((t) => !t.completed)?.text || 'Vínculos y proyectos';

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
      navigateView: 'leones',
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
          BARRA SUPERIOR TRANSVERSAL (TOP STRIP ESTRATÉGICA · OPCIÓN A)
      ===================================================================== */}
      <header className="bg-stone-900/90 border border-stone-800 rounded-2xl px-4 py-2.5 shadow-md shrink-0 flex items-center justify-between gap-4">
        {/* 1. IZQUIERDA: Racha de 5 días + Insignia + 12 bloques de Bosque */}
        <div className="flex items-center gap-4 shrink-0">
          {/* 5 círculos + racha */}
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
                className={`bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-stone-950 px-3.5 h-10 rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.4)] flex items-center justify-center min-w-[44px] relative ${
                  currentStreak === 0 ? 'animate-pulse duration-[3000ms]' : ''
                }`}
              >
                <span className="text-xl font-black tracking-tighter leading-none">{currentStreak}</span>
                <div
                  className="absolute top-1/2 -left-1 -translate-y-1/2 w-2.5 h-2.5 bg-orange-500 rotate-45"
                  style={{ zIndex: -1 }}
                />
              </div>
            </div>
          </div>

          <div className="h-9 w-px bg-stone-800 shrink-0" />

          {/* Cuadrícula de 12 recuadros semanales de Bosque */}
          <div className="flex flex-col gap-1 w-28" title="Progreso semanal Bosque (bloques de 20 min)">
            <div className="flex gap-1 w-full">
              {Array.from({ length: 6 }).map((_, i) => {
                const isFilled = i < Math.floor(bosqueWeeklyMinutes / 20);
                const bgClass = isFilled
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : 'bg-slate-200 dark:bg-emerald-950/40 border border-slate-300 dark:border-emerald-900/30';
                return <div key={i} className={`flex-1 aspect-square rounded-[4px] transition-all duration-300 ${bgClass}`} />;
              })}
            </div>
            <div className="flex gap-1 w-full">
              {Array.from({ length: 6 }).map((_, i) => {
                const absIndex = i + 6;
                const isFilled = absIndex < Math.floor(bosqueWeeklyMinutes / 20);
                const bgClass = isFilled
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                  : 'bg-slate-200 dark:bg-emerald-950/40 border border-slate-300 dark:border-emerald-900/30';
                return <div key={i} className={`flex-1 aspect-square rounded-[4px] transition-all duration-300 ${bgClass}`} />;
              })}
            </div>
          </div>
        </div>

        {/* 2. CENTRO: Foco Ineludible del Día ⚡ + 3 Metas Semanales 🎯 */}
        <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
          {/* Tarjeta Foco Ineludible del Día */}
          <div
            onClick={() => dailyFocus && toggleDailyFocus()}
            className={`flex items-center gap-3 px-3.5 py-2 rounded-xl border transition-all min-w-[210px] max-w-[320px] ${
              dailyFocus ? 'cursor-pointer' : ''
            } ${
              dailyFocus?.completed
                ? 'bg-stone-950/50 border-stone-800 opacity-60'
                : 'bg-gradient-to-r from-amber-950/40 via-stone-950/90 to-stone-950/90 border-amber-500/40 shadow-sm'
            }`}
            title="Foco Ineludible de Hoy"
          >
            <span className="text-2xl select-none shrink-0">⚡</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  Foco del Día
                </span>
              </div>
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
                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  dailyFocus.completed
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-stone-700 hover:border-amber-400 bg-stone-900'
                }`}
              >
                {dailyFocus.completed && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
              </button>
            )}
          </div>

          {/* 3 Metas Semanales */}
          <div className="flex items-center gap-2 bg-stone-950/60 border border-stone-800/90 rounded-xl px-2.5 py-1.5 shrink-0">
            <div className="flex flex-col items-center justify-center px-1 border-r border-stone-800/80 pr-2">
              <Target className="w-3.5 h-3.5 text-purple-400 mb-0.5" />
              <span className="text-[9px] font-black uppercase tracking-tighter text-stone-400 font-mono">
                {[isWeeklyLeonesDone, isWeeklyRobleDone, isWeeklyYunqueDone].filter(Boolean).length}/3
              </span>
            </div>

            {/* Meta 1: Leones */}
            <div
              onClick={() => toggleWeeklyGoal('leones')}
              className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${
                isWeeklyLeonesDone
                  ? 'bg-amber-950/20 border-amber-800/40 text-stone-500 line-through'
                  : 'bg-stone-900 border-stone-800 hover:border-amber-500/50 text-stone-200'
              }`}
              title="Alternar estado meta semanal Leones"
            >
              <span className="text-sm shrink-0">🦁</span>
              <span className="text-[11px] font-black uppercase tracking-tight max-w-[115px] truncate">
                {weeklyLeones}
              </span>
              <div
                className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                  isWeeklyLeonesDone ? 'bg-amber-600 border-amber-600' : 'border-stone-700'
                }`}
              >
                {isWeeklyLeonesDone && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
              </div>
            </div>

            {/* Meta 2: Roble */}
            <div
              onClick={() => toggleWeeklyGoal('forjas')}
              className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${
                isWeeklyRobleDone
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-stone-500 line-through'
                  : 'bg-stone-900 border-stone-800 hover:border-emerald-500/50 text-stone-200'
              }`}
              title="Alternar estado meta semanal Roble"
            >
              <span className="text-sm shrink-0">🌳</span>
              <span className="text-[11px] font-black uppercase tracking-tight max-w-[115px] truncate">
                {weeklyRoble}
              </span>
              <div
                className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                  isWeeklyRobleDone ? 'bg-emerald-600 border-emerald-600' : 'border-stone-700'
                }`}
              >
                {isWeeklyRobleDone && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
              </div>
            </div>

            {/* Meta 3: Yunque */}
            <div
              onClick={() => toggleWeeklyGoal('puerto')}
              className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${
                isWeeklyYunqueDone
                  ? 'bg-blue-950/20 border-blue-800/40 text-stone-500 line-through'
                  : 'bg-stone-900 border-stone-800 hover:border-blue-500/50 text-stone-200'
              }`}
              title="Alternar estado meta semanal Yunque"
            >
              <span className="text-sm shrink-0">🚢</span>
              <span className="text-[11px] font-black uppercase tracking-tight max-w-[115px] truncate">
                {weeklyYunque}
              </span>
              <div
                className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                  isWeeklyYunqueDone ? 'bg-blue-600 border-blue-600' : 'border-stone-700'
                }`}
              >
                {isWeeklyYunqueDone && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
              </div>
            </div>
          </div>
        </div>

        {/* 3. DERECHA: Modo Enfoque ⚡ fijo + 5 Accesos con barra + 📊 Estadísticas */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Botón Fijo Modo Enfoque */}
          <button
            type="button"
            onClick={onTriggerFocus}
            className="h-11 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-400 hover:text-amber-300 flex items-center gap-2 font-black text-xs uppercase tracking-wider italic transition-all active:scale-95 shadow-sm cursor-pointer"
            title="Modo Enfoque (Sebastian)"
          >
            <Zap className="w-4 h-4 fill-amber-400/30 shrink-0" />
            <span>Enfoque</span>
          </button>

          <div className="h-8 w-px bg-stone-800 mx-0.5" />

          {/* 5 botones compactos con barra de progreso */}
          <div className="flex items-center gap-1.5">
            {/* Brotes (Love) */}
            <button
              onClick={() => onNavigate('love')}
              title="Brotes"
              className="w-11 h-11 bg-pink-50 dark:bg-pink-950/30 rounded-xl flex flex-col items-center justify-between p-1.5 hover:bg-pink-100 dark:hover:bg-pink-900/50 transition-colors border border-pink-200 dark:border-pink-900/50 group relative cursor-pointer"
            >
              <div className="flex-1 flex items-center justify-center">
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    hasImportantLoveEventToday
                      ? 'text-yellow-500 fill-current drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] scale-110'
                      : 'text-pink-500 group-hover:text-pink-400'
                  }`}
                />
              </div>
              <div className="w-full h-1 bg-pink-200 dark:bg-pink-900/40 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500 transition-all duration-300" style={{ width: `${loveProgress}%` }} />
              </div>
            </button>

            {/* Leones */}
            <button
              onClick={() => onNavigate('leones')}
              title="Leones"
              className="w-11 h-11 bg-amber-50 dark:bg-amber-950/30 rounded-xl flex flex-col items-center justify-between p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors border border-amber-200 dark:border-amber-900/50 group relative cursor-pointer"
            >
              <div className="flex-1 flex items-center justify-center">
                <Cat className="w-5 h-5 text-amber-500 group-hover:text-amber-400 transition-colors" />
              </div>
              <div className="w-full h-1 bg-amber-200 dark:bg-amber-900/40 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${leonesProgress}%` }} />
              </div>
            </button>

            {/* Roble */}
            <button
              onClick={() => onNavigate('forjas')}
              title="Roble"
              className="w-11 h-11 bg-orange-50 dark:bg-orange-950/30 rounded-xl flex flex-col items-center justify-between p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors border border-orange-200 dark:border-orange-900/50 group relative cursor-pointer"
            >
              <div className="flex-1 flex items-center justify-center">
                <TreeDeciduous className="w-5 h-5 text-orange-500 group-hover:text-orange-400 transition-colors" />
              </div>
              <div className="w-full h-1 bg-orange-200 dark:bg-orange-900/40 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${forjasProgress}%` }} />
              </div>
            </button>

            {/* Passeggiata */}
            <button
              onClick={onOpenFootModal}
              title="Passeggiata"
              className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex flex-col items-center justify-between p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-200 dark:border-emerald-900/50 group relative cursor-pointer"
            >
              <div className="flex-1 flex items-center justify-center">
                <Footprints className="w-5 h-5 text-emerald-500 group-hover:text-emerald-400 transition-colors drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
              </div>
              <div className="w-full h-1 bg-emerald-200 dark:bg-emerald-900/40 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${footProgress * 100}%` }} />
              </div>
            </button>

            {/* Jumangiare */}
            <button
              onClick={onFoodClick}
              title="Jumangiare"
              className={`w-11 h-11 bg-lime-50 dark:bg-lime-950/30 rounded-xl flex flex-col items-center justify-between p-1.5 hover:bg-lime-100 dark:hover:bg-lime-900/50 transition-colors border border-lime-200 dark:border-lime-900/50 group relative cursor-pointer ${
                currentFoodScore < 0 ? 'animate-blink' : isFoodPleno ? 'scale-[1.05] animate-pulse' : ''
              }`}
            >
              <div className="flex-1 flex items-center justify-center">
                <Utensils
                  className={`w-5 h-5 transition-colors ${
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
            className="h-11 w-11 bg-stone-950 rounded-xl hover:bg-stone-800 transition-colors border border-stone-800 flex items-center justify-center shadow-sm cursor-pointer"
          >
            <BarChart3 className="w-5 h-5 text-stone-400" />
          </button>
        </div>
      </header>

      {/* =====================================================================
          CUERPO INFERIOR EN 3 COLUMNAS PARALELAS (DIARIO | SEMANAL | MENSUAL)
      ===================================================================== */}
      <div className="flex-1 min-h-0 grid grid-cols-3 gap-4">
        {/* COLUMNA 1: DIARIO (Hunos + Frentes Activos de Hoy + Nubes + Utilidades) */}
        <div className="h-full overflow-y-auto space-y-4 pr-1">
          <DailyHunos
            tasks={data.hunos}
            hunosHistory={data.hunosHistory || {}}
            pendingHunoIds={pendingHunoIds}
            lockedTaskIds={lockedHunoIds}
            hunoPlenoCurrent={data.stats.hunoPlenoCurrent || 0}
            hunoPlenos={data.stats.hunoPlenos || 0}
            hunoReward={data.stats.hunoReward || 'Premio por definir'}
            onUpdate={onHunosUpdate}
            onUpdateReward={(reward) =>
              onUpdateData((prev) => ({ ...prev, stats: { ...prev.stats, hunoReward: reward } }))
            }
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

          {/* FRENTES ACTIVOS DE HOY */}
          <section className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-xs font-black uppercase tracking-widest text-stone-300 flex items-center gap-1.5">
                <span>⚔️ Frentes Activos de Hoy</span>
              </h2>
              <span className="text-[11px] font-bold text-stone-500">
                {sortedFronts.filter((f) => !f.completed).length} pendientes
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {sortedFronts.map((item) => (
                <div
                  key={item.id}
                  className={`relative flex flex-col justify-between p-3 rounded-xl border transition-all duration-300 ${
                    item.completed
                      ? 'bg-stone-950/40 border-stone-800/50 opacity-60'
                      : 'bg-stone-950/80 border-stone-800 hover:border-stone-700 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-2xl select-none filter drop-shadow">{item.emoji}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onToggle();
                      }}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                        item.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-stone-700 hover:border-emerald-500 bg-stone-900'
                      }`}
                      title={item.completed ? 'Marcar pendiente' : 'Marcar completado'}
                    >
                      {item.completed && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider ${
                          item.completed ? 'text-stone-500 line-through' : 'text-stone-400'
                        }`}
                      >
                        {item.name}
                      </span>
                      <p
                        className={`text-xs font-semibold mt-0.5 leading-snug line-clamp-2 ${
                          item.completed ? 'line-through text-stone-500' : 'text-stone-100'
                        }`}
                      >
                        {item.taskText}
                      </p>
                    </div>

                    {item.navigateView && (
                      <div className="mt-2 pt-1 border-t border-stone-800/40 flex items-center justify-end text-[10px]">
                        <button
                          onClick={() => onNavigate(item.navigateView!)}
                          className="text-stone-400 hover:text-stone-200 flex items-center gap-0.5 font-medium transition-colors cursor-pointer"
                        >
                          Abrir <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* NUBES */}
          <div className="bg-stone-900 rounded-2xl shadow-sm p-5 w-full border border-stone-800 transition-all duration-300">
            <div
              onClick={() => setIsNubesCollapsed(!isNubesCollapsed)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-stone-400" />
                <h2 className="text-lg font-bold text-stone-200">Nubes</h2>

                <div
                  className="flex items-center gap-2 px-2 py-0.5 bg-stone-950/50 rounded-full border border-stone-800 ml-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative">
                    <Trophy className="w-4 h-4 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                    <div className="absolute -top-2 -right-2 bg-yellow-600 text-stone-950 text-[9px] font-black px-1 rounded-full border border-stone-900 min-w-[1rem] h-4 flex items-center justify-center">
                      {data.stats.projectPlenos || 0}
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-stone-500 uppercase tracking-tighter">
                    {data.stats.projectPlenoCurrent || 0} <span className="text-stone-700">/ 20</span>
                  </span>
                </div>
              </div>

              {!isNubesCollapsed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingProjects(!isEditingProjects);
                  }}
                  className={`p-1.5 rounded-full transition-colors ${
                    isEditingProjects ? 'bg-stone-700 text-white' : 'hover:bg-stone-800 text-stone-500'
                  }`}
                >
                  {isEditingProjects ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </button>
              )}
            </div>

            {isNubesCollapsed && (data.projects || []).length > 0 && (
              <div
                className="grid w-full mt-3 gap-1 animate-in fade-in duration-300 cursor-pointer"
                style={{ gridTemplateColumns: `repeat(${(data.projects || []).length}, minmax(0, 1fr))` }}
                onClick={() => setIsNubesCollapsed(false)}
              >
                {(data.projects || []).map((proj, idx) => {
                  const completedCount = (data.projects || []).filter((p) => p.completed).length;
                  const isFilled = idx < completedCount;
                  return (
                    <div
                      key={proj.id}
                      className={`w-2.5 h-2.5 max-w-full aspect-square mx-auto rounded-full transition-all duration-300 ${
                        isFilled
                          ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)] animate-pulse'
                          : 'bg-stone-950 border border-stone-800'
                      }`}
                    />
                  );
                })}
              </div>
            )}

            {!isNubesCollapsed && (
              <div className="mt-4 animate-in fade-in duration-300">
                {isEditingProjects ? (
                  <div className="space-y-2.5">
                    {data.projects.map((proj) => (
                      <div key={proj.id} className="flex gap-2">
                        <button
                          onClick={() => onOpenProjectNotes(proj.id, proj.notes || '')}
                          className={`p-2 rounded-lg border transition-all active:scale-95 flex items-center justify-center shrink-0 ${
                            proj.notes
                              ? 'bg-amber-950/25 border-amber-900/40 text-amber-400'
                              : 'bg-stone-950 border-stone-700 text-stone-500 hover:text-stone-300 hover:border-stone-600'
                          }`}
                          title="Editar Notas de Sebastian"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        <DebouncedInput
                          type="text"
                          value={proj.text}
                          onChange={(val: string) => onProjectTextChange(proj.id, val)}
                          className="flex-1 min-w-0 bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-200 focus:outline-none focus:border-stone-500 transition-all"
                        />
                        <button
                          onClick={() => onInitiateDeleteProject(proj.id)}
                          className="p-2 bg-stone-950 border border-stone-700 rounded-lg text-red-500 hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={onInitiateAddProject}
                      className="w-full mt-3 py-2.5 border-2 border-dashed border-stone-700 rounded-xl flex items-center justify-center gap-2 text-sm text-stone-500 hover:text-stone-300 hover:border-stone-600 hover:bg-stone-800/50 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Añadir Proyecto</span>
                    </button>

                    <div className="pt-3 mt-2 border-t border-stone-800">
                      <label className="block text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1.5">
                        Premio Objetivo 20 Plenos
                      </label>
                      <input
                        type="text"
                        value={data.stats.projectReward || ''}
                        onChange={(e) =>
                          onUpdateData((prev) => ({
                            ...prev,
                            stats: { ...prev.stats, projectReward: e.target.value }
                          }))
                        }
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-yellow-500 font-bold"
                        placeholder="Escribe tu premio aquí..."
                      />
                    </div>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
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

        {/* COLUMNA 2: SEMANAL (Setas Semanales 🍄) */}
        <div className="h-full min-h-0">
          <SetsView tasks={data.sets} onUpdate={onSetsUpdate} embedded={true} />
        </div>

        {/* COLUMNA 3: MENSUAL Y ANUAL (Trenes Mensuales y Anuales 🚂) */}
        <div className="h-full min-h-0">
          <TrainView
            tasks={data.trains}
            annualTasks={data.annualTrains}
            onUpdate={onTrainsUpdate}
            onUpdateAnnual={(t) => onUpdateData((prev) => ({ ...prev, annualTrains: t }))}
            reminderDismissedToday={data.lastAnnualTrainReminderDate === todayStr}
            onDismissReminder={() =>
              onUpdateData((prev) => ({ ...prev, lastAnnualTrainReminderDate: todayStr }))
            }
            embedded={true}
          />
        </div>
      </div>
    </div>
  );
};
