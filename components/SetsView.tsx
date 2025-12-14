import React, { useState } from 'react';
import { WeeklyTask } from '../types';
import { ArrowLeft, Check, Edit2, Save, Plus, Trash2, X } from 'lucide-react';

interface SetsViewProps {
  tasks: WeeklyTask[];
  onUpdate: (tasks: WeeklyTask[]) => void;
  onBack: () => void;
}

export const SetsView: React.FC<SetsViewProps> = ({ tasks, onUpdate, onBack }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Custom Modal States
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');

  // Sort for Chart: Completed first (descending boolean)
  const chartTasks = [...tasks].sort((a, b) => Number(b.completed) - Number(a.completed));

  // Sort for List: Incomplete first (ascending boolean) ONLY if not editing
  const listTasks = isEditing ? tasks : [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed));

  const toggleTask = (id: string) => {
    if (isEditing) return;
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    onUpdate(updated);
  };

  const handleTextChange = (id: string, newText: string) => {
    const updated = tasks.map((t) => 
        t.id === id ? { ...t, text: newText } : t
    );
    onUpdate(updated);
  };

  // Helper for date
  const getWeekLabel = () => {
      const now = new Date();
      const onejan = new Date(now.getFullYear(), 0, 1);
      const millisecsInDay = 86400000;
      const weekNum = Math.ceil((((now.getTime() - onejan.getTime()) / millisecsInDay) + onejan.getDay() + 1) / 7);
      
      const day = now.getDay();
      const diff = now.getDate() - day;
      const sunday = new Date(now);
      sunday.setDate(diff);

      const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
      return `Semana ${weekNum} · ${sunday.getDate()} ${monthNames[sunday.getMonth()]}`;
  };

  // --- ADD ACTIONS ---

  const initiateAdd = () => {
      setIsAdding(true);
      setNewTaskText('');
  };

  const confirmAdd = () => {
    if (!newTaskText.trim()) return;

    const newTask: WeeklyTask = {
        id: Date.now().toString(),
        text: newTaskText,
        completed: false
    };
    onUpdate([...tasks, newTask]);
    setIsAdding(false);
    setNewTaskText('');
  };

  // --- DELETE ACTIONS ---

  const initiateDelete = (id: string) => {
      setTaskToDelete(id);
  };

  const confirmDelete = () => {
      if (!taskToDelete) return;
      onUpdate(tasks.filter(t => t.id !== taskToDelete));
      setTaskToDelete(null);
  };

  // SVG Helper for Pie Slices
  const createSlicePath = (index: number, total: number, radius: number, cx: number, cy: number) => {
    if (total === 1) {
        // Full circle if only 1 item
        return `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`;
    }

    const startAngle = (index * 360) / total;
    const endAngle = ((index + 1) * 360) / total;
    
    // Convert to radians, subtract 90deg to start at 12 o'clock
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    // M cx cy L x1 y1 A radius radius 0 0 1 x2 y2 Z
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="flex flex-col h-full bg-red-950/20 relative">
      <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between sticky top-0 z-10 border-b border-stone-800">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full">
            <ArrowLeft className="w-6 h-6 text-red-500" />
            </button>
            <h1 className="text-xl font-bold text-red-200 leading-none">Setas</h1>
        </div>
        
        <button 
            onClick={() => setIsEditing(!isEditing)} 
            className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-red-600 text-white' : 'hover:bg-stone-800 text-red-400'}`}
        >
            {isEditing ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto pb-20">
        
        {/* Week Label Centered */}
        <div className="flex justify-center mb-6 mt-2">
            <span className="text-lg font-bold text-red-400/90 bg-stone-900/50 px-6 py-2 rounded-full border border-red-900/30 shadow-sm">
                {getWeekLabel()}
            </span>
        </div>

        {/* Circle Visualization (Hide in edit mode to save space/distraction) */}
        {!isEditing && tasks.length > 0 && (
            <div className="flex justify-center mb-8 py-4">
                <div className="relative w-64 h-64 drop-shadow-md">
                    <svg width="256" height="256" viewBox="0 0 200 200">
                        {chartTasks.map((task, index) => (
                            <path
                                key={task.id}
                                d={createSlicePath(index, tasks.length, 95, 100, 100)}
                                fill={task.completed ? '#ef4444' : '#450a0a'} // Red-500 vs Red-950
                                stroke="#1c1917" // stone-900
                                strokeWidth="2"
                                className="transition-all duration-300 ease-in-out"
                            />
                        ))}
                        {/* Inner dark circle for "donut" look */}
                        <circle cx="100" cy="100" r="30" fill="#1c1917" />
                        <text x="100" y="110" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#ffffff">
                            {tasks.filter(t => t.completed).length}
                        </text>
                    </svg>
                </div>
            </div>
        )}

        {/* Task List */}
        <div className="space-y-3">
          {listTasks.map((task, index) => (
            <div
              key={task.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                task.completed && !isEditing
                  ? 'bg-red-950/40 border-red-900/50'
                  : 'bg-stone-900 border-stone-800'
              }`}
            >
                {isEditing ? (
                    <div className="flex items-center gap-2 w-full">
                        <input 
                            value={task.text}
                            onChange={(e) => handleTextChange(task.id, e.target.value)}
                            className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 outline-none focus:border-red-500"
                        />
                        <button 
                            onClick={() => initiateDelete(task.id)}
                            className="p-2 bg-stone-950 border border-stone-700 rounded-lg text-red-500 hover:bg-red-900/20"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div 
                        className="flex items-center gap-3 flex-1 cursor-pointer" 
                        onClick={() => toggleTask(task.id)}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                            task.completed ? 'bg-red-600 text-white border-red-600' : 'text-red-500/50 border-red-900'
                        }`}>
                            {task.completed ? <Check className="w-5 h-5" /> : index + 1}
                        </div>
                        <span className={`font-medium ${task.completed ? 'text-red-400 line-through opacity-70' : 'text-stone-300'}`}>
                            {task.text}
                        </span>
                    </div>
                )}
            </div>
          ))}
        </div>

        {/* Add Button (Only in Edit Mode) */}
        {isEditing && (
             <button 
                onClick={initiateAdd}
                className="w-full mt-4 py-3 border-2 border-dashed border-stone-700 rounded-xl flex items-center justify-center gap-2 text-stone-500 hover:text-red-400 hover:border-red-500/50 hover:bg-stone-900 transition-all"
             >
                 <Plus className="w-5 h-5" />
                 <span>Añadir Seta</span>
             </button>
        )}

        {tasks.length === 0 && !isEditing && (
            <p className="text-center text-stone-500 mt-8 italic">No hay setas. Pulsa editar para añadir.</p>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* Add Task Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-800/50">
                     <h3 className="font-bold text-red-200 text-lg">Nueva Seta</h3>
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
                             placeholder="Nombre de la seta..."
                             className="w-full bg-stone-950 border border-stone-700 rounded-xl p-4 text-stone-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-lg"
                         />
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
                            className="py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
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
                    <h2 className="text-xl font-bold text-stone-100 mb-2">¿Borrar seta?</h2>
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