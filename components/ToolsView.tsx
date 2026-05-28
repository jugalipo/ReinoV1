import React, { useState, useRef } from 'react';
import { ArrowLeft, Wrench, Heart, Play, RotateCcw, Copy, Check, Sparkles, Mic } from 'lucide-react';

interface ToolsViewProps {
  onBack: () => void;
}

type Step = 'input' | 'sorting' | 'result';

type ComparisonRequest = {
  id: string;
  a: string;
  b: string;
  resolve: (value: number) => void;
  reject: (reason?: any) => void;
};

export const ToolsView: React.FC<ToolsViewProps> = ({ onBack }) => {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  
  // Prioritizer states
  const [step, setStep] = useState<Step>('input');
  const [inputText, setInputText] = useState('');
  const [currentComparison, setCurrentComparison] = useState<ComparisonRequest | null>(null);
  const [sortedItems, setSortedItems] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const pendingRequests = useRef<ComparisonRequest[]>([]);
  const currentComparisonRef = useRef<ComparisonRequest | null>(null);
  const lastSeen = useRef<Set<string>>(new Set());
  const isCancelled = useRef(false);

  // Estimates worst case comparisons for merge sort progress bar
  const getWorstCaseComparisons = (n: number): number => {
    if (n <= 1) return 0;
    const mid = Math.floor(n / 2);
    return getWorstCaseComparisons(mid) + getWorstCaseComparisons(n - mid) + n - 1;
  };

  const handleStart = async () => {
    const items = inputText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const uniqueItems = Array.from(new Set(items));

    if (uniqueItems.length < 2) {
      alert('Por favor, introduce al menos 2 deseos diferentes para poder compararlos.');
      return;
    }

    setStep('sorting');
    isCancelled.current = false;
    pendingRequests.current = [];
    currentComparisonRef.current = null;
    lastSeen.current = new Set();
    setProgress({ done: 0, total: getWorstCaseComparisons(uniqueItems.length) });

    try {
      const shuffledItems = [...uniqueItems].sort(() => Math.random() - 0.5);
      const sorted = await asyncMergeSort(shuffledItems);
      if (!isCancelled.current) {
        setSortedItems(sorted);
        setStep('result');
      }
    } catch (e) {
      if (e !== 'Cancelled') {
        console.error(e);
      }
    }
  };

  const requestComparison = (a: string, b: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (isCancelled.current) {
        reject('Cancelled');
        return;
      }
      
      const swap = Math.random() > 0.5;
      const id = Math.random().toString(36).substring(7);
      
      pendingRequests.current.push({ 
        id, 
        a: swap ? b : a, 
        b: swap ? a : b, 
        resolve: (val: number) => resolve(swap ? -val : val), 
        reject 
      });
      processQueue();
    });
  };

  const processQueue = () => {
    if (currentComparisonRef.current || pendingRequests.current.length === 0) return;

    let selectedIdx = -1;
    const shuffledIndices = Array.from({length: pendingRequests.current.length}, (_, i) => i)
      .sort(() => Math.random() - 0.5);

    for (const idx of shuffledIndices) {
      const req = pendingRequests.current[idx];
      if (!lastSeen.current.has(req.a) && !lastSeen.current.has(req.b)) {
        selectedIdx = idx;
        break;
      }
    }

    if (selectedIdx === -1) {
      for (const idx of shuffledIndices) {
        const req = pendingRequests.current[idx];
        if (!lastSeen.current.has(req.a) || !lastSeen.current.has(req.b)) {
          selectedIdx = idx;
          break;
        }
      }
    }

    if (selectedIdx === -1) {
      selectedIdx = shuffledIndices[0];
    }

    const selected = pendingRequests.current[selectedIdx];
    pendingRequests.current.splice(selectedIdx, 1);
    
    lastSeen.current = new Set([selected.a, selected.b]);
    currentComparisonRef.current = selected;
    setCurrentComparison(selected);
  };

  const asyncMerge = async (left: string[], right: string[]): Promise<string[]> => {
    let result: string[] = [];
    let i = 0, j = 0;
    while (i < left.length && j < right.length) {
      const cmp = await requestComparison(left[i], right[j]);
      if (cmp <= 0) {
        result.push(left[i]);
        i++;
      } else {
        result.push(right[j]);
        j++;
      }
    }
    return result.concat(left.slice(i)).concat(right.slice(j));
  };

  const asyncMergeSort = async (arr: string[]): Promise<string[]> => {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    const [left, right] = await Promise.all([
      asyncMergeSort(arr.slice(0, mid)),
      asyncMergeSort(arr.slice(mid))
    ]);
    return await asyncMerge(left, right);
  };

  const handleChoice = (choice: 'a' | 'b') => {
    if (currentComparisonRef.current) {
      const { resolve } = currentComparisonRef.current;
      currentComparisonRef.current = null;
      setCurrentComparison(null);
      
      setProgress(p => ({ ...p, done: p.done + 1 }));
      resolve(choice === 'a' ? -1 : 1);
      
      setTimeout(processQueue, 0);
    }
  };

  const handleCopy = () => {
    const textToCopy = sortedItems.map((item, index) => `${index + 1}. ${item}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRestart = () => {
    isCancelled.current = true;
    
    pendingRequests.current.forEach(req => req.reject('Cancelled'));
    pendingRequests.current = [];
    
    if (currentComparisonRef.current) {
      currentComparisonRef.current.reject('Cancelled');
      currentComparisonRef.current = null;
    }
    
    setCurrentComparison(null);
    setStep('input');
    setSortedItems([]);
  };

  const handleHeaderBack = () => {
    if (activeTool !== null) {
      handleRestart();
      setActiveTool(null);
    } else {
      onBack();
    }
  };

  const progressPercent = progress.total > 0 
    ? Math.min(100, Math.round((progress.done / progress.total) * 100)) 
    : 0;

  return (
    <div className="fixed inset-0 max-w-md mx-auto z-50 bg-stone-950 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={handleHeaderBack} className="p-2 hover:bg-stone-800 rounded-full transition-colors active:scale-95">
            <ArrowLeft className="w-6 h-6 text-stone-100" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-stone-800 border border-stone-700 rounded-xl flex items-center justify-center shadow-lg">
              {activeTool === 'prioritizer' ? (
                <Heart className="w-6 h-6 text-amber-500 fill-current" />
              ) : (
                <Wrench className="w-6 h-6 text-stone-400" />
              )}
            </div>
            <h1 className="text-xl font-bold text-stone-100 leading-none tracking-tighter uppercase italic">
              {activeTool === 'prioritizer' ? 'Priorizador' : 'Trastos'}
            </h1>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {activeTool === null ? (
        /* Trastos Directory */
        <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-28">
          <div 
            onClick={() => setActiveTool('prioritizer')}
            className="bg-stone-900 border border-stone-800 rounded-3xl p-5 hover:border-amber-500/50 hover:bg-stone-850 cursor-pointer active:scale-[0.98] group flex items-start gap-4 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-amber-950/20 border border-amber-900/30 rounded-2xl flex items-center justify-center shadow-lg text-amber-500 group-hover:scale-105 transition-transform shrink-0">
              <Heart className="w-6 h-6 fill-current animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-stone-100 group-hover:text-amber-400 transition-colors">Priorizador de Deseos</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Compara tus deseos de dos en dos y obtén una lista ordenada de tus verdaderas prioridades.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Prioritizer App Sub-view */
        <div className="flex-1 overflow-y-auto p-6 pb-28 space-y-6">
          {step === 'input' && (
            <div className="animate-in fade-in duration-300 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-stone-200 uppercase tracking-tight italic">¿Qué deseas priorizar?</h2>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Pega aquí tu lista de artículos (uno por línea). Te ayudaremos a ordenarlos según tus preferencias reales comparándolos de dos en dos.
                </p>
              </div>
              
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ejemplo:&#10;Auriculares con cancelación de ruido&#10;Zapatillas para correr&#10;Libro de ciencia ficción&#10;Cafetera de especialidad"
                className="w-full h-60 p-4 rounded-2xl bg-stone-900/50 border border-stone-800 focus:border-stone-700 text-stone-200 placeholder:text-stone-700 outline-none transition-all resize-none font-bold text-sm shadow-inner"
              />
              
              <button
                onClick={handleStart}
                disabled={inputText.trim().length === 0}
                className="w-full py-4 bg-amber-600/20 hover:bg-amber-600/35 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-amber-400 hover:text-amber-300 font-bold uppercase tracking-widest text-xs rounded-2xl border border-amber-900/40 flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <span>Comenzar a priorizar</span>
                <Play className="w-4 h-4 fill-current" />
              </button>
            </div>
          )}

          {step === 'sorting' && currentComparison && (
            <div className="animate-in fade-in duration-300 space-y-8 flex flex-col items-center">
              {/* Progress Estimation */}
              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs text-stone-500 font-bold uppercase tracking-wider">
                  <span>Progreso estimado</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-stone-950 border border-stone-850 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-2.5 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <h2 className="text-lg font-black tracking-tighter text-stone-400 uppercase italic text-center">¿Cuál prefieres comprar?</h2>
              
              <div className="flex flex-col gap-4 w-full">
                <button
                  onClick={() => handleChoice('a')}
                  className="w-full bg-stone-900/50 border border-stone-800 hover:border-amber-500/50 hover:bg-stone-900/70 p-6 rounded-2xl min-h-[100px] flex items-center justify-center text-center transition-all active:scale-[0.98] group shadow-md"
                >
                  <span className="text-base font-bold text-stone-200 group-hover:text-amber-400 transition-colors">
                    {currentComparison.a}
                  </span>
                </button>
                
                <button
                  onClick={() => handleChoice('b')}
                  className="w-full bg-stone-900/50 border border-stone-800 hover:border-amber-500/50 hover:bg-stone-900/70 p-6 rounded-2xl min-h-[100px] flex items-center justify-center text-center transition-all active:scale-[0.98] group shadow-md"
                >
                  <span className="text-base font-bold text-stone-200 group-hover:text-amber-400 transition-colors">
                    {currentComparison.b}
                  </span>
                </button>
              </div>
              
              <button
                onClick={handleRestart}
                className="text-xs font-bold uppercase tracking-widest text-stone-600 hover:text-stone-400 flex items-center gap-1.5 transition-colors active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
            </div>
          )}

          {step === 'result' && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div className="flex items-center justify-between border-b border-stone-850 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-stone-200 uppercase tracking-tight italic">Tu Lista Priorizada</h2>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">El orden exacto de tus preferencias.</p>
                </div>
                <button
                  onClick={handleCopy}
                  className="py-2.5 px-4 rounded-xl border border-stone-800 bg-stone-900/50 hover:bg-stone-900 text-stone-400 hover:text-stone-300 font-bold text-xs uppercase tracking-tighter flex items-center gap-2 active:scale-95 transition-all shadow-md shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar lista</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="space-y-3">
                {sortedItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-stone-900/30 border border-stone-900 shadow-sm animate-in fade-in duration-300"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center font-black text-sm">
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-stone-200">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleRestart}
                className="w-full py-4 bg-stone-900 border border-stone-800 hover:bg-stone-850 rounded-2xl flex items-center justify-center gap-2 text-stone-400 hover:text-stone-300 transition-all font-bold text-xs uppercase tracking-widest active:scale-95 shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Priorizar otra lista</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
