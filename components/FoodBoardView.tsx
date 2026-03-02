import React, { useState } from 'react';
import { FoodState, FoodWheel, FoodBonuses } from '../types';
import { ArrowLeft, ChefHat, Timer, Bike, RotateCcw, Snowflake, Flame, Trophy, Award, Medal, Star, Gem, Check } from 'lucide-react';

interface FoodBoardViewProps {
  foodState: FoodState;
  onUpdate: (state: FoodState) => void;
  onBack: () => void;
}

export const FoodBoardView: React.FC<FoodBoardViewProps> = ({ foodState, onUpdate, onBack }) => {
  const { score, history, wheel, weeklyBonuses, dishes = {} } = foodState;
  const [showWheelConfirm, setShowWheelConfirm] = useState(false);
  const [lastToggledItem, setLastToggledItem] = useState<keyof FoodWheel | null>(null);

  const addHistory = (action: string, delta: number) => {
      return [
        { action, timestamp: Date.now(), delta },
        ...history
      ].slice(0, 50);
  };

  const updateScore = (delta: number) => {
      return Math.max(0, Math.min(50, score + delta));
  };

  const handleAction = (type: 'cook' | 'fast' | 'delivery' | 'fah' | 'fridge' | 'ritual') => {
    let delta = 0;
    let label = '';
    
    if (type === 'cook') { delta = 1; label = 'Comida'; }
    else if (type === 'fast') { delta = 2; label = 'Ayuno'; }
    else if (type === 'delivery') { delta = -2; label = 'Domicilio'; }
    else if (type === 'fah') { delta = -1; label = 'FAH'; }
    else if (type === 'fridge') { delta = -1; label = 'Nevera'; }
    else if (type === 'ritual') { delta = 1; label = 'Ritual'; }

    onUpdate({
      ...foodState,
      score: updateScore(delta),
      history: addHistory(label, delta)
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

  const getDishCount = (baseName: string, max: number) => {
      let count = 0;
      for (let i = 0; i < max; i++) {
          const key = baseName + ' '.repeat(i);
          if (dishes[key]) count++;
      }
      return count;
  };

  const incrementDish = (baseName: string, max: number) => {
      let count = getDishCount(baseName, max);
      if (count < max) {
          const key = baseName + ' '.repeat(count);
          onUpdate({
              ...foodState,
              dishes: {
                  ...dishes,
                  [key]: true
              }
          });
      }
  };

  const decrementDish = (baseName: string, max: number) => {
      let count = getDishCount(baseName, max);
      if (count > 0) {
          const key = baseName + ' '.repeat(count - 1);
          onUpdate({
              ...foodState,
              dishes: {
                  ...dishes,
                  [key]: false
              }
          });
      }
  };

  const toggleWheelItem = (item: keyof FoodWheel) => {
      const isChecking = !wheel[item];
      const newWheel = { ...wheel, [item]: isChecking };
      const allChecked = Object.values(newWheel).every(val => val === true);

      if (allChecked && isChecking) {
          setLastToggledItem(item);
          onUpdate({ ...foodState, wheel: newWheel });
          setShowWheelConfirm(true);
      } else {
          onUpdate({ ...foodState, wheel: newWheel });
          setLastToggledItem(null);
      }
  };

  const confirmWheelPleno = () => {
      onUpdate({
          ...foodState,
          score: updateScore(3),
          wheel: { lemon: false, nuts: false, dairy: false, coffee: false, spices: false, supplements: false },
          history: addHistory('Rueda Completa', 3)
      });
      setShowWheelConfirm(false);
      setLastToggledItem(null);
  };

  const cancelWheelPleno = () => {
      if (lastToggledItem) {
          const revertedWheel = { ...wheel, [lastToggledItem]: false };
          onUpdate({ ...foodState, wheel: revertedWheel });
      }
      setShowWheelConfirm(false);
      setLastToggledItem(null);
  };

  const resetGame = () => {
      if(window.confirm("¿Reiniciar tu progreso de comida? (Esto reseteará la puntuación a 0)")) {
          onUpdate({ 
              ...foodState, 
              score: 0, 
              weeklyBonuses: { organs: false, legumes: false, fast24: false },
              dishes: {},
              history: [] 
          });
      }
  }

  const getScoreColor = () => {
      if (score === 50) return 'text-yellow-400 drop-shadow-[0_0_12px_rgba(234,179,8,0.9)] animate-pulse font-black';
      if ([25, 35, 42, 45].includes(score)) return 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] font-black';
      if (score >= 25) return 'text-yellow-500/80 font-bold';
      if (score > 10) return 'text-lime-500 font-bold';
      return 'text-red-500 font-bold';
  };

  const milestones = [
      { val: 25, label: 'Brote', icon: Award },
      { val: 35, label: 'Raíz', icon: Medal },
      { val: 42, label: 'Tronco', icon: Star },
      { val: 45, label: 'Copa', icon: Trophy },
      { val: 50, label: 'Fruto', icon: Gem }
  ];

  const mealChecklist = [
    { name: "Huevos cocidos", icon: "🥚", max: 3 },
    { name: "Huevos fritos", icon: "🥚", max: 2 },
    { name: "Tortilla", icon: "🥚", max: 3 },
    { name: "Huevos revueltos", icon: "🥚", max: 2 },
    { name: "Merluza", icon: "🐟", max: 2 },
    { name: "Salmón", icon: "🐟", max: 1 },
    { name: "Bacalao", icon: "🐟", max: 1 },
    { name: "Atún", icon: "🐟", max: 1 },
    { name: "Pescado", icon: "🐟", max: 3 },
    { name: "Marisco", icon: "🐟", max: 2 },
    { name: "Trucha", icon: "🐟", max: 2 },
    { name: "Ternera", icon: "🥩", max: 1 },
    { name: "Cerdo", icon: "🥩", max: 2 },
    { name: "Pollo", icon: "🥩", max: 2 },
    { name: "Pavo", icon: "🥩", max: 2 },
    { name: "Carnes", icon: "🥩", max: 4 },
    { name: "Órganos", icon: "🥩", max: 2 },
    { name: "Conejo", icon: "🥩", max: 1 },
    { name: "Pasta", icon: "🍲", max: 1 },
    { name: "Arroz", icon: "🍲", max: 1 },
    { name: "Lentejas", icon: "🍲", max: 2 },
    { name: "Garbanzos", icon: "🍲", max: 3 },
    { name: "Alubias", icon: "🍲", max: 2 }
  ];

  return (
    <div className="flex flex-col h-full bg-stone-950">
      <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between sticky top-0 z-10 border-b border-stone-800">
        <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full">
                <ArrowLeft className="w-6 h-6 text-lime-500" />
            </button>
            <h1 className="text-xl font-bold text-lime-200 uppercase tracking-tighter">Jumangiare</h1>
        </div>
        <button onClick={resetGame} className="text-xs text-lime-400/50 hover:text-lime-300 flex items-center gap-1 transition-colors">
            <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-20 no-scrollbar">
        
        {/* Main Counter */}
        <div className="flex flex-col items-center justify-center py-6">
            <div className={`text-7xl transition-all duration-300 ${getScoreColor()}`}>
                {score}
            </div>
            <div className="text-[10px] text-stone-500 uppercase tracking-[0.2em] mt-2 font-bold">Puntuación de Supervivencia</div>
        </div>

        {/* Medals / Milestones Section */}
        <div className="bg-stone-900/40 rounded-3xl p-6 border border-stone-800/50">
            <h3 className="text-[10px] font-black text-stone-600 uppercase tracking-widest text-center mb-6">Hitos del Superviviente</h3>
            <div className="flex justify-between items-start gap-1">
                {milestones.map((m) => {
                    const isAchieved = score >= m.val;
                    const Icon = m.icon;
                    return (
                        <div key={m.val} className="flex flex-col items-center gap-2 flex-1">
                            <div className={`
                                w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500
                                ${isAchieved 
                                    ? 'bg-yellow-600/20 border-yellow-500 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] scale-110' 
                                    : 'bg-stone-900 border-stone-800 text-stone-700 opacity-40 grayscale'}
                            `}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <span className={`text-[9px] font-black tracking-tighter transition-colors ${isAchieved ? 'text-yellow-500' : 'text-stone-700'}`}>
                                {m.val}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Action Buttons Grid - Single row (6 columns) */}
        <div className="grid grid-cols-6 gap-2">
            <button onClick={() => handleAction('cook')} className="bg-stone-900 py-4 px-2 rounded-xl border border-stone-800 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all group">
                <ChefHat className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black text-emerald-600/80">+1</span>
            </button>
            <button onClick={() => handleAction('fast')} className="bg-stone-900 py-4 px-2 rounded-xl border border-stone-800 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all group">
                <Timer className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black text-blue-600/80">+2</span>
            </button>
            <button onClick={() => handleAction('ritual')} className="bg-stone-900 py-4 px-2 rounded-xl border border-stone-800 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all group">
                <Flame className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black text-orange-600/80">+1</span>
            </button>
            <button onClick={() => handleAction('fridge')} className="bg-stone-900 py-4 px-2 rounded-xl border border-stone-800 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all group">
                <Snowflake className="w-5 h-5 text-cyan-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black text-cyan-600/80">-1</span>
            </button>
            <button onClick={() => handleAction('fah')} className="bg-stone-900 py-4 px-2 rounded-xl border border-stone-800 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all group">
                <span className="text-lg group-hover:scale-110 transition-transform">🍰</span>
                <span className="text-[10px] font-black text-orange-600/80">-1</span>
            </button>
            <button onClick={() => handleAction('delivery')} className="bg-stone-900 py-4 px-2 rounded-xl border border-stone-800 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all group">
                <Bike className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black text-red-600/80">-2</span>
            </button>
        </div>

        {/* Rueda Section */}
        <div className="bg-stone-900 p-6 rounded-3xl border border-stone-800">
            <h3 className="text-[10px] font-black text-stone-500 mb-4 text-center uppercase tracking-widest">Esenciales Diarios (+3)</h3>
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
                            aspect-square rounded-xl flex items-center justify-center text-xl transition-all duration-300
                            ${wheel[item.key as keyof FoodWheel] 
                                ? 'bg-lime-600/20 border border-lime-500 shadow-[0_0_10px_rgba(132,204,22,0.2)] grayscale-0 scale-105' 
                                : 'bg-stone-950 border border-stone-800 grayscale opacity-40'}
                        `}
                    >
                        {item.icon}
                    </button>
                ))}
            </div>
        </div>

        {/* Weekly Bonuses Section */}
        <div className="space-y-3">
            <h3 className="text-[10px] font-black text-stone-600 uppercase tracking-widest px-1">Retos de Temporada</h3>
            <div className="grid grid-cols-3 gap-3">
                <button 
                    onClick={() => handleBonus('organs', 3)}
                    className={`p-4 rounded-2xl border text-sm font-bold flex flex-col items-center gap-1 transition-all ${
                        weeklyBonuses.organs 
                            ? 'bg-emerald-600 border-emerald-500 text-stone-950 shadow-lg' 
                            : 'bg-stone-900 border-stone-800 text-stone-400 opacity-60'
                    }`}
                >
                    <span className="text-xl">🥩</span>
                    <span className="text-[10px] font-black">ÓRGANOS</span>
                </button>
                <button 
                    onClick={() => handleBonus('legumes', 3)}
                    className={`p-4 rounded-2xl border text-sm font-bold flex flex-col items-center gap-1 transition-all ${
                        weeklyBonuses.legumes 
                            ? 'bg-emerald-600 border-emerald-500 text-stone-950 shadow-lg' 
                            : 'bg-stone-900 border-stone-800 text-stone-400 opacity-60'
                    }`}
                >
                    <span className="text-xl">🫘</span>
                    <span className="text-[10px] font-black">LEGUMBRES</span>
                </button>
                <button 
                    onClick={() => handleBonus('fast24', 4)}
                    className={`p-4 rounded-2xl border text-sm font-bold flex flex-col items-center gap-1 transition-all ${
                        weeklyBonuses.fast24 
                            ? 'bg-emerald-600 border-emerald-500 text-stone-950 shadow-lg' 
                            : 'bg-stone-900 border-stone-800 text-stone-400 opacity-60'
                    }`}
                >
                    <span className="text-xl">🌑</span>
                    <span className="text-[10px] font-black">AYUNO 24h</span>
                </button>
            </div>
        </div>

        {/* Meal Checklist (Platos Cocinados) - New Section */}
        <div className="space-y-4 pt-4 border-t border-stone-800">
            <h3 className="text-[10px] font-black text-stone-600 uppercase tracking-widest px-1">Menú del Superviviente</h3>
            <div className="bg-stone-900/60 rounded-3xl overflow-hidden border border-stone-800">
                {[...mealChecklist].sort((a, b) => {
                    const aCount = getDishCount(a.name, a.max);
                    const bCount = getDishCount(b.name, b.max);
                    
                    const getStatus = (count: number, max: number) => {
                        if (count === 0) return 0; // Unstarted (top)
                        if (count === max) return 2; // Full (bottom)
                        return 1; // Partial (middle)
                    };

                    const aStatus = getStatus(aCount, a.max);
                    const bStatus = getStatus(bCount, b.max);

                    return aStatus - bStatus;
                }).map((meal, index) => {
                    const count = getDishCount(meal.name, meal.max);
                    const isFull = count === meal.max;
                    const hasAny = count > 0;
                    return (
                        <div
                            key={`${meal.name}-${index}`}
                            className={`
                                w-full flex items-center justify-between p-3 border-b border-stone-800/50 last:border-0 transition-all
                                ${isFull ? 'bg-lime-900/20' : hasAny ? 'bg-yellow-900/20' : ''}
                            `}
                        >
                            <button 
                                onClick={() => decrementDish(meal.name, meal.max)}
                                disabled={count === 0}
                                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent text-stone-300 transition-colors bg-stone-950 border border-stone-800"
                            >
                                -
                            </button>
                            
                            <div className="flex-1 flex items-center gap-3 px-4">
                                <span className="text-2xl">{meal.icon}</span>
                                <span className={`text-sm font-bold tracking-tight transition-colors ${isFull ? 'text-lime-400' : hasAny ? 'text-yellow-400' : 'text-stone-300'}`}>
                                    {meal.name}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold ${isFull ? 'text-lime-500' : hasAny ? 'text-yellow-500' : 'text-stone-500'}`}>
                                    {count} de {meal.max}
                                </span>
                                <button 
                                    onClick={() => incrementDish(meal.name, meal.max)}
                                    disabled={isFull}
                                    className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors bg-stone-950 border border-stone-800 ${isFull ? 'text-lime-500' : hasAny ? 'text-yellow-500' : 'text-lime-500'}`}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

      </div>

      {/* Confirmation Modal */}
      {showWheelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-stone-900 w-full max-w-sm rounded-3xl shadow-2xl border border-stone-800 overflow-hidden">
                <div className="p-8 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-lime-600/20 rounded-full flex items-center justify-center mb-6 border border-lime-500/50 shadow-[0_0_20px_rgba(132,204,22,0.2)]">
                        <Trophy className="w-10 h-10 text-lime-500" />
                    </div>
                    <h2 className="text-2xl font-black text-stone-100 mb-2 uppercase tracking-tighter italic">¡Frenesí Gastronómico!</h2>
                    <p className="text-stone-400 mb-8 text-sm leading-relaxed">
                        Has dominado los esenciales del día. <br/>¿Reclamas los **+3 puntos** de supervivencia?
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button 
                            onClick={cancelWheelPleno}
                            className="py-4 rounded-2xl border border-stone-800 text-stone-500 hover:bg-stone-800 font-bold transition-all text-sm uppercase"
                        >
                            Error
                        </button>
                        <button 
                            onClick={confirmWheelPleno}
                            className="py-4 rounded-2xl bg-lime-600 text-stone-950 font-black hover:bg-lime-500 transition-all shadow-lg shadow-lime-900/20 text-sm uppercase"
                        >
                            ¡Cosechar!
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};