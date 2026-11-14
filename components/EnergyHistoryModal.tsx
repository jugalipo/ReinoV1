import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Activity, X, ChevronDown } from 'lucide-react';

interface EnergyHistoryModalProps {
  energyToday: number;
  energyHistory: Record<string, number>;
  onClose: () => void;
}

interface EnergyPoint {
  key: string;
  date: Date;
  value: number;
  xRatio: number;
  label: string;
}

const MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const toLocalDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const EnergyHistoryModal: React.FC<EnergyHistoryModalProps> = ({
  energyToday,
  energyHistory,
  onClose
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [timeframe, setTimeframe] = useState<'mes' | 'año'>('mes');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Open native modal dialog and provide light-dismiss fallback when closedby is unsupported
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      dialog.showModal();
    }

    if ('closedBy' in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };
    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  useEffect(() => {
    const container = chartContainerRef.current;
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
  }, []);

  // Normalize energyHistory into local YYYY-MM-DD map + today's live value
  const normalizedHistory = useMemo(() => {
    const map: Record<string, { date: Date; value: number }> = {};
    Object.entries(energyHistory || {}).forEach(([dateStr, val]) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      const localDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const key = toLocalDayKey(localDate);
      map[key] = { date: localDate, value: Math.max(1, Math.min(10, Number(val) || 1)) };
    });

    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayKey = toLocalDayKey(todayLocal);
    map[todayKey] = {
      date: todayLocal,
      value: Math.max(1, Math.min(10, Number(energyToday) || map[todayKey]?.value || 1))
    };
    return map;
  }, [energyHistory, energyToday]);

  const { monthsList, yearsList } = useMemo(() => {
    const months = new Set<string>();
    const years = new Set<string>();
    Object.values(normalizedHistory).forEach(({ date }) => {
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
      years.add(date.getFullYear().toString());
    });
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    years.add(now.getFullYear().toString());
    return {
      monthsList: Array.from(months).sort().reverse(),
      yearsList: Array.from(years).sort().reverse()
    };
  }, [normalizedHistory]);

  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => monthsList[0] || '');

  useEffect(() => {
    if (timeframe === 'mes' && !monthsList.includes(selectedPeriod)) {
      setSelectedPeriod(monthsList[0] || '');
    } else if (timeframe === 'año' && !yearsList.includes(selectedPeriod)) {
      setSelectedPeriod(yearsList[0] || '');
    }
    setHoveredIdx(null);
  }, [timeframe, monthsList, yearsList, selectedPeriod]);

  const formatMonth = (monthStr: string) => {
    if (!monthStr || !monthStr.includes('-')) return monthStr;
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const formatted = date.toLocaleDateString('es-ES', { month: 'long', year: '2-digit' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const { points, xTicks } = useMemo(() => {
    const resultPoints: EnergyPoint[] = [];
    const ticks: { label: string; xRatio: number }[] = [];

    if (timeframe === 'mes' && selectedPeriod.includes('-')) {
      const [yStr, mStr] = selectedPeriod.split('-');
      const year = parseInt(yStr, 10);
      const monthIdx = parseInt(mStr, 10) - 1;
      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

      for (let d = 1; d <= daysInMonth; d++) {
        const cellDate = new Date(year, monthIdx, d);
        const key = toLocalDayKey(cellDate);
        const entry = normalizedHistory[key];
        if (entry) {
          resultPoints.push({
            key,
            date: cellDate,
            value: entry.value,
            xRatio: daysInMonth > 1 ? (d - 1) / (daysInMonth - 1) : 0.5,
            label: `${d} ${MONTH_ABBR[monthIdx]}`
          });
        }
      }

      const candidateDays = [1, 5, 10, 15, 20, 25, daysInMonth];
      Array.from(new Set(candidateDays)).forEach(d => {
        if (d <= daysInMonth) {
          ticks.push({
            label: d.toString(),
            xRatio: daysInMonth > 1 ? (d - 1) / (daysInMonth - 1) : 0.5
          });
        }
      });
    } else if (timeframe === 'año' && selectedPeriod) {
      const year = parseInt(selectedPeriod, 10);
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      const totalDays = Math.round((endOfYear.getTime() - startOfYear.getTime()) / 86400000) + 1;

      (Object.entries(normalizedHistory) as [string, { date: Date; value: number }][])
        .filter(([, item]) => item.date.getFullYear() === year)
        .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
        .forEach(([key, item]) => {
          const dayOfYear = Math.round((item.date.getTime() - startOfYear.getTime()) / 86400000);
          resultPoints.push({
            key,
            date: item.date,
            value: item.value,
            xRatio: totalDays > 1 ? dayOfYear / (totalDays - 1) : 0.5,
            label: `${item.date.getDate()} ${MONTH_ABBR[item.date.getMonth()]}`
          });
        });

      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(year, m, 1);
        const dayOfYear = Math.round((monthStart.getTime() - startOfYear.getTime()) / 86400000);
        ticks.push({
          label: MONTH_ABBR[m],
          xRatio: totalDays > 1 ? dayOfYear / (totalDays - 1) : 0
        });
      }
    }

    return { points: resultPoints, xTicks: ticks };
  }, [timeframe, selectedPeriod, normalizedHistory]);

  const statsSummary = useMemo(() => {
    if (points.length === 0) {
      return { avg: '—', max: '—', min: '—', count: 0 };
    }
    const vals = points.map(p => p.value);
    const sum = vals.reduce((a, b) => a + b, 0);
    return {
      avg: (sum / vals.length).toFixed(1),
      max: Math.max(...vals).toString(),
      min: Math.min(...vals).toString(),
      count: vals.length
    };
  }, [points]);

  const svgWidth = Math.max(dimensions.width, 320);
  const svgHeight = Math.max(dimensions.height, 220);
  const padLeft = 36;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 32;
  const usableW = Math.max(10, svgWidth - padLeft - padRight);
  const usableH = Math.max(10, svgHeight - padTop - padBottom);

  const coords = useMemo(() => {
    return points.map(p => ({
      ...p,
      x: padLeft + p.xRatio * usableW,
      y: padTop + (1 - p.value / 10) * usableH
    }));
  }, [points, padLeft, padTop, usableW, usableH]);

  const { linePath, areaPath } = useMemo(() => {
    if (coords.length === 0) return { linePath: '', areaPath: '' };
    if (coords.length === 1) {
      const p = coords[0];
      return {
        linePath: `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
        areaPath: ''
      };
    }

    const minY = padTop;
    const maxY = padTop + usableH;
    let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? 0 : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2 >= coords.length ? coords.length - 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = Math.max(minY, Math.min(maxY, p1.y + (p2.y - p0.y) / 6));
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = Math.max(minY, Math.min(maxY, p2.y - (p3.y - p1.y) / 6));

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    const bottomY = (padTop + usableH).toFixed(1);
    const area = `${d} L ${coords[coords.length - 1].x.toFixed(1)} ${bottomY} L ${coords[0].x.toFixed(1)} ${bottomY} Z`;
    return { linePath: d, areaPath: area };
  }, [coords, padTop, usableH]);

  const handleChartPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (coords.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * svgWidth;
    let closest = 0;
    let bestDist = Infinity;
    coords.forEach((pt, idx) => {
      const dist = Math.abs(pt.x - relX);
      if (dist < bestDist) {
        bestDist = dist;
        closest = idx;
      }
    });
    setHoveredIdx(closest);
  };

  const activePoint = hoveredIdx !== null && coords[hoveredIdx]
    ? coords[hoveredIdx]
    : coords[coords.length - 1] || null;

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as any)}
      aria-labelledby="energy-modal-title"
      onClose={onClose}
      className="m-auto w-[calc(100vw-1rem)] max-w-4xl h-[min(90vh,720px)] bg-stone-900 text-stone-100 rounded-3xl border border-stone-800 shadow-2xl p-0 overflow-hidden backdrop:bg-black/85"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-stone-800 flex items-center justify-between bg-stone-950 shrink-0">
          <h2 id="energy-modal-title" className="font-bold text-white flex items-center gap-2 text-base sm:text-lg">
            <Activity className="w-5 h-5 text-orange-500" />
            Estadísticas de Energía
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Cerrar estadísticas de energía"
            className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Summary */}
        <div className="p-4 sm:px-6 border-b border-stone-800 bg-stone-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex bg-stone-950 rounded-lg p-1 shrink-0">
              {(['mes', 'año'] as const).map(tf => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${
                    timeframe === tf ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-xs">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                aria-label="Seleccionar periodo de energía"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-3 pr-8 py-2 text-sm text-white appearance-none focus:outline-none focus:border-orange-500/50 cursor-pointer"
              >
                {timeframe === 'mes'
                  ? monthsList.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)
                  : yearsList.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-stone-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-stone-500 uppercase text-[10px] font-sans font-bold">Media</span>
              <span className="text-orange-400 font-black">{statsSummary.avg}</span>
            </div>
            <div className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-stone-500 uppercase text-[10px] font-sans font-bold">Máx/Mín</span>
              <span className="text-stone-200 font-bold">{statsSummary.max}/{statsSummary.min}</span>
            </div>
            <div className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-stone-500 uppercase text-[10px] font-sans font-bold">Días</span>
              <span className="text-stone-200 font-bold">{statsSummary.count}</span>
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col min-h-0 bg-stone-950/40">
          <div className="flex items-center justify-between mb-3 min-h-[24px]">
            <span className="text-[11px] font-bold uppercase tracking-widest text-stone-500">
              {timeframe === 'mes' ? formatMonth(selectedPeriod) : `Año ${selectedPeriod}`}
            </span>
            {activePoint && (
              <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 rounded-full">
                {activePoint.label} · {activePoint.value}/10
              </span>
            )}
          </div>

          <div
            ref={chartContainerRef}
            className="flex-1 w-full min-h-[220px] bg-stone-950/60 rounded-2xl border border-stone-800/70 relative overflow-hidden"
          >
            {coords.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold uppercase tracking-wider text-stone-600">
                Sin registros de energía en este periodo
              </div>
            ) : (
              dimensions.width > 0 && (
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-full block touch-pan-y select-none"
                  onPointerMove={handleChartPointer}
                  onPointerDown={handleChartPointer}
                  onPointerLeave={() => setHoveredIdx(null)}
                >
                  <defs>
                    <linearGradient id="energyModalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Y-axis reference lines */}
                  {[0, 2, 4, 5, 6, 8, 10].map(level => {
                    const y = padTop + (1 - level / 10) * usableH;
                    const isMajor = level === 0 || level === 5 || level === 10;
                    return (
                      <g key={level}>
                        <line
                          x1={padLeft}
                          y1={y}
                          x2={svgWidth - padRight}
                          y2={y}
                          stroke={isMajor ? '#44403c' : '#292524'}
                          strokeWidth={isMajor ? '1' : '0.75'}
                          strokeDasharray={isMajor ? '4 4' : '2 5'}
                        />
                        {isMajor && (
                          <text
                            x={padLeft - 8}
                            y={y + 3.5}
                            fill="#78716c"
                            fontSize="11"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="end"
                          >
                            {level}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* X-axis tick labels */}
                  {xTicks.map((tick, idx) => {
                    const x = padLeft + tick.xRatio * usableW;
                    return (
                      <g key={`${tick.label}-${idx}`}>
                        <line
                          x1={x}
                          y1={padTop}
                          x2={x}
                          y2={padTop + usableH}
                          stroke="#1c1917"
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={svgHeight - 10}
                          fill="#78716c"
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {tick.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area & curve */}
                  {areaPath && <path d={areaPath} fill="url(#energyModalGradient)" />}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Data point markers (always visible in monthly view; only active point in annual view) */}
                  {timeframe === 'mes' &&
                    coords.map((pt, idx) => (
                      <circle
                        key={pt.key}
                        cx={pt.x}
                        cy={pt.y}
                        r={activePoint?.key === pt.key ? 5 : 3}
                        fill={activePoint?.key === pt.key ? '#ffffff' : '#f97316'}
                        stroke="#f97316"
                        strokeWidth={activePoint?.key === pt.key ? 2.5 : 1}
                      />
                    ))}

                  {activePoint && (
                    <g>
                      <line
                        x1={activePoint.x}
                        y1={padTop}
                        x2={activePoint.x}
                        y2={padTop + usableH}
                        stroke="#f97316"
                        strokeOpacity="0.35"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                      <circle cx={activePoint.x} cy={activePoint.y} r="8" fill="#f97316" fillOpacity="0.22" />
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.y}
                        r="4.5"
                        fill="#f97316"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    </g>
                  )}
                </svg>
              )
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
};
