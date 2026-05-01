import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Friend, ExerciseDayStats } from '../types';
import { ArrowLeft, Trophy, Flame, Target, Train, Heart, Dumbbell, Utensils, MessageCircle, Star, Sword, Timer, Settings, X, ChevronDown, Grid, Activity, Cloud } from 'lucide-react';
import { HunosYearInPixelsModal } from './HunosYearInPixelsModal';
import { HunosMonthLineChartModal } from './HunosMonthLineChartModal';
import { CategoryHistoryModal } from './CategoryHistoryModal';
import { useModalHistory } from '../hooks/useModalHistory';

import { calculateAllDaysTotal } from './FoodBoardView';

interface StatsViewProps {
  data: AppData;
  onUpdate?: React.Dispatch<React.SetStateAction<AppData>>;
  onBack: () => void;
  onNavigate?: (view: any) => void;
}

const MushroomIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 10C2 13.5 4.5 16 8 16V20C8 21.1 8.9 22 10 22H14C15.1 22 16 21.1 16 20V16C19.5 16 22 13.5 22 10C22 6.48 17.52 2 12 2ZM12 4C14.5 4 16.5 6 16.5 6C16.5 6 15 8 12 8C9 8 7.5 6 7.5 6C7.5 6 9.5 4 12 4Z" />
  </svg>
);

