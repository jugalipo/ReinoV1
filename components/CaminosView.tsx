import React, { useState } from 'react';
import { Camino } from '../types';
import { ArrowLeft, Plus, Minus, Trash2, X, Edit2, Save } from 'lucide-react';
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
  const [selectedCaminoId, setSelectedCaminoId] = useState<string | null>(null);
  const [isEditingCamino, setIsEditingCamino] = useState(false);
  const [editCaminoData, setEditCaminoData] = useState<Camino | null>(null);

  useModalHistory(isAdding, () => setIsAdding(false));
  useModalHistory(!!idToDelete, () => setIdToDelete(null));
  useModalHistory(!!selectedCaminoId, () => {
      setSelectedCaminoId(null);
      setIsEditingCamino(false);
  });

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
          sortedCaminos.map((camino, idx) => {
             const percent = Math.min(100, (camino.progress / (camino.target || 100)) * 100);
             return (
               <button 
                 key={camino.id} 
                 onClick={() => setSelectedCaminoId(camino.id)}
                 className="relative w-full rounded-2xl py-4 px-5 transition-all duration-300 border border-stone-800 overflow-hidden text-left shadow-sm active:scale-[0.98] group"
                 style={{ animationDelay: `${idx * 50}ms` }}
               >
                 {/* Base background */}
                 <div className="absolute inset-0 bg-stone-900" />
                 
                 {/* Progress fill */}
                 <div 
                     className="absolute top-0 left-0 bottom-0 transition-all duration-700 bg-stone-500 opacity-20"
                     style={{ width: `${percent}%` }}
                 />
                 
                 {/* Hover Effect Outline */}
                 <div className="absolute inset-0 border-2 border-transparent group-hover:border-stone-600 rounded-2xl transition-colors pointer-events-none" />
                 
                 <div className="relative z-10 flex items-center justify-between w-full">
                     <div className="flex items-center gap-3 truncate">
                         <h4 className="text-base font-bold text-stone-100 truncate">{camino.name}</h4>
                         <span className="text-sm font-black text-stone-400 whitespace-nowrap">
                             {camino.progress} {camino.unit || '%'}
                         </span>
                     </div>
                 </div>
               </button>
             );
          })
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
            <p className="text-stone-400 mb-8 text-sm font-medium">Esta acción no se puede deshacer y perderás todo el progreso de este camino.</p>
            
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

      {selectedCaminoId && (
        <div 
          className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300" 
          onClick={() => { setSelectedCaminoId(null); setIsEditingCamino(false); }}
        >
          {(() => {
             const camino = caminos.find(c => c.id === selectedCaminoId);
             if (!camino) return null;
             
             if (isEditingCamino && editCaminoData) {
                 return (
                     <div className="bg-stone-900 w-full max-w-sm rounded-[2.5rem] border border-stone-800 p-8 shadow-2xl flex flex-col relative" onClick={e => e.stopPropagation()}>
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-stone-100 italic">Editar Camino</h2>
                            <button onClick={() => setIsEditingCamino(false)} className="p-2 text-stone-600 hover:text-stone-300 transition-colors">
                              <X className="w-5 h-5" />
                            </button>
                         </div>
                         <div className="space-y-4 mb-8">
                             <div>
                                 <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1 ml-1 block">Nombre</label>
                                 <input value={editCaminoData.name} onChange={e => setEditCaminoData({...editCaminoData, name: e.target.value})} className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-200 font-bold focus:border-stone-600 outline-none" />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1 ml-1 block">Progreso</label>
                                     <input type="number" value={editCaminoData.progress === 0 ? '' : editCaminoData.progress} onChange={e => setEditCaminoData({...editCaminoData, progress: parseFloat(e.target.value) || 0})} className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-200 font-bold focus:border-stone-600 outline-none" />
                                 </div>
                                 <div>
                                     <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1 ml-1 block">Objetivo</label>
                                     <input type="number" value={editCaminoData.target} onChange={e => setEditCaminoData({...editCaminoData, target: parseFloat(e.target.value) || 100})} className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-200 font-bold focus:border-stone-600 outline-none" />
                                 </div>
                             </div>
                             <div>
                                 <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1 ml-1 block">Unidades</label>
                                 <input value={editCaminoData.unit || ''} onChange={e => setEditCaminoData({...editCaminoData, unit: e.target.value})} className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-200 font-bold focus:border-stone-600 outline-none" />
                             </div>
                         </div>
                         <button 
                             onClick={() => {
                                 onUpdate(caminos.map(c => c.id === editCaminoData.id ? editCaminoData : c));
                                 setIsEditingCamino(false);
                             }}
                             className="w-full py-4 bg-stone-200 text-stone-950 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all shadow-lg flex items-center justify-center gap-2"
                         >
                             <Save className="w-4 h-4" /> Guardar Cambios
                         </button>
                     </div>
                 );
             }

             return (
               <div className="bg-stone-900 w-full max-w-sm rounded-[2.5rem] border border-stone-800 p-8 shadow-2xl flex flex-col items-center relative" onClick={e => e.stopPropagation()}>
                 <div className="flex justify-between items-start w-full mb-6">
                   <div className="pr-10">
                     <h2 className="text-xl font-black text-stone-100 leading-tight">{camino.name}</h2>
                     <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mt-1">
                       Objetivo: {camino.target || 100} {camino.unit || '%'}
                     </p>
                   </div>
                   <div className="absolute top-8 right-8 flex gap-1">
                     <button 
                       onClick={() => { setEditCaminoData(camino); setIsEditingCamino(true); }} 
                       className="p-2 text-stone-600 hover:text-blue-500 hover:bg-blue-900/20 rounded-full transition-colors"
                     >
                       <Edit2 className="w-5 h-5" />
                     </button>
                     <button 
                       onClick={() => { setSelectedCaminoId(null); setIsEditingCamino(false); setIdToDelete(camino.id); }} 
                       className="p-2 text-stone-600 hover:text-red-500 hover:bg-red-900/20 rounded-full transition-colors"
                     >
                       <Trash2 className="w-5 h-5" />
                     </button>
                   </div>
                 </div>

                 <div className="text-5xl font-black text-stone-100 mb-8 tracking-tighter">
                   {camino.progress} <span className="text-xl text-stone-500 ml-1 uppercase font-bold">{camino.unit || '%'}</span>
                 </div>

                 <div className="flex items-center gap-6 w-full justify-center mb-6">
                   <button 
                     onClick={() => updateProgress(camino.id, -1)}
                     className="w-16 h-16 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center hover:bg-stone-700 active:scale-90 transition-all shadow-md shrink-0"
                   >
                     <Minus className="w-8 h-8 text-stone-400" />
                   </button>
                   
                   <button 
                     onClick={() => updateProgress(camino.id, 1)}
                     className={`w-16 h-16 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-md shrink-0 bg-stone-200 text-stone-950 hover:bg-white`}
                   >
                     <Plus className="w-8 h-8" />
                   </button>
                 </div>
                 
                 <button onClick={() => { setSelectedCaminoId(null); setIsEditingCamino(false); }} className="mt-4 text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-300">Cerrar</button>
               </div>
             );
          })()}
        </div>
      )}
    </div>
  );
};
