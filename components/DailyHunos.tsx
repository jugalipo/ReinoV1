import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { Sword, CheckCircle2, Edit2, Save, X } from 'lucide-react';
import { HunosMonthViewModal } from './HunosMonthViewModal';

interface DailyHunosProps {
  tasks: Task[];
  hunosHistory: Record<string, string[]>;
  onUpdate: (tasks: Task[], isPleno?: boolean) => void;
}

export const DailyHunos: React.FC<DailyHunosProps> = ({ tasks, hunosHistory, onUpdate }) => {
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
      
      return lines.map(line => {
          const existingIndex = availableTasks.findIndex(t => t.text === line);
          if (existingIndex !== -1) {
              const existing = availableTasks[existingIndex];
              availableTasks.splice(existingIndex, 1);
              return existing;
          }
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
            <Sword className="w-6 h-6 text-stone-400" />
            <button 
              onClick={() => setShowMonthView(true)}
              className="text-xl font-bold text-stone-200 hover:text-orange-400 transition-colors"
            >
              Hunos
            </button>
            
            {/* Core Hunos Pie Chart */}
            {!isEditing && (
                <div className="ml-2 w-6 h-6 rounded-full border border-orange-500/30 overflow-hidden bg-orange-950/50 relative" title={`Principal del día: ${coreScore}/${coreTotal}`}>
                  <div 
                    className="absolute inset-0 bg-orange-500"
                    style={{
                      clipPath: `polygon(50% 50%, 50% 0, ${coreScore >= coreTotal ? '100% 0, 100% 100%, 0 100%, 0 0, 50% 0' : getClipPath(coreScore, coreTotal)})`
                    }}
                  />
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-3">
             {!isEditing && (
                 <span className="text-sm font-mono text-stone-500">{completedCount}/{visibleTasks.length}</span>
             )}
             <button 
                onClick={handleEditToggle} 
                className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-stone-700 text-white' : 'hover:bg-stone-800 text-stone-500'}`}
            >
                {isEditing ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
            </button>
        </div>
      </div>

      {/* Progress Bar (Only visible when NOT editing) */}
      {!isEditing && (
        <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden mb-6">
            <div 
                className="h-full bg-blue-600 transition-all duration-300" 
                style={{ width: `${progressPercent}%` }}
            />
        </div>
      )}

      {/* VIEW MODE: GRID */}
      {!isEditing && (
        <div className="grid grid-cols-4 gap-3">
            {tasks.length === 0 && (
            <p className="col-span-4 text-stone-600 text-center italic py-4">Sin batallas planeadas.</p>
            )}
            {tasks.map((task, index) => {
            const elements = [];

            if (index === 0) {
                elements.push(
                    <div key="sep-0" className="col-span-4 flex items-center gap-4 my-2">
                        <div className="h-px bg-stone-800 flex-1"></div>
                        <span className="text-xs font-medium text-stone-600 uppercase tracking-wider">Los 4 Fantásticos</span>
                        <div className="h-px bg-stone-800 flex-1"></div>
                    </div>
                );
            }

            if (index === 4) {
                elements.push(
                    <div key="sep-1" className="col-span-4 flex items-center gap-4 my-2">
                        <div className="h-px bg-stone-800 flex-1"></div>
                        <span className="text-xs font-medium text-stone-600 uppercase tracking-wider">Los 11 Enanitos</span>
                        <div className="h-px bg-stone-800 flex-1"></div>
                    </div>
                );
            }
            if (index === 15) {
                elements.push(
                    <div key="sep-2" className="col-span-4 flex items-center gap-4 my-2">
                        <div className="h-px bg-stone-800 flex-1"></div>
                        <span className="text-xs font-medium text-stone-600 uppercase tracking-wider">Fondo</span>
                        <div className="h-px bg-stone-800 flex-1"></div>
                    </div>
                );
            }

            const emoji = getEmoji(task.text);
            const isFailed = task.failedYesterday && !task.completed;
            const missedDays = task.missedDays || 0;
            const isFirstRow = index < 4;
            const isLastSeven = index >= 15;

            // Calculate fill percentage
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
                    title={task.text} // Tooltip showing full text
                    className={`
                        aspect-square flex items-center justify-center text-3xl relative transition-all duration-300 overflow-hidden
                        ${isFirstRow ? 'rounded-full' : 'rounded-2xl'}
                        ${task.completed
                            ? 'border-2 bg-emerald-600 border-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.6)] scale-95'
                            : isFailed
                                ? `border-8 border-red-600 text-red-100 shadow-[0_0_20px_rgba(220,38,38,0.4)] ${isBlinkingRed ? 'bg-red-600 animate-pulse' : 'bg-red-900/50'}`
                                : isLastSeven 
                                    ? 'border-0 bg-transparent border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30' 
                                    : 'border-2 bg-stone-800 border-stone-700 text-stone-200 hover:border-stone-500 hover:bg-stone-700 shadow-sm'
                        }
                    `}
                >
                    {/* Background fill for missed days */}
                    {isFailed && fillPercentage > 0 && !isBlinkingRed && (
                        <div 
                            className="absolute bottom-0 left-0 right-0 bg-red-600/80 transition-all duration-500"
                            style={{ height: `${fillPercentage}%` }}
                        />
                    )}

                    <span className="drop-shadow-sm filter relative z-10">{emoji}</span>

                    {/* Pleno Dot (Orange) - Top Right */}
                    {!task.plenoCompleted && (
                        <div className={`absolute w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.8)] animate-pulse z-10 ${isFirstRow ? 'top-2 right-2' : 'top-1.5 right-1.5'}`}></div>
                    )}
                </button>
            );
            return elements;
            })}
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
          </div>
      )}

      {/* --- MODALS --- */}

      {/* Pleno Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 max-w-md mx-auto z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-stone-900 w-full max-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">
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