import React, { useState } from 'react';
import { Task } from '../types';
import { ArrowLeft, Train, Plus, Check, Trash2, ChevronRight, CornerDownRight, X, Edit2, Save } from 'lucide-react';

interface TrainViewProps {
  tasks: Task[];
  annualTasks: Task[];
  onUpdate: (tasks: Task[]) => void;
  onUpdateAnnual: (tasks: Task[]) => void;
  onBack: () => void;
}

export const TrainView: React.FC<TrainViewProps> = ({ tasks, annualTasks, onUpdate, onUpdateAnnual, onBack }) => {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [newSubtask, setNewSubtask] = useState('');
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editMonthlyText, setEditMonthlyText] = useState('');
  const [editAnnualText, setEditAnnualText] = useState('');

  const tasksToText = (taskList: Task[]) => {
      return taskList.map(t => {
          let text = t.text;
          if (t.subtasks && t.subtasks.length > 0) {
              text += '\n' + t.subtasks.map(s => s.text).join('\n');
          }
          return text;
      }).join('\n');
  };

  const textToTasks = (text: string, existingTasks: Task[]): Task[] => {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      const newTasks: Task[] = [];
      let currentTask: Task | null = null;
      
      for (const line of lines) {
          const isEmoji = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(line);
          
          if (isEmoji) {
              const existing = existingTasks.find(t => t.text === line);
              currentTask = {
                  id: existing ? existing.id : Date.now().toString() + Math.random().toString(),
                  text: line,
                  completed: existing ? existing.completed : false,
                  subtasks: []
              };
              newTasks.push(currentTask);
          } else {
              if (currentTask) {
                  const oldTask = existingTasks.find(t => t.text === currentTask!.text);
                  const existingSub = oldTask?.subtasks?.find(s => s.text === line);
                  
                  currentTask.subtasks!.push({
                      id: existingSub ? existingSub.id : Date.now().toString() + Math.random().toString(),
                      text: line,
                      completed: existingSub ? existingSub.completed : false
                  });
              } else {
                  const existing = existingTasks.find(t => t.text === line);
                  currentTask = {
                      id: existing ? existing.id : Date.now().toString() + Math.random().toString(),
                      text: line,
                      completed: existing ? existing.completed : false,
                      subtasks: []
                  };
                  newTasks.push(currentTask);
              }
          }
      }
      return newTasks;
  };

  const handleEditToggle = () => {
      if (isEditing) {
          const newMonthly = textToTasks(editMonthlyText, tasks);
          const newAnnual = textToTasks(editAnnualText, annualTasks);
          onUpdate(newMonthly);
          onUpdateAnnual(newAnnual);
          setIsEditing(false);
      } else {
          setEditMonthlyText(tasksToText(tasks));
          setEditAnnualText(tasksToText(annualTasks));
          setIsEditing(true);
      }
  };
  
  // Custom Delete Confirmation State
  const [taskToDelete, setTaskToDelete] = useState<{ id: string, isAnnual: boolean } | null>(null);

  // Custom Add Task State
  const [addingTaskType, setAddingTaskType] = useState<'monthly' | 'annual' | null>(null);
  const [newTaskText, setNewTaskText] = useState('');

  // Monthly Stats
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  // Annual Stats
  const annualCompletedCount = annualTasks.filter((t) => t.completed).length;
  const annualTotalCount = annualTasks.length;
  const annualProgress = annualTotalCount === 0 ? 0 : (annualCompletedCount / annualTotalCount) * 100;

  // Sort tasks: Incomplete first, Completed last (Only when NOT editing to avoid jumping)
  const sortedTasks = isEditing ? tasks : [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed));
  const sortedAnnualTasks = isEditing ? annualTasks : [...annualTasks].sort((a, b) => Number(a.completed) - Number(b.completed));

  // Determine which list the active task belongs to
  const activeTask = tasks.find(t => t.id === activeTaskId) || annualTasks.find(t => t.id === activeTaskId);

  const toggleTask = (id: string, isAnnual: boolean) => {
    if (isEditing) return; // Prevent toggling while editing
    if (isAnnual) {
        const updated = annualTasks.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
        );
        onUpdateAnnual(updated);
    } else {
        const updated = tasks.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
        );
        onUpdate(updated);
    }
  };

  // --- SUBTASK FUNCTIONS ---

  const addSubtask = () => {
    if (!newSubtask.trim() || !activeTaskId) return;

    // Check Annuals
    if (annualTasks.some(t => t.id === activeTaskId)) {
        const updated = annualTasks.map(t => {
            if (t.id === activeTaskId) {
                return {
                    ...t,
                    subtasks: [
                        ...(t.subtasks || []),
                        {
                            id: Date.now().toString(),
                            text: newSubtask,
                            completed: false
                        }
                    ]
                };
            }
            return t;
        });
        onUpdateAnnual(updated);
    } else {
        // Standard Trains
        const updated = tasks.map(t => {
            if (t.id === activeTaskId) {
                return {
                    ...t,
                    subtasks: [
                        ...(t.subtasks || []),
                        {
                            id: Date.now().toString(),
                            text: newSubtask,
                            completed: false
                        }
                    ]
                };
            }
            return t;
        });
        onUpdate(updated);
    }
    
    setNewSubtask('');
  };

  const toggleSubtask = (subId: string) => {
    if (!activeTaskId) return;

    if (annualTasks.some(t => t.id === activeTaskId)) {
        const updated = annualTasks.map(t => {
            if (t.id === activeTaskId && t.subtasks) {
                return {
                    ...t,
                    subtasks: t.subtasks.map(s => 
                        s.id === subId ? { ...s, completed: !s.completed } : s
                    )
                };
            }
            return t;
        });
        onUpdateAnnual(updated);
    } else {
        const updated = tasks.map(t => {
            if (t.id === activeTaskId && t.subtasks) {
                return {
                    ...t,
                    subtasks: t.subtasks.map(s => 
                        s.id === subId ? { ...s, completed: !s.completed } : s
                    )
                };
            }
            return t;
        });
        onUpdate(updated);
    }
  };

  const deleteSubtask = (subId: string) => {
    if (!activeTaskId) return;

    if (annualTasks.some(t => t.id === activeTaskId)) {
        const updated = annualTasks.map(t => {
            if (t.id === activeTaskId && t.subtasks) {
                return {
                    ...t,
                    subtasks: t.subtasks.filter(s => s.id !== subId)
                };
            }
            return t;
        });
        onUpdateAnnual(updated);
    } else {
        const updated = tasks.map(t => {
            if (t.id === activeTaskId && t.subtasks) {
                return {
                    ...t,
                    subtasks: t.subtasks.filter(s => s.id !== subId)
                };
            }
            return t;
        });
        onUpdate(updated);
    }
  };

  // Helper to parse Name, Duration and Color based on Emoji
  const parseTrainInfo = (text: string) => {
    const timeMatch = text.match(/\s(\d+(?:h|'|min))$/);
    const duration = timeMatch ? timeMatch[1] : '';
    const name = timeMatch ? text.replace(timeMatch[0], '') : text;
    
    let accentColor = 'bg-stone-600'; // Default
    if (name.includes('🦁')) {
        accentColor = 'bg-amber-500'; // Lion - Orange/Yellow
    } else if (name.includes('🍏')) {
        accentColor = 'bg-lime-600'; // Apple - Green
    } else if (name.includes('❤️')) {
        accentColor = 'bg-pink-600'; // Heart - Pink
    } else if (name.includes('📘')) {
        accentColor = 'bg-blue-600'; // Book - Blue
    } else if (name.includes('🍄')) {
        accentColor = 'bg-orange-700';
    }
    
    return { name, duration, accentColor };
  };

  const parseDurationToMinutes = (durationStr: string): number => {
    if (!durationStr) return 0;
    if (durationStr.endsWith('h')) {
      return parseInt(durationStr.replace('h', '')) * 60;
    } else if (durationStr.endsWith("'")) {
      return parseInt(durationStr.replace("'", ''));
    } else if (durationStr.endsWith('min')) {
      return parseInt(durationStr.replace('min', ''));
    }
    return 0;
  };

  const totalMonthlyMinutes = tasks.reduce((acc, task) => {
    if (task.completed) return acc;
    const { duration } = parseTrainInfo(task.text);
    return acc + parseDurationToMinutes(duration);
  }, 0);
  
  const totalMonthlyHours = Math.round(totalMonthlyMinutes / 60);

  const renderTaskList = (list: Task[], isAnnual: boolean) => {
      if (isEditing) {
          return (
              <div className="w-full h-full min-h-[300px]">
                  <textarea
                      value={isAnnual ? editAnnualText : editMonthlyText}
                      onChange={(e) => isAnnual ? setEditAnnualText(e.target.value) : setEditMonthlyText(e.target.value)}
                      className="w-full h-full min-h-[300px] bg-stone-950 border border-stone-700 rounded-2xl p-4 text-stone-200 focus:outline-none focus:border-blue-500 font-mono text-sm leading-relaxed resize-y"
                      placeholder={isAnnual ? "Pega aquí tus tareas anuales...\n🌍 Viajar a Japón\nComprar billetes\nReservar hotel" : "Pega aquí tus tareas mensuales...\n🦁 Gym 1h\nPecho\nEspalda"}
                  />
              </div>
          );
      }

      return (
      <div className="space-y-3">
            {list.map((task) => {
               const { name, duration, accentColor } = parseTrainInfo(task.text);
               const finalAccentColor = isAnnual ? 'bg-stone-200' : accentColor;

               return (
                <div
                    key={task.id}
                    className={`relative flex items-center p-4 rounded-2xl transition-all overflow-hidden border border-stone-800 shadow-sm ${
                    task.completed && !isEditing
                        ? 'bg-stone-900/40 opacity-50'
                        : 'bg-stone-900 hover:bg-stone-800'
                    }`}
                    onClick={() => !isEditing && setActiveTaskId(task.id)}
                >
                    {/* Left Accent Line */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${finalAccentColor} h-full`} />

                    {/* Checkbox (Hidden in Edit Mode) */}
                    {!isEditing && (
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleTask(task.id, isAnnual); }}
                            className={`ml-4 flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors z-10 ${
                            task.completed
                                ? 'bg-stone-700 border-stone-700 text-stone-400'
                                : 'border-stone-600 hover:border-stone-500'
                            }`}
                        >
                            {task.completed && <Check className="w-3.5 h-3.5" />}
                        </button>
                    )}

                    {/* Content (Input in Edit Mode, Text in View Mode) */}
                    <div className="flex-1 ml-4 mr-2 min-w-0">
                        <span className={`block font-bold text-lg truncate ${task.completed ? 'line-through text-stone-500' : 'text-stone-200'}`}>
                            {name}
                        </span>
                        {task.subtasks && task.subtasks.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-stone-500 mt-1">
                                <CornerDownRight className="w-3 h-3" />
                                {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                            </div>
                        )}
                    </div>

                    {/* Right Side: Delete in Edit Mode, Info in View Mode */}
                    <div className="flex items-center gap-3">
                        {duration && (
                            <span className="flex items-center gap-1 text-xs font-mono font-bold text-stone-400 bg-stone-800 px-3 py-1.5 rounded-full border border-stone-700">
                                {duration}
                            </span>
                        )}
                        <ChevronRight className="w-5 h-5 text-stone-600" />
                    </div>
                </div>
              );
            })}

             {list.length === 0 && !isEditing && <p className="text-center text-stone-600 py-4">Sin tareas.</p>}
        </div>
  )};

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 flex flex-col animate-in fade-in duration-200">
      <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full">
            <ArrowLeft className="w-6 h-6 text-blue-400" />
            </button>
            <h1 className="text-xl font-bold text-blue-100">Trenes</h1>
        </div>
        
        <button 
            onClick={handleEditToggle} 
            className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-blue-600 text-white' : 'hover:bg-stone-800 text-blue-400'}`}
        >
            {isEditing ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-12 bg-blue-950/20">
        {/* Train Visualization (Hidden when Editing to reduce clutter) */}
        {!isEditing && (
            <div className="mb-8 p-6 bg-stone-900 rounded-2xl shadow-sm border border-blue-900/50">
                {/* Monthly Progress (Train) */}
                <div className="relative h-24 flex items-center">
                    {/* Track */}
                    <div className="absolute w-full h-3 bg-stone-800 rounded-full overflow-hidden">
                        <div className="w-full h-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, #475569 50%)', backgroundSize: '20px 100%' }}></div>
                    </div>

                    {/* Moving Train */}
                    <div 
                        className="absolute transition-all duration-1000 ease-in-out z-10"
                        style={{ left: `calc(${progress}% - 32px)` }} 
                    >
                        <div className="bg-blue-600 p-3 rounded-lg shadow-lg ring-2 ring-blue-400/50">
                            <Train className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-center mt-2 font-bold text-blue-400 text-sm">
                            {Math.round(progress)}%
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-center mt-6 mb-6">
                    {totalMonthlyHours >= 0 && (
                        <span className="flex items-center gap-1 text-sm font-mono font-bold text-blue-400 bg-blue-900/20 px-4 py-2 rounded-full border border-blue-800/50 shadow-sm">
                            {totalMonthlyHours}h
                        </span>
                    )}
                </div>

                {/* Annual Progress (Simple Bar) */}
                <div className="border-t border-stone-800 pt-4 mt-2">
                    <div className="flex justify-between items-end mb-2">
                         <span className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                             <span className="text-sm">🌍</span> Anuales
                         </span>
                         <span className="text-xs font-mono text-stone-500">{annualCompletedCount}/{annualTotalCount}</span>
                    </div>
                    <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-stone-300 transition-all duration-1000" 
                            style={{ width: `${annualProgress}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        )}

        {/* Task List (Monthly) */}
        <div className="mb-8">
            {renderTaskList(sortedTasks, false)}
        </div>

        {/* Annual Tasks Section */}
        {(sortedAnnualTasks.length > 0 || isEditing) && (
            <div className="border-t border-stone-800 pt-8">
                <h2 className="text-xl font-bold text-stone-300 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🌍</span> Trenes Anuales
                </h2>
                {!isEditing && <p className="text-xs text-stone-500 mb-4 px-1">Estas tareas solo se reinician al finalizar el año.</p>}
                {renderTaskList(sortedAnnualTasks, true)}
            </div>
        )}
      </div>

      {/* Subtasks Modal - Changed from absolute to fixed */}
      {activeTaskId && activeTask && !isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <div className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden flex flex-col max-h-[80vh]">
                 <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-800/50">
                     <div>
                        <h3 className="font-bold text-stone-200 text-lg truncate pr-4">{parseTrainInfo(activeTask.text).name}</h3>
                        <p className="text-xs text-stone-500">Subtareas del vagón</p>
                     </div>
                     <button onClick={() => setActiveTaskId(null)} className="p-1 hover:bg-stone-700 rounded-full">
                         <X className="w-6 h-6 text-stone-400" />
                     </button>
                 </div>
                 
                 <div className="p-4 flex-1 overflow-y-auto">
                    <div className="space-y-2 mb-4">
                        {(!activeTask.subtasks || activeTask.subtasks.length === 0) && (
                            <p className="text-center text-stone-600 py-2 italic text-sm">Añade pasos para completar este tren.</p>
                        )}
                        {activeTask.subtasks?.map((sub) => (
                            <div
                                key={sub.id}
                                className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                                sub.completed
                                    ? 'bg-stone-800/50 border-stone-800'
                                    : 'bg-stone-950 border-stone-800'
                                }`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <button
                                        onClick={() => toggleSubtask(sub.id)}
                                        className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                        sub.completed
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'border-stone-600 hover:border-blue-400'
                                        }`}
                                    >
                                        {sub.completed && <Check className="w-3 h-3 text-white" />}
                                    </button>
                                    <span
                                        className={`truncate text-sm ${
                                        sub.completed ? 'line-through text-stone-500' : 'text-stone-300'
                                        }`}
                                    >
                                        {sub.text}
                                    </span>
                                </div>
                                <button
                                    onClick={() => deleteSubtask(sub.id)}
                                    className="text-stone-600 hover:text-red-400 p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2 mt-auto pt-2 border-t border-stone-800">
                        <input
                        type="text"
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        placeholder="Nueva subtarea..."
                        className="flex-1 px-3 py-2 rounded-lg border border-stone-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-stone-950 text-stone-200 placeholder-stone-600 text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                        />
                        <button
                        onClick={addSubtask}
                        className="bg-blue-700 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
                        >
                        <Plus className="w-5 h-5" />
                        </button>
                    </div>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};