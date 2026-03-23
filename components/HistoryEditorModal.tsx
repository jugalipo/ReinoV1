import React, { useState } from 'react';
import { AppData } from '../types';
import { sanitizeForFirestore } from '../App';
import { X, Minus, Plus, ShieldCheck, ChevronLeft, ChevronRight, Calendar, Download, Upload, ArrowLeft, Activity } from 'lucide-react';

interface HistoryEditorModalProps {
  data: AppData;
  onUpdateData: (data: AppData) => void;
  onClose: () => void;
}

export const HistoryEditorModal: React.FC<HistoryEditorModalProps> = ({ data, onUpdateData, onClose }) => {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  });
  const [importData, setImportData] = useState<AppData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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
      // For all days, we recalculate missedDays and failedYesterday
      
      let updatedHunos = data.hunos;
      const todayString = new Date().toDateString(); // Matches App.tsx logic
      
      if (dateKey === todayString) {
          updatedHunos = data.hunos.map(t => {
              if (t.id === taskId) {
                  return { ...t, completed: newCompletedToday.includes(taskId) };
              }
              return t;
          });
      }

      // Recalculate missedDays and failedYesterday for all tasks based on newHistory
      const historyDates = Object.keys(newHistory).map(d => new Date(d).getTime());
      const oldestHistoryDate = historyDates.length > 0 ? Math.min(...historyDates) : new Date().getTime();

      updatedHunos = updatedHunos.map(t => {
          let missedCount = 0;
          let checkDate = new Date();
          checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday
          checkDate.setHours(0, 0, 0, 0); // Normalize time
          
          while (checkDate.getTime() >= oldestHistoryDate) {
              const checkString = checkDate.toDateString();
              const completedOnCheckDate = (newHistory[checkString] || []).includes(t.id);
              
              if (completedOnCheckDate) {
                  break; // Found a day it was completed, stop counting
              } else {
                  missedCount++;
                  checkDate.setDate(checkDate.getDate() - 1);
                  checkDate.setHours(0, 0, 0, 0);
                  if (missedCount >= 30) break; // Cap at 30 days for performance
              }
          }
          
          let newPlenoCompleted = t.plenoCompleted;
          if (t.id === taskId) {
              const isNowCompleted = newCompletedToday.includes(taskId);
              if (isNowCompleted) {
                  newPlenoCompleted = true;
              } else {
                  // If unmarked, we set it to false, unless it's completed today
                  if (!t.completed) {
                      newPlenoCompleted = false;
                  }
              }
          }

          return {
              ...t,
              failedYesterday: missedCount > 0,
              missedDays: missedCount,
              plenoCompleted: newPlenoCompleted
          };
      });

      onUpdateData({
          ...data,
          hunos: updatedHunos,
          hunosHistory: newHistory
      });
  };

  const getDayLabel = () => {
      const today = new Date();

      if (currentDate.toDateString() === today.toDateString()) return 'Hoy';
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (currentDate.toDateString() === yesterday.toDateString()) return 'Ayer';

      const formatted = currentDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' });
      return formatted.replace(/,/g, '').replace(/\./g, '');
  };

  const getLocalYYYYMMDD = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  const exportJSON = () => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `el_reino_backup_${dateStr}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content) as AppData;
        
        // Basic validation to ensure it's El Reino data
        if (parsed && parsed.stats && parsed.hunos) {
            // Pasamos TODOS los objetos y arrays por la función sanitizeForFirestore
            const sanitizedData = sanitizeForFirestore(parsed);
            setImportData(sanitizedData);
        } else {
            setImportError("El archivo no parece ser una copia de seguridad válida de El Reino.");
        }
      } catch (error) {
        setImportError("Error al leer el archivo. Asegúrate de que es un archivo .json válido.");
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const confirmImport = () => {
      if (importData) {
          onUpdateData(importData);
          onClose();
      }
  };

  const exportCSV = () => {
    // Generic Header structure to fit all data types
    const headers = ['Category', 'Item/Name', 'Value/Status', 'Details/JSON', 'Timestamp/Extra'];
    const rows: (string | number)[][] = [];

    // --- META & STATS ---
    rows.push(['META', 'Last Date', data.lastDate || '', '', '']);
    rows.push(['META', 'Last Sets Reset', new Date(data.lastSetsReset).toLocaleString(), data.lastSetsReset, '']);
    rows.push(['META', 'Last Trains Reset', new Date(data.lastTrainsReset).toLocaleString(), data.lastTrainsReset, '']);
    rows.push(['META', 'Sets Pleno Claimed', data.setsPlenoClaimed ? 'YES' : 'NO', '', '']);
    rows.push(['META', 'Trains Pleno Claimed', data.trainsPlenoClaimed ? 'YES' : 'NO', '', '']);
    
    rows.push(['STATS', 'Perfect Sets Weeks', data.stats.perfectSetsWeeks, '', '']);
    rows.push(['STATS', 'Huno Plenos', data.stats.hunoPlenos, '', '']);
    rows.push(['STATS', 'Perfect Train Months', data.stats.perfectTrainMonths, '', '']);
    rows.push(['STATS', 'Project Plenos', data.stats.projectPlenos, '', '']);
    rows.push(['STATS', 'Last Total Interactions', data.stats.lastTotalInteractions, '', '']);
    
    // History Arrays
    rows.push(['STATS HISTORY', 'Sets History', JSON.stringify(data.stats.setsHistory), '', '']);
    rows.push(['STATS HISTORY', 'Trains History', JSON.stringify(data.stats.trainsHistory), '', '']);
    rows.push(['STATS HISTORY', 'Interactions History', JSON.stringify(data.stats.interactionsHistory), '', '']);
    if (data.stats.foodHistory) {
        rows.push(['STATS HISTORY', 'Food History', JSON.stringify(data.stats.foodHistory), '', '']);
    }

    // --- HUNOS HISTORY ---
    const getHunosScore = (completedIds: string[]) => {
        let score = 0;
        completedIds.forEach(id => {
            const task = data.hunos.find(t => t.id === id);
            if (task) {
                if (task.text.includes('Leones') || task.text.includes('🦁')) score += 2;
                else if (task.text.includes('Gimnasia') || task.text.includes('Gim')) score += 1;
                else if (task.text.includes('Amor') || task.text.includes('❤️')) score += 1;
                else if (task.text.includes('Leer')) score += 1;
            }
        });
        return Math.min(score, 5);
    };

    if (data.hunosHistory) {
        Object.entries(data.hunosHistory).forEach(([date, completedIds]) => {
            const score = getHunosScore(completedIds as string[]);
            rows.push(['HUNOS HISTORY', date, (completedIds as string[]).length, JSON.stringify(completedIds), `Score: ${score}/5`]);
        });
    }
    
    // Add current day's score to history export
    const currentCompletedIds = data.hunos.filter(t => t.completed).map(t => t.id);
    const currentScore = getHunosScore(currentCompletedIds);
    rows.push(['HUNOS HISTORY', new Date().toDateString(), currentCompletedIds.length, JSON.stringify(currentCompletedIds), `Score: ${currentScore}/5 (Current)`]);

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

    // --- BILLETES & LEONES GRIDS ---
    if (data.billetesState) {
        rows.push(['GRID', 'Billetes State', JSON.stringify(data.billetesState), '', '']);
    }
    if (data.huchaCount !== undefined) {
        rows.push(['GRID', 'Hucha Count', data.huchaCount, '', '']);
    }
    if (data.leonesState) {
        rows.push(['GRID', 'Leones State', JSON.stringify(data.leonesState), '', '']);
    }
    if (data.leonesCount !== undefined) {
        rows.push(['GRID', 'Leones Count', data.leonesCount, '', '']);
    }

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
    if (data.food.dishes) {
        rows.push(['FOOD', 'Dishes State', JSON.stringify(data.food.dishes), '', '']);
    }
    
    // Food History
    data.food.history.forEach(h => {
        rows.push(['FOOD HISTORY', h.action, h.delta, '', new Date(h.timestamp).toLocaleString()]);
    });

    // --- REMINDERS ---
    if (data.reminders) {
        data.reminders.forEach(r => {
            const details = JSON.stringify({ 
                yearly: r.notifyYearly, 
                monthly: r.notifyMonthly, 
                days100: r.notify100Days, 
                hideAge: r.hideAge 
            });
            rows.push(['REMINDER', r.title, r.date, details, '']);
        });
    }

    // --- PIANO ---
    if (data.piano) {
        rows.push(['PIANO', 'Pieza Desafío', data.piano.piezaDesafio, '', '']);
        rows.push(['PIANO', 'Pieza Consolidación', data.piano.piezaConsolidacion, '', '']);
        rows.push(['PIANO', 'Pieza Lectura', data.piano.piezaLectura, '', '']);
        rows.push(['PIANO', 'Henle Level', data.piano.henleLevel, '', '']);
        rows.push(['PIANO', 'Checklist', JSON.stringify(data.piano.checklist), '', '']);
        if (data.piano.currentScaleIndex !== undefined) {
            rows.push(['PIANO', 'Current Scale Index', data.piano.currentScaleIndex, '', '']);
        }
        if (data.piano.sesionesDesafio !== undefined) {
            rows.push(['PIANO', 'Sesiones Desafío', data.piano.sesionesDesafio, '', '']);
        }
        if (data.piano.sesionesConsolidacion !== undefined) {
            rows.push(['PIANO', 'Sesiones Consolidación', data.piano.sesionesConsolidacion, '', '']);
        }
        if (data.piano.scaleExercises) {
            rows.push(['PIANO', 'Scale Exercises', JSON.stringify(data.piano.scaleExercises), '', '']);
        }
        if (data.piano.hanonExercise !== undefined) {
            rows.push(['PIANO', 'Hanon Exercise', data.piano.hanonExercise, '', '']);
        }
    }

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
    <div className="fixed inset-0 max-w-md mx-auto z-50 bg-stone-950 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
       <div className="p-4 bg-stone-900 shadow-sm flex items-center gap-4 border-b border-stone-800">
            <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-full">
                <ArrowLeft className="w-6 h-6 text-purple-400" />
            </button>
            <h2 className="text-xl font-bold text-stone-200 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                Edición Retroactiva
            </h2>
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
                
                <div className="text-center relative">
                    <div className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-1">
                        Editando
                    </div>
                    <div className="text-xl font-bold text-stone-100 flex items-center justify-center gap-2 relative">
                        <input 
                            type="date" 
                            value={getLocalYYYYMMDD(currentDate)}
                            max={getLocalYYYYMMDD(new Date())}
                            onChange={(e) => {
                                if (e.target.value) {
                                    const [year, month, day] = e.target.value.split('-').map(Number);
                                    const newDate = new Date(year, month - 1, day);
                                    if (newDate <= new Date()) {
                                        setCurrentDate(newDate);
                                    }
                                }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
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
                                className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                                    isCompleted 
                                        ? 'bg-purple-900/20 border-purple-500/50' 
                                        : 'bg-stone-900 border-stone-800 hover:border-stone-700'
                                }`}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div 
                                        onClick={() => toggleTaskHistory(task.id)}
                                        className="flex-1 cursor-pointer py-1"
                                    >
                                        <span className={`text-sm font-medium ${isCompleted ? 'text-purple-200' : 'text-stone-400'}`}>
                                            {task.text}
                                        </span>
                                    </div>
                                </div>
                                <div 
                                    onClick={() => toggleTaskHistory(task.id)}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
                                        isCompleted 
                                            ? 'bg-purple-500 border-purple-500' 
                                            : 'border-stone-600'
                                    }`}
                                >
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
               <h3 className="font-bold text-stone-300 uppercase text-xs tracking-wider px-2">Plenos</h3>
               
               <div className="grid grid-cols-1 gap-3">
                   <div className="flex items-center justify-between bg-stone-900 p-3 rounded-xl border border-stone-800">
                       <span className="font-bold text-stone-200 text-sm">Trenes</span>
                       <div className="flex items-center gap-3">
                           <button onClick={() => adjustStat('perfectTrainMonths', -1)} className="p-1 bg-stone-800 rounded hover:bg-stone-700"><Minus className="w-4 h-4" /></button>
                           <span className="font-mono w-8 text-center">{data.stats.perfectTrainMonths}</span>
                           <button onClick={() => adjustStat('perfectTrainMonths', 1)} className="p-1 bg-stone-800 rounded hover:bg-stone-700"><Plus className="w-4 h-4" /></button>
                       </div>
                   </div>
                   
                   <div className="flex items-center justify-between bg-stone-900 p-3 rounded-xl border border-stone-800">
                       <span className="font-bold text-stone-200 text-sm">Setas</span>
                       <div className="flex items-center gap-3">
                           <button onClick={() => adjustStat('perfectSetsWeeks', -1)} className="p-1 bg-stone-800 rounded hover:bg-stone-700"><Minus className="w-4 h-4" /></button>
                           <span className="font-mono w-8 text-center">{data.stats.perfectSetsWeeks}</span>
                           <button onClick={() => adjustStat('perfectSetsWeeks', 1)} className="p-1 bg-stone-800 rounded hover:bg-stone-700"><Plus className="w-4 h-4" /></button>
                       </div>
                   </div>

                   <div className="flex items-center justify-between bg-stone-900 p-3 rounded-xl border border-stone-800">
                       <span className="font-bold text-stone-200 text-sm">Hunos</span>
                       <div className="flex items-center gap-3">
                           <button onClick={() => adjustStat('hunoPlenos', -1)} className="p-1 bg-stone-800 rounded hover:bg-stone-700"><Minus className="w-4 h-4" /></button>
                           <span className="font-mono w-8 text-center">{data.stats.hunoPlenos}</span>
                           <button onClick={() => adjustStat('hunoPlenos', 1)} className="p-1 bg-stone-800 rounded hover:bg-stone-700"><Plus className="w-4 h-4" /></button>
                       </div>
                   </div>
                   
                   <div className="flex items-center justify-between bg-stone-900 p-3 rounded-xl border border-stone-800">
                       <span className="font-bold text-stone-200 text-sm">Proyectos</span>
                       <div className="flex items-center gap-3">
                           <button onClick={() => adjustStat('projectPlenos', -1)} className="p-1 bg-stone-800 rounded hover:bg-stone-700"><Minus className="w-4 h-4" /></button>
                           <span className="font-mono w-8 text-center">{data.stats.projectPlenos}</span>
                           <button onClick={() => adjustStat('projectPlenos', 1)} className="p-1 bg-stone-800 rounded hover:bg-stone-700"><Plus className="w-4 h-4" /></button>
                       </div>
                   </div>
               </div>
           </div>

           {/* Export Data Section (Moved from Settings) */}
           <div className="pt-6 border-t border-stone-800">
               <h3 className="font-bold text-stone-300 uppercase text-xs tracking-wider mb-3 px-2">Gestión de Datos</h3>
               <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 space-y-4">
                   <div>
                       <h3 className="font-bold text-stone-300 mb-2 flex items-center gap-2">
                           <Download className="w-5 h-5" /> Exportar Datos
                       </h3>
                       <p className="text-sm text-stone-500 mb-4">Descarga tu historial completo. El CSV es para leerlo en Excel, el JSON es para restaurar la aplicación.</p>
                       <div className="grid grid-cols-2 gap-3">
                           <button onClick={exportCSV} className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 px-4 py-3 rounded-lg text-sm font-medium border border-stone-700 transition-colors">
                               Copia CSV (Lectura)
                           </button>
                           <button onClick={exportJSON} className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 px-4 py-3 rounded-lg text-sm font-medium border border-stone-700 transition-colors">
                               Copia JSON (Restaurar)
                           </button>
                       </div>
                   </div>

                   <div className="pt-4 border-t border-stone-800">
                       <h3 className="font-bold text-stone-300 mb-2 flex items-center gap-2">
                           <Upload className="w-5 h-5" /> Importar Datos
                       </h3>
                       <p className="text-sm text-stone-500 mb-4">Restaura una copia de seguridad (.json) para recuperar tu progreso.</p>
                       
                       {importError && (
                           <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
                               {importError}
                           </div>
                       )}

                       {importData ? (
                           <div className="mb-4 p-4 bg-orange-900/30 border border-orange-500/50 rounded-lg">
                               <p className="text-orange-200 text-sm mb-3 font-medium">¿Estás seguro de sobreescribir todos tus datos actuales con esta copia de seguridad? Esta acción no se puede deshacer.</p>
                               <div className="flex gap-3">
                                   <button onClick={confirmImport} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                       Sí, Restaurar
                                   </button>
                                   <button onClick={() => setImportData(null)} className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                       Cancelar
                                   </button>
                               </div>
                           </div>
                       ) : (
                           <label className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 px-4 py-3 rounded-lg text-sm font-medium border border-stone-700 transition-colors cursor-pointer flex items-center justify-center">
                               <span>Seleccionar archivo .JSON</span>
                               <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                           </label>
                       )}
                   </div>
               </div>
           </div>

       </div>
    </div>
  );
};