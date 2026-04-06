import React, { useState, useEffect } from 'react';
import { FoodState, FoodWheel, FoodBonuses, DailyFoodScore, FoodConfig } from '../types';
import { ArrowLeft, ArrowRight, History, UtensilsCrossed, Timer, Bike, RotateCcw, Snowflake, Flame, Trophy, Award, Medal, Star, Gem, Check, X, Plus, Minus, Settings } from 'lucide-react';
import { FoodConfigEditor } from './FoodConfigEditor';
import { useModalHistory } from '../hooks/useModalHistory';

const DEFAULT_WHEEL = [
  { id: 'lemon', icon: '🍋' },
  { id: 'nuts', icon: '🥜' },
  { id: 'dairy', icon: '🧀' },
  { id: 'coffee', icon: '☕' },
  { id: 'spices', icon: '🌶️' },
  { id: 'supplements', icon: '💊' }
];

const DEFAULT_BROCCOLI = [
  { id: '0', icon: '🎵' },
  { id: '1', icon: '🧹' },
  { id: '2', icon: '🔲' },
  { id: '3', icon: '💪' },
  { id: '4', icon: '🍽️⏱️' },
  { id: '5', icon: '🍳' },
  { id: '6', icon: '🕺' },
  { id: '7', icon: '🍽️✨' },
  { id: '8', icon: '🧹' },
  { id: '9', icon: '🔲' },
];

const DEFAULT_BONUSES = [
  { id: 'organs', icon: '🥩', label: 'ÓRGANOS', points: 3 },
  { id: 'legumes', icon: '🫘', label: 'LEGUMBRES', points: 3 },
  { id: 'fast24', icon: '🌑', label: 'AYUNO 24H', points: 4 }
];

const DEFAULT_MEALS = [
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

const defaultDailyScore: DailyFoodScore = {
  lunch: false,
  dinner: false,
  fasting: false,
  deliveryLunch: false,
  deliveryDinner: false,
  fahCount: 0,
  fridgeCount: 0
};

export const getDailyFridgePenalty = (dateStr: string, allScores: Record<string, DailyFoodScore>) => {
  const sortedDates = Object.keys(allScores).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  let cumulative = 0;
  for (const d of sortedDates) {
    const prevCumulative = cumulative;
    cumulative += allScores[d].fridgeCount || 0;
    if (d === dateStr) {
      return Math.floor(cumulative / 20) - Math.floor(prevCumulative / 20);
    }
  }
  return 0;
};

export const calculateDailyScore = (score: DailyFoodScore, dateStr: string, allScores: Record<string, DailyFoodScore>) => {
  let total = 0;
  if (score.lunch) total += 1;
  if (score.dinner) total += 1;
  if (score.fasting) total += 2;
  if (score.deliveryLunch) total -= 2;
  if (score.deliveryDinner) total -= 2;
  if (score.fahCount > 1) total -= (score.fahCount - 1);
  
  const allScoresWithCurrent = { ...allScores, [dateStr]: score };
  total -= getDailyFridgePenalty(dateStr, allScoresWithCurrent);
  
  return total;
};

export const calculateAllDaysTotal = (allScores: Record<string, DailyFoodScore>) => {
  let total = 0;
  let totalFridge = 0;
  for (const score of Object.values(allScores)) {
    if (score.lunch) total += 1;
    if (score.dinner) total += 1;
    if (score.fasting) total += 2;
    if (score.deliveryLunch) total -= 2;
    if (score.deliveryDinner) total -= 2;
    if (score.fahCount > 1) total -= (score.fahCount - 1);
    totalFridge += (score.fridgeCount || 0);
  }
  total -= Math.floor(totalFridge / 20);
  return total;
};

const DailyFoodScoreModal = ({ 
  date, 
  initialScore, 
  allScores,
  meals,
  dishes,
  onSave, 
  onClose 
}: { 
  date: Date, 
  initialScore: DailyFoodScore, 
  allScores: Record<string, DailyFoodScore>,
  meals: { name: string; icon: string; max: number }[],
  dishes: Record<string, boolean>,
  onSave: (score: DailyFoodScore) => void, 
  onClose: () => void 
}) => {
  const [score, setScore] = useState<DailyFoodScore>(initialScore);
  const [selectingMealFor, setSelectingMealFor] = useState<'lunch' | 'dinner' | null>(null);

  // --- MOBILE BACK BUTTON SUPPORT ---
  useModalHistory(true, onClose, 'dailyFoodScore');
  useModalHistory(!!selectingMealFor, () => setSelectingMealFor(null), `selecting-${selectingMealFor}`);
  // ----------------------------------

  const toggle = (field: keyof DailyFoodScore) => {
    setScore(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleLunchClick = () => {
    if (score.lunch) {
      setScore(prev => ({ ...prev, lunch: false, lunchMeal: undefined }));
    } else {
      setSelectingMealFor('lunch');
    }
  };

  const handleDinnerClick = () => {
    if (score.dinner) {
      setScore(prev => ({ ...prev, dinner: false, dinnerMeal: undefined }));
    } else {
      setSelectingMealFor('dinner');
    }
  };

  const getDishCountLocal = (baseName: string, max: number) => {
      let count = 0;
      for (let i = 0; i < max; i++) {
          const key = baseName + ' '.repeat(i);
          if (dishes[key]) count++;
      }
      return count;
  };

  const canSelectMeal = (mealName: string, max: number) => {
    let effectiveCount = getDishCountLocal(mealName, max);
    if (initialScore.lunchMeal === mealName) effectiveCount--;
    if (initialScore.dinnerMeal === mealName) effectiveCount--;
    
    if (selectingMealFor === 'lunch') {
      if (score.dinnerMeal === mealName) effectiveCount++;
    } else if (selectingMealFor === 'dinner') {
      if (score.lunchMeal === mealName) effectiveCount++;
    }
    
    return effectiveCount < max;
  };

  const handleMealSelect = (mealName: string) => {
    if (selectingMealFor === 'lunch') {
      setScore(prev => ({ ...prev, lunch: true, lunchMeal: mealName }));
    } else if (selectingMealFor === 'dinner') {
      setScore(prev => ({ ...prev, dinner: true, dinnerMeal: mealName }));
    }
    setSelectingMealFor(null);
  };

  const increment = (field: 'fahCount' | 'fridgeCount') => {
    setScore(prev => ({ ...prev, [field]: prev[field] + 1 }));
  };

  const decrement = (field: 'fahCount' | 'fridgeCount') => {
    setScore(prev => ({ ...prev, [field]: Math.max(0, prev[field] - 1) }));
  };

  const dateStr = date.toDateString();
  const total = calculateDailyScore(score, dateStr, allScores);

  return (
    <div 
      className="fixed inset-0 z-[100] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => {
        if (selectingMealFor) {
          setSelectingMealFor(null);
        } else {
          onClose();
        }
      }}
    >
      <div 
        className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/50 shrink-0">
          <h2 className="text-lg font-bold text-stone-200">
            {selectingMealFor ? (selectingMealFor === 'lunch' ? 'Elegir Almuerzo' : 'Elegir Cena') : date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          {selectingMealFor && (
            <button onClick={() => setSelectingMealFor(null)} className="p-2 rounded-full hover:bg-stone-800 text-stone-400 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {selectingMealFor ? (
            <div className="grid grid-cols-2 gap-3">
              {meals.map(meal => {
                const canSelect = canSelectMeal(meal.name, meal.max);
                return (
                  <button
                    key={meal.name}
                    disabled={!canSelect}
                    onClick={() => handleMealSelect(meal.name)}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left
                      ${canSelect 
                        ? 'bg-stone-950 border-stone-800 hover:bg-stone-800 text-stone-300' 
                        : 'bg-stone-950/50 border-stone-900 text-stone-600 opacity-50 cursor-not-allowed'}`}
                  >
                    <span className="text-2xl">{meal.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{meal.name}</span>
                      <span className="text-[10px] text-stone-500">
                        {canSelect ? 'Disponible' : 'Agotado'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              {/* 5 Action Buttons Row */}
              <div className="grid grid-cols-5 gap-2">
                <button onClick={handleLunchClick} className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${score.lunch ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-stone-950 border-stone-800 text-stone-500'}`}>
                  {score.lunchMeal ? (
                    <span className="text-xl leading-none">{meals.find(m => m.name === score.lunchMeal)?.icon || '🍽️'}</span>
                  ) : (
                    <UtensilsCrossed className="w-5 h-5" />
                  )}
                  <span className="text-[10px] font-black">+1</span>
                </button>
                <button onClick={handleDinnerClick} className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${score.dinner ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-stone-950 border-stone-800 text-stone-500'}`}>
                  {score.dinnerMeal ? (
                    <span className="text-xl leading-none">{meals.find(m => m.name === score.dinnerMeal)?.icon || '🍽️'}</span>
                  ) : (
                    <UtensilsCrossed className="w-5 h-5" />
                  )}
                  <span className="text-[10px] font-black">+1</span>
                </button>
                <button onClick={() => toggle('fasting')} className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${score.fasting ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-stone-950 border-stone-800 text-stone-500'}`}>
                  <Timer className="w-5 h-5" />
                  <span className="text-[10px] font-black">+2</span>
                </button>
                <button onClick={() => toggle('deliveryLunch')} className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${score.deliveryLunch ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-stone-950 border-stone-800 text-stone-500'}`}>
                  <Bike className="w-5 h-5" />
                  <span className="text-[10px] font-black">-2</span>
                </button>
                <button onClick={() => toggle('deliveryDinner')} className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${score.deliveryDinner ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-stone-950 border-stone-800 text-stone-500'}`}>
                  <Bike className="w-5 h-5" />
                  <span className="text-[10px] font-black">-2</span>
                </button>
              </div>

              {/* Selected Meals Info & Calories */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 flex flex-col justify-center min-h-[3rem]">
                  {score.lunchMeal && (
                    <span className="text-emerald-400 font-bold text-sm truncate">{score.lunchMeal}</span>
                  )}
                  {score.dinnerMeal && (
                    <span className="text-emerald-400 font-bold text-sm truncate">{score.dinnerMeal}</span>
                  )}
                  {!score.lunchMeal && !score.dinnerMeal && (
                    <span className="text-stone-700 font-bold text-xs italic">Sin platos</span>
                  )}
                </div>
                <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 flex items-center gap-2">
                  <input
                    type="number"
                    step="50"
                    placeholder="kcal del día"
                    value={score.calories || ''}
                    onChange={(e) => setScore(prev => ({ ...prev, calories: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
                    className="w-full bg-transparent text-stone-300 font-bold text-right outline-none placeholder:text-stone-700"
                  />
                  <span className="text-stone-500 font-bold text-sm">kcal</span>
                </div>
              </div>

              {/* Counters */}
              <div className="space-y-2">
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CakeSliceOff className="w-5 h-5 text-orange-500" />
                <span className="text-[10px] font-black text-orange-600/80">-1</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => decrement('fahCount')} className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-stone-300 hover:bg-stone-700">
                  <Minus className="w-4 h-4" />
                </button>
                <span className={`text-lg font-black w-6 text-center ${score.fahCount >= 2 ? 'text-red-500' : 'text-orange-400'}`}>
                  {score.fahCount}
                </span>
                <button onClick={() => increment('fahCount')} className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-stone-300 hover:bg-stone-700">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Snowflake className="w-5 h-5 text-cyan-500" />
                <span className="text-[10px] font-black text-cyan-600/80">-1/20</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => decrement('fridgeCount')} className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-stone-300 hover:bg-stone-700">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-lg font-black text-cyan-400 w-6 text-center">{score.fridgeCount}</span>
                <button onClick={() => increment('fridgeCount')} className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-stone-300 hover:bg-stone-700">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          </>
        )}
        </div>

        {!selectingMealFor && (
          <div className="p-4 border-t border-stone-800 bg-stone-900/50 flex items-center justify-between shrink-0">
            <div className="flex flex-col">
              <span className="text-xs text-stone-500 font-bold uppercase">Total del día</span>
              <span className={`text-2xl font-black ${total > 0 ? 'text-lime-500' : total < 0 ? 'text-red-500' : 'text-stone-400'}`}>
                {total > 0 ? `+${total}` : total}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={onClose}
                className="bg-stone-800 hover:bg-stone-700 text-stone-300 p-3 rounded-xl font-bold transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
              <button 
                onClick={() => onSave(score)}
                className="bg-lime-500 hover:bg-lime-400 text-stone-950 px-6 py-3 rounded-xl font-bold transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CakeSliceOff = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 13H3" />
    <path d="M16 17H3" />
    <path d="m7.2 7.9-3.388 2.5A2 2 0 0 0 3 12.01V20a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-8.654c0-2-2.44-6.026-6.44-8.026a1 1 0 0 0-1.082.057L10.4 5.6" />
    <circle cx="9" cy="7" r="2" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

const FoodHistoryModal = ({
    dailyScores,
    weeklyExtras,
    onClose
}: {
    dailyScores: Record<string, DailyFoodScore>;
    weeklyExtras?: Record<string, number>;
    onClose: () => void;
}) => {
    // Generate a list of the last 12 weeks
    const weeks = [];
    const now = new Date();
    for (let i = 0; i > -12; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() + (i * 7));
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        
        let daysSum = 0;
        for (let j = 0; j < 7; j++) {
            const currentDay = new Date(monday);
            currentDay.setDate(monday.getDate() + j);
            const dateStr = currentDay.toDateString();
            const score = dailyScores[dateStr] || defaultDailyScore;
            daysSum += calculateDailyScore(score, dateStr, dailyScores);
        }
        
        const mondayStr = monday.toISOString().split('T')[0];
        const extras = weeklyExtras?.[mondayStr] || 0;
        
        // Skip entirely empty weeks
        if (daysSum === 0 && extras === 0 && i < 0) continue;

        weeks.push({
            label: `Sem. ${monday.getDate()} ${monday.toLocaleDateString('es-ES', { month: 'short' })}`,
            daysSum,
            extras,
            total: daysSum + extras
        });
    }

    return (
        <div className="fixed inset-0 z-[100] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/50 shrink-0">
                    <h2 className="text-lg font-bold text-stone-200">Histórico Puntos</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-800 text-stone-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    {weeks.length === 0 ? (
                        <p className="text-stone-500 text-center py-4 text-sm">No hay datos pasados</p>
                    ) : (
                        weeks.map((week, idx) => (
                            <div key={idx} className="bg-stone-950 border border-stone-800 rounded-2xl p-4 flex justify-between items-center transition-all hover:bg-stone-900">
                                <span className="font-bold text-stone-300 text-sm">{week.label}</span>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`text-2xl font-black ${week.total > 0 ? "text-lime-500" : week.total < 0 ? "text-red-500" : "text-stone-500"}`}>
                                        {week.total}
                                    </span>
                                    <div className="flex items-center gap-2 text-[10px] text-stone-500 font-bold capitalize">
                                        <span>Días: <span className={week.daysSum > 0 ? "text-lime-400" : "text-stone-400"}>{week.daysSum > 0 ? `+${week.daysSum}` : week.daysSum}</span></span>
                                        <span>•</span>
                                        <span>Extra: <span className={week.extras > 0 ? "text-lime-400" : "text-stone-400"}>{week.extras > 0 ? `+${week.extras}` : week.extras}</span></span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

interface FoodBoardViewProps {
  foodState: FoodState;
  onUpdate: (state: FoodState) => void;
  onBack: () => void;
}

export const FoodBoardView: React.FC<FoodBoardViewProps> = ({ foodState, onUpdate, onBack }) => {
  const { score, history, wheel, weeklyBonuses, dishes = {}, dailyScores = {}, broccoliStep = 0, config } = foodState;
  const [showWheelConfirm, setShowWheelConfirm] = useState(false);
  const [showBroccoliConfirm, setShowBroccoliConfirm] = useState(false);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [lastToggledItem, setLastToggledItem] = useState<keyof FoodWheel | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [weekOffset, setWeekOffset] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const activeConfig = {
    wheel: config?.wheel || DEFAULT_WHEEL,
    broccoli: config?.broccoli || DEFAULT_BROCCOLI,
    bonuses: config?.bonuses || DEFAULT_BONUSES,
    meals: config?.meals || DEFAULT_MEALS,
  };

  const handleBroccoliClick = (index: number) => {
    if (index === currentBroccoli) {
      const nextStep = currentBroccoli + 1;
      if (nextStep === 10) {
        if (weekOffset === 0) onUpdate({ ...foodState, broccoliStep: 10 });
        else onUpdate({ ...foodState, pastBroccoli: { ...foodState.pastBroccoli, [displayedMondayStr]: 10 } });
        setShowBroccoliConfirm(true);
      } else {
        if (weekOffset === 0) onUpdate({ ...foodState, broccoliStep: nextStep });
        else onUpdate({ ...foodState, pastBroccoli: { ...foodState.pastBroccoli, [displayedMondayStr]: nextStep } });
      }
    } else if (index === currentBroccoli - 1) {
      if (weekOffset === 0) onUpdate({ ...foodState, broccoliStep: index });
      else onUpdate({ ...foodState, pastBroccoli: { ...foodState.pastBroccoli, [displayedMondayStr]: index } });
    }
  };

  const currentMondayStr = (() => {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return monday.toISOString().split('T')[0];
  })();

  const confirmBroccoliPleno = () => {
    const currentExtras = foodState.weeklyExtras || {};
    onUpdate({
      ...foodState,
      score: weekOffset === 0 ? updateScore(1) : score,
      weeklyExtras: { ...currentExtras, [displayedMondayStr]: (currentExtras[displayedMondayStr] || 0) + 1 },
      broccoliStep: weekOffset === 0 ? 0 : broccoliStep,
      pastBroccoli: weekOffset === 0 ? foodState.pastBroccoli : { ...foodState.pastBroccoli, [displayedMondayStr]: 0 },
      history: addHistory(weekOffset === 0 ? 'Rutina Brócoli' : 'Retro: Rutina Brócoli', 1)
    });
    setShowBroccoliConfirm(false);
  };

  const cancelBroccoliPleno = () => {
    if (weekOffset === 0) onUpdate({ ...foodState, broccoliStep: 9 });
    else onUpdate({ ...foodState, pastBroccoli: { ...foodState.pastBroccoli, [displayedMondayStr]: 9 } });
    setShowBroccoliConfirm(false);
  };

  const handleSaveConfig = (newConfig: FoodConfig) => {
    onUpdate({ ...foodState, config: newConfig });
    setShowConfigEditor(false);
  };

  const getDaysOfWeek = (offset: number) => {
    const now = new Date();
    now.setDate(now.getDate() + (offset * 7));
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const getWeekMondayStr = (offset: number) => {
    const days = getDaysOfWeek(offset);
    const monday = days[0];
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  };

  const calculateDaysSumForWeek = (offset: number) => {
    const days = getDaysOfWeek(offset);
    let sum = 0;
    for (const day of days) {
      const dateStr = day.toDateString();
      const dayScore = dailyScores[dateStr] || defaultDailyScore;
      sum += calculateDailyScore(dayScore, dateStr, dailyScores);
    }
    return sum;
  };

  const daysOfWeek = getDaysOfWeek(weekOffset);
  const displayedMondayStr = getWeekMondayStr(weekOffset);
  const displayedWeekDaysSum = calculateDaysSumForWeek(weekOffset);
  let displayedWeeklyExtras = foodState.weeklyExtras?.[displayedMondayStr] || 0;
  const currentCalculatedScore = displayedWeekDaysSum + displayedWeeklyExtras;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  let monthlyDeliveryCount = 0;
  for (const [dateStr, rawScore] of Object.entries(dailyScores)) {
      const scoreData = rawScore as DailyFoodScore;
      const d = new Date(dateStr);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          if (scoreData.deliveryLunch) monthlyDeliveryCount++;
          if (scoreData.deliveryDinner) monthlyDeliveryCount++;
      }
  }

  const currentWheel = weekOffset === 0 ? wheel : (foodState.pastWheels?.[displayedMondayStr] || { lemon: false, nuts: false, dairy: false, coffee: false, spices: false, supplements: false });
  const currentBroccoli = weekOffset === 0 ? broccoliStep : (foodState.pastBroccoli?.[displayedMondayStr] || 0);
  const getBonusKey = (id: string) => weekOffset === 0 ? id : `${displayedMondayStr}_${id}`;

  const getEffectiveDishesForDate = (date: Date) => {
      const now = new Date();
      if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
          return dishes;
      }
      
      const targetMonth = date.getMonth();
      const targetYear = date.getFullYear();
      const computedDishes: Record<string, boolean> = {};
      const mealCounts: Record<string, number> = {};
      
      for (const [dateStr, score] of Object.entries(dailyScores)) {
          const s = score as DailyFoodScore;
          const d = new Date(dateStr);
          if (d.getMonth() === targetMonth && d.getFullYear() === targetYear) {
              if (s.lunchMeal) mealCounts[s.lunchMeal] = (mealCounts[s.lunchMeal] || 0) + 1;
              if (s.dinnerMeal) mealCounts[s.dinnerMeal] = (mealCounts[s.dinnerMeal] || 0) + 1;
          }
      }
      
      for (const meal of activeConfig.meals) {
          const count = Math.min(mealCounts[meal.name] || 0, meal.max);
          for (let i = 0; i < count; i++) {
              computedDishes[meal.name + ' '.repeat(i)] = true;
          }
      }
      return computedDishes;
  };

  const handleSaveDailyScore = (date: Date, newDailyScore: DailyFoodScore) => {
    const dateStr = date.toDateString();
    const oldDailyScore = dailyScores[dateStr] || defaultDailyScore;
    const newScores = { ...dailyScores, [dateStr]: newDailyScore };
    
    const oldTotal = calculateAllDaysTotal(dailyScores);
    const newTotal = calculateAllDaysTotal(newScores);
    const diff = newTotal - oldTotal;

    let newDishes = { ...dishes };

    const getDishCountLocal = (baseName: string, max: number, currentDishes: Record<string, boolean>) => {
        let count = 0;
        for (let i = 0; i < max; i++) {
            const key = baseName + ' '.repeat(i);
            if (currentDishes[key]) count++;
        }
        return count;
    };

    const decrementDishLocal = (baseName: string, max: number, currentDishes: Record<string, boolean>) => {
        let count = getDishCountLocal(baseName, max, currentDishes);
        if (count > 0) {
            const key = baseName + ' '.repeat(count - 1);
            currentDishes[key] = false;
        }
    };

    const incrementDishLocal = (baseName: string, max: number, currentDishes: Record<string, boolean>) => {
        let count = getDishCountLocal(baseName, max, currentDishes);
        if (count < max) {
            const key = baseName + ' '.repeat(count);
            currentDishes[key] = true;
        }
    };

    // Only update dishes if the edited date belongs to the current calendar month
    const now = new Date();
    const isCurrentMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

    if (isCurrentMonth) {
        // Handle lunch meal changes
        if (oldDailyScore.lunchMeal && oldDailyScore.lunchMeal !== newDailyScore.lunchMeal) {
            const mealConfig = activeConfig.meals.find(m => m.name === oldDailyScore.lunchMeal);
            if (mealConfig) decrementDishLocal(mealConfig.name, mealConfig.max, newDishes);
        }
        if (newDailyScore.lunchMeal && newDailyScore.lunchMeal !== oldDailyScore.lunchMeal) {
            const mealConfig = activeConfig.meals.find(m => m.name === newDailyScore.lunchMeal);
            if (mealConfig) incrementDishLocal(mealConfig.name, mealConfig.max, newDishes);
        }

        // Handle dinner meal changes
        if (oldDailyScore.dinnerMeal && oldDailyScore.dinnerMeal !== newDailyScore.dinnerMeal) {
            const mealConfig = activeConfig.meals.find(m => m.name === oldDailyScore.dinnerMeal);
            if (mealConfig) decrementDishLocal(mealConfig.name, mealConfig.max, newDishes);
        }
        if (newDailyScore.dinnerMeal && newDailyScore.dinnerMeal !== oldDailyScore.dinnerMeal) {
            const mealConfig = activeConfig.meals.find(m => m.name === newDailyScore.dinnerMeal);
            if (mealConfig) incrementDishLocal(mealConfig.name, mealConfig.max, newDishes);
        }
    }

    const isCurrentWeek = weekOffset === 0;

    onUpdate({
      ...foodState,
      score: isCurrentWeek ? updateScore(diff) : score,
      dailyScores: newScores,
      dishes: newDishes,
      history: diff !== 0 ? addHistory(isCurrentWeek ? `Día: ${date.getDate()}` : `Retro-Día: ${date.getDate()}`, diff) : history
    });
    setSelectedDate(null);
  };

  const addHistory = (action: string, delta: number) => {
      return [
        { action, timestamp: Date.now(), delta },
        ...history
      ].slice(0, 50);
  };

  const updateScore = (delta: number) => {
      return score + delta;
  };

  const handleBonus = (type: keyof FoodBonuses, delta: number) => {
      const key = getBonusKey(type as string);
      const isActive = weeklyBonuses[key];
      const scoreChange = isActive ? -delta : delta;
      
      const currentExtras = foodState.weeklyExtras || {};
      
      onUpdate({
          ...foodState,
          score: weekOffset === 0 ? updateScore(scoreChange) : score,
          weeklyExtras: { ...currentExtras, [displayedMondayStr]: (currentExtras[displayedMondayStr] || 0) + scoreChange },
          weeklyBonuses: { ...weeklyBonuses, [key]: !isActive },
          history: addHistory(isActive ? `Deshacer: ${type}` : (weekOffset === 0 ? `Bonus: ${type}` : `Retro-bonus: ${type}`), scoreChange)
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
      const isChecking = !currentWheel[item];
      const newWheel = { ...currentWheel, [item]: isChecking };
      const allChecked = Object.values(newWheel).every(val => val === true);

      if (allChecked && isChecking) {
          setLastToggledItem(item);
          if (weekOffset === 0) onUpdate({ ...foodState, wheel: newWheel });
          else onUpdate({ ...foodState, pastWheels: { ...foodState.pastWheels, [displayedMondayStr]: newWheel } });
          setShowWheelConfirm(true);
      } else {
          if (weekOffset === 0) onUpdate({ ...foodState, wheel: newWheel });
          else onUpdate({ ...foodState, pastWheels: { ...foodState.pastWheels, [displayedMondayStr]: newWheel } });
          setLastToggledItem(null);
      }
  };

  const confirmWheelPleno = () => {
      const currentExtras = foodState.weeklyExtras || {};
      const emptyWheel = { lemon: false, nuts: false, dairy: false, coffee: false, spices: false, supplements: false };
      onUpdate({
          ...foodState,
          score: weekOffset === 0 ? updateScore(3) : score,
          weeklyExtras: { ...currentExtras, [displayedMondayStr]: (currentExtras[displayedMondayStr] || 0) + 3 },
          wheel: weekOffset === 0 ? emptyWheel : wheel,
          pastWheels: weekOffset === 0 ? foodState.pastWheels : { ...foodState.pastWheels, [displayedMondayStr]: emptyWheel },
          history: addHistory(weekOffset === 0 ? 'Rueda Completa' : 'Retro: Rueda Completa', 3)
      });
      setShowWheelConfirm(false);
      setLastToggledItem(null);
  };

  const cancelWheelPleno = () => {
      if (lastToggledItem) {
          const revertedWheel = { ...currentWheel, [lastToggledItem]: false };
          if (weekOffset === 0) onUpdate({ ...foodState, wheel: revertedWheel });
          else onUpdate({ ...foodState, pastWheels: { ...foodState.pastWheels, [displayedMondayStr]: revertedWheel } });
      }
      setShowWheelConfirm(false);
      setLastToggledItem(null);
  };

  const resetGame = () => {
      if(window.confirm("¿Reiniciar tu progreso de comida? (Esto reseteará la puntuación a 0)")) {
          onUpdate({ 
              ...foodState, 
              score: 0, 
              weeklyExtras: {},
              weeklyBonuses: { organs: false, legumes: false, fast24: false },
              dishes: {},
              history: [] 
          });
      }
  }

  const getScoreColor = (val: number) => {
      if (val >= 50) return 'text-yellow-400 drop-shadow-[0_0_12px_rgba(234,179,8,0.9)] animate-pulse font-black';
      if ([25, 35, 42, 45].includes(val)) return 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] font-black';
      if (val >= 25) return 'text-yellow-500/80 font-bold';
      if (val > 10) return 'text-lime-500 font-bold';
      if (val < 0) return 'text-red-500 font-bold';
      return 'text-lime-500 font-bold';
  };

  const milestones = [
      { val: 25, label: 'Brote', icon: Award },
      { val: 35, label: 'Raíz', icon: Medal },
      { val: 42, label: 'Tronco', icon: Star },
      { val: 45, label: 'Copa', icon: Trophy },
      { val: 50, label: 'Fruto', icon: Gem }
  ];

  return (
    <div className="fixed inset-0 max-w-md mx-auto z-50 bg-stone-950 flex flex-col animate-in fade-in duration-200">
      <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full">
                <ArrowLeft className="w-6 h-6 text-lime-500" />
            </button>
            <h1 className="text-xl font-bold text-lime-200 uppercase tracking-tighter">Jumangiare</h1>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setShowConfigEditor(true)} className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-full transition-colors">
                <Settings className="w-5 h-5" />
            </button>
            <button onClick={resetGame} className="text-xs text-lime-400/50 hover:text-lime-300 flex items-center gap-1 transition-colors p-2">
                <RotateCcw className="w-4 h-4" />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-20 no-scrollbar">
        
        {/* Main Counter */}
        <div className="flex flex-col items-center justify-center py-6">
            {weekOffset < 0 && (
                <div className="text-stone-500 text-xs font-bold tracking-widest uppercase mb-2">
                    Semana del {daysOfWeek[0].getDate()} al {daysOfWeek[6].getDate()}
                </div>
            )}
            <div className="flex items-center gap-6">
                <button 
                    onClick={() => setWeekOffset(prev => prev - 1)} 
                    className="p-3 text-stone-600 hover:text-stone-300 hover:bg-stone-800 rounded-full transition-colors active:scale-90"
                >
                    <ArrowLeft className="w-8 h-8" />
                </button>
                <div className={`text-7xl transition-all duration-300 w-32 tracking-tighter text-center ${getScoreColor(currentCalculatedScore)}`}>
                    {currentCalculatedScore}
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setWeekOffset(prev => prev + 1)} 
                        disabled={weekOffset >= 0}
                        className="p-3 text-stone-600 hover:text-stone-300 hover:bg-stone-800 rounded-full transition-colors active:scale-90 disabled:opacity-20 disabled:hover:bg-transparent"
                    >
                        <ArrowRight className="w-8 h-8" />
                    </button>
                    <button 
                        onClick={() => setShowHistoryModal(true)} 
                        className="p-3 text-stone-500 hover:text-lime-500 hover:bg-stone-800 rounded-full transition-colors active:scale-90"
                        title="Ver histórico de semanas"
                    >
                        <History className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>

        {/* Medals / Milestones Section */}
        <div className="bg-stone-900/40 rounded-3xl p-6 border border-stone-800/50">
            <div className="flex justify-between items-start gap-1">
                {milestones.map((m) => {
                    const isAchieved = currentCalculatedScore >= m.val;
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

        {/* Days of Week Row */}
        <div className="flex justify-between items-center bg-stone-900/40 rounded-2xl p-4 border border-stone-800/50">
          {daysOfWeek.map((date, index) => {
            const dateStr = date.toDateString();
            const dayScore = dailyScores[dateStr] || defaultDailyScore;
            const total = calculateDailyScore(dayScore, dateStr, dailyScores);
            const isToday = date.toDateString() === new Date().toDateString();
            const isFuture = date > new Date() && !isToday;
            const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

            const percentage = Math.min(100, (Math.abs(total) / 4) * 100);
            let conicGradient = '';
            if (total > 0) {
                conicGradient = `conic-gradient(#84cc16 ${percentage}%, transparent 0)`;
            } else if (total < 0) {
                conicGradient = `conic-gradient(transparent ${100 - percentage}%, #ef4444 0)`;
            }

            return (
              <button
                key={dateStr}
                disabled={isFuture}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center gap-2 transition-all ${isFuture ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
              >
                <span className={`text-[10px] font-black ${isToday ? 'text-lime-500' : 'text-stone-500'}`}>
                  {dayNames[index]}
                </span>
                <div className="relative w-10 h-10 rounded-full flex items-center justify-center">
                  {/* Background */}
                  <div className={`absolute inset-0 rounded-full transition-colors
                    ${total > 0 ? 'bg-lime-500/20' : total < 0 ? 'bg-red-500/20' : isToday ? 'bg-stone-800' : 'bg-stone-900'}
                  `} />
                  
                  {/* Circular Progress Ring */}
                  {conicGradient && (
                    <div 
                      className="absolute inset-0 rounded-full" 
                      style={{ 
                        background: conicGradient,
                        WebkitMaskImage: 'radial-gradient(closest-side, transparent 75%, black 76%)',
                        maskImage: 'radial-gradient(closest-side, transparent 75%, black 76%)'
                      }} 
                    />
                  )}
                  
                  {/* Text */}
                  <span className={`relative z-10 text-xs font-bold
                    ${total > 0 ? 'text-lime-400' : total < 0 ? 'text-red-400' : isToday ? 'text-lime-500' : 'text-stone-300'}
                  `}>
                    {total > 0 ? `+${total}` : total}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Rueda Section */}
        <div className="bg-stone-900 p-6 rounded-3xl border border-stone-800">
            <div className="grid grid-cols-6 gap-2">
                {activeConfig.wheel.map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => toggleWheelItem(item.id as keyof FoodWheel)}
                        className={`
                            aspect-square rounded-xl flex items-center justify-center text-xl transition-all duration-300
                            ${currentWheel[item.id as keyof FoodWheel] 
                                ? 'bg-lime-600/20 border border-lime-500 shadow-[0_0_10px_rgba(132,204,22,0.2)] grayscale-0 scale-105' 
                                : 'bg-stone-950 border border-stone-800 grayscale opacity-40'}
                        `}
                    >
                        {item.icon}
                    </button>
                ))}
            </div>
        </div>

        {/* Broccoli Section */}
        <div className="bg-stone-900 p-6 rounded-3xl border border-stone-800">
            <div className="grid grid-cols-5 gap-3">
                {activeConfig.broccoli.map((step, index) => {
                    const isCompleted = index < currentBroccoli;
                    const isNext = index === currentBroccoli;
                    const isLocked = index > currentBroccoli;

                    return (
                        <button 
                            key={step.id}
                            onClick={() => handleBroccoliClick(index)}
                            disabled={isLocked}
                            className={`
                                aspect-square rounded-xl flex items-center justify-center text-xl transition-all duration-300
                                ${isCompleted 
                                    ? 'bg-emerald-600/20 border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)] grayscale-0 scale-105' 
                                    : isNext
                                    ? 'bg-stone-800 border border-stone-600 grayscale-0 animate-pulse'
                                    : 'bg-stone-950 border border-stone-800 grayscale opacity-30 cursor-not-allowed'}
                            `}
                        >
                            {step.icon}
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Weekly Bonuses Section */}
        <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
                {activeConfig.bonuses.map((bonus) => {
                    const isActive = weeklyBonuses[getBonusKey(bonus.id)];
                    return (
                    <button 
                        key={bonus.id}
                        onClick={() => handleBonus(bonus.id, bonus.points)}
                        className={`p-4 rounded-2xl border text-sm font-bold flex flex-col items-center gap-1 transition-all ${
                            isActive 
                                ? 'bg-emerald-600 border-emerald-500 text-stone-950 shadow-lg' 
                                : 'bg-stone-900 border-stone-800 text-stone-400 opacity-60'
                        }`}
                    >
                        <span className="text-xl">{bonus.icon}</span>
                        <span className="text-[10px] font-black">{bonus.label}</span>
                    </button>
                )})}
            </div>
        </div>

        {/* Meal Checklist (Platos Cocinados) - New Section */}
        {weekOffset === 0 && (
        <div className="space-y-4 pt-4 border-t border-stone-800">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Menú del Superviviente</h3>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-red-500/80">
                    <Bike className="w-3.5 h-3.5" />
                    <span>Domicilio: {monthlyDeliveryCount}</span>
                </div>
            </div>
            <div className="bg-stone-900/60 rounded-3xl overflow-hidden border border-stone-800">
                {[...activeConfig.meals].sort((a, b) => {
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
                                ${isFull ? 'bg-emerald-600' : hasAny ? 'bg-yellow-900/20' : ''}
                            `}
                        >
                            <button 
                                onClick={() => decrementDish(meal.name, meal.max)}
                                disabled={count === 0}
                                className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors border ${isFull ? 'bg-emerald-700 border-emerald-500 text-emerald-950 hover:bg-emerald-800' : 'bg-stone-950 border-stone-800 text-stone-300 hover:bg-stone-800'}`}
                            >
                                -
                            </button>
                            
                            <div className="flex-1 flex items-center gap-3 px-4">
                                <span className="text-2xl">{meal.icon}</span>
                                <span className={`text-sm font-bold tracking-tight transition-colors ${isFull ? 'text-stone-950' : hasAny ? 'text-yellow-400' : 'text-stone-300'}`}>
                                    {meal.name}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold ${isFull ? 'text-emerald-950' : hasAny ? 'text-yellow-500' : 'text-stone-500'}`}>
                                    {count} de {meal.max}
                                </span>
                                <button 
                                    onClick={() => incrementDish(meal.name, meal.max)}
                                    disabled={isFull}
                                    className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors border ${isFull ? 'bg-emerald-700 border-emerald-500 text-emerald-950 hover:bg-emerald-800' : 'bg-stone-950 border-stone-800 text-lime-500 hover:bg-stone-800'}`}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
        )}

      </div>

      {/* Confirmation Modal */}
      {showWheelConfirm && (
        <div className="fixed inset-0 max-w-md mx-auto z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
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

      {/* Broccoli Confirmation Modal */}
      {showBroccoliConfirm && (
        <div className="fixed inset-0 max-w-md mx-auto z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-stone-900 w-full max-w-sm rounded-3xl shadow-2xl border border-stone-800 overflow-hidden">
                <div className="p-8 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-emerald-600/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                        <Check className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-black text-stone-100 mb-2 uppercase tracking-tighter italic">¡Rutina Completada!</h2>
                    <p className="text-stone-400 mb-8 text-sm leading-relaxed">
                        Has completado todos los pasos. <br/>¿Reclamas tu **+1 punto**?
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button 
                            onClick={cancelBroccoliPleno}
                            className="py-4 rounded-2xl border border-stone-800 text-stone-500 hover:bg-stone-800 font-bold transition-all text-sm uppercase"
                        >
                            Error
                        </button>
                        <button 
                            onClick={confirmBroccoliPleno}
                            className="py-4 rounded-2xl bg-emerald-600 text-stone-950 font-black hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 text-sm uppercase"
                        >
                            ¡Reclamar!
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {showHistoryModal && (
          <FoodHistoryModal
              dailyScores={dailyScores}
              weeklyExtras={foodState.weeklyExtras}
              onClose={() => setShowHistoryModal(false)}
          />
      )}

      {selectedDate && (
        <DailyFoodScoreModal
          date={selectedDate}
          initialScore={dailyScores[selectedDate.toDateString()] || defaultDailyScore}
          allScores={dailyScores}
          meals={activeConfig.meals}
          dishes={getEffectiveDishesForDate(selectedDate)}
          onSave={(score) => handleSaveDailyScore(selectedDate, score)}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {showConfigEditor && (
        <FoodConfigEditor
          initialConfig={activeConfig}
          onSave={handleSaveConfig}
          onClose={() => setShowConfigEditor(false)}
        />
      )}

    </div>
  );
};