import React, { useState } from 'react';
import { AppData } from '../types';
import { sanitizeForFirestore } from '../App';
import { X, Minus, Plus, ShieldCheck, ChevronLeft, ChevronRight, Calendar, Download, Upload, ArrowLeft, Activity, Bell, Sparkles } from 'lucide-react';
import { useModalHistory } from '../hooks/useModalHistory';

interface HistoryEditorModalProps {
  data: AppData;
  onUpdateData: (data: AppData) => void;
  onClose: () => void;
  initialDate?: Date;
  onTriggerTelon?: () => void;
}

export const HistoryEditorModal: React.FC<HistoryEditorModalProps> = ({ data, onUpdateData, onClose, initialDate, onTriggerTelon }) => {
  useModalHistory(true, onClose);

  const [currentDate, setCurrentDate] = useState(() => {
    if (initialDate) return new Date(initialDate);
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  });
  const [importData, setImportData] = useState<AppData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showSebastianModal, setShowSebastianModal] = useState(false);
  const [tempInstructions, setTempInstructions] = useState(data.sebastianInstructions || '');
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  // Helper to get formatted key for storage (YYYY-MM-DD) which matches toDateString format used in App.tsx
  const getFormattedDateKey = (date: Date) => {
      return date.toDateString();
  };

  const getEmoji = (text: string) => {
    const match = text.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u);
    return match ? match[0] : '❓';
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

  const updateEnergyHistory = (val: number) => {
    const dateKey = getFormattedDateKey(currentDate);
    const newEnergyHistory = { 
        ...(data.energyHistory || {}),
        [dateKey]: val 
    };

    // If editing today, also update the main energy state
    const todayString = new Date().toDateString();
    let updatedEnergy = data.energy;
    if (dateKey === todayString) {
        updatedEnergy = val;
    }

    onUpdateData({
        ...data,
        energy: updatedEnergy,
        energyHistory: newEnergyHistory
    });
  };

  const isToday = getFormattedDateKey(currentDate) === new Date().toDateString();
  const currentEnergyValue = isToday 
      ? (data.energy || 1) 
      : ((data.energyHistory || {})[getFormattedDateKey(currentDate)] || 1);

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

    // --- RESOURCES (ROBLE & LEONES) ---
    data.forjas.forEach(t => {
        rows.push(['ROBLE', t.name, t.current, `Target: ${t.target} ${t.unit}`, '']);
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
                
                {(() => {
                    const filteredHunos = data.hunos.filter(t => t.text !== 'GAP');
                    const renderTask = (task: any) => {
                        const isCompleted = completedIds.includes(task.id);
                        return (
                            <button
                                key={task.id}
                                onClick={() => toggleTaskHistory(task.id)}
                                className={`aspect-[2/1] rounded-xl border-2 text-2xl flex items-center justify-center transition-all duration-300 ${
                                    isCompleted 
                                        ? 'bg-purple-600 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-105' 
                                        : 'bg-stone-950 border-stone-800 hover:border-stone-700 text-stone-500 grayscale opacity-70 hover:opacity-100'
                                }`}
                            >
                                <span className={isCompleted ? 'grayscale-0' : 'grayscale'}>{getEmoji(task.text)}</span>
                            </button>
                        );
                    };

                    return (
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-3">
                                {filteredHunos.slice(0, 4).map(renderTask)}
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                {filteredHunos.slice(4, 15).map(renderTask)}
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                {filteredHunos.slice(15).map(renderTask)}
                            </div>
                        </div>
                    );
                })()}

                <div className="flex flex-col items-center pt-4">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                        Día Revisado (Racha)
                    </span>
                    <div 
                        onClick={() => {
                            const newReviewed = { ...(data.streakReviewedDays || {}) };
                            if (newReviewed[dateKey]) {
                                delete newReviewed[dateKey];
                            } else {
                                newReviewed[dateKey] = true;
                            }
                            onUpdateData({ ...data, streakReviewedDays: newReviewed });
                        }}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                            data.streakReviewedDays?.[dateKey]
                                ? 'bg-purple-500 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                : 'bg-stone-900 border-stone-700 hover:border-stone-600'
                        }`}
                    >
                        {data.streakReviewedDays?.[dateKey] && <div className="w-3 h-3 bg-white rounded-full" />}
                    </div>
                </div>
                 {/* Energy Adjuster for Selected Date - Integrated into Hunos section */}
                 <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between px-2">
                          <h3 className="font-bold text-stone-300 uppercase text-xs tracking-wider flex items-center gap-2">
                              <Activity className="w-4 h-4 text-orange-400" /> Energía del día
                          </h3>
                          <div className="px-3 py-1 bg-stone-950 rounded-full border border-stone-800">
                              <span className="text-sm font-black text-orange-500 font-mono">
                                  {currentEnergyValue} / 10
                              </span>
                          </div>
                      </div>

                      <div className="px-2">
                         <div className="relative h-12 flex items-center group/slider">
                              {/* Track */}
                              <div className="absolute inset-0 h-2 my-auto bg-stone-950 rounded-full border border-stone-800 overflow-hidden">
                                  <div 
                                      className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-red-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all duration-300 ease-out"
                                      style={{ width: `${((currentEnergyValue - 1) / 9) * 100}%` }}
                                  />
                              </div>
                              
                              {/* Ticks */}
                              <div className="absolute inset-0 flex justify-between px-1 items-center pointer-events-none">
                                  {Array.from({ length: 10 }).map((_, i) => (
                                      <div 
                                          key={i} 
                                          className={`w-0.5 h-1.5 rounded-full transition-colors duration-500 ${(i + 1) <= currentEnergyValue ? 'bg-white/20' : 'bg-stone-800'}`} 
                                      />
                                  ))}
                              </div>

                              {/* Input Slider */}
                              <input 
                                  type="range"
                                  min="1"
                                  max="10"
                                  step="1"
                                  value={currentEnergyValue}
                                  onChange={(e) => updateEnergyHistory(parseInt(e.target.value))}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                              />

                              {/* Thumb */}
                              <div 
                                  className="absolute w-8 h-8 rounded-full bg-stone-100 border-4 border-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.6)] pointer-events-none z-10 transition-all duration-300 ease-out group-active/slider:scale-110"
                                  style={{ 
                                      left: `calc(${(currentEnergyValue - 1) / 9 * 100}% - 16px)`,
                                      transition: 'left 0.1s ease-out, transform 0.2s ease'
                                  }}
                              >
                                  <div className="absolute inset-0 m-auto w-1 h-3 bg-orange-600/30 rounded-full" />
                              </div>
                          </div>
                      </div>
                 </div>
           </div>

            {onTriggerTelon && (
              <div className="mt-4 mb-6 px-2">
                <button
                  type="button"
                  onClick={onTriggerTelon}
                  className="w-full py-3 rounded-xl border border-amber-900/30 text-amber-500 hover:bg-amber-950/20 active:scale-95 font-bold transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Disparar Telón
                </button>
              </div>
            )}

            <div className="pt-6 border-t border-stone-800">
                <h3 className="font-bold text-stone-300 uppercase text-xs tracking-wider mb-3 px-2">Recordatorio</h3>
                <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-purple-400" />
                            <span className="font-bold text-stone-200 text-sm">Hora diaria</span>
                        </div>
                        <input 
                            type="time" 
                            value={data.reminderTime || '07:00'}
                            onChange={(e) => onUpdateData({ ...data, reminderTime: e.target.value })}
                            className="bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-purple-500 font-mono"
                        />
                    </div>
                    
                    <button 
                        onClick={() => {
                            if (!('Notification' in window)) {
                                alert("Tu navegador no soporta notificaciones.");
                                return;
                            }
                            Notification.requestPermission().then(permission => {
                                if (permission === "granted") {
                                    new Notification("¡El Reino!", { body: "Notificaciones activadas correctamente." });
                                }
                            });
                        }}
                        className="w-full py-3 rounded-xl border border-purple-900/30 text-purple-400 hover:bg-purple-950/20 font-bold transition-all text-sm uppercase tracking-wider"
                    >
                        Solicitar Permiso de Notificaciones
                    </button>
                    <p className="text-[10px] text-stone-500 text-center italic">
                        Recibirás un aviso cada día a esta hora para no olvidar tus hábitos.
                    </p>
                </div>
            </div>

            {/* Directrices para Sebastian (IA) */}
            <div className="pt-6 border-t border-stone-800">
                <h3 className="font-bold text-stone-300 uppercase text-xs tracking-wider mb-3 px-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Directrices de Sebastian (IA)
                </h3>
                <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 space-y-4">
                    <p className="text-xs text-stone-400 leading-relaxed">
                        Indica reglas generales o preferencias para que tu mayordomo las tenga en cuenta al elegir tu tarea según tu energía.
                    </p>
                    
                    {data.sebastianInstructions ? (
                        <div className="text-xs text-stone-300 bg-stone-950 p-3.5 rounded-xl border border-stone-850 italic max-h-20 overflow-y-auto leading-relaxed">
                            "{data.sebastianInstructions}"
                        </div>
                    ) : (
                        <p className="text-xs text-stone-500 italic px-1">No hay directrices configuradas aún.</p>
                    )}

                    <button 
                        onClick={() => {
                            setTempInstructions(data.sebastianInstructions || '');
                            setShowSebastianModal(true);
                        }}
                        className="w-full py-3 bg-amber-950/20 border border-amber-900/40 text-amber-400 rounded-xl hover:bg-amber-900/30 font-bold transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98"
                    >
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Editar Directrices
                    </button>
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

        {/* Modal a pantalla completa para editar directrices de Sebastian */}
        {showSebastianModal && (
            <div className="fixed inset-0 z-[60] bg-stone-950 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
                {/* Cabecera */}
                <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between border-b border-stone-800">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setShowSebastianModal(false)} 
                            className="p-2 hover:bg-stone-800 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 text-amber-400" />
                        </button>
                        <h2 className="text-lg font-bold text-stone-200 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            Directrices de Sebastian
                        </h2>
                    </div>
                    
                    {/* Confirmación visual */}
                    {showSavedNotification && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-400 bg-green-950/50 border border-green-500/30 px-3 py-1.5 rounded-full animate-pulse">
                            ¡Guardado!
                        </span>
                    )}
                </div>

                {/* Contenido / Textarea */}
                <div className="flex-1 flex flex-col p-5 space-y-4 overflow-hidden">
                    <p className="text-xs text-stone-400 leading-relaxed shrink-0">
                        Indica reglas generales o preferencias para tu mayordomo Sebastian. Las tendrá en cuenta al elegir tu tarea diaria según tu energía.
                    </p>
                    
                    <textarea
                        value={tempInstructions}
                        onChange={(e) => setTempInstructions(e.target.value)}
                        placeholder="Ejemplo: Si mi energía es < 5, prioriza las tareas rápidas y evita las de Yunque Largas. Los viernes prefiere tareas creativas..."
                        className="flex-1 w-full bg-stone-900/60 border border-stone-800 rounded-2xl p-4 text-stone-100 text-base focus:outline-none focus:border-amber-500 font-sans resize-none transition-all placeholder:text-stone-600 shadow-inner leading-relaxed"
                    />
                    
                    <button
                        onClick={() => {
                            onUpdateData({
                                ...data,
                                sebastianInstructions: tempInstructions
                            });
                            setShowSavedNotification(true);
                            setTimeout(() => {
                                setShowSavedNotification(false);
                                setShowSebastianModal(false);
                            }, 1200);
                        }}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-600 text-stone-950 font-black text-sm uppercase tracking-widest italic hover:scale-[1.01] active:scale-95 transition-all shadow-lg shadow-amber-950/20 shrink-0"
                    >
                        Guardar Directrices
                    </button>
                </div>
            </div>
        )}
     </div>
  );
};