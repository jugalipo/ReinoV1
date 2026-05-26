import React from 'react';
import { X, Check, Footprints, ChevronDown, ChevronUp } from 'lucide-react';
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

export const FootTasksModal: React.FC<FootTasksModalProps> = ({
  trains,
  sets,
  yunqueLargas,
  yunqueRapidas,
  onUpdateTrains,
  onUpdateSets,
  onUpdateYunqueLargas,
  onUpdateYunqueRapidas,
  onClose
}) => {
  
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
        if (sub && sub.text && sub.text.includes('🦶')) {
          footTasks.push({ taskId: s.id, sub, sourceType: 'set', parentName: s.text || '' });
        }
      });
    });

    trains.forEach(t => {
      t.subtasks?.forEach(s => {
        if (s && s.text && s.text.includes('🦶')) {
          footTasks.push({ taskId: t.id, sub: s, sourceType: 'train', parentName: t.text || '' });
        }
      });
    });

    yunqueRapidas.forEach(y => {
      if (y && y.text && y.text.includes('🦶')) {
        footTasks.push({ taskId: y.id, sub: y, sourceType: 'yunqueRapida', parentName: 'Grapas' });
      }
    });

    yunqueLargas.forEach(y => {
      if (y && y.text && y.text.includes('🦶')) {
        footTasks.push({ taskId: y.id, sub: y, sourceType: 'yunqueLarga', parentName: 'Argollas' });
      }
      y.subtasks?.forEach(sub => {
        if (sub && sub.text && sub.text.includes('🦶')) {
          footTasks.push({ taskId: y.id, sub, sourceType: 'yunqueLarga', parentName: `Argolla: ${y.text || ''}` });
        }
      });
    });

    return footTasks;
  };

  const allFootTasks = getFootSubtasks();

  // Find first category with pending tasks to select as default active category
  const [activeCategory, setActiveCategory] = React.useState<'set' | 'yunque' | 'train'>(() => {
    const hasSets = allFootTasks.some(t => t.sourceType === 'set' && !t.sub.completed);
    if (hasSets) return 'set';
    const hasYunque = allFootTasks.some(t => (t.sourceType === 'yunqueLarga' || t.sourceType === 'yunqueRapida') && !t.sub.completed);
    if (hasYunque) return 'yunque';
    const hasTrains = allFootTasks.some(t => t.sourceType === 'train' && !t.sub.completed);
    if (hasTrains) return 'train';
    return 'set';
  });

  const [showCompleted, setShowCompleted] = React.useState(false);

  const stripEmojis = (text: string) => text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]/gu, '').trim();

  // Counts of remaining (incomplete) tasks per category
  const setsPendingCount = allFootTasks.filter(t => t.sourceType === 'set' && !t.sub.completed).length;
  const yunquePendingCount = allFootTasks.filter(t => (t.sourceType === 'yunqueLarga' || t.sourceType === 'yunqueRapida') && !t.sub.completed).length;
  const trainsPendingCount = allFootTasks.filter(t => t.sourceType === 'train' && !t.sub.completed).length;

  // Filter tasks belonging to the active category
  const categoryTasks = allFootTasks.filter(t => {
    if (activeCategory === 'set') return t.sourceType === 'set';
    if (activeCategory === 'yunque') return t.sourceType === 'yunqueLarga' || t.sourceType === 'yunqueRapida';
    if (activeCategory === 'train') return t.sourceType === 'train';
    return false;
  });

  const categoryIncomplete = categoryTasks.filter(t => !t.sub.completed);
  const categoryCompleted = categoryTasks.filter(t => t.sub.completed);

  const activeTask = categoryIncomplete[0];

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

  const renderTask = ({ taskId, sub, sourceType, parentName }: { taskId: string, sub: any, sourceType: any, parentName: string }) => (
    <div
      key={`${sourceType}-${sub.id}`}
      className={`flex gap-4 p-3 rounded-2xl border transition-all duration-300 cursor-pointer ${
        sub.completed
          ? 'bg-stone-950/40 border-emerald-900/10 opacity-65'
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

  const renderCompletionState = () => {
    let emoji = '🍄';
    let name = 'Setas';
    if (activeCategory === 'yunque') {
      emoji = '⚔️';
      name = 'Yunque';
    } else if (activeCategory === 'train') {
      emoji = '🚂';
      name = 'Trenes';
    }
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 my-6 bg-stone-950/30 border border-stone-850 rounded-3xl animate-in zoom-in duration-200">
        <div className="text-4xl mb-4 filter drop-shadow">{emoji}</div>
        <h4 className="text-base font-bold text-emerald-400">¡Categoría al día!</h4>
        <p className="text-xs text-stone-500 mt-1">Has terminado todos los pies de {name}.</p>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 max-w-md mx-auto z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-stone-900 w-full max-w-sm rounded-3xl shadow-2xl border border-emerald-900/50 overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-800 flex justify-between items-center bg-emerald-950/20">
          <div>
            <div className="flex items-center gap-2">
              <Footprints className="w-6 h-6 text-emerald-500" />
              <h3 className="font-bold text-emerald-100 text-xl tracking-tight">Passeggiata</h3>
            </div>
            <p className="text-xs text-emerald-600 font-semibold tracking-wider uppercase mt-1">Hunos a pie</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-emerald-900/30 rounded-full transition-colors">
            <X className="w-6 h-6 text-emerald-600" />
          </button>
        </div>

        {/* Menu Bar (Category Tabs) */}
        <div className="flex justify-center gap-6 p-4 border-b border-stone-800/40 bg-stone-950/20">
          <button
            onClick={() => setActiveCategory('set')}
            className={`relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${
              activeCategory === 'set'
                ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] scale-105'
                : 'bg-stone-900 border border-stone-800/65 text-stone-400 hover:text-stone-300 hover:border-stone-750'
            }`}
          >
            <span className="text-2xl filter drop-shadow">🍄</span>
            {setsPendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-stone-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {setsPendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveCategory('yunque')}
            className={`relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${
              activeCategory === 'yunque'
                ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] scale-105'
                : 'bg-stone-900 border border-stone-800/65 text-stone-400 hover:text-stone-300 hover:border-stone-750'
            }`}
          >
            <span className="text-2xl filter drop-shadow">⚔️</span>
            {yunquePendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-stone-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {yunquePendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveCategory('train')}
            className={`relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${
              activeCategory === 'train'
                ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] scale-105'
                : 'bg-stone-900 border border-stone-800/65 text-stone-400 hover:text-stone-300 hover:border-stone-750'
            }`}
          >
            <span className="text-2xl filter drop-shadow">🚂</span>
            {trainsPendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-stone-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {trainsPendingCount}
              </span>
            )}
          </button>
        </div>
        
        {/* Content Area */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-stone-900/50">
          {allFootTasks.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                <Footprints className="w-8 h-8 text-stone-600" />
              </div>
              <p className="text-stone-500 italic text-sm">No hay subtareas con el emoji 🦶 en tus Trenes, Setas o Yunque.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Single Central Task */}
              {activeTask ? (
                <div 
                  onClick={() => toggleTask(activeTask.taskId, activeTask.sub.id, activeTask.sourceType)}
                  className="flex flex-col items-center justify-center text-center p-8 my-4 bg-emerald-950/15 hover:bg-emerald-950/25 border border-emerald-500/30 hover:border-emerald-500/50 rounded-3xl shadow-xl transition-all duration-300 cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl border-2 border-emerald-600/70 hover:border-emerald-500 bg-emerald-950/40 flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-105 group-hover:bg-emerald-500 group-hover:border-emerald-500">
                    <Check className="w-6 h-6 text-stone-900 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                  
                  <div className="space-y-2">
                    <span className="block text-[9px] font-black tracking-widest text-emerald-500/60 uppercase">
                      {stripEmojis(activeTask.parentName)}
                    </span>
                    <h4 className="text-lg font-bold text-emerald-100 leading-snug max-w-[240px]">
                      {stripEmojis(activeTask.sub.text)}
                    </h4>
                  </div>
                </div>
              ) : (
                renderCompletionState()
              )}

              {/* Collapsible Completed Tasks List */}
              {categoryCompleted.length > 0 && (
                <div className="pt-2 border-t border-stone-800/50">
                  <button 
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="w-full flex justify-between items-center py-2 px-2 rounded-xl text-stone-400 hover:text-stone-300 hover:bg-stone-800/20 transition-all duration-200"
                  >
                    <span className="text-xs font-extrabold uppercase tracking-widest text-stone-500">
                      Completadas ({categoryCompleted.length})
                    </span>
                    {showCompleted ? (
                      <ChevronUp className="w-4 h-4 text-stone-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-500" />
                    )}
                  </button>
                  
                  {showCompleted && (
                    <div className="space-y-2 mt-3 max-h-[160px] overflow-y-auto pr-1 animate-in slide-in-from-top duration-200">
                      {categoryCompleted.map(renderTask)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer with overall progress */}
        <div className="p-4 bg-emerald-950/10 border-t border-emerald-900/20">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-[10px] font-black text-emerald-800/80 uppercase tracking-widest">Progreso Passeggiata</span>
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
