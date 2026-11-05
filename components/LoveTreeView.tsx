import React, { useState, useEffect } from 'react';
import { Friend, FriendInteractions, FriendOrbit, ReminderEvent } from '../types';
import { ArrowLeft, Plus, Trash2, X, Check, Edit2, Save, Clock, Shuffle } from 'lucide-react';
import { RemindersSection } from './RemindersSection';
import { useModalHistory } from '../hooks/useModalHistory';

interface LoveTreeViewProps {
  friends: Friend[];
  onUpdate: (friends: Friend[]) => void;
  onBack: () => void;
  reminders?: ReminderEvent[];
  onUpdateReminders?: (reminders: ReminderEvent[]) => void;
  sortBy?: 'interactions' | 'days' | 'urgency';
  onSortChange?: (sortBy: 'interactions' | 'days' | 'urgency') => void;
  onInteractionLogged?: () => void;
}

const DEFAULT_REMINDERS: ReminderEvent[] = [
  { id: '1', title: 'Nos casamos', date: '2022-05-22', notifyYearly: true, notifyMonthly: true, notify100Days: true },
  { id: '2', title: 'Empezamos a salir', date: '2017-05-24', notifyYearly: true, notifyMonthly: true, notify100Days: true },
  { id: '3', title: 'Nos fuimos a vivir juntos', date: '2017-09-04', notifyYearly: true, notifyMonthly: true, notify100Days: true },
  { id: '5', title: 'En Hacienda', date: '2024-07-15', notifyYearly: true, notifyMonthly: true, notify100Days: true },
  { id: '6', title: 'Días Cotizados', date: '2020-07-18', notifyYearly: true, notifyMonthly: true, notify100Days: true },
  { id: '7', title: 'Santa Alicia', date: '2000-06-23', notifyYearly: true, notifyMonthly: false, notify100Days: false, hideAge: true },
  { id: '8', title: 'Cumpleaños Alicia', date: '1993-06-14', notifyYearly: true, notifyMonthly: false, notify100Days: false },
];

export const ORBIT_CONFIG: Record<FriendOrbit, { label: string; shortLabel: string; emoji: string; green: number; yellow: number; orange: number; deepCap: number }> = {
  hogar: { label: 'Hogar', shortLabel: 'Hogar', emoji: '🏠', green: 14, yellow: 30, orange: 45, deepCap: 0 },
  intimo: { label: 'Íntimo', shortLabel: 'Íntimos', emoji: '🔥', green: 21, yellow: 42, orange: 60, deepCap: 45 },
  cercano: { label: 'Cercano', shortLabel: 'Cercanos', emoji: '🌿', green: 45, yellow: 75, orange: 105, deepCap: 90 },
  estacional: { label: 'Estacional', shortLabel: 'Estacional', emoji: '🍂', green: 90, yellow: 150, orange: 210, deepCap: 0 },
};

const MICRO_ACTIONS_DEFAULT = [
  'Mandarle un audio corto de 45s contándole una escena real de tu semana (cero «qué tal todo»).',
  'Llamada espontánea de 5 minutos caminando en la calle, con cierre limpio al llegar a tu destino.',
  'Mandarle foto directa de un libro, plato o rincón que te haya acordado a él/ella hoy.',
  'Proponer café, paseo o quedada concreta con día y hora cerrados.',
  'Escribirle dos líneas rescatando un recuerdo común concreto.'
];

export const getEffectiveOrbit = (friend: Friend): FriendOrbit => {
  if (friend.orbit && ORBIT_CONFIG[friend.orbit]) return friend.orbit;
  return friend.isSporadic ? 'estacional' : 'cercano';
};

