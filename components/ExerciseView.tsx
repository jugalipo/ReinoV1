import React, { useState, useEffect, useRef } from 'react';
import { ExerciseState } from '../types';
import { ArrowLeft, Dumbbell, Trophy, Move, Wind, RotateCcw, Timer, Plus, X, BicepsFlexed, Play, Pause, Settings2 } from 'lucide-react';

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

  // State for Interval Timer
  const [timerWorkTime, setTimerWorkTime] = useState(45);
  const [timerRestTime, setTimerRestTime] = useState(15);
  const [timerRounds, setTimerRounds] = useState(3);
  const [timerCurrentRound, setTimerCurrentRound] = useState(1);
  const [timerTimeLeft, setTimerTimeLeft] = useState(45);
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const [timerPhase, setTimerPhase] = useState<'work' | 'rest'>('work');
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element for beep
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playBeep = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timerIsRunning && timerTimeLeft > 0) {
      interval = setInterval(() => {
        setTimerTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timerIsRunning && timerTimeLeft === 0) {
      playBeep();
      if (timerPhase === 'work') {
        if (timerCurrentRound >= timerRounds) {
          // Finished all rounds
          setTimerIsRunning(false);
          setTimerPhase('work');
          setTimerCurrentRound(1);
          setTimerTimeLeft(timerWorkTime);
        } else {
          // Start rest
          setTimerPhase('rest');
          setTimerTimeLeft(timerRestTime);
        }
      } else {
        // Start next work round
        setTimerPhase('work');
        setTimerCurrentRound((prev) => prev + 1);
        setTimerTimeLeft(timerWorkTime);
      }
    }

    return () => clearInterval(interval);
  }, [timerIsRunning, timerTimeLeft, timerPhase, timerCurrentRound, timerRounds, timerWorkTime, timerRestTime]);

  const toggleTimer = () => {
    setTimerIsRunning(!timerIsRunning);
  };

  const resetTimer = () => {
    setTimerIsRunning(false);
    setTimerPhase('work');
    setTimerCurrentRound(1);
    setTimerTimeLeft(timerWorkTime);
  };

  const applyTimerSettings = () => {
    resetTimer();
    setShowTimerSettings(false);
  };

  const formatTimerDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAddSeries = () => {
    const next = seriesCurrent + 1;
    if (next >= 9) {
      // Complete Cycle
      onUpdate({
        ...exercise,
        seriesCurrent: 0,
        daysTrained: daysTrained + 1
      });
    } else {
      // Increment
      onUpdate({
        ...exercise,
        seriesCurrent: next
      });
    }
  };

  const handleRemoveSeries = () => {
    if (seriesCurrent > 0) {
      onUpdate({
        ...exercise,
        seriesCurrent: seriesCurrent - 1
      });
    }
  };

  const incrementStat = (key: 'sprintCount' | 'stretchCount') => {
    onUpdate({
      ...exercise,
      [key]: exercise[key] + 1
    });
  };

  const addMinutes = (amount: number) => {
      if (amount <= 0) return;
      onUpdate({
          ...exercise,
          totalMinutes: (totalMinutes || 0) + amount
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
    return (
      <div className="grid grid-cols-3 gap-3 w-64 mx-auto mb-6">
        {Array.from({ length: 9 }).map((_, i) => {
          const isActive = i < seriesCurrent;
          return (
            <div
              key={i}
              className={`aspect-square rounded-xl transition-all duration-300 border-2 flex items-center justify-center font-bold text-lg
                ${isActive 
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
                  : 'bg-stone-900 border-stone-800 text-stone-700'
                }`}
            >
              <BicepsFlexed className="w-6 h-6" />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-emerald-950/20 relative">
      <div className="p-4 bg-stone-900 shadow-sm flex items-center gap-4 sticky top-0 z-10 border-b border-stone-800">
        <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full">
          <ArrowLeft className="w-6 h-6 text-emerald-500" />
        </button>
        <h1 className="text-xl font-bold text-emerald-200">Sala de Entrenamiento</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-12">
        
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
                        onClick={handleRemoveSeries}
                        disabled={seriesCurrent === 0}
                        className="w-12 h-12 rounded-full border border-stone-700 text-stone-500 flex items-center justify-center hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <RotateCcw className="w-5 h-5" />
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
        
        {/* INTERVAL TIMER SECTION */}
        <div className="bg-stone-900 rounded-2xl p-6 border border-stone-800 shadow-xl relative overflow-hidden mt-6">
            <div className="flex justify-between items-center mb-4">
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
                <div className="text-sm font-bold uppercase tracking-widest mb-2 text-stone-500">
                    Ronda {timerCurrentRound} / {timerRounds}
                </div>
                
                <div className={`text-6xl font-black font-mono mb-2 transition-colors ${
                    timerPhase === 'work' ? 'text-emerald-400' : 'text-cyan-400'
                }`}>
                    {formatTimerDisplay(timerTimeLeft)}
                </div>
                
                <div className={`text-sm font-bold uppercase tracking-widest mb-6 ${
                    timerPhase === 'work' ? 'text-emerald-600' : 'text-cyan-600'
                }`}>
                    {timerPhase === 'work' ? '¡A TOPE!' : 'DESCANSO'}
                </div>

                <div className="flex items-center gap-4 w-full">
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

      {/* Add Time Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-800/50">
                     <h3 className="font-bold text-indigo-200 text-lg">Añadir Tiempo</h3>
                     <button onClick={() => setShowTimeModal(false)} className="p-1 hover:bg-stone-700 rounded-full">
                         <X className="w-6 h-6 text-stone-400" />
                     </button>
                </div>
                
                <div className="p-6">
                    <p className="text-sm text-stone-400 mb-4 text-center">Selecciona la duración de tu entrenamiento:</p>
                    
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-800/50">
                     <h3 className="font-bold text-stone-200 text-lg">Ajustes del Cronómetro</h3>
                     <button onClick={() => setShowTimerSettings(false)} className="p-1 hover:bg-stone-700 rounded-full">
                         <X className="w-6 h-6 text-stone-400" />
                     </button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Tiempo de Ejercicio (segundos)</label>
                        <input
                            type="number"
                            value={timerWorkTime}
                            onChange={(e) => setTimerWorkTime(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-emerald-400 font-bold text-xl outline-none focus:border-emerald-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Tiempo de Descanso (segundos)</label>
                        <input
                            type="number"
                            value={timerRestTime}
                            onChange={(e) => setTimerRestTime(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-cyan-400 font-bold text-xl outline-none focus:border-cyan-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Número de Rondas</label>
                        <input
                            type="number"
                            value={timerRounds}
                            onChange={(e) => setTimerRounds(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-200 font-bold text-xl outline-none focus:border-stone-500"
                        />
                    </div>

                    <button 
                        onClick={applyTimerSettings}
                        className="w-full py-4 rounded-xl bg-stone-200 text-stone-900 font-black text-lg hover:bg-white transition-colors mt-4"
                    >
                        Aplicar y Reiniciar
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};