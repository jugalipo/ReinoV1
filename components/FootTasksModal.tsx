import React from 'react';
import { X, Check, Footprints } from 'lucide-react';
import { Task, WeeklyTask } from '../types';

interface FootTasksModalProps {
  trains: Task[];
  sets: WeeklyTask[];
  yunqueLargas: Task[];
  yunqueRapidas: Task[];
  onUpdateTrains: (tasks: Task[]) => void;
  onUpdateSets: (tasks: WeeklyTask[]) => void;
  onUpdateYunqueLargas: (tasks: Task[]) => void;
  onUpdateYunqueRapidas: (tasks: Task[]) => void;
  onClose: () => void;
}

export const FootTasksModal: React.FC<FootTasksModalProps> = ({ trains, sets, yunqueLargas, yunqueRapidas, onUpdateTrains, onUpdateSets, onUpdateYunqueLargas, onUpdateYunqueRapidas, onClose }) => {
  
  // Extract all subtasks containing 🦶 emoji
  const getFootSubtasks = () => {
    const footTasks: Array<{
      taskId: string;
      sub: { id: string; text: string; completed: boolean };
      sourceType: 'train' | 'set' | 'yunqueLarga' | 'yunqueRapida';
      parentName: string;
    }> = [];

    sets.forEach(s => {
      s.subtasks?.forEach(sub => {
        if (sub.text.includes('🦶')) {
          footTasks.push({ taskId: s.id, sub, sourceType: 'set', parentName: s.text });
        }
      });
    });

    trains.forEach(t => {
      t.subtasks?.forEach(s => {
        if (s.text.includes('🦶')) {
          footTasks.push({ taskId: t.id, sub: s, sourceType: 'train', parentName: t.text });
        }
      });
    });

    yunqueRapidas.forEach(y => {
      if (y.text.includes('🦶')) {
        footTasks.push({ taskId: y.id, sub: y, sourceType: 'yunqueRapida', parentName: 'Grapas' });
      }
    });

    yunqueLargas.forEach(y => {
      if (y.text.includes('🦶')) {
        footTasks.push({ taskId: y.id, sub: y, sourceType: 'yunqueLarga', parentName: 'Argollas' });
      }
      y.subtasks?.forEach(sub => {
        if (sub.text.includes('🦶')) {
          footTasks.push({ taskId: y.id, sub, sourceType: 'yunqueLarga', parentName: `Argolla: ${y.text}` });
        }
      });
    });

    return footTasks;
  };

  const stripEmojis = (text: string) => text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]/gu, '').trim();

  const renderTask = ({ taskId, sub, sourceType, parentName }: { taskId: string, sub: any, sourceType: any, parentName: string }) => (
    <div
      key={`${sourceType}-${sub.id}`}
      className={`flex gap-4 p-3 rounded-2xl border transition-all duration-300 ${
        sub.completed
          ? 'bg-stone-950/40 border-emerald-900/20 opacity-60'
          : 'bg-emerald-950/10 border-emerald-900/30 hover:border-emerald-500/50 shadow-sm'
      }`}
      onClick={() => toggleTask(taskId, sub.id, sourceType)}
    >
      <div 
        className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
          sub.completed
            ? 'bg-emerald-600 border-emerald-600'
            : 'border-emerald-800 hover:border-emerald-500'
        }`}
      >
        {sub.completed && <Check className="w-4 h-4 text-stone-900" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`block font-bold text-base mb-0.5 ${sub.completed ? 'line-through text-emerald-900' : 'text-emerald-100'}`}>
          {stripEmojis(sub.text)}
        </span>
        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-800">
          {stripEmojis(parentName)}
        </span>
      </div>
    </div>
  );

  const allFootTasks = getFootSubtasks();
  
  const incompleteTasks = allFootTasks.filter(t => !t.sub.completed);
  const completedTasks = allFootTasks.filter(t => t.sub.completed);

  const setsTasks = incompleteTasks.filter(t => t.sourceType === 'set');
  const yunqueTasks = incompleteTasks.filter(t => t.sourceType === 'yunqueLarga' || t.sourceType === 'yunqueRapida');
  const trainsTasks = incompleteTasks.filter(t => t.sourceType === 'train');

  const toggleTask = (taskId: string, subId: string, type: 'train' | 'set' | 'yunqueLarga' | 'yunqueRapida') => {
    if (type === 'train') {
      const updated = trains.map(t => {
        if (t.id === taskId && t.subtasks) {
          return {
            ...t,
            subtasks: t.subtasks.map(s => s.id === subId ? { ...s, completed: !s.completed } : s)
          };
        }
        return t;
      });
      onUpdateTrains(updated);
    } else if (type === 'set') {
      const updated = sets.map(s => {
        if (s.id === taskId && s.subtasks) {
          return {
            ...s,
            subtasks: s.subtasks.map(sub => sub.id === subId ? { ...sub, completed: !sub.completed } : sub)
          };
        }
        return s;
      });
      onUpdateSets(updated);
    } else if (type === 'yunqueLarga') {
      const updated = yunqueLargas.map(t => {
        if (t.id === taskId) {
          if (t.id === subId) {
            return { ...t, completed: !t.completed };
          } else if (t.subtasks) {
            return {
              ...t,
              subtasks: t.subtasks.map(s => s.id === subId ? { ...s, completed: !s.completed } : s)
            };
          }
        }
        return t;
      });
      onUpdateYunqueLargas(updated);
    } else if (type === 'yunqueRapida') {
      const updated = yunqueRapidas.map(t => {
        if (t.id === taskId) {
          return { ...t, completed: !t.completed };
        }
        return t;
      });
      onUpdateYunqueRapidas(updated);
    }
  };

  return (
    <div 
      className="fixed inset-0 max-w-md mx-auto z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-stone-900 w-full max-w-sm rounded-3xl shadow-2xl border border-emerald-900/50 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-stone-800 flex justify-between items-center bg-emerald-950/20">
          <div>
            <div className="flex items-center gap-2">
              <Footprints className="w-6 h-6 text-emerald-500" />
              <h3 className="font-bold text-emerald-100 text-xl tracking-tight">Passeggiata</h3>
            </div>
            <p className="text-base mt-1">🚂 🍄 ⚔️</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-emerald-900/30 rounded-full transition-colors">
            <X className="w-6 h-6 text-emerald-600" />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-stone-900/50">
          {allFootTasks.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                <Footprints className="w-8 h-8 text-stone-600" />
              </div>
              <p className="text-stone-500 italic text-sm">No hay subtareas con el emoji 🦶 en tus Trenes, Setas o Yunque.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {setsTasks.length > 0 && (
                 <div>
                    <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-3 px-2">🍄 Setas</h4>
                    <div className="space-y-2">
                       {setsTasks.map(renderTask)}
                    </div>
                 </div>
              )}
              {yunqueTasks.length > 0 && (
                 <div>
                    <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-3 px-2">⚔️ Yunque</h4>
                    <div className="space-y-2">
                       {yunqueTasks.map(renderTask)}
                    </div>
                 </div>
              )}
              {trainsTasks.length > 0 && (
                 <div>
                    <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-3 px-2">🚂 Trenes</h4>
                    <div className="space-y-2">
                       {trainsTasks.map(renderTask)}
                    </div>
                 </div>
              )}
              
              {completedTasks.length > 0 && (
                 <div className="pt-4 border-t border-emerald-900/20">
                    <h4 className="text-xs font-bold text-stone-600 uppercase tracking-widest mb-3 px-2">Completadas</h4>
                    <div className="space-y-2">
                       {completedTasks.map(renderTask)}
                    </div>
                 </div>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4 bg-emerald-950/10 border-t border-emerald-900/20">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Progreso Passeggiata</span>
            <span className="text-[10px] font-mono font-bold text-emerald-600">
              {allFootTasks.filter(t => t.sub.completed).length}/{allFootTasks.length}
            </span>
          </div>
          <div className="w-full h-1.5 bg-emerald-950/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-all duration-1000" 
              style={{ width: `${allFootTasks.length > 0 ? (allFootTasks.filter(t => t.sub.completed).length / allFootTasks.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
