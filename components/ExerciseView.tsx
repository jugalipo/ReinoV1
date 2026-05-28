import React, { useState, useEffect, useRef } from 'react';
import { ExerciseState } from '../types';
import { ArrowLeft, Dumbbell, Trophy, Move, Wind, RotateCcw, Timer, Plus, X, BicepsFlexed, Play, Pause, Settings2, Square, Zap, Flame, Activity, Info } from 'lucide-react';
import { useModalHistory } from '../hooks/useModalHistory';

interface ExerciseViewProps {
  exercise: ExerciseState;
  onUpdate: (state: ExerciseState) => void;
  onBack: () => void;
}

export const ExerciseView: React.FC<ExerciseViewProps> = ({ exercise, onUpdate, onBack }) => {
  const { seriesCurrent, daysTrained, sprintCount, stretchCount, totalMinutes } = exercise;
  
  // State for Add Minutes Modal
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [customTime, setCustomTime] = useState('');
  
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [tempNotesText, setTempNotesText] = useState(exercise.notes || '');

  // --- NEW BLOCK-BASED TIMER STATE ---
  const timerBlocks = exercise.timerBlocks || [{ id: 'default', workSecs: 45, restSecs: 15, rounds: 3 }];
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [timerCurrentRound, setTimerCurrentRound] = useState(1);
  const [timerPhase, setTimerPhase] = useState<'work' | 'rest'>('work');
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  
  // Custom Icons
  const LegIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2a2 2 0 0 0-2 2v6" />
      <path d="M12 10c-1.5 1.5-2 3.5-2 6v3c0 1.1.9 2 2 2h3" />
      <path d="M8 22h7" />
    </svg>
  );

  const BackIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 4l3 10 5 8 5-8 3-10" />
      <path d="M12 4v18" />
      <path d="M7 14h10" />
    </svg>
  );

  const ChestIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 6c0-2 1.5-4 4-4h8c2.5 0 4 2 4 4v5c0 3-4 6-8 6s-8-3-8-6V6Z" />
      <path d="M12 2v15" />
      <path d="M4 8h16" />
    </svg>
  );

  // Real-time progress (0 to 1) for smooth animation
  const [visualProgress, setVisualProgress] = useState(1);
  const [timerTimeLeft, setTimerTimeLeft] = useState(timerBlocks[0].workSecs);

  // --- NEW SESSION TIMER STATE ---
  const [sessionIsRunning, setSessionIsRunning] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showSessionConfirmModal, setShowSessionConfirmModal] = useState(false);

  const sessionStartTimeRef = useRef<number | null>(null);
  const sessionAccumulatedRef = useRef<number>(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const targetEndTimeRef = useRef<number | null>(null);

  const currentBlock = timerBlocks[currentBlockIndex] || timerBlocks[0];

  // --- MOBILE BACK BUTTON SUPPORT FOR MODALS ---
  useModalHistory(showTimeModal, () => setShowTimeModal(false));
  useModalHistory(showTimerSettings, () => setShowTimerSettings(false));
  useModalHistory(showSessionConfirmModal, () => setShowSessionConfirmModal(false));
  useModalHistory(showCompleteModal, () => setShowCompleteModal(false));
  useModalHistory(showNotesModal, () => setShowNotesModal(false));

  useEffect(() => {
    if (showNotesModal) {
      setTempNotesText(exercise.notes || '');
    }
  }, [showNotesModal, exercise.notes]);
  // ---------------------------------------------

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // --- SESSION TIMER LOGIC (Resistant to phone lock) ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (sessionIsRunning) {
      if (sessionStartTimeRef.current === null) {
        sessionStartTimeRef.current = Date.now();
      }
      
      interval = setInterval(() => {
        if (sessionStartTimeRef.current !== null) {
          const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
          setSessionSeconds(sessionAccumulatedRef.current + elapsed);
        }
      }, 1000);
    } else {
      if (sessionStartTimeRef.current !== null) {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        sessionAccumulatedRef.current += elapsed;
        sessionStartTimeRef.current = null;
      }
    }
    
    return () => clearInterval(interval);
  }, [sessionIsRunning]);

  const formatSessionTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const playBeep = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  const playDoubleBeep = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }
      }, 800);
    }
  };

  // --- SMOOTH TIMER LOGIC ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timerIsRunning) {
      if (targetEndTimeRef.current === null && timerTimeLeft > 0) {
        targetEndTimeRef.current = Date.now() + timerTimeLeft * 1000;
      }

      interval = setInterval(() => {
        if (targetEndTimeRef.current !== null) {
          const now = Date.now();
          const msRemaining = targetEndTimeRef.current - now;
          const totalDurationMs = (timerPhase === 'work' ? currentBlock.workSecs : currentBlock.restSecs) * 1000;
          
          setTimerTimeLeft(Math.max(0, Math.round(msRemaining / 1000)));
          setVisualProgress(Math.max(0, msRemaining / totalDurationMs));

          if (msRemaining <= 0) {
            targetEndTimeRef.current = null;
            
            if (timerPhase === 'work') {
              if (timerCurrentRound >= currentBlock.rounds) {
                // Finished block
                if (currentBlockIndex < timerBlocks.length - 1) {
                  playBeep();
                  const nextBlock = timerBlocks[currentBlockIndex + 1];
                  setCurrentBlockIndex(prev => prev + 1);
                  setTimerCurrentRound(1);
                  setTimerPhase('work');
                  setTimerTimeLeft(nextBlock.workSecs);
                  targetEndTimeRef.current = Date.now() + nextBlock.workSecs * 1000;
                } else {
                  // Finished workout
                  playDoubleBeep();
                  setTimerIsRunning(false);
                  setCurrentBlockIndex(0);
                  setTimerCurrentRound(1);
                  setTimerPhase('work');
                  setTimerTimeLeft(timerBlocks[0].workSecs);
                  setVisualProgress(1);
                }
              } else {
                // Rest
                playBeep();
                setTimerPhase('rest');
                setTimerTimeLeft(currentBlock.restSecs);
                targetEndTimeRef.current = Date.now() + currentBlock.restSecs * 1000;
              }
            } else {
              // Next round
              playBeep();
              setTimerPhase('work');
              setTimerCurrentRound(prev => prev + 1);
              setTimerTimeLeft(currentBlock.workSecs);
              targetEndTimeRef.current = Date.now() + currentBlock.workSecs * 1000;
            }
          }
        }
      }, 30); // 30ms for smooth 30fps animation
    } else {
      targetEndTimeRef.current = null;
    }

    return () => clearInterval(interval);
  }, [timerIsRunning, timerPhase, timerCurrentRound, currentBlockIndex, timerBlocks, currentBlock]);

  const toggleTimer = () => {
    const newRunning = !timerIsRunning;
    setTimerIsRunning(newRunning);
    if (newRunning) {
      targetEndTimeRef.current = Date.now() + timerTimeLeft * 1000;
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          if (audioRef.current) audioRef.current.currentTime = 0;
        }).catch(() => {});
      }
    } else {
      targetEndTimeRef.current = null;
    }
  };

  const resetTimer = () => {
    setTimerIsRunning(false);
    setCurrentBlockIndex(0);
    setTimerPhase('work');
    setTimerCurrentRound(1);
    setTimerTimeLeft(timerBlocks[0].workSecs);
    setVisualProgress(1);
    targetEndTimeRef.current = null;
  };

  // --- ROUNDED RECT TIMER LOGIC ---
  const rectW = 240;
  const rectH = 170;
  const rectRX = 45;
  const perimeter = 2 * (rectW - 2 * rectRX) + 2 * (rectH - 2 * rectRX) + (2 * Math.PI * rectRX);
  const offset = perimeter - visualProgress * perimeter;
  // Construct path starting from top center
  const timerPath = `
    M 128 ${128 - rectH / 2}
    L ${128 + rectW / 2 - rectRX} ${128 - rectH / 2}
    A ${rectRX} ${rectRX} 0 0 1 ${128 + rectW / 2} ${128 - rectH / 2 + rectRX}
    L ${128 + rectW / 2} ${128 + rectH / 2 - rectRX}
    A ${rectRX} ${rectRX} 0 0 1 ${128 + rectW / 2 - rectRX} ${128 + rectH / 2}
    L ${128 - rectW / 2 + rectRX} ${128 + rectH / 2}
    A ${rectRX} ${rectRX} 0 0 1 ${128 - rectW / 2} ${128 + rectH / 2 - rectRX}
    L ${128 - rectW / 2} ${128 - rectH / 2 + rectRX}
    A ${rectRX} ${rectRX} 0 0 1 ${128 - rectW / 2 + rectRX} ${128 - rectH / 2}
    Z
  `;

  const formatTimerDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAddSeries = () => {
    const next = seriesCurrent + 1;
    if (next >= 9) {
      setShowCompleteModal(true);
    } else {
      onUpdate({
        ...exercise,
        seriesCurrent: next
      });
    }
  };

  const confirmCompleteCycle = () => {
      const today = new Date().toDateString();
      const currentStats = (exercise.history || {})[today] || { minutes: 0, workouts: 0 };
      
      onUpdate({
        ...exercise,
        seriesCurrent: 0,
        daysTrained: (daysTrained || 0) + 1,
        history: {
          ...(exercise.history || {}),
          [today]: {
            ...currentStats,
            workouts: currentStats.workouts + 1
          }
        }
      });
      setShowCompleteModal(false);
  };

  const handleAddNineSeries = () => {
    const today = new Date().toDateString();
    const currentStats = (exercise.history || {})[today] || { minutes: 0, workouts: 0 };
    
    onUpdate({
      ...exercise,
      daysTrained: (daysTrained || 0) + 1,
      history: {
        ...(exercise.history || {}),
        [today]: {
          ...currentStats,
          workouts: currentStats.workouts + 1
        }
      }
    });
  };

  const handleRemoveSeries = () => {
    if (seriesCurrent > 0) {
      onUpdate({
        ...exercise,
        seriesCurrent: seriesCurrent - 1
      });
    }
  };

  const incrementStat = (key: keyof ExerciseState) => {
    onUpdate({
      ...exercise,
      [key]: (exercise[key] as number || 0) + 1
    });
  };

  const addMinutes = (amount: number) => {
      if (amount <= 0) return;
      const today = new Date().toDateString();
      const currentStats = (exercise.history || {})[today] || { minutes: 0, workouts: 0 };

      onUpdate({
          ...exercise,
          totalMinutes: (totalMinutes || 0) + amount,
          history: {
            ...(exercise.history || {}),
            [today]: {
              ...currentStats,
              minutes: currentStats.minutes + amount
            }
          }
      });
      setShowTimeModal(false);
      setCustomTime('');
  };

  const formatTime = (mins: number) => {
      if (!mins) return '0 min';
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      
      if (h === 0) return `${m} min`;
      return `${h}h ${m > 0 ? `${m}min` : ''}`;
  };

  // Grid for the 9 series visualizer
  const renderGrid = () => {
    const handleGridClick = (index: number) => {
        const selectedSeries = index + 1;
        if (selectedSeries === 9) {
            setShowCompleteModal(true);
        } else {
            onUpdate({
                ...exercise,
                seriesCurrent: selectedSeries
            });
        }
    };

    return (
      <div className="grid grid-cols-3 gap-3 w-64 mx-auto mb-6">
        {Array.from({ length: 9 }).map((_, i) => {
          const isActive = i < seriesCurrent;
          return (
            <button
              key={i}
              onClick={() => handleGridClick(i)}
              className={`aspect-square rounded-xl transition-all duration-300 border-2 flex items-center justify-center font-bold text-lg active:scale-95
                ${isActive 
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
                  : 'bg-stone-900 border-stone-800 text-stone-700 hover:bg-stone-800 hover:border-stone-700'
                }`}
            >
              <BicepsFlexed className="w-6 h-6" />
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 max-w-md mx-auto z-50 bg-stone-950 flex flex-col animate-in fade-in duration-200">
      <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full">
            <ArrowLeft className="w-6 h-6 text-emerald-500" />
          </button>
          <h1 className="text-xl font-bold text-emerald-200">Bosque</h1>
        </div>
        <button
          onClick={() => setShowNotesModal(true)}
          className={`p-2 rounded-xl border transition-all active:scale-95 ${
            exercise.notes
              ? 'bg-amber-950/25 border-amber-900/40 text-amber-400'
              : 'bg-stone-900 border-stone-850 text-stone-500 hover:text-stone-300 hover:border-stone-700'
          }`}
          title="Notas para Sebastian"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-28 bg-emerald-950/20">
        
        {/* MAIN SERIES COUNTER */}
        <div className="bg-stone-900 rounded-2xl p-6 border border-stone-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Dumbbell className="w-32 h-32 text-emerald-500" />
            </div>
            
            <div className="text-center relative z-10">
                <h2 className="text-stone-400 font-bold uppercase tracking-widest text-sm mb-6">Series de Fuerza</h2>
                
                {renderGrid()}

                <div className="flex items-center justify-center gap-4">
                    <button 
                        onClick={handleAddNineSeries}
                        className="w-12 h-12 rounded-full border border-yellow-700/50 text-yellow-500 flex items-center justify-center hover:bg-yellow-900/30 transition-colors shadow-lg shadow-yellow-900/20"
                        title="Sumar Bosque completo (+9)"
                    >
                        <Trophy className="w-5 h-5" />
                    </button>
                    
                    <button 
                        onClick={handleAddSeries}
                        className="h-16 flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xl shadow-lg shadow-emerald-900/40 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Dumbbell className="w-6 h-6" />
                        {seriesCurrent === 8 ? '¡COMPLETAR!' : 'SERIE +1'}
                    </button>
                </div>
            </div>
        </div>

        {/* TOTAL MINUTES (NEW SECTION) */}
        <div className="bg-stone-900 rounded-2xl p-4 border border-emerald-900/30 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="bg-stone-800 p-3 rounded-xl border border-stone-700">
                    <Timer className="w-6 h-6 text-stone-400" />
                </div>
                <div>
                    <div className="text-2xl font-black text-stone-200">
                        {formatTime(totalMinutes || 0)}
                    </div>
                    <div className="text-xs text-stone-500 font-bold uppercase">Tiempo Total</div>
                </div>
            </div>
            <button 
                onClick={() => setShowTimeModal(true)}
                className="bg-stone-800 hover:bg-stone-700 text-stone-300 px-4 py-3 rounded-xl font-bold text-sm border border-stone-700 transition-colors flex items-center gap-2"
            >
                <Plus className="w-4 h-4" /> Registrar
            </button>
        </div>

        {/* THREE COLUMN STATS ROW */}
        <div className="grid grid-cols-3 gap-3">
            {/* DAYS TRAINED STAT */}
            <div className="bg-stone-900 rounded-2xl p-4 border border-emerald-900/30 flex flex-col items-center justify-center gap-2">
                <Dumbbell className="w-6 h-6 text-emerald-400" />
                <div className="text-3xl font-black text-white leading-none">{daysTrained}</div>
            </div>

            {/* SPRINTS */}
            <button 
                onClick={() => incrementStat('sprintCount')}
                className="bg-stone-900 p-4 rounded-2xl border border-stone-800 hover:border-cyan-700 transition-colors group relative overflow-hidden flex flex-col items-center justify-center gap-2"
            >
                <div className="absolute inset-0 bg-cyan-900/5 group-hover:bg-cyan-900/10 transition-colors"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <Wind className="w-6 h-6 text-cyan-500 mb-2" />
                    <div className="text-3xl font-black text-stone-200 leading-none">{sprintCount}</div>
                </div>
            </button>

            {/* STRETCHING */}
            <button 
                onClick={() => incrementStat('stretchCount')}
                className="bg-stone-900 p-4 rounded-2xl border border-stone-800 hover:border-emerald-700 transition-colors group relative overflow-hidden flex flex-col items-center justify-center gap-2"
            >
                <div className="absolute inset-0 bg-emerald-900/5 group-hover:bg-emerald-900/10 transition-colors"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <Move className="w-6 h-6 text-emerald-500 mb-2" />
                    <div className="text-3xl font-black text-stone-200 leading-none">{stretchCount}</div>
                </div>
            </button>
        </div>

        {/* MUSCLE GROUPS ROW */}
        <div className="grid grid-cols-3 gap-3 mt-3">
            {/* PIERNAS */}
            <button 
                onClick={() => incrementStat('legsCount')}
                className="bg-stone-900 p-4 rounded-2xl border border-stone-800 hover:border-orange-700 transition-colors group relative overflow-hidden flex flex-col items-center justify-center gap-2"
            >
                <div className="absolute inset-0 bg-orange-900/5 group-hover:bg-orange-900/10 transition-colors"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <LegIcon className="w-6 h-6 text-orange-500 mb-2" />
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Piernas</div>
                    <div className="text-2xl font-black text-stone-200 leading-none">{exercise.legsCount || 0}</div>
                </div>
            </button>

            {/* TIRÓN */}
            <button 
                onClick={() => incrementStat('pullCount')}
                className="bg-stone-900 p-4 rounded-2xl border border-stone-800 hover:border-violet-700 transition-colors group relative overflow-hidden flex flex-col items-center justify-center gap-2"
            >
                <div className="absolute inset-0 bg-violet-900/5 group-hover:bg-violet-900/10 transition-colors"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <BackIcon className="w-6 h-6 text-violet-500 mb-2" />
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Espalda</div>
                    <div className="text-2xl font-black text-stone-200 leading-none">{exercise.pullCount || 0}</div>
                </div>
            </button>

            {/* EMPUJE */}
            <button 
                onClick={() => incrementStat('pushCount')}
                className="bg-stone-900 p-4 rounded-2xl border border-stone-800 hover:border-rose-700 transition-colors group relative overflow-hidden flex flex-col items-center justify-center gap-2"
            >
                <div className="absolute inset-0 bg-rose-900/5 group-hover:bg-rose-900/10 transition-colors"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <ChestIcon className="w-6 h-6 text-rose-500 mb-2" />
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Pecho</div>
                    <div className="text-2xl font-black text-stone-200 leading-none">{exercise.pushCount || 0}</div>
                </div>
            </button>
        </div>

        {/* SESSION TIMER (TOTAL WORKOUT) */}
        <div className="bg-stone-900 rounded-2xl p-6 border border-stone-800 shadow-xl relative overflow-hidden mt-6">
            <div className="text-center">
                <h2 className="text-stone-400 font-bold uppercase tracking-widest text-sm mb-4">Tiempo en el Bosque</h2>
                
                <div className="text-[4rem] font-black font-mono leading-none text-white mb-6">
                    {formatSessionTime(sessionSeconds)}
                </div>

                <div className="flex gap-4 items-center justify-center">
                    <button
                        onClick={() => setSessionIsRunning(!sessionIsRunning)}
                        className={`flex-1 max-w-[200px] h-14 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2 ${
                            sessionIsRunning 
                                ? 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/40'
                        }`}
                    >
                        {sessionIsRunning ? (
                            <><Pause className="w-5 h-5" /> PAUSA</>
                        ) : (
                            <><Play className="w-5 h-5" /> {sessionSeconds > 0 ? 'REANUDAR' : 'EMPEZAR'}</>
                        )}
                    </button>
                    
                    {sessionSeconds > 0 && (
                        <button
                            onClick={() => { setSessionIsRunning(false); setShowSessionConfirmModal(true); }}
                            className="w-14 h-14 rounded-xl font-bold bg-amber-600/20 text-amber-500 border border-amber-900/50 hover:bg-amber-600/30 transition-colors flex items-center justify-center shrink-0"
                            title="Terminar sesión en el Bosque"
                        >
                            <Square className="w-5 h-5 fill-current" />
                        </button>
                    )}
                </div>
            </div>
        </div>
        
        {/* INTERVAL TIMER SECTION */}
        <div className="bg-stone-900 rounded-2xl p-6 border border-stone-800 shadow-xl relative overflow-hidden mt-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-stone-400 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                    <Timer className="w-4 h-4" /> Cronómetro de Series
                </h2>
                <button 
                    onClick={() => setShowTimerSettings(true)}
                    className="p-2 hover:bg-stone-800 rounded-full text-stone-500 transition-colors"
                >
                    <Settings2 className="w-5 h-5" />
                </button>
            </div>

            <div className="flex flex-col items-center justify-center py-4">
                {/* CIRCULAR TIMER */}
                <div className="relative w-64 h-64 mb-8">
                    {/* SVG Progress Rectangle */}
                    <svg className="w-full h-full transform" viewBox="0 0 256 256">
                        {/* Background Rect */}
                        <path
                            d={timerPath}
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="12"
                            strokeLinejoin="round"
                            className="text-stone-800/50"
                        />
                        {/* Progress Rect */}
                        <path
                            d={timerPath}
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="12"
                            strokeDasharray={perimeter}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`transition-all duration-75 ${
                                timerPhase === 'work' ? 'text-emerald-500' : 'text-cyan-500'
                            }`}
                        />
                    </svg>

                    {/* Inner Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${
                            timerPhase === 'work' ? 'text-emerald-500/70' : 'text-cyan-500/70'
                        }`}>
                            {timerPhase === 'work' ? '¡A TOPE!' : 'DESCANSO'}
                        </div>
                        
                        <div className={`text-6xl font-black font-mono leading-none mb-4 transition-colors ${
                            timerPhase === 'work' ? 'text-white' : 'text-cyan-400'
                        }`}>
                            {formatTimerDisplay(timerTimeLeft)}
                        </div>

                        {/* Round Dots Indicators (GLOBAL VIEW) */}
                        <div className="flex flex-wrap gap-2 items-center justify-center mt-2 max-w-[180px]">
                            {timerBlocks.flatMap((block, bIdx) => 
                                Array.from({ length: block.rounds }).map((_, rIdx) => {
                                    const isCompleted = bIdx < currentBlockIndex || (bIdx === currentBlockIndex && rIdx + 1 < timerCurrentRound);
                                    const isCurrent = bIdx === currentBlockIndex && rIdx + 1 === timerCurrentRound;
                                    
                                    return (
                                        <div 
                                            key={`${block.id}-${rIdx}`}
                                            className={`w-2.5 h-2.5 rounded-full border-2 transition-all duration-500 ${
                                                isCompleted 
                                                    ? 'bg-yellow-500 border-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.4)]' 
                                                    : isCurrent
                                                        ? 'bg-stone-700 border-stone-400 animate-pulse scale-110' 
                                                        : 'bg-stone-900 border-stone-800'
                                            } ${bIdx !== currentBlockIndex ? 'opacity-40' : 'opacity-100'}`}
                                        />
                                    );
                                })
                            )}
                        </div>

                        {/* Block Info */}
                        <div className="mt-4 text-[10px] font-bold text-stone-600 uppercase tracking-widest">
                            Bloque {currentBlockIndex + 1} de {timerBlocks.length}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full max-w-[280px]">
                    <button 
                        onClick={resetTimer}
                        className="w-14 h-14 rounded-full border border-stone-700 text-stone-400 flex items-center justify-center hover:bg-stone-800 transition-colors"
                    >
                        <RotateCcw className="w-6 h-6" />
                    </button>
                    
                    <button 
                        onClick={toggleTimer}
                        className={`flex-1 h-16 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                            timerIsRunning 
                                ? 'bg-stone-800 text-stone-300 hover:bg-stone-700' 
                                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/40'
                        }`}
                    >
                        {timerIsRunning ? (
                            <><Pause className="w-6 h-6" /> PAUSA</>
                        ) : (
                            <><Play className="w-6 h-6" /> INICIAR</>
                        )}
                    </button>
                </div>
            </div>
        </div>

        <p className="text-center text-xs text-stone-600 italic pt-4">
            "El dolor es debilidad abandonando el cuerpo."
        </p>

      </div>

      {/* Complete Cycle Modal */}
      {showCompleteModal && (
        <div 
          className="fixed inset-0 max-w-md mx-auto z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowCompleteModal(false)}
        >
            <div 
              className="bg-stone-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-stone-800 flex flex-col items-center text-center"
              onClick={(e) => e.stopPropagation()}
            >
                <div className="w-20 h-20 bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
                    <Trophy className="w-10 h-10 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black text-stone-100 mb-2">¡Bosque Completado!</h2>
                <p className="text-stone-400 font-bold mb-8">Has alcanzado las 9 series. ¿Añadir 1 sesión de Bosque a tus estadísticas y empezar de cero?</p>
                
                <div className="flex gap-4 w-full">
                    <button 
                        onClick={() => setShowCompleteModal(false)}
                        className="flex-1 py-4 bg-stone-800 text-stone-300 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-stone-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={confirmCompleteCycle}
                        className="flex-1 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/30"
                    >
                        Completar
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Add Time Modal */}
      {showTimeModal && (
        <div 
          className="fixed inset-0 max-w-md mx-auto z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowTimeModal(false)}
        >
            <div 
              className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-800/50">
                     <h3 className="font-bold text-indigo-200 text-lg">Añadir Tiempo</h3>
                     <button onClick={() => setShowTimeModal(false)} className="p-1 hover:bg-stone-700 rounded-full">
                         <X className="w-6 h-6 text-stone-400" />
                     </button>
                </div>
                
                <div className="p-6">
                    <p className="text-sm text-stone-400 mb-4 text-center">Selecciona la duración de tu estancia en el Bosque:</p>
                    
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {[3, 10, 15, 30, 45, 60].map(mins => (
                            <button
                                key={mins}
                                onClick={() => addMinutes(mins)}
                                className="py-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-indigo-500 hover:text-indigo-400 transition-all font-bold text-stone-300"
                            >
                                {mins}'
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2 border-t border-stone-800 pt-4">
                        <input
                            type="number"
                            placeholder="Otro..."
                            value={customTime}
                            onChange={(e) => setCustomTime(e.target.value)}
                            className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-4 text-stone-200 outline-none focus:border-indigo-500"
                        />
                        <button 
                            onClick={() => addMinutes(Number(customTime))}
                            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/20"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Timer Settings Modal */}
      {showTimerSettings && (
        <div 
          className="fixed inset-0 max-w-md mx-auto z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowTimerSettings(false)}
        >
            <div 
              className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-800/50 shrink-0">
                     <h3 className="font-bold text-stone-200 text-lg">Rutina de Intervalos</h3>
                     <button onClick={() => setShowTimerSettings(false)} className="p-1 hover:bg-stone-700 rounded-full">
                         <X className="w-6 h-6 text-stone-400" />
                     </button>
                </div>
                
                <div className="p-4 overflow-y-auto space-y-4 flex-1 bg-stone-950/50">
                    {timerBlocks.map((block, index) => (
                        <div key={block.id} className="bg-stone-900 p-4 rounded-2xl border border-stone-800 relative group">
                            <div className="flex items-center justify-between mb-4">
                                <span className="bg-stone-800 text-[10px] font-black px-2 py-1 rounded text-stone-500 uppercase tracking-widest">
                                    Bloque {index + 1}
                                </span>
                                {timerBlocks.length > 1 && (
                                    <button 
                                        onClick={() => {
                                            const newBlocks = timerBlocks.filter(b => b.id !== block.id);
                                            onUpdate({ ...exercise, timerBlocks: newBlocks });
                                        }}
                                        className="text-stone-600 hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[8px] font-black text-stone-600 uppercase mb-1">Rondas</label>
                                    <input
                                        type="number"
                                        value={block.rounds || ''}
                                        placeholder="0"
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const newBlocks = [...timerBlocks];
                                            newBlocks[index] = { ...block, rounds: val === '' ? 0 : Math.max(0, parseInt(val) || 0) };
                                            onUpdate({ ...exercise, timerBlocks: newBlocks });
                                        }}
                                        className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2 py-2 text-center text-white font-bold text-lg outline-none focus:border-stone-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[8px] font-black text-stone-600 uppercase mb-1">Trabajo (s)</label>
                                    <input
                                        type="number"
                                        value={block.workSecs || ''}
                                        placeholder="0"
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const newBlocks = [...timerBlocks];
                                            newBlocks[index] = { ...block, workSecs: val === '' ? 0 : Math.max(0, parseInt(val) || 0) };
                                            onUpdate({ ...exercise, timerBlocks: newBlocks });
                                        }}
                                        className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2 py-2 text-center text-emerald-400 font-bold text-lg outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[8px] font-black text-stone-600 uppercase mb-1">Descanso (s)</label>
                                    <input
                                        type="number"
                                        value={block.restSecs || (block.restSecs === 0 ? '0' : '')}
                                        placeholder="0"
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const newBlocks = [...timerBlocks];
                                            newBlocks[index] = { ...block, restSecs: val === '' ? 0 : Math.max(0, parseInt(val) || 0) };
                                            onUpdate({ ...exercise, timerBlocks: newBlocks });
                                        }}
                                        className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2 py-2 text-center text-cyan-400 font-bold text-lg outline-none focus:border-cyan-500"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    <button 
                        onClick={() => {
                            const newBlock = { 
                                id: Math.random().toString(36).substr(2, 9), 
                                workSecs: 30, 
                                restSecs: 15, 
                                rounds: 2 
                            };
                            onUpdate({ ...exercise, timerBlocks: [...timerBlocks, newBlock] });
                        }}
                        className="w-full py-4 border-2 border-dashed border-stone-800 rounded-2xl text-stone-600 hover:border-emerald-900/50 hover:text-emerald-500 transition-all font-bold text-sm flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Añadir Bloque
                    </button>
                </div>

                <div className="p-4 bg-stone-900 shrink-0">
                    <button 
                        onClick={() => {
                            resetTimer();
                            setShowTimerSettings(false);
                        }}
                        className="w-full py-4 rounded-xl bg-stone-200 text-stone-900 font-black text-lg hover:bg-white transition-colors"
                    >
                        Aplicar y Reiniciar
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Session Result Confirm Modal */}
      {showSessionConfirmModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowSessionConfirmModal(false)}>
              <div 
                  className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 p-6 text-center"
                  onClick={(e) => e.stopPropagation()}
              >
                  <h3 className="font-bold text-xl text-white mb-2">Fin de la estancia en el Bosque</h3>
                  <p className="text-stone-400 mb-6">
                      ¿Añadir <span className="text-indigo-400 font-bold text-lg">{Math.round(sessionSeconds / 60)} minutos</span> al tiempo total en el Bosque?
                  </p>
                  
                  <div className="flex gap-4">
                      <button 
                          onClick={() => {
                              setShowSessionConfirmModal(false);
                              setSessionSeconds(0);
                              sessionAccumulatedRef.current = 0;
                              sessionStartTimeRef.current = null;
                          }}
                          className="flex-1 py-3 rounded-xl bg-stone-800 text-stone-300 font-bold hover:bg-stone-700 transition-colors"
                      >
                          Descartar
                      </button>
                      <button 
                          onClick={() => {
                              const minsToAdd = Math.round(sessionSeconds / 60);
                              if (minsToAdd > 0) {
                                  addMinutes(minsToAdd);
                              }
                              setShowSessionConfirmModal(false);
                              setSessionSeconds(0);
                              sessionAccumulatedRef.current = 0;
                              sessionStartTimeRef.current = null;
                          }}
                          className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 transition-colors"
                      >
                          Añadir Tiempo
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Modal to edit Sebastian notes for Bosque */}
      {showNotesModal && (
        <div 
          className="fixed inset-0 max-w-md mx-auto z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowNotesModal(false)}
        >
            <div 
              className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 flex flex-col space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-stone-850">
                        <Info className="w-5 h-5 text-amber-500" />
                        <h3 className="text-base font-bold text-stone-200">
                            Notas de Bosque para Sebastian
                        </h3>
                    </div>
                    
                    <p className="text-xs text-stone-400 leading-relaxed">
                        Estas notas le servirán a Sebastian para sugerirte entrenamientos según tu nivel de energía e histórico.
                    </p>
                    
                    <textarea
                        value={tempNotesText}
                        onChange={(e) => setTempNotesText(e.target.value)}
                        placeholder="Ej: Si mi energía es < 4, priorizar estiramientos en vez de series de fuerza..."
                        className="w-full h-32 bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-200 text-sm focus:outline-none focus:border-amber-500 font-sans resize-none placeholder:text-stone-600 leading-relaxed"
                    />
                    
                    <div className="grid grid-cols-2 gap-3 w-full pt-2">
                        <button 
                            onClick={() => setShowNotesModal(false)}
                            className="py-3 rounded-xl border border-stone-750 text-stone-400 hover:bg-stone-800 font-bold transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={() => {
                                onUpdate({
                                    ...exercise,
                                    notes: tempNotesText
                                });
                                setShowNotesModal(false);
                            }}
                            className="py-3 rounded-xl bg-amber-600 text-stone-950 font-bold hover:bg-amber-500 transition-colors shadow-lg shadow-amber-900/20 text-sm"
                        >
                            Guardar Notas
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};