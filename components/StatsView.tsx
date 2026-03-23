import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Friend } from '../types';
import { ArrowLeft, Trophy, Flame, Target, Train, Heart, Dumbbell, Utensils, MessageCircle, Star, Sword, Timer, Settings, X, ChevronDown } from 'lucide-react';

interface StatsViewProps {
  data: AppData;
  onBack: () => void;
}

const MushroomIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 10C2 13.5 4.5 16 8 16V20C8 21.1 8.9 22 10 22H14C15.1 22 16 21.1 16 20V16C19.5 16 22 13.5 22 10C22 6.48 17.52 2 12 2ZM12 4C14.5 4 16.5 6 16.5 6C16.5 6 15 8 12 8C9 8 7.5 6 7.5 6C7.5 6 9.5 4 12 4Z" />
  </svg>
);

export const StatsView: React.FC<StatsViewProps> = ({ data, onBack }) => {
  const { stats, exercise, food, friends, sets, trains } = data;

  const [showHunosModal, setShowHunosModal] = useState(false);
  const [hunosTimeframe, setHunosTimeframe] = useState<'mes' | 'año' | 'siempre'>('mes');
  const [hunosSelectedPeriod, setHunosSelectedPeriod] = useState<string>('');
  const [viewingHistoryForTask, setViewingHistoryForTask] = useState<string | null>(null);
  const [taskHistoryTimeframe, setTaskHistoryTimeframe] = useState<'mes' | '60dias' | '90dias' | 'año' | 'siempre'>('mes');
  const [taskHistoryPeriod, setTaskHistoryPeriod] = useState<string>('');

  const { availableMonths, availableYears, monthsList, yearsList } = useMemo(() => {
    const months = new Set<string>();
    const years = new Set<string>();
    
    Object.keys(data.hunosHistory || {}).forEach(dateStr => {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.add(monthStr);
        years.add(d.getFullYear().toString());
      }
    });
    
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    months.add(currentMonthStr);
    years.add(now.getFullYear().toString());

    return {
      availableMonths: months,
      availableYears: years,
      monthsList: Array.from(months).sort().reverse(),
      yearsList: Array.from(years).sort().reverse()
    };
  }, [data.hunosHistory]);

  useEffect(() => {
    if (hunosTimeframe === 'mes' && (!hunosSelectedPeriod || !availableMonths.has(hunosSelectedPeriod))) {
      setHunosSelectedPeriod(monthsList[0] || '');
    } else if (hunosTimeframe === 'año' && (!hunosSelectedPeriod || !availableYears.has(hunosSelectedPeriod))) {
      setHunosSelectedPeriod(yearsList[0] || '');
    }
  }, [hunosTimeframe, monthsList, yearsList, hunosSelectedPeriod, availableMonths, availableYears]);

  const formatMonth = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const formatted = date.toLocaleDateString('es-ES', { month: 'long', year: '2-digit' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const getEmoji = (text: string) => {
    const match = text.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u);
    return match ? match[0] : text.substring(0, 2);
  };

  const hunoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    data.hunos.forEach(h => {
      counts[h.id] = 0;
    });

    Object.entries(data.hunosHistory || {}).forEach(([dateStr, completedIds]) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      
      let include = false;
      if (hunosTimeframe === 'siempre') {
        include = true;
      } else if (hunosTimeframe === 'año') {
        include = d.getFullYear().toString() === hunosSelectedPeriod;
      } else if (hunosTimeframe === 'mes') {
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        include = mStr === hunosSelectedPeriod;
      }

      if (include) {
        completedIds.forEach(id => {
          counts[id] = (counts[id] || 0) + 1;
        });
      }
    });

    return data.hunos.map(h => ({
      ...h,
      count: counts[h.id] || 0
    })).sort((a, b) => b.count - a.count);
  }, [data.hunos, data.hunosHistory, hunosTimeframe, hunosSelectedPeriod]);

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const renderHistoryBar = (value: number, max: number, colorClass: string, isCurrent: boolean = false, hideText: boolean = false) => {
    const height = max === 0 ? 0 : (value / max) * 100;
    return (
      <div className="flex-1 flex flex-col items-center gap-1 group">
        <div className="flex-1 w-full flex items-end bg-stone-950/40 rounded-t-sm">
          <div 
            className={`w-full rounded-t-sm transition-all duration-700 ${colorClass} ${isCurrent ? 'opacity-100 shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'opacity-60'}`} 
            style={{ height: `${Math.max(5, height)}%` }}
          ></div>
        </div>
        {!hideText && <span className={`text-[8px] font-mono ${isCurrent ? 'text-white font-bold' : 'text-stone-600'} group-hover:text-stone-400`}>{value}</span>}
        {hideText && <span className={`text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity ${isCurrent ? 'text-white font-bold' : 'text-stone-600'}`}>{value}</span>}
      </div>
    );
  };

  // Logic for 10-week set evolution
  const currentSetCount = sets.filter(t => t.completed).length;
  const setsHistoryToDisplay = [...stats.setsHistory.slice(-9), currentSetCount];
  const paddedSetsHistory = Array(Math.max(0, 10 - setsHistoryToDisplay.length)).fill(0).concat(setsHistoryToDisplay);
  const setsMax = sets.length || 8;

  // Logic for 6-month train evolution
  const currentTrainCount = trains.filter(t => t.completed).length;
  const trainsHistoryToDisplay = [...stats.trainsHistory.slice(-5), currentTrainCount];
  const paddedTrainsHistory = Array(Math.max(0, 6 - trainsHistoryToDisplay.length)).fill(0).concat(trainsHistoryToDisplay);
  const trainsMax = trains.length || 37;

  // Logic for 6-month interaction evolution
  const calculateTotalInteractions = (friendsList: Friend[]) => {
      return friendsList.reduce((acc, friend) => {
          const interactions = (Object.values(friend.interactions || {}) as number[]).reduce((a, b) => a + b, 0);
          return acc + interactions;
      }, 0);
  };
  const currentTotal = calculateTotalInteractions(friends);
  const currentMonthInteractions = Math.max(0, currentTotal - (stats.lastTotalInteractions || 0));
  const interactionsHistoryToDisplay = [...stats.interactionsHistory.slice(-5), currentMonthInteractions];
  const paddedInteractionsHistory = Array(Math.max(0, 6 - interactionsHistoryToDisplay.length)).fill(0).concat(interactionsHistoryToDisplay);
  const interactionsMax = Math.max(...paddedInteractionsHistory, 10); // Floor of 10 for better scaling

  // Logic for 30-day Hunos evolution
  const getCoreScoreForIds = (completedIds: string[]) => {
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

  const hunosHistoryToDisplay: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toDateString();
    
    if (i === 0) {
      const currentCompletedIds = data.hunos.filter(t => t.completed).map(t => t.id);
      hunosHistoryToDisplay.push(getCoreScoreForIds(currentCompletedIds));
    } else {
      const pastCompletedIds = (data.hunosHistory || {})[dateKey] || [];
      hunosHistoryToDisplay.push(getCoreScoreForIds(pastCompletedIds));
    }
  }
  const hunosMax = 5;

  // Logic for 10-week food evolution
  const currentFoodScore = food.score;
  const foodHistoryToDisplay = [...(stats.foodHistory || []).slice(-9), currentFoodScore];
  const paddedFoodHistory = Array(Math.max(0, 10 - foodHistoryToDisplay.length)).fill(0).concat(foodHistoryToDisplay);
  const foodMax = 50; // Max score is 50

  const getFormattedDateKey = (date: Date) => {
      return date.toDateString();
  };

  const renderTaskHistoryModal = () => {
      if (!viewingHistoryForTask) return null;
      
      const task = data.hunos.find(t => t.id === viewingHistoryForTask);
      if (!task) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let firstDate = new Date();
      const taskHistoryDates = Object.entries(data.hunosHistory || {})
        .filter(([_, ids]) => ids.includes(task.id))
        .map(([d, _]) => new Date(d).getTime())
        .filter(t => !isNaN(t));
        
      if (taskHistoryDates.length > 0) {
        firstDate = new Date(Math.min(...taskHistoryDates));
      }
      const firstMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);

      // Compute available periods based on taskHistoryTimeframe
      const periods = [];
      if (taskHistoryTimeframe === 'mes') {
        let currentD = new Date(today.getFullYear(), today.getMonth(), 1);
        while (currentD >= firstMonth) {
          periods.push({
            label: currentD.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
            value: `${currentD.getFullYear()}-${currentD.getMonth()}`
          });
          currentD.setMonth(currentD.getMonth() - 1);
        }
      } else if (taskHistoryTimeframe === '60dias') {
        let currentD = new Date(today.getFullYear(), today.getMonth(), 1);
        while (currentD >= firstMonth) {
          const d1 = new Date(currentD.getFullYear(), currentD.getMonth() - 1, 1);
          const m1 = d1.toLocaleDateString('es-ES', { month: 'short' });
          const m2 = currentD.toLocaleDateString('es-ES', { month: 'short' });
          periods.push({
            label: `${m1}-${m2} ${currentD.getFullYear()}`,
            value: `${currentD.getFullYear()}-${currentD.getMonth()}`
          });
          currentD.setMonth(currentD.getMonth() - 1);
        }
      } else if (taskHistoryTimeframe === '90dias') {
        let currentD = new Date(today.getFullYear(), today.getMonth(), 1);
        while (currentD >= firstMonth) {
          const d1 = new Date(currentD.getFullYear(), currentD.getMonth() - 2, 1);
          const m1 = d1.toLocaleDateString('es-ES', { month: 'short' });
          const m3 = currentD.toLocaleDateString('es-ES', { month: 'short' });
          periods.push({
            label: `${m1}-${m3} ${currentD.getFullYear()}`,
            value: `${currentD.getFullYear()}-${currentD.getMonth()}`
          });
          currentD.setMonth(currentD.getMonth() - 3);
        }
      } else if (taskHistoryTimeframe === 'año') {
        let currentYear = today.getFullYear();
        const firstYear = firstDate.getFullYear();
        while (currentYear >= firstYear) {
          periods.push({
            label: `${currentYear}`,
            value: `${currentYear}`
          });
          currentYear--;
        }
      }

      if (periods.length === 0 && taskHistoryTimeframe !== 'siempre') {
        if (taskHistoryTimeframe === 'año') {
          periods.push({ label: `${today.getFullYear()}`, value: `${today.getFullYear()}` });
        } else {
          periods.push({
            label: today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
            value: `${today.getFullYear()}-${today.getMonth()}`
          });
        }
      }

      const currentPeriodValue = periods.find(p => p.value === taskHistoryPeriod) ? taskHistoryPeriod : (periods[0]?.value || '');

      const historyDays = [];
      let completedCount = 0;
      let totalDaysInPeriod = 0;
      let gridType: 'calendar' | 'proportional' = 'calendar';
      let periodLabelText = '';

      if (taskHistoryTimeframe === 'siempre') {
        gridType = 'proportional';
        totalDaysInPeriod = Math.max(1, Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        
        Object.values(data.hunosHistory || {}).forEach(ids => {
          if (ids.includes(task.id)) completedCount++;
        });

        const percentage = completedCount / totalDaysInPeriod;
        const cellsToFill = Math.round(49 * percentage);
        for (let i = 0; i < 49; i++) {
          historyDays.push({
            isCompleted: i < cellsToFill,
            isToday: false,
            isFuture: false,
            isInPeriod: true,
            date: null
          });
        }
        periodLabelText = 'desde siempre';
      } else {
        let startDate = new Date();
        let endDate = new Date();
        
        if (taskHistoryTimeframe === 'mes' || taskHistoryTimeframe === '60dias' || taskHistoryTimeframe === '90dias') {
          const [yearStr, monthStr] = currentPeriodValue.split('-');
          const year = parseInt(yearStr, 10);
          const month = parseInt(monthStr, 10);
          
          endDate = new Date(year, month + 1, 0); // Last day of the month
          
          if (taskHistoryTimeframe === 'mes') {
            startDate = new Date(year, month, 1);
            periodLabelText = `en ${periods.find(p => p.value === currentPeriodValue)?.label.toLowerCase() || 'este mes'}`;
          } else if (taskHistoryTimeframe === '60dias') {
            startDate = new Date(year, month - 1, 1);
            periodLabelText = `en el periodo ${periods.find(p => p.value === currentPeriodValue)?.label.toLowerCase() || 'seleccionado'}`;
          } else if (taskHistoryTimeframe === '90dias') {
            startDate = new Date(year, month - 2, 1);
            periodLabelText = `en el periodo ${periods.find(p => p.value === currentPeriodValue)?.label.toLowerCase() || 'seleccionado'}`;
          }
        } else if (taskHistoryTimeframe === 'año') {
          const year = parseInt(currentPeriodValue, 10);
          startDate = new Date(year, 0, 1);
          endDate = new Date(year, 11, 31);
          periodLabelText = `en ${year}`;
        }

        let gridStartDate = new Date(startDate);
        gridStartDate.setDate(startDate.getDate() - startDate.getDay()); // Pad to Sunday
        
        let gridEndDate = new Date(endDate);
        if (gridEndDate.getDay() !== 6) {
          gridEndDate.setDate(gridEndDate.getDate() + (6 - gridEndDate.getDay())); // Pad to Saturday
        }

        let currentD = new Date(gridStartDate);
        while (currentD <= gridEndDate) {
            const dKey = getFormattedDateKey(currentD);
            const dCompletedIds = (data.hunosHistory || {})[dKey] || [];
            const isCompleted = dCompletedIds.includes(task.id);
            
            const isToday = currentD.getTime() === today.getTime();
            const isFuture = currentD.getTime() > today.getTime();
            const isInPeriod = currentD >= startDate && currentD <= endDate;

            if (isInPeriod && !isFuture) {
              totalDaysInPeriod++;
              if (isCompleted) completedCount++;
            }
            
            historyDays.push({ 
              date: new Date(currentD), 
              isCompleted, 
              isToday, 
              isFuture,
              isInPeriod
            });
            
            currentD.setDate(currentD.getDate() + 1);
        }
      }

      const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
      const monthCounts = [0, 0, 0, 0, 0, 0];
      const monthNames = ['', '', '', '', '', ''];
      
      const currentMonthDate = new Date();
      for (let i = 5; i >= 0; i--) {
          const d = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - i, 1);
          monthNames[5 - i] = d.toLocaleDateString('es-ES', { month: 'short' }).substring(0, 3).toUpperCase();
      }

      Object.entries(data.hunosHistory || {}).forEach(([dateStr, ids]) => {
          if (ids.includes(task.id)) {
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) {
                  dayOfWeekCounts[d.getDay()]++;
                  
                  const monthDiff = (currentMonthDate.getFullYear() - d.getFullYear()) * 12 + (currentMonthDate.getMonth() - d.getMonth());
                  if (monthDiff >= 0 && monthDiff < 6) {
                      monthCounts[5 - monthDiff]++;
                  }
              }
          }
      });
      const maxDayCount = Math.max(...dayOfWeekCounts, 1);
      const maxMonthCount = Math.max(...monthCounts, 1);
      const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

      return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
                  <button 
                      onClick={() => setViewingHistoryForTask(null)}
                      className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-full transition-colors"
                  >
                      <X className="w-5 h-5" />
                  </button>
                  
                  <div className="relative mb-2 pr-10">
                      <select 
                          value={task.id}
                          onChange={(e) => setViewingHistoryForTask(e.target.value)}
                          className="text-xl font-bold text-stone-200 bg-transparent appearance-none cursor-pointer focus:outline-none w-full truncate pr-6"
                      >
                          {data.hunos.map(huno => (
                              <option key={huno.id} value={huno.id} className="text-base bg-stone-900 text-stone-200">
                                  {huno.text}
                              </option>
                          ))}
                      </select>
                      <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                          <ChevronDown className="w-5 h-5" />
                      </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex bg-stone-950 rounded-lg p-1">
                      {[
                        { value: 'mes', label: 'mes' },
                        { value: '60dias', label: '60' },
                        { value: '90dias', label: '90' },
                        { value: 'año', label: 'año' },
                        { value: 'siempre', label: 'siempre' }
                      ].map(tf => (
                        <button
                          key={tf.value}
                          onClick={() => setTaskHistoryTimeframe(tf.value as any)}
                          className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${taskHistoryTimeframe === tf.value ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-300'}`}
                        >
                          {tf.label}
                        </button>
                      ))}
                    </div>

                    {taskHistoryTimeframe !== 'siempre' && (
                      <select 
                        value={currentPeriodValue}
                        onChange={(e) => setTaskHistoryPeriod(e.target.value)}
                        className="bg-stone-800 border border-stone-700 text-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                      >
                        {periods.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <p className="text-stone-400 text-sm mb-6">
                      Cumplido <strong className="text-purple-400">{completedCount}</strong> veces {periodLabelText} (<strong className="text-purple-400">{totalDaysInPeriod > 0 ? Math.round((completedCount / totalDaysInPeriod) * 100) : 0}%</strong>)
                  </p>
                  
                  <div className="grid grid-cols-7 gap-3 justify-items-center mx-auto max-w-[220px] mb-8">
                      {historyDays.map((day, idx) => (
                          <div 
                              key={idx}
                              title={day.date ? day.date.toLocaleDateString() : ''}
                              className={`w-3.5 h-3.5 rounded-full ${
                                  day.isToday 
                                      ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]' 
                                      : !day.isInPeriod || day.isFuture
                                          ? 'bg-stone-800/30 border border-stone-800'
                                          : day.isCompleted 
                                              ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]' 
                                              : 'bg-stone-800'
                              }`}
                          />
                      ))}
                  </div>

                  <div className="pt-6 border-t border-stone-800">
                      <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-4 text-center">Frecuencia por día</h4>
                      <div className="flex justify-between items-end h-24 gap-2">
                          {dayOfWeekCounts.map((count, idx) => {
                              const height = maxDayCount === 0 ? 0 : (count / maxDayCount) * 100;
                              return (
                                  <div key={idx} className="flex flex-col items-center gap-1 flex-1 h-full">
                                      <span className="text-[10px] font-bold text-stone-400 min-h-[15px]">{count > 0 ? count : ''}</span>
                                      <div className="w-full bg-stone-800 rounded-t-sm relative flex-1 flex items-end">
                                          <div 
                                              className="w-full bg-purple-500 rounded-t-sm transition-all duration-500"
                                              style={{ height: `${height}%` }}
                                          />
                                      </div>
                                      <span className="text-[10px] font-bold text-stone-500">{dayNames[idx]}</span>
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-stone-800">
                      <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-4 text-center">Últimos 6 meses</h4>
                      <div className="flex justify-between items-end h-24 gap-2">
                          {monthCounts.map((count, idx) => {
                              const height = maxMonthCount === 0 ? 0 : (count / maxMonthCount) * 100;
                              return (
                                  <div key={idx} className="flex flex-col items-center gap-1 flex-1 h-full">
                                      <span className="text-[10px] font-bold text-stone-400 min-h-[15px]">{count > 0 ? count : ''}</span>
                                      <div className="w-full bg-stone-800 rounded-t-sm relative flex-1 flex items-end">
                                          <div 
                                              className="w-full bg-purple-500 rounded-t-sm transition-all duration-500"
                                              style={{ height: `${height}%` }}
                                          />
                                      </div>
                                      <span className="text-[10px] font-bold text-stone-500">{monthNames[idx]}</span>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 max-w-md mx-auto z-50 bg-stone-950 flex flex-col animate-in fade-in duration-200">
      <div className="p-4 bg-stone-900 shadow-sm flex items-center gap-4 border-b border-stone-800 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-stone-400" />
        </button>
        <h1 className="text-xl font-bold text-stone-100">Estadísticas</h1>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8 pb-12">
        
        {/* LOGROS / PLENOS */}
        <section>
          <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Logros del Reino
          </h2>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-stone-900 p-3 rounded-2xl border border-blue-900/30 flex flex-col items-center justify-center gap-2">
              <Train className="w-6 h-6 text-blue-500" />
              <span className="text-2xl font-black text-white leading-none">{stats.perfectTrainMonths}</span>
            </div>
            <div className="bg-stone-900 p-3 rounded-2xl border border-red-900/30 flex flex-col items-center justify-center gap-2">
              <MushroomIcon className="w-6 h-6 text-red-500" />
              <span className="text-2xl font-black text-white leading-none">{stats.perfectSetsWeeks}</span>
            </div>
            <button onClick={() => setShowHunosModal(true)} className="bg-stone-900 p-3 rounded-2xl border border-orange-900/30 flex flex-col items-center justify-center gap-2 hover:bg-stone-800 transition-colors w-full">
              <Sword className="w-6 h-6 text-orange-500" />
              <span className="text-2xl font-black text-white leading-none">{stats.hunoPlenos}</span>
            </button>
            <div className="bg-stone-900 p-3 rounded-2xl border border-stone-800 flex flex-col items-center justify-center gap-2">
              <Settings className="w-6 h-6 text-stone-400" />
              <span className="text-2xl font-black text-white leading-none">{stats.projectPlenos}</span>
            </div>
          </div>
        </section>

        {/* CUERPO Y ACCION */}
        <section>
          <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Dumbbell className="w-4 h-4" /> Cuerpo y Esfuerzo
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-stone-900 p-3 rounded-2xl border border-emerald-900/30 flex flex-col items-center justify-center gap-2">
              <Dumbbell className="w-6 h-6 text-emerald-500" />
              <span className="text-2xl font-black text-white leading-none">
                {exercise.daysTrained + exercise.sprintCount + exercise.stretchCount}
              </span>
            </div>
            <div className="bg-stone-900 p-3 rounded-2xl border border-indigo-900/30 flex flex-col items-center justify-center gap-2">
              <Timer className="w-6 h-6 text-indigo-500" />
              <span className="text-2xl font-black text-white leading-none">
                {Math.floor((exercise.totalMinutes || 0) / 60)}h
              </span>
            </div>
          </div>
        </section>

        {/* HISTORICOS (CHARTS) */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Train className="w-4 h-4 text-blue-500" /> TRENES (6 MESES)
            </h2>
            <div className="h-24 flex gap-1 px-1">
              {paddedTrainsHistory.map((v, i) => (
                <React.Fragment key={i}>
                  {renderHistoryBar(v, trainsMax, 'bg-blue-600', i === 5)}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MushroomIcon className="w-4 h-4 text-red-500" /> SETAS (10 SEM)
            </h2>
            <div className="h-24 flex gap-1 px-1">
              {paddedSetsHistory.map((v, i) => (
                <React.Fragment key={i}>
                  {renderHistoryBar(v, setsMax, 'bg-red-600', i === 9)}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sword className="w-4 h-4 text-orange-500" /> HUNOS (30 DÍAS)
            </h2>
            <div className="h-24 flex gap-[2px] px-1">
              {hunosHistoryToDisplay.map((v, i) => (
                <React.Fragment key={i}>
                  {renderHistoryBar(v, hunosMax, 'bg-orange-600', i === 29, true)}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-lime-500" /> JUMANGIARE (10 SEM)
            </h2>
            <div className="h-24 flex gap-1 px-1">
              {paddedFoodHistory.map((v, i) => (
                <React.Fragment key={i}>
                  {renderHistoryBar(v, foodMax, 'bg-lime-600', i === 9)}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" /> BROTES (6 MESES)
            </h2>
            <div className="h-24 flex gap-1 px-1">
              {paddedInteractionsHistory.map((v, i) => (
                <React.Fragment key={i}>
                  {renderHistoryBar(v, interactionsMax, 'bg-pink-600', i === 5)}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

      </div>
      
      <p className="text-center text-[10px] text-stone-700 font-bold uppercase tracking-[0.3em] mt-8">El Reino no olvida tu esfuerzo</p>

      {showHunosModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-stone-900 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh] border border-stone-800">
            <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-950">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Sword className="w-5 h-5 text-orange-500" />
                Estadísticas de Hunos
              </h3>
              <button onClick={() => setShowHunosModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-stone-800 bg-stone-900/50 space-y-3">
              <div className="flex bg-stone-950 rounded-lg p-1">
                {(['mes', 'año', 'siempre'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setHunosTimeframe(tf)}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${hunosTimeframe === tf ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-300'}`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              
              {hunosTimeframe !== 'siempre' && (
                <select
                  value={hunosSelectedPeriod}
                  onChange={(e) => setHunosSelectedPeriod(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                >
                  {hunosTimeframe === 'mes' 
                    ? monthsList.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)
                    : yearsList.map(y => <option key={y} value={y}>{y}</option>)
                  }
                </select>
              )}
            </div>
            
            <div className="overflow-y-auto p-2 grid grid-cols-4 gap-2">
              {hunoCounts.map(huno => {
                if (huno.text === 'GAP') return null;
                return (
                  <button 
                    key={huno.id} 
                    onClick={() => setViewingHistoryForTask(huno.id)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-stone-800/30 hover:bg-stone-800/50 transition-colors gap-2 cursor-pointer"
                  >
                    <span className="text-3xl drop-shadow-sm filter">{getEmoji(huno.text)}</span>
                    <span className="font-mono font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-md min-w-[2.5rem] text-center text-sm">
                      {huno.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {renderTaskHistoryModal()}
    </div>
  );
};