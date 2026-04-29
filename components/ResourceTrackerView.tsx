import React, { useState, useEffect } from 'react';
import { ResourceTask, Task } from '../types';
import { ArrowLeft, Plus, Minus, Edit2, Save, X, Banknote, Trophy, PiggyBank, Star, CheckCircle2, Circle, Heart, Settings, Cat, Apple, TreePine, TreeDeciduous } from 'lucide-react';
import { useModalHistory } from '../hooks/useModalHistory';

interface ResourceTrackerViewProps {
  title: string;
  themeColor: 'orange' | 'amber'; // Orange for Forjas (Fire), Amber for Leones
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

  const [isEditingMain, setIsEditingMain] = useState(false);
  const [editName, setEditName] = useState(mainTask.name);
  const [editTarget, setEditTarget] = useState(mainTask.target.toString());
  const [editUnit, setEditUnit] = useState(mainTask.unit);

  // Quarterly Editing State
  const [isEditingQuarterly, setIsEditingQuarterly] = useState(false);
  const [quarterlyEdits, setQuarterlyEdits] = useState(quarterlyTasks);

  // Billetes Logic State
  const [showBilletesConfirm, setShowBilletesConfirm] = useState(false);

  const [showLeonesConfirm, setShowLeonesConfirm] = useState(false);
  const [lastLeonIndex, setLastLeonIndex] = useState<number | null>(null);

  // --- FORJA WORK LIST STATE ---
  const [isEditingForjaTasks, setIsEditingForjaTasks] = useState(false);
  const [newForjaTaskText, setNewForjaTaskText] = useState('');

  // --- OBJECTIVE POPUP STATE ---
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const selectedObjective = tasks.find(t => t.id === selectedObjectiveId);
  const [isEditingInPopup, setIsEditingInPopup] = useState(false);

  // Temporary edit state for popup
  const [popupEditName, setPopupEditName] = useState('');
  const [popupEditTarget, setPopupEditTarget] = useState('');
  const [popupEditUnit, setPopupEditUnit] = useState('');

  // --- MOBILE BACK BUTTON SUPPORT FOR MODALS ---
  useModalHistory(isEditingMain, () => setIsEditingMain(false), 'editMainObjective');
  useModalHistory(isEditingQuarterly, () => setIsEditingQuarterly(false), 'editQuarterlyObjectives');
  useModalHistory(showBilletesConfirm, () => setShowBilletesConfirm(false), 'confirmBilletes');
  useModalHistory(showLeonesConfirm, () => setShowLeonesConfirm(false), 'confirmLeones');
  useModalHistory(!!selectedObjectiveId, () => setSelectedObjectiveId(null), 'objectivePopup');
  // ---------------------------------------------

  // Sync state if task changes externally (or initializes)
  useEffect(() => {
      setEditName(mainTask.name);
      setEditTarget(mainTask.target.toString());
      setEditUnit(mainTask.unit);
  }, [mainTask]);

  useEffect(() => {
      setQuarterlyEdits(quarterlyTasks);
  }, [tasks]);

  useEffect(() => {
    if (selectedObjective && !isEditingInPopup) {
      setPopupEditName(selectedObjective.name);
      setPopupEditTarget(selectedObjective.target.toString());
      setPopupEditUnit(selectedObjective.unit);
    }
  }, [selectedObjective, isEditingInPopup]);

  const saveMainChanges = () => {
      const updatedTask: ResourceTask = {
          ...mainTask,
          name: editName,
          target: Number(editTarget) || 1, // Prevent 0 target
          unit: editUnit
      };
      // Keep main task at index 0, preserve rest
      const newTasks = [...tasks];
      newTasks[0] = updatedTask;
      onUpdate(newTasks);
      setIsEditingMain(false);
  };

  const updateMainProgress = (delta: number) => {
      const newCurrent = Math.max(0, Math.min(mainTask.target, mainTask.current + delta));
      const updatedTask = { ...mainTask, current: newCurrent };
      const newTasks = [...tasks];
      newTasks[0] = updatedTask;
      onUpdate(newTasks);
  };

