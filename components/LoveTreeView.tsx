import React, { useState, useEffect } from 'react';
import { Friend, FriendInteractions, ReminderEvent } from '../types';
import { ArrowLeft, Plus, Trash2, Heart, X, Check, BarChart2, Edit2, Save, Clock } from 'lucide-react';
import { RemindersSection } from './RemindersSection';
import { useModalHistory } from '../hooks/useModalHistory';

interface LoveTreeViewProps {
  friends: Friend[];
  onUpdate: (friends: Friend[]) => void;
  onBack: () => void;
  reminders?: ReminderEvent[];
  onUpdateReminders?: (reminders: ReminderEvent[]) => void;
  sortBy?: 'interactions' | 'days';
  onSortChange?: (sortBy: 'interactions' | 'days') => void;
}

const DEFAULT_REMINDERS: ReminderEvent[] = [
  { id: '1', title: 'Nos casamos', date: '2022-05-22', notifyYearly: true, notifyMonthly: true, notify100Days: true },
  { id: '2', title: 'Empezamos a salir', date: '2017-05-24', notifyYearly: true, notifyMonthly: true, notify100Days: true },
  { id: '3', title: 'Nos fuimos a vivir juntos', date: '2017-09-04', notifyYearly: true, notifyMonthly: true, notify100Days: true },
  { id: '4', title: 'Empezó a trabajar', date: '2020-10-16', notifyYearly: true, notifyMonthly: true, notify100Days: true },
  { id: '5', title: 'En Hacienda', date: '2024-06-15', notifyYearly: true, notifyMonthly: true, notify100Days: true },
  { id: '6', title: 'Días Cotizados', date: '2020-07-18', notifyYearly: true, notifyMonthly: true, notify100Days: true },
  { id: '7', title: 'Santa Alicia', date: '2000-06-23', notifyYearly: true, notifyMonthly: false, notify100Days: false, hideAge: true },
  { id: '8', title: 'Cumpleaños Alicia', date: '1993-06-14', notifyYearly: true, notifyMonthly: false, notify100Days: false },
];

