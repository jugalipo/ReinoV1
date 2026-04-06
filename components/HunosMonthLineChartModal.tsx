import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Task } from '../types';
import { X, ChevronDown, Activity } from 'lucide-react';

interface HunosMonthLineChartModalProps {
  hunos: Task[];
  hunosHistory: Record<string, string[]>;
  monthsList: string[];
  initialMonth: string;
  onClose: () => void;
}

export const HunosMonthLineChartModal: React.FC<HunosMonthLineChartModalProps> = ({ 
  hunos, 
  hunosHistory, 
  monthsList, 
  initialMonth,
  onClose 
}) => {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height
        });
      }
    });
    
    observer.observe(container);
    return () => observer.disconnect();
  }, [mounted]);

  // --- MOBILE BACK BUTTON SUPPORT FOR THIS SUB MODAL ---
  useEffect(() => {
    window.history.pushState({ modal: 'monthLineChart' }, '');
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

  const chartData = useMemo(() => {
    if (!selectedMonth) return [];
    
    // selectedMonth comes as "YYYY-MM"
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1; // 0-indexed

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const dataPoints: { day: number, score: number, hasData: boolean }[] = [];

    const today = new Date();
    today.setHours(0,0,0,0);

    for (let d = 1; d <= daysInMonth; d++) {
        const cellDate = new Date(year, monthIndex, d);
        if (cellDate.getTime() > today.getTime()) {
           // Future
           dataPoints.push({ day: d, score: -1, hasData: false });
           continue;
        }

        // Find matches in history
        const keysToTest = [
            cellDate.toDateString(), // Try standard
            // Sometimes timezone issues happen so just checking matching day/month/year from the keys
        ];

        let foundIds: string[] | null = null;

        // More robust search
        Object.entries(hunosHistory || {}).forEach(([dateStr, ids]) => {
           const historyD = new Date(dateStr);
           if (!isNaN(historyD.getTime())) {
               if (historyD.getFullYear() === year && historyD.getMonth() === monthIndex && historyD.getDate() === d) {
                   foundIds = ids as string[];
               }
           }
        });

        if (foundIds !== null) {
            dataPoints.push({ day: d, score: getCoreScoreForIds(foundIds), hasData: true });
        } else {
            // Check if it's today and not yet entered in history, maybe we compute it live?
            // Actually history is updated on "toggle" or "last reset". Let's stick to history or live.
            if (cellDate.getTime() === today.getTime()) {
                 const currentCompletedIds = hunos.filter(t => t.completed).map(t => t.id);
                 dataPoints.push({ day: d, score: getCoreScoreForIds(currentCompletedIds), hasData: true });
            } else {
                 dataPoints.push({ day: d, score: 0, hasData: false }); // Missed day
            }
        }
    }

    return dataPoints;
  }, [hunosHistory, selectedMonth, hunos]);

  // SVG Drawing calculations
  const isPortrait = dimensions.height > dimensions.width;
  const wrapperWidth = isPortrait ? dimensions.height - 10 : dimensions.width - 10;
  const wrapperHeight = isPortrait ? dimensions.width - 10 : dimensions.height - 10;

  const svgWidth = Math.max(wrapperWidth, 300);
  const svgHeight = Math.max(wrapperHeight, 200);

  const paddingX = 40;
  const paddingYTop = 40;
  const paddingYBottom = 40;

  const validPoints = chartData.filter(d => d.score !== -1);
  const dataLength = validPoints.length;
  
  let pPath = '';
  let fillPath = '';
  let circles: {cx: number, cy: number, score: number, hasData: boolean, day: number}[] = [];

  if (dataLength > 0) {
      const stepX = (svgWidth - paddingX * 2) / Math.max(1, dataLength - 1);
      const graphHeight = svgHeight - paddingYTop - paddingYBottom;

      validPoints.forEach((pt, idx) => {
          const cx = paddingX + idx * stepX;
          // Invert Y axis: score 5 is at top, 0 is at bottom
          const cy = paddingYTop + graphHeight - (pt.score / 5) * graphHeight;
          
          circles.push({ cx, cy, score: pt.score, hasData: pt.hasData, day: pt.day });
          
          if (idx === 0) {
              pPath += `M ${cx} ${cy}`;
              fillPath += `M ${cx} ${svgHeight - paddingYBottom} L ${cx} ${cy}`;
          } else {
              pPath += ` L ${cx} ${cy}`;
              fillPath += ` L ${cx} ${cy}`;
          }

          if (idx === dataLength - 1) {
             fillPath += ` L ${cx} ${svgHeight - paddingYBottom} Z`;
          }
      });
  }

  const formatMonth = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const formatted = date.toLocaleDateString('es-ES', { month: 'long', year: '2-digit' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };


  return (
    <div 
      className="fixed inset-0 w-full max-w-md mx-auto z-[70] flex flex-col p-4 sm:p-6 bg-stone-950 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="flex-1 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl relative flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-full transition-colors"
        >
            <X className="w-6 h-6" />
        </button>

        <div className="absolute top-6 left-6 pr-14 z-20">
            <div className="relative">
                <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="text-2xl font-black text-white bg-transparent appearance-none cursor-pointer focus:outline-none w-full truncate pr-8 flex items-center gap-2"
                >
                    {monthsList.length === 0 && <option value={selectedMonth}>{formatMonth(selectedMonth)}</option>}
                    {monthsList.map(m => (
                        <option key={m} value={m} className="text-base bg-stone-900 text-stone-200">
                            {formatMonth(m)}
                        </option>
                    ))}
                </select>
                <div className="absolute left-[130px] top-1/2 -translate-y-1/2 pointer-events-none text-stone-500">
                    <ChevronDown className="w-6 h-6" />
                </div>
            </div>
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mt-1 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/> Fluctuación Mensual (Core)</p>
        </div>

        <div ref={containerRef} className="w-full flex-1 mt-16 relative bg-stone-950/40 rounded-3xl border border-stone-800/50 overflow-hidden">
             {dimensions.width > 0 && (
               <div 
                  className="relative flex items-center justify-center p-2"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: `${wrapperWidth}px`,
                    height: `${wrapperHeight}px`,
                    transform: isPortrait ? 'translate(-50%, -50%) rotate(-90deg)' : 'translate(-50%, -50%)',
                  }}
               >
                 {/* Chart Graph */}
                 <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible drop-shadow-xl">
                    <defs>
                        <linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Y Axis Grid Lines */}
                    {[0, 1, 2, 3, 4, 5].map(tick => {
                        const cy = paddingYTop + (svgHeight - paddingYTop - paddingYBottom) - (tick / 5) * (svgHeight - paddingYTop - paddingYBottom);
                        return (
                            <g key={`ytick-${tick}`}>
                                <line x1={paddingX} y1={cy} x2={svgWidth - paddingX} y2={cy} stroke="#292524" strokeWidth="1" strokeDasharray="4 4" />
                                <text x={paddingX - 15} y={cy + 4} fill="#78716c" fontSize="12" fontWeight="bold" fontFamily="monospace" textAnchor="end">{tick}</text>
                            </g>
                        )
                    })}

                    {validPoints.length > 0 && (
                        <>
                            {/* Area Fill */}
                            <path d={fillPath} fill="url(#scoreArea)" />
                            
                            {/* Line */}
                            <path d={pPath} fill="none" stroke="#f97316" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            
                            {/* Data Points */}
                            {circles.map((c, i) => (
                                <g key={`pt-${i}`}>
                                    <circle 
                                      cx={c.cx} 
                                      cy={c.cy} 
                                      r={c.hasData ? 6 : 4} 
                                      fill={c.hasData ? '#ea580c' : '#44403c'} 
                                      stroke="#1c1917" 
                                      strokeWidth="3" 
                                    />
                                    {/* X Axis labels (day) */}
                                    <text 
                                      x={c.cx} 
                                      y={svgHeight - paddingYBottom + 20} 
                                      fill={c.hasData ? '#a8a29e' : '#57534e'} 
                                      fontSize="10" 
                                      fontWeight="bold" 
                                      textAnchor="middle"
                                    >
                                      {c.day}
                                    </text>
                                </g>
                            ))}
                        </>
                    )}
                 </svg>
                 
                 {validPoints.length === 0 && (
                     <div className="absolute inset-0 flex items-center justify-center">
                         <span className="text-stone-500 font-bold uppercase tracking-widest text-sm">Sin Datos</span>
                     </div>
                 )}
               </div>
             )}
        </div>

      </div>
    </div>
  );
};
