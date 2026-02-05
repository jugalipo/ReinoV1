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

  // --- EDIT MODE FUNCTIONS ---

  const handleTextChange = (id: string, newText: string, isAnnual: boolean) => {
      if (isAnnual) {
          onUpdateAnnual(annualTasks.map(t => t.id === id ? { ...t, text: newText } : t));
      } else {
          onUpdate(tasks.map(t => t.id === id ? { ...t, text: newText } : t));
      }
  };

  const initiateDeleteTask = (id: string, isAnnual: boolean) => {
      setTaskToDelete({ id, isAnnual });
  };

  const confirmDeleteTask = () => {
      if (!taskToDelete) return;
      
      const { id, isAnnual } = taskToDelete;
      
      if (isAnnual) {
          onUpdateAnnual(annualTasks.filter(t => t.id !== id));
      } else {
          onUpdate(tasks.filter(t => t.id !== id));
      }
      
      setTaskToDelete(null);
  };

  const initiateAddTask = (isAnnual: boolean) => {
      setAddingTaskType(isAnnual ? 'annual' : 'monthly');
      setNewTaskText('');
  };

  const confirmAddTask = () => {
      if (!newTaskText.trim()) return;

      const newTask: Task = {
          id: Date.now().toString(),
          text: newTaskText,
          completed: false,
          subtasks: []
      };

      if (addingTaskType === 'annual') {
          onUpdateAnnual([...annualTasks, newTask]);
      } else {
          onUpdate([...tasks, newTask]);
      }
      
      setAddingTaskType(null);
      setNewTaskText('');
  };

  // --- SUBTASK FUNCTIONS ---

  const addSubtask = () => {
    if (!newSubtask.trim() || !activeTaskId) return;

    // Check Annuals
    if (activeTaskId.startsWith('annual-')) {
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

    if (activeTaskId.startsWith('annual-')) {
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

    if (activeTaskId.startsWith('annual-')) {
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

  const renderTaskList = (list: Task[], isAnnual: boolean) => (
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
                        {isEditing ? (
                            <input 
                                type="text"
                                value={task.text}
                                onChange={(e) => handleTextChange(task.id, e.target.value, isAnnual)}
                                className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 text-stone-200 focus:outline-none focus:border-blue-500"
                            />
                        ) : (
                            <>
                                <span className={`block font-bold text-lg truncate ${task.completed ? 'line-through text-stone-500' : 'text-stone-200'}`}>
                                    {name}
                                </span>
                                {task.subtasks && task.subtasks.length > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-stone-500 mt-1">
                                        <CornerDownRight className="w-3 h-3" />
                                        {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Right Side: Delete in Edit Mode, Info in View Mode */}
                    <div className="flex items-center gap-3">
                         {isEditing ? (
                             <button 
                                onClick={(e) => { e.stopPropagation(); initiateDeleteTask(task.id, isAnnual); }}
                                className="p-2 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-900/50"
                             >
                                 <Trash2 className="w-5 h-5" />
                             </button>
                         ) : (
                            <>
                                {duration && (
                                    <span className="flex items-center gap-1 text-xs font-mono font-bold text-stone-400 bg-stone-800 px-3 py-1.5 rounded-full border border-stone-700">
                                        {duration}
                                    </span>
                                )}
                                <ChevronRight className="w-5 h-5 text-stone-600" />
                            </>
                         )}
                    </div>
                </div>
              );
            })}
             
             {/* ADD TASK BUTTON (Only in Edit Mode) */}
             {isEditing && (
                 <button 
                    onClick={() => initiateAddTask(isAnnual)}
                    className="w-full py-3 border-2 border-dashed border-stone-700 rounded-2xl flex items-center justify-center gap-2 text-stone-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-stone-900 transition-all"
                 >
                     <Plus className="w-5 h-5" />
                     <span>Añadir Tarea {isAnnual ? 'Anual' : 'Mensual'}</span>
                 </button>
             )}

             {list.length === 0 && !isEditing && <p className="text-center text-stone-600 py-4">Sin tareas.</p>}
        </div>
  );

  return (
    <div className="flex flex-col h-full bg-blue-950/20 relative">
      <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between sticky top-0 z-10 border-b border-stone-800">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full">
            <ArrowLeft className="w-6 h-6 text-blue-400" />
            </button>
            <h1 className="text-xl font-bold text-blue-100">Trenes</h1>
        </div>
        
        <button 
            onClick={() => setIsEditing(!isEditing)} 
            className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-blue-600 text-white' : 'hover:bg-stone-800 text-blue-400'}`}
        >
            {isEditing ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto pb-12">
        {/* Train Visualization (Hidden when Editing to reduce clutter) */}
        {!isEditing && (
            <div className="mb-8 p-6 bg-stone-900 rounded-2xl shadow-sm border border-blue-900/50">
                {/* Monthly Progress (Train) */}
                <div className="relative h-24 flex items-center">
                    {/* Track */}
                    <div className="absolute w-full h-3 bg-stone-800 rounded-full overflow-hidden">
                        <div className="w-full h-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, #475569 50%)', backgroundSize: '20px 100%' }}></div>
                    </div>
                    
                    {/* Station at end */}
                    <div className="absolute right-0 -top-6 flex flex-col items-center">
                        <div className="bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded mb-1 border border-blue-700">Estación</div>
                        <div className="w-4 h-12 bg-stone-700 rounded"></div>
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
                <p className="text-center text-blue-400/60 mt-2 text-sm mb-6">
                    {completedCount} de {totalCount} vagones cargados
                </p>

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

      {/* Add Task Modal */}
      {addingTaskType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-800/50">
                     <h3 className="font-bold text-stone-200 text-lg">
                        {addingTaskType === 'annual' ? 'Nueva Tarea Anual' : 'Nueva Tarea Mensual'}
                     </h3>
                     <button onClick={() => setAddingTaskType(null)} className="p-1 hover:bg-stone-700 rounded-full">
                         <X className="w-6 h-6 text-stone-400" />
                     </button>
                </div>
                
                <div className="p-6">
                    <div className="mb-6">
                         <input
                             autoFocus
                             type="text"
                             value={newTaskText}
                             onChange={(e) => setNewTaskText(e.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && confirmAddTask()}
                             placeholder="Escribe el nombre de la tarea..."
                             className="w-full bg-stone-950 border border-stone-700 rounded-xl p-4 text-stone-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                         />
                         <p className="text-xs text-stone-500 mt-2">Puedes añadir duración (ej: 30') o iconos al nombre.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 w-full">
                        <button 
                            onClick={() => setAddingTaskType(null)}
                            className="py-3 rounded-xl border border-stone-700 text-stone-400 hover:bg-stone-800 font-bold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmAddTask}
                            className="py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                        >
                            Añadir
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4 border border-red-600/50">
                        <Trash2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-100 mb-2">¿Borrar tarea?</h2>
                    <p className="text-stone-400 mb-6 text-sm">
                        Esta acción no se puede deshacer.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 w-full">
                        <button 
                            onClick={() => setTaskToDelete(null)}
                            className="py-3 rounded-xl border border-stone-700 text-stone-400 hover:bg-stone-800 font-bold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmDeleteTask}
                            className="py-3 rounded-xl bg-red-600 text-stone-950 font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                        >
                            Borrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

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