import React, { useState, useEffect } from 'react';
import { Friend, FriendInteractions } from '../types';
import { ArrowLeft, Plus, Trash2, Heart, X, Check, BarChart2 } from 'lucide-react';

interface LoveTreeViewProps {
  friends: Friend[];
  onUpdate: (friends: Friend[]) => void;
  onBack: () => void;
}

export const LoveTreeView: React.FC<LoveTreeViewProps> = ({ friends, onUpdate, onBack }) => {
  const [newFriendName, setNewFriendName] = useState('');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset delete confirmation when selecting a different friend
  useEffect(() => {
      setShowDeleteConfirm(false);
  }, [selectedFriendId]);

  // Sort friends by total interactions (descending)
  const sortedFriends = [...friends].sort((a, b) => {
      const totalA = (Object.values(a.interactions) as number[]).reduce((acc, v) => acc + v, 0);
      const totalB = (Object.values(b.interactions) as number[]).reduce((acc, v) => acc + v, 0);
      return totalB - totalA;
  });

  const addFriend = () => {
    if (!newFriendName.trim()) return;
    const friend: Friend = {
      id: Date.now().toString(),
      name: newFriendName,
      lastInteraction: 0, // Default to Red (>90 days)
      interactions: { person: 0, call: 0, gift: 0, photo: 0, message: 0 },
      tasks: []
    };
    onUpdate([...friends, friend]);
    setNewFriendName('');
  };

  const recordInteraction = (id: string, type: keyof FriendInteractions) => {
    const updated = friends.map((f) =>
      f.id === id ? { 
          ...f, 
          lastInteraction: Date.now(),
          interactions: {
              ...f.interactions,
              [type]: f.interactions[type] + 1
          }
      } : f
    );
    onUpdate(updated);
  };

  const deleteFriend = (id: string) => {
    const updatedList = friends.filter((f) => f.id !== id);
    onUpdate(updatedList);
    setSelectedFriendId(null);
  };

  const addTask = (friendId: string) => {
      if(!newTaskInput.trim()) return;
      const updated = friends.map(f => {
          if (f.id === friendId) {
              return {
                  ...f,
                  tasks: [...f.tasks, { id: Date.now().toString(), text: newTaskInput }]
              }
          }
          return f;
      });
      onUpdate(updated);
      setNewTaskInput('');
  }

  const completeTask = (friendId: string, taskId: string) => {
      const updated = friends.map(f => {
          if (f.id === friendId) {
              return {
                  ...f,
                  tasks: f.tasks.filter(t => t.id !== taskId)
              }
          }
          return f;
      });
      onUpdate(updated);
  }

  const getDaysSince = (timestamp: number) => {
    if (timestamp === 0) return 999;
    
    const now = new Date();
    const last = new Date(timestamp);

    // Normalize dates to start of day (00:00:00) to calculate calendar day difference
    // This fixes the issue where <24h was considered "Today" even if it was yesterday
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const interactionDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());

    const diffTime = today.getTime() - interactionDay.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const getLeafColor = (days: number) => {
    if (days < 30) return '#22c55e'; // Green
    if (days < 60) return '#eab308'; // Yellow
    if (days < 90) return '#f97316'; // Orange
    return '#ef4444'; // Red (Danger)
  };

  const getLeafColorClass = (days: number) => {
    if (days < 30) return 'text-green-500';
    if (days < 60) return 'text-yellow-500';
    if (days < 90) return 'text-orange-500';
    return 'text-red-500';
  };
  
  const getStatusColor = (days: number) => {
      if (days < 30) return 'bg-green-600';
      if (days < 60) return 'bg-yellow-600';
      if (days < 90) return 'bg-orange-600';
      return 'bg-red-600';
  };

  const getDaysText = (days: number) => {
      if (days === 999) return 'Sin contacto previo';
      if (days === 0) return 'Hoy';
      if (days === 1) return 'Ayer';
      return `${days} días sin hablar`;
  };

  // Generate deterministic positions
  const getLeafPosition = (index: number, total: number) => {
    const seed = index * 137.5; 
    const r = 20 + (index % 5) * 15 + Math.random() * 10; 
    const theta = seed * (Math.PI / 180);
    
    const x = 150 + (r + (index * 2)) * Math.cos(theta); 
    const y = 100 + (r + (index * 1.5)) * Math.sin(theta) * 0.8;
    
    return { x: Math.max(50, Math.min(250, x)), y: Math.max(20, Math.min(180, y)) };
  };

  const selectedFriend = friends.find(f => f.id === selectedFriendId);
  const selectedFriendDays = selectedFriend ? getDaysSince(selectedFriend.lastInteraction) : 0;

  return (
    <div className="flex flex-col h-full bg-pink-950/20 relative">
      <div className="p-4 bg-stone-900 shadow-sm flex items-center gap-4 sticky top-0 z-10 border-b border-stone-800">
        <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full">
          <ArrowLeft className="w-6 h-6 text-pink-500" />
        </button>
        <h1 className="text-xl font-bold text-pink-200">Brotes</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Tree Visualization */}
        <div className="bg-stone-900 rounded-2xl shadow-sm border border-pink-900/50 mb-6 relative overflow-hidden h-80 flex items-center justify-center flex-shrink-0">
            <svg width="300" height="320" viewBox="0 0 300 320">
                <path d="M135,320 C135,320 140,240 140,200 C140,160 110,140 110,140" stroke="#3e2c26" strokeWidth="12" fill="none" />
                <path d="M165,320 C165,320 160,240 160,200 C160,160 190,140 190,140" stroke="#3e2c26" strokeWidth="12" fill="none" />
                <path d="M150,220 L150,320" stroke="#3e2c26" strokeWidth="20" />
                <path d="M150,200 L120,170" stroke="#3e2c26" strokeWidth="8" />
                <path d="M150,200 L180,170" stroke="#3e2c26" strokeWidth="8" />
                <path d="M150,240 L190,210" stroke="#3e2c26" strokeWidth="8" />
                
                {friends.map((friend, i) => {
                    const days = getDaysSince(friend.lastInteraction);
                    const pos = getLeafPosition(i, friends.length);
                    return (
                        <g key={friend.id} className="transition-opacity">
                            <circle 
                                cx={pos.x} 
                                cy={pos.y} 
                                r={12} 
                                fill={getLeafColor(days)}
                                stroke="none"
                            />
                        </g>
                    );
                })}
            </svg>
        </div>

        {/* Legend Removed */}

        {/* Ranked List View */}
        <div className="space-y-3 pb-8">
            <h3 className="font-bold text-stone-500 text-sm px-1">Ránking de Interacciones</h3>
             {sortedFriends.map(f => {
                 const total = (Object.values(f.interactions) as number[]).reduce((a, b) => a + b, 0);
                 const days = getDaysSince(f.lastInteraction);
                 const textColorClass = getLeafColorClass(days);
                 const bgStatusColor = getStatusColor(days);
                 
                 return (
                    <div 
                        key={f.id} 
                        onClick={() => setSelectedFriendId(f.id)} 
                        className="flex items-center justify-between p-4 bg-stone-900 rounded-3xl border border-stone-800 cursor-pointer active:scale-95 transition-all shadow-sm"
                    >
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-stone-950 font-bold text-xl shadow-lg ${bgStatusColor}`}>
                                {f.name.charAt(0).toUpperCase()}
                            </div>
                            
                            {/* Text Info */}
                            <div>
                                <h4 className="font-bold text-lg text-stone-100 leading-tight">{f.name}</h4>
                                <p className={`text-xs font-bold ${textColorClass}`}>
                                    {getDaysText(days)}
                                </p>
                            </div>
                        </div>

                        {/* Counter Badge */}
                        <div className="bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800 flex items-center gap-2 shadow-inner">
                            <BarChart2 className="w-4 h-4 text-stone-600" />
                            <span className="text-stone-300 font-mono font-bold">{total}</span>
                        </div>
                    </div>
                 )
             })}
             {friends.length === 0 && <p className="text-center text-stone-600 italic py-4">Añade amigos para verlos aquí.</p>}
        </div>

        {/* Add Friend */}
        <div className="bg-stone-900 rounded-2xl p-4 shadow-sm border border-stone-800 mb-6">
            <h3 className="font-bold text-stone-300 mb-3">Añadir al Círculo</h3>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newFriendName}
                    onChange={(e) => setNewFriendName(e.target.value)}
                    placeholder="Nombre..."
                    className="flex-1 px-4 py-2 rounded-xl border border-stone-700 focus:outline-none focus:ring-2 focus:ring-pink-500 bg-stone-950 text-stone-200 placeholder-stone-600"
                    onKeyDown={(e) => e.key === 'Enter' && addFriend()}
                />
                <button
                    onClick={addFriend}
                    className="bg-pink-700 text-white p-2 rounded-xl hover:bg-pink-600 transition-colors"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedFriend && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
             <div className="bg-stone-900 w-full max-w-sm rounded-3xl shadow-2xl border border-pink-900/30 overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-900">
                     <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-stone-950 font-bold text-lg ${getStatusColor(selectedFriendDays)}`}>
                            {selectedFriend.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-pink-200 text-lg truncate pr-4">{selectedFriend.name}</h3>
                            <p className={`text-xs font-bold ${getLeafColorClass(selectedFriendDays)}`}>
                                {getDaysText(selectedFriendDays)}
                            </p>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-4">
                         {/* Days Counter */}
                        <span className={`text-4xl font-black tracking-tighter ${getLeafColorClass(selectedFriendDays)}`}>
                             {selectedFriendDays === 999 ? '∞' : selectedFriendDays}
                        </span>
                        <button onClick={() => setSelectedFriendId(null)} className="p-1 hover:bg-stone-700 rounded-full">
                            <X className="w-6 h-6 text-stone-400" />
                        </button>
                     </div>
                 </div>
                 
                 <div className="p-4 flex-1 overflow-y-auto">
                    
                    {/* Interactions */}
                    <div className="mb-6">
                        <p className="text-stone-500 text-xs font-bold uppercase mb-3">Registrar Interacción</p>
                        <div className="grid grid-cols-5 gap-2">
                            <button onClick={() => recordInteraction(selectedFriend.id, 'person')} className="flex flex-col items-center justify-center gap-1 aspect-square bg-stone-950 rounded-2xl border border-stone-800 hover:border-pink-500 transition-colors">
                                <span className="text-2xl">🫂</span>
                                <span className="text-xs font-mono font-bold text-stone-400">{selectedFriend.interactions.person}</span>
                            </button>
                            <button onClick={() => recordInteraction(selectedFriend.id, 'call')} className="flex flex-col items-center justify-center gap-1 aspect-square bg-stone-950 rounded-2xl border border-stone-800 hover:border-pink-500 transition-colors">
                                <span className="text-2xl">📞</span>
                                <span className="text-xs font-mono font-bold text-stone-400">{selectedFriend.interactions.call}</span>
                            </button>
                            <button onClick={() => recordInteraction(selectedFriend.id, 'gift')} className="flex flex-col items-center justify-center gap-1 aspect-square bg-stone-950 rounded-2xl border border-stone-800 hover:border-pink-500 transition-colors">
                                <span className="text-2xl">🎁</span>
                                <span className="text-xs font-mono font-bold text-stone-400">{selectedFriend.interactions.gift}</span>
                            </button>
                            <button onClick={() => recordInteraction(selectedFriend.id, 'photo')} className="flex flex-col items-center justify-center gap-1 aspect-square bg-stone-950 rounded-2xl border border-stone-800 hover:border-pink-500 transition-colors">
                                <span className="text-2xl">📸</span>
                                <span className="text-xs font-mono font-bold text-stone-400">{selectedFriend.interactions.photo}</span>
                            </button>
                            <button onClick={() => recordInteraction(selectedFriend.id, 'message')} className="flex flex-col items-center justify-center gap-1 aspect-square bg-stone-950 rounded-2xl border border-stone-800 hover:border-pink-500 transition-colors">
                                <span className="text-2xl">💬</span>
                                <span className="text-xs font-mono font-bold text-stone-400">{selectedFriend.interactions.message}</span>
                            </button>
                        </div>
                    </div>

                    {/* Tasks */}
                    <div className="mb-6">
                        <p className="text-stone-500 text-xs font-bold uppercase mb-2">Cosas pendientes</p>
                        <div className="space-y-2">
                            {selectedFriend.tasks.map(task => (
                                <div key={task.id} className="flex items-center justify-between p-3 bg-stone-950 rounded-xl border border-stone-800">
                                    <span className="text-sm text-stone-300">{task.text}</span>
                                    <button 
                                        onClick={() => completeTask(selectedFriend.id, task.id)}
                                        className="text-stone-500 hover:text-green-500"
                                    >
                                        <Check className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                            <input
                                type="text"
                                value={newTaskInput}
                                onChange={(e) => setNewTaskInput(e.target.value)}
                                placeholder="Añadir pendiente..."
                                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-stone-200 focus:border-pink-900 outline-none"
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter') addTask(selectedFriend.id);
                                }}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-stone-800">
                        {showDeleteConfirm ? (
                           <div className="flex gap-2">
                               <button 
                                   onClick={() => setShowDeleteConfirm(false)}
                                   className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-400 hover:bg-stone-800 font-medium"
                               >
                                   Cancelar
                               </button>
                               <button 
                                   onClick={() => deleteFriend(selectedFriend.id)}
                                   className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 shadow-lg shadow-red-900/20"
                               >
                                   Confirmar
                               </button>
                           </div>
                        ) : (
                           <button 
                               onClick={() => setShowDeleteConfirm(true)}
                               className="w-full py-3 rounded-xl border border-red-900/30 text-red-600 hover:bg-red-950/20 flex items-center justify-center gap-2 font-medium"
                           >
                               <Trash2 className="w-4 h-4" /> Eliminar contacto
                           </button>
                        )}
                    </div>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};