  const saveQuarterlyChanges = () => {
      const newTasks = [...tasks];
      // Update indices 1, 2, 3, 4 with the edited values
      quarterlyEdits.forEach((editedTask, i) => {
          if (i < 4) {
              // Ensure we have correct task structure
              newTasks[i + 1] = {
                  ...editedTask,
                  target: Number(editedTask.target) || 1
              };
          }
      });
      onUpdate(newTasks);
      setIsEditingQuarterly(false);
  };

  const updateQuarterlyProgress = (taskId: string, delta: number) => {
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex <= 0) return; // 0 is Main, or not found

      const task = tasks[taskIndex];
      const newCurrent = Math.max(0, Math.min(task.target, task.current + delta));
      
      const newTasks = [...tasks];
      newTasks[taskIndex] = { ...task, current: newCurrent };
      onUpdate(newTasks);
  };

  const handleQuarterlyEditChange = (index: number, field: keyof ResourceTask, value: string) => {
      const updated = [...quarterlyEdits];
      updated[index] = { ...updated[index], [field]: value };
      setQuarterlyEdits(updated);
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

  const savePopupChanges = () => {
    if (!selectedObjectiveId) return;
    const newTasks = tasks.map(t => t.id === selectedObjectiveId ? {
      ...t,
      name: popupEditName,
      target: Number(popupEditTarget) || 1,
      unit: popupEditUnit
    } : t);
    onUpdate(newTasks);
    setIsEditingInPopup(false);
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
      if (taskId.includes('proj')) return 'Proyecto';
      return `Objetivo ${index + 1}`;
  };

  const overallProgress = quarterlyTasks.length > 0 
    ? quarterlyTasks.reduce((acc, task) => acc + Math.min(100, (task.current / task.target) * 100), 0) / quarterlyTasks.length
    : 0;

  return (
    <div className={`fixed inset-0 max-w-md mx-auto z-50 flex flex-col animate-in fade-in duration-200 ${theme.bg}`}>
      <div className="p-4 bg-stone-900 shadow-sm flex items-center gap-4 border-b border-stone-800 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full">
          <ArrowLeft className={`w-6 h-6 ${theme.accent}`} />
        </button>
        <h1 className={`text-xl font-bold ${theme.text}`}>{title}</h1>
      </div>

      <div className="flex-1 flex flex-col p-6 items-center space-y-4 overflow-y-auto pb-12 no-scrollbar">
        
        {/* OVERALL PROGRESS BAR */}
        {(title === 'Forjas' || title === 'Roble') && quarterlyTasks.length > 0 && (
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
            isEditingMain ? (
                /* EDIT MODE MAIN */
                <div className="w-full bg-stone-900 p-6 rounded-3xl border border-stone-800 shadow-xl space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-stone-400 uppercase tracking-widest text-sm">Editar Objetivo</h3>
                        <button onClick={() => setIsEditingMain(false)} className="text-stone-600 hover:text-stone-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs text-stone-500 font-bold ml-1">Nombre</label>
                        <input 
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-200 outline-none focus:border-stone-600 text-lg font-bold"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="space-y-1 flex-1">
                            <label className="text-xs text-stone-500 font-bold ml-1">Meta</label>
                            <input 
                                type="number"
                                value={editTarget}
                                onChange={e => setEditTarget(e.target.value)}
                                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-200 outline-none focus:border-stone-600 font-mono text-lg"
                            />
                        </div>
                        <div className="space-y-1 w-24">
                            <label className="text-xs text-stone-500 font-bold ml-1">Unidad</label>
                            <input 
                                value={editUnit}
                                onChange={e => setEditUnit(e.target.value)}
                                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-200 outline-none focus:border-stone-600 text-lg"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={saveMainChanges}
                        className={`w-full py-3 rounded-xl font-bold text-stone-100 flex justify-center items-center gap-2 mt-4 transition-transform active:scale-95 ${theme.button}`}
                    >
                        <Save className="w-5 h-5" /> Guardar Cambios
                    </button>
                </div>
            ) : (
                /* VIEW MODE MAIN - Compacted */
                <div className="flex flex-col items-center justify-center w-full space-y-4 py-2">
                    <div className="text-center w-full relative">
                        <h2 className="text-2xl font-black text-stone-100 mb-0.5">{mainTask.name}</h2>
                        <p className={`text-base font-mono ${theme.accent} opacity-80`}>
                            {mainTask.current} <span className="text-stone-500">/</span> {mainTask.target} <span className="text-xs text-stone-600">{mainTask.unit}</span>
                        </p>
                        
                        <button 
                            onClick={() => setIsEditingMain(true)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 text-stone-600 hover:text-stone-300 transition-colors bg-stone-900/50 rounded-full border border-stone-800/50"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
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
            )
        )}

        {/* BILLETES SECTION (Leones ONLY) */}
        {title === 'Leones' && (
            <div className="w-full bg-stone-900 p-4 rounded-3xl border border-stone-800 shadow-sm space-y-4">
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
                
                <p className="text-[8px] text-stone-600 text-center font-bold tracking-widest uppercase">
                    Completa 20 para sumar a la hucha
                </p>
            </div>
        )}

        {/* LEONES SECTION (Leones ONLY) */}
        {title === 'Leones' && (
            <div className="w-full bg-stone-900 p-4 rounded-3xl border border-stone-800 shadow-sm space-y-4">
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
                
                <p className="text-[8px] text-stone-600 text-center font-bold tracking-widest uppercase">
                    Completa 20 para sumar un trofeo
                </p>
            </div>
        )}



        {/* SEASONAL TREE (FORJAS/ROBLE ONLY) */}
        {(title === 'Forjas' || title === 'Roble') && (
            <div className="w-full flex justify-center py-6">
                {(() => {
                    const month = new Date().getMonth(); // 0-11
                    let TreeIcon = TreePine;
                    let colorClass = "text-slate-300";
                    let seasonName = "Invierno";

                    if (month >= 3 && month <= 5) {
                        TreeIcon = TreeDeciduous;
                        colorClass = "text-lime-500 drop-shadow-[0_0_15px_rgba(132,204,22,0.4)]";
                        seasonName = "Primavera";
                    } else if (month >= 6 && month <= 8) {
                        TreeIcon = TreeDeciduous;
                        colorClass = "text-emerald-700 drop-shadow-[0_0_15px_rgba(4,120,87,0.4)]";
                        seasonName = "Verano";
                    } else if (month >= 9 && month <= 11) {
                        TreeIcon = TreeDeciduous;
                        colorClass = "text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]";
                        seasonName = "Otoño";
                    } else {
                        colorClass = "text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.3)] opacity-80";
                    }

                    return (
                        <div className="flex flex-col items-center">
                            <TreeIcon className={`w-32 h-32 transition-all duration-1000 ${colorClass}`} strokeWidth={1.5} />
                            <span className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-stone-600">
                                {seasonName}
                            </span>
                        </div>
                    );
                })()}
            </div>
        )}

        {/* STACKED BUTTONS (FORJAS/ROBLE ONLY) */}
        {(title === 'Forjas' || title === 'Roble') && quarterlyTasks.length > 0 && (
            <div className="w-full pt-4 space-y-3">
                <div className="flex flex-col gap-3">
                    {quarterlyTasks.map((task, i) => {
                         const colors = getQuarterlyColors(task.id);
                         const qPercent = Math.min(100, (task.current / task.target) * 100);

                         return (
                            <button 
                                key={task.id}
                                onClick={() => setSelectedObjectiveId(task.id)}
                                className={`
                                    relative w-full rounded-2xl py-4 px-5 transition-all duration-300 border border-stone-800 overflow-hidden text-left shadow-sm active:scale-[0.98] group
                                `}
                            >
                                {/* Base background */}
                                <div className="absolute inset-0 bg-stone-900" />
                                {/* Progress fill */}
                                <div 
                                    className={`absolute top-0 left-0 bottom-0 transition-all duration-700 ${colors.bar} opacity-20`}
                                    style={{ width: `${qPercent}%` }}
                                />
                                {/* Hover Effect Outline */}
                                <div className={`absolute inset-0 border-2 border-transparent group-hover:${colors.border} rounded-2xl transition-colors pointer-events-none`} />
                                
                                <div className="relative z-10 flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3 truncate">
                                        <h4 className="text-base font-bold text-stone-100 truncate">{task.name}</h4>
                                        <span className={`text-sm font-black ${colors.accent} whitespace-nowrap`}>
                                            {task.current} {task.unit}
                                        </span>
                                    </div>
                                    <div className={`flex-shrink-0 ${colors.accent}`}>
                                        {getQuarterlyIcon(task.id, "w-6 h-6")}
                                    </div>
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
                {isEditingInPopup ? (
                    /* EDIT MODE POPUP */
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                             <h3 className="font-bold text-stone-400 uppercase tracking-widest text-[10px]">Editar Objetivo</h3>
                             <button onClick={() => setIsEditingInPopup(false)} className="text-stone-600 hover:text-stone-400">
                                 <X className="w-5 h-5" />
                             </button>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-[10px] text-stone-500 font-bold uppercase ml-1">Nombre</label>
                            <input 
                                value={popupEditName}
                                onChange={e => setPopupEditName(e.target.value)}
                                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-200 outline-none focus:border-stone-600 text-base font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-stone-500 font-bold uppercase ml-1">Meta</label>
                                <input 
                                    type="number"
                                    value={popupEditTarget}
                                    onChange={e => setPopupEditTarget(e.target.value)}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-200 outline-none focus:border-stone-600 font-mono text-base"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-stone-500 font-bold uppercase ml-1">Unidad</label>
                                <input 
                                    value={popupEditUnit}
                                    onChange={e => setPopupEditUnit(e.target.value)}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-200 outline-none focus:border-stone-600 text-base"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={savePopupChanges}
                            className={`w-full py-4 rounded-2xl font-black text-stone-100 flex justify-center items-center gap-2 mt-4 transition-transform active:scale-95 ${getQuarterlyColors(selectedObjective.id).button}`}
                        >
                            <Save className="w-5 h-5" /> Guardar Cambios
                        </button>
                    </div>
                ) : (
                    /* PROGRESS MODE POPUP */
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="flex justify-between w-full mb-6">
                            <button 
                                onClick={() => togglePrincipal(selectedObjective.id)}
                                className={`p-2 rounded-full transition-colors ${selectedObjective.isPrincipal ? getQuarterlyColors(selectedObjective.id).accent : 'text-stone-700 hover:text-stone-500'}`}
                            >
                                {selectedObjective.isPrincipal ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                            </button>
                            <button 
                                onClick={() => setIsEditingInPopup(true)}
                                className="p-2 text-stone-700 hover:text-stone-400 bg-stone-950 rounded-full border border-stone-800"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border-2 ${getQuarterlyColors(selectedObjective.id).border} ${getQuarterlyColors(selectedObjective.id).bg}`}>
                             {getQuarterlyIcon(selectedObjective.id, `w-10 h-10 ${getQuarterlyColors(selectedObjective.id).accent}`)}
                        </div>

                        <h2 className="text-xl font-black text-stone-100 mb-1">{selectedObjective.name}</h2>
                        <div className="flex items-baseline gap-2 mb-8">
                             <span className={`text-3xl font-black font-mono ${getQuarterlyColors(selectedObjective.id).accent}`}>{selectedObjective.current}</span>
                             <span className="text-stone-600 text-lg">/</span>
                             <span className="text-stone-500 font-bold text-lg">{selectedObjective.target}</span>
                             <span className="text-stone-700 text-xs uppercase font-black">{selectedObjective.unit}</span>
                        </div>

                        <div className="flex items-center justify-center gap-6 w-full mb-4">
                            <button 
                                onClick={() => updateQuarterlyProgress(selectedObjective.id, -1)}
                                className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-90 bg-stone-950 border border-stone-800 text-stone-500 hover:text-stone-300`}
                            >
                                <Minus className="w-6 h-6" />
                            </button>

                            <button 
                                onClick={() => updateQuarterlyProgress(selectedObjective.id, 1)}
                                className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-black/40 ${getQuarterlyColors(selectedObjective.id).button} border border-white/10`}
                            >
                                <Plus className="w-6 h-6 text-white" />
                            </button>
                        </div>
                        
                        <button 
                            onClick={() => setSelectedObjectiveId(null)}
                            className="text-stone-600 hover:text-stone-400 text-xs font-bold uppercase tracking-widest mt-4"
                        >
                            Cerrar
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}

    </div>
  );
};