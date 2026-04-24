import React, { useState } from 'react';
import { Task } from '../types';
import { ArrowLeft, Plus, Check, Trash2, Anvil } from 'lucide-react';

interface YunqueViewProps {
  largas: Task[];
  rapidas: Task[];
  onUpdateLargas: (tasks: Task[]) => void;
  onUpdateRapidas: (tasks: Task[]) => void;
  onBack: () => void;
}

export const YunqueView: React.FC<YunqueViewProps> = ({ 
  largas, 
  rapidas, 
  onUpdateLargas, 
  onUpdateRapidas, 
  onBack 
}) => {
  const [newLarga, setNewLarga] = useState('');
  const [newRapida, setNewRapida] = useState('');

  const handleAddTasks = (text: string, currentTasks: Task[], onUpdate: (tasks: Task[]) => void, setter: (val: string) => void) => {
    if (!text.trim()) return;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const newTasks: Task[] = lines.map(l => ({
      id: `yunque-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: l,
      completed: false
    }));
    onUpdate([...currentTasks, ...newTasks]);
    setter('');
  };

  const toggleTask = (taskId: string, currentTasks: Task[], onUpdate: (tasks: Task[]) => void) => {
    onUpdate(currentTasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (taskId: string, currentTasks: Task[], onUpdate: (tasks: Task[]) => void) => {
    onUpdate(currentTasks.filter(t => t.id !== taskId));
  };

  const renderTaskList = (
    title: string, 
    tasks: Task[], 
    onUpdate: (tasks: Task[]) => void, 
    inputValue: string, 
    setInputValue: (val: string) => void,
    accentColor: string,
    buttonAccent: string
  ) => {
    const uncompletedCount = tasks.filter(t => !t.completed).length;
    const completedCount = tasks.filter(t => t.completed).length;
    const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

    return (
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 mb-6 shadow-xl relative overflow-hidden group transition-all duration-300 hover:border-stone-700">
        <div className="flex justify-between items-end mb-5 mt-1">
          <h3 className={`text-xl font-black ${accentColor} uppercase tracking-tighter`}>{title}</h3>
          <span className="text-xs font-bold text-stone-500 tracking-widest uppercase">{uncompletedCount} pendientes</span>
        </div>
        
        <div className="flex gap-2 mb-5">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddTasks(inputValue, tasks, onUpdate, setInputValue);
              }
            }}
            placeholder="Escribe o pega tareas..."
            className="flex-1 bg-stone-950 border border-stone-700/50 rounded-xl px-4 py-3 text-stone-200 focus:outline-none focus:border-stone-400 transition-colors resize-none h-12 text-sm shadow-inner"
            rows={1}
          />
          <button 
            onClick={() => handleAddTasks(inputValue, tasks, onUpdate, setInputValue)}
            className={`p-3 rounded-xl text-stone-950 font-bold ${buttonAccent} transition-all shadow-lg active:scale-95 flex-shrink-0 flex items-center justify-center`}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {tasks.length === 0 && <p className="text-center text-stone-600 italic py-4 text-sm font-bold">La lista está vacía.</p>}
          {tasks.map(task => (
            <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${task.completed ? 'bg-stone-950/60 border-stone-800/50 opacity-60 grayscale' : 'bg-stone-800/30 border-stone-700/60 shadow-sm'}`}>
              <button
                onClick={() => toggleTask(task.id, tasks, onUpdate)}
                className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${task.completed ? 'bg-stone-500 border-stone-500' : 'border-stone-500 hover:border-stone-300'}`}
              >
                {task.completed && <Check className="w-4 h-4 text-white" />}
              </button>
              <span className={`flex-1 text-sm font-medium ${task.completed ? 'line-through text-stone-500' : 'text-stone-200'}`}>
                {task.text}
              </span>
              <button 
                onClick={() => deleteTask(task.id, tasks, onUpdate)}
                className="text-stone-700 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-950/30"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-stone-950 relative animate-in fade-in slide-in-from-right-4 duration-300">
      <header className="sticky top-0 z-20 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/80 p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2.5 -ml-2 rounded-xl hover:bg-stone-800 transition-colors text-stone-400 hover:text-stone-200 active:scale-95">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(71,85,105,0.3)]">
              <Anvil className="w-6 h-6 text-slate-300" />
            </div>
            <h2 className="text-2xl font-black text-stone-100 tracking-tighter italic uppercase pr-2">
              El Yunque
            </h2>
          </div>
        </div>
      </header>

      <div className="p-5 flex-1 pb-10 overflow-y-auto">
        <p className="text-stone-400 text-sm mb-6 text-center font-medium px-4">
          Tareas genéricas, divididas por intensidad. <br/> Puedes pegar varias líneas a la vez.
        </p>
        
        {renderTaskList(
          "Largas", 
          largas, 
          onUpdateLargas, 
          newLarga, 
          setNewLarga, 
          "text-indigo-400", 
          "bg-indigo-500 hover:bg-indigo-400 shadow-indigo-900/20"
        )}
        
        {renderTaskList(
          "Rápidas", 
          rapidas, 
          onUpdateRapidas, 
          newRapida, 
          setNewRapida, 
          "text-teal-400", 
          "bg-teal-500 hover:bg-teal-400 shadow-teal-900/20"
        )}
      </div>
    </div>
  );
};