export const StatsView: React.FC<StatsViewProps> = ({ data, onUpdate, onBack, onNavigate }) => {
  const { stats, exercise, food, friends, sets, trains, hunos } = data;

  const [showHunosModal, setShowHunosModal] = useState(false);
  const [showYearPixels, setShowYearPixels] = useState(false);
  const [showMonthChart, setShowMonthChart] = useState(false);
  const [hunosTimeframe, setHunosTimeframe] = useState<'mes' | 'año' | 'siempre'>('mes');
  const [hunosSelectedPeriod, setHunosSelectedPeriod] = useState<string>('');
  const [hunosOrderType, setHunosOrderType] = useState<'cantidad' | 'tendencia'>('cantidad');
  
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseTimeframe, setExerciseTimeframe] = useState<'mes' | 'año' | 'siempre'>('mes');
  const [exerciseSelectedPeriod, setExerciseSelectedPeriod] = useState<string>('');

  const [showSetsModal, setShowSetsModal] = useState(false);
  const [showTrainsModal, setShowTrainsModal] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showInteractionsModal, setShowInteractionsModal] = useState(false);
  const [interactionTimeframe, setInteractionTimeframe] = useState<'mes' | 'año' | 'siempre'>('mes');
  const [interactionSelectedPeriod, setInteractionSelectedPeriod] = useState<string>('');

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

  useEffect(() => {
    if (interactionTimeframe === 'mes' && (!interactionSelectedPeriod || !availableMonths.has(interactionSelectedPeriod))) {
      setInteractionSelectedPeriod(monthsList[0] || '');
    } else if (interactionTimeframe === 'año' && (!interactionSelectedPeriod || !availableYears.has(interactionSelectedPeriod))) {
      setInteractionSelectedPeriod(yearsList[0] || '');
    }
  }, [interactionTimeframe, monthsList, yearsList, interactionSelectedPeriod, availableMonths, availableYears]);

  // --- MOBILE BACK BUTTON SUPPORT FOR MODALS ---
  useModalHistory(showHunosModal, () => setShowHunosModal(false));
  useModalHistory(showExerciseModal, () => setShowExerciseModal(false));
  useModalHistory(showSetsModal, () => setShowSetsModal(false));
  useModalHistory(showTrainsModal, () => setShowTrainsModal(false));
  useModalHistory(showProjectsModal, () => setShowProjectsModal(false));
  useModalHistory(showInteractionsModal, () => setShowInteractionsModal(false));
  useModalHistory(!!viewingHistoryForTask, () => setViewingHistoryForTask(null));
  // ---------------------------------------------

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

  const getCoreScoreForIds = (completedIds: string[]) => {
    let score = 0;
    // The "4 Fantásticos" are defined as the first 4 tasks in the current hunos array
    const coreTasks = data.hunos.slice(0, 4);
    const coreIds = new Set(coreTasks.map(t => t.id));

    completedIds.forEach(id => {
      if (coreIds.has(id)) {
        const task = coreTasks.find(t => t.id === id);
        if (task) {
          // Lions give +2, others +1
          if (task.text.includes('🦁') || task.text.toLowerCase().includes('leone')) {
            score += 2;
          } else {
            score += 1;
          }
        }
      }
    });
    return Math.min(5, score);
  };

  const hunoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const prevCounts: Record<string, number> = {};
    
    data.hunos.forEach(h => {
      counts[h.id] = 0;
      prevCounts[h.id] = 0;
    });

    // Calculate previous period string
    let prevPeriod = '';
    if (hunosTimeframe === 'mes' && hunosSelectedPeriod) {
      const [y, m] = hunosSelectedPeriod.split('-').map(Number);
      const prevDate = new Date(y, m - 2, 1);
      prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    } else if (hunosTimeframe === 'año' && hunosSelectedPeriod) {
      prevPeriod = (Number(hunosSelectedPeriod) - 1).toString();
    }

    Object.entries(data.hunosHistory || {}).forEach(([dateStr, completedIds]) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const yStr = d.getFullYear().toString();

      // Current period
      let includeCurrent = false;
      if (hunosTimeframe === 'siempre') includeCurrent = true;
      else if (hunosTimeframe === 'año') includeCurrent = yStr === hunosSelectedPeriod;
      else if (hunosTimeframe === 'mes') includeCurrent = mStr === hunosSelectedPeriod;

      if (includeCurrent) {
        (completedIds as string[]).forEach((id: string) => {
          counts[id] = (counts[id] || 0) + 1;
        });
      }

      // Previous period
      if (hunosOrderType === 'tendencia' && hunosTimeframe !== 'siempre') {
        let includePrev = false;
        if (hunosTimeframe === 'año') includePrev = yStr === prevPeriod;
        else if (hunosTimeframe === 'mes') includePrev = mStr === prevPeriod;

        if (includePrev) {
          (completedIds as string[]).forEach((id: string) => {
            prevCounts[id] = (prevCounts[id] || 0) + 1;
          });
        }
      }
    });

    return data.hunos.map(h => {
      const currentCount = counts[h.id] || 0;
      const previousCount = prevCounts[h.id] || 0;
      return {
        ...h,
        count: currentCount,
        prevCount: previousCount,
        delta: currentCount - previousCount
      };
    }).sort((a, b) => {
      if (hunosOrderType === 'tendencia' && hunosTimeframe !== 'siempre') {
        return b.delta - a.delta;
      }
      return b.count - a.count;
    });
  }, [data.hunos, data.hunosHistory, hunosTimeframe, hunosSelectedPeriod, hunosOrderType]);

  const totalHunos = useMemo(() => hunoCounts.reduce((acc, h) => acc + h.count, 0), [hunoCounts]);

  const coreScoreDistribution = useMemo(() => {
    const distro: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    Object.entries(data.hunosHistory || {}).forEach(([dateStr, completedIds]) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      
      const targetYear = hunosSelectedPeriod.split('-')[0];
      const targetMonth = hunosSelectedPeriod;

      let include = false;
      if (hunosTimeframe === 'siempre') include = true;
      else if (hunosTimeframe === 'año') include = d.getFullYear().toString() === targetYear;
      else if (hunosTimeframe === 'mes') {
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        include = mStr === targetMonth;
      }

      if (include) {
        const score = Math.min(5, getCoreScoreForIds(completedIds as string[]));
        distro[score] = (distro[score] || 0) + 1;
      }
    });

    return distro;
  }, [data.hunosHistory, data.hunos, hunosTimeframe, hunosSelectedPeriod]);

  const weeklyAverages = useMemo(() => {
    const dailyTotals: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    
    Object.entries(data.hunosHistory || {}).forEach(([dateStr, completedIds]) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const mStr = `${year}-${String(month).padStart(2, '0')}`;
      const yStr = year.toString();

      let include = false;
      const targetYear = hunosSelectedPeriod.split('-')[0];
      const targetMonth = hunosSelectedPeriod; // e.g. "2026-03"

      if (hunosTimeframe === 'siempre') include = true;
      else if (hunosTimeframe === 'año') include = yStr === targetYear;
      else if (hunosTimeframe === 'mes') include = mStr === targetMonth;

      if (include) {
        const score = getCoreScoreForIds(completedIds as string[]);
        const day = (d.getDay() + 6) % 7; // 0=Mon, 6=Sun
        dailyTotals[day].push(score);
      }
    });

    const results = [0, 1, 2, 3, 4, 5, 6].map(day => {
      const scores = dailyTotals[day];
      // Important: We average only over days that have entries in history
      // to avoid dragging the average down by missing logs.
      return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    });

    const totalLogsFound = Object.values(dailyTotals).reduce((acc, curr) => acc + curr.length, 0);

    return { results, totalLogsFound };
  }, [data.hunosHistory, data.hunos, hunosTimeframe, hunosSelectedPeriod]);

  const monthlyAverages = useMemo(() => {
    const monthlyTotals: Record<number, number[]> = {};
    for (let i = 0; i < 12; i++) monthlyTotals[i] = [];

    let targetYear: string | null = null;
    if (hunosTimeframe === 'mes' && hunosSelectedPeriod) targetYear = hunosSelectedPeriod.split('-')[0];
    else if (hunosTimeframe === 'año') targetYear = hunosSelectedPeriod;

    Object.entries(data.hunosHistory || {}).forEach(([dateStr, completedIds]) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      
      let include = false;
      if (hunosTimeframe === 'siempre') include = true;
      else if (targetYear) include = d.getFullYear().toString() === targetYear;

      if (include) {
        const score = getCoreScoreForIds(completedIds as string[]);
        monthlyTotals[d.getMonth()].push(score);
      }
    });

    const results = Array.from({ length: 12 }).map((_, i) => {
      const scores = monthlyTotals[i];
      return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    });

    const totalLogsFound = Object.values(data.hunosHistory || {}).filter(ids => Array.isArray(ids) && ids.length > 0).length;

    return { results, totalLogsFound };
  }, [data.hunosHistory, data.hunos, hunosTimeframe, hunosSelectedPeriod]);

  useEffect(() => {
    if (exerciseTimeframe === 'mes' && (!exerciseSelectedPeriod || !availableMonths.has(exerciseSelectedPeriod))) {
      setExerciseSelectedPeriod(monthsList[0] || '');
    } else if (exerciseTimeframe === 'año' && (!exerciseSelectedPeriod || !availableYears.has(exerciseSelectedPeriod))) {
      setExerciseSelectedPeriod(yearsList[0] || '');
    }
  }, [exerciseTimeframe, monthsList, yearsList, exerciseSelectedPeriod, availableMonths, availableYears]);

  const exerciseStatsForPeriod = useMemo(() => {
    if (exerciseTimeframe === 'siempre') {
      const w = (exercise.daysTrained || 0) + (exercise.sprintCount || 0) + (exercise.stretchCount || 0);
      const m = exercise.totalMinutes || 0;
      return { workouts: w, hours: Math.floor(m / 60), mins: m % 60, isAccurate: true };
    }

    let w = 0;
    let m = 0;

    Object.entries(exercise.history || {}).forEach(([dateStr, statsData]) => {
      const stats = statsData as ExerciseDayStats;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      
      let include = false;
      if (exerciseTimeframe === 'año') {
        include = d.getFullYear().toString() === exerciseSelectedPeriod;
      } else if (exerciseTimeframe === 'mes') {
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        include = mStr === exerciseSelectedPeriod;
      }

      if (include) {
        w += (stats.workouts || 0);
        m += (stats.minutes || 0);
      }
    });

    return { workouts: w, hours: Math.floor(m / 60), mins: m % 60, isAccurate: true };
  }, [exercise, exerciseTimeframe, exerciseSelectedPeriod]);

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getClipPath = (value: number, total: number) => {
    const percentage = value / total;
    const degrees = percentage * 360;
    
    if (percentage === 0) return '50% 50%, 50% 0, 50% 0';
    if (percentage <= 0.125) return `50% 50%, 50% 0, ${50 + Math.tan(degrees * Math.PI / 180) * 50}% 0`;
    if (percentage <= 0.25) return `50% 50%, 50% 0, 100% 0, 100% ${50 - Math.tan((90 - degrees) * Math.PI / 180) * 50}%`;
    if (percentage <= 0.375) return `50% 50%, 50% 0, 100% 0, 100% 50%, 100% ${50 + Math.tan((degrees - 90) * Math.PI / 180) * 50}%`;
    if (percentage <= 0.5) return `50% 50%, 50% 0, 100% 0, 100% 100%, ${50 + Math.tan((180 - degrees) * Math.PI / 180) * 50}% 100%`;
    if (percentage <= 0.625) return `50% 50%, 50% 0, 100% 0, 100% 100%, 50% 100%, ${50 - Math.tan((degrees - 180) * Math.PI / 180) * 50}% 100%`;
    if (percentage <= 0.75) return `50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%, 0 ${50 + Math.tan((270 - degrees) * Math.PI / 180) * 50}%`;
    if (percentage <= 0.875) return `50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%, 0 50%, 0 ${50 - Math.tan((degrees - 270) * Math.PI / 180) * 50}%`;
    return `50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%, 0 0, ${50 - Math.tan((360 - degrees) * Math.PI / 180) * 50}% 0`;
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

  const renderMiniBarChart = (values: number[], labels: string[], maxPossible: number = 5, logsCount: number = 0) => {
    const hasData = values.some(v => v > 0);
    const highestValue = Math.max(...values, 0);
    
    if (!hasData) {
      return (
        <div className="flex items-center justify-center h-24 bg-stone-950/20 rounded-lg border border-stone-800/50 border-dashed mx-1">
          <span className="text-[10px] text-stone-600 font-bold uppercase tracking-wider">Sin registros</span>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex gap-1.5 h-24 px-1 items-stretch">
          {values.map((v, i) => {
            const isMax = highestValue > 0 && v === highestValue;
            const height = (v / maxPossible) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center group relative">
                {/* Floating Value Tag */}
                <div className="h-4 flex items-center justify-center mb-1">
                  <span className={`text-[9px] font-mono font-black ${v > 0 ? (isMax ? 'text-orange-500' : 'text-stone-400') : 'opacity-0'}`}>
                    {v.toFixed(v === 0 ? 0 : 1)}
                  </span>
                </div>

                {/* Bar Container - This now has actual height via flex-1 */}
                <div className="w-full flex-1 bg-stone-950/40 rounded-t-sm relative flex items-end overflow-visible border-b border-stone-800">
                  <div 
                    className={`w-full transition-all duration-700 rounded-t-sm ${
                      isMax 
                        ? 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)] z-10' 
                        : 'bg-orange-600 group-hover:bg-orange-500'
                    }`} 
                    style={{ height: `${Math.max(v > 0 ? 6 : 0, height)}%` }}
                  ></div>
                </div>
                
                {/* Day/Month Label */}
                <span className={`text-[10px] font-black mt-2 h-4 ${isMax ? 'text-orange-500 underline decoration-2 underline-offset-4' : 'text-stone-600'}`}>
                  {labels[i]}
                </span>
              </div>
            );
          })}
        </div>
        <div className="px-1 flex justify-end">
          <span className="text-[8px] font-black text-stone-700 uppercase tracking-[0.2em] bg-stone-950/50 px-2 py-1 rounded-md border border-stone-900 shadow-inner">
            {logsCount} registros encontrados
          </span>
        </div>
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

  const interactionTotals = useMemo(() => {
    const totals = { person: 0, call: 0, gift: 0, photo: 0, message: 0 };
    friends.forEach(f => {
      totals.person += f.interactions?.person || 0;
      totals.call += f.interactions?.call || 0;
      totals.gift += f.interactions?.gift || 0;
      totals.photo += f.interactions?.photo || 0;
      totals.message += f.interactions?.message || 0;
    });
    return totals;
  }, [friends]);

  // Logic for 30-day Hunos evolution
  const hunosHistoryToDisplay: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toDateString();
    
    if (i === 0) {
      const currentCompletedIds = hunos.filter(t => t.completed).map(t => t.id);
      hunosHistoryToDisplay.push(getCoreScoreForIds(currentCompletedIds));
    } else {
      const pastCompletedIds = (data.hunosHistory || {})[dateKey] || [];
      hunosHistoryToDisplay.push(getCoreScoreForIds(pastCompletedIds));
    }
  }
  const hunosMax = 5;
  
  // Logic for 30-day Energy evolution
  const energyHistoryToDisplay: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toDateString();
    
    if (i === 0) {
      energyHistoryToDisplay.push(data.energy || 1);
    } else {
      const pastEnergy = (data.energyHistory || {})[dateKey] || 1;
      energyHistoryToDisplay.push(pastEnergy);
    }
  }
  const energyMax = 10;

  // Logic for 6-month food evolution (Monthly)
  const foodHistoryToDisplay = useMemo(() => {
    const now = new Date();
    const result: number[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = targetDate.getMonth();
      const y = targetDate.getFullYear();
      const mKey = `${y}-${(m + 1).toString().padStart(2, '0')}`;
      
      // Base score from daily entries (global)
      const base = calculateAllDaysTotal(data.food.dailyScores || {}, m, y);
      
      // Monthly specific data (from current or history)
      let plenoCount = 0;
      let bonusPoints = 0;
      
      if (i === 0) {
        plenoCount = (data.food.wheelPlenoCount || 0) * 3 + (data.food.broccoliPlenoCount || 0) * 1;
        const bonuses = data.food.monthlyBonuses || {};
        if (bonuses.organs) bonusPoints += (bonuses.organs as boolean[]).filter(v => v).length * 3;
        if (bonuses.legumes) bonusPoints += (bonuses.legumes as boolean[]).filter(v => v).length * 3;
        if (bonuses.fast24) bonusPoints += (bonuses.fast24 as boolean[]).filter(v => v).length * 4;
      } else {
        const hist = data.food.monthlyHistory?.[mKey];
        if (hist) {
          plenoCount = (hist.wheelPlenoCount || 0) * 3 + (hist.broccoliPlenoCount || 0) * 1;
          const bonuses = hist.bonuses || {};
          if (bonuses.organs) bonusPoints += (bonuses.organs as boolean[]).filter(v => v).length * 3;
          if (bonuses.legumes) bonusPoints += (bonuses.legumes as boolean[]).filter(v => v).length * 3;
          if (bonuses.fast24) bonusPoints += (bonuses.fast24 as boolean[]).filter(v => v).length * 4;
        }
      }
      
      result.push(base + plenoCount + bonusPoints);
    }
    return result;
  }, [data.food]);
  const foodMax = 200;

  const getFormattedDateKey = (date: Date) => {
      return date.toDateString();
  };

  const toggleHistoryDate = (date: Date | null, taskId: string) => {
    if (!onUpdate || !date) return;
    const dateKey = date.toDateString();
    const currentHistory = { ...(data.hunosHistory || {}) };
    const dayHistory = [...(currentHistory[dateKey] || [])];
    
    if (dayHistory.includes(taskId)) {
      currentHistory[dateKey] = dayHistory.filter(id => id !== taskId);
    } else {
      currentHistory[dateKey] = [...dayHistory, taskId];
    }
    
    onUpdate(prev => ({
      ...prev,
      hunosHistory: currentHistory
    }));
  };

  const renderTaskHistoryModal = () => {
      if (!viewingHistoryForTask) return null;
      
      const task = data.hunos.find(t => t.id === viewingHistoryForTask);
      if (!task) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let firstDate = new Date();
      const taskHistoryDates = Object.entries(data.hunosHistory || {})
        .filter(([_, ids]) => (ids as string[]).includes(task.id))
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
          if ((ids as string[]).includes(task.id)) completedCount++;
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
          if ((ids as string[]).includes(task.id)) {
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) {
                  const dYear = d.getFullYear().toString();
                  const dMonth = String(d.getMonth() + 1).padStart(2, '0');
                  const dMonthStr = `${dYear}-${dMonth}`;
                  
                  let isInPeriod = true;
                  if (taskHistoryTimeframe === 'mes') {
                    isInPeriod = dMonthStr === taskHistoryPeriod;
                  } else if (taskHistoryTimeframe === 'año') {
                    isInPeriod = dYear === taskHistoryPeriod;
                  } else if (taskHistoryTimeframe === '60dias' || taskHistoryTimeframe === '90dias') {
                    const days = taskHistoryTimeframe === '60dias' ? 60 : 90;
                    const limit = new Date();
                    limit.setHours(0,0,0,0);
                    limit.setDate(limit.getDate() - days);
                    isInPeriod = d >= limit;
                  }

                  if (isInPeriod) {
                    dayOfWeekCounts[d.getDay()]++;
                  }
                  
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
          <div 
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setViewingHistoryForTask(null)}
          >
              <div 
                className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                  <button 
                      onClick={() => setViewingHistoryForTask(null)}
                      className="absolute top-3 right-3 z-50 w-12 h-12 flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-full transition-colors"
                  >
                      <X className="w-6 h-6" />
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
                          <button 
                              key={idx}
                              onClick={() => toggleHistoryDate(day.date, task.id)}
                              disabled={!day.isInPeriod || day.isFuture}
                              title={day.date ? day.date.toLocaleDateString() : ''}
                              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                                  day.isToday 
                                      ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)] scale-110' 
                                      : !day.isInPeriod || day.isFuture
                                          ? 'bg-stone-800/30 border border-stone-800 cursor-default'
                                          : day.isCompleted 
                                              ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)] hover:bg-purple-400 hover:scale-125' 
                                              : 'bg-stone-800 hover:bg-stone-700 hover:scale-125'
                              } ${day.isInPeriod && !day.isFuture ? 'cursor-pointer' : ''}`}
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
            <button onClick={() => setShowTrainsModal(true)} className="bg-stone-900 p-3 rounded-2xl border border-blue-900/30 flex flex-col items-center justify-center gap-2 hover:bg-stone-800 transition-colors">
              <Train className="w-6 h-6 text-blue-500" />
              <span className="text-2xl font-black text-white leading-none">{stats.perfectTrainMonths}</span>
            </button>
            <button onClick={() => setShowSetsModal(true)} className="bg-stone-900 p-3 rounded-2xl border border-red-900/30 flex flex-col items-center justify-center gap-2 hover:bg-stone-800 transition-colors">
              <MushroomIcon className="w-6 h-6 text-red-500" />
              <span className="text-2xl font-black text-white leading-none">{stats.perfectSetsWeeks}</span>
            </button>
            <button onClick={() => setShowHunosModal(true)} className="bg-stone-900 p-3 rounded-2xl border border-orange-900/30 flex flex-col items-center justify-center gap-2 hover:bg-stone-800 transition-colors w-full">
              <Sword className="w-6 h-6 text-orange-500" />
              <span className="text-2xl font-black text-white leading-none">{(stats.hunoPlenoCurrent || 0) + ((stats.hunoPlenos || 0) * 50)}</span>
            </button>
            <button onClick={() => setShowProjectsModal(true)} className="bg-stone-900 p-3 rounded-2xl border border-stone-800 flex flex-col items-center justify-center gap-2 hover:bg-stone-800 transition-colors">
              <Cloud className="w-6 h-6 text-stone-400" />
              <span className="text-2xl font-black text-white leading-none">{(stats.projectPlenoCurrent || 0) + ((stats.projectPlenos || 0) * 20)}</span>
            </button>
          </div>
        </section>

        {/* CUERPO Y ACCION */}
        <section>
          <h2 className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Dumbbell className="w-4 h-4" /> Cuerpo y Esfuerzo
          </h2>
          <button 
             onClick={() => setShowExerciseModal(true)} 
             className="w-full bg-stone-900 p-4 rounded-2xl border border-emerald-900/30 flex flex-col items-center justify-center gap-2 hover:bg-stone-800 transition-colors"
          >
            <Dumbbell className="w-8 h-8 text-emerald-500 mb-1" />
            <span className="text-3xl font-black text-white leading-none">
              {(exercise.daysTrained || 0) + (exercise.sprintCount || 0) + (exercise.stretchCount || 0)}
            </span>
          </button>
        </section>

        {/* HISTORICOS (CHARTS) */}
        <section className="space-y-6">
          <div>
            <button onClick={() => setShowTrainsModal(true)} className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2 hover:text-blue-400 transition-colors">
              <Train className="w-4 h-4 text-blue-500" /> TRENES (6 MESES)
            </button>
            <div className="h-24 flex gap-1 px-1">
              {paddedTrainsHistory.map((v, i) => (
                <React.Fragment key={i}>
                  {renderHistoryBar(v, trainsMax, 'bg-blue-600', i === 5)}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div>
            <button onClick={() => setShowSetsModal(true)} className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2 hover:text-red-400 transition-colors">
              <MushroomIcon className="w-4 h-4 text-red-500" /> SETAS (10 SEM)
            </button>
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
              <Activity className="w-4 h-4 text-orange-500" /> ENERGÍA (30 DÍAS)
            </h2>
            <div className="h-24 flex gap-[2px] px-1">
              {energyHistoryToDisplay.map((v, i) => (
                <React.Fragment key={i}>
                  {renderHistoryBar(v, energyMax, 'bg-orange-500', i === 29, true)}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div>
            <button onClick={() => onNavigate?.('food')} className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2 hover:text-lime-400 transition-colors">
              <Utensils className="w-4 h-4 text-lime-500" /> JUMANGIARE (6 MESES)
            </button>
            <div className="h-24 flex gap-1 px-1">
              {foodHistoryToDisplay.map((v, i) => (
                <React.Fragment key={i}>
                  {renderHistoryBar(v, foodMax, 'bg-lime-600', i === 5)}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div>
            <button onClick={() => setShowInteractionsModal(true)} className="text-xs font-black text-stone-600 uppercase tracking-widest mb-4 flex items-center gap-2 hover:text-pink-400 transition-colors">
              <Heart className="w-4 h-4 text-pink-500" /> BROTES (6 MESES)
            </button>
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
        <div 
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowHunosModal(false)}
        >
          <div 
            className="bg-stone-900 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh] border border-stone-800"
            onClick={(e) => e.stopPropagation()}
          >
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

              {hunosTimeframe !== 'siempre' && (
                <div className="flex bg-stone-950 rounded-lg p-1">
                  {(['cantidad', 'tendencia'] as const).map(ot => (
                    <button
                      key={ot}
                      onClick={() => setHunosOrderType(ot)}
                      className={`flex-1 py-1 text-[10px] font-black uppercase rounded-md transition-colors ${hunosOrderType === ot ? 'bg-orange-600 text-white' : 'text-stone-600 hover:text-stone-400'}`}
                    >
                      {ot}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="overflow-y-auto p-2">
              <div className="grid grid-cols-4 gap-2 mb-4">
                {/* Total Card */}
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-400/50 gap-2 cursor-default">
                  <span className="text-2xl drop-shadow-sm filter">✨</span>
                  <span className="font-mono font-bold text-amber-950 bg-white/30 px-2 py-0.5 rounded-md min-w-[2.5rem] text-center text-xs">
                    {totalHunos}
                  </span>
                </div>
                {hunoCounts.map(huno => {
                  if (huno.text === 'GAP') return null;
                  return (
                    <button 
                      key={huno.id} 
                      onClick={() => setViewingHistoryForTask(huno.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all gap-2 cursor-pointer ${
                        hunosOrderType === 'tendencia' && hunosTimeframe !== 'siempre'
                          ? (huno.delta > 0 
                              ? 'bg-emerald-600/20 border border-emerald-500/30' 
                              : huno.delta < 0 
                                ? 'bg-rose-600/20 border border-rose-500/30' 
                                : 'bg-stone-800/30 border border-stone-800/50')
                          : 'bg-stone-800/30 hover:bg-stone-800/50 border border-transparent'
                      }`}
                    >
                      <span className="text-2xl drop-shadow-sm filter">{getEmoji(huno.text)}</span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded-md min-w-[2.5rem] text-center text-xs ${
                        hunosOrderType === 'tendencia' && hunosTimeframe !== 'siempre'
                          ? (huno.delta > 0 
                              ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]' 
                              : huno.delta < 0 
                                ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]' 
                                : 'bg-stone-500 text-stone-200')
                          : 'text-orange-500 bg-orange-500/10'
                      }`}>
                        {hunosOrderType === 'tendencia' && hunosTimeframe !== 'siempre' 
                          ? (huno.delta > 0 ? `+${huno.delta}` : huno.delta)
                          : huno.count
                        }
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Core Huno Distribution Row */}
              <div className="border-t border-stone-800 pt-4 pb-2">
                <h4 className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-3 px-2">Logros 4 Fantásticos</h4>
                <div className="grid grid-cols-6 gap-1">
                  {[0, 1, 2, 3, 4, 5].map(score => (
                    <div key={score} className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full border border-orange-500/30 overflow-hidden bg-orange-950/50 relative">
                        <div 
                          className="absolute inset-0 bg-orange-500"
                          style={{
                            clipPath: `polygon(50% 50%, 50% 0, ${score >= 5 ? '100% 0, 100% 100%, 0 100%, 0 0, 50% 0' : getClipPath(score, 5)})`
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-stone-500 text-center">
                        {coreScoreDistribution[score] || 0}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2 text-center">
                   <button onClick={() => setShowYearPixels(true)} className="flex flex-col items-center justify-center p-3 rounded-xl bg-stone-800/30 hover:bg-stone-800/50 transition-colors gap-2 border border-stone-800/50">
                      <Grid className="w-5 h-5 text-orange-500" />
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Año en Píxeles</span>
                   </button>
                   <button onClick={() => setShowMonthChart(true)} className="flex flex-col items-center justify-center p-3 rounded-xl bg-stone-800/30 hover:bg-stone-800/50 transition-colors gap-2 border border-stone-800/50">
                      <Activity className="w-5 h-5 text-orange-500" />
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Línea del Mes</span>
                   </button>
                </div>
              </div>

              {/* Advanced Performance Stats */}
              <div className="border-t border-stone-800 pt-4 pb-2 space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-3 px-2 flex justify-between items-center">
                    Media Semanal
                    {weeklyAverages.results.some(v => v > 0) && (
                      <span className="text-[8px] font-mono text-orange-500/70 lowercase tracking-normal">
                        mejor día: {['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'][weeklyAverages.results.indexOf(Math.max(...weeklyAverages.results))]}
                      </span>
                    )}
                  </h4>
                  {renderMiniBarChart(weeklyAverages.results, ['L', 'M', 'X', 'J', 'V', 'S', 'D'], 5, weeklyAverages.totalLogsFound)}
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-3 px-2 flex justify-between items-center">
                    {hunosTimeframe === 'mes' ? `Rendimiento ${hunosSelectedPeriod.split('-')[0]}` : 'Media Mensual'}
                    {monthlyAverages.results.some(v => v > 0) && (
                      <span className="text-[8px] font-mono text-orange-500/70 lowercase tracking-normal">
                        mejor mes: {['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][monthlyAverages.results.indexOf(Math.max(...monthlyAverages.results))]}
                      </span>
                    )}
                  </h4>
                  {renderMiniBarChart(monthlyAverages.results, ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], 5, monthlyAverages.totalLogsFound)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExerciseModal && (
        <div 
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowExerciseModal(false)}
        >
          <div 
            className="bg-stone-900 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh] border border-stone-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-950">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-emerald-500" />
                Estadísticas de Esfuerzo
              </h3>
              <button onClick={() => setShowExerciseModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-stone-800 bg-stone-900/50 space-y-3">
              <div className="flex bg-stone-950 rounded-lg p-1">
                {(['mes', 'año', 'siempre'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setExerciseTimeframe(tf)}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${exerciseTimeframe === tf ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-300'}`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              
              {exerciseTimeframe !== 'siempre' && (
                <select
                  value={exerciseSelectedPeriod}
                  onChange={(e) => setExerciseSelectedPeriod(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {exerciseTimeframe === 'mes' 
                    ? monthsList.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)
                    : yearsList.map(y => <option key={y} value={y}>{y}</option>)
                  }
                </select>
              )}
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-4 bg-stone-900">
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 flex flex-col items-center justify-center gap-2">
                <span className="text-4xl font-black text-white">{exerciseStatsForPeriod.workouts}</span>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest text-center mt-1">Sesiones de Bosque</span>
              </div>
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 flex flex-col items-center justify-center gap-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{exerciseStatsForPeriod.hours}</span>
                  <span className="text-sm font-bold text-stone-400">horas</span>
                </div>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest text-center mt-1">Tiempo Total</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {renderTaskHistoryModal()}

      {/* NEW MODALS */}
      {showYearPixels && (
        <HunosYearInPixelsModal 
          hunos={data.hunos}
          hunosHistory={data.hunosHistory || {}}
          availableYears={yearsList}
          initialYear={yearsList[0] || new Date().getFullYear().toString()}
          onClose={() => setShowYearPixels(false)}
        />
      )}
      
      {showMonthChart && (
        <HunosMonthLineChartModal 
          hunos={data.hunos}
          hunosHistory={data.hunosHistory || {}}
          monthsList={monthsList}
          initialMonth={monthsList[0] || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
          onClose={() => setShowMonthChart(false)}
        />
      )}

      {showSetsModal && (
        <CategoryHistoryModal
          title="Estadísticas de Setas"
          icon={<MushroomIcon className="w-5 h-5 text-red-500" />}
          colorClass="text-red-500"
          bgAccentClass="bg-red-500/10"
          tasks={data.sets}
          historyMap={data.setsHistoryMap || {}}
          availableTimeframes={['mes', 'año', 'siempre']}
          layout="list"
          shouldIncludeLiveCounts={true}
          onClose={() => setShowSetsModal(false)}
        />
      )}

      {showTrainsModal && (
        <CategoryHistoryModal
          title="Estadísticas de Trenes"
          icon={<Train className="w-5 h-5 text-blue-500" />}
          colorClass="text-blue-500"
          bgAccentClass="bg-blue-500/10"
          tasks={data.trains}
          historyMap={data.trainsHistoryMap || {}}
          availableTimeframes={['año', 'siempre']}
          layout="list"
          shouldIncludeLiveCounts={true}
          onClose={() => setShowTrainsModal(false)}
        />
      )}

      {showProjectsModal && (
        <CategoryHistoryModal
          title="Estadísticas de Nubes"
          icon={<Cloud className="w-5 h-5 text-stone-400" />}
          colorClass="text-stone-300"
          bgAccentClass="bg-stone-500/10"
          tasks={data.projects}
          historyMap={data.projectsHistoryMap || {}}
          availableTimeframes={['mes', 'año', 'siempre']}
          onClose={() => setShowProjectsModal(false)}
        />
      )}

      {showInteractionsModal && (
        <div 
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowInteractionsModal(false)}
        >
          <div 
            className="bg-stone-900 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh] border border-stone-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-950">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Estadísticas de Brotes
              </h3>
              <button onClick={() => setShowInteractionsModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-stone-800 bg-stone-900/50 space-y-3">
              <div className="flex bg-stone-950 rounded-lg p-1">
                {(['mes', 'año', 'siempre'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setInteractionTimeframe(tf)}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${interactionTimeframe === tf ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-300'}`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              
              {interactionTimeframe !== 'siempre' && (
                <select
                  value={interactionSelectedPeriod}
                  onChange={(e) => setInteractionSelectedPeriod(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500/50"
                >
                  {interactionTimeframe === 'mes' 
                    ? monthsList.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)
                    : yearsList.map(y => <option key={y} value={y}>{y}</option>)
                  }
                </select>
              )}
            </div>
            
            <div className="overflow-y-auto p-4">
              {/* Category Breakdown (Accumulated) */}
              <div className="grid grid-cols-5 gap-2 mb-6">
                {(['person', 'call', 'gift', 'photo', 'message'] as const).map(type => {
                  const icons = { person: '🫂', call: '📞', gift: '🎁', photo: '📸', message: '💬' };
                  return (
                    <div key={type} className="flex flex-col items-center justify-center p-3 rounded-xl bg-stone-800/30 gap-1">
                      <span className="text-2xl">{icons[type]}</span>
                      <span className="font-mono font-bold text-pink-500 text-xs">
                        {interactionTotals[type]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* History Chart */}
              <div className="border-t border-stone-800 pt-4">
                <h4 className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-4">Evolución (6 meses)</h4>
                {renderMiniBarChart(
                   interactionsHistoryToDisplay, 
                   ['5M', '4M', '3M', '2M', '1M', 'Hoy'], 
                   interactionsMax,
                   interactionsHistoryToDisplay.reduce((a, b) => a + b, 0)
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};