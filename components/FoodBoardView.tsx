import React from 'react';
import { FoodState, FoodWheel, FoodBonuses } from '../types';
import { ArrowLeft, ChefHat, Timer, Bike, RotateCcw, Snowflake, Check, Flame } from 'lucide-react';

interface FoodBoardViewProps {
  foodState: FoodState;
  onUpdate: (state: FoodState) => void;
  onBack: () => void;
}

export const FoodBoardView: React.FC<FoodBoardViewProps> = ({ foodState, onUpdate, onBack }) => {
  const { score, history, fridgeCount, ritualCount, wheel, weeklyBonuses } = foodState;

  // --- ACTIONS ---

  const addHistory = (action: string, delta: number) => {
      return [
        { action, timestamp: Date.now(), delta },
        ...history
      ].slice(0, 50);
  };

  const updateScore = (delta: number) => {
      return Math.max(0, Math.min(50, score + delta));
  };

  const handleAction = (type: 'cook' | 'fast' | 'delivery' | 'fah') => {
    let delta = 0;
    if (type === 'cook') delta = 1;
    else if (type === 'fast') delta = 2;
    else if (type === 'delivery') delta = -2;
    else if (type === 'fah') delta = -1;

    onUpdate({
      ...foodState,
      score: updateScore(delta),
      history: addHistory(type, delta)
    });
  };

  const handleBonus = (type: keyof FoodBonuses, delta: number) => {
      const isActive = weeklyBonuses[type];
      const scoreChange = isActive ? -delta : delta;
      
      onUpdate({
          ...foodState,
          score: updateScore(scoreChange),
          weeklyBonuses: { ...weeklyBonuses, [type]: !isActive },
          history: addHistory(isActive ? `Deshacer: ${type}` : `Bonus: ${type}`, scoreChange)
      });
  };

  // --- SYSTEMS ---

  const incrementFridge = () => {
      const newCount = fridgeCount + 1;
      if (newCount >= 20) {
          onUpdate({
              ...foodState,
              score: updateScore(-1),
              fridgeCount: 0,
              history: addHistory('Nevera 20x', -1)
          });
      } else {
          onUpdate({ ...foodState, fridgeCount: newCount });
      }
  };

  const incrementRitual = () => {
      const newCount = ritualCount + 1;
      if (newCount >= 10) {
          onUpdate({
              ...foodState,
              score: updateScore(1),
              ritualCount: 0,
              history: addHistory('Ritual 10x', 1)
          });
      } else {
          onUpdate({ ...foodState, ritualCount: newCount });
      }
  };

  const toggleWheelItem = (item: keyof FoodWheel) => {
      const newWheel = { ...wheel, [item]: !wheel[item] };
      const allChecked = Object.values(newWheel).every(val => val === true);

      if (allChecked) {
          onUpdate({
              ...foodState,
              score: updateScore(3),
              wheel: { lemon: false, nuts: false, dairy: false, coffee: false, spices: false, supplements: false },
              history: addHistory('Rueda Completa', 3)
          });
          alert("¡Rueda completada! +3 Puntos");
      } else {
          onUpdate({ ...foodState, wheel: newWheel });
      }
  };

  // --- UTILS ---

  const resetGame = () => {
      if(window.confirm("¿Reiniciar tu progreso de comida? (Esto reseteará la puntuación a 0)")) {
          onUpdate({ 
              ...foodState, 
              score: 0, 
              weeklyBonuses: { organs: false, legumes: false, fast24: false },
              history: [] 
          });
      }
  }

  // Generate board squares
  const squares = Array.from({ length: 50 }, (_, i) => i + 1);

  const getSquareColor = (num: number) => {
      // 1-10 Red
      if (num <= 10) return 'bg-red-900/40 text-red-500 border border-red-900/50';
      // Milestones Gold
      if ([25, 35, 42].includes(num)) return 'bg-yellow-600/20 text-yellow-500 border border-yellow-500/50';
      // Final Stretch Gold
      if (num >= 45) return 'bg-yellow-600/40 text-yellow-200 border border-yellow-500';
      // Default
      return 'bg-stone-800 text-stone-600 border border-stone-700/50';
  };

  return (
    <div className="flex flex-col h-full bg-lime-950/20">
      <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between sticky top-0 z-10 border-b border-stone-800">
        <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full">
                <ArrowLeft className="w-6 h-6 text-lime-500" />
            </button>
            <h1 className="text-xl font-bold text-lime-200">Jumangiare</h1>
        </div>
        <button onClick={resetGame} className="text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Score Display */}
        <div className="text-center">
            <div className="text-5xl font-black text-lime-500">{score}</div>
            <div className="text-xs text-lime-400/70 uppercase tracking-widest">Posición Actual</div>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-4 gap-2">
            <button onClick={() => handleAction('cook')} className="bg-stone-900 p-2 rounded-xl border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 transition-all">
                <div className="flex flex-col items-center">
                    <ChefHat className="w-6 h-6 text-emerald-500 mb-1" />
                    <span className="text-[10px] text-emerald-500 font-bold">+1</span>
                </div>
            </button>
            <button onClick={() => handleAction('fast')} className="bg-stone-900 p-2 rounded-xl border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 transition-all">
                <div className="flex flex-col items-center">
                    <Timer className="w-6 h-6 text-blue-500 mb-1" />
                    <span className="text-[10px] text-blue-500 font-bold">+2</span>
                </div>
            </button>
            <button onClick={() => handleAction('fah')} className="bg-stone-900 p-2 rounded-xl border-b-4 border-orange-700 active:border-b-0 active:translate-y-1 transition-all">
                <div className="flex flex-col items-center">
                    <span className="text-lg mb-0.5">🍰</span>
                    <span className="text-[10px] text-orange-500 font-bold">-1</span>
                </div>
            </button>
            <button onClick={() => handleAction('delivery')} className="bg-stone-900 p-2 rounded-xl border-b-4 border-red-700 active:border-b-0 active:translate-y-1 transition-all">
                <div className="flex flex-col items-center">
                    <Bike className="w-6 h-6 text-red-500 mb-1" />
                    <span className="text-[10px] text-red-500 font-bold">-2</span>
                </div>
            </button>
        </div>

        {/* Secondary Systems Grid */}
        <div className="grid grid-cols-2 gap-4">
            {/* Fridge Counter */}
            <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-stone-300">Nevera</span>
                    <Snowflake className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex items-end justify-between">
                    <span className="text-3xl font-mono text-cyan-200">{fridgeCount}<span className="text-sm text-stone-500">/20</span></span>
                    <button onClick={incrementFridge} className="bg-cyan-900/50 hover:bg-cyan-900 text-cyan-200 px-3 py-1 rounded text-xs border border-cyan-800">+1</button>
                </div>
                <div className="w-full bg-stone-800 h-1 mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: `${(fridgeCount / 20) * 100}%` }}></div>
                </div>
            </div>

            {/* Ritual Stepper */}
            <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-stone-300">Ritual</span>
                    <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex items-end justify-between">
                    <span className="text-3xl font-mono text-orange-200">{ritualCount}<span className="text-sm text-stone-500">/10</span></span>
                    <button onClick={incrementRitual} className="bg-orange-900/50 hover:bg-orange-900 text-orange-200 px-3 py-1 rounded text-xs border border-orange-800">+1</button>
                </div>
                <div className="w-full bg-stone-800 h-1 mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: `${(ritualCount / 10) * 100}%` }}></div>
                </div>
            </div>
        </div>

        {/* The Wheel */}
        <div className="bg-stone-900 p-4 rounded-xl border border-stone-800">
            <h3 className="text-sm font-bold text-stone-400 mb-3 text-center uppercase tracking-wider">Rueda de Hábitos (+3)</h3>
            <div className="grid grid-cols-6 gap-2">
                {[
                    { key: 'lemon', icon: '🍋' },
                    { key: 'nuts', icon: '🥜' },
                    { key: 'dairy', icon: '🧀' },
                    { key: 'coffee', icon: '☕' },
                    { key: 'spices', icon: '🌶️' },
                    { key: 'supplements', icon: '💊' }
                ].map((item) => (
                    <button 
                        key={item.key}
                        onClick={() => toggleWheelItem(item.key as keyof FoodWheel)}
                        className={`
                            aspect-square rounded-lg flex items-center justify-center text-xl transition-all
                            ${wheel[item.key as keyof FoodWheel] 
                                ? 'bg-lime-900/50 border border-lime-500/50 grayscale-0 scale-105 shadow-[0_0_10px_rgba(132,204,22,0.3)]' 
                                : 'bg-stone-950 border border-stone-800 grayscale opacity-50 hover:opacity-80'}
                        `}
                    >
                        {item.icon}
                    </button>
                ))}
            </div>
        </div>

        {/* Weekly Bonuses */}
        <div className="space-y-2">
            <h3 className="text-xs font-bold text-stone-500 px-1">Bonus Semanales (Click para activar/deshacer)</h3>
            <div className="grid grid-cols-3 gap-3">
                <button 
                    onClick={() => handleBonus('organs', 3)}
                    className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                        weeklyBonuses.organs 
                            ? 'bg-stone-900/50 border-stone-800 text-stone-600 line-through hover:text-stone-400' 
                            : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-lime-600 hover:text-lime-500'
                    }`}
                >
                    <span>🥩</span>
                    <span className="text-[10px]">Órganos</span>
                    <span className="text-[10px] font-mono">+3</span>
                </button>
                <button 
                    onClick={() => handleBonus('legumes', 3)}
                    className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                        weeklyBonuses.legumes 
                            ? 'bg-stone-900/50 border-stone-800 text-stone-600 line-through hover:text-stone-400' 
                            : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-lime-600 hover:text-lime-500'
                    }`}
                >
                    <span>🫘</span>
                    <span className="text-[10px]">Legumbres</span>
                    <span className="text-[10px] font-mono">+3</span>
                </button>
                <button 
                    onClick={() => handleBonus('fast24', 4)}
                    className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                        weeklyBonuses.fast24 
                            ? 'bg-stone-900/50 border-stone-800 text-stone-600 line-through hover:text-stone-400' 
                            : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-lime-600 hover:text-lime-500'
                    }`}
                >
                    <span>🌑</span>
                    <span className="text-[10px]">24h</span>
                    <span className="text-[10px] font-mono">+4</span>
                </button>
            </div>
        </div>

        {/* Board Visualization - Snake Layout */}
        <div className="bg-stone-900 p-4 rounded-2xl shadow-sm border border-lime-900/50">
            <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }).map((_, rowIndex) => {
                    const rowSquares = squares.slice(rowIndex * 5, (rowIndex + 1) * 5);
                    const isReversed = rowIndex % 2 !== 0;
                    const displaySquares = isReversed ? [...rowSquares].reverse() : rowSquares;

                    return displaySquares.map(num => (
                        <div 
                            key={num}
                            className={`
                                aspect-square rounded-lg flex items-center justify-center text-xs font-bold relative transition-all duration-300
                                ${num === score 
                                    ? 'bg-lime-500 text-stone-900 shadow-[0_0_15px_rgba(132,204,22,0.5)] scale-110 z-10 ring-2 ring-lime-400' 
                                    : num < score 
                                        ? 'bg-lime-900/20 text-lime-700' 
                                        : getSquareColor(num)}
                            `}
                        >
                            {num}
                            {num === 50 && <span className="absolute -top-1 -right-1 text-xs">🏁</span>}
                        </div>
                    ));
                })}
            </div>
        </div>

      </div>
    </div>
  );
};