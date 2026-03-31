import React, { useState, useEffect, useRef } from 'react';
import { PianoState } from '../types';
import { ArrowLeft, Music, CheckCircle2, Circle, RotateCcw, Check, Plus, Minus, Clock, Play, Pause, Square } from 'lucide-react';

interface PianoViewProps {
  pianoState?: PianoState;
  onUpdate: (state: PianoState) => void;
  onBack: () => void;
}

const defaultPianoState: PianoState = {
  piezaDesafio: '',
  piezaConsolidacion: '',
  piezaLectura: '',
  henleLevel: 1,
  checklist: {
    recuperacionActiva: false,
    lecturaPrimeraVista: false,
    tecnicaPrecision: false,
    construccionIntercalada: false,
    consolidacion: false,
    audicionCritica: false,
  },
  currentScaleIndex: 0,
  sesionesDesafio: 0,
  sesionesConsolidacion: 0,
  sesionesCompletadas: 0,
  hanonExercise: 1,
  scaleExercises: {
    octava: false,
    decima: false,
    sexta: false,
    tercera: false,
    arpegiosEnlazados: false,
    arpegiosExtendidos: false,
    acordes: false,
  }
};

const NOTES = ['Do', 'Sol', 'Re', 'La', 'Mi', 'Si', 'Fa#/Solb', 'Re b', 'La b', 'Mi b', 'Si b', 'Fa'];
const MODES = ['Ma', 'MeN', 'MeA', 'MeM'];

const getScale = (index: number) => {
  const note = NOTES[index % 12];
  const mode = MODES[(index + Math.floor(index / 12)) % 4];
  return `${note} ${mode}`;
};

const DEFAULT_TIMES = {
  recuperacionActiva: 4,
  lecturaPrimeraVista: 6,
  tecnicaPrecision: 5,
  construccionIntercalada: 10,
  consolidacion: 7,
  audicionCritica: 5,
};
const DEFAULT_TOTAL_TIME = Object.values(DEFAULT_TIMES).reduce((a, b) => a + b, 0);