export const LoveTreeView: React.FC<LoveTreeViewProps> = ({ 
  friends, 
  onUpdate, 
  onBack, 
  reminders, 
  onUpdateReminders,
  sortBy = 'interactions',
  onSortChange
}) => {
  const [newFriendName, setNewFriendName] = useState('');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [isEditingFriend, setIsEditingFriend] = useState(false);
  const [editFriendName, setEditFriendName] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editInteractions, setEditInteractions] = useState<FriendInteractions>({ person: 0, call: 0, gift: 0, photo: 0, message: 0 });


  // Reset delete confirmation when selecting a different friend
  useEffect(() => {
    setShowDeleteConfirm(false);
    setIsEditingFriend(false);
  }, [selectedFriendId]);

  // --- MOBILE BACK BUTTON SUPPORT FOR MODALS ---
  useModalHistory(!!selectedFriendId, () => setSelectedFriendId(null), 'friendDetail');
  useModalHistory(isEditingFriend, () => setIsEditingFriend(false), 'editFriend');
  useModalHistory(showDeleteConfirm, () => setShowDeleteConfirm(false), 'confirmDeleteFriend');
  // ---------------------------------------------

  const getDaysSince = (timestamp: number) => {
    if (timestamp === 0) return 999;
    
    const now = new Date();
    const last = new Date(timestamp);

    // Normalize dates to start of day (00:00:00) to calculate calendar day difference
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const interactionDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());

    const diffTime = today.getTime() - interactionDay.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Sort friends by selected criteria
  const sortedFriends = [...friends].sort((a, b) => {
      if (sortBy === 'interactions') {
          const totalA = (Object.values(a.interactions) as number[]).reduce((acc, v) => acc + v, 0);
          const totalB = (Object.values(b.interactions) as number[]).reduce((acc, v) => acc + v, 0);
          return totalB - totalA;
      } else {
          const daysA = getDaysSince(a.lastInteraction);
          const daysB = getDaysSince(b.lastInteraction);
          return daysB - daysA;
      }
  });

  const regularFriends = sortedFriends.filter(f => !f.isSporadic);
  const sporadicFriends = sortedFriends.filter(f => f.isSporadic);

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

  const startEditingFriend = () => {
      const selectedFriend = friends.find(f => f.id === selectedFriendId);
      if (selectedFriend) {
          setEditFriendName(selectedFriend.name);
          setEditBirthday(selectedFriend.birthday || '');
          setEditInteractions({ ...selectedFriend.interactions });
          setIsEditingFriend(true);
      }
  };

  const saveFriendEdits = () => {
      const selectedFriend = friends.find(f => f.id === selectedFriendId);
      if (selectedFriend) {
          const updated = friends.map(f => {
              if (f.id === selectedFriend.id) {
                  return {
                      ...f,
                      name: editFriendName,
                      birthday: editBirthday,
                      interactions: editInteractions
                  };
              }
              return f;
          });
          onUpdate(updated);
          setIsEditingFriend(false);
      }
  };

  const toggleSporadic = (friendId: string) => {
      const updated = friends.map(f => 
          f.id === friendId ? { ...f, isSporadic: !f.isSporadic } : f
      );
      onUpdate(updated);
  };

  const formatBirthday = (birthdayStr?: string) => {
      if (!birthdayStr) return 'Sin fecha';
      const parts = birthdayStr.split('-');
      if (parts.length !== 3) return 'Sin fecha';
      const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
      const day = parseInt(parts[2]);
      const month = parseInt(parts[1]) - 1;
      return `${day} ${monthNames[month]}`;
  };

  const isBirthdayWeek = (birthdayStr?: string) => {
    if (!birthdayStr) return false;
    const now = new Date();
    const parts = birthdayStr.split('-');
    if (parts.length !== 3) return false;
    
    // Create comparison date using birthday month/day but CURRENT year
    const bMonth = parseInt(parts[1]) - 1;
    const bDay = parseInt(parts[2]);
    const bDate = new Date(now.getFullYear(), bMonth, bDay);
    
    // Get start of week (Monday)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0,0,0,0);
    
    // Get end of week (Sunday)
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);
    
    return bDate >= monday && bDate <= sunday;
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
    <div className="fixed inset-0 max-w-md mx-auto z-50 bg-stone-950 flex flex-col animate-in fade-in duration-200">
      <div className="p-4 bg-stone-900 shadow-sm flex items-center gap-4 border-b border-stone-800 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full">
          <ArrowLeft className="w-6 h-6 text-pink-500" />
        </button>
        <h1 className="text-xl font-bold text-pink-200">Brotes</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-pink-950/20">
        {/* Tree Visualization */}
        <div className="bg-stone-900 rounded-2xl shadow-sm border border-pink-900/50 mb-6 relative overflow-hidden h-80 flex items-center justify-center flex-shrink-0">
            <svg width="300" height="320" viewBox="0 0 300 320">
                <path d="M135,320 C135,320 140,240 140,200 C140,160 110,140 110,140" stroke="#3e2c26" strokeWidth="12" fill="none" />
                <path d="M165,320 C165,320 160,240 160,200 C160,160 190,140 190,140" stroke="#3e2c26" strokeWidth="12" fill="none" />
                <path d="M150,220 L150,320" stroke="#3e2c26" strokeWidth="20" />
                <path d="M150,200 L120,170" stroke="#3e2c26" strokeWidth="8" />
                <path d="M150,200 L180,170" stroke="#3e2c26" strokeWidth="8" />
                <path d="M150,240 L190,210" stroke="#3e2c26" strokeWidth="8" />
                
                {regularFriends.map((friend, i) => {
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

        {/* Reminders Section */}
        <RemindersSection 
          reminders={reminders || DEFAULT_REMINDERS} 
          onUpdateReminders={onUpdateReminders || (() => {})} 
        />

        {/* Ranked List View */}
        <div className="space-y-3 pb-8">
            <div className="flex items-center justify-between px-1 mb-2">
                <select 
                    value={sortBy}
                    onChange={(e) => onSortChange?.(e.target.value as 'interactions' | 'days')}
                    className="bg-stone-900 text-stone-300 text-sm font-bold border border-stone-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-pink-900 w-full"
                >
                    <option value="interactions">Orden por brotes</option>
                    <option value="days">Orden por días</option>
                </select>
            </div>
             {regularFriends.map(f => {
                 const total = (Object.values(f.interactions) as number[]).reduce((a, b) => a + b, 0);
                 const days = getDaysSince(f.lastInteraction);
                 const textColorClass = getLeafColorClass(days);
                 const bgStatusColor = getStatusColor(days);
                 const isBday = isBirthdayWeek(f.birthday);
                 
                 return (
                    <div 
                        key={f.id} 
                        onClick={() => setSelectedFriendId(f.id)} 
                        className={`flex items-center justify-between p-4 rounded-3xl border cursor-pointer active:scale-95 transition-all shadow-sm ${
                            isBday 
                                ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 border-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.4)] text-stone-950' 
                                : 'bg-stone-900 border-stone-800 text-stone-100'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shadow-lg ${
                                isBday ? 'bg-stone-950 text-yellow-500' : bgStatusColor + ' text-stone-950'
                            }`}>
                                {f.name.charAt(0).toUpperCase()}
                            </div>
                            
                            {/* Text Info */}
                            <div>
                                <h4 className={`font-bold text-lg leading-tight flex items-center gap-2 ${isBday ? 'text-stone-950' : 'text-stone-100'}`}>
                                    {f.name}
                                    {isBday && <span>🎂</span>}
                                </h4>
                                <p className={`text-xs font-bold ${isBday ? 'text-stone-800/80' : 'text-stone-500'}`}>
                                    {total} brotes
                                </p>
                            </div>
                        </div>

                        {/* Counter Badge */}
                        <div className={`px-3 py-1.5 rounded-xl border flex flex-col items-center justify-center shadow-inner ${
                            isBday ? 'bg-stone-950/20 border-yellow-700/30' :
                            days <= 7 ? 'bg-emerald-950/30 border-emerald-900/50' :
                            days <= 14 ? 'bg-yellow-950/30 border-yellow-900/50' :
                            days <= 30 ? 'bg-orange-950/30 border-orange-900/50' :
                            'bg-red-950/30 border-red-900/50'
                        }`}>
                            <span className={`text-lg font-black leading-none ${isBday ? 'text-stone-950' : textColorClass}`}>{days}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${isBday ? 'text-stone-900/60' : textColorClass + ' opacity-70'}`}>días</span>
                        </div>
                    </div>
                 )
             })}

             {sporadicFriends.length > 0 && (
                <>
                    <h3 className="font-bold text-stone-500 text-xs uppercase mt-8 mb-3 px-1">Contactos Esporádicos</h3>
                    {sporadicFriends.map(f => {
                        const total = (Object.values(f.interactions) as number[]).reduce((a, b) => a + b, 0);
                        const days = getDaysSince(f.lastInteraction);
                        const textColorClass = getLeafColorClass(days);
                        const bgStatusColor = getStatusColor(days);
                        const isBday = isBirthdayWeek(f.birthday);
                        
                        return (
                            <div 
                                key={f.id} 
                                onClick={() => setSelectedFriendId(f.id)} 
                                className={`flex items-center justify-between p-4 rounded-3xl border cursor-pointer active:scale-95 transition-all shadow-sm ${
                                    isBday 
                                        ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 border-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.4)] text-stone-950' 
                                        : 'bg-stone-900 border-stone-800 text-stone-100 opacity-60'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shadow-lg ${
                                        isBday ? 'bg-stone-950 text-yellow-500' : bgStatusColor + ' text-stone-950'
                                    }`}>
                                        {f.name.charAt(0).toUpperCase()}
                                    </div>
                                    
                                    {/* Text Info */}
                                    <div>
                                        <h4 className={`font-bold text-lg leading-tight flex items-center gap-2 ${isBday ? 'text-stone-950' : 'text-stone-100'}`}>
                                            {f.name}
                                            {isBday && <span>🎂</span>}
                                        </h4>
                                        <p className={`text-xs font-bold ${isBday ? 'text-stone-800/80' : 'text-stone-500'}`}>
                                            {total} brotes
                                        </p>
                                    </div>
                                </div>

                                {/* Counter Badge */}
                                <div className={`px-3 py-1.5 rounded-xl border flex flex-col items-center justify-center shadow-inner ${
                                    isBday ? 'bg-stone-950/20 border-yellow-700/30' :
                                    days <= 7 ? 'bg-emerald-950/30 border-emerald-900/50' :
                                    days <= 14 ? 'bg-yellow-950/30 border-yellow-900/50' :
                                    days <= 30 ? 'bg-orange-950/30 border-orange-900/50' :
                                    'bg-red-950/30 border-red-900/50'
                                }`}>
                                    <span className={`text-lg font-black leading-none ${isBday ? 'text-stone-950' : textColorClass}`}>{days}</span>
                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isBday ? 'text-stone-900/60' : textColorClass + ' opacity-70'}`}>días</span>
                                </div>
                            </div>
                        )
                    })}
                </>
             )}
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

      {/* Detail Modal - Changed from absolute to fixed */}
      {selectedFriend && (
        <div 
          className="fixed inset-0 max-w-md mx-auto z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => { setSelectedFriendId(null); setIsEditingFriend(false); setShowDeleteConfirm(false); }}
        >
             <div 
               className="bg-stone-900 w-full max-w-sm rounded-3xl shadow-2xl border border-pink-900/30 overflow-hidden flex flex-col max-h-[90vh]"
               onClick={(e) => e.stopPropagation()}
             >
                 <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-900">
                     <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-stone-950 font-bold text-lg ${isBirthdayWeek(selectedFriend.birthday) ? "bg-yellow-500" : getStatusColor(selectedFriendDays)}`}>
                            {selectedFriend.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            {isEditingFriend ? (
                                <div className="flex flex-col gap-1">
                                    <input 
                                        value={editFriendName}
                                        onChange={e => setEditFriendName(e.target.value)}
                                        className="bg-stone-950 border border-stone-700 rounded px-2 py-1 text-pink-200 font-bold w-full outline-none"
                                        placeholder="Nombre"
                                    />
                                    <input 
                                        type="date"
                                        value={editBirthday}
                                        onChange={e => setEditBirthday(e.target.value)}
                                        className="bg-stone-950 border border-stone-700 rounded px-2 py-1 text-stone-400 text-xs w-full outline-none"
                                    />
                                </div>
                            ) : (
                                <h3 className="font-bold text-pink-200 text-lg truncate pr-4">
                                    {selectedFriend.name}
                                    {isBirthdayWeek(selectedFriend.birthday) && <span className="ml-2">🎂</span>}
                                </h3>
                            )}
                            <p className="text-xs font-bold text-stone-500 uppercase">
                                {formatBirthday(selectedFriend.birthday)}
                            </p>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-2">
                         {/* Days Counter */}
                        <span className={`text-4xl font-black tracking-tighter ${getLeafColorClass(selectedFriendDays)}`}>
                             {selectedFriendDays === 999 ? '∞' : selectedFriendDays}
                        </span>
                        {isEditingFriend ? (
                            <button onClick={saveFriendEdits} className="p-1 hover:bg-stone-700 rounded-full ml-2">
                                <Save className="w-5 h-5 text-green-500" />
                            </button>
                        ) : (
                            <button onClick={startEditingFriend} className="p-1 hover:bg-stone-700 rounded-full ml-2">
                                <Edit2 className="w-5 h-5 text-stone-400" />
                            </button>
                        )}
                        <button onClick={() => { setSelectedFriendId(null); setIsEditingFriend(false); }} className="p-1 hover:bg-stone-700 rounded-full">
                            <X className="w-6 h-6 text-stone-400" />
                        </button>
                     </div>
                 </div>
                 
                 <div className="p-4 flex-1 overflow-y-auto">
                    
                    {/* Interactions */}
                    <div className="mb-6">
                        <p className="text-stone-500 text-xs font-bold uppercase mb-3">Registrar Interacción</p>
                        <div className="grid grid-cols-5 gap-2">
                            {(['person', 'call', 'gift', 'photo', 'message'] as const).map((type) => {
                                const icons: Record<string, string> = { person: '🫂', call: '📞', gift: '🎁', photo: '📸', message: '💬' };
                                return (
                                    <div key={type} className="flex flex-col items-center justify-center gap-1 aspect-square bg-stone-950 rounded-2xl border border-stone-800 hover:border-pink-500 transition-colors relative">
                                        {isEditingFriend ? (
                                            <>
                                                <span className="text-xl">{icons[type]}</span>
                                                <input 
                                                    type="number" 
                                                    value={editInteractions[type]}
                                                    onChange={e => setEditInteractions({...editInteractions, [type]: Math.max(0, parseInt(e.target.value) || 0)})}
                                                    className="w-10 bg-stone-900 text-center text-xs font-mono font-bold text-stone-200 rounded outline-none border border-stone-700"
                                                />
                                            </>
                                        ) : (
                                            <button onClick={() => recordInteraction(selectedFriend.id, type)} className="w-full h-full flex flex-col items-center justify-center gap-1">
                                                <span className="text-2xl">{icons[type]}</span>
                                                <span className="text-xs font-mono font-bold text-stone-400">{selectedFriend.interactions[type]}</span>
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
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

                    <div className="pt-4 border-t border-stone-800 flex gap-2">
                        <button 
                            onClick={() => toggleSporadic(selectedFriend.id)}
                            className={`w-14 h-14 rounded-xl border flex items-center justify-center transition-colors ${
                                selectedFriend.isSporadic ? 'bg-pink-900/40 border-pink-500 text-pink-500' : 'bg-stone-950 border-stone-800 text-stone-500 hover:border-stone-600'
                            }`}
                        >
                            <Clock className="w-6 h-6" />
                        </button>
                        
                        {showDeleteConfirm ? (
                           <div className="flex-1 flex gap-2">
                               <button 
                                   onClick={() => setShowDeleteConfirm(false)}
                                   className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-400 hover:bg-stone-800 font-medium"
                               >
                                   Cancelar
                               </button>
                               <button 
                                   onClick={() => deleteFriend(selectedFriend.id)}
                                   className="bg-red-600 text-white px-4 rounded-xl font-bold hover:bg-red-500 shadow-lg shadow-red-900/20"
                               >
                                   Borrar
                               </button>
                           </div>
                        ) : (
                           <button 
                               onClick={() => setShowDeleteConfirm(true)}
                               className="flex-1 py-3 rounded-xl border border-red-900/30 text-red-600 hover:bg-red-950/20 flex items-center justify-center gap-2 font-medium"
                           >
                               <Trash2 className="w-4 h-4" /> Eliminar
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