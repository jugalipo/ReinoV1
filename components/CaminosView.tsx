import React, { useState } from 'react';
import { Camino } from '../types';
import { ArrowLeft, Plus, Minus, Trash2, X } from 'lucide-react';
import { useModalHistory } from '../hooks/useModalHistory';

interface CaminosViewProps {
  caminos: Camino[];
  onUpdate: (caminos: Camino[]) => void;
  onBack: () => void;
}

export const CaminosView: React.FC<CaminosViewProps> = ({ caminos, onUpdate, onBack }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newTarget, setNewTarget] = useState('100');
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  useModalHistory(isAdding, () => setIsAdding(false));
  useModalHistory(!!idToDelete, () => setIdToDelete(null));

  const addCamino = () => {
    if (!newName.trim()) return;
    const newCamino: Camino = {
      id: Date.now().toString(),
      name: newName,
      progress: 0,
      target: parseFloat(newTarget) || 100,
      unit: newUnit.trim() || undefined,
    };
    onUpdate([...caminos, newCamino]);
    setNewName('');
    setNewUnit('');
    setNewTarget('100');
    setIsAdding(false);
  };

  const updateProgress = (id: string, delta: number) => {
    const updated = caminos.map(c => {
      if (c.id === id) {
        const newProgress = Math.max(0, c.progress + delta);
        const target = c.target || 100;
        return { ...c, progress: Math.min(newProgress, target) };
      }
      return c;
    });
    onUpdate(updated);
  };

  const deleteCamino = (id: string) => {
    onUpdate(caminos.filter(c => c.id !== id));
  };

  const sortedCaminos = [...caminos].sort((a, b) => {
    const progressA = (a.progress / (a.target || 100));
    const progressB = (b.progress / (b.target || 100));
    return progressB - progressA;
  });

  return (
    <div className="fixed inset-0 max-w-md mx-auto z-50 bg-stone-950 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-stone-100" />
          </button>
          <h1 className="text-xl font-bold text-stone-100 leading-none tracking-tighter uppercase italic">Caminos</h1>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-2 bg-stone-800 rounded-xl hover:bg-stone-700 transition-colors border border-stone-700 shadow-lg"
        >
          <Plus className="w-5 h-5 text-stone-100" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
        {sortedCaminos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-30 grayscale py-20">
            <span className="text-7xl mb-6 animate-pulse">🛤️</span>
            <p className="text-stone-400 font-black uppercase tracking-[0.2em] text-[10px]">Sin rutas trazadas</p>
          </div>
        ) : (
          sortedCaminos.map((camino, idx) => (
            <div 
              key={camino.id} 
              className="bg-stone-900/40 rounded-2xl p-4 border border-stone-800/50 shadow-lg relative overflow-hidden group hover:border-stone-700 transition-all duration-500"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex justify-between items-center mb-3 relative z-10">
                <div className="flex items-center gap-3 overflow-hidden">
                   <h3 className="text-sm font-black text-stone-100 tracking-tight leading-tight truncate">{camino.name}</h3>
                   <span className="font-mono font-black text-stone-400 text-[10px] whitespace-nowrap">
                     {camino.progress} / {camino.target || 100} <span className="opacity-50">{camino.unit || '%'}</span>
                   </span>
                </div>
                <button 
                  onClick={() => setIdToDelete(camino.id)}
                  className="p-1.5 text-stone-800 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <button 
                  onClick={() => updateProgress(camino.id, -1)}
                  className="w-8 h-8 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center hover:bg-stone-800 active:scale-90 transition-all shadow-md shrink-0"
                >
                  <Minus className="w-4 h-4 text-stone-500" />
                </button>
                
                <div className="flex-1 h-4 bg-stone-950 rounded-full overflow-hidden border border-stone-800/50 p-0.5">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-stone-700 via-stone-400 to-stone-100 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(255,255,255,0.05)]" 
                    style={{ width: `${Math.min(100, (camino.progress / (camino.target || 100)) * 100)}%` }}
                  />
                </div>

                <button 
                  onClick={() => updateProgress(camino.id, 1)}
                  disabled={camino.progress >= (camino.target || 100)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-all shadow-md shrink-0 ${
                    camino.progress >= (camino.target || 100) 
                      ? 'bg-stone-800 text-stone-700 cursor-not-allowed' 
                      : 'bg-stone-200 text-stone-950 hover:bg-white'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-stone-900 w-full max-w-sm rounded-[3rem] border border-stone-800 p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-stone-600 to-transparent" />
            
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-stone-100 tracking-tighter uppercase italic leading-none">Nueva Ruta</h2>
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mt-1">Traza tu destino</p>
              </div>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-stone-800 rounded-full transition-colors">
                <X className="w-6 h-6 text-stone-600" />
              </button>
            </div>
            
            <div className="space-y-4 mb-10">
              <div className="relative">
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Nombre</label>
                <input 
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Adelgazar"
                  className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-4 text-stone-100 placeholder:text-stone-800 focus:outline-none focus:border-stone-600 transition-all font-bold shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Unidades</label>
                  <input 
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="Ej: kg"
                    className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-4 text-stone-100 placeholder:text-stone-800 focus:outline-none focus:border-stone-600 transition-all font-bold shadow-inner"
                  />
                </div>
                <div className="relative">
                  <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Objetivo</label>
                  <input 
                    type="number"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    placeholder="Ej: 20"
                    className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-4 text-stone-100 placeholder:text-stone-800 focus:outline-none focus:border-stone-600 transition-all font-bold shadow-inner"
                  />
                </div>
              </div>
            </div>
            
            <button 
              onClick={addCamino}
              className="w-full py-5 bg-white text-stone-950 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-stone-100 active:scale-95 transition-all shadow-[0_10px_20px_rgba(255,255,255,0.1)]"
            >
              Comenzar Camino
            </button>
          </div>
        </div>
      )}

      {idToDelete && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-stone-900 w-full max-w-sm rounded-[2.5rem] border border-stone-800 p-8 shadow-2xl text-center">
            <div className="w-20 h-20 bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-900/50">
              <Trash2 className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-black text-stone-100 mb-2 uppercase tracking-tighter italic">¿Eliminar Camino?</h2>
            <p className="text-stone-400 mb-8 text-sm font-medium">Esta acción no se puede deshacer y perderás todo el progreso de este proyecto.</p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setIdToDelete(null)}
                className="flex-1 py-4 bg-stone-800 text-stone-400 rounded-2xl font-bold hover:bg-stone-700 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  deleteCamino(idToDelete);
                  setIdToDelete(null);
                }}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-500 transition-all shadow-lg shadow-red-900/20"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