export const PianoView: React.FC<PianoViewProps> = ({ pianoState, onUpdate, onBack }) => {
  const state = pianoState || defaultPianoState;
  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const updateState = (updates: Partial<PianoState>) => {
    const newState = { ...stateRef.current, ...updates };
    stateRef.current = newState;
    onUpdate(newState);
  };

  const currentIndex = state.currentScaleIndex || 0;
  const currentScale = getScale(currentIndex);

  const [isTimerOpen, setIsTimerOpen] = useState(state.timerState?.isOpen || false);
  const [totalTimeInput, setTotalTimeInput] = useState(state.timerState?.totalTimeInput || DEFAULT_TOTAL_TIME.toString());
  const [timerActive, setTimerActive] = useState(false); // Always start paused
  const [currentSectionIndex, setCurrentSectionIndex] = useState(state.timerState?.currentSectionIndex || 0);
  const [timeLeftInSection, setTimeLeftInSection] = useState(state.timerState?.timeLeftInSection || 0);
  const [timerSections, setTimerSections] = useState<{key: string, label: string, duration: number}[]>(state.timerState?.sections || []);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const targetEndTimeRef = useRef<number | null>(null);

  // --- MOBILE BACK BUTTON SUPPORT FOR MODALS ---
  useEffect(() => {
    if (isTimerOpen) {
      window.history.pushState({ modal: 'pianoTimer' }, '');
      
      const handlePopState = () => {
        setIsTimerOpen(false);
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [isTimerOpen]);
  // ---------------------------------------------

  const toggleChecklist = (field: keyof PianoState['checklist'], forceValue?: boolean) => {
    const currentState = stateRef.current;
    const newValue = forceValue !== undefined ? forceValue : !currentState.checklist[field];
    
    const newChecklist = {
      ...currentState.checklist,
      [field]: newValue
    };

    const allChecked = Object.values(newChecklist).every(Boolean);

    if (allChecked) {
      updateState({
        checklist: {
          recuperacionActiva: false,
          lecturaPrimeraVista: false,
          tecnicaPrecision: false,
          construccionIntercalada: false,
          consolidacion: false,
          audicionCritica: false,
        },
        sesionesCompletadas: (currentState.sesionesCompletadas || 0) + 1,
        sesionesDesafio: (currentState.sesionesDesafio || 0) + 1,
        sesionesConsolidacion: (currentState.sesionesConsolidacion || 0) + 1
      });
    } else {
      updateState({
        checklist: newChecklist
      });
    }
  };

  useEffect(() => {
    // Create audio element for notification
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current = audio;
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive) {
      if (targetEndTimeRef.current === null && timeLeftInSection > 0) {
        targetEndTimeRef.current = Date.now() + timeLeftInSection * 1000;
      }

      interval = setInterval(() => {
        if (targetEndTimeRef.current !== null) {
          const now = Date.now();
          const remaining = Math.max(0, Math.round((targetEndTimeRef.current - now) / 1000));
          
          setTimeLeftInSection(prev => {
            if (prev !== remaining) return remaining;
            return prev;
          });

          if (remaining === 0) {
            targetEndTimeRef.current = null;
            
            if (audioRef.current) {
              audioRef.current.play().catch(e => console.log('Audio play failed:', e));
            }
            
            const currentSectionKey = timerSections[currentSectionIndex].key as keyof PianoState['checklist'];
            
            // Create a copy of the current checklist state to determine the next step
            const currentChecklist = { ...stateRef.current.checklist };
            
            if (!currentChecklist[currentSectionKey]) {
              currentChecklist[currentSectionKey] = true;
              toggleChecklist(currentSectionKey, true);
            }

            let nextIndex = currentSectionIndex + 1;
            while (nextIndex < timerSections.length) {
              const nextKey = timerSections[nextIndex].key as keyof PianoState['checklist'];
              if (!currentChecklist[nextKey]) {
                break;
              }
              nextIndex++;
            }

            if (nextIndex < timerSections.length) {
              const nextDuration = timerSections[nextIndex].duration;
              setCurrentSectionIndex(nextIndex);
              setTimeLeftInSection(nextDuration);
              targetEndTimeRef.current = Date.now() + nextDuration * 1000;
              
              updateState({
                timerState: {
                  isOpen: isTimerOpen,
                  totalTimeInput,
                  currentSectionIndex: nextIndex,
                  timeLeftInSection: nextDuration,
                  sections: timerSections
                }
              });
            } else {
              setTimerActive(false);
              setCurrentSectionIndex(0);
              setTimeLeftInSection(0);
              setTimerSections([]);

              updateState({
                timerState: {
                  isOpen: isTimerOpen,
                  totalTimeInput,
                  currentSectionIndex: 0,
                  timeLeftInSection: 0,
                  sections: []
                }
              });
            }
          }
        }
      }, 200);
    } else {
      targetEndTimeRef.current = null;
    }
    return () => clearInterval(interval);
  }, [timerActive, currentSectionIndex, timerSections, isTimerOpen, totalTimeInput]);

  useEffect(() => {
    if (timerActive && timerSections.length > 0) {
      const currentSectionKey = timerSections[currentSectionIndex]?.key as keyof PianoState['checklist'];
      if (currentSectionKey && state.checklist[currentSectionKey]) {
        let nextIndex = currentSectionIndex + 1;
        while (nextIndex < timerSections.length) {
          const nextKey = timerSections[nextIndex].key as keyof PianoState['checklist'];
          if (!state.checklist[nextKey]) {
            break;
          }
          nextIndex++;
        }

        if (nextIndex < timerSections.length) {
          const nextDuration = timerSections[nextIndex].duration;
          setCurrentSectionIndex(nextIndex);
          setTimeLeftInSection(nextDuration);
          targetEndTimeRef.current = Date.now() + nextDuration * 1000;
          
          updateState({
            timerState: {
              isOpen: isTimerOpen,
              totalTimeInput,
              currentSectionIndex: nextIndex,
              timeLeftInSection: nextDuration,
              sections: timerSections
            }
          });
        } else {
          setTimerActive(false);
          setCurrentSectionIndex(0);
          setTimeLeftInSection(0);
          setTimerSections([]);
          targetEndTimeRef.current = null;

          updateState({
            timerState: {
              isOpen: isTimerOpen,
              totalTimeInput,
              currentSectionIndex: 0,
              timeLeftInSection: 0,
              sections: []
            }
          });
        }
      }
    }
  }, [state.checklist, timerActive, currentSectionIndex, timerSections, isTimerOpen, totalTimeInput]);

  const handleToggleTimerOpen = () => {
    const newVal = !isTimerOpen;
    setIsTimerOpen(newVal);
    updateState({
      timerState: {
        isOpen: newVal,
        totalTimeInput,
        currentSectionIndex,
        timeLeftInSection,
        sections: timerSections
      }
    });
  };

  const handleTotalTimeChange = (val: string) => {
    setTotalTimeInput(val);
    updateState({
      timerState: {
        isOpen: isTimerOpen,
        totalTimeInput: val,
        currentSectionIndex,
        timeLeftInSection,
        sections: timerSections
      }
    });
  };

  const handleToggleTimerActive = () => {
    const newActive = !timerActive;
    setTimerActive(newActive);
    if (!newActive) {
      // Pausing, save current time
      targetEndTimeRef.current = null;
      updateState({
        timerState: {
          isOpen: isTimerOpen,
          totalTimeInput,
          currentSectionIndex,
          timeLeftInSection,
          sections: timerSections
        }
      });
    } else {
      // Resuming
      targetEndTimeRef.current = Date.now() + timeLeftInSection * 1000;
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  };

  const startTimer = () => {
    const totalMinutes = parseInt(totalTimeInput) || DEFAULT_TOTAL_TIME;
    const ratio = totalMinutes / DEFAULT_TOTAL_TIME;
    
    const sections = [
      { key: 'recuperacionActiva', label: 'Recuperación activa', duration: Math.round(DEFAULT_TIMES.recuperacionActiva * ratio * 60) },
      { key: 'lecturaPrimeraVista', label: 'Lectura a primera vista', duration: Math.round(DEFAULT_TIMES.lecturaPrimeraVista * ratio * 60) },
      { key: 'tecnicaPrecision', label: 'Técnica de precisión quirúrgica', duration: Math.round(DEFAULT_TIMES.tecnicaPrecision * ratio * 60) },
      { key: 'construccionIntercalada', label: 'Construcción intercalada', duration: Math.round(DEFAULT_TIMES.construccionIntercalada * ratio * 60) },
      { key: 'consolidacion', label: 'Consolidación', duration: Math.round(DEFAULT_TIMES.consolidacion * ratio * 60) },
      { key: 'audicionCritica', label: 'Audición crítica o improvisación', duration: Math.round(DEFAULT_TIMES.audicionCritica * ratio * 60) },
    ];
    
    let startIndex = 0;
    while (startIndex < sections.length) {
      const key = sections[startIndex].key as keyof PianoState['checklist'];
      if (!stateRef.current.checklist[key]) {
        break;
      }
      startIndex++;
    }

    if (startIndex >= sections.length) {
      startIndex = 0;
    }
    
    setTimerSections(sections);
    setCurrentSectionIndex(startIndex);
    setTimeLeftInSection(sections[startIndex].duration);
    setTimerActive(true);
    targetEndTimeRef.current = Date.now() + sections[startIndex].duration * 1000;

    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    updateState({
      timerState: {
        isOpen: isTimerOpen,
        totalTimeInput,
        currentSectionIndex: startIndex,
        timeLeftInSection: sections[startIndex].duration,
        sections
      }
    });
  };

  const stopTimer = () => {
    setTimerActive(false);
    setCurrentSectionIndex(0);
    setTimeLeftInSection(0);
    setTimerSections([]);

    updateState({
      timerState: {
        isOpen: isTimerOpen,
        totalTimeInput,
        currentSectionIndex: 0,
        timeLeftInSection: 0,
        sections: []
      }
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleTextChange = (field: keyof Pick<PianoState, 'piezaDesafio' | 'piezaConsolidacion' | 'piezaLectura'>, value: string) => {
    updateState({ [field]: value });
  };

  const handleHenleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateState({ henleLevel: parseInt(e.target.value, 10) });
  };

  const resetScaleExercises = {
    octava: false,
    decima: false,
    sexta: false,
    tercera: false,
    arpegiosEnlazados: false,
    arpegiosExtendidos: false,
    acordes: false,
  };

  const currentScaleExercises = state.scaleExercises || defaultPianoState.scaleExercises!;

  const toggleScaleExercise = (field: keyof NonNullable<PianoState['scaleExercises']>) => {
    const currentExercises = stateRef.current.scaleExercises || defaultPianoState.scaleExercises!;
    updateState({
      scaleExercises: {
        ...currentExercises,
        [field]: !currentExercises[field]
      }
    });
  };

  const handleNextScale = () => {
    updateState({ currentScaleIndex: currentIndex + 1, scaleExercises: resetScaleExercises });
  };

  const handlePrevScale = () => {
    updateState({ currentScaleIndex: Math.max(0, currentIndex - 1), scaleExercises: resetScaleExercises });
  };

  const handleIncrementSession = (field: 'sesionesDesafio' | 'sesionesConsolidacion', max: number) => {
    const currentValue = stateRef.current[field] || 0;
    if (currentValue < max) {
      updateState({ [field]: currentValue + 1 });
    }
  };

  const handleDecrementSession = (field: 'sesionesDesafio' | 'sesionesConsolidacion') => {
    const currentValue = stateRef.current[field] || 0;
    if (currentValue > 0) {
      updateState({ [field]: currentValue - 1 });
    }
  };

  const handleNextHanon = () => {
    const currentHanon = stateRef.current.hanonExercise || 1;
    if (currentHanon < 60) {
      updateState({ hanonExercise: currentHanon + 1 });
    }
  };

  const handlePrevHanon = () => {
    const currentHanon = stateRef.current.hanonExercise || 1;
    if (currentHanon > 1) {
      updateState({ hanonExercise: currentHanon - 1 });
    }
  };

  const checklistItems = [
    { key: 'recuperacionActiva', label: 'Recuperación activa', time: '4 min' },
    { key: 'lecturaPrimeraVista', label: 'Lectura a primera vista', time: '6 min' },
    { key: 'tecnicaPrecision', label: 'Técnica de precisión quirúrgica', time: '5 min' },
    { key: 'construccionIntercalada', label: 'Construcción intercalada', time: '10 min' },
    { key: 'consolidacion', label: 'Consolidación', time: '7 min' },
    { key: 'audicionCritica', label: 'Audición crítica o improvisación', time: '5 min' },
  ] as const;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 p-4 max-w-md mx-auto animate-in slide-in-from-right-8 duration-300 pb-24">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 mr-2 bg-stone-900 rounded-full hover:bg-stone-800 transition-colors">
          <ArrowLeft className="w-6 h-6 text-stone-400" />
        </button>
        <div className="flex items-center gap-2">
          <Music className="w-6 h-6 text-indigo-400" />
          <h1 className="text-2xl font-bold">Piano</h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Checklist Sesión Section */}
        <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-300">Sesión de Estudio</h2>
              {(state.sesionesCompletadas || 0) > 0 && (
                <span className="bg-indigo-900/50 text-indigo-300 text-xs font-bold px-2 py-1 rounded-full">
                  {state.sesionesCompletadas}
                </span>
              )}
            </div>
            <button 
              onClick={handleToggleTimerOpen}
              className={`p-2 rounded-full transition-colors ${isTimerOpen || timerActive ? 'bg-indigo-900/50 text-indigo-300' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}
            >
              <Clock className="w-5 h-5" />
            </button>
          </div>

          {isTimerOpen && (
            <div className="mb-4 p-4 bg-stone-950 rounded-xl border border-stone-800">
              {!timerActive && timerSections.length === 0 ? (
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    value={totalTimeInput}
                    onChange={(e) => handleTotalTimeChange(e.target.value)}
                    className="w-20 bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-indigo-500"
                    placeholder="Min"
                  />
                  <span className="text-stone-400 text-sm">minutos totales</span>
                  <button 
                    onClick={startTimer}
                    className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-indigo-400 font-medium text-sm">
                      {timerSections[currentSectionIndex]?.label}
                    </div>
                    <div className="text-2xl font-mono font-bold text-stone-200">
                      {formatTime(timeLeftInSection)}
                    </div>
                  </div>
                  
                  <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-1000 ease-linear"
                      style={{ 
                        width: `${timerSections[currentSectionIndex] ? (timeLeftInSection / timerSections[currentSectionIndex].duration) * 100 : 0}%` 
                      }}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={handleToggleTimerActive}
                      className="p-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-300 transition-colors"
                    >
                      {timerActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={stopTimer}
                      className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors"
                    >
                      <Square className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            {checklistItems.map((item) => {
              const isChecked = state.checklist[item.key];
              
              let displayTime: string = item.time;
              if (timerSections.length > 0) {
                const section = timerSections.find(s => s.key === item.key);
                if (section) {
                  displayTime = `${Math.round(section.duration / 60)} min`;
                }
              }

              return (
                <button 
                  key={item.key}
                  onClick={() => toggleChecklist(item.key)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isChecked 
                      ? 'bg-indigo-950/30 border-indigo-900/50 text-indigo-200' 
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                  } ${timerActive && timerSections[currentSectionIndex]?.key === item.key ? 'ring-2 ring-indigo-500 border-transparent' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {isChecked ? (
                      <CheckCircle2 className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-stone-600 flex-shrink-0" />
                    )}
                    <span className={`text-sm font-medium text-left ${isChecked ? 'line-through opacity-70' : ''}`}>
                      {item.label}
                    </span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                    isChecked ? 'bg-indigo-900/50 text-indigo-300' : 'bg-stone-800 text-stone-500'
                  }`}>
                    {displayTime}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tonalidad Section */}
        <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800">
          <h2 className="text-lg font-bold mb-4 text-stone-300 text-center">Tonalidad Actual</h2>
          
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 flex items-center justify-center mb-6 shadow-inner">
            <span className="text-4xl font-black text-indigo-400 tracking-wider">
              {currentScale}
            </span>
          </div>

          <div className="flex gap-3 mb-6">
            <button 
              onClick={handlePrevScale}
              disabled={currentIndex === 0}
              className="p-4 bg-stone-800 rounded-xl hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <RotateCcw className="w-6 h-6 text-stone-300" />
            </button>
            <button 
              onClick={handleNextScale}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-900/20"
            >
              <Check className="w-6 h-6" />
              HECHO
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: 'octava', label: '8ª' },
              { key: 'decima', label: '10ª' },
              { key: 'sexta', label: '6ª' },
              { key: 'tercera', label: '3ª' },
              { key: 'arpegiosEnlazados', label: 'Arpegios Enlazados' },
              { key: 'arpegiosExtendidos', label: 'Arpegios Extendidos' },
              { key: 'acordes', label: 'Acordes' },
            ].map((item) => {
              const isChecked = currentScaleExercises[item.key as keyof typeof currentScaleExercises];
              return (
                <button
                  key={item.key}
                  onClick={() => toggleScaleExercise(item.key as any)}
                  className={`p-2 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    item.key === 'arpegiosEnlazados' || item.key === 'arpegiosExtendidos' || item.key === 'acordes' 
                      ? 'col-span-2 sm:col-span-4' 
                      : ''
                  } ${
                    isChecked
                      ? 'bg-indigo-950/50 border-indigo-900 text-indigo-300'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5" />}
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hanon Section */}
        <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800">
          <h2 className="text-lg font-bold mb-4 text-stone-300 text-center">Hanon</h2>
          
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 flex items-center justify-center mb-6 shadow-inner">
            <span className="text-4xl font-black text-indigo-400 tracking-wider">
              Nº {state.hanonExercise || 1}
            </span>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handlePrevHanon}
              disabled={(state.hanonExercise || 1) <= 1}
              className="p-4 bg-stone-800 rounded-xl hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <RotateCcw className="w-6 h-6 text-stone-300" />
            </button>
            <button 
              onClick={handleNextHanon}
              disabled={(state.hanonExercise || 1) >= 60}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-6 h-6" />
              SIGUIENTE
            </button>
          </div>
        </div>

        {/* Piezas Section */}
        <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800">
          <h2 className="text-lg font-bold mb-4 text-stone-300">Repertorio Actual</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1 uppercase tracking-wider">Pieza de Desafío</label>
              <input 
                type="text" 
                value={state.piezaDesafio} 
                onChange={(e) => handleTextChange('piezaDesafio', e.target.value)}
                placeholder="Ej. Chopin Étude Op. 10 No. 4"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-200 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
              <div className="flex items-center justify-between mt-2 bg-stone-950 rounded-lg p-2 border border-stone-800">
                <span className="text-xs text-stone-500 font-medium">Sesiones de práctica</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleDecrementSession('sesionesDesafio')}
                    className="p-1.5 bg-stone-900 rounded-md hover:bg-stone-800 text-stone-400 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className={`text-sm font-bold w-10 text-center ${
                    (state.sesionesDesafio || 0) >= 60 ? 'text-red-500' : 'text-stone-300'
                  }`}>
                    {state.sesionesDesafio || 0}/60
                  </span>
                  <button 
                    onClick={() => handleIncrementSession('sesionesDesafio', 60)}
                    className="p-1.5 bg-stone-900 rounded-md hover:bg-stone-800 text-stone-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1 uppercase tracking-wider">Pieza de Consolidación</label>
              <input 
                type="text" 
                value={state.piezaConsolidacion} 
                onChange={(e) => handleTextChange('piezaConsolidacion', e.target.value)}
                placeholder="Ej. Bach Prelude in C Major"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-200 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
              <div className="flex items-center justify-between mt-2 bg-stone-950 rounded-lg p-2 border border-stone-800">
                <span className="text-xs text-stone-500 font-medium">Sesiones de práctica</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleDecrementSession('sesionesConsolidacion')}
                    className="p-1.5 bg-stone-900 rounded-md hover:bg-stone-800 text-stone-400 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className={`text-sm font-bold w-10 text-center ${
                    (state.sesionesConsolidacion || 0) >= 24 ? 'text-red-500' : 'text-stone-300'
                  }`}>
                    {state.sesionesConsolidacion || 0}/24
                  </span>
                  <button 
                    onClick={() => handleIncrementSession('sesionesConsolidacion', 24)}
                    className="p-1.5 bg-stone-900 rounded-md hover:bg-stone-800 text-stone-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1 uppercase tracking-wider">Pieza de Lectura</label>
              <input 
                type="text" 
                value={state.piezaLectura} 
                onChange={(e) => handleTextChange('piezaLectura', e.target.value)}
                placeholder="Ej. Schumann Album for the Young"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-200 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Nivel Henle Section */}
        <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-stone-300">Nivel Henle</h2>
            <span className="text-2xl font-black text-indigo-400">{state.henleLevel}</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="9" 
            value={state.henleLevel} 
            onChange={handleHenleChange}
            className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-stone-500 mt-2 font-medium">
            <span>Fácil (1-3)</span>
            <span>Medio (4-6)</span>
            <span>Difícil (7-9)</span>
          </div>
        </div>

      </div>
    </div>
  );
};
