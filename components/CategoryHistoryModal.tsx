import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import { X } from 'lucide-react';

interface Props {
  title: string;
  icon: React.ReactNode;
  colorClass: string; // e.g. "text-red-500", "bg-red-500"
  bgAccentClass: string; // e.g. "bg-red-500/10"
  tasks: Task[];
  historyMap: Record<string, string[]>;
  availableTimeframes: ('mes' | 'año' | 'siempre')[];
  layout?: 'grid' | 'list';
  shouldIncludeLiveCounts?: boolean;
  onClose: () => void;
}

const getEmoji = (text: string) => {
  const match = text.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u);
  return match ? match[0] : '❓';
};

export const CategoryHistoryModal: React.FC<Props> = ({
  title, icon, colorClass, bgAccentClass, tasks, historyMap, availableTimeframes, layout = 'grid', shouldIncludeLiveCounts = false, onClose
}) => {
  const [timeframe, setTimeframe] = useState<('mes' | 'año' | 'siempre')>(availableTimeframes[0]);

  const yearsList = useMemo(() => {
    const years = new Set<string>();
    Object.keys(historyMap || {}).forEach(dateStr => {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) years.add(d.getFullYear().toString());
    });
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);
    return Array.from(years).sort().reverse();
  }, [historyMap]);

  const monthsList = useMemo(() => {
    const months = new Set<string>();
    Object.keys(historyMap || {}).forEach(dateStr => {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    return Array.from(months).sort().reverse();
  }, [historyMap]);

  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    timeframe === 'mes' ? monthsList[0] : yearsList[0]
  );

  // Update selected period when timeframe changes
  React.useEffect(() => {
    if (timeframe === 'mes') setSelectedPeriod(monthsList[0]);
    else if (timeframe === 'año') setSelectedPeriod(yearsList[0]);
  }, [timeframe, monthsList, yearsList]);

  const formatMonth = (mStr: string) => {
    const [y, m] = mStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  };

  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => counts[t.id] = 0);

    Object.entries(historyMap || {}).forEach(([dateStr, completedIds]) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      
      let include = false;
      if (timeframe === 'siempre') include = true;
      else if (timeframe === 'año') include = d.getFullYear().toString() === selectedPeriod;
      else if (timeframe === 'mes') {
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        include = mStr === selectedPeriod;
      }

      if (include) {
        (completedIds as string[]).forEach((id: string) => {
          if (counts[id] !== undefined) counts[id] += 1;
        });
      }
    });

    if (shouldIncludeLiveCounts) {
      const now = new Date();
      let includeLive = false;
      if (timeframe === 'siempre') includeLive = true;
      else if (timeframe === 'año') includeLive = now.getFullYear().toString() === selectedPeriod;
      else if (timeframe === 'mes') {
        const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        includeLive = mStr === selectedPeriod;
      }

      if (includeLive) {
        tasks.forEach(t => {
          if (t.completed) counts[t.id] += 1;
        });
      }
    }

    return tasks.map(t => ({
      ...t,
      count: counts[t.id] || 0
    })).sort((a, b) => b.count - a.count);
  }, [tasks, historyMap, timeframe, selectedPeriod, shouldIncludeLiveCounts]);

  // Aggregate for the bar chart
  const chartData = useMemo(() => {
    if (timeframe === 'mes') {
      // Bar chart for month -> 4 weeks? Let's just group by week of the month or by day.
      // Since sets/trains might be infrequent, grouped by week is better.
      const weeks = [0, 0, 0, 0, 0];
      const [yStr, mStr] = selectedPeriod.split('-');
      const y = parseInt(yStr), m = parseInt(mStr) - 1;

      Object.entries(historyMap || {}).forEach(([dateStr, completedIds]) => {
        const d = new Date(dateStr);
        if (d.getFullYear() === y && d.getMonth() === m && !isNaN(d.getTime())) {
          const dayOfMonth = d.getDate();
          const weekIdx = Math.min(4, Math.floor((dayOfMonth - 1) / 7));
          weeks[weekIdx] += (completedIds as string[]).length;
        }
      });
      
      // Add current live progress to the correct week
      if (shouldIncludeLiveCounts) {
          const now = new Date();
          if (now.getFullYear() === y && now.getMonth() === m) {
              const weekIdx = Math.min(4, Math.floor((now.getDate() - 1) / 7));
              weeks[weekIdx] += tasks.filter(t => t.completed).length;
          }
      }

      return { labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5'], values: weeks };
    } else if (timeframe === 'año') {
      // Group by 12 months
      const months = Array(12).fill(0);
      Object.entries(historyMap || {}).forEach(([dateStr, completedIds]) => {
        const d = new Date(dateStr);
        if (d.getFullYear().toString() === selectedPeriod && !isNaN(d.getTime())) {
          months[d.getMonth()] += (completedIds as string[]).length;
        }
      });

      // Add current live progress to the correct month
      if (shouldIncludeLiveCounts) {
          const now = new Date();
          if (now.getFullYear().toString() === selectedPeriod) {
              months[now.getMonth()] += tasks.filter(t => t.completed).length;
          }
      }

      return { labels: ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], values: months };
    } else {
      // Siempre -> Group by year
      if (yearsList.length === 0) return { labels: [], values: [] };
      const sortedYears = [...yearsList].sort(); // ascending
      const values = Array(sortedYears.length).fill(0);
      Object.entries(historyMap || {}).forEach(([dateStr, completedIds]) => {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const idx = sortedYears.indexOf(d.getFullYear().toString());
          if (idx !== -1) values[idx] += (completedIds as string[]).length;
        }
      });

      // Add current live progress to the correct year
      if (shouldIncludeLiveCounts) {
          const now = new Date();
          const idx = sortedYears.indexOf(now.getFullYear().toString());
          if (idx !== -1) values[idx] += tasks.filter(t => t.completed).length;
      }

      return { labels: sortedYears.map(y => y.slice(2)), values };
    }
  }, [historyMap, timeframe, selectedPeriod, yearsList, tasks, shouldIncludeLiveCounts]);

  const maxChartValue = Math.max(...chartData.values, 1);

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-stone-900 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh] border border-stone-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-950 shrink-0">
          <h3 className={`font-bold text-white flex items-center gap-2 ${colorClass}`}>
            {icon}
            {title}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 border-b border-stone-800 bg-stone-900/50 space-y-3 shrink-0">
          <div className="flex bg-stone-950 rounded-lg p-1">
            {availableTimeframes.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${timeframe === tf ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-300'}`}
              >
                {tf}
              </button>
            ))}
          </div>
          
          {timeframe !== 'siempre' && (
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className={`w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-stone-500`}
            >
              {timeframe === 'mes' 
                ? monthsList.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)
                : yearsList.map(y => <option key={y} value={y}>{y}</option>)
              }
            </select>
          )}
        </div>
        
        <div className="overflow-y-auto p-4 flex-1">
          {/* List of items */}
          <div className="mb-6">
            {layout === 'grid' ? (
              <div className="grid grid-cols-4 gap-2">
                {itemCounts.map(item => (
                  <div 
                    key={item.id} 
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-stone-800/30 gap-2 border border-stone-800/20"
                    title={item.text}
                  >
                    <span className="text-2xl drop-shadow-sm filter">{getEmoji(item.text)}</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded-md min-w-[2.5rem] text-center text-xs ${colorClass} ${bgAccentClass}`}>
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {itemCounts.map(item => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-stone-800/30 border border-stone-800/20 gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{getEmoji(item.text)}</span>
                      <span className="text-xs font-bold text-stone-200 truncate">{item.text}</span>
                    </div>
                    <span className={`font-mono font-black px-3 py-1 rounded-lg text-sm shrink-0 ${colorClass} ${bgAccentClass}`}>
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bar Chart */}
          <div className="pt-4 border-t border-stone-800">
            <h4 className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-4 flex justify-between">
              Evolución
              <span className="text-stone-500 font-mono text-[9px]">{chartData.values.reduce((a,b)=>a+b, 0)} total</span>
            </h4>
            <div className="flex items-end justify-between h-24 gap-1 px-1 pt-2">
              {chartData.values.map((val, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-1 h-full relative group">
                  <span className="text-[10px] font-mono text-stone-500 absolute -top-4 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {val > 0 ? val : ''}
                  </span>
                  <div className="flex-1 w-full flex items-end">
                    <div 
                      className={`w-full rounded-t-sm transition-all duration-500 ease-out ${val > 0 ? bgAccentClass.replace('/10', '/80') : 'bg-stone-800/30'}`}
                      style={{ height: `${Math.max((val / maxChartValue) * 100, val === 0 ? 0 : 5)}%` }}
                    />
                  </div>
                  <span className="text-[8px] font-bold text-stone-600 mt-1 uppercase whitespace-nowrap overflow-hidden text-clip w-full text-center shrink-0">
                    {chartData.labels[idx]}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
