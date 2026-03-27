import React, { useMemo, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Task } from '../types';
import { X } from 'lucide-react';

interface HunosMonthViewModalProps {
  tasks: Task[];
  hunosHistory: Record<string, string[]>;
  onClose: () => void;
}

export const HunosMonthViewModal: React.FC<HunosMonthViewModalProps> = ({ tasks, hunosHistory, onClose }) => {
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

  const { daysInMonth, currentMonthName, currentYear, todayDate, monthIndex } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    return {
      daysInMonth: days,
      currentMonthName: monthNames[month],
      currentYear: year,
      todayDate: now.getDate(),
      monthIndex: month
    };
  }, []);

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getEmoji = (text: string) => {
    const match = text.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u);
    return match ? match[0] : text.substring(0, 2);
  };

  // Group tasks
  const group1 = tasks.slice(0, 4);
  const group2 = tasks.slice(4, 15);
  const group3 = tasks.slice(15);

  const totalRows = Math.max(1, tasks.length);

  const MARGIN = 12;
  const availableW = Math.max(0, dimensions.width - MARGIN * 2);
  const availableH = Math.max(0, dimensions.height - MARGIN * 2);

  const isPortrait = dimensions.height > dimensions.width;
  const wrapperWidth = isPortrait ? availableH : availableW;
  const wrapperHeight = isPortrait ? availableW : availableH;

  const firstColPct = 8;

  const cellH = wrapperHeight / totalRows;
  const firstColW = wrapperWidth * (firstColPct / 100);
  const dayColW = (wrapperWidth - firstColW) / daysInMonth;

  const emojiSize = Math.max(8, Math.min(firstColW * 0.6, cellH * 0.6));
  const markerSize = Math.max(4, Math.min(dayColW * 0.5, cellH * 0.4));

  const totalFailures = useMemo(() => {
    let count = 0;
    tasks.forEach(task => {
      let prevFailed = false;
      for (let day = 1; day < todayDate; day++) {
        const d = new Date(currentYear, monthIndex, day);
        const dateStr = d.toDateString();
        const completedIds = hunosHistory[dateStr] || [];
        const isCompleted = completedIds.includes(task.id);
        const isFailed = !isCompleted;
        
        if (isFailed && prevFailed) {
          count++;
        }
        prevFailed = isFailed;
      }
    });
    return count;
  }, [tasks, hunosHistory, currentYear, monthIndex, todayDate]);

  const renderTaskCells = (task: Task, isMiddleGroup: boolean = false) => {
    const emoji = getEmoji(task.text);
    
    const dayStatuses = daysArray.map(day => {
      const isFuture = day >= todayDate;
      if (isFuture) return 'future';
      
      const d = new Date(currentYear, monthIndex, day);
      const dateStr = d.toDateString();
      const completedIds = hunosHistory[dateStr] || [];
      const isCompleted = completedIds.includes(task.id);
      
      return isCompleted ? 'completed' : 'failed';
    });

    const baseBg = isMiddleGroup ? 'bg-transparent' : 'bg-stone-800';

    return (
      <React.Fragment key={task.id}>
        <div className={`flex items-center justify-center border-b border-r border-stone-800/50 overflow-hidden whitespace-nowrap ${baseBg}`}>
          <span className="leading-none" style={{ fontSize: `${emojiSize}px` }} title={task.text}>{emoji}</span>
        </div>
        {daysArray.map((day, index) => {
          const status = dayStatuses[index];
          const isMultipleOf5 = day % 5 === 0;
          const cellBg = isMultipleOf5 
            ? (isMiddleGroup ? 'bg-stone-800/80' : 'bg-stone-700/60') 
            : baseBg;
          
          let content = null;
          if (status === 'completed') {
            content = <div className="absolute inset-0 bg-emerald-500/40" />;
          } else if (status === 'failed') {
            const prevFailed = index > 0 && dayStatuses[index - 1] === 'failed';
            const nextFailed = index < dayStatuses.length - 1 && dayStatuses[index + 1] === 'failed';
            
            if (prevFailed || nextFailed) {
              content = (
                <>
                  <div className="absolute top-1/2 -translate-y-1/2 bg-red-500/50" 
                       style={{
                         left: prevFailed && !nextFailed ? '0' : (prevFailed && nextFailed ? '0' : '50%'),
                         width: (prevFailed && nextFailed) ? '100%' : '50%',
                         height: `${Math.max(2, (markerSize / 3) * 2)}px`
                       }}
                  />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 z-10" style={{ width: `${markerSize}px`, height: `${markerSize}px` }} />
                </>
              );
            } else {
              content = <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/30" style={{ width: `${markerSize}px`, height: `${markerSize}px` }} />;
            }
          }

          return (
            <div key={day} className={`relative flex items-center justify-center border-b border-stone-800/30 overflow-hidden ${cellBg}`}>
              {content}
            </div>
          );
        })}
      </React.Fragment>
    );
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] bg-stone-950 flex flex-col overflow-hidden">
      {/* Header - Fixed at physical top, NEVER rotated */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-stone-800 bg-stone-900 shrink-0 w-full">
        <h2 className="text-sm font-bold text-stone-200 flex items-center gap-3">
          <span>{currentMonthName} {currentYear}</span>
          {totalFailures > 0 && (
            <span className="text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full text-xs font-medium">
              {totalFailures} fallos
            </span>
          )}
        </h2>
        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-stone-800 text-stone-400 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Grid Container */}
      <div ref={containerRef} className="flex-1 relative w-full bg-stone-950 overflow-hidden">
        {dimensions.width > 0 && (
          <div 
            className="border border-stone-800/50 rounded-xl overflow-hidden shadow-2xl"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: `${wrapperWidth}px`,
              height: `${wrapperHeight}px`,
              transform: isPortrait ? 'translate(-50%, -50%) rotate(90deg)' : 'translate(-50%, -50%)',
              display: 'grid',
              gridTemplateColumns: `${firstColPct}% repeat(${daysInMonth}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${totalRows}, minmax(0, 1fr))`,
              boxSizing: 'border-box'
            }}
          >
            {/* Group 1 */}
            {group1.map(task => renderTaskCells(task, false))}

            {/* Group 2 (Middle Group with lighter background) */}
            {group2.map(task => renderTaskCells(task, true))}

            {/* Group 3 */}
            {group3.map(task => renderTaskCells(task, false))}
          </div>
        )}
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
};
