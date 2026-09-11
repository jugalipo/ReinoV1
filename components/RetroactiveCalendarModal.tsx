import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface RetroactiveCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  streakReviewedDays?: Record<string, boolean>;
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
  streakReviewedDays = {}
}) => {
  const [viewDate, setViewDate] = useState(() => ({
    month: selectedDate.getMonth(),
    year: selectedDate.getFullYear()
  }));

  // Sincronizar mes visible al abrir con la fecha seleccionada
  useEffect(() => {
    if (isOpen) {
      setViewDate({
        month: selectedDate.getMonth(),
        year: selectedDate.getFullYear()
      });
    }
  }, [isOpen, selectedDate]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const handlePrevMonth = () => {
    setViewDate(prev => {
      if (prev.month === 0) {
        return { month: 11, year: prev.year - 1 };
      }
      return { month: prev.month - 1, year: prev.year };
    });
  };

  const handleNextMonth = () => {
    const now = new Date();
    if (
      viewDate.year > now.getFullYear() ||
      (viewDate.year === now.getFullYear() && viewDate.month >= now.getMonth())
    ) {
      return;
    }
    setViewDate(prev => {
      if (prev.month === 11) {
        return { month: 0, year: prev.year + 1 };
      }
      return { month: prev.month + 1, year: prev.year };
    });
  };

  const isNextDisabled = useMemo(() => {
    const now = new Date();
    return (
      viewDate.year > now.getFullYear() ||
      (viewDate.year === now.getFullYear() && viewDate.month >= now.getMonth())
    );
  }, [viewDate]);

  const { daysInMonth, firstDayOfWeek, reviewedCount, totalPastDaysInMonth } = useMemo(() => {
    const days = new Date(viewDate.year, viewDate.month + 1, 0).getDate();
    const firstDay = new Date(viewDate.year, viewDate.month, 1);
    // 0 = domingo en JS, pasamos a semana Lunes = 0 .. Domingo = 6
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
      onClick={onClose}
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
            className="p-1.5 hover:bg-stone-900 rounded-full text-stone-400 hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegador de mes y año */}
        <div className="flex items-center justify-between bg-stone-900/90 px-3 py-2 rounded-2xl border border-stone-800">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 hover:bg-stone-800 rounded-xl text-stone-400 hover:text-stone-100 transition-colors"
            title="Mes anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <span className="text-base font-bold text-stone-100">
              {MONTH_NAMES[viewDate.month]} {viewDate.year}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewDate({ month: now.getMonth(), year: now.getFullYear() });
              }}
              className="text-xs px-2 py-1 rounded-lg bg-stone-800/80 hover:bg-stone-800 text-purple-300 font-medium border border-stone-700/50 transition-colors"
              title="Ir al mes actual"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isNextDisabled}
              className="p-2 hover:bg-stone-800 rounded-xl text-stone-400 hover:text-stone-100 transition-colors disabled:opacity-20 disabled:hover:bg-transparent"
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
        <div className="grid grid-cols-7 gap-y-2 gap-x-1">
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
                className={`relative w-9 h-9 mx-auto rounded-full flex items-center justify-center text-xs font-bold transition-all active:scale-90 ${
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
