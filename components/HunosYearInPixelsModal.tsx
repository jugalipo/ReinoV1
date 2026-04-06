import React, { useState, useMemo, useEffect } from 'react';
import { Task } from '../types';
import { X, ChevronDown, Grid } from 'lucide-react';

interface HunosYearInPixelsModalProps {
  hunos: Task[];
  hunosHistory: Record<string, string[]>;
  availableYears: string[];
  initialYear: string;
  onClose: () => void;
}

const COLORS = {
  5: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]', // Pleno (5)
  4: 'bg-lime-500',                                           // 4 
  3: 'bg-yellow-500',                                         // 3
  2: 'bg-orange-500',                                         // 2
  1: 'bg-red-500',                                            // 1
  0: 'bg-red-900 shadow-[0_0_6px_rgba(220,38,38,0.5)]',       // 0
  empty: 'bg-stone-800 border border-stone-800'               // no data
};

const TEXT_COLORS = {
  5: 'text-emerald-500',
  4: 'text-lime-500',
  3: 'text-yellow-500',
  2: 'text-orange-500',
  1: 'text-red-500',
  0: 'text-red-900'
};

export const HunosYearInPixelsModal: React.FC<HunosYearInPixelsModalProps> = ({ 
  hunos, 
  hunosHistory, 
  availableYears, 
  initialYear,
  onClose 
}) => {
  const [selectedYear, setSelectedYear] = useState(initialYear);
  // Default filter active to see everything (0 to 5)
  const [activeFilters, setActiveFilters] = useState<number[]>([0, 1, 2, 3, 4, 5]);

  const yearNum = parseInt(selectedYear, 10);

  // --- MOBILE BACK BUTTON SUPPORT FOR THIS SUB MODAL ---
  useEffect(() => {
    window.history.pushState({ modal: 'yearInPixels' }, '');
    const handlePopState = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onClose]);

  const getCoreScoreForIds = (completedIds: string[]) => {
    let score = 0;
    const coreTasks = hunos.slice(0, 4);
    const coreIds = new Set(coreTasks.map(t => t.id));

    completedIds.forEach(id => {
      if (coreIds.has(id)) {
        const task = coreTasks.find(t => t.id === id);
        if (task) {
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

  const gridData = useMemo(() => {
    // 12 months, max 31 days
    const grid: number[][] = Array(12).fill(null).map(() => Array(31).fill(-1));
    const now = new Date();

    Object.entries(hunosHistory || {}).forEach(([dateStr, completedIds]) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      if (d.getFullYear() === yearNum) {
        const score = getCoreScoreForIds(completedIds as string[]);
        grid[d.getMonth()][d.getDate() - 1] = score; // 0-indexed month and day
      }
    });

    return grid;
  }, [hunosHistory, yearNum, hunos]);

  const toggleFilter = (score: number) => {
    setActiveFilters(prev => {
      if (prev.includes(score)) {
        return prev.filter(s => s !== score);
      } else {
        return [...prev, score];
      }
    });
  };

  const isToday = (day: number, month: number) => {
    const today = new Date();
    return today.getDate() === day + 1 && today.getMonth() === month && today.getFullYear() === yearNum;
  };

  const isFuture = (day: number, month: number) => {
     const today = new Date();
     today.setHours(0,0,0,0);
     const cellDate = new Date(yearNum, month, day + 1);
     return cellDate.getTime() > today.getTime();
  };

  const isValidDate = (year: number, month: number, day: number) => {
    var d = new Date(year, month, day + 1);
    return d.getMonth() === month;
  }

  const monthsLetters = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  return (
    <div 
      className="fixed inset-0 w-full max-w-md mx-auto z-[70] flex flex-col p-2 bg-stone-950 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="flex-1 bg-stone-900 border border-stone-800 rounded-3xl p-4 shadow-2xl relative overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-full transition-colors"
        >
            <X className="w-6 h-6" />
        </button>
        
        <div className="relative mb-6 pr-14 mt-2">
            <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-2xl font-black text-white bg-transparent appearance-none cursor-pointer focus:outline-none w-full truncate pr-8 flex items-center gap-2"
            >
                {availableYears.length === 0 && <option value={selectedYear}>{selectedYear}</option>}
                {availableYears.map(year => (
                    <option key={year} value={year} className="text-base bg-stone-900 text-stone-200">
                        {year}
                    </option>
                ))}
            </select>
            <div className="absolute left-[70px] top-1/2 -translate-y-1/2 pointer-events-none text-stone-500">
                <ChevronDown className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mt-1 flex items-center gap-1.5"><Grid className="w-3.5 h-3.5"/> Año en Píxeles (Core)</p>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 flex justify-center pb-4 no-scrollbar">
          <div className="inline-flex">
            {/* Row Numbering */}
            <div className="flex flex-col pt-6 mr-1.5 gap-[2px]">
              {Array.from({ length: 31 }).map((_, d) => (
                <div key={d} className="h-4 flex items-center justify-end pr-1 text-[8px] font-black font-mono text-stone-600">
                  {d + 1}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-1.5">
              {gridData.map((monthData, monthIndex) => (
                <div key={monthIndex} className="flex flex-col">
                  <div className="h-6 flex justify-center pb-2 text-[10px] font-black text-stone-500">
                    {monthsLetters[monthIndex]}
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    {monthData.map((score, dayIndex) => {
                      const valid = isValidDate(yearNum, monthIndex, dayIndex);
                      if (!valid) {
                        return <div key={dayIndex} className="w-4 h-4" />;
                      }

                      let displayColor = COLORS.empty;
                      let opacityClass = 'opacity-100';

                      if (score !== -1) {
                         if (!activeFilters.includes(score)) {
                            displayColor = 'bg-stone-800/20'; // Ghosted
                            opacityClass = 'opacity-30';
                         } else {
                            displayColor = COLORS[score as keyof typeof COLORS];
                         }
                      } else if (isFuture(dayIndex, monthIndex)) {
                          displayColor = 'bg-transparent';
                      } else {
                          displayColor = COLORS.empty;
                      }

                      const todayStyles = isToday(dayIndex, monthIndex) 
                        ? 'ring-2 ring-white ring-offset-1 ring-offset-stone-900 border-none' 
                        : '';

                      return (
                        <div 
                          key={dayIndex} 
                          title={`${dayIndex + 1}/${monthIndex + 1}/${yearNum} - Puntos: ${score !== -1 ? score : '-'}`}
                          className={`w-4 h-4 rounded-[3px] transition-all duration-300 ${displayColor} ${opacityClass} ${todayStyles}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="pt-4 border-t border-stone-800 shrink-0 select-none">
          <p className="text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-3 text-center">Filtros</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {[5, 4, 3, 2, 1, 0].map(score => {
              const isActive = activeFilters.includes(score);
              return (
                <button
                  key={score}
                  onClick={() => toggleFilter(score)}
                  className={`flex flex-col items-center gap-1 transition-all duration-200 ${isActive ? 'scale-110' : 'opacity-40 grayscale scale-95'}`}
                >
                  <div className={`w-5 h-5 rounded hover:ring-2 hover:ring-stone-400 ${COLORS[score as keyof typeof COLORS]}`} />
                  <span className={`text-[10px] font-black font-mono ${isActive ? TEXT_COLORS[score as keyof typeof TEXT_COLORS] : 'text-stone-600'}`}>{score}</span>
                </button>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
