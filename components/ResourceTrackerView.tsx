import React, { useState, useEffect } from 'react';
import { ResourceTask } from '../types';
import { ArrowLeft, Plus, Minus, Edit2, Save, X } from 'lucide-react';

interface ResourceTrackerViewProps {
  title: string;
  themeColor: 'orange' | 'amber'; // Orange for Forjas (Fire), Amber for Leones
  tasks: ResourceTask[];
  onUpdate: (tasks: ResourceTask[]) => void;
  onBack: () => void;
}

export const ResourceTrackerView: React.FC<ResourceTrackerViewProps> = ({ title, themeColor, tasks, onUpdate, onBack }) => {
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

  // Sync state if task changes externally (or initializes)
  useEffect(() => {
      setEditName(mainTask.name);
      setEditTarget(mainTask.target.toString());
      setEditUnit(mainTask.unit);
  }, [mainTask]);

  useEffect(() => {
      setQuarterlyEdits(quarterlyTasks);
  }, [tasks]);

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

  const updateMainProgress = (delta: number) => {
      const newCurrent = Math.max(0, Math.min(mainTask.target, mainTask.current + delta));
      const updatedTask = { ...mainTask, current: newCurrent };
      const newTasks = [...tasks];
      newTasks[0] = updatedTask;
      onUpdate(newTasks);
  };

  const updateQuarterlyProgress = (index: number, delta: number) => {
      const taskIndex = index + 1; // Offset by 1 because 0 is Main
      if (taskIndex >= tasks.length) return;

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
  const percent = Math.min(100, (mainTask.current / mainTask.target) * 100);

  // Colors for the 4 quarterly objectives
  const quarterlyColors = [
    { bg: 'bg-yellow-900/20', bar: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-900' }, // Money
    { bg: 'bg-emerald-900/20', bar: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-900' }, // Health
    { bg: 'bg-red-900/20', bar: 'bg-red-500', text: 'text-red-500', border: 'border-red-900' }, // Love
    { bg: 'bg-blue-900/20', bar: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-900' }, // Projects
  ];

  return (
    <div className={`flex flex-col h-full ${theme.bg} relative`}>
      <div className="p-4 bg-stone-900 shadow-sm flex items-center gap-4 sticky top-0 z-10 border-b border-stone-800">
        <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full">
          <ArrowLeft className={`w-6 h-6 ${theme.accent}`} />
        </button>
        <h1 className={`text-xl font-bold ${theme.text}`}>{title}</h1>
      </div>

      <div className="flex-1 flex flex-col p-6 items-center space-y-8 overflow-y-auto pb-12">
        
        {/* MAIN TASK SECTION */}
        {isEditingMain ? (
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
            /* VIEW MODE MAIN */
            <div className="flex flex-col items-center justify-center w-full space-y-8 py-8">
                <div className="text-center w-full relative">
                    <h2 className="text-3xl font-black text-stone-100 mb-1">{mainTask.name}</h2>
                    <p className={`text-lg font-mono ${theme.accent} opacity-80`}>
                        {mainTask.current} <span className="text-stone-500">/</span> {mainTask.target} <span className="text-sm text-stone-600">{mainTask.unit}</span>
                    </p>
                    
                    <button 
                        onClick={() => setIsEditingMain(true)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-stone-600 hover:text-stone-300 transition-colors bg-stone-900/50 rounded-full border border-stone-800/50"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                </div>

                <div className="w-full space-y-2">
                    <div className="h-8 bg-stone-900 rounded-full overflow-hidden relative border border-stone-800 shadow-inner">
                        <div 
                            className={`h-full transition-all duration-500 ease-out ${theme.bar}`} 
                            style={{ width: `${percent}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white drop-shadow-md">
                            {Math.round(percent)}%
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 w-full max-w-xs">
                    <button 
                        onClick={() => updateMainProgress(-1)}
                        className={`flex-1 aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-90 ${theme.buttonSecondary} border border-stone-700`}
                    >
                        <Minus className="w-8 h-8 text-stone-400" />
                    </button>

                    <button 
                        onClick={() => updateMainProgress(1)}
                        className={`flex-[1.5] aspect-square rounded-3xl flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-black/40 ${theme.button} border border-white/10`}
                    >
                        <Plus className="w-12 h-12 text-white" />
                    </button>
                </div>
            </div>
        )}

        {/* QUARTERLY GOALS (FORJAS ONLY) */}
        {title === 'Forjas' && quarterlyTasks.length > 0 && (
            <div className="w-full pt-8 border-t border-stone-800">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-stone-400 uppercase tracking-widest text-sm">Objetivos de Estación</h3>
                    <button 
                        onClick={() => setIsEditingQuarterly(!isEditingQuarterly)} 
                        className="p-2 text-stone-600 hover:text-stone-300 transition-colors rounded-full hover:bg-stone-800"
                    >
                        {isEditingQuarterly ? <X className="w-5 h-5" /> : <Edit2 className="w-4 h-4" />}
                    </button>
                </div>

                {isEditingQuarterly ? (
                    <div className="space-y-6 bg-stone-900/50 p-4 rounded-2xl border border-stone-800">
                        {quarterlyEdits.map((task, i) => (
                            <div key={task.id} className="space-y-2 p-3 rounded-xl bg-stone-950 border border-stone-800">
                                <div className={`text-xs font-bold uppercase ${quarterlyColors[i]?.text || 'text-stone-500'}`}>Objetivo {i+1}</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <input 
                                        value={task.name}
                                        onChange={(e) => handleQuarterlyEditChange(i, 'name', e.target.value)}
                                        className="col-span-2 bg-stone-900 border border-stone-800 rounded-lg p-2 text-stone-200 text-sm outline-none focus:border-stone-600"
                                        placeholder="Nombre"
                                    />
                                    <input 
                                        type="number"
                                        value={task.target}
                                        onChange={(e) => handleQuarterlyEditChange(i, 'target', e.target.value)}
                                        className="bg-stone-900 border border-stone-800 rounded-lg p-2 text-stone-200 text-sm outline-none focus:border-stone-600"
                                        placeholder="Meta"
                                    />
                                    <input 
                                        value={task.unit}
                                        onChange={(e) => handleQuarterlyEditChange(i, 'unit', e.target.value)}
                                        className="bg-stone-900 border border-stone-800 rounded-lg p-2 text-stone-200 text-sm outline-none focus:border-stone-600"
                                        placeholder="Unidad"
                                    />
                                </div>
                            </div>
                        ))}
                        <button 
                            onClick={saveQuarterlyChanges}
                            className={`w-full py-3 rounded-xl font-bold text-stone-100 flex justify-center items-center gap-2 mt-4 ${theme.button}`}
                        >
                            <Save className="w-5 h-5" /> Guardar Todos
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {quarterlyTasks.map((task, i) => {
                             const colors = quarterlyColors[i] || { bg: 'bg-stone-800', bar: 'bg-stone-500', text: 'text-stone-500', border: 'border-stone-700' };
                             const qPercent = Math.min(100, (task.current / task.target) * 100);

                             return (
                                <div key={task.id} className="flex items-center gap-3">
                                    <button 
                                        onClick={() => updateQuarterlyProgress(i, -1)}
                                        className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 flex items-center justify-center border border-stone-700 flex-shrink-0"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    
                                    <div className="flex-1">
                                        <div className="flex justify-between items-end mb-1 px-1">
                                            <span className="font-bold text-stone-200 text-sm">{task.name}</span>
                                            <span className={`text-xs font-mono font-bold ${colors.text}`}>
                                                {task.current}/{task.target}{task.unit}
                                            </span>
                                        </div>
                                        <div className={`h-4 w-full rounded-full overflow-hidden border ${colors.border} ${colors.bg}`}>
                                            <div 
                                                className={`h-full transition-all duration-500 ${colors.bar}`}
                                                style={{ width: `${qPercent}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => updateQuarterlyProgress(i, 1)}
                                        className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 flex items-center justify-center border border-stone-700 flex-shrink-0"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                             );
                        })}
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};