export const getDaysSinceTimestamp = (timestamp?: number): number => {
  if (!timestamp || timestamp <= 0) return 999;
  const now = new Date();
  const last = new Date(timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const interactionDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
  const diffTime = today.getTime() - interactionDay.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
};

export type HealthLevel = 'green' | 'yellow' | 'orange' | 'red';

export const evaluateFriendHealth = (friend: Friend) => {
  const orbit = getEffectiveOrbit(friend);
  const cfg = ORBIT_CONFIG[orbit];
  const days = getDaysSinceTimestamp(friend.lastInteraction);

  const deepTs = Math.max(
    friend.lastInteractions?.person || 0,
    friend.lastInteractions?.call || 0,
    friend.lastInteractions?.gift || 0
  );
  const deepDays = deepTs > 0 ? getDaysSinceTimestamp(deepTs) : 999;

  let level: HealthLevel = 'red';
  if (days < cfg.green) level = 'green';
  else if (days < cfg.yellow) level = 'yellow';
  else if (days < cfg.orange) level = 'orange';

  // Doble Savia: 💬/📸 sí resetea días y quita rojo/naranja, pero si lleva demasiado sin voz/presencia queda en ámbar
  const voiceDebt = cfg.deepCap > 0 && deepDays > cfg.deepCap;
  if (voiceDebt && level === 'green') {
    level = 'yellow';
  }

  const urgencyScore = (days === 999 ? 4 : days / cfg.green) + (voiceDebt ? 0.35 : 0);

  return { orbit, cfg, days, deepDays, voiceDebt, level, urgencyScore };
};

export const LoveTreeView: React.FC<LoveTreeViewProps> = ({
  friends,
  onUpdate,
  onBack,
  reminders,
  onUpdateReminders,
  sortBy = 'urgency',
  onSortChange,
  onInteractionLogged
}) => {
  const [newFriendName, setNewFriendName] = useState('');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orbitFilter, setOrbitFilter] = useState<'all' | FriendOrbit>('all');
  const [roulettePick, setRoulettePick] = useState<{ friendId: string; action: string } | null>(null);

  const [isEditingFriend, setIsEditingFriend] = useState(false);
  const [editFriendName, setEditFriendName] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editOrbit, setEditOrbit] = useState<FriendOrbit>('cercano');
  const [editInteractions, setEditInteractions] = useState<FriendInteractions>({ person: 0, call: 0, gift: 0, photo: 0, message: 0 });

  useEffect(() => {
    setShowDeleteConfirm(false);
    setIsEditingFriend(false);
  }, [selectedFriendId]);

  // --- MOBILE BACK BUTTON SUPPORT FOR MODALS ---
  useModalHistory(!!selectedFriendId, () => setSelectedFriendId(null), 'friendDetail');
  useModalHistory(isEditingFriend, () => setIsEditingFriend(false), 'editFriend');
  useModalHistory(showDeleteConfirm, () => setShowDeleteConfirm(false), 'confirmDeleteFriend');
  // ---------------------------------------------

  const sortedFriends = [...friends].sort((a, b) => {
    if (sortBy === 'interactions') {
      const totalA = (Object.values(a.interactions) as number[]).reduce((acc, v) => acc + v, 0);
      const totalB = (Object.values(b.interactions) as number[]).reduce((acc, v) => acc + v, 0);
      return totalB - totalA;
    }
    if (sortBy === 'days') {
      return getDaysSinceTimestamp(b.lastInteraction) - getDaysSinceTimestamp(a.lastInteraction);
    }
    const healthA = evaluateFriendHealth(a);
    const healthB = evaluateFriendHealth(b);
    return healthB.urgencyScore - healthA.urgencyScore;
  });

  const filteredFriends = orbitFilter === 'all'
    ? sortedFriends
    : sortedFriends.filter(f => getEffectiveOrbit(f) === orbitFilter);

  const regularFriends = filteredFriends.filter(f => !f.isSporadic);
  const sporadicFriends = filteredFriends.filter(f => f.isSporadic);

  const treeRegularFriends = sortedFriends.filter(f => !f.isSporadic);
  const treeSporadicFriends = sortedFriends.filter(f => f.isSporadic);

  const spinRoulette = () => {
    const nonHogar = friends.filter(f => getEffectiveOrbit(f) !== 'hogar');
    if (nonHogar.length === 0) return;

    const overduePool = nonHogar.filter(f => {
      const h = evaluateFriendHealth(f);
      return h.level !== 'green' || h.voiceDebt;
    });
    const pool = overduePool.length > 0 ? overduePool : nonHogar;
    const candidates = pool.length > 1 && roulettePick
      ? pool.filter(f => f.id !== roulettePick.friendId)
      : pool;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const lowerName = chosen.name.toLowerCase();

    let action = MICRO_ACTIONS_DEFAULT[Math.floor(Math.random() * MICRO_ACTIONS_DEFAULT.length)];
    if (lowerName === 'mama' || lowerName === 'mamá' || chosen.slug === 'mama') {
      action = 'Acercarte un rato al cementerio, llevarle flores o dedicarle un gesto tranquilo hoy.';
    } else if (lowerName === 'pepe' || chosen.slug === 'pepe') {
      action = 'Llamar a Maruja y pedirle que se ponga Pepe un minuto al teléfono para escuchar tu voz.';
    } else if (chosen.tasks && chosen.tasks.length > 0) {
      action = `Resolver su pendiente apuntado: «${chosen.tasks[0].text}».`;
    }

    setRoulettePick({ friendId: chosen.id, action });
  };

  const addFriend = () => {
    if (!newFriendName.trim()) return;
    const friend: Friend = {
      id: Date.now().toString(),
      name: newFriendName.trim(),
      orbit: 'cercano',
      lastInteraction: 0,
      interactions: { person: 0, call: 0, gift: 0, photo: 0, message: 0 },
      tasks: []
    };
    onUpdate([...friends, friend]);
    setNewFriendName('');
  };

  const formatDaysAgo = (timestamp?: number) => {
    if (!timestamp) return '—';
    const days = getDaysSinceTimestamp(timestamp);
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days > 365) return '+1 año';
    return `${days}d`;
  };

  const formatDateTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const day = d.getDate().toString().padStart(2, '0');
    const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const month = monthNames[d.getMonth()];
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} · ${hours}:${mins} h`;
  };

  const recordInteraction = (id: string, type: keyof FriendInteractions) => {
    const now = Date.now();
    const newEntry = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      timestamp: now
    };
    const updated = friends.map((f) =>
      f.id === id ? {
        ...f,
        lastInteraction: now,
        interactions: {
          ...f.interactions,
          [type]: (f.interactions[type] || 0) + 1
        },
        lastInteractions: {
          ...(f.lastInteractions || {}),
          [type]: now
        },
        history: [
          newEntry,
          ...(f.history || [])
        ]
      } : f
    );
    onUpdate(updated);
    onInteractionLogged?.();
  };

  const deleteInteractionEntry = (friendId: string, entryId: string, type: keyof FriendInteractions) => {
    const updated = friends.map((f) => {
      if (f.id !== friendId) return f;
      const newHistory = (f.history || []).filter(e => e.id !== entryId);
      const newCount = Math.max(0, (f.interactions[type] || 0) - 1);
      const sameTypeEntries = newHistory.filter(e => e.type === type);
      const newLastForType = sameTypeEntries.length > 0 ? Math.max(...sameTypeEntries.map(e => e.timestamp)) : 0;
      const newLastOverall = newHistory.length > 0 ? Math.max(...newHistory.map(e => e.timestamp)) : f.lastInteraction;
      return {
        ...f,
        lastInteraction: newLastOverall,
        interactions: {
          ...f.interactions,
          [type]: newCount
        },
        lastInteractions: {
          ...(f.lastInteractions || {}),
          [type]: newLastForType || undefined
        },
        history: newHistory
      };
    });
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
      setEditOrbit(getEffectiveOrbit(selectedFriend));
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
            name: editFriendName.trim() || f.name,
            birthday: editBirthday,
            orbit: editOrbit,
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
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10) - 1;
    if (isNaN(day) || isNaN(month) || month < 0 || month > 11) return 'Sin fecha';
    return `${day} ${monthNames[month]}`;
  };

  const isBirthdayWeek = (birthdayStr?: string) => {
    if (!birthdayStr) return false;
    const now = new Date();
    const parts = birthdayStr.split('-');
    if (parts.length !== 3) return false;

    const bMonth = parseInt(parts[1], 10) - 1;
    const bDay = parseInt(parts[2], 10);
    if (isNaN(bMonth) || isNaN(bDay)) return false;
    const bDate = new Date(now.getFullYear(), bMonth, bDay);

    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);

    return bDate >= monday && bDate <= sunday;
  };

  const addTask = (friendId: string) => {
    if (!newTaskInput.trim()) return;
    const updated = friends.map(f => {
      if (f.id === friendId) {
        return {
          ...f,
          tasks: [...f.tasks, { id: Date.now().toString(), text: newTaskInput.trim() }]
        };
      }
      return f;
    });
    onUpdate(updated);
    setNewTaskInput('');
  };

  const completeTask = (friendId: string, taskId: string) => {
    const updated = friends.map(f => {
      if (f.id === friendId) {
        return {
          ...f,
          tasks: f.tasks.filter(t => t.id !== taskId)
        };
      }
      return f;
    });
    onUpdate(updated);
  };

  const levelHex = (level: HealthLevel) => {
    if (level === 'green') return '#22c55e';
    if (level === 'yellow') return '#eab308';
    if (level === 'orange') return '#f97316';
    return '#ef4444';
  };

  const levelTextClass = (level: HealthLevel) => {
    if (level === 'green') return 'text-green-500';
    if (level === 'yellow') return 'text-yellow-500';
    if (level === 'orange') return 'text-orange-500';
    return 'text-red-500';
  };

  const levelBgClass = (level: HealthLevel) => {
    if (level === 'green') return 'bg-green-600';
    if (level === 'yellow') return 'bg-yellow-600';
    if (level === 'orange') return 'bg-orange-600';
    return 'bg-red-600';
  };

  const levelBadgeBoxClass = (level: HealthLevel) => {
    if (level === 'green') return 'bg-emerald-950/30 border-emerald-900/50';
    if (level === 'yellow') return 'bg-yellow-950/30 border-yellow-900/50';
    if (level === 'orange') return 'bg-orange-950/30 border-orange-900/50';
    return 'bg-red-950/30 border-red-900/50';
  };

  const getLeafPosition = (index: number) => {
    const seed = index * 137.5;
    const r = 20 + (index % 5) * 15 + ((index * 7) % 10);
    const theta = seed * (Math.PI / 180);
    const x = 150 + (r + (index * 2)) * Math.cos(theta);
    const y = 100 + (r + (index * 1.5)) * Math.sin(theta) * 0.8;
    return { x: Math.max(50, Math.min(250, x)), y: Math.max(20, Math.min(180, y)) };
  };

  const selectedFriend = friends.find(f => f.id === selectedFriendId);
  const selectedHealth = selectedFriend ? evaluateFriendHealth(selectedFriend) : null;
  const rouletteFriend = roulettePick ? friends.find(f => f.id === roulettePick.friendId) : null;

  return (
    <div className="fixed inset-0 max-w-md mx-auto z-50 bg-stone-950 flex flex-col animate-in fade-in duration-200 lg:my-6 lg:rounded-3xl lg:border lg:border-stone-800 lg:shadow-[0_0_60px_rgba(0,0,0,0.85)] overflow-hidden">
      <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between gap-4 border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full" aria-label="Volver">
            <ArrowLeft className="w-6 h-6 text-pink-500" />
          </button>
          <h1 className="text-xl font-bold text-pink-200">Brotes</h1>
        </div>
        <button
          type="button"
          onClick={spinRoulette}
          className="px-3 py-1.5 rounded-xl bg-pink-950/60 border border-pink-800/60 hover:border-pink-500 text-pink-200 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <Shuffle className="w-3.5 h-3.5 text-pink-400" />
          Comodín
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-28 bg-pink-950/20">
        {/* Ruleta de Comodines Card (when active) */}
        {rouletteFriend && roulettePick && (
          <div className="bg-stone-900/95 border border-pink-700/50 rounded-2xl p-4 mb-4 shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-pink-400">
                🎲 Comodín de Savia · {ORBIT_CONFIG[getEffectiveOrbit(rouletteFriend)].emoji} {ORBIT_CONFIG[getEffectiveOrbit(rouletteFriend)].label}
              </span>
              <button
                type="button"
                onClick={() => setRoulettePick(null)}
                className="text-stone-500 hover:text-stone-300 p-0.5"
                aria-label="Cerrar comodín"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-base font-bold text-stone-100 mb-1">
              {rouletteFriend.name} <span className="text-xs font-mono text-stone-400">({evaluateFriendHealth(rouletteFriend).days === 999 ? 'sin fecha' : `${evaluateFriendHealth(rouletteFriend).days}d`})</span>
            </p>
            <p className="text-xs text-stone-300 leading-relaxed mb-3">
              {roulettePick.action}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedFriendId(rouletteFriend.id)}
                className="flex-1 py-2 rounded-xl bg-pink-700 hover:bg-pink-600 text-white text-xs font-bold transition-colors"
              >
                Abrir ficha y registrar
              </button>
              <button
                type="button"
                onClick={spinRoulette}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors"
              >
                Otro giro
              </button>
            </div>
          </div>
        )}

        {/* Tree Visualization */}
        <div className="bg-stone-900 rounded-2xl shadow-sm border border-pink-900/50 mb-6 relative overflow-hidden h-72 flex items-center justify-center flex-shrink-0">
          <svg width="300" height="320" viewBox="0 0 300 320" aria-hidden="true">
            <path d="M135,320 C135,320 140,240 140,200 C140,160 110,140 110,140" stroke="#3e2c26" strokeWidth="12" fill="none" />
            <path d="M165,320 C165,320 160,240 160,200 C160,160 190,140 190,140" stroke="#3e2c26" strokeWidth="12" fill="none" />
            <path d="M150,220 L150,320" stroke="#3e2c26" strokeWidth="20" />
            <path d="M150,200 L120,170" stroke="#3e2c26" strokeWidth="8" />
            <path d="M150,200 L180,170" stroke="#3e2c26" strokeWidth="8" />
            <path d="M150,240 L190,210" stroke="#3e2c26" strokeWidth="8" />

            {treeRegularFriends.map((friend, i) => {
              const health = evaluateFriendHealth(friend);
              const pos = getLeafPosition(i);
              const path = `M ${pos.x} ${pos.y - 24} Q ${pos.x + 24} ${pos.y} ${pos.x} ${pos.y + 24} Q ${pos.x - 24} ${pos.y} ${pos.x} ${pos.y - 24}`;
              return (
                <g key={friend.id} className="transition-opacity opacity-80">
                  <path
                    d={path}
                    fill={levelHex(health.level)}
                    transform={`rotate(${i * 45}, ${pos.x}, ${pos.y})`}
                  />
                </g>
              );
            })}
            {treeSporadicFriends.map((friend, i) => {
              const health = evaluateFriendHealth(friend);
              const pos = getLeafPosition(treeRegularFriends.length + i);
              const path = `M ${pos.x} ${pos.y - 12} Q ${pos.x + 12} ${pos.y} ${pos.x} ${pos.y + 12} Q ${pos.x - 12} ${pos.y} ${pos.x} ${pos.y - 12}`;
              return (
                <g key={friend.id} className="transition-opacity opacity-55">
                  <path
                    d={path}
                    fill={levelHex(health.level)}
                    transform={`rotate(${i * 45 + 20}, ${pos.x}, ${pos.y})`}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Reminders Section (Alicia + Upcoming 7-day Friend Birthdays) */}
        <RemindersSection
          reminders={reminders || DEFAULT_REMINDERS}
          onUpdateReminders={onUpdateReminders || (() => {})}
          friends={friends}
        />

        {/* Orbit Filter Pills + Sort Select */}
        <div className="space-y-3 pb-8">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {([
              { key: 'all', label: 'Todas' },
              { key: 'intimo', label: '🔥 Íntimos' },
              { key: 'cercano', label: '🌿 Cercanos' },
              { key: 'estacional', label: '🍂 Estacional' },
              { key: 'hogar', label: '🏠 Hogar' },
            ] as const).map(opt => {
              const active = orbitFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setOrbitFilter(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${
                    active
                      ? 'bg-pink-700 border-pink-500 text-white'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-1 mb-2">
            <select
              value={sortBy}
              aria-label="Ordenar personas"
              onChange={(e) => onSortChange?.(e.target.value as 'interactions' | 'days' | 'urgency')}
              className="bg-stone-900 text-stone-300 text-sm font-bold border border-stone-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-pink-900 w-full"
            >
              <option value="urgency">Orden por urgencia (órbita)</option>
              <option value="days">Orden por días sin contacto</option>
              <option value="interactions">Orden por total de brotes</option>
            </select>
          </div>

          {regularFriends.map(f => {
            const total = (Object.values(f.interactions) as number[]).reduce((a, b) => a + b, 0);
            const health = evaluateFriendHealth(f);
            const textColorClass = levelTextClass(health.level);
            const bgStatusColor = levelBgClass(health.level);
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
                <div className="flex items-center gap-4 min-w-0">
                  {/* Avatar */}
                  <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-bold text-xl shadow-lg ${
                    isBday ? 'bg-stone-950 text-yellow-500' : bgStatusColor + ' text-stone-950'
                  }`}>
                    {f.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Text Info */}
                  <div className="min-w-0">
                    <h4 className={`font-bold text-lg leading-tight flex items-center gap-1.5 ${isBday ? 'text-stone-950' : 'text-stone-100'}`}>
                      <span className="truncate">{f.name}</span>
                      <span className="text-xs opacity-75 shrink-0" title={`Órbita ${health.cfg.label}`}>{health.cfg.emoji}</span>
                      {isBday && <span className="shrink-0">🎂</span>}
                    </h4>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-bold ${isBday ? 'text-stone-800/80' : 'text-stone-500'}`}>
                          {total} brotes
                        </p>
                        {health.voiceDebt && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            isBday ? 'bg-stone-950/20 text-stone-900' : 'bg-yellow-950/60 text-yellow-400 border border-yellow-800/50'
                          }`}>
                            🫂 voz {health.deepDays === 999 ? 'pend.' : `${health.deepDays}d`}
                          </span>
                        )}
                      </div>
                      {f.lastInteractions && (
                        <div className={`flex items-center gap-1.5 text-[10px] font-medium mt-0.5 ${isBday ? 'text-stone-900/75' : 'text-stone-400'}`}>
                          {f.lastInteractions.person ? <span>🫂 {formatDaysAgo(f.lastInteractions.person)}</span> : null}
                          {f.lastInteractions.call ? <span>📞 {formatDaysAgo(f.lastInteractions.call)}</span> : null}
                          {f.lastInteractions.message ? <span>💬 {formatDaysAgo(f.lastInteractions.message)}</span> : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Counter Badge */}
                <div className={`px-3 py-1.5 rounded-xl border flex flex-col items-center justify-center shadow-inner shrink-0 ${
                  isBday ? 'bg-stone-950/20 border-yellow-700/30' : levelBadgeBoxClass(health.level)
                }`}>
                  <span className={`text-lg font-black leading-none ${isBday ? 'text-stone-950' : textColorClass}`}>
                    {health.days === 999 ? '∞' : health.days}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isBday ? 'text-stone-900/60' : textColorClass + ' opacity-70'}`}>días</span>
                </div>
              </div>
            );
          })}

          {sporadicFriends.length > 0 && (
            <>
              <h3 className="font-bold text-stone-500 text-xs uppercase mt-8 mb-3 px-1">Yemas · Estacional</h3>
              <div className="grid grid-cols-2 gap-3 pb-8">
                {sporadicFriends.map(f => {
                  const health = evaluateFriendHealth(f);
                  const bgStatusColor = levelBgClass(health.level);
                  const textColorClass = levelTextClass(health.level);
                  const isBday = isBirthdayWeek(f.birthday);

                  return (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => setSelectedFriendId(f.id)}
                      className={`flex items-center justify-between gap-2 p-2 rounded-2xl border cursor-pointer active:scale-95 transition-all shadow-sm ${
                        isBday
                          ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 border-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.3)] text-stone-950'
                          : 'bg-stone-900 border-stone-800 text-stone-100 opacity-85'
                      }`}
                    >
                      <div className={`flex-1 py-2 px-2 rounded-full flex items-center justify-center font-bold text-xs shadow-md min-w-0 ${
                        isBday ? 'bg-stone-950 text-yellow-500' : bgStatusColor + ' text-stone-950'
                      }`}>
                        <span className="truncate">{f.name}</span>
                      </div>

                      <div className={`shrink-0 w-12 py-1.5 rounded-xl border flex flex-col items-center justify-center shadow-inner ${
                        isBday ? 'bg-stone-950/20 border-yellow-700/30' : levelBadgeBoxClass(health.level)
                      }`}>
                        <span className={`text-lg font-black leading-none ${isBday ? 'text-stone-950' : textColorClass}`}>
                          {health.days === 999 ? '∞' : health.days}
                        </span>
                        <span className={`text-[8px] font-bold uppercase tracking-wider ${isBday ? 'text-stone-900/60' : textColorClass + ' opacity-70'}`}>días</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {filteredFriends.length === 0 && <p className="text-center text-stone-600 italic py-4">Sin personas en este filtro.</p>}
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
              type="button"
              onClick={addFriend}
              aria-label="Añadir persona"
              className="bg-pink-700 text-white p-2 rounded-xl hover:bg-pink-600 transition-colors"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedFriend && selectedHealth && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="friend-modal-title"
          className="fixed inset-0 max-w-md mx-auto z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => { setSelectedFriendId(null); setIsEditingFriend(false); setShowDeleteConfirm(false); }}
        >
          <div
            className="bg-stone-900 w-full max-w-sm rounded-3xl shadow-2xl border border-pink-900/30 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-900">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-stone-950 font-bold text-lg ${isBirthdayWeek(selectedFriend.birthday) ? 'bg-yellow-500' : levelBgClass(selectedHealth.level)}`}>
                  {selectedFriend.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  {isEditingFriend ? (
                    <div className="flex flex-col gap-1">
                      <input
                        value={editFriendName}
                        onChange={e => setEditFriendName(e.target.value)}
                        className="bg-stone-950 border border-stone-700 rounded px-2 py-1 text-pink-200 font-bold w-full outline-none"
                        placeholder="Nombre"
                      />
                      <div className="flex gap-1">
                        <input
                          type="date"
                          value={editBirthday.startsWith('0000-') ? `2000-${editBirthday.slice(5)}` : editBirthday}
                          onChange={e => setEditBirthday(e.target.value)}
                          className="bg-stone-950 border border-stone-700 rounded px-2 py-1 text-stone-400 text-xs flex-1 outline-none"
                        />
                        <select
                          value={editOrbit}
                          aria-label="Órbita de relación"
                          onChange={e => setEditOrbit(e.target.value as FriendOrbit)}
                          className="bg-stone-950 border border-stone-700 rounded px-1.5 py-1 text-stone-300 text-xs outline-none"
                        >
                          <option value="hogar">🏠 Hogar</option>
                          <option value="intimo">🔥 Íntimo</option>
                          <option value="cercano">🌿 Cercano</option>
                          <option value="estacional">🍂 Estacional</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 id="friend-modal-title" className="font-bold text-pink-200 text-lg truncate pr-2">
                        {selectedFriend.name}
                        {isBirthdayWeek(selectedFriend.birthday) && <span className="ml-2">🎂</span>}
                      </h3>
                      <p className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1.5">
                        <span>{formatBirthday(selectedFriend.birthday)}</span>
                        <span>·</span>
                        <span className="text-pink-400/90">{selectedHealth.cfg.emoji} {selectedHealth.cfg.label}</span>
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-3xl font-black tracking-tighter ${levelTextClass(selectedHealth.level)}`}>
                  {selectedHealth.days === 999 ? '∞' : selectedHealth.days}
                </span>
                {isEditingFriend ? (
                  <button type="button" onClick={saveFriendEdits} aria-label="Guardar cambios" className="p-1 hover:bg-stone-700 rounded-full ml-1">
                    <Save className="w-5 h-5 text-green-500" />
                  </button>
                ) : (
                  <button type="button" onClick={startEditingFriend} aria-label="Editar ficha" className="p-1 hover:bg-stone-700 rounded-full ml-1">
                    <Edit2 className="w-5 h-5 text-stone-400" />
                  </button>
                )}
                <button type="button" onClick={() => { setSelectedFriendId(null); setIsEditingFriend(false); }} aria-label="Cerrar ficha" className="p-1 hover:bg-stone-700 rounded-full">
                  <X className="w-6 h-6 text-stone-400" />
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {selectedHealth.voiceDebt && (
                <div className="mb-4 px-3 py-2 rounded-xl bg-yellow-950/40 border border-yellow-800/50 text-xs text-yellow-300 font-medium">
                  🫂 Doble Savia: contacto reciente por texto, pero llevas {selectedHealth.deepDays === 999 ? 'mucho tiempo' : `${selectedHealth.deepDays} días`} sin llamada o encuentro presencial.
                </div>
              )}

              {/* Interactions */}
              <div className="mb-6">
                <p className="text-stone-500 text-xs font-bold uppercase mb-3">Registrar Interacción</p>
                <div className="grid grid-cols-5 gap-2">
                  {(['person', 'call', 'gift', 'photo', 'message'] as const).map((type) => {
                    const icons: Record<string, string> = { person: '🫂', call: '📞', gift: '🎁', photo: '📸', message: '💬' };
                    const labels: Record<string, string> = { person: 'Presencial', call: 'Llamada', gift: 'Detalle', photo: 'Foto', message: 'Mensaje' };
                    return (
                      <div key={type} className="flex flex-col items-center justify-center gap-1 aspect-square bg-stone-950 rounded-2xl border border-stone-800 hover:border-pink-500 transition-colors relative">
                        {isEditingFriend ? (
                          <>
                            <span className="text-xl">{icons[type]}</span>
                            <input
                              type="number"
                              aria-label={labels[type]}
                              value={editInteractions[type]}
                              onChange={e => setEditInteractions({ ...editInteractions, [type]: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                              className="w-10 bg-stone-900 text-center text-xs font-mono font-bold text-stone-200 rounded outline-none border border-stone-700"
                            />
                          </>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Registrar ${labels[type]}`}
                            onClick={() => recordInteraction(selectedFriend.id, type)}
                            className="w-full h-full flex flex-col items-center justify-center gap-0.5 p-1"
                          >
                            <span className="text-xl">{icons[type]}</span>
                            <span className="text-xs font-mono font-bold text-stone-300">{selectedFriend.interactions[type]}</span>
                            <span className="text-[9px] font-semibold text-pink-400/80 leading-none">{formatDaysAgo(selectedFriend.lastInteractions?.[type])}</span>
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
                        type="button"
                        aria-label="Completar pendiente"
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
                      if (e.key === 'Enter') addTask(selectedFriend.id);
                    }}
                  />
                </div>
              </div>

              {/* Historial de Interacciones */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-stone-500 text-xs font-bold uppercase">Historial de Interacciones</p>
                  {selectedFriend.history && selectedFriend.history.length > 0 && (
                    <span className="text-[10px] text-stone-500 font-mono">
                      {selectedFriend.history.length} registrada{selectedFriend.history.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                {(!selectedFriend.history || selectedFriend.history.length === 0) ? (
                  <p className="text-xs text-stone-600 italic py-2 px-1">Sin historial cronológico detallado todavía (se irá guardando al pulsar los iconos arriba).</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedFriend.history.map((entry) => {
                      const icons: Record<string, string> = { person: '🫂', call: '📞', gift: '🎁', photo: '📸', message: '💬' };
                      const labels: Record<string, string> = { person: 'Presencial', call: 'Llamada', gift: 'Detalle', photo: 'Foto', message: 'Mensaje' };
                      return (
                        <div key={entry.id} className="flex items-center justify-between px-3 py-2 bg-stone-950/80 rounded-xl border border-stone-800/80 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{icons[entry.type] || '✨'}</span>
                            <span className="text-stone-300 font-medium">{labels[entry.type] || entry.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-stone-500 font-mono text-[11px]">{formatDateTime(entry.timestamp)}</span>
                            <button
                              type="button"
                              onClick={() => deleteInteractionEntry(selectedFriend.id, entry.id, entry.type)}
                              className="text-stone-600 hover:text-red-400 p-0.5 rounded transition-colors"
                              aria-label="Eliminar registro"
                              title="Eliminar registro"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-stone-800 flex gap-2">
                <button
                  type="button"
                  aria-pressed={!!selectedFriend.isSporadic}
                  aria-label="Alternar contacto esporádico (Yema)"
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
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-400 hover:bg-stone-800 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFriend(selectedFriend.id)}
                      className="bg-red-600 text-white px-4 rounded-xl font-bold hover:bg-red-500 shadow-lg shadow-red-900/20"
                    >
                      Borrar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
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
