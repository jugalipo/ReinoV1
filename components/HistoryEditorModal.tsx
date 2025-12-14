import React, { useState } from 'react';
import { AppData } from '../types';
import { X, Minus, Plus, ShieldCheck, ChevronLeft, ChevronRight, Calendar, Download } from 'lucide-react';

interface HistoryEditorModalProps {
  data: AppData;
  onUpdateData: (data: AppData) => void;
  onClose: () => void;
}

export const HistoryEditorModal: React.FC<HistoryEditorModalProps> = ({ data, onUpdateData, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Helper to get formatted key for storage (YYYY-MM-DD) which matches toDateString format used in App.tsx
  const getFormattedDateKey = (date: Date) => {
      return date.toDateString();
  };

  const adjustStat = (key: keyof typeof data.stats, delta: number) => {
      // @ts-ignore
      const newVal = (data.stats[key] || 0) + delta;
      onUpdateData({
          ...data,
          stats: {
              ...data.stats,
              [key]: Math.max(0, newVal)
          }
      });
  };

  const changeDate = (delta: number) => {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + delta);
      // Prevent future dates
      if (newDate > new Date()) return;
      setCurrentDate(newDate);
  };

  const toggleTaskHistory = (taskId: string) => {
      const dateKey = getFormattedDateKey(currentDate);
      const history = data.hunosHistory || {};
      const completedToday = history[dateKey] || [];
      
      let newCompletedToday;
      if (completedToday.includes(taskId)) {
          newCompletedToday = completedToday.filter(id => id !== taskId);
      } else {
          newCompletedToday = [...completedToday, taskId];
      }

      const newHistory = {
          ...history,
          [dateKey]: newCompletedToday
      };

      // If we are editing "Today" (based on data.lastDate), we must sync the visual main view
      // If we are editing "Yesterday", we must sync the failedYesterday flag
      
      let updatedHunos = data.hunos;
      const todayString = new Date().toDateString(); // Matches App.tsx logic
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toDateString();

      if (dateKey === todayString) {
          updatedHunos = data.hunos.map(t => {
              if (t.id === taskId) {
                  return { ...t, completed: newCompletedToday.includes(taskId) };
              }
              return t;
          });
      } else if (dateKey === yesterdayString) {
           updatedHunos = data.hunos.map(t => {
              // Update status for ALL tasks relative to history
              // If it is now completed in history (includes id), it didn't fail yesterday (failed: false)
              // If it is NOT completed in history (not includes id), it DID fail yesterday (failed: true)
              const isCompletedInHistory = newCompletedToday.includes(t.id);
              return { 
                  ...t, 
                  failedYesterday: !isCompletedInHistory 
              };
          });
      }

      onUpdateData({
          ...data,
          hunos: updatedHunos,
          hunosHistory: newHistory
      });
  };

  const getDayLabel = () => {
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - currentDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (currentDate.toDateString() === today.toDateString()) return 'Hoy';
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (currentDate.toDateString() === yesterday.toDateString()) return 'Ayer';

      return currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const exportCSV = () => {
    // Generic Header structure to fit all data types
    const headers = ['Category', 'Item/Name', 'Value/Status', 'Details/JSON', 'Timestamp/Extra'];
    const rows: (string | number)[][] = [];

    // --- META & STATS ---
    rows.push(['META', 'Last Date', data.lastDate || '', '', '']);
    rows.push(['META', 'Last Sets Reset', new Date(data.lastSetsReset).toLocaleString(), data.lastSetsReset, '']);
    rows.push(['META', 'Last Trains Reset', new Date(data.lastTrainsReset).toLocaleString(), data.lastTrainsReset, '']);
    
    rows.push(['STATS', 'Perfect Sets Weeks', data.stats.perfectSetsWeeks, '', '']);
    rows.push(['STATS', 'Huno Plenos', data.stats.hunoPlenos, '', '']);
    rows.push(['STATS', 'Perfect Train Months', data.stats.perfectTrainMonths, '', '']);
    rows.push(['STATS', 'Project Plenos', data.stats.projectPlenos, '', '']);
    rows.push(['STATS', 'Last Total Interactions', data.stats.lastTotalInteractions, '', '']);
    
    // History Arrays
    rows.push(['STATS HISTORY', 'Sets History', JSON.stringify(data.stats.setsHistory), '', '']);
    rows.push(['STATS HISTORY', 'Trains History', JSON.stringify(data.stats.trainsHistory), '', '']);
    rows.push(['STATS HISTORY', 'Interactions History', JSON.stringify(data.stats.interactionsHistory), '', '']);

    // --- EXERCISE ---
    if (data.exercise) {
        rows.push(['EXERCISE', 'Days Trained', data.exercise.daysTrained, '', '']);
        rows.push(['EXERCISE', 'Total Minutes', data.exercise.totalMinutes || 0, '', '']);
        rows.push(['EXERCISE', 'Current Series', data.exercise.seriesCurrent, '/ 9', '']);
        rows.push(['EXERCISE', 'Sprints', data.exercise.sprintCount, '', '']);
        rows.push(['EXERCISE', 'Stretches', data.exercise.stretchCount, '', '']);
    }

    // --- HUNOS ---
    data.hunos.forEach(t => {
        const details = JSON.stringify({ failedYesterday: t.failedYesterday, plenoCompleted: t.plenoCompleted });
        rows.push(['HUNO', t.text, t.completed ? 'COMPLETED' : 'PENDING', details, '']);
    });

    // --- SETS ---
    data.sets.forEach(t => {
        const date = t.dayCompleted ? new Date(t.dayCompleted).toLocaleString() : '';
        rows.push(['SET', t.text, t.completed ? 'COMPLETED' : 'PENDING', '', date]);
    });

    // --- TRAINS (MONTHLY) ---
    data.trains.forEach(t => {
        const subtasks = t.subtasks ? JSON.stringify(t.subtasks) : '';
        rows.push(['TRAIN (MONTHLY)', t.text, t.completed ? 'COMPLETED' : 'PENDING', subtasks, '']);
    });

    // --- TRAINS (ANNUAL) ---
    if (data.annualTrains) {
        data.annualTrains.forEach(t => {
            const subtasks = t.subtasks ? JSON.stringify(t.subtasks) : '';
            rows.push(['TRAIN (ANNUAL)', t.text, t.completed ? 'COMPLETED' : 'PENDING', subtasks, '']);
        });
    }

    // --- PROJECTS ---
    data.projects.forEach(t => {
        rows.push(['PROJECT', t.text, t.completed ? 'COMPLETED' : 'PENDING', '', '']);
    });

    // --- RESOURCES (FORJAS & LEONES) ---
    data.forjas.forEach(t => {
        rows.push(['FORJA', t.name, t.current, `Target: ${t.target} ${t.unit}`, '']);
    });
    data.leones.forEach(t => {
        rows.push(['LEON', t.name, t.current, `Target: ${t.target} ${t.unit}`, '']);
    });

    // --- FRIENDS ---
    data.friends.forEach(f => {
        const interactions = JSON.stringify(f.interactions);
        const lastContact = f.lastInteraction ? new Date(f.lastInteraction).toLocaleString() : 'Never';
        rows.push(['FRIEND', f.name, lastContact, interactions, f.lastInteraction]);
        
        // Friend Tasks
        f.tasks.forEach(ft => {
            rows.push(['FRIEND TASK', f.name, ft.text, '', '']);
        });
    });

    // --- FOOD ---
    rows.push(['FOOD', 'Score', data.food.score, '', '']);
    rows.push(['FOOD', 'Fridge Count', data.food.fridgeCount, '', '']);
    rows.push(['FOOD', 'Ritual Count', data.food.ritualCount, '', '']);
    rows.push(['FOOD', 'Wheel State', JSON.stringify(data.food.wheel), '', '']);
    rows.push(['FOOD', 'Bonuses State', JSON.stringify(data.food.weeklyBonuses), '', '']);
    
    // Food History
    data.food.history.forEach(h => {
        rows.push(['FOOD HISTORY', h.action, h.delta, '', new Date(h.timestamp).toLocaleString()]);
    });

    // Create CSV content
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => {
          // Escape quotes and wrap in quotes to handle commas in text
          return e.map(cell => {
              if (cell === null || cell === undefined) return '""';
              const stringCell = String(cell);
              return `"${stringCell.replace(/"/g, '""')}"`;
          }).join(",");
      }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `el_reino_backup_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dateKey = getFormattedDateKey(currentDate);
  const completedIds = (data.hunosHistory || {})[dateKey] || [];

  return (
    <div className="absolute inset-0 z-50 bg-stone-950 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
       <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between border-b border-stone-800">
            <h2 className="text-xl font-bold text-stone-200 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                Edición Retroactiva
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-full">
                <X className="w-6 h-6 text-stone-400" />
            </button>
       </div>

       <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
           
           {/* Date Navigator */}
           <div className="flex items-center justify-between bg-stone-900 p-2 rounded-2xl border border-stone-800 mb-6">
                <button 
                    onClick={() => changeDate(-1)} 
                    className="p-3 hover:bg-stone-800 rounded-xl transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-stone-400" />
                </button>
                
                <div className="text-center">
                    <div className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-1">
                        Editando
                    </div>
                    <div className="text-xl font-bold text-stone-100 flex items-center justify-center gap-2">
                        <Calendar className="w-5 h-5 text-stone-500" />
                        {getDayLabel()}
                    </div>
                </div>

                <button 
                    onClick={() => changeDate(1)} 
                    disabled={currentDate.toDateString() === new Date().toDateString()}
                    className="p-3 hover:bg-stone-800 rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                >
                    <ChevronRight className="w-6 h-6 text-stone-400" />
                </button>
           </div>

           {/* Hunos List for Selected Date */}
           <div className="space-y-4">
                <h3 className="font-bold text-stone-300 uppercase text-xs tracking-wider flex items-center gap-2 px-2">
                    Registro de Hunos: {currentDate.toLocaleDateString()}
                </h3>
                
                <div className="grid grid-cols-1 gap-2">
                    {data.hunos.filter(t => t.text !== 'GAP').map(task => {
                        const isCompleted = completedIds.includes(task.id);
                        return (
                            <div 
                                key={task.id} 
                                onClick={() => toggleTaskHistory(task.id)}
                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all active:scale-95 ${
                                    isCompleted 
                                        ? 'bg-purple-900/20 border-purple-500/50' 
                                        : 'bg-stone-900 border-stone-800 hover:border-stone-700'
                                }`}
                            >
                                <span className={`text-sm font-medium ${isCompleted ? 'text-purple-200' : 'text-stone-400'}`}>
                                    {task.text}
                                </span>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    isCompleted 
                                        ? 'bg-purple-500 border-purple-500' 
                                        : 'border-stone-600'
                                }`}>
                                    {isCompleted && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <p className="text-xs text-stone-500 px-2 pt-2 text-center">
                    Los cambios en "Ayer" o "Hoy" se sincronizarán con la pantalla principal.
                </p>
           </div>

           {/* Stats Adjuster */}
           <div className="space-y-4 pt-6 border-t border-stone-800">
               <h3 className="font-bold text-stone-300 uppercase text-xs tracking-wider px-2">Ajuste Manual de Totales</h3>
               
               <div className="grid grid-cols-1 gap-3">
                   <div className="flex items-center justify-between bg-stone-900 p-3 rounded-xl border border-stone-800">
                       <span className="font-bold text-stone-200 text-sm">Plenos Hunos</span>
                       <div className="flex items-center gap-3">
                           <button onClick={() => adjustStat('hunoPlenos', -1)} className="p-1 bg-stone-800 rounded hover:bg-stone-700"><Minus className="w-4 h-4" /></button>
                           <span className="font-mono w-8 text-center">{data.stats.hunoPlenos}</span>
                           <button onClick={() => adjustStat('hunoPlenos', 1)} className="p-1 bg-stone-800 rounded hover:bg-stone-700"><Plus className="w-4 h-4" /></button>
                       </div>
                   </div>
                   
                   <div className="flex items-center justify-between bg-stone-900 p-3 rounded-xl border border-stone-800">
                       <span className="font-bold text-stone-200 text-sm">Plenos Proyectos</span>
                       <div className="flex items-center gap-3">
                           <button onClick={() => adjustStat('projectPlenos', -1)} className="p-1 bg-stone-800 rounded hover:bg-stone-700"><Minus className="w-4 h-4" /></button>
                           <span className="font-mono w-8 text-center">{data.stats.projectPlenos}</span>
                           <button onClick={() => adjustStat('projectPlenos', 1)} className="p-1 bg-stone-800 rounded hover:bg-stone-700"><Plus className="w-4 h-4" /></button>
                       </div>
                   </div>

                   <div className="flex items-center justify-between bg-stone-900 p-3 rounded-xl border border-stone-800">
                       <span className="font-bold text-stone-200 text-sm">Meses Trenes</span>
                       <div className="flex items-center gap-3">
                           <button onClick={() => adjustStat('perfectTrainMonths', -1)} className="p-1 bg-stone-800 rounded hover:bg-stone-700"><Minus className="w-4 h-4" /></button>
                           <span className="font-mono w-8 text-center">{data.stats.perfectTrainMonths}</span>
                           <button onClick={() => adjustStat('perfectTrainMonths', 1)} className="p-1 bg-stone-800 rounded hover:bg-stone-700"><Plus className="w-4 h-4" /></button>
                       </div>
                   </div>
                   
                   <div className="flex items-center justify-between bg-stone-900 p-3 rounded-xl border border-stone-800">
                       <span className="font-bold text-stone-200 text-sm">Semanas Setas</span>
                       <div className="flex items-center gap-3">
                           <button onClick={() => adjustStat('perfectSetsWeeks', -1)} className="p-1 bg-stone-800 rounded hover:bg-stone-700"><Minus className="w-4 h-4" /></button>
                           <span className="font-mono w-8 text-center">{data.stats.perfectSetsWeeks}</span>
                           <button onClick={() => adjustStat('perfectSetsWeeks', 1)} className="p-1 bg-stone-800 rounded hover:bg-stone-700"><Plus className="w-4 h-4" /></button>
                       </div>
                   </div>
               </div>
           </div>

           {/* Export Data Section (Moved from Settings) */}
           <div className="pt-6 border-t border-stone-800">
               <h3 className="font-bold text-stone-300 uppercase text-xs tracking-wider mb-3 px-2">Gestión de Datos</h3>
               <div className="bg-stone-900 p-4 rounded-xl border border-stone-800">
                   <h3 className="font-bold text-stone-300 mb-2 flex items-center gap-2">
                       <Download className="w-5 h-5" /> Exportar Datos
                   </h3>
                   <p className="text-sm text-stone-500 mb-4">Descarga tu historial completo en formato CSV.</p>
                   <button onClick={exportCSV} className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 px-4 py-3 rounded-lg text-sm font-medium border border-stone-700 transition-colors">
                       Descargar Copia Completa (.CSV)
                   </button>
               </div>
           </div>

       </div>
    </div>
  );
};