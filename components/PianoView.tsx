import React from 'react';
import { PianoState } from '../types';
import { ArrowLeft, Music, CheckCircle2, Circle, RotateCcw, Check, Plus, Minus } from 'lucide-react';

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

export const PianoView: React.FC<PianoViewProps> = ({ pianoState, onUpdate, onBack }) => {
  const state = pianoState || defaultPianoState;
  const currentIndex = state.currentScaleIndex || 0;
  const currentScale = getScale(currentIndex);

  const handleTextChange = (field: keyof Pick<PianoState, 'piezaDesafio' | 'piezaConsolidacion' | 'piezaLectura'>, value: string) => {
    onUpdate({ ...state, [field]: value });
  };

  const handleHenleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...state, henleLevel: parseInt(e.target.value, 10) });
  };

  const toggleChecklist = (field: keyof PianoState['checklist']) => {
    onUpdate({
      ...state,
      checklist: {
        ...state.checklist,
        [field]: !state.checklist[field]
      }
    });
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
    onUpdate({
      ...state,
      scaleExercises: {
        ...currentScaleExercises,
        [field]: !currentScaleExercises[field]
      }
    });
  };

  const handleNextScale = () => {
    onUpdate({ ...state, currentScaleIndex: currentIndex + 1, scaleExercises: resetScaleExercises });
  };

  const handlePrevScale = () => {
    onUpdate({ ...state, currentScaleIndex: Math.max(0, currentIndex - 1), scaleExercises: resetScaleExercises });
  };

  const handleIncrementSession = (field: 'sesionesDesafio' | 'sesionesConsolidacion', max: number) => {
    const currentValue = state[field] || 0;
    if (currentValue < max) {
      onUpdate({ ...state, [field]: currentValue + 1 });
    }
  };

  const handleDecrementSession = (field: 'sesionesDesafio' | 'sesionesConsolidacion') => {
    const currentValue = state[field] || 0;
    if (currentValue > 0) {
      onUpdate({ ...state, [field]: currentValue - 1 });
    }
  };

  const handleNextHanon = () => {
    const currentHanon = state.hanonExercise || 1;
    if (currentHanon < 60) {
      onUpdate({ ...state, hanonExercise: currentHanon + 1 });
    }
  };

  const handlePrevHanon = () => {
    const currentHanon = state.hanonExercise || 1;
    if (currentHanon > 1) {
      onUpdate({ ...state, hanonExercise: currentHanon - 1 });
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

        {/* Checklist Sesión Section */}
        <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800">
          <h2 className="text-lg font-bold mb-4 text-stone-300">Sesión de Estudio</h2>
          <div className="space-y-2">
            {checklistItems.map((item) => {
              const isChecked = state.checklist[item.key];
              return (
                <button 
                  key={item.key}
                  onClick={() => toggleChecklist(item.key)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isChecked 
                      ? 'bg-indigo-950/30 border-indigo-900/50 text-indigo-200' 
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
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
                    {item.time}
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

      </div>
    </div>
  );
};
