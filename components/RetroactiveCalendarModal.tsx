import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';

interface RetroactiveCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  streakReviewedDays?: Record<string, boolean>;
  hunosHistory?: Record<string, string[]>;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export const RetroactiveCalendarModal: React.FC<RetroactiveCalendarModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  streakReviewedDays = {},
  hunosHistory = {}
}) => {
  const [viewDate, setViewDate] = useState(() => ({
    month: selectedDate.getMonth(),
    year: selectedDate.getFullYear()
  }));

  const [openDropdown, setOpenDropdown] = useState<'none' | 'month' | 'year'>('none');

  // Sincronizar mes y año visibles al abrir con la fecha seleccionada
  useEffect(() => {
    if (isOpen) {
      setViewDate({
        month: selectedDate.getMonth(),
        year: selectedDate.getFullYear()
      });
      setOpenDropdown('none');
    }
  }, [isOpen, selectedDate]);

  // Extraer dinámicamente años y meses con datos reales para los filtros
  const { availableYears, availableMonthsByYear } = useMemo(() => {
    const yearsSet = new Set<number>();
    const monthsMap: Record<number, Set<number>> = {};

    const addDateStr = (dateStr: string) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      const y = d.getFullYear();
      const m = d.getMonth();
      yearsSet.add(y);
      if (!monthsMap[y]) monthsMap[y] = new Set<number>();
      monthsMap[y].add(m);
    };

    if (hunosHistory) {
      Object.keys(hunosHistory).forEach(addDateStr);
    }
    if (streakReviewedDays) {
      Object.keys(streakReviewedDays).forEach(addDateStr);
    }

    // Asegurar año y mes actual
    const now = new Date();
    addDateStr(now.toDateString());

    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a); // 2026, 2025...
    const monthsByYear: Record<number, number[]> = {};
    sortedYears.forEach(y => {
      monthsByYear[y] = Array.from(monthsMap[y] || []).sort((a, b) => a - b);
    });

    return { availableYears: sortedYears, availableMonthsByYear: monthsByYear };
  }, [hunosHistory, streakReviewedDays]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const handlePrevMonth = () => {
    setOpenDropdown('none');
    setViewDate(prev => {
      const currentYearMonths = availableMonthsByYear[prev.year] || [];
      const currentIdxInYear = currentYearMonths.indexOf(prev.month);

      if (currentIdxInYear > 0) {
        return { ...prev, month: currentYearMonths[currentIdxInYear - 1] };
      }

      // Buscar año anterior disponible
      const currentYearIdx = availableYears.indexOf(prev.year);
      if (currentYearIdx !== -1 && currentYearIdx < availableYears.length - 1) {
        const prevYear = availableYears[currentYearIdx + 1];
        const prevYearMonths = availableMonthsByYear[prevYear] || [11];
        return {
          year: prevYear,
          month: prevYearMonths[prevYearMonths.length - 1]
        };
      }

      return prev;
    });
  };

  const handleNextMonth = () => {
    setOpenDropdown('none');
    setViewDate(prev => {
      const currentYearMonths = availableMonthsByYear[prev.year] || [];
      const currentIdxInYear = currentYearMonths.indexOf(prev.month);

      if (currentIdxInYear !== -1 && currentIdxInYear < currentYearMonths.length - 1) {
        return { ...prev, month: currentYearMonths[currentIdxInYear + 1] };
      }

      // Buscar año siguiente disponible
      const currentYearIdx = availableYears.indexOf(prev.year);
      if (currentYearIdx > 0) {
        const nextYear = availableYears[currentYearIdx - 1];
        const nextYearMonths = availableMonthsByYear[nextYear] || [0];
        return {
          year: nextYear,
          month: nextYearMonths[0]
        };
      }

      return prev;
    });
  };

  const isPrevDisabled = useMemo(() => {
    const oldestYear = availableYears[availableYears.length - 1];
    const oldestMonths = availableMonthsByYear[oldestYear] || [];
    return viewDate.year === oldestYear && viewDate.month === oldestMonths[0];
  }, [viewDate, availableYears, availableMonthsByYear]);

  const isNextDisabled = useMemo(() => {
    const latestYear = availableYears[0];
    const latestMonths = availableMonthsByYear[latestYear] || [];
    return viewDate.year === latestYear && viewDate.month === latestMonths[latestMonths.length - 1];
  }, [viewDate, availableYears, availableMonthsByYear]);

  const { daysInMonth, firstDayOfWeek, reviewedCount, totalPastDaysInMonth } = useMemo(() => {
    const days = new Date(viewDate.year, viewDate.month + 1, 0).getDate();
    const firstDay = new Date(viewDate.year, viewDate.month, 1);
    const offset = (firstDay.getDay() + 6) % 7;

    let reviewed = 0;
    let pastDays = 0;
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    for (let d = 1; d <= days; d++) {
      const dateObj = new Date(viewDate.year, viewDate.month, d);
      if (dateObj <= now) {
        pastDays++;
        if (streakReviewedDays[dateObj.toDateString()]) {
          reviewed++;
        }
      }
    }

    return {
      daysInMonth: days,
      firstDayOfWeek: offset,
      reviewedCount: reviewed,
      totalPastDaysInMonth: pastDays
    };
  }, [viewDate, streakReviewedDays]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => {
        if (openDropdown !== 'none') {
          setOpenDropdown('none');
        } else {
          onClose();
        }
      }}
    >
      <div 
        className="bg-stone-950 border border-stone-800 rounded-3xl p-5 shadow-2xl w-full max-w-sm flex flex-col space-y-4 animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-stone-100">
              Calendario de Racha
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-stone-900 rounded-full text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegador con selectores desplegables oscuros para Mes y Año */}
        <div className="flex items-center justify-between bg-stone-900/90 px-3 py-2 rounded-2xl border border-stone-800 relative">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={isPrevDisabled}
            className="p-2 hover:bg-stone-800 rounded-xl text-stone-400 hover:text-stone-100 transition-colors disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
            title="Mes anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Desplegables integrados en negro */}
          <div className="flex items-center gap-1.5 relative">
            {/* Selector de Mes */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'month' ? 'none' : 'month')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                  openDropdown === 'month'
                    ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                    : 'bg-stone-950 hover:bg-stone-800 border-stone-800 text-stone-200'
                }`}
                title="Seleccionar mes"
              >
                <span>{MONTH_NAMES[viewDate.month]}</span>
                <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${openDropdown === 'month' ? 'rotate-180 text-purple-400' : ''}`} />
              </button>

              {openDropdown === 'month' && (
                <div className="absolute top-full mt-2 -left-6 z-40 bg-stone-950 border border-stone-800 rounded-2xl p-2 shadow-2xl w-48 grid grid-cols-3 gap-1 animate-in fade-in zoom-in-95 duration-100">
                  {(availableMonthsByYear[viewDate.year] || []).map(mIdx => (
                    <button
                      key={mIdx}
                      type="button"
                      onClick={() => {
                        setViewDate(prev => ({ ...prev, month: mIdx }));
                        setOpenDropdown('none');
                      }}
                      className={`py-2 px-1 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                        viewDate.month === mIdx
                          ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                          : 'bg-stone-900 text-stone-300 hover:bg-stone-800 hover:text-white border border-stone-800/80'
                      }`}
                    >
                      {MONTH_NAMES[mIdx].substring(0, 3)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selector de Año */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'year' ? 'none' : 'year')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                  openDropdown === 'year'
                    ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                    : 'bg-stone-950 hover:bg-stone-800 border-stone-800 text-stone-200'
                }`}
                title="Seleccionar año"
              >
                <span>{viewDate.year}</span>
                <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${openDropdown === 'year' ? 'rotate-180 text-purple-400' : ''}`} />
              </button>

              {openDropdown === 'year' && (
                <div className="absolute top-full mt-2 -left-6 z-40 bg-stone-950 border border-stone-800 rounded-2xl p-2 shadow-2xl w-28 max-h-56 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95 duration-100">
                  {availableYears.map(y => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        const availMonths = availableMonthsByYear[y] || [0];
                        const newMonth = availMonths.includes(viewDate.month)
                          ? viewDate.month
                          : availMonths[availMonths.length - 1];
                        setViewDate({ year: y, month: newMonth });
                        setOpenDropdown('none');
                      }}
                      className={`w-full py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                        viewDate.year === y
                          ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                          : 'bg-stone-900 text-stone-300 hover:bg-stone-800 hover:text-white border border-stone-800/80'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewDate({ month: now.getMonth(), year: now.getFullYear() });
                setOpenDropdown('none');
              }}
              className="text-xs px-2 py-1 rounded-lg bg-stone-800/80 hover:bg-stone-800 text-purple-300 font-medium border border-stone-700/50 transition-colors cursor-pointer"
              title="Ir al mes actual"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isNextDisabled}
              className="p-2 hover:bg-stone-800 rounded-xl text-stone-400 hover:text-stone-100 transition-colors disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Días de la semana (Lunes a Domingo) */}
        <div className="grid grid-cols-7 text-center text-xs font-bold text-stone-500 py-1">
          {WEEKDAY_NAMES.map((wd, i) => (
            <div key={i} className="py-1">
              {wd}
            </div>
          ))}
        </div>

        {/* Rejilla de días */}
        <div 
          className="grid grid-cols-7 gap-y-2 gap-x-1"
          onClick={() => setOpenDropdown('none')}
        >
          {/* Espacios vacíos antes del día 1 */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="w-9 h-9 mx-auto" />
          ))}

          {/* Días del mes */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const cellDate = new Date(viewDate.year, viewDate.month, day);
            const dateKey = cellDate.toDateString();
            const isFuture = cellDate > today;
            const isToday = cellDate.toDateString() === new Date().toDateString();
            const isSelected = cellDate.toDateString() === selectedDate.toDateString();
            const isReviewed = !!streakReviewedDays[dateKey];

            if (isFuture) {
              return (
                <div
                  key={day}
                  className="w-9 h-9 mx-auto rounded-full flex items-center justify-center text-stone-700 text-xs opacity-25 cursor-not-allowed select-none"
                >
                  {day}
                </div>
              );
            }

            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  onSelectDate(cellDate);
                  onClose();
                }}
                className={`relative w-9 h-9 mx-auto rounded-full flex items-center justify-center text-xs font-bold transition-all active:scale-90 cursor-pointer ${
                  isReviewed
                    ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.45)] hover:bg-purple-500'
                    : 'bg-stone-900 border border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                } ${
                  isSelected
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-stone-950 scale-105 z-10'
                    : ''
                } ${
                  isToday && !isReviewed
                    ? 'border-purple-500/70 text-purple-300'
                    : ''
                }`}
                title={`${day} de ${MONTH_NAMES[viewDate.month]}: ${isReviewed ? 'Revisado (Racha)' : 'Sin revisar'}`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Resumen del mes y leyenda */}
        <div className="pt-2 border-t border-stone-800/80 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-stone-400 px-1">
            <span className="font-medium">
              Revisados este mes:
            </span>
            <span className="font-bold text-purple-400 font-mono">
              {reviewedCount} / {totalPastDaysInMonth} días ({totalPastDaysInMonth > 0 ? Math.round((reviewedCount / totalPastDaysInMonth) * 100) : 0}%)
            </span>
          </div>

          <div className="flex items-center justify-around text-[10px] text-stone-500 pt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-purple-600 shadow-[0_0_6px_rgba(168,85,247,0.4)]" />
              <span>Revisado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-stone-900 border border-stone-700" />
              <span>Sin revisar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-stone-900 border-2 border-white" />
              <span>Seleccionado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
