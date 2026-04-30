import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { ArrowLeft, Train, Plus, Check, Trash2, ChevronRight, CornerDownRight, X, Edit2, Save } from 'lucide-react';
import { useModalHistory } from '../hooks/useModalHistory';

interface TrainViewProps {
  tasks: Task[];
  annualTasks: Task[];
  onUpdate: (tasks: Task[]) => void;
  onUpdateAnnual: (tasks: Task[]) => void;
  onBack: () => void;
  reminderDismissedToday: boolean;
  onDismissReminder: () => void;
}

export const TrainView: React.FC<TrainViewProps> = ({ tasks, annualTasks, onUpdate, onUpdateAnnual, onBack, reminderDismissedToday, onDismissReminder }) => {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [showAnnualReminder, setShowAnnualReminder] = useState(!reminderDismissedToday);
  const [newSubtask, setNewSubtask] = useState('');
  const [subtaskToDelete, setSubtaskToDelete] = useState<{ id: string, text: string } | null>(null);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editMonthlyTasks, setEditMonthlyTasks] = useState<Task[]>([]);
  const [editAnnualTasks, setEditAnnualTasks] = useState<Task[]>([]);
  const [activeFilter, setActiveFilter] = useState<'star' | 'foot' | null>(null);

  // --- MOBILE BACK BUTTON SUPPORT FOR MODALS ---
  useModalHistory(isEditing, () => setIsEditing(false));
  useModalHistory(!!activeTaskId, () => setActiveTaskId(null));
  useModalHistory(!!subtaskToDelete, () => setSubtaskToDelete(null));
  // ---------------------------------------------

  const tasksToText = (taskList: Task[]) => {
      return taskList.map(t => {
          let text = t.text;
          if (t.subtasks && t.subtasks.length > 0) {
              const fixedSubtasks = t.subtasks.filter(s => !s.isProvisional);
              if (fixedSubtasks.length > 0) {
                  text += '\n' + fixedSubtasks.map(s => s.text).join('\n');
              }
          }
          return text;
      }).join('\n');
  };

  const textToTasks = (text: string, existingTasks: Task[], phase?: 'Fase 1' | 'Fase 2' | 'Fase 3' | 'Fase 4'): Task[] => {
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
                  subtasks: existing?.subtasks?.filter(s => s.isProvisional) || [],
                  phase: (phase || existing?.phase || 'Fase 1') as 'Fase 1' | 'Fase 2' | 'Fase 3' | 'Fase 4'
              };
              newTasks.push(currentTask);
          } else {
              if (currentTask) {
                  const oldTask = existingTasks.find(t => t.text === currentTask!.text);
                  const existingSub = oldTask?.subtasks?.find(s => s.text === line && !s.isProvisional);
                  
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
                      subtasks: existing?.subtasks?.filter(s => s.isProvisional) || [],
                      phase: (phase || existing?.phase || 'Fase 1') as 'Fase 1' | 'Fase 2' | 'Fase 3' | 'Fase 4'
                  };
                  newTasks.push(currentTask);
              }
          }
      }
      return newTasks;
  };

  const handleEditToggle = () => {
      if (isEditing) {
          onUpdate(editMonthlyTasks);
          onUpdateAnnual(editAnnualTasks);
          setIsEditing(false);
      } else {
          setEditMonthlyTasks(JSON.parse(JSON.stringify(tasks))); // Deep copy — IDs stay stable
          setEditAnnualTasks(JSON.parse(JSON.stringify(annualTasks)));
          setIsEditing(true);
      }
  };
  
  // Custom Delete Confirmation State
  const [taskToDelete, setTaskToDelete] = useState<{ id: string, isAnnual: boolean } | null>(null);

  // Custom Add Task State
  const [addingTaskType, setAddingTaskType] = useState<'monthly' | 'annual' | null>(null);
  const [newTaskText, setNewTaskText] = useState('');

  // Monthly Stats
  let completedSubtasksCount = 0;
  let totalSubtasksCount = 0;
  
  tasks.forEach(task => {
      const subs = task.subtasks || [];
      if (subs.length > 0) {
          totalSubtasksCount += subs.length;
          completedSubtasksCount += subs.filter(s => s.completed).length;
      } else {
          totalSubtasksCount += 1;
          completedSubtasksCount += task.completed ? 1 : 0;
      }
  });

  const progress = totalSubtasksCount === 0 ? 0 : (completedSubtasksCount / totalSubtasksCount) * 100;

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
        const updated = annualTasks.map((t) => {
            if (t.id === id) {
                const newCompleted = !t.completed;
                return {
                    ...t,
                    completed: newCompleted,
                    subtasks: t.subtasks?.map(s => ({ ...s, completed: newCompleted })) || []
                };
            }
            return t;
        });
        onUpdateAnnual(updated);
    } else {
        const updated = tasks.map((t) => {
            if (t.id === id) {
                const newCompleted = !t.completed;
                return {
                    ...t,
                    completed: newCompleted,
                    subtasks: t.subtasks?.map(s => ({ ...s, completed: newCompleted })) || []
                };
            }
            return t;
        });
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
                            completed: false,
                            isProvisional: true
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
                            completed: false,
                            isProvisional: true
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

  const toggleSubtask = (taskId: string, subId: string, isAnnual: boolean) => {
    if (isAnnual) {
        const updated = annualTasks.map(t => {
            if (t.id === taskId && t.subtasks) {
                const newSubtasks = t.subtasks.map(s => 
                    s.id === subId ? { ...s, completed: !s.completed } : s
                );
                const allCompleted = newSubtasks.length > 0 && newSubtasks.every(s => s.completed);
                return {
                    ...t,
                    completed: allCompleted,
                    subtasks: newSubtasks
                };
            }
            return t;
        });
        onUpdateAnnual(updated);
    } else {
        const updated = tasks.map(t => {
            if (t.id === taskId && t.subtasks) {
                const newSubtasks = t.subtasks.map(s => 
                    s.id === subId ? { ...s, completed: !s.completed } : s
                );
                const allCompleted = newSubtasks.length > 0 && newSubtasks.every(s => s.completed);
                return {
                    ...t,
                    completed: allCompleted,
                    subtasks: newSubtasks
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

  const getFilteredTasks = (taskList: Task[], emoji: string) => {
    return taskList.map(task => {
      const taskHasEmoji = task.text.includes(emoji);
      const matchingSubtasks = task.subtasks?.filter(s => s.text.includes(emoji)) || [];
      
      if (taskHasEmoji || matchingSubtasks.length > 0) {
        return {
          ...task,
          subtasks: matchingSubtasks
        };
      }
      return null;
    }).filter(Boolean) as Task[];
  };

  const currentMonthlyTasks = activeFilter === 'star' ? getFilteredTasks(sortedTasks, '⭐') : activeFilter === 'foot' ? getFilteredTasks(sortedTasks, '🦶') : sortedTasks;
  const currentAnnualTasks = activeFilter === 'star' ? getFilteredTasks(sortedAnnualTasks, '⭐') : activeFilter === 'foot' ? getFilteredTasks(sortedAnnualTasks, '🦶') : sortedAnnualTasks;

  const renderSubtaskItem = (taskId: string, sub: any, isAnnual: boolean) => (
    <div
        key={sub.id}
        className={`flex items-center justify-between p-4 rounded-2xl border transition-all mb-2 ${
        sub.completed
            ? 'bg-stone-900/40 border-stone-800 opacity-60'
            : 'bg-stone-900 border-stone-800 hover:border-stone-700 shadow-sm'
        }`}
        onClick={() => toggleSubtask(taskId, sub.id, isAnnual)}
    >
        <div className="flex items-center gap-4 overflow-hidden">
            <div
                className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                sub.completed
                    ? 'bg-stone-700 border-stone-700 text-stone-400'
                    : 'border-stone-600 hover:border-blue-400'
                }`}
            >
                {sub.completed && <Check className="w-3.5 h-3.5" />}
            </div>
            <span
                className={`font-bold text-lg ${
                sub.completed ? 'line-through text-stone-500' : 'text-stone-200'
                }`}
            >
                {sub.text}
            </span>
        </div>
    </div>
  );

  const renderTaskList = (list: Task[], isAnnual: boolean) => {
      if (activeFilter && !isEditing) {
          const emoji = activeFilter === 'star' ? '⭐' : '🦶';
          const allSubtasks: Array<{taskId: string, sub: any}> = [];
          list.forEach(task => {
              task.subtasks?.forEach(sub => {
                  if (sub.text.includes(emoji)) {
                      allSubtasks.push({ taskId: task.id, sub });
                  }
              });
          });

          if (allSubtasks.length === 0) return <p className="text-center text-stone-600 py-4 italic">No hay subtareas con este emoji.</p>;

          return (
              <div className="space-y-1">
                  {allSubtasks
                      .sort((a, b) => Number(a.sub.completed) - Number(b.sub.completed))
                      .map(item => renderSubtaskItem(item.taskId, item.sub, isAnnual))}
              </div>
          );
      }

      if (isEditing && isAnnual) {
          return (
              <div className="w-full space-y-4">
                  {editAnnualTasks.map((task, index) => (
                      <div key={task.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col gap-4 relative">
                          <button 
                              onClick={() => setTaskToDelete({ id: task.id, isAnnual: true })}
                              className="absolute top-4 right-4 p-2 text-stone-600 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-colors"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>

                          <div className="flex-1 pr-12">
                              <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1 block">Título</label>
                              <input 
                                  value={task.text}
                                  onChange={(e) => {
                                      const updated = [...editAnnualTasks];
                                      updated[index] = { ...updated[index], text: e.target.value };
                                      setEditAnnualTasks(updated);
                                  }}
                                  placeholder="Ej: 🌍 Viajar a Japón"
                                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-200 focus:outline-none focus:border-blue-500 font-bold"
                              />
                          </div>
                          
                          <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2 block">Repetidor (Meses)</label>
                              <div className="flex flex-wrap gap-1.5">
                                  {['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, mIdx) => {
                                      const isSelected = task.repeaterMonths?.includes(mIdx);
                                      return (
                                          <button
                                              key={mIdx}
                                              onClick={() => {
                                                  const updated = [...editAnnualTasks];
                                                  const currMonths = task.repeaterMonths || [];
                                                  if (isSelected) {
                                                      updated[index] = { ...updated[index], repeaterMonths: currMonths.filter(x => x !== mIdx) };
                                                  } else {
                                                      updated[index] = { ...updated[index], repeaterMonths: [...currMonths, mIdx].sort((a,b)=>a-b) };
                                                  }
                                                  setEditAnnualTasks(updated);
                                              }}
                                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all border ${
                                                  isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'bg-stone-950 border-stone-800 text-stone-500 hover:border-stone-600'
                                              }`}
                                          >
                                              {m}
                                          </button>
                                      );
                                  })}
                              </div>
                          </div>

                          <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2 block">Subtareas</label>
                              <div className="space-y-2">
                                  {(task.subtasks || []).map((sub, sIdx) => (
                                      <div key={sub.id} className="flex gap-2 items-center">
                                          <input 
                                              value={sub.text}
                                              onChange={(e) => {
                                                  const updated = [...editAnnualTasks];
                                                  const subs = [...(updated[index].subtasks || [])];
                                                  subs[sIdx] = { ...subs[sIdx], text: e.target.value };
                                                  updated[index].subtasks = subs;
                                                  setEditAnnualTasks(updated);
                                              }}
                                              className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-3 py-1.5 text-stone-300 text-sm focus:outline-none focus:border-blue-500"
                                          />
                                          <button 
                                              onClick={() => {
                                                  const updated = [...editAnnualTasks];
                                                  updated[index].subtasks = updated[index].subtasks?.filter(s => s.id !== sub.id);
                                                  setEditAnnualTasks(updated);
                                              }}
                                              className="p-1.5 text-red-500 hover:bg-red-900/20 rounded-lg transition-colors"
                                          >
                                              <X className="w-4 h-4" />
                                          </button>
                                      </div>
                                  ))}
                                  <div className="flex gap-2">
                                      <input 
                                          placeholder="Nueva subtarea..."
                                          onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                  const val = e.currentTarget.value;
                                                  if (!val.trim()) return;
                                                  const updated = [...editAnnualTasks];
                                                  updated[index].subtasks = [...(updated[index].subtasks || []), { id: `new-sub-${Date.now()}-${Math.random()}`, text: val, completed: false, isProvisional: false }];
                                                  setEditAnnualTasks(updated);
                                                  e.currentTarget.value = '';
                                              }
                                          }}
                                          className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-3 py-1.5 text-stone-400 text-sm focus:outline-none focus:border-blue-500"
                                      />
                                  </div>
                                  <p className="text-[10px] text-stone-600">Añade 🦶 para Passeggiata o ⭐ para Locomotora.</p>
                              </div>
                          </div>
                      </div>
                  ))}
                  
                  <button 
                      onClick={() => {
                          setEditAnnualTasks([...editAnnualTasks, {
                              id: `annual-${Date.now()}`,
                              text: '🚂 Nuevo Tren',
                              completed: false,
                              subtasks: [],
                              repeaterMonths: []
                          }]);
                      }}
                      className="w-full py-4 border-2 border-dashed border-stone-700 hover:border-blue-500 hover:text-blue-400 text-stone-500 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors font-bold uppercase tracking-widest text-xs"
                  >
                      <Plus className="w-5 h-5" />
                      Añadir Tren Anual
                  </button>
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
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                // In filtered mode, we toggle the task in the ORIGINAL list by ID
                                toggleTask(task.id, isAnnual); 
                            }}
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
                            <div className="mt-2 w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-green-500 transition-all duration-300" 
                                    style={{ width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` }}
                                />
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
    <div className="fixed inset-0 max-w-md mx-auto z-50 bg-stone-950 flex flex-col animate-in fade-in duration-200">

      {/* Daily Annual Train Reminder Modal */}
      {showAnnualReminder && (() => {
        const nextAnnual = [...annualTasks].find(t => !t.completed);
        if (!nextAnnual) return null;
        return (
          <div className="absolute inset-0 z-[200] flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-stone-900 border border-blue-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-5">
              {/* Icon + title */}
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center border border-blue-500/40 shadow-[0_0_24px_rgba(59,130,246,0.2)]">
                  <span className="text-3xl">🎯</span>
                </div>
                <h2 className="text-xl font-black text-stone-100 tracking-tight uppercase italic">Tren Anual del Día</h2>
                <p className="text-stone-400 text-sm leading-relaxed">Dedica al menos <span className="text-blue-400 font-bold">3 minutos</span> a este tren antes de continuar.</p>
              </div>

              {/* Annual train card */}
              <div className="bg-stone-950 border border-stone-800 rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-2 h-10 bg-stone-200 rounded-full flex-shrink-0" />
                <span className="text-stone-100 font-bold text-base leading-snug">{nextAnnual.text}</span>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { onDismissReminder(); setShowAnnualReminder(false); }}
                  className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-base uppercase tracking-wider hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/30 active:scale-95"
                >
                  ¡Hecho!
                </button>
                <button
                  onClick={onBack}
                  className="w-full py-3 rounded-2xl bg-stone-800 text-stone-400 font-bold text-sm hover:bg-stone-700 hover:text-stone-300 transition-all active:scale-95"
                >
                  Todavía no
                </button>
              </div>
            </div>
          </div>
        );
      })()}
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
                {/* Monthly Progress Information Bullets (Above the SVG) */}
                <div className="flex justify-center flex-wrap gap-2 mb-4">
                    {/* Month Bullet */}
                    <div className="bg-stone-950 text-blue-400 text-xs font-black px-4 py-2 rounded-full border border-stone-800 shadow-sm uppercase tracking-widest">
                        {new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date())}
                    </div>

                    {/* Progress Percentage Bullet */}
                    <div className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-full shadow-lg border border-blue-400">
                        {Math.round(progress)}%
                    </div>

                    {/* Hours Bullet */}
                    {totalMonthlyHours >= 0 && (
                        <div className="bg-blue-900/20 text-blue-400 text-xs font-black px-4 py-2 rounded-full border border-blue-800/50 shadow-sm">
                            {totalMonthlyHours}h
                        </div>
                    )}
                </div>

                {/* Monthly Progress (Zigzag) */}
                <div className="relative w-full py-4 pt-4">
                    <svg viewBox="0 0 400 120" className="w-full h-auto overflow-visible drop-shadow-2xl">
                        {/* Background Path (Track) - INVERTED */}
                        <path 
                            d="M 380 60 H 350 V 100 H 300 V 20 H 250 V 100 H 200 V 20 H 150 V 100 H 100 V 20 H 50 V 60 H 20" 
                            fill="none" 
                            stroke="#262626" 
                            strokeWidth="14" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            className="opacity-100"
                        />
                        {/* Progress Path (Illuminated Track) - INVERTED */}
                        <path 
                            d="M 380 60 H 350 V 100 H 300 V 20 H 250 V 100 H 200 V 20 H 150 V 100 H 100 V 20 H 50 V 60 H 20" 
                            fill="none" 
                            stroke="url(#progressGradient)" 
                            strokeWidth="14" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            strokeDasharray="1000"
                            strokeDashoffset={1000 - (1000 * (progress / 100))}
                            className="transition-all duration-1000 ease-in-out"
                            style={{ filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.4))' }}
                        />
                        {/* Gradient Definition */}
                        <defs>
                            <linearGradient id="progressGradient" x1="100%" y1="0%" x2="0%" y2="0%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#60a5fa" />
                            </linearGradient>
                        </defs>

                        {/* Icons - INVERTED POSITION */}
                        <g transform="translate(380, 48)">
                            <text x="-5" y="28" className="text-4xl select-none">🚂</text>
                        </g>
                        <g transform="translate(0, 48)">
                            <text x="0" y="28" className="text-4xl select-none">🏠</text>
                        </g>
                    </svg>
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

        {/* Next Annual Train Highlight */}
        {!isEditing && sortedAnnualTasks.find(t => !t.completed) && (
            <div className="mb-6 bg-stone-900 rounded-2xl p-4 border border-indigo-500/30 shadow-lg shadow-indigo-500/5">
                <h3 className="text-xs font-bold text-indigo-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span>🎯</span> Próximo Tren Anual
                </h3>
                {renderTaskList([sortedAnnualTasks.find(t => !t.completed)!], true)}
            </div>
        )}

        {/* Emoji Grouping Buttons */}
        {!isEditing && (
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveFilter(activeFilter === 'star' ? null : 'star')}
                    className={`flex-1 py-3 rounded-2xl border transition-all flex items-center justify-center gap-2 font-bold ${
                        activeFilter === 'star' 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/10' 
                        : 'bg-stone-900 border-stone-800 text-stone-500 hover:border-stone-700'
                    }`}
                >
                    <span className="text-xl">⭐</span>
                    <span className="text-xs uppercase tracking-widest">Locomotora</span>
                </button>
                <button
                    onClick={() => setActiveFilter(activeFilter === 'foot' ? null : 'foot')}
                    className={`flex-1 py-3 rounded-2xl border transition-all flex items-center justify-center gap-2 font-bold ${
                        activeFilter === 'foot' 
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/10' 
                        : 'bg-stone-900 border-stone-800 text-stone-500 hover:border-stone-700'
                    }`}
                >
                    <span className="text-xl">🦶</span>
                    <span className="text-xs uppercase tracking-widest">Passeggiata</span>
                </button>
            </div>
        )}

        {/* Task List (Monthly) */}
        <div className="mb-8">
            {isEditing ? (
                <div className="space-y-8">
                    {(['Fase 1', 'Fase 2', 'Fase 3', 'Fase 4'] as const).map((phase) => {
                        const phaseLabels: Record<string, string> = {
                            'Fase 1': 'Arranque',
                            'Fase 2': 'Alternancias',
                            'Fase 3': 'Mantenimiento',
                            'Fase 4': 'Cierre'
                        };
                        const phaseTasks = editMonthlyTasks.filter(t => (t.phase || 'Fase 1') === phase);
                        return (
                            <div key={phase}>
                                <h3 className="text-sm font-bold text-blue-400 mb-3 uppercase tracking-wider">{phase}: {phaseLabels[phase]}</h3>
                                <div className="space-y-3">
                                    {phaseTasks.map((task) => {
                                        const taskIdx = editMonthlyTasks.findIndex(t => t.id === task.id);
                                        const fixedSubtasks = (task.subtasks || []).filter(s => !s.isProvisional);
                                        const provisionalCount = (task.subtasks || []).filter(s => s.isProvisional).length;
                                        return (
                                            <div key={task.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col gap-3 relative">
                                                <button
                                                    onClick={() => setTaskToDelete({ id: task.id, isAnnual: false })}
                                                    className="absolute top-4 right-4 p-2 text-stone-600 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>

                                                {/* Train name */}
                                                <div className="pr-12">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1 block">Nombre del Tren</label>
                                                    <input
                                                        value={task.text}
                                                        onChange={(e) => {
                                                            const updated = [...editMonthlyTasks];
                                                            updated[taskIdx] = { ...updated[taskIdx], text: e.target.value };
                                                            setEditMonthlyTasks(updated);
                                                        }}
                                                        placeholder="Ej: 🦁 Leones 2h"
                                                        className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-200 focus:outline-none focus:border-blue-500 font-bold"
                                                    />
                                                </div>

                                                {/* Phase selector */}
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2 block">Fase</label>
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {(['Fase 1', 'Fase 2', 'Fase 3', 'Fase 4'] as const).map((p) => (
                                                            <button
                                                                key={p}
                                                                onClick={() => {
                                                                    const updated = [...editMonthlyTasks];
                                                                    updated[taskIdx] = { ...updated[taskIdx], phase: p };
                                                                    setEditMonthlyTasks(updated);
                                                                }}
                                                                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                                                                    (task.phase || 'Fase 1') === p
                                                                        ? 'bg-blue-600 border-blue-500 text-white'
                                                                        : 'bg-stone-950 border-stone-800 text-stone-500 hover:border-stone-600'
                                                                }`}
                                                            >
                                                                {p}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Fixed subtasks */}
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2 block">Subtareas Fijas</label>
                                                    <div className="space-y-2">
                                                        {fixedSubtasks.map((sub) => {
                                                            const subIdx = (editMonthlyTasks[taskIdx].subtasks || []).findIndex(s => s.id === sub.id);
                                                            return (
                                                                <div key={sub.id} className="flex gap-2 items-center">
                                                                    <input
                                                                        value={sub.text}
                                                                        onChange={(e) => {
                                                                            const updated = [...editMonthlyTasks];
                                                                            const subs = [...(updated[taskIdx].subtasks || [])];
                                                                            subs[subIdx] = { ...subs[subIdx], text: e.target.value };
                                                                            updated[taskIdx] = { ...updated[taskIdx], subtasks: subs };
                                                                            setEditMonthlyTasks(updated);
                                                                        }}
                                                                        className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-3 py-1.5 text-stone-300 text-sm focus:outline-none focus:border-blue-500"
                                                                    />
                                                                    <button
                                                                        onClick={() => {
                                                                            const updated = [...editMonthlyTasks];
                                                                            updated[taskIdx] = {
                                                                                ...updated[taskIdx],
                                                                                subtasks: updated[taskIdx].subtasks?.filter(s => s.id !== sub.id)
                                                                            };
                                                                            setEditMonthlyTasks(updated);
                                                                        }}
                                                                        className="p-1.5 text-red-500 hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                        {/* Add fixed subtask */}
                                                        <input
                                                            placeholder="Nueva subtarea fija (Enter para añadir)..."
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const val = e.currentTarget.value.trim();
                                                                    if (!val) return;
                                                                    const updated = [...editMonthlyTasks];
                                                                    updated[taskIdx] = {
                                                                        ...updated[taskIdx],
                                                                        subtasks: [...(updated[taskIdx].subtasks || []), {
                                                                            id: `sub-${Date.now()}-${Math.random()}`,
                                                                            text: val,
                                                                            completed: false,
                                                                            isProvisional: false
                                                                        }]
                                                                    };
                                                                    setEditMonthlyTasks(updated);
                                                                    e.currentTarget.value = '';
                                                                }
                                                            }}
                                                            className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-1.5 text-stone-400 text-sm focus:outline-none focus:border-blue-500"
                                                        />
                                                        <p className="text-[10px] text-stone-600">Añade 🦶 para Passeggiata o ⭐ para Locomotora.</p>
                                                        {provisionalCount > 0 && (
                                                            <p className="text-[10px] text-indigo-400/70">
                                                                {provisionalCount} subtarea{provisionalCount > 1 ? 's' : ''} provisional{provisionalCount > 1 ? 'es' : ''} (se borran al resetear el mes).
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Add train to this phase */}
                                    <button
                                        onClick={() => {
                                            setEditMonthlyTasks(prev => [...prev, {
                                                id: `monthly-${Date.now()}-${Math.random()}`,
                                                text: '🚂 Nuevo Tren',
                                                completed: false,
                                                subtasks: [],
                                                phase
                                            }]);
                                        }}
                                        className="w-full py-3 border-2 border-dashed border-stone-700 hover:border-blue-500 hover:text-blue-400 text-stone-500 rounded-2xl flex items-center justify-center gap-2 transition-colors font-bold uppercase tracking-widest text-xs"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Añadir Tren a {phase}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : activeFilter ? (
                <div className="mb-6">
                    {renderTaskList(currentMonthlyTasks, false)}
                </div>
            ) : (
                <>
                    {['Fase 1', 'Fase 2', 'Fase 3', 'Fase 4'].map((phaseCode) => {
                        const phaseTasks = currentMonthlyTasks.filter(t => !t.completed && (t.phase || 'Fase 1') === phaseCode);
                        if (phaseTasks.length === 0) return null;
                        const titles = {
                            'Fase 1': 'Fase 1: Arranque',
                            'Fase 2': 'Fase 2: Alternancias',
                            'Fase 3': 'Fase 3: Mantenimiento',
                            'Fase 4': 'Fase 4: Cierre'
                        };
                        return (
                            <div key={phaseCode} className="mb-6">
                                <h3 className="text-lg font-bold text-stone-400 mb-3 ml-1">{titles[phaseCode as keyof typeof titles]}</h3>
                                {renderTaskList(phaseTasks, false)}
                            </div>
                        );
                    })}
                    {(() => {
                        const completedTasks = currentMonthlyTasks.filter(t => t.completed);
                        if (completedTasks.length === 0) return null;
                        return (
                            <div className="mt-8 border-t border-stone-800 pt-6">
                                <h3 className="text-sm font-bold text-stone-500 mb-3 ml-1 uppercase tracking-wider">Completadas</h3>
                                {renderTaskList(completedTasks, false)}
                            </div>
                        );
                    })()}
                    {currentMonthlyTasks.length === 0 && <p className="text-center text-stone-600 py-4">Sin tareas.</p>}
                </>
            )}
        </div>

        {/* Annual Tasks Section */}
        {(currentAnnualTasks.length > 0 || isEditing) && (
            <div className="border-t border-stone-800 pt-8">
                <h2 className="text-xl font-bold text-stone-300 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🌍</span> Trenes Anuales
                </h2>
                {!isEditing && <p className="text-xs text-stone-500 mb-4 px-1">Estas tareas solo se reinician al finalizar el año.</p>}
                {renderTaskList(currentAnnualTasks, true)}
            </div>
        )}
      </div>

      {/* Subtasks Modal - Changed from absolute to fixed */}
      {activeTaskId && activeTask && !isEditing && (
        <div 
          className="fixed inset-0 max-w-md mx-auto z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setActiveTaskId(null)}
        >
             <div 
               className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden flex flex-col max-h-[80vh]"
               onClick={(e) => e.stopPropagation()}
             >
                 <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-800/50">
                     <div>
                        <h3 className="font-bold text-stone-200 text-lg truncate pr-4">{parseTrainInfo(activeTask.text).name}</h3>
                        <p className="text-xs text-stone-500">Cabinas del vagón</p>
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
                        {[...(activeTask.subtasks || [])]
                            .filter((sub) => {
                                if (!activeFilter) return true;
                                const emoji = activeFilter === 'star' ? '⭐' : '🦶';
                                return sub.text.includes(emoji);
                            })
                            .sort((a, b) => Number(a.completed) - Number(b.completed))
                            .map((sub) => (
                            <div
                                key={sub.id}
                                className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                                sub.completed
                                    ? 'bg-stone-800/50 border-stone-800'
                                    : sub.isProvisional ? 'bg-indigo-900/40 border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.1)]' : 'bg-stone-950 border-stone-800'
                                }`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <button
                                        onClick={() => toggleSubtask(activeTask.id, sub.id, annualTasks.some(t => t.id === activeTask.id))}
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
                                {sub.isProvisional && (
                                    <button
                                        onClick={() => setSubtaskToDelete({ id: sub.id, text: sub.text })}
                                        className="text-stone-600 hover:text-red-400 p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
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

      {/* Subtask Delete Confirmation Modal */}
      {subtaskToDelete && (
          <div 
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
              onClick={() => setSubtaskToDelete(null)}
          >
              <div 
                  className="bg-stone-900 border border-stone-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl scale-in-center"
                  onClick={(e) => e.stopPropagation()}
              >
                  <h3 className="text-lg font-bold text-stone-200 mb-2">¿Eliminar subtarea?</h3>
                  <p className="text-stone-400 text-sm mb-6">
                      Se borrará "<span className="text-stone-300 font-semibold">{subtaskToDelete.text}</span>". Esta acción no se puede deshacer.
                  </p>
                  <div className="flex gap-3">
                      <button
                          onClick={() => setSubtaskToDelete(null)}
                          className="flex-1 py-3 rounded-xl bg-stone-800 text-stone-300 font-bold hover:bg-stone-700 transition-colors"
                      >
                          Cancelar
                      </button>
                      <button
                          onClick={() => {
                              deleteSubtask(subtaskToDelete.id);
                              setSubtaskToDelete(null);
                          }}
                          className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                      >
                          Eliminar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Task Delete Confirmation Modal (Annual Trains) */}
      {taskToDelete && (
          <div 
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
              onClick={() => setTaskToDelete(null)}
          >
              <div 
                  className="bg-stone-900 border border-stone-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl scale-in-center"
                  onClick={(e) => e.stopPropagation()}
              >
                  <h3 className="text-lg font-bold text-stone-200 mb-2">
                      {taskToDelete.isAnnual ? '¿Eliminar Tren Anual?' : '¿Eliminar Tren Mensual?'}
                  </h3>
                  <p className="text-stone-400 text-sm mb-6">
                      {taskToDelete.isAnnual
                          ? 'Se borrará permanentemente este tren anual y sus subtareas. Esta acción no se puede deshacer.'
                          : 'Se borrará este tren mensual y sus subtareas fijas. Las subtareas provisionales también desaparecerán.'}
                  </p>
                  <div className="flex gap-3">
                      <button
                          onClick={() => setTaskToDelete(null)}
                          className="flex-1 py-3 rounded-xl bg-stone-800 text-stone-300 font-bold hover:bg-stone-700 transition-colors"
                      >
                          Cancelar
                      </button>
                      <button
                          onClick={() => {
                              if (taskToDelete.isAnnual) {
                                  setEditAnnualTasks(editAnnualTasks.filter(t => t.id !== taskToDelete.id));
                              } else {
                                  setEditMonthlyTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
                              }
                              setTaskToDelete(null);
                          }}
                          className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                      >
                          Eliminar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};