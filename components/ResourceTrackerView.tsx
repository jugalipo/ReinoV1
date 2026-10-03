import React, { useState, useEffect } from 'react';
import { ResourceTask, Task, ResourceMilestone } from '../types';
import { ArrowLeft, Plus, Minus, X, Banknote, Trophy, PiggyBank, Star, CheckCircle2, Circle, Heart, Settings, Cat, Apple, TreePine, TreeDeciduous, Leaf, Sun, Snowflake, Coins, Calendar, Check, Sparkles, Award, Compass, ChevronRight } from 'lucide-react';
import { useModalHistory } from '../hooks/useModalHistory';

interface ResourceTrackerViewProps {
  title: string;
  themeColor: 'orange' | 'amber'; // Orange for Roble, Amber for Leones
  tasks: ResourceTask[];
  onUpdate: (tasks: ResourceTask[]) => void;
  onBack: () => void;
  billetesState?: boolean[];
  huchaCount?: number;
  onUpdateBilletes?: (billetes: boolean[], hucha: number) => void;
  leonesState?: boolean[];
  leonesCount?: number;
  onUpdateLeones?: (leones: boolean[], count: number) => void;
  forjaTasks?: Task[];
  onUpdateForjaTasks?: (tasks: Task[]) => void;
}

export const ResourceTrackerView: React.FC<ResourceTrackerViewProps> = ({ 
    title, 
    themeColor, 
    tasks, 
    onUpdate, 
    onBack,
    billetesState = Array(20).fill(false),
    huchaCount = 0,
    onUpdateBilletes,
    leonesState = Array(20).fill(false),
    leonesCount = 0,
    onUpdateLeones,
    forjaTasks = [],
    onUpdateForjaTasks
}) => {
  // We use the first task as the "Permanent" one. If none exists, we create a default one.
  const mainTask: ResourceTask = tasks.length > 0 ? tasks[0] : {
      id: 'permanent-objective',
      name: 'Definir Objetivo',
      current: 0,
      target: 100,
      unit: 'u'
  };

  // Quarterly Tasks are indices 1-4 (if they exist)
  const quarterlyTasks = tasks.length > 1 ? tasks.slice(1, 5) : [];

  // Billetes Logic State
  const [showBilletesConfirm, setShowBilletesConfirm] = useState(false);

  const [showLeonesConfirm, setShowLeonesConfirm] = useState(false);
  const [lastLeonIndex, setLastLeonIndex] = useState<number | null>(null);

  // --- COINS / MEDALLERO POPUP STATE (ROBLE) ---
  const [showCoinsModal, setShowCoinsModal] = useState(false);

  // --- FORJA WORK LIST STATE ---
  const [isEditingForjaTasks, setIsEditingForjaTasks] = useState(false);
  const [newForjaTaskText, setNewForjaTaskText] = useState('');

  // --- OBJECTIVE POPUP STATE ---
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const selectedObjective = tasks.find(t => t.id === selectedObjectiveId);

  // --- MOBILE BACK BUTTON SUPPORT FOR MODALS ---
  useModalHistory(showBilletesConfirm, () => setShowBilletesConfirm(false), 'confirmBilletes');
  useModalHistory(showLeonesConfirm, () => setShowLeonesConfirm(false), 'confirmLeones');
  useModalHistory(!!selectedObjectiveId, () => setSelectedObjectiveId(null), 'objectivePopup');
  useModalHistory(showCoinsModal, () => setShowCoinsModal(false), 'coinsModal');
  // ---------------------------------------------

  const toggleMilestone = (taskId: string, milestoneId: string) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex <= 0) return;

    const task = tasks[taskIndex];
    if (!task.milestones) return;

    const targetMilestone = task.milestones.find(m => m.id === milestoneId);
    if (!targetMilestone) return;

    const isNowCompleted = !targetMilestone.completed;
    const updatedMilestones = task.milestones.map(m => 
      m.id === milestoneId ? { ...m, completed: isNowCompleted } : m
    );

    // Compute new current value based on milestone targetValue
    let newCurrent = task.current;
    if (isNowCompleted) {
      if (task.current < targetMilestone.targetValue) {
        newCurrent = targetMilestone.targetValue;
      }
    } else {
      // Find the highest completed milestone below this one
      const remainingCompleted = updatedMilestones.filter(m => m.completed && m.id !== milestoneId);
      if (remainingCompleted.length > 0) {
        newCurrent = Math.max(...remainingCompleted.map(m => m.targetValue));
      } else {
        newCurrent = 0;
      }
    }

    const newTasks = [...tasks];
    newTasks[taskIndex] = {
      ...task,
      current: Math.min(task.target, Math.max(0, newCurrent)),
      milestones: updatedMilestones
    };
    onUpdate(newTasks);
  };

  const updateMainProgress = (delta: number) => {
      const newCurrent = Math.max(0, Math.min(mainTask.target, mainTask.current + delta));
      const updatedTask = { ...mainTask, current: newCurrent };
      const newTasks = [...tasks];
      newTasks[0] = updatedTask;
      onUpdate(newTasks);
  };

  const updateQuarterlyProgress = (taskId: string, delta: number) => {
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex <= 0) return; // 0 is Main, or not found

      const task = tasks[taskIndex];
      const newCurrent = Math.max(0, Math.min(task.target, task.current + delta));
      
      // Auto-update milestones if progress changes
      const updatedMilestones = task.milestones?.map(m => ({
        ...m,
        completed: newCurrent >= m.targetValue
      }));

      const newTasks = [...tasks];
      newTasks[taskIndex] = { 
        ...task, 
        current: newCurrent,
        milestones: updatedMilestones || task.milestones
      };
      onUpdate(newTasks);
  };

  // --- FORJA WORK LIST ACTIONS ---
  const toggleForjaTask = (id: string) => {
    if (!onUpdateForjaTasks) return;
    const newTasks = forjaTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    onUpdateForjaTasks(newTasks);
  };

  const addForjaTask = () => {
    if (!newForjaTaskText.trim() || !onUpdateForjaTasks) return;
    const newTask: Task = {
      id: `forja-task-${Date.now()}`,
      text: newForjaTaskText,
      completed: false
    };
    onUpdateForjaTasks([...forjaTasks, newTask]);
    setNewForjaTaskText('');
  };

  const deleteForjaTask = (id: string) => {
    if (!onUpdateForjaTasks) return;
    onUpdateForjaTasks(forjaTasks.filter(t => t.id !== id));
  };

  const updateForjaTaskText = (id: string, text: string) => {
    if (!onUpdateForjaTasks) return;
    onUpdateForjaTasks(forjaTasks.map(t => t.id === id ? { ...t, text } : t));
  };

  const togglePrincipal = (taskId: string) => {
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex <= 0) return;

      const isAlreadyPrincipal = tasks[taskIndex].isPrincipal;
      const newTasks = tasks.map((t, i) => {
          if (i === 0) return t; // Main task remains untouched
          return { ...t, isPrincipal: i === taskIndex ? !isAlreadyPrincipal : false };
      });
      
      const mainTask = newTasks[0];
      const quarterlies = newTasks.slice(1);
      
      const principalTask = quarterlies.find(t => t.isPrincipal);
      const otherTasks = quarterlies.filter(t => !t.isPrincipal);
      
      const sortedQuarterlies = principalTask ? [principalTask, ...otherTasks] : quarterlies;
      
      onUpdate([mainTask, ...sortedQuarterlies]);
  };

  // --- Billetes Actions ---
  const handleBilleteClick = (index: number) => {
      if (!onUpdateBilletes) return;
      
      const count = index + 1;
      const newState = Array(20).fill(false).map((_, i) => i < count);
      
      if (count === 20) {
          setShowBilletesConfirm(true);
      } else {
          onUpdateBilletes(newState, huchaCount);
      }
  };

  const incrementBilletes = () => {
      if (!onUpdateBilletes) return;
      const currentCount = billetesState.filter(v => v).length;
      const newCount = currentCount + 1;
      
      if (newCount > 20) return;

      const newState = Array(20).fill(false).map((_, i) => i < newCount);

      if (newCount === 20) {
          setShowBilletesConfirm(true);
      } else {
          onUpdateBilletes(newState, huchaCount);
      }
  };

  const confirmBilletesPleno = () => {
      if (!onUpdateBilletes) return;
      onUpdateBilletes(Array(20).fill(false), huchaCount + 1);
      setShowBilletesConfirm(false);
  };

  const cancelBilletesPleno = () => {
      if (onUpdateBilletes) {
          const revertedState = Array(20).fill(false).map((_, i) => i < 19);
          onUpdateBilletes(revertedState, huchaCount);
      }
      setShowBilletesConfirm(false);
  };

  // --- Leones Actions ---
  const toggleLeon = (index: number) => {
      if (!onUpdateLeones) return;
      
      const newState = [...leonesState];
      const isActivating = !newState[index];
      newState[index] = isActivating;

      // Check if this is the 20th leon being activated
      const activatedCount = newState.filter(v => v).length;
      if (isActivating && activatedCount === 20) {
          setLastLeonIndex(index);
          setShowLeonesConfirm(true);
      } else {
          onUpdateLeones(newState, leonesCount);
      }
  };

  const confirmLeonesPleno = () => {
      if (!onUpdateLeones) return;
      onUpdateLeones(Array(20).fill(false), leonesCount + 1);
      setShowLeonesConfirm(false);
      setLastLeonIndex(null);
  };

  const cancelLeonesPleno = () => {
      if (lastLeonIndex !== null && onUpdateLeones) {
          const revertedState = [...leonesState];
          revertedState[lastLeonIndex] = false;
          onUpdateLeones(revertedState, leonesCount);
      }
      setShowLeonesConfirm(false);
      setLastLeonIndex(null);
  };

  const getThemeClasses = () => {
      if (themeColor === 'orange') {
          return {
              bg: 'bg-orange-950/20',
              text: 'text-orange-200',
              accent: 'text-orange-500',
              border: 'border-orange-900',
              bar: 'bg-orange-600',
              button: 'bg-orange-800 hover:bg-orange-700',
              buttonSecondary: 'bg-stone-800 hover:bg-stone-700'
          };
      }
      return {
          bg: 'bg-amber-950/20',
          text: 'text-amber-200',
          accent: 'text-amber-500',
          border: 'border-amber-900',
          bar: 'bg-amber-600',
          button: 'bg-amber-800 hover:bg-amber-700',
          buttonSecondary: 'bg-stone-800 hover:bg-stone-700'
      };
  };

  const theme = getThemeClasses();

  // Colors for the 4 quarterly objectives
  const getQuarterlyColors = (taskId: string) => {
      if (taskId.includes('money')) return { bg: 'bg-yellow-950/20', bar: 'bg-yellow-600', text: 'text-yellow-200', accent: 'text-yellow-500', border: 'border-yellow-900', button: 'bg-yellow-800 hover:bg-yellow-700', buttonSecondary: 'bg-stone-800 hover:bg-stone-700' };
      if (taskId.includes('health')) return { bg: 'bg-emerald-950/20', bar: 'bg-emerald-600', text: 'text-emerald-200', accent: 'text-emerald-500', border: 'border-emerald-900', button: 'bg-emerald-800 hover:bg-emerald-700', buttonSecondary: 'bg-stone-800 hover:bg-stone-700' };
      if (taskId.includes('love')) return { bg: 'bg-red-950/20', bar: 'bg-red-600', text: 'text-red-200', accent: 'text-red-500', border: 'border-red-900', button: 'bg-red-800 hover:bg-red-700', buttonSecondary: 'bg-stone-800 hover:bg-stone-700' };
      if (taskId.includes('proj')) return { bg: 'bg-blue-950/20', bar: 'bg-blue-600', text: 'text-blue-200', accent: 'text-blue-500', border: 'border-blue-900', button: 'bg-blue-800 hover:bg-blue-700', buttonSecondary: 'bg-stone-800 hover:bg-stone-700' };
      
      return { bg: 'bg-stone-950/20', bar: 'bg-stone-600', text: 'text-stone-200', accent: 'text-stone-500', border: 'border-stone-900', button: 'bg-stone-800 hover:bg-stone-700', buttonSecondary: 'bg-stone-800 hover:bg-stone-700' };
  };

  const getQuarterlyIcon = (taskId: string, className: string) => {
      if (taskId.includes('money')) return <Cat className={className} />;
      if (taskId.includes('health')) return <Apple className={className} />;
      if (taskId.includes('love')) return <Heart className={className} />;
      if (taskId.includes('proj')) return <Settings className={className} />;
      return null;
  };

  const getQuarterlyLabel = (taskId: string, index: number) => {
      if (taskId.includes('money')) return 'Leones (Dinero)';
      if (taskId.includes('health')) return 'Cuerpo (Salud)';
      if (taskId.includes('love')) return 'Brotes (Amor)';
      if (taskId.includes('proj')) return 'Nubes';
      return `Objetivo ${index + 1}`;
  };

  const overallProgress = quarterlyTasks.length > 0 
    ? quarterlyTasks.reduce((acc, task) => acc + Math.min(100, (task.current / task.target) * 100), 0) / quarterlyTasks.length
    : 0;

  return (
    <div className={`fixed inset-0 max-w-md mx-auto z-50 flex flex-col animate-in fade-in duration-200 ${theme.bg}`}>
      <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full">
            <ArrowLeft className={`w-6 h-6 ${theme.accent}`} />
          </button>
          <div>
            <h1 className={`text-xl font-bold ${theme.text}`}>{title}</h1>
            {title === 'Roble' && (
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Hábitos Trimestrales · Otoño 2026</p>
            )}
          </div>
        </div>

        {title === 'Roble' && (
          <button
            onClick={() => setShowCoinsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/40 border border-amber-800/60 text-amber-300 hover:bg-amber-900/40 text-xs font-bold transition-all active:scale-95 shadow-sm"
            title="Ver Medallero y Monedas de Metal"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Monedas</span>
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col p-6 items-center space-y-4 overflow-y-auto pb-28 no-scrollbar">
        
        {/* OVERALL PROGRESS BAR */}
        {title === 'Roble' && quarterlyTasks.length > 0 && (
            <div className="w-full mb-2">
                <div className="flex justify-between items-end mb-2">
                    <h3 className="font-bold text-stone-400 uppercase tracking-widest text-xs">Progreso Global</h3>
                    <span className="text-sm font-black text-stone-200">{Math.round(overallProgress)}%</span>
                </div>
                <div className="h-3 bg-stone-900 rounded-full overflow-hidden relative border border-stone-800 shadow-inner">
                    <div 
                        className={`h-full transition-all duration-500 ease-out ${theme.bar}`} 
                        style={{ width: `${overallProgress}%` }}
                    ></div>
                </div>
            </div>
        )}

        {/* MAIN TASK SECTION (Leones ONLY) */}
        {title === 'Leones' && (
            <div className="flex flex-col items-center justify-center w-full space-y-4 py-2">
                <div className="text-center w-full relative px-8">
                    <h2 className="text-2xl font-black text-stone-100 mb-1 leading-tight">{mainTask.name}</h2>
                    <p className={`text-base font-mono ${theme.accent} opacity-80`}>
                        {mainTask.current} <span className="text-stone-500">/</span> {mainTask.target} <span className="text-xs text-stone-600">{mainTask.unit}</span>
                    </p>
                </div>

                <div className="w-full">
                    <div className="h-6 bg-stone-900 rounded-full overflow-hidden relative border border-stone-800 shadow-inner">
                        <div 
                            className={`h-full transition-all duration-500 ease-out ${theme.bar}`} 
                            style={{ width: `${Math.min(100, (mainTask.current / mainTask.target) * 100)}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-md">
                            {Math.round(Math.min(100, (mainTask.current / mainTask.target) * 100))}%
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-6 w-full">
                    <button 
                        onClick={() => updateMainProgress(-1)}
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${theme.buttonSecondary} border border-stone-700`}
                    >
                        <Minus className="w-6 h-6 text-stone-400" />
                    </button>

                    <button 
                        onClick={() => updateMainProgress(1)}
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-md shadow-black/40 ${theme.button} border border-white/10`}
                    >
                        <Plus className="w-6 h-6 text-white" />
                    </button>
                </div>
            </div>
        )}

        {/* BILLETES SECTION (Leones ONLY) */}
        {title === 'Leones' && (
            <div className="w-full space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Banknote className="w-3 h-3" /> Billetes
                    </h3>
                    <div className="flex items-center gap-1.5 bg-stone-950 px-2.5 py-1 rounded-full border border-stone-800">
                        <PiggyBank className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-base font-black text-stone-100">{huchaCount}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex-1 flex gap-1 h-12 bg-stone-950 p-1.5 rounded-xl border border-stone-800">
                        {Array.from({ length: 20 }).map((_, idx) => {
                            const active = billetesState[idx];
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleBilleteClick(idx)}
                                    className={`flex-1 rounded-sm transition-all duration-300 ${
                                        active 
                                            ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]' 
                                            : 'bg-stone-800 hover:bg-stone-700'
                                    }`}
                                />
                            );
                        })}
                    </div>
                    
                    <button
                        onClick={incrementBilletes}
                        className="w-12 h-12 shrink-0 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-900 flex items-center justify-center font-black active:scale-95 transition-all shadow-lg shadow-amber-900/30"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </div>
            </div>
        )}

        {/* LEONES SECTION (Leones ONLY) */}
        {title === 'Leones' && (
            <div className="w-full space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Cat className="w-3 h-3" /> Leones (24h)
                    </h3>
                    <div className="flex items-center gap-1.5 bg-stone-950 px-2.5 py-1 rounded-full border border-stone-800">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-base font-black text-stone-100">{leonesCount}</span>
                    </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                    {leonesState.map((active, idx) => (
                        <button
                            key={idx}
                            onClick={() => toggleLeon(idx)}
                            className={`
                                aspect-[3/2] rounded-lg flex items-center justify-center transition-all duration-300 border-2
                                ${active 
                                    ? 'bg-amber-600 border-amber-400 text-stone-900 shadow-[0_0_8px_rgba(217,119,6,0.3)] scale-105' 
                                    : 'bg-stone-950 border-stone-800 text-orange-500 opacity-40 hover:opacity-100'}
                            `}
                        >
                            <Cat className="w-5 h-5" />
                        </button>
                    ))}
                </div>
            </div>
        )}



        {/* SEASONAL TREE (ROBLE ONLY) */}
        {title === 'Roble' && (
            <div className="w-full flex justify-center !mt-3">
                {(() => {
                    const month = new Date().getMonth(); // 0-11
                    let TreeIcon = TreePine;
                    let colorClass = "text-slate-300";
                    let seasonName = "Invierno";
                    let ParticleIcon = Snowflake;
                    let activeParticleClass = "text-sky-300 drop-shadow-[0_0_8px_rgba(125,211,252,0.6)]";
                    const inactiveParticleClass = "text-stone-500";

                    if (month >= 3 && month <= 5) {
                        TreeIcon = TreeDeciduous;
                        colorClass = "text-lime-500 drop-shadow-[0_0_15px_rgba(132,204,22,0.4)]";
                        seasonName = "Primavera";
                        ParticleIcon = Leaf;
                        activeParticleClass = "text-lime-400 drop-shadow-[0_0_8px_rgba(163,230,53,0.6)]";
                    } else if (month >= 6 && month <= 8) {
                        TreeIcon = TreeDeciduous;
                        colorClass = "text-emerald-700 drop-shadow-[0_0_15px_rgba(4,120,87,0.4)]";
                        seasonName = "Verano";
                        ParticleIcon = Sun;
                        activeParticleClass = "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]";
                    } else if (month >= 9 && month <= 11) {
                        TreeIcon = TreeDeciduous;
                        colorClass = "text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]";
                        seasonName = "Otoño";
                        ParticleIcon = Leaf;
                        activeParticleClass = "text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]";
                    } else {
                        colorClass = "text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.3)] opacity-80";
                        seasonName = "Invierno";
                        ParticleIcon = Snowflake;
                        activeParticleClass = "text-sky-300 drop-shadow-[0_0_8px_rgba(125,211,252,0.6)]";
                    }

                    // Generate a deterministic grid of background particles (e.g. 8x8)
                    const rows = 8;
                    const cols = 8;
                    const rawPoints = [];
                    
                    // Simple deterministic pseudo-random generator
                    const pseudoRandom = (s: number) => {
                        const val = Math.sin(s) * 10000;
                        return val - Math.floor(val);
                    };

                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                            // Normalized coordinates (0 to 1)
                            const nx = c / (cols - 1);
                            const ny = r / (rows - 1);
                            
                            // Distance from center (0.5, 0.5) using an ellipse boundary
                            // to clear a vertical capsule space for both the tree and the season text
                            const dx = nx - 0.5;
                            const dy = ny - 0.5;
                            const ellipseValue = (dx * dx) / (0.24 * 0.24) + (dy * dy) / (0.38 * 0.38);
                            
                            // Skip items inside the ellipse exclusion zone
                            if (ellipseValue < 1.0) continue;

                            // Calculate actual percentage positions
                            let px = nx * 100;
                            let py = ny * 100;

                            // Add deterministic jitter
                            const seed = r * cols + c;
                            const rx = pseudoRandom(seed);
                            const ry = pseudoRandom(seed + 1);
                            const rRot = pseudoRandom(seed + 2);
                            const rScale = pseudoRandom(seed + 3);

                            // Deviate positions slightly to look organic but maintaining symmetric spacing
                            px += (rx - 0.5) * (100 / cols) * 0.15;
                            py += (ry - 0.5) * (100 / rows) * 0.15;

                            // Clamp values to keep particles within borders
                            px = Math.max(5, Math.min(95, px));
                            py = Math.max(5, Math.min(95, py));

                            const rotation = rRot * 360;
                            const scale = 0.9 + rScale * 0.2; // 0.9 to 1.1

                            rawPoints.push({ x: px, y: py, rotation, scale });
                        }
                    }

                    // Sort points by -Y * 3.5 + X ascending
                    // This creates a smooth diagonal wave sweep from bottom-left to top-right
                    const sortedPoints = rawPoints.map((p, idx) => ({
                        ...p,
                        sortKey: -p.y * 3.5 + p.x
                    })).sort((a, b) => a.sortKey - b.sortKey);

                    // Compute count of active elements based on overall progress
                    const activeCount = Math.round((overallProgress / 100) * sortedPoints.length);

                    return (
                        <div className="relative w-full bg-stone-950/40 border border-stone-900/60 rounded-[32px] p-6 flex items-center justify-center min-h-[260px] overflow-hidden shadow-inner">
                            {/* Background Particles representing global progress */}
                            <div className="absolute inset-0 z-0 select-none pointer-events-none">
                                {sortedPoints.map((p, i) => {
                                    const isActive = i < activeCount;
                                    return (
                                        <div
                                            key={i}
                                            className="absolute transition-all duration-700 ease-out"
                                            style={{
                                                left: `${p.x}%`,
                                                top: `${p.y}%`,
                                                transform: `translate(-50%, -50%) rotate(${p.rotation}deg) scale(${isActive ? p.scale : p.scale * 0.85})`,
                                                opacity: isActive ? 0.9 : 0.35,
                                            }}
                                        >
                                            <ParticleIcon 
                                                className={`w-5 h-5 transition-colors duration-700 ${isActive ? activeParticleClass : inactiveParticleClass}`} 
                                                strokeWidth={1.5}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Centered Seasonal Tree Icon */}
                            <div className="relative z-10 flex flex-col items-center select-none pointer-events-none">
                                <TreeIcon className={`w-32 h-32 transition-all duration-1000 ${colorClass}`} strokeWidth={1.5} />
                                <span className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-stone-500">
                                    {seasonName}
                                </span>
                            </div>
                        </div>
                    );
                })()}
            </div>
        )}

        {/* STACKED BUTTONS (ROBLE ONLY) */}
        {title === 'Roble' && quarterlyTasks.length > 0 && (
            <div className="w-full !mt-3">
                <div className="flex flex-col gap-3">
                    {quarterlyTasks.map((task, i) => {
                         const colors = getQuarterlyColors(task.id);
                         const qPercent = Math.min(100, (task.current / task.target) * 100); 
                         const nextMilestone = task.milestones?.find(m => !m.completed);
                         return (
                            <button 
                                key={task.id}
                                onClick={() => setSelectedObjectiveId(task.id)}
                                className={`
                                    relative w-full rounded-2xl p-4 transition-all duration-300 border border-stone-800 overflow-hidden text-left shadow-sm active:scale-[0.98] group bg-stone-900/90 hover:border-stone-700
                                `}
                            >
                                {/* Progress fill */}
                                <div 
                                    className={`absolute top-0 left-0 bottom-0 transition-all duration-700 ${colors.bar} opacity-15`}
                                    style={{ width: `${qPercent}%` }}
                                />
                                {/* Hover Effect Outline */}
                                <div className={`absolute inset-0 border-2 border-transparent group-hover:${colors.border} rounded-2xl transition-colors pointer-events-none`} />
                                
                                <div className="relative z-10 flex flex-col gap-2 w-full">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-2.5 truncate">
                                            <div className={`p-1.5 rounded-lg ${colors.bg} ${colors.accent} shrink-0`}>
                                                {getQuarterlyIcon(task.id, "w-4 h-4")}
                                            </div>
                                            <h4 className="text-sm font-bold text-stone-100 truncate">{task.name}</h4>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={`text-xs font-black ${colors.accent}`}>
                                                {task.current} <span className="text-stone-500 font-normal">/ {task.target} {task.unit}</span>
                                            </span>
                                            <span className="text-[10px] font-bold text-stone-400 bg-stone-950 px-2 py-0.5 rounded-full border border-stone-800">
                                                {Math.round(qPercent)}%
                                            </span>
                                        </div>
                                    </div>

                                    {nextMilestone ? (
                                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-stone-800/80 text-[11px]">
                                            <div className="flex items-center gap-1.5 text-stone-300 truncate">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-orange-400/90 bg-orange-950/40 px-1.5 py-0.5 rounded border border-orange-900/40 shrink-0">
                                                    Nivel {nextMilestone.level}
                                                </span>
                                                <span className="truncate text-stone-300 font-medium">{nextMilestone.title}</span>
                                            </div>
                                            {nextMilestone.deadline && (
                                                <span className="text-[10px] font-mono text-stone-400 shrink-0 flex items-center gap-1 bg-stone-950/60 px-1.5 py-0.5 rounded border border-stone-800/60">
                                                    <Calendar className="w-2.5 h-2.5 text-stone-500" />
                                                    {nextMilestone.deadline.slice(5)}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-stone-800/80 text-[11px]">
                                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                                                <Check className="w-3.5 h-3.5 stroke-[3]" /> ¡Objetivo Trimestral Conquistado!
                                            </span>
                                            {task.coinReward && (
                                                <span className="text-[10px] text-amber-400 flex items-center gap-1 font-bold">
                                                    <Coins className="w-3 h-3" /> Moneda Lista
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </button>
                         );
                    })}
                </div>
            </div>
        )}

      </div>

      {/* Billetes Completion Modal */}
      {showBilletesConfirm && (
        <div 
          className="fixed inset-0 max-w-md mx-auto z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={cancelBilletesPleno}
        >
            <div 
              className="bg-stone-900 w-full max-w-sm rounded-3xl shadow-2xl border border-stone-800 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
                <div className="p-8 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-amber-600/20 rounded-full flex items-center justify-center mb-6 border border-amber-500/50 shadow-[0_0_20px_rgba(217,119,6,0.2)]">
                        <PiggyBank className="w-10 h-10 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-black text-stone-100 mb-2 uppercase tracking-tighter italic">¡Objetivo de Ahorro!</h2>
                    <p className="text-stone-400 mb-8 text-sm leading-relaxed">
                        Has llenado tu última cuadrícula de billetes. <br/>¿Quieres sumarlo a la hucha y reiniciar el contador?
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button 
                            onClick={cancelBilletesPleno}
                            className="py-4 rounded-2xl border border-stone-800 text-stone-500 hover:bg-stone-800 font-bold transition-all text-sm uppercase"
                        >
                            Error
                        </button>
                        <button 
                            onClick={confirmBilletesPleno}
                            className="py-4 rounded-2xl bg-amber-600 text-stone-950 font-black hover:bg-amber-500 transition-all shadow-lg shadow-amber-900/20 text-sm uppercase"
                        >
                            ¡A la Hucha!
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Leones Completion Modal */}
      {showLeonesConfirm && (
        <div 
          className="fixed inset-0 max-w-md mx-auto z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={cancelLeonesPleno}
        >
            <div 
              className="bg-stone-900 w-full max-w-sm rounded-3xl shadow-2xl border border-stone-800 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
                <div className="p-8 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-amber-600/20 rounded-full flex items-center justify-center mb-6 border border-amber-500/50 shadow-[0_0_20px_rgba(217,119,6,0.2)]">
                        <Trophy className="w-10 h-10 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-black text-stone-100 mb-2 uppercase tracking-tighter italic">¡Objetivo de Leones!</h2>
                    <p className="text-stone-400 mb-8 text-sm leading-relaxed">
                        Has llenado tu última cuadrícula de leones. <br/>¿Quieres sumar un trofeo y reiniciar el contador?
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button 
                            onClick={cancelLeonesPleno}
                            className="py-4 rounded-2xl border border-stone-800 text-stone-500 hover:bg-stone-800 font-bold transition-all text-sm uppercase"
                        >
                            Error
                        </button>
                        <button 
                            onClick={confirmLeonesPleno}
                            className="py-4 rounded-2xl bg-amber-600 text-stone-950 font-black hover:bg-amber-500 transition-all shadow-lg shadow-amber-900/20 text-sm uppercase"
                        >
                            ¡Al Trofeo!
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* OBJECTIVE POPUP MODAL */}
      {selectedObjective && (
        <div 
          className="fixed inset-0 max-w-md mx-auto z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setSelectedObjectiveId(null)}
        >
            <div 
              className="bg-stone-900 w-full max-w-sm rounded-[32px] shadow-2xl border border-stone-800 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
                {/* PROGRESS MODE POPUP */}
                {/* PROGRESS & MILESTONES POPUP */}
                <div className="p-6 flex flex-col items-center text-center max-h-[85vh] overflow-y-auto no-scrollbar">
                    <div className="flex justify-between w-full mb-4 shrink-0">
                        <button 
                            onClick={() => togglePrincipal(selectedObjective.id)}
                            className={`p-2 rounded-full transition-colors ${selectedObjective.isPrincipal ? getQuarterlyColors(selectedObjective.id).accent : 'text-stone-700 hover:text-stone-500'}`}
                            title={selectedObjective.isPrincipal ? "Objetivo Principal" : "Marcar como Principal"}
                        >
                            {selectedObjective.isPrincipal ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                        </button>
                        <button 
                            onClick={() => setSelectedObjectiveId(null)}
                            className="p-2 text-stone-500 hover:text-stone-300 bg-stone-950 rounded-full border border-stone-800"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 border-2 ${getQuarterlyColors(selectedObjective.id).border} ${getQuarterlyColors(selectedObjective.id).bg} shrink-0`}>
                         {getQuarterlyIcon(selectedObjective.id, `w-8 h-8 ${getQuarterlyColors(selectedObjective.id).accent}`)}
                    </div>

                    <h2 className="text-lg font-black text-stone-100 mb-1 leading-tight">{selectedObjective.name}</h2>
                    
                    {selectedObjective.smartDescription && (
                      <p className="text-xs text-stone-400 mb-3 px-2 leading-relaxed text-balance">
                        {selectedObjective.smartDescription}
                      </p>
                    )}

                    <div className="flex items-baseline gap-2 mb-3 bg-stone-950 px-4 py-2 rounded-xl border border-stone-800 shrink-0">
                         <span className={`text-3xl font-black font-mono ${getQuarterlyColors(selectedObjective.id).accent}`}>{selectedObjective.current}</span>
                         <span className="text-stone-600 text-lg">/</span>
                         <span className="text-stone-400 font-bold text-lg">{selectedObjective.target}</span>
                         <span className="text-stone-600 text-xs uppercase font-black">{selectedObjective.unit}</span>
                    </div>

                    {/* Progress adjustments */}
                    <div className="flex items-center justify-center gap-4 w-full mb-4 shrink-0">
                        <button 
                            onClick={() => updateQuarterlyProgress(selectedObjective.id, -1)}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-90 bg-stone-950 border border-stone-800 text-stone-500 hover:text-stone-300`}
                        >
                            <Minus className="w-5 h-5" />
                        </button>

                        <button 
                            onClick={() => updateQuarterlyProgress(selectedObjective.id, 1)}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-black/40 ${getQuarterlyColors(selectedObjective.id).button} border border-white/10`}
                        >
                            <Plus className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* MILESTONE / LEVEL LADDER (REGLA DE LOS 10 DÍAS) */}
                    {selectedObjective.milestones && selectedObjective.milestones.length > 0 && (
                      <div className="w-full text-left mt-2 mb-3 pt-3 border-t border-stone-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                            <Compass className="w-3 h-3 text-orange-400" /> Niveles Intermedios (≤ 10 días)
                          </span>
                          <span className="text-[10px] font-mono font-bold text-stone-500">
                            {selectedObjective.milestones.filter(m => m.completed).length} / {selectedObjective.milestones.length}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {selectedObjective.milestones.map((m) => {
                            const isDone = m.completed || selectedObjective.current >= m.targetValue;
                            return (
                              <button
                                key={m.id}
                                onClick={() => toggleMilestone(selectedObjective.id, m.id)}
                                className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 active:scale-[0.99] ${
                                  isDone 
                                    ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-200' 
                                    : 'bg-stone-950/60 border-stone-800 text-stone-300 hover:border-stone-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                                    isDone 
                                      ? 'bg-emerald-600 border-emerald-500 text-stone-950' 
                                      : 'bg-stone-900 border-stone-700 text-stone-600'
                                  }`}>
                                    {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <div className="truncate">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-[9px] font-black uppercase px-1 py-0.2 rounded border ${
                                        isDone ? 'bg-emerald-950 border-emerald-800 text-emerald-400' : 'bg-stone-900 border-stone-800 text-stone-400'
                                      }`}>
                                        N{m.level}
                                      </span>
                                      <span className={`text-xs font-bold truncate ${isDone ? 'line-through text-stone-400' : 'text-stone-200'}`}>
                                        {m.title}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {m.deadline && (
                                  <span className={`text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded border ${
                                    isDone ? 'border-emerald-900/40 text-emerald-400/70' : 'border-stone-800 text-stone-500 bg-stone-900'
                                  }`}>
                                    {m.deadline.slice(5)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* VÍNCULO NUMISMÁTICO DE MONEDA */}
                    {selectedObjective.coinReward && (
                      <div className="w-full bg-amber-950/20 border border-amber-900/40 rounded-xl p-2.5 flex items-center justify-between text-left mb-3">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                          <div className="truncate">
                            <p className="text-[9px] font-black uppercase tracking-wider text-amber-400/80">Recompensa Numismática</p>
                            <p className="text-xs font-bold text-amber-200 truncate">{selectedObjective.coinReward}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-amber-400/90 font-mono font-bold bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/40">
                          🪙 Acuñable
                        </span>
                      </div>
                    )}
                    
                    <button 
                        onClick={() => setSelectedObjectiveId(null)}
                        className="text-stone-500 hover:text-stone-300 text-xs font-bold uppercase tracking-widest mt-1 shrink-0 py-2 w-full"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* COINS & MEDALLERO MODAL (ROBLE) */}
      {showCoinsModal && (
        <div 
          className="fixed inset-0 max-w-md mx-auto z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setShowCoinsModal(false)}
        >
          <div 
            className="bg-stone-900 w-full max-w-sm rounded-[32px] shadow-2xl border border-stone-800 overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-950/40 border border-amber-800/60 rounded-xl">
                  <Coins className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-100">Medallero del Reino</h3>
                  <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Hitos Vitales & Monedas Físicas</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCoinsModal(false)}
                className="p-1.5 text-stone-500 hover:text-stone-300 bg-stone-900 rounded-full border border-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 no-scrollbar text-left text-xs">
              {/* Sección Monedas Acuñadas */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" /> Monedas Acuñadas (4 Conquistadas)
                </h4>
                <div className="space-y-1.5">
                  {[
                    { season: 'Verano 2025', domain: '⚡ Cuerpo', name: '20 Dominadas seguidas' },
                    { season: 'Primavera 2024', domain: '⚡ Cuerpo', name: 'Ceto 4 semanas' },
                    { season: 'Invierno 2024', domain: '⚡ Cuerpo', name: 'Efecto Kettlebell' },
                    { season: 'Otoño 2023', domain: '⚡ Cuerpo', name: 'Desencadenado' },
                  ].map((c, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🪙</span>
                        <div>
                          <p className="font-bold text-stone-200">{c.name}</p>
                          <p className="text-[10px] text-stone-400">{c.domain} · {c.season}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/60">
                        ✓ Acuñada
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección Conquista en Juego Q4 2026 */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> En Juego este Trimestre (Roble Q4)
                </h4>
                <div className="space-y-1.5">
                  {[
                    { title: 'Vender el Trastero / Cochera', target: '4 lotes Wallapop', domain: '🦁 Leones' },
                    { title: 'Calibración Nutricional (Meta Anual)', target: '30 días Nutrilio', domain: '🍏 Bosque' },
                    { title: 'Crónicas Calicaseñas impresas', target: 'Crónica 4 sellada', domain: '🌿 Brotes' },
                    { title: 'Máster RBG de Fotografía', target: 'Curso Flash completado', domain: '☁️ Nubes' },
                  ].map((target, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-stone-200 flex items-center gap-1.5">
                          <span className="text-amber-400">🪙</span> {target.title}
                        </p>
                        <p className="text-[10px] text-stone-400">{target.domain} · Meta: {target.target}</p>
                      </div>
                      <span className="text-[9px] font-bold text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-800/50">
                        En forja
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800/80 text-[11px] text-stone-400 leading-relaxed">
                <p>
                  <strong className="text-stone-300">Axioma Numismático:</strong> Cada meta anual o gesta histórica alcanzada se traslada formalmente al Medallero para mandar a forjar su moneda de metal personalizada.
                </p>
              </div>
            </div>

            <div className="p-3 border-t border-stone-800 bg-stone-950 shrink-0">
              <button
                onClick={() => setShowCoinsModal(false)}
                className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs uppercase tracking-wider"
              >
                Cerrar Medallero
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};