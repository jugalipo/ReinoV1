import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { Sword, CheckCircle2, Edit2, Save, X, Trophy } from 'lucide-react';
import { useModalHistory } from '../hooks/useModalHistory';
import { HunosMonthViewModal } from './HunosMonthViewModal';

interface DailyHunosProps {
  tasks: Task[];
  hunosHistory: Record<string, string[]>;
  hunoPlenoCurrent: number;
  hunoPlenos: number;
  hunoReward: string;
  onUpdate: (tasks: Task[], isPleno?: boolean) => void;
  onUpdateReward?: (reward: string) => void;
  energy: number;
  onUpdateEnergy: (value: number) => void;
}

export const DailyHunos: React.FC<DailyHunosProps> = ({ 
  tasks, 
  hunosHistory, 
  hunoPlenoCurrent, 
  hunoPlenos, 
  hunoReward,
  onUpdate,
  onUpdateReward,
  energy,
  onUpdateEnergy
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMonthView, setShowMonthView] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [text3, setText3] = useState('');

  // Filter out the "GAP" tasks for calculations in View Mode
  const visibleTasks = tasks.filter(t => t.text !== 'GAP');
  const completedCount = visibleTasks.filter(t => t.completed).length;
  const progressPercent = visibleTasks.length > 0 ? (completedCount / visibleTasks.length) * 100 : 0;

  const getCoreScore = () => {
    let score = 0;
    tasks.forEach(t => {
      if (t.completed) {
        if (t.text.includes('Leones') || t.text.includes('🦁')) score += 2;
        else if (t.text.includes('Gimnasia') || t.text.includes('Gim')) score += 1;
        else if (t.text.includes('Amor') || t.text.includes('❤️')) score += 1;
        else if (t.text.includes('Leer')) score += 1;
      }
    });
    return score;
  };

  const coreScore = getCoreScore();
  const coreTotal = 5;

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

  // --- MOBILE BACK BUTTON SUPPORT FOR MODALS ---
  useModalHistory(isEditing, () => setIsEditing(false));
  useModalHistory(showMonthView, () => setShowMonthView(false));
  useModalHistory(showConfirmModal, () => setShowConfirmModal(false));
  // ---------------------------------------------

  // --- VIEW MODE ACTIONS ---

  useEffect(() => {
      if (!isEditing && tasks.length > 0) {
          const allPleno = tasks.filter(t => t.text !== 'GAP').every(t => t.plenoCompleted);
          if (allPleno && !showConfirmModal) {
              setPendingTaskId(null);
              setShowConfirmModal(true);
          }
      }
  }, [tasks, isEditing, showConfirmModal]);

  const toggleTask = (id: string) => {
    if (isEditing) return;

    // 1. Calculate the new state for the task
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const willBeCompleted = !task.completed;

    // 2. Create updated list simulation
    const simulatedTasks = tasks.map((t) =>
      t.id === id ? { ...t, completed: willBeCompleted, plenoCompleted: willBeCompleted } : t
    );

    // 3. Check for Pleno trigger (All tasks are now checked/plenoCompleted)
    if (willBeCompleted) {
        // Only check visible tasks for the Pleno trigger
        const allPleno = simulatedTasks.filter(t => t.text !== 'GAP').every(t => t.plenoCompleted);
        
        if (allPleno) {
            setPendingTaskId(id);
            setShowConfirmModal(true);
            return;
        }
    }

    onUpdate(simulatedTasks, false);
  };

  const handleConfirmPleno = () => {
      // Apply the check AND reset all dots
      const updatedTasks = tasks.map(t => {
          const isTarget = pendingTaskId ? t.id === pendingTaskId : false;
          const finalCompleted = isTarget ? true : t.completed;
          
          return {
              ...t,
              completed: finalCompleted,
              plenoCompleted: false // Reset dot
          };
      });

      onUpdate(updatedTasks, true); // Increment stat
      setShowConfirmModal(false);
      setPendingTaskId(null);
  };

  const handleCancelPleno = () => {
      setShowConfirmModal(false);
      
      // If triggered by history (pendingTaskId is null), we must reset dots to prevent infinite loop
      if (!pendingTaskId) {
          const updatedTasks = tasks.map(t => ({
              ...t,
              plenoCompleted: false
          }));
          onUpdate(updatedTasks, false); // Do not increment stat
      }
      
      setPendingTaskId(null);
  };

  // --- EDIT MODE ACTIONS ---

  const textToTasks = (t1: string, t2: string, t3: string, existingTasks: Task[]): Task[] => {
      const allText = [t1, t2, t3].join('\n');
      const lines = allText.split('\n').map(l => l.trim()).filter(l => l);
      
      const availableTasks = [...existingTasks];
      const result: Task[] = Array(lines.length).fill(null);
      const usedOldIndices = new Set<number>();

      // Step 1: Exact matches (handles reordering)
      lines.forEach((line, newIdx) => {
          const oldIdx = availableTasks.findIndex((t, i) => t.text === line && !usedOldIndices.has(i));
          if (oldIdx !== -1) {
              result[newIdx] = availableTasks[oldIdx];
              usedOldIndices.add(oldIdx);
          }
      });

      // Step 2: Position-based matching (handles renames)
      lines.forEach((line, newIdx) => {
          if (result[newIdx]) return; // Already matched in step 1

          // If there's an unused task at the same relative position, assume it's a rename
          if (newIdx < availableTasks.length && !usedOldIndices.has(newIdx)) {
              result[newIdx] = {
                  ...availableTasks[newIdx],
                  text: line
              };
              usedOldIndices.add(newIdx);
          }
      });

      // Step 3: New tasks (remaining lines)
      return lines.map((line, newIdx) => {
          if (result[newIdx]) return result[newIdx];

          return {
              id: Date.now().toString() + Math.random().toString(),
              text: line,
              completed: false,
              plenoCompleted: false,
              failedYesterday: false,
              missedDays: 0
          };
      });
  };

  const handleEditToggle = () => {
      if (isEditing) {
          const newTasks = textToTasks(text1, text2, text3, tasks);
          onUpdate(newTasks, false);
          setIsEditing(false);
      } else {
          setText1(tasks.slice(0, 4).map(t => t.text).join('\n'));
          setText2(tasks.slice(4, 15).map(t => t.text).join('\n'));
          setText3(tasks.slice(15).map(t => t.text).join('\n'));
          setIsEditing(true);
      }
  };

  const getEmoji = (text: string) => {
    // Regex to find the first emoji character in the string
    const match = text.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u);
    // If emoji found, return it. If not, return first 2 chars as fallback
    return match ? match[0] : text.substring(0, 2);
  };

  return (
    <div className="bg-stone-900 rounded-2xl shadow-sm p-6 w-full mt-6 border border-stone-800 relative">
      
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <Sword className="w-6 h-6 text-stone-400" />
            <button 
              onClick={() => setShowMonthView(true)}
              className="text-xl font-bold text-stone-200 hover:text-orange-400 transition-colors"
            >
              Hunos
            </button>
            
            <div className="flex items-center gap-2 px-2 py-1 bg-stone-950/50 rounded-full border border-stone-800">
                <div className="flex items-center gap-1.5">
                    <div className="relative">
                        <Trophy className="w-5 h-5 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                        <div className="absolute -top-2 -right-2 bg-yellow-600 text-stone-950 text-[10px] font-black px-1.5 rounded-full border border-stone-900 min-w-[1.2rem] h-5 flex items-center justify-center">
                            {hunoPlenos}
                        </div>
                    </div>
                </div>
                <span className="text-[10px] font-black text-stone-500 uppercase tracking-tighter">
                    {hunoPlenoCurrent} <span className="text-stone-700">/ 50</span>
                </span>
            </div>
        </div>
        
        <button 
            onClick={handleEditToggle} 
            className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-stone-700 text-white' : 'hover:bg-stone-800 text-stone-500'}`}
        >
            {isEditing ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Money, Counter and Progress Row */}
      {!isEditing && (
        <div className="flex items-center gap-3 mb-6">
            {/* Money Counter (Pending tasks that FAILED yesterday) */}
            <div className="flex items-center gap-1 px-2 py-0.5 bg-red-950/20 rounded-lg border border-red-900/30">
                <span className="text-sm font-bold text-red-500">
                    -{visibleTasks.filter(t => t.failedYesterday && !t.completed).length}
                </span>
                <span className="text-xs">🪙</span>
            </div>

            {/* Hunos Counter */}
            <span className="text-xs font-mono text-stone-500 whitespace-nowrap">
                {completedCount}/{visibleTasks.length}
            </span>

            {/* Progress Bar Container */}
            <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-blue-600 transition-all duration-300 shadow-[0_0_10px_rgba(37,99,235,0.4)]" 
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </div>
      )}

      {/* VIEW MODE: SECTIONS */}
      {!isEditing && (
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
                          className="absolute left-0 top-0 h-full bg-emerald-600/75 transition-all duration-1000 ease-out shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                          style={{ width: `${(coreScore / coreTotal) * 100}%` }}
                        />
                        {/* Shimmer effect when full */}
                        {coreScore >= coreTotal && (
                            <div className="absolute inset-0 bg-emerald-400 animate-pulse opacity-20" />
                        )}
                        
                        <div className="grid grid-cols-4 gap-3 relative z-10">
                            {tasks.slice(0, 4).map((task, index) => (
                                <button
                                    key={task.id}
                                    onClick={() => toggleTask(task.id)}
                                    title={task.text}
                                    className={`
                                        aspect-square flex items-center justify-center text-3xl relative transition-all duration-300 overflow-hidden rounded-full
                                        ${task.completed
                                            ? 'border-2 bg-emerald-600 border-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.6)] scale-95'
                                            : task.failedYesterday && !task.completed
                                                ? `border-8 border-red-600 text-red-100 shadow-[0_0_20px_rgba(220,38,38,0.4)] ${task.missedDays >= 5 ? 'bg-red-600 animate-blink' : 'bg-red-900/50'}`
                                                : 'border-2 bg-stone-800/80 border-stone-700/50 text-stone-200 hover:border-stone-500 hover:bg-stone-700 shadow-sm'
                                        }
                                    `}
                                >
                                    <span className="drop-shadow-sm filter relative z-10">{getEmoji(task.text)}</span>
                                    {!task.plenoCompleted && (
                                        <div className="absolute w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.8)] animate-pulse z-10 top-2 right-2"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Rest of Hunos - Regular Grid */}
            <div className="grid grid-cols-4 gap-3">
                {tasks.slice(4).map((task, relativeIndex) => {
                    const index = relativeIndex + 4;
                    const elements = [];

                    if (index === 4) {
                        elements.push(
                            <div key="sep-1" className="col-span-4 flex items-center gap-4 my-2 px-1">
                                <div className="h-px bg-stone-800 flex-1"></div>
                                <span className="text-xs font-medium text-stone-600 uppercase tracking-wider">Los 11 Enanitos</span>
                                <div className="h-px bg-stone-800 flex-1"></div>
                            </div>
                        );
                    }
                    if (index === 15) {
                        elements.push(
                            <div key="sep-2" className="col-span-4 flex items-center gap-4 my-2 px-1">
                                <div className="h-px bg-stone-800 flex-1"></div>
                                <span className="text-xs font-medium text-stone-600 uppercase tracking-wider">Fondo</span>
                                <div className="h-px bg-stone-800 flex-1"></div>
                            </div>
                        );
                    }

                    const emoji = getEmoji(task.text);
                    const isFailed = task.failedYesterday && !task.completed;
                    const missedDays = task.missedDays || 0;
                    const isLastSeven = index >= 15;

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
                            title={task.text}
                            className={`
                                aspect-square flex items-center justify-center text-3xl relative transition-all duration-300 overflow-hidden rounded-2xl
                                ${task.completed
                                    ? 'border-2 bg-emerald-600 border-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.6)] scale-95'
                                    : isFailed
                                        ? `border-8 border-red-600 text-red-100 shadow-[0_0_20px_rgba(220,38,38,0.4)] ${isBlinkingRed ? 'bg-red-600 animate-blink' : 'bg-red-900/50'}`
                                        : isLastSeven 
                                            ? 'border-0 bg-transparent border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30' 
                                            : 'border-2 bg-stone-800 border-stone-700 text-stone-200 hover:border-stone-500 hover:bg-stone-700 shadow-sm'
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
                            {!task.plenoCompleted && (
                                <div className="absolute w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.8)] animate-pulse z-10 top-1.5 right-1.5"></div>
                            )}
                        </button>
                    );
                    return elements;
                })}
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
                    <div className="px-3 py-1 bg-stone-950 rounded-full border border-stone-800">
                        <span className="text-sm font-black text-orange-500 font-mono">{energy} / 10</span>
                    </div>
                </div>
                
                <div className="relative h-12 flex items-center group/slider">
                    {/* Background Track */}
                    <div className="absolute inset-0 h-2 my-auto bg-stone-950 rounded-full border border-stone-800 overflow-hidden">
                        {/* Fill Gradient */}
                        <div 
                            className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-red-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all duration-300 ease-out"
                            style={{ width: `${((energy - 1) / 9) * 100}%` }}
                        />
                    </div>
                    
                    {/* Tick marks */}
                    <div className="absolute inset-0 flex justify-between px-1 items-center pointer-events-none">
                        {Array.from({ length: 11 }).map((_, i) => (
                            <div 
                                key={i} 
                                className={`w-0.5 h-1.5 rounded-full transition-colors duration-500 ${i <= energy ? 'bg-white/20' : 'bg-stone-800'}`} 
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
                        className="absolute w-8 h-8 rounded-full bg-stone-100 border-4 border-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.6)] pointer-events-none z-10 transition-all duration-300 ease-out group-active/slider:scale-110"
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
      )}

      {/* EDIT MODE: LIST */}
      {isEditing && (
          <div className="space-y-6">
              <div>
                  <label className="block text-sm font-medium text-stone-400 mb-2">Los 4 Fantásticos (1 por línea)</label>
                  <textarea 
                      value={text1}
                      onChange={(e) => setText1(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-4 text-stone-200 focus:outline-none focus:border-stone-500 min-h-[120px] resize-y"
                      placeholder="Ej: 🦁 Leones&#10;🏋️ Gimnasia..."
                  />
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-stone-400 mb-2">Los 11 Enanitos (1 por línea)</label>
                  <textarea 
                      value={text2}
                      onChange={(e) => setText2(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-4 text-stone-200 focus:outline-none focus:border-stone-500 min-h-[200px] resize-y"
                      placeholder="Ej: 💧 Agua&#10;📖 Leer..."
                  />
              </div>

              <div>
                  <label className="block text-sm font-medium text-stone-400 mb-2">Fondo (1 por línea)</label>
                  <textarea 
                      value={text3}
                      onChange={(e) => setText3(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-4 text-stone-200 focus:outline-none focus:border-stone-500 min-h-[150px] resize-y"
                      placeholder="Ej: 🎸 Guitarra&#10;🧘 Meditar..."
                  />
              </div>

              <div className="pt-4 border-t border-stone-800">
                  <label className="block text-xs font-black text-stone-600 uppercase tracking-widest mb-2">Premio Objetivo 50 Plenos</label>
                  <input 
                      type="text"
                      value={hunoReward}
                      onChange={(e) => onUpdateReward?.(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-3 text-stone-200 focus:outline-none focus:border-orange-500 font-bold"
                      placeholder="Escribe tu premio aquí..."
                  />
              </div>
          </div>
      )}

      {/* --- MODALS --- */}

      {/* Pleno Confirmation Modal */}
      {showConfirmModal && (
        <div 
          className="fixed inset-0 max-w-md mx-auto z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleCancelPleno}
        >
            <div 
              className="bg-stone-900 w-full max-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-orange-900/30 rounded-full flex items-center justify-center mb-4 border border-orange-600/50">
                        <CheckCircle2 className="w-10 h-10 text-orange-500" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-100 mb-2">¡Pleno Diario!</h2>
                    <p className="text-stone-400 mb-6 text-sm">
                        Has completado todos los Hunos. ¿Quieres sumar +1 al contador y reiniciar los puntos naranjas?
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 w-full">
                        <button 
                            onClick={handleCancelPleno}
                            className="py-3 rounded-xl border border-stone-700 text-stone-400 hover:bg-stone-800 font-bold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConfirmPleno}
                            className="py-3 rounded-xl bg-orange-600 text-stone-950 font-bold hover:bg-orange-500 transition-colors shadow-lg shadow-orange-900/20"
                        >
                            ¡Sí, sumar +1!
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

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