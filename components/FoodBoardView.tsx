import React, { useState, useEffect } from 'react';
import { FoodState, FoodWheel, FoodBonuses, DailyFoodScore, FoodConfig } from '../types';
import { ArrowLeft, ArrowRight, History, UtensilsCrossed, Timer, Bike, Edit2, Flame, Trophy, Award, Medal, Star, Gem, Check, X, Plus, Minus, Settings } from 'lucide-react';
import { FoodConfigEditor } from './FoodConfigEditor';
import { useModalHistory } from '../hooks/useModalHistory';

const DEFAULT_WHEEL = [
  { id: 'drink', icon: '🥤' },
  { id: 'nuts', icon: '🥜' },
  { id: 'dairy', icon: '🥚' },
  { id: 'spices', icon: '🌶️' },
  { id: 'coffee', icon: '☕' }
];

const DEFAULT_BROCCOLI = [
  { id: 'dance', icon: '💃' },
  { id: 'broccoli', icon: '🥦' },
  { id: 'tablecloth', icon: '🪑' },
  { id: 'pushups', icon: '💪' },
  { id: 'dustpan', icon: '🧹' }
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
  fah: [false, false, false, false]
};

export const calculateDailyScore = (score: DailyFoodScore, dateStr: string, allScores: Record<string, DailyFoodScore>) => {
  let total = 0;
  if (score.lunch) total += 1;
  if (score.dinner) total += 1;
  if (score.fasting) total += 2;
  if (score.deliveryLunch) total -= 2;
  if (score.deliveryDinner) total -= 2;
  
  const fahCheckedCount = (score.fah || []).filter(v => v).length;
  if (fahCheckedCount > 1) total -= (fahCheckedCount - 1);
  
  // Clamp between -4 and +4
  return Math.max(-4, Math.min(4, total));
};

export const calculateAllDaysTotal = (allScores: Record<string, DailyFoodScore>, month?: number, year?: number) => {
  let total = 0;
  for (const [dateStr, score] of Object.entries(allScores)) {
    const d = new Date(dateStr);
    if (month !== undefined && year !== undefined) {
      if (d.getMonth() !== month || d.getFullYear() !== year) continue;
    }
    
    let dayTotal = 0;
    if (score.lunch) dayTotal += 1;
    if (score.dinner) dayTotal += 1;
    if (score.fasting) dayTotal += 2;
    if (score.deliveryLunch) dayTotal -= 2;
    if (score.deliveryDinner) dayTotal -= 2;
    
    const fahCheckedCount = (score.fah || []).filter(v => v).length;
    if (fahCheckedCount > 1) dayTotal -= (fahCheckedCount - 1);
    
    // Clamp each day between -4 and +4 before adding to total
    total += Math.max(-4, Math.min(4, dayTotal));
  }
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
    const newScore = { ...score, [field]: !score[field] };
    setScore(newScore);
    onSave(newScore);
  };

  const handleLunchClick = () => {
    if (score.lunch) {
      const newScore = { ...score, lunchMeal: undefined, lunch: false };
      setScore(newScore);
      onSave(newScore);
    } else {
      const hasAvailable = meals.some(m => canSelectMeal(m.name, m.max));
      if (hasAvailable) {
        setSelectingMealFor('lunch');
      } else {
        const newScore = { ...score, lunch: true };
        setScore(newScore);
        onSave(newScore);
      }
    }
  };

  const handleDinnerClick = () => {
    if (score.dinner) {
      const newScore = { ...score, dinnerMeal: undefined, dinner: false };
      setScore(newScore);
      onSave(newScore);
    } else {
      const hasAvailable = meals.some(m => canSelectMeal(m.name, m.max));
      if (hasAvailable) {
        setSelectingMealFor('dinner');
      } else {
        const newScore = { ...score, dinner: true };
        setScore(newScore);
        onSave(newScore);
      }
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
    let newScore = score;
    if (selectingMealFor === 'lunch') {
      newScore = { ...score, lunch: true, lunchMeal: mealName };
    } else if (selectingMealFor === 'dinner') {
      newScore = { ...score, dinner: true, dinnerMeal: mealName };
    }
    setScore(newScore);
    onSave(newScore);
    setSelectingMealFor(null);
  };

  const toggleFah = (index: number) => {
    const currentFah = score.fah || [false, false, false, false];
    const checkedCount = currentFah.filter(v => v).length;
    
    const newFah = [false, false, false, false];
    let newCount = 0;
    
    if (index < checkedCount) {
        // Unmarking: if I click the 2nd (index 1) and 3 are marked, I want to keep only 1 marked?
        // Or if I click the 2nd, I want to keep only the 1st?
        // User said: "si pulso en el segundo... se desmarcan el tercero y el cuarto"
        // This implies clicking index 1 sets count to 1 (only index 0 remains).
        newCount = index;
    } else {
        // Marking: if I click the 4th (index 3), I want all 4 marked.
        newCount = index + 1;
    }
    
    for (let i = 0; i < newCount; i++) newFah[i] = true;
    
    const newScore = { ...score, fah: newFah };
    setScore(newScore);
    onSave(newScore);
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
              {[...meals].sort((a, b) => {
                const aCan = canSelectMeal(a.name, a.max);
                const bCan = canSelectMeal(b.name, b.max);
                if (aCan && !bCan) return -1;
                if (!aCan && bCan) return 1;
                return 0;
              }).map(meal => {
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
                    placeholder="kcal"
                    value={score.calories || ''}
                    onChange={(e) => {
                      const newScore = { ...score, calories: e.target.value ? parseInt(e.target.value, 10) : undefined };
                      setScore(newScore);
                      onSave(newScore);
                    }}
                    className="w-full bg-transparent text-stone-300 font-bold text-right outline-none placeholder:text-stone-700"
                  />
                  <span className="text-stone-500 font-bold text-sm">kcal</span>
                </div>
              </div>

              {/* FAH 4-button grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <CakeSliceOff className="w-4 h-4 text-orange-500" />
                        <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Azúcar / Fritos / Harinas</span>
                    </div>
                    <span className="text-[10px] font-black text-orange-600/80">-{Math.max(0, (score.fah || []).filter(v => v).length - 1)}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map(idx => {
                        const isActive = (score.fah || [])[idx];
                        const isFirst = idx === 0;
                        return (
                            <button
                                key={idx}
                                onClick={() => toggleFah(idx)}
                                className={`aspect-square rounded-xl border flex items-center justify-center transition-all ${
                                    isActive 
                                        ? isFirst
                                            ? 'bg-stone-100/20 border-stone-200 text-stone-100 shadow-[0_0_10px_rgba(255,255,255,0.1)]'
                                            : 'bg-red-600/20 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                                        : 'bg-stone-950 border-stone-800 text-stone-900'
                                }`}
                            >
                                <CakeSliceOff className={`w-5 h-5 ${isActive ? 'opacity-100' : 'opacity-20'}`} />
                            </button>
                        );
                    })}
                </div>
              </div>
          </>
        )}
        </div>

        {!selectingMealFor && (
          <div className="p-4 border-t border-stone-800 bg-stone-900/50 flex items-center justify-center shrink-0">
              <div className="flex flex-col items-center">
                  <span className="text-[10px] text-stone-500 font-black uppercase tracking-[0.2em] mb-1">Total Día</span>
                  <span className={`text-4xl font-black tracking-tighter ${total > 0 ? 'text-lime-500' : total < 0 ? 'text-red-500' : 'text-stone-400'}`}>
                    {total > 0 ? `+${total}` : total}
                  </span>
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

// FoodHistoryModal removed as navigation is now monthly via main view navigation

interface FoodBoardViewProps {
  foodState: FoodState;
  onUpdate: (state: FoodState) => void;
  onBack: () => void;
}

  const CalendarProgressPath = ({ score, color, isLegendary }: { score: number, color: string, isLegendary: boolean }) => {
      const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
      const containerRef = React.useRef<HTMLDivElement>(null);

      useEffect(() => {
          const update = () => {
              if (containerRef.current) {
                  const rect = containerRef.current.getBoundingClientRect();
                  if (rect.width > 0 && (rect.width !== dimensions.w || rect.height !== dimensions.h)) {
                      setDimensions({ w: rect.width, h: rect.height });
                  }
              }
          };
          update();
          const timer = setTimeout(update, 500);
          window.addEventListener('resize', update);
          return () => {
              window.removeEventListener('resize', update);
              clearTimeout(timer);
          };
      }, [dimensions.w, dimensions.h]);

      const { w, h } = dimensions;
      const padding = 5; 
      const rx = 24;
      
      const pathData = w > 0 && h > 0 ? `
          M ${w/2} ${padding}
          L ${w - rx} ${padding}
          A ${rx-padding} ${rx-padding} 0 0 1 ${w - padding} ${rx}
          L ${w - padding} ${h - rx}
          A ${rx-padding} ${rx-padding} 0 0 1 ${w - rx} ${h - padding}
          L ${rx} ${h - padding}
          A ${rx-padding} ${rx-padding} 0 0 1 ${padding} ${h - rx}
          L ${padding} ${rx}
          A ${rx-padding} ${rx-padding} 0 0 1 ${rx} ${padding}
          L ${w/2} ${padding}
          Z
      ` : '';

      const progress = Math.max(0, Math.min(1, score / 200));
      const milestoneValues = [40, 100, 140, 168, 180];
      const textColorClass = color.split(' ').find(c => c.startsWith('text-')) || 'text-lime-500';

      // Unified coordinate calculation
      const W_inner = w - padding * 2;
      const H_inner = h - padding * 2;
      const perimeter = 2 * W_inner + 2 * H_inner;

      const getPoint = (p: number) => {
          if (w === 0 || h === 0) return { x: 0, y: 0 };
          let dist = p * perimeter;

          // Segment 1: Top Center to Top Right
          if (dist <= W_inner/2) return { x: w/2 + dist, y: padding };
          dist -= W_inner/2;
          // Segment 2: Right Side
          if (dist <= H_inner) return { x: w - padding, y: padding + dist };
          dist -= H_inner;
          // Segment 3: Bottom Side
          if (dist <= W_inner) return { x: w - padding - dist, y: h - padding };
          dist -= W_inner;
          // Segment 4: Left Side
          if (dist <= H_inner) return { x: padding, y: h - padding - dist };
          dist -= H_inner;
          // Segment 5: Left to Top Center
          return { x: padding + dist, y: padding };
      };

      return (
          <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-visible">
              <svg className="w-full h-full overflow-visible">
                  {/* Track background */}
                  <path
                      d={pathData}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="10"
                      className="text-stone-800/20"
                  />
                  {/* Single Progress path */}
                  {w > 0 && (
                      <path
                        d={pathData}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="10"
                        strokeLinecap="round"
                        className={`${textColorClass} transition-all duration-1000 ${color.includes('animate-blink') ? 'animate-blink' : color.includes('animate-pulse') ? 'animate-pulse' : ''}`}
                        style={{
                            strokeDasharray: `${perimeter * progress} 5000`,
                            strokeDashoffset: 0
                        }}
                      />
                  )}
                  {/* Milestone Points */}
                  {w > 0 && milestoneValues.map(mVal => {
                      const point = getPoint(mVal / 200);
                      const achieved = score >= mVal;
                      return (
                          <g key={mVal}>
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r="6"
                                className={`${achieved ? textColorClass : 'text-stone-700'} transition-colors duration-500`}
                                fill="currentColor"
                            />
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r="8"
                                className="text-stone-950/20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            />
                          </g>
                      );
                  })}
              </svg>
          </div>
      );
  };

export const FoodBoardView: React.FC<FoodBoardViewProps> = ({ foodState, onUpdate, onBack }) => {
  const { score, history, wheel, broccoliWheel, monthlyBonuses, wheelPlenoCount, broccoliPlenoCount, dishes = {}, dailyScores = {}, config } = foodState;
  const [showWheelConfirm, setShowWheelConfirm] = useState(false);
  const [showBroccoliConfirm, setShowBroccoliConfirm] = useState(false);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [lastToggledItem, setLastToggledItem] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [monthOffset, setMonthOffset] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const activeConfig = {
    wheel: config?.wheel || DEFAULT_WHEEL,
    broccoli: config?.broccoli || DEFAULT_BROCCOLI,
    bonuses: config?.bonuses || DEFAULT_BONUSES,
    meals: config?.meals || DEFAULT_MEALS,
  };

  const updateMonthData = (changes: any) => {
    if (monthOffset === 0) {
        onUpdate({ ...foodState, ...changes });
    } else {
        const history = foodState.monthlyHistory || {};
        const oldMonthData = history[monthKey] || {
            wheelPlenoCount: 0,
            broccoliPlenoCount: 0,
            bonuses: { organs: [false, false, false, false], legumes: [false, false, false, false], fast24: [false, false, false, false] },
            dishes: {},
            wheel: { drink: false, nuts: false, dairy: false, spices: false, coffee: false },
            broccoliWheel: { dance: false, broccoli: false, tablecloth: false, pushups: false, dustpan: false }
        };
        
        // Map top-level property names to historical property names if they differ
        const updatedMonthData = { ...oldMonthData };
        if (changes.wheelPlenoCount !== undefined) updatedMonthData.wheelPlenoCount = changes.wheelPlenoCount;
        if (changes.broccoliPlenoCount !== undefined) updatedMonthData.broccoliPlenoCount = changes.broccoliPlenoCount;
        if (changes.monthlyBonuses !== undefined) updatedMonthData.bonuses = changes.monthlyBonuses;
        if (changes.dishes !== undefined) updatedMonthData.dishes = changes.dishes;
        if (changes.wheel !== undefined) updatedMonthData.wheel = changes.wheel;
        if (changes.broccoliWheel !== undefined) updatedMonthData.broccoliWheel = changes.broccoliWheel;
        
        onUpdate({
            ...foodState,
            monthlyHistory: { ...history, [monthKey]: updatedMonthData }
        });
    }
  };

  const handleBroccoliClick = (id: string) => {
    const isChecking = !currentBroccoliWheel[id];
    const newWheel = { ...currentBroccoliWheel, [id]: isChecking };
    const allChecked = Object.values(newWheel).every(val => val === true);

    if (allChecked && isChecking) {
      setLastToggledItem(id);
      updateMonthData({ broccoliWheel: newWheel });
      setShowBroccoliConfirm(true);
    } else {
      updateMonthData({ broccoliWheel: newWheel });
      setLastToggledItem(null);
    }
  };

  const confirmBroccoliPleno = () => {
    const emptyBroccoli = { dance: false, broccoli: false, tablecloth: false, pushups: false, dustpan: false };
    updateMonthData({
      score: monthOffset === 0 ? updateScore(1) : score,
      broccoliPlenoCount: effectiveBroccoliPlenoCount + 1,
      broccoliWheel: emptyBroccoli,
      history: addHistory(monthOffset === 0 ? 'Rutina Brócoli' : `Retro: Rutina Brócoli (${monthKey})`, 1)
    });
    setShowBroccoliConfirm(false);
    setLastToggledItem(null);
  };

  const cancelBroccoliPleno = () => {
    setShowBroccoliConfirm(false);
    setLastToggledItem(null);
  };

  const handleSaveConfig = (newConfig: FoodConfig) => {
    onUpdate({ ...foodState, config: newConfig });
    setShowConfigEditor(false);
  };

  const getDaysOfMonth = (offset: number) => {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const month = targetMonth.getMonth();
    const year = targetMonth.getFullYear();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Day of week for 1st (0 is Sunday)
    const firstDayWeekday = firstDayOfMonth.getDay();
    
    const days: (Date | null)[] = [];
    
    // Empty slots before 1st
    for (let i = 0; i < firstDayWeekday; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    // Empty slots after last day to fill the last row
    while (days.length % 7 !== 0) {
      days.push(null);
    }
    
    return days;
  };

  const currentMonthDate = new Date();
  currentMonthDate.setMonth(currentMonthDate.getMonth() + monthOffset);
  const currentMonth = currentMonthDate.getMonth();
  const currentYear = currentMonthDate.getFullYear();

  const daysOfMonth = getDaysOfMonth(monthOffset);
  
  // Use historical data if viewing a past month
  const monthKey = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`;
  const historicalData = foodState.monthlyHistory?.[monthKey];
  
  const effectiveWheelPlenoCount = monthOffset === 0 ? (wheelPlenoCount || 0) : (historicalData?.wheelPlenoCount || 0);
  const effectiveBroccoliPlenoCount = monthOffset === 0 ? (broccoliPlenoCount || 0) : (historicalData?.broccoliPlenoCount || 0);
  const effectiveBonuses = monthOffset === 0 ? monthlyBonuses : (historicalData?.bonuses || {});
  const effectiveDishes = monthOffset === 0 ? dishes : (historicalData?.dishes || {});
  const effectiveWheel = monthOffset === 0 ? wheel : (historicalData?.wheel || { drink: false, nuts: false, dairy: false, spices: false, coffee: false });
  const effectiveBroccoliWheel = monthOffset === 0 ? broccoliWheel : (historicalData?.broccoliWheel || { dance: false, broccoli: false, tablecloth: false, pushups: false, dustpan: false });

  const currentCalculatedScore = calculateAllDaysTotal(dailyScores, currentMonth, currentYear) + (effectiveWheelPlenoCount * 3) + (effectiveBroccoliPlenoCount * 1);
  // Add bonus points
  const bonusScore = Object.entries(effectiveBonuses).reduce((acc, [id, squares]) => {
    const bonusConfig = activeConfig.bonuses.find(b => b.id === id);
    if (!bonusConfig) return acc;
    const checkedCount = squares.filter(s => s).length;
    return acc + (checkedCount * bonusConfig.points);
  }, 0);
  
  const totalMonthlyScore = currentCalculatedScore + bonusScore;

  let monthlyDeliveryCount = 0;
  for (const [dateStr, rawScore] of Object.entries(dailyScores)) {
      const scoreData = rawScore as DailyFoodScore;
      const d = new Date(dateStr);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          if (scoreData.deliveryLunch) monthlyDeliveryCount++;
          if (scoreData.deliveryDinner) monthlyDeliveryCount++;
      }
  }

  const currentWheel = effectiveWheel;
  const currentBroccoliWheel = effectiveBroccoliWheel;

  const getEffectiveDishesForDate = (date: Date) => {
      const now = new Date();
      if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
          return dishes;
      }
      
      const targetMonth = date.getMonth();
      const targetYear = date.getFullYear();
      const targetMonthKey = `${targetYear}-${(targetMonth + 1).toString().padStart(2, '0')}`;
      
      return foodState.monthlyHistory?.[targetMonthKey]?.dishes || {};
  };

  const handleSaveDailyScore = (date: Date, newDailyScore: DailyFoodScore) => {
    const now = new Date();
    const dateStr = date.toDateString();
    const oldDailyScore = dailyScores[dateStr] || defaultDailyScore;
    const newScores = { ...dailyScores, [dateStr]: newDailyScore };
    
    const oldTotal = calculateAllDaysTotal(dailyScores);
    const newTotal = calculateAllDaysTotal(newScores);
    const diff = newTotal - oldTotal;

    const newDishes = { ...effectiveDishes };

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

    // Always update dishes for the month that the date belongs to
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

    const isCurrentMonthDate = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const isCurrentMonthView = monthOffset === 0;

    if (isCurrentMonthDate) {
        onUpdate({
            ...foodState,
            score: isCurrentMonthView ? updateScore(diff) : score,
            dailyScores: newScores,
            dishes: newDishes,
            history: diff !== 0 ? addHistory(isCurrentMonthView ? `Día: ${date.getDate()}` : `Retro-Día: ${date.getDate()}`, diff) : history
        });
    } else {
        const history = foodState.monthlyHistory || {};
        const monthKeyForDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const oldMonthData = history[monthKeyForDate] || {
            wheelPlenoCount: 0,
            broccoliPlenoCount: 0,
            bonuses: { organs: [false, false, false, false], legumes: [false, false, false, false], fast24: [false, false, false, false] },
            dishes: {}
        };
        
        onUpdate({
            ...foodState,
            dailyScores: newScores,
            monthlyHistory: {
                ...history,
                [monthKeyForDate]: {
                    ...oldMonthData,
                    dishes: newDishes
                }
            },
            history: diff !== 0 ? addHistory(`Retro-Día: ${date.getDate()} (${monthKeyForDate})`, diff) : history
        });
    }
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

  const handleBonus = (type: string, index: number, points: number) => {
      const currentSquares = effectiveBonuses[type] || [false, false, false, false];
      const newSquares = [...currentSquares];
      newSquares[index] = !newSquares[index];
      
      const isActive = newSquares[index];
      const scoreChange = isActive ? points : -points;
      
      updateMonthData({
          score: monthOffset === 0 ? updateScore(scoreChange) : score,
          monthlyBonuses: { ...effectiveBonuses, [type]: newSquares },
          history: addHistory(isActive ? `Bonus: ${type} [${index+1}]` : `Deshacer: ${type} [${index+1}]`, scoreChange)
      });
  };

  const getDishCount = (baseName: string, max: number) => {
      let count = 0;
      for (let i = 0; i < max; i++) {
          const key = baseName + ' '.repeat(i);
          if (effectiveDishes[key]) count++;
      }
      return count;
  };

  const incrementDish = (baseName: string, max: number) => {
      let count = getDishCount(baseName, max);
      if (count < max) {
          const key = baseName + ' '.repeat(count);
          updateMonthData({
              dishes: {
                  ...effectiveDishes,
                  [key]: true
              }
          });
      }
  };

  const decrementDish = (baseName: string, max: number) => {
      let count = getDishCount(baseName, max);
      if (count > 0) {
          const key = baseName + ' '.repeat(count - 1);
          updateMonthData({
              dishes: {
                  ...effectiveDishes,
                  [key]: false
              }
          });
      }
  };

  const toggleWheelItem = (item: string) => {
      const isChecking = !currentWheel[item];
      const newWheel = { ...currentWheel, [item]: isChecking };
      const allChecked = Object.values(newWheel).every(val => val === true);

      if (allChecked && isChecking) {
          setLastToggledItem(item);
          updateMonthData({ wheel: newWheel });
          setShowWheelConfirm(true);
      } else {
          updateMonthData({ wheel: newWheel });
          setLastToggledItem(null);
      }
  };

  const confirmWheelPleno = () => {
      const emptyWheel = { drink: false, nuts: false, dairy: false, spices: false, coffee: false };
      updateMonthData({
          score: monthOffset === 0 ? updateScore(3) : score,
          wheelPlenoCount: effectiveWheelPlenoCount + 1,
          wheel: emptyWheel,
          history: addHistory(monthOffset === 0 ? 'Rueda Completa' : `Retro: Rueda Completa (${monthKey})`, 3)
      });
      setShowWheelConfirm(false);
      setLastToggledItem(null);
  };

  const cancelWheelPleno = () => {
      setShowWheelConfirm(false);
      setLastToggledItem(null);
  };


  const getScoreColor = (val: number) => {
      if (val >= 200) return 'text-stone-950 font-black drop-shadow-sm';
      if (val >= 180) return 'text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.6)] animate-pulse font-black';
      if (val >= 168) return 'text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.4)] font-black';
      if (val >= 140) return 'text-[#B8860B] font-black';
      if (val >= 100) return 'text-lime-500 font-black';
      if (val >= 40) return 'text-orange-500 font-black';
      if (val < 0) return 'text-red-600 font-black animate-blink';
      return 'text-red-600 font-black';
  };

  const milestones = [
      { val: 40, label: 'Superviviente', icon: Award },
      { val: 100, label: 'Maestro', icon: Medal },
      { val: 140, label: 'Élite', icon: Star },
      { val: 168, label: 'Héroe', icon: Trophy },
      { val: 200, label: 'Leyenda', icon: Gem }
  ];

  const isLegendary = totalMonthlyScore >= 200;

  // Moved CalendarProgressPath outside FoodBoardView to prevent re-mount on every render


  return (
    <div className={`fixed inset-0 max-w-md mx-auto z-50 flex flex-col animate-in fade-in duration-200 transition-colors duration-1000 ${isLegendary ? 'bg-[#FFD700]' : 'bg-stone-950'}`}>
      <div className={`p-4 shadow-sm flex items-center justify-between border-b shrink-0 transition-colors duration-1000 ${isLegendary ? 'bg-[#FFD700] border-black/20' : 'bg-stone-900 border-stone-800'}`}>
        <div className="flex items-center gap-4">
             <button onClick={onBack} className={`p-2 rounded-full transition-colors ${isLegendary ? 'hover:bg-black/10' : 'hover:bg-stone-800'}`}>
                <ArrowLeft className={`w-6 h-6 ${isLegendary ? 'text-stone-950' : 'text-lime-500'}`} />
            </button>
            <h1 className={`text-xl font-bold uppercase tracking-tighter transition-colors ${isLegendary ? 'text-stone-950' : 'text-lime-200'}`}>Jumangiare</h1>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setShowConfigEditor(true)} className={`p-2 rounded-full transition-colors ${isLegendary ? 'text-stone-900 hover:bg-black/10' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}>
                <Edit2 className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-20 no-scrollbar">
        
        {/* Main Counter */}
        <div className="flex flex-col items-center justify-center py-6">
            <div className={`text-xs font-bold tracking-widest uppercase mb-2 transition-colors ${isLegendary ? 'text-stone-950/60' : 'text-stone-500'}`}>
                {currentMonthDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-6">
                <button 
                    onClick={() => setMonthOffset(prev => prev - 1)} 
                    className={`p-3 rounded-full transition-colors active:scale-90 ${isLegendary ? 'text-stone-900/40 hover:text-stone-900 hover:bg-black/5' : 'text-stone-600 hover:text-stone-300 hover:bg-stone-800'}`}
                >
                    <ArrowLeft className="w-8 h-8" />
                </button>
                <div className={`text-7xl transition-all duration-300 w-32 tracking-tighter text-center ${getScoreColor(totalMonthlyScore)}`}>
                    {totalMonthlyScore}
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setMonthOffset(prev => prev + 1)} 
                        disabled={monthOffset >= 0}
                        className={`p-3 rounded-full transition-colors active:scale-90 disabled:opacity-10 ${isLegendary ? 'text-stone-900/40 hover:text-stone-900 hover:bg-black/5' : 'text-stone-600 hover:text-stone-300 hover:bg-stone-800'}`}
                    >
                        <ArrowRight className="w-8 h-8" />
                    </button>
                </div>
            </div>
        </div>


        {/* Snake Progress Border Wrapper */}
        <div className="relative p-2">
            <CalendarProgressPath 
                score={totalMonthlyScore} 
                color={getScoreColor(totalMonthlyScore)}
                isLegendary={isLegendary}
            />

            <div className={`bg-stone-900/40 rounded-3xl p-4 relative z-10 transition-colors duration-1000 ${isLegendary ? 'bg-white/5 border-black/10' : 'bg-stone-900/40 border-stone-800/50'}`}>
          <div className="grid grid-cols-7 gap-y-4 gap-x-1">
            {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(day => (
              <div key={day} className="text-[10px] font-black text-stone-600 text-center mb-1">
                {day}
              </div>
            ))}
            {daysOfMonth.map((date, index) => {
              if (!date) return <div key={`empty-${index}`} />;
              
              const dateStr = date.toDateString();
              const dayScore = dailyScores[dateStr] || defaultDailyScore;
              const total = calculateDailyScore(dayScore, dateStr, dailyScores);
              const isToday = date.toDateString() === new Date().toDateString();
              const isFuture = date > new Date() && !isToday;

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
                  className={`flex flex-col items-center gap-1 transition-all ${isFuture ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
                >
                  <div className="relative w-9 h-9 rounded-full flex items-center justify-center">
                    <div className={`absolute inset-0 rounded-full transition-colors
                      ${total > 0 ? 'bg-lime-500/10' : total < 0 ? 'bg-red-500/10' : isToday ? 'bg-stone-800' : 'bg-stone-900/50'}
                    `} />
                    
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
                    
                    <span className={`relative z-10 text-[11px] font-bold
                      ${total > 0 ? 'text-lime-400' : total < 0 ? 'text-red-400' : isToday ? 'text-lime-500' : 'text-stone-400'}
                    `}>
                      {date.getDate()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

        {/* Habits Grouped Section */}
        <div className="bg-stone-900/60 rounded-[2rem] border border-stone-800/50 overflow-hidden">
            {/* Rueda Row */}
            <div className="p-5 border-b border-stone-800/50">
                <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">La Rueda</span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                    {activeConfig.wheel.map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => toggleWheelItem(item.id)}
                            className={`
                                aspect-square rounded-xl flex items-center justify-center text-xl transition-all duration-300
                                ${currentWheel[item.id] 
                                    ? 'bg-lime-600/20 border border-lime-500 shadow-[0_0_10px_rgba(132,204,22,0.1)] grayscale-0 scale-105' 
                                    : 'bg-stone-950 border border-stone-800 grayscale opacity-40'}
                            `}
                        >
                            {item.icon}
                        </button>
                    ))}
                    <div className="aspect-square rounded-xl bg-stone-950/50 border border-stone-800/50 flex flex-col items-center justify-center gap-0.5 opacity-50">
                        <span className="text-[8px] font-black text-stone-600 uppercase">Total</span>
                        <span className="text-sm font-black text-stone-400">{effectiveWheelPlenoCount}</span>
                    </div>
                </div>
            </div>

            {/* Brócoli Row */}
            <div className="p-5 border-b border-stone-800/50">
                <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Brócoli</span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                    {activeConfig.broccoli.map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => handleBroccoliClick(item.id)}
                            className={`
                                aspect-square rounded-xl flex items-center justify-center text-xl transition-all duration-300
                                ${currentBroccoliWheel[item.id] 
                                    ? 'bg-emerald-600/20 border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)] grayscale-0 scale-105' 
                                    : 'bg-stone-950 border border-stone-800 grayscale opacity-40'}
                            `}
                        >
                            {item.icon}
                        </button>
                    ))}
                    <div className="aspect-square rounded-xl bg-stone-950/50 border border-stone-800/50 flex flex-col items-center justify-center gap-0.5 opacity-50">
                        <span className="text-[8px] font-black text-stone-600 uppercase">Total</span>
                        <span className="text-sm font-black text-stone-400">{effectiveBroccoliPlenoCount}</span>
                    </div>
                </div>
            </div>

            {/* Bonus Row */}
            <div className="p-5">
                <div className="flex items-center justify-between mb-4 px-1">
                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Supervivencia</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {activeConfig.bonuses.map((bonus) => {
                        const squares = effectiveBonuses[bonus.id] || [false, false, false, false];
                        return (
                            <div key={bonus.id} className="flex flex-col items-center gap-3">
                                <div className="text-2xl filter drop-shadow-sm">{bonus.icon}</div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {squares.map((isActive, idx) => (
                                        <button
                                            key={`${bonus.id}-${idx}`}
                                            onClick={() => handleBonus(bonus.id, idx, bonus.points)}
                                            className={`w-6 h-6 rounded-md border transition-all duration-300 ${
                                                isActive 
                                                    ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                                                    : 'bg-stone-950 border-stone-800'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-[8px] font-black text-stone-500 uppercase tracking-tighter text-center leading-none">
                                    {bonus.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Meal Checklist (Platos Cocinados) */}
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

      {/* Confirmation Modals are shown conditionally */}


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