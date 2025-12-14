import React, { useState } from 'react';
import { Task } from '../types';
import { Sword, CheckCircle2, Edit2, Save, Plus, Trash2, X } from 'lucide-react';

interface DailyHunosProps {
  tasks: Task[];
  onUpdate: (tasks: Task[], isPleno?: boolean) => void;
}

export const DailyHunos: React.FC<DailyHunosProps> = ({ tasks, onUpdate }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Filter out the "GAP" tasks for calculations in View Mode
  const visibleTasks = tasks.filter(t => t.text !== 'GAP');
  const completedCount = visibleTasks.filter(t => t.completed).length;
  const progressPercent = visibleTasks.length > 0 ? (completedCount / visibleTasks.length) * 100 : 0;

  // --- VIEW MODE ACTIONS ---

  const toggleTask = (id: string) => {
    if (isEditing) return;

    // 1. Calculate the new state for the task
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const willBeCompleted = !task.completed;

    // 2. Create updated list simulation
    const simulatedTasks = tasks.map((t) =>
      t.id === id ? { ...t, completed: willBeCompleted, plenoCompleted: willBeCompleted } : t
    );

    // 3. Check for Pleno trigger (All tasks are now checked/plenoCompleted)
    if (willBeCompleted) {
        // Only check visible tasks for the Pleno trigger
        const allPleno = simulatedTasks.filter(t => t.text !== 'GAP').every(t => t.plenoCompleted);
        
        if (allPleno) {
            setPendingTaskId(id);
            setShowConfirmModal(true);
            return;
        }
    }

    onUpdate(simulatedTasks, false);
  };

  const handleConfirmPleno = () => {
      if (!pendingTaskId) return;

      // Apply the check AND reset all dots
      const updatedTasks = tasks.map(t => {
          const isTarget = t.id === pendingTaskId;
          const finalCompleted = isTarget ? true : t.completed;
          
          return {
              ...t,
              completed: finalCompleted,
              plenoCompleted: false // Reset dot
          };
      });

      onUpdate(updatedTasks, true); // Increment stat
      setShowConfirmModal(false);
      setPendingTaskId(null);
  };

  const handleCancelPleno = () => {
      setShowConfirmModal(false);
      setPendingTaskId(null);
  };

  // --- EDIT MODE ACTIONS ---

  const handleTextChange = (id: string, newText: string) => {
    const updated = tasks.map((t) => 
        t.id === id ? { ...t, text: newText } : t
    );
    onUpdate(updated, false);
  };

  const initiateAdd = () => {
      setIsAdding(true);
      setNewTaskText('');
  };

  const confirmAdd = () => {
    if (!newTaskText.trim()) return;

    const newTask: Task = {
        id: Date.now().toString(),
        text: newTaskText,
        completed: false,
        plenoCompleted: false
    };
    onUpdate([...tasks, newTask], false);
    setIsAdding(false);
    setNewTaskText('');
  };

  const initiateDelete = (id: string) => {
      setTaskToDelete(id);
  };

  const confirmDelete = () => {
      if (!taskToDelete) return;
      onUpdate(tasks.filter(t => t.id !== taskToDelete), false);
      setTaskToDelete(null);
  };

  const getEmoji = (text: string) => {
    // Regex to find the first emoji character in the string
    const match = text.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u);
    // If emoji found, return it. If not, return first 2 chars as fallback
    return match ? match[0] : text.substring(0, 2);
  };

  return (
    <div className="bg-stone-900 rounded-2xl shadow-sm p-6 w-full mt-6 border border-stone-800 relative">
      
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
            <Sword className="w-6 h-6 text-stone-400" />
            <h2 className="text-xl font-bold text-stone-200">Hunos</h2>
        </div>
        
        <div className="flex items-center gap-3">
             {!isEditing && (
                 <span className="text-sm font-mono text-stone-500">{completedCount}/{visibleTasks.length}</span>
             )}
             <button 
                onClick={() => setIsEditing(!isEditing)} 
                className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-stone-700 text-white' : 'hover:bg-stone-800 text-stone-500'}`}
            >
                {isEditing ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
            </button>
        </div>
      </div>

      {/* Progress Bar (Only visible when NOT editing) */}
      {!isEditing && (
        <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden mb-6">
            <div 
                className="h-full bg-blue-600 transition-all duration-300" 
                style={{ width: `${progressPercent}%` }}
            />
        </div>
      )}

      {/* VIEW MODE: GRID */}
      {!isEditing && (
        <div className="grid grid-cols-4 gap-3">
            {tasks.length === 0 && (
            <p className="col-span-4 text-stone-600 text-center italic py-4">Sin batallas planeadas.</p>
            )}
            {tasks.map((task, index) => {
            // Handle invisible gap to maintain grid structure
            if (task.text === 'GAP') {
                return <div key={task.id} className="aspect-square"></div>;
            }

            const emoji = getEmoji(task.text);
            const isFailed = task.failedYesterday && !task.completed;
            const isFirstRow = index < 4;
            const isLastSeven = index >= tasks.length - 7;

            return (
                <button
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    title={task.text} // Tooltip showing full text
                    className={`
                        aspect-square flex items-center justify-center text-3xl relative transition-all duration-300
                        border-2 ${isFirstRow ? 'rounded-full' : 'rounded-2xl'}
                        ${task.completed
                            ? 'bg-stone-950 border-stone-900 text-stone-700 grayscale opacity-50 shadow-inner scale-95'
                            : isFailed
                                ? 'bg-red-900/50 border-red-600 text-red-100 shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                                : isLastSeven 
                                    ? 'bg-transparent border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30' 
                                    : 'bg-stone-800 border-stone-700 text-stone-200 hover:border-stone-500 hover:bg-stone-700 shadow-sm'
                        }
                    `}
                >
                    <span className="drop-shadow-sm filter">{emoji}</span>

                    {/* Pleno Dot (Orange) - Top Right */}
                    {!task.plenoCompleted && (
                        <div className={`absolute w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.8)] animate-pulse ${isFirstRow ? 'top-1 right-1' : 'top-1.5 right-1.5'}`}></div>
                    )}
                </button>
            );
            })}
        </div>
      )}

      {/* EDIT MODE: LIST */}
      {isEditing && (
          <div className="space-y-3">
              {tasks.map((task) => (
                  <div key={task.id} className="flex gap-2">
                      <input 
                          type="text"
                          value={task.text}
                          onChange={(e) => handleTextChange(task.id, e.target.value)}
                          className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-stone-500"
                      />
                      <button 
                          onClick={() => initiateDelete(task.id)}
                          className="p-2 bg-stone-950 border border-stone-700 rounded-lg text-red-500 hover:bg-red-900/20"
                      >
                          <Trash2 className="w-5 h-5" />
                      </button>
                  </div>
              ))}
              
              <button 
                onClick={initiateAdd}
                className="w-full mt-4 py-3 border-2 border-dashed border-stone-700 rounded-xl flex items-center justify-center gap-2 text-stone-500 hover:text-stone-300 hover:border-stone-600 hover:bg-stone-800/50 transition-all"
              >
                 <Plus className="w-5 h-5" />
                 <span>Añadir Huno</span>
             </button>
          </div>
      )}

      {/* --- MODALS --- */}

      {/* Pleno Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-orange-900/30 rounded-full flex items-center justify-center mb-4 border border-orange-600/50">
                        <CheckCircle2 className="w-10 h-10 text-orange-500" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-100 mb-2">¡Pleno Diario!</h2>
                    <p className="text-stone-400 mb-6 text-sm">
                        Has completado todos los Hunos. ¿Quieres sumar +1 al contador y reiniciar los puntos naranjas?
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 w-full">
                        <button 
                            onClick={handleCancelPleno}
                            className="py-3 rounded-xl border border-stone-700 text-stone-400 hover:bg-stone-800 font-bold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConfirmPleno}
                            className="py-3 rounded-xl bg-orange-600 text-stone-950 font-bold hover:bg-orange-500 transition-colors shadow-lg shadow-orange-900/20"
                        >
                            ¡Sí, sumar +1!
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-800/50">
                     <h3 className="font-bold text-stone-200 text-lg">Nuevo Huno</h3>
                     <button onClick={() => setIsAdding(false)} className="p-1 hover:bg-stone-700 rounded-full">
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
                             onKeyDown={(e) => e.key === 'Enter' && confirmAdd()}
                             placeholder="Nombre de la tarea..."
                             className="w-full bg-stone-950 border border-stone-700 rounded-xl p-4 text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-500 text-lg"
                         />
                         <p className="text-xs text-stone-500 mt-2">Puedes escribir "GAP" para crear un espacio vacío.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 w-full">
                        <button 
                            onClick={() => setIsAdding(false)}
                            className="py-3 rounded-xl border border-stone-700 text-stone-400 hover:bg-stone-800 font-bold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmAdd}
                            className="py-3 rounded-xl bg-stone-200 text-stone-900 font-bold hover:bg-white transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4 border border-red-600/50">
                        <Trash2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-100 mb-2">¿Borrar Huno?</h2>
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
                            onClick={confirmDelete}
                            className="py-3 rounded-xl bg-red-600 text-stone-950 font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                        >
                            Borrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};