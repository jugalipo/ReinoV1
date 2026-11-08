import React, { useState } from 'react';
import { Task } from '../types';
import { Sword } from 'lucide-react';
import { useModalHistory } from '../hooks/useModalHistory';
import { HunosMonthViewModal } from './HunosMonthViewModal';

interface DailyHunosProps {
  className?: string;
  tasks: Task[];
  hunosHistory: Record<string, string[]>;
  lockedTaskIds?: string[];
  onUpdate: (tasks: Task[], isPleno?: boolean) => void;
  energy: number;
  onUpdateEnergy: (value: number) => void;
}

export const DailyHunos: React.FC<DailyHunosProps> = ({ 
  className = 'mt-0',
  tasks, 
  hunosHistory, 
  lockedTaskIds = [],
  onUpdate,
  energy,
  onUpdateEnergy
}) => {
  const [showMonthView, setShowMonthView] = useState(false);

  // Group tasks for display
  const isOddDay = new Date().getDate() % 2 !== 0;
  const fantasticosTasks = tasks.filter((t, i) => t.hunoType === 'fantastico' || (!t.hunoType && i < 4));
  const enanitosTasks = tasks.filter((t, i) => t.hunoType === 'enanito' || (!t.hunoType && i >= 4 && (t.hunoType === 'enanito' || i < 16)));
  const fondoTasks = tasks.filter((t, i) => t.hunoType === 'fondo' || (!t.hunoType && i >= 16 && t.hunoType !== 'enanito'));

  // Filter out the "GAP" tasks for calculations in View Mode
  const visibleTasks = tasks.filter(t => t.text !== 'GAP');
  const completedCount = visibleTasks.filter(t => t.completed).length;
  const lostCoinsCount = visibleTasks.filter(t => t.failedYesterday && !t.completed).length;

  const getCoreScore = () => {
    let score = 0;
    tasks.forEach(t => {
      if (t.completed) {
        if (t.shortcut === 'leones' || t.text.includes('🦁')) score += 2;
        else if (t.shortcut === 'exercise' || t.text.toLowerCase().includes('gim')) score += 1;
        else if (t.shortcut === 'love' || t.text.includes('❤️')) score += 1;
        else if (t.shortcut === 'read' || t.text.toLowerCase().includes('leer')) score += 1;
      }
    });
    return score;
  };

  const coreScore = getCoreScore();
  const coreTotal = 5;

  // --- MOBILE BACK BUTTON SUPPORT FOR MODALS ---
  useModalHistory(showMonthView, () => setShowMonthView(false));
  // ---------------------------------------------

  // --- VIEW MODE ACTIONS ---
  const toggleTask = (id: string) => {
    if (lockedTaskIds.includes(id)) return;

    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const willBeCompleted = !task.completed;
    const simulatedTasks = tasks.map((t) =>
      t.id === id ? { ...t, completed: willBeCompleted } : t
    );

    onUpdate(simulatedTasks, false);
  };

  const getEmoji = (text: string) => {
    // Regex para capturar el emoji completo preservando selectores de variación, modificadores y secuencias ZWJ
    const match = text.match(/\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*|\p{Emoji_Presentation}/u);
    if (!match) return text.substring(0, 2);
    let emoji = match[0];
    // Forzar el selector de variación 16 (U+FE0F) para garantizar presentación con todos los colores en móvil y escritorio
    if (!emoji.includes('\uFE0F') && !emoji.includes('\uFE0E')) {
      emoji += '\uFE0F';
    }
    return emoji;
  };

  return (
    <div className={`bg-stone-900 rounded-2xl shadow-sm p-6 w-full ${className} border border-stone-800 relative`}>
      
      {/* Header Row: Espada + Hunos + Barra segmentada en rayas verticales */}
      <div className="flex items-center gap-3.5 mb-5">
        <div className="flex items-center gap-2 shrink-0">
          <Sword className="w-5 h-5 sm:w-6 sm:h-6 text-stone-400" />
          <button 
            onClick={() => setShowMonthView(true)}
            className="text-xl font-bold text-stone-200 hover:text-orange-400 transition-colors cursor-pointer"
            title="Ver calendario mensual de Hunos"
          >
            Hunos
          </button>
        </div>

        {/* Línea de progreso segmentada en rayas verticales */}
        <div 
          className="flex-1 flex items-center gap-[2.5px] sm:gap-1 h-3.5 px-0.5"
          title={`${completedCount} de ${visibleTasks.length} completados`}
        >
          {visibleTasks.map((_, idx) => {
            const isDone = idx < completedCount;
            return (
              <div
                key={idx}
                className={`flex-1 h-full rounded-[1.5px] transition-all duration-300 ${
                  isDone
                    ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]'
                    : 'bg-stone-800 border border-stone-800/80'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* VIEW MODE: SECTIONS */}
      <div className="space-y-4">
            {/* 1. Los 4 Fantásticos - Capsule Row */}
            {tasks.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-4 my-2 px-1">
                        <div className="h-px bg-stone-800 flex-1"></div>
                        <span className="text-xs font-medium text-stone-600 uppercase tracking-wider">Los 4 Fantásticos</span>
                        <div className="h-px bg-stone-800 flex-1"></div>
                    </div>
                    
                    <div className="relative p-1.5 rounded-full bg-stone-950/40 border border-stone-800/50 overflow-hidden shadow-inner group/capsule">
                        {/* Dynamic Progress Bar Background */}
                        <div 
                          className="absolute left-0 top-0 h-full bg-amber-600/75 transition-all duration-1000 ease-out shadow-[0_0_40px_rgba(217,119,6,0.3)]"
                          style={{ width: `${(coreScore / coreTotal) * 100}%` }}
                        />
                        {/* Shimmer effect when full */}
                        {coreScore >= coreTotal && (
                            <div className="absolute inset-0 bg-amber-400 animate-pulse opacity-20" />
                        )}
                        
                        <div className="grid grid-cols-4 gap-3 relative z-10">
                            {fantasticosTasks.map((task, index) => {
                                const isFailed = task.failedYesterday && !task.completed;
                                const missedDays = task.missedDays || 0;

                                let fillPercentage = 0;
                                let isBlinkingRed = false;
                                if (isFailed) {
                                    if (missedDays === 2) fillPercentage = 25;
                                    else if (missedDays === 3) fillPercentage = 50;
                                    else if (missedDays === 4) fillPercentage = 75;
                                    else if (missedDays >= 5) {
                                        fillPercentage = 100;
                                        isBlinkingRed = true;
                                    }
                                }

                                return (
                                <button
                                    key={task.id}
                                    onClick={() => toggleTask(task.id)}
                                    title={task.text}
                                    className={`
                                        aspect-square flex items-center justify-center text-3xl relative transition-all duration-300 overflow-hidden rounded-full
                                        ${task.completed
                                            ? 'border-2 bg-emerald-500 hover:bg-emerald-400 dark:bg-emerald-600 border-emerald-400 dark:border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-95'
                                            : isFailed
                                                ? `border-4 border-red-500 text-red-700 dark:text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.3)] ${isBlinkingRed ? 'bg-red-500 animate-blink' : 'bg-red-100 dark:bg-red-900/50'}`
                                                : 'border-2 bg-white dark:bg-stone-800/80 border-stone-200 dark:border-stone-700/50 text-stone-800 dark:text-stone-200 hover:border-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700 shadow-sm'
                                        }
                                    `}
                                >
                                    {isFailed && fillPercentage > 0 && !isBlinkingRed && (
                                        <div 
                                            className="absolute bottom-0 left-0 right-0 bg-red-600/80 transition-all duration-500"
                                            style={{ height: `${fillPercentage}%` }}
                                        />
                                    )}
                                    <span className="drop-shadow-sm filter relative z-10">{getEmoji(task.text)}</span>
                                </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Rest of Hunos - Regular Grid */}
            <div className="grid grid-cols-4 gap-3">
                {[...enanitosTasks, ...fondoTasks].map((task, index) => {
                    const isEnanito = enanitosTasks.includes(task);
                    const isFirstEnanito = isEnanito && index === 0;
                    const isFirstFondo = !isEnanito && index === enanitosTasks.length;

                    const elements = [];

                    if (isFirstEnanito) {
                        elements.push(
                            <div key="sep-1" className="col-span-4 flex items-center gap-4 my-2 px-1">
                                <div className="h-px bg-stone-800 flex-1"></div>
                                <span className="text-xs font-medium text-stone-600 uppercase tracking-wider">Los {enanitosTasks.length} Enanitos</span>
                                <div className="h-px bg-stone-800 flex-1"></div>
                            </div>
                        );
                    }
                    if (isFirstFondo) {
                        elements.push(
                            <div key="sep-2" className="col-span-4 flex items-center gap-4 my-2 px-1">
                                <div className="h-px bg-stone-800 flex-1"></div>
                                <span className="text-xs font-medium text-stone-600 uppercase tracking-wider">Fondo</span>
                                <div className="h-px bg-stone-800 flex-1"></div>
                            </div>
                        );
                    }

                    const isImpulsoPeso = task.id === 'huno-impulso-peso' || task.text.toLowerCase().includes('impulso');
                    const taskTitle = isImpulsoPeso 
                      ? (isOddDay ? '⚡ Impulso (Día Impar · Sprints en calle)' : '🎒 Peso (Día Par · Rucking con lastre)')
                      : task.text;
                    const emoji = isImpulsoPeso ? (isOddDay ? '⚡' : '🎒') : getEmoji(task.text);
                    const isFailed = task.failedYesterday && !task.completed;
                    const missedDays = task.missedDays || 0;
                    const isLastSeven = !isEnanito;

                    let fillPercentage = 0;
                    let isBlinkingRed = false;
                    if (isFailed) {
                        if (missedDays === 2) fillPercentage = 25;
                        else if (missedDays === 3) fillPercentage = 50;
                        else if (missedDays === 4) fillPercentage = 75;
                        else if (missedDays >= 5) {
                            fillPercentage = 100;
                            isBlinkingRed = true;
                        }
                    }

                    elements.push(
                        <button
                            key={task.id}
                            onClick={() => toggleTask(task.id)}
                            title={taskTitle}
                            className={`
                                aspect-square flex items-center justify-center text-3xl relative transition-all duration-300 overflow-hidden rounded-2xl
                                ${task.completed
                                    ? 'border-2 bg-emerald-500 hover:bg-emerald-400 dark:bg-emerald-600 border-emerald-400 dark:border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-95'
                                    : isFailed
                                        ? `border-4 border-red-500 text-red-700 dark:text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.3)] ${isBlinkingRed ? 'bg-red-500 animate-blink' : 'bg-red-100 dark:bg-red-900/50'}`
                                        : isLastSeven 
                                            ? 'border-0 bg-transparent border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800/30' 
                                            : 'border-2 bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:border-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700 shadow-sm'
                                }
                            `}
                        >
                            {isFailed && fillPercentage > 0 && !isBlinkingRed && (
                                <div 
                                    className="absolute bottom-0 left-0 right-0 bg-red-600/80 transition-all duration-500"
                                    style={{ height: `${fillPercentage}%` }}
                                />
                            )}
                             <span className="drop-shadow-sm filter relative z-10">{emoji}</span>
                        </button>
                    );
                    return elements;
                })}

                {/* 3. Hueco tras la manzana (Sano 🍏): Número de monedas perdidas */}
                <div 
                    title={`Monedas perdidas por Hunos fallados ayer y aún pendientes: -${lostCoinsCount}`}
                    className="aspect-square flex items-center justify-center rounded-2xl select-none"
                >
                    <span className="text-3xl sm:text-4xl font-black text-red-500 font-mono tracking-tighter">
                        -{lostCoinsCount}
                    </span>
                </div>
            </div>

            {/* Energy Slider */}
            <div className="mt-8 pt-6 border-t border-stone-800/50">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                            <span className="text-lg">⚡</span>
                        </div>
                        <span className="text-xs font-black text-stone-500 uppercase tracking-widest">Energía del día</span>
                    </div>
                    <div className="px-3 py-1 bg-white dark:bg-stone-950 rounded-full border border-stone-200 dark:border-stone-800 shadow-sm">
                        <span className="text-sm font-black text-orange-500 font-mono">{energy} / 10</span>
                    </div>
                </div>
                
                <div className="relative h-12 flex items-center group/slider">
                    {/* Background Track */}
                    <div className="absolute inset-0 h-2 my-auto bg-stone-200 dark:bg-stone-950 rounded-full border border-stone-300 dark:border-stone-800 overflow-hidden">
                        {/* Fill Gradient */}
                        <div 
                            className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-red-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all duration-300 ease-out"
                            style={{ width: `${((energy - 1) / 9) * 100}%` }}
                        />
                    </div>
                    
                    {/* Tick marks */}
                    <div className="absolute inset-0 flex justify-between px-1 items-center pointer-events-none">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div 
                                key={i} 
                                className={`w-0.5 h-1.5 rounded-full transition-colors duration-500 ${(i + 1) <= energy ? 'bg-white/20' : 'bg-stone-800'}`} 
                            />
                        ))}
                    </div>

                    {/* Invisible Input Slider */}
                    <input 
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={energy}
                        onChange={(e) => onUpdateEnergy(parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />

                    {/* Visual Thumb */}
                    <div 
                        className="absolute w-8 h-8 rounded-full bg-white dark:bg-stone-100 border-4 border-orange-500 shadow-md pointer-events-none z-10 transition-all duration-300 ease-out group-active/slider:scale-110"
                        style={{ 
                            left: `calc(${(energy - 1) / 9 * 100}% - 16px)`,
                            transition: 'left 0.1s ease-out, transform 0.2s ease'
                        }}
                    >
                        <div className="absolute inset-0 m-auto w-1 h-3 bg-orange-600/30 rounded-full" />
                    </div>
                </div>
                <div className="flex justify-between mt-2 px-1">
                    <span className="text-[10px] font-black text-stone-700 uppercase">Agotado</span>
                    <span className="text-[10px] font-black text-stone-700 uppercase">Invencible</span>
                </div>
            </div>
        </div>

      {/* Hunos Month View Modal */}
      {showMonthView && (
        <HunosMonthViewModal 
          tasks={tasks} 
          hunosHistory={hunosHistory} 
          onClose={() => setShowMonthView(false)} 
        />
      )}

    </div>
  );
};