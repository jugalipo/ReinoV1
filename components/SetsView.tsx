import React from 'react';
import { WeeklyTask } from '../types';
import { ArrowLeft, Check } from 'lucide-react';

interface SetsViewProps {
  tasks: WeeklyTask[];
  onUpdate: (tasks: WeeklyTask[]) => void;
  onBack: () => void;
}

export const SetsView: React.FC<SetsViewProps> = ({ tasks, onUpdate, onBack }) => {
  // Sort for Chart: Completed first (descending boolean)
  const chartTasks = [...tasks].sort((a, b) => Number(b.completed) - Number(a.completed));

  // Sort for List: Incomplete first (ascending boolean)
  const listTasks = [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed));

  const toggleTask = (id: string) => {
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

  // Helper to parse Name and Duration based on text
  const parseSetInfo = (text: string) => {
    const timeMatch = text.match(/\s(\d+(?:h|'|min))$/);
    const duration = timeMatch ? timeMatch[1] : '';
    const name = timeMatch ? text.replace(timeMatch[0], '') : text;
    return { name, duration };
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

  const totalMinutes = tasks.reduce((acc, task) => {
    if (task.completed) return acc;
    const { duration } = parseSetInfo(task.text);
    return acc + parseDurationToMinutes(duration);
  }, 0);

  // SVG Helper for Mushroom Cap sectors (Top semi-circle)
  const createCapSlicePath = (index: number, total: number, radius: number, cx: number, cy: number) => {
    const span = 180;
    const startAngle = 180 + (index * span) / total;
    const endAngle = 180 + ((index + 1) * span) / total;
    
    const startRad = startAngle * (Math.PI / 180);
    const endRad = endAngle * (Math.PI / 180);

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };

  const stemPath = `
    M 75 100 
    L 125 100 
    Q 130 100 130 110
    L 130 145
    A 30 20 0 0 1 70 145
    L 70 110
    Q 70 100 75 100
    Z
  `;

  return (
    <div className="fixed inset-0 max-w-md mx-auto z-50 bg-stone-950 flex flex-col animate-in fade-in duration-200">
      <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-red-500" />
          </button>
          <h1 className="text-xl font-bold text-stone-100 leading-none">Setas</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-28 bg-red-950/10">
        
        {/* Week Label Centered */}
        <div className="flex justify-center items-center gap-3 mb-6 mt-2">
          <span className="text-lg font-bold text-red-400 bg-stone-900/80 px-6 py-2 rounded-full border border-red-900/30 shadow-sm">
            {getWeekLabel()}
          </span>
          {totalMinutes >= 0 && (
            <span className="flex items-center gap-1 text-sm font-mono font-bold text-stone-400 bg-stone-800 px-4 py-2 rounded-full border border-stone-700 shadow-sm">
              {totalMinutes}min
            </span>
          )}
        </div>

        {/* Mushroom Visualization */}
        {tasks.length > 0 && (
          <div className="flex justify-center mb-8 py-4">
            <div className="relative w-64 h-64 drop-shadow-md">
              <svg width="256" height="256" viewBox="0 0 200 200">
                {/* Mushroom Cap (Progress) */}
                {chartTasks.map((task, index) => (
                  <path
                    key={task.id}
                    d={createCapSlicePath(index, tasks.length, 90, 100, 100)}
                    fill={task.completed ? '#ef4444' : '#450a0a'}
                    stroke="#1c1917"
                    strokeWidth="2.5"
                    className="transition-all duration-300 ease-in-out"
                  />
                ))}
                
                {/* Flat base of the cap */}
                <line x1="10" y1="100" x2="190" y2="100" stroke="#1c1917" strokeWidth="3" />

                {/* Mushroom Stem */}
                <path 
                  d={stemPath} 
                  fill="#ffffff" 
                  stroke="#1c1917" 
                  strokeWidth="2.5" 
                />
              </svg>
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="space-y-3">
          {listTasks.map((task, index) => {
            const { name, duration } = parseSetInfo(task.text);
            return (
              <div
                key={task.id}
                className={`flex flex-col p-4 rounded-xl border transition-all ${
                  task.completed
                    ? 'bg-red-950/20 border-red-900/40'
                    : 'bg-stone-900 border-stone-800'
                }`}
              >
                <div 
                  className="flex items-center justify-between w-full cursor-pointer" 
                  onClick={() => toggleTask(task.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 flex-shrink-0 ${
                      task.completed ? 'bg-red-600 text-white border-red-600' : 'text-red-500/50 border-red-900'
                    }`}>
                      {task.completed ? <Check className="w-5 h-5" /> : index + 1}
                    </div>
                    <span className={`font-medium ${task.completed ? 'text-red-400 line-through opacity-70' : 'text-stone-200'}`}>
                      {name}
                    </span>
                  </div>
                  {duration && (
                    <span className="flex items-center gap-1 text-xs font-mono font-bold text-stone-400 bg-stone-800 px-3 py-1.5 rounded-full border border-stone-700 ml-4 flex-shrink-0">
                      {duration}
                    </span>
                  )}
                </div>
                
                {/* Subtasks */}
                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="mt-3 ml-11 space-y-2 border-l-2 border-stone-800 pl-4">
                    {[...(task.subtasks || [])].sort((a, b) => Number(a.completed) - Number(b.completed)).map(sub => (
                      <div 
                        key={sub.id} 
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = tasks.map(t => {
                            if (t.id === task.id && t.subtasks) {
                              const newSubtasks = t.subtasks.map(s => 
                                s.id === sub.id ? { ...s, completed: !s.completed } : s
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
                        }}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          sub.completed ? 'bg-red-600 border-red-600' : 'border-stone-600 hover:border-red-400'
                        }`}>
                          {sub.completed && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-sm ${sub.completed ? 'text-stone-500 line-through' : 'text-stone-300'}`}>
                          {sub.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {tasks.length === 0 && (
          <p className="text-center text-stone-500 mt-8 italic">No hay setas activas.</p>
        )}
      </div>
    </div>
  );
};