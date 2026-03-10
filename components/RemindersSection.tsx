import React, { useState } from 'react';
import { ReminderEvent } from '../types';
import { Bell, Edit3, X, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface RemindersSectionProps {
  reminders: ReminderEvent[];
  onUpdateReminders: (reminders: ReminderEvent[]) => void;
}

export const RemindersSection: React.FC<RemindersSectionProps> = ({ reminders, onUpdateReminders }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getUpcomingReminders = () => {
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const upcoming: { message: string, isToday: boolean, daysLeft: number }[] = [];

    reminders.forEach(reminder => {
      const eventDate = new Date(reminder.date);
      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      
      // 1. Yearly
      if (reminder.notifyYearly) {
        let nextAnniversary = new Date(todayDate.getFullYear(), eventDateOnly.getMonth(), eventDateOnly.getDate());
        if (nextAnniversary.getTime() < todayDate.getTime()) {
          nextAnniversary = new Date(todayDate.getFullYear() + 1, eventDateOnly.getMonth(), eventDateOnly.getDate());
        }
        
        const diffTime = nextAnniversary.getTime() - todayDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 7) {
          const years = nextAnniversary.getFullYear() - eventDateOnly.getFullYear();
          if (years > 0) {
            const msg = reminder.hideAge ? reminder.title : `${years} años: ${reminder.title}`;
            upcoming.push({ message: msg, isToday: diffDays === 0, daysLeft: diffDays });
          }
        }
      }
      
      // 2. Monthly
      if (reminder.notifyMonthly) {
        let nextMonthAnniversary = new Date(todayDate.getFullYear(), todayDate.getMonth(), eventDateOnly.getDate());
        if (nextMonthAnniversary.getTime() < todayDate.getTime()) {
          nextMonthAnniversary = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, eventDateOnly.getDate());
        }
        
        const diffTime = nextMonthAnniversary.getTime() - todayDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 7) {
          let months = (nextMonthAnniversary.getFullYear() - eventDateOnly.getFullYear()) * 12;
          months -= eventDateOnly.getMonth();
          months += nextMonthAnniversary.getMonth();
          
          if (months > 0) {
            upcoming.push({ message: `${months} meses: ${reminder.title}`, isToday: diffDays === 0, daysLeft: diffDays });
          }
        }
      }
      
      // 3. 100 Days
      if (reminder.notify100Days) {
        const diffTimeFromStart = todayDate.getTime() - eventDateOnly.getTime();
        const diffDaysFromStart = Math.floor(diffTimeFromStart / (1000 * 60 * 60 * 24));
        
        if (diffDaysFromStart >= 0) {
            let next100Multiple = Math.ceil(diffDaysFromStart / 100) * 100;
            if (next100Multiple === 0) next100Multiple = 100;
            
            const daysLeft = next100Multiple - diffDaysFromStart;
            
            if (daysLeft <= 7) {
                upcoming.push({ message: `${next100Multiple} días: ${reminder.title}`, isToday: daysLeft === 0, daysLeft: daysLeft });
            }
        }
      }
    });

    return upcoming.sort((a, b) => a.daysLeft - b.daysLeft);
  };

  const upcomingReminders = getUpcomingReminders();

  if (!isEditing && upcomingReminders.length === 0) {
    return (
      <div className="flex justify-end mb-4 px-2">
        <button 
          onClick={() => setIsEditing(true)}
          className="p-2 bg-stone-900 rounded-full border border-stone-800 text-stone-500 hover:text-pink-400 transition-colors"
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {!isEditing ? (
        <div className="bg-stone-900/50 border border-stone-800/50 rounded-2xl p-4 flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {upcomingReminders.map((reminder, i) => (
              <div key={i} className={`flex items-center gap-3 ${reminder.isToday ? 'text-pink-200 font-bold' : 'text-stone-400 font-medium'}`}>
                {reminder.isToday ? (
                  <div className="p-1.5 rounded-full bg-pink-500/20 text-pink-500">
                      <Bell className="w-4 h-4 shrink-0" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-pink-500/20 text-pink-500 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold">{reminder.daysLeft}</span>
                  </div>
                )}
                <div className="flex-1 flex items-center justify-between">
                    <span>{reminder.message}</span>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            className="p-2 bg-stone-900 rounded-full border border-stone-800 text-stone-400 hover:text-pink-400 transition-colors shrink-0"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="bg-stone-900 rounded-2xl border border-stone-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-stone-200 flex items-center gap-2">
              <Bell className="w-5 h-5 text-pink-500" />
              Recordatorios
            </h3>
            <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-stone-800 rounded-full">
              <X className="w-5 h-5 text-stone-400" />
            </button>
          </div>
          
          <div className="space-y-4 mb-4">
            {reminders.map(reminder => (
              <div key={reminder.id} className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-3">
                {deleteConfirmId === reminder.id ? (
                  <div className="flex items-center justify-between bg-red-950/30 p-2 rounded-lg border border-red-900/50">
                    <span className="text-sm text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      ¿Eliminar recordatorio?
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1 text-xs text-stone-400 hover:text-stone-200 bg-stone-900 rounded-md"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={() => {
                          onUpdateReminders(reminders.filter(r => r.id !== reminder.id));
                          setDeleteConfirmId(null);
                        }}
                        className="px-3 py-1 text-xs text-white bg-red-600 hover:bg-red-500 rounded-md"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 flex flex-col gap-2">
                        <input 
                          type="text" 
                          value={reminder.title}
                          onChange={e => onUpdateReminders(reminders.map(r => r.id === reminder.id ? { ...r, title: e.target.value } : r))}
                          className="w-full bg-transparent border-b border-stone-800 text-stone-200 px-1 py-1 text-sm focus:outline-none focus:border-pink-500"
                          placeholder="Título del evento"
                        />
                        <input 
                          type="date" 
                          value={reminder.date}
                          onChange={e => onUpdateReminders(reminders.map(r => r.id === reminder.id ? { ...r, date: e.target.value } : r))}
                          className="w-full bg-stone-900 border border-stone-800 rounded-lg text-stone-300 px-2 py-1 text-sm"
                        />
                      </div>
                      <button 
                        onClick={() => setDeleteConfirmId(reminder.id)}
                        className="p-2 text-stone-500 hover:text-red-400 shrink-0 mt-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 text-xs text-stone-400">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={reminder.notifyYearly}
                          onChange={e => onUpdateReminders(reminders.map(r => r.id === reminder.id ? { ...r, notifyYearly: e.target.checked } : r))}
                          className="accent-pink-500"
                        />
                        Cada año
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={reminder.notifyMonthly}
                          onChange={e => onUpdateReminders(reminders.map(r => r.id === reminder.id ? { ...r, notifyMonthly: e.target.checked } : r))}
                          className="accent-pink-500"
                        />
                        Cada mes
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={reminder.notify100Days}
                          onChange={e => onUpdateReminders(reminders.map(r => r.id === reminder.id ? { ...r, notify100Days: e.target.checked } : r))}
                          className="accent-pink-500"
                        />
                        Cada 100 días
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={reminder.hideAge || false}
                          onChange={e => onUpdateReminders(reminders.map(r => r.id === reminder.id ? { ...r, hideAge: e.target.checked } : r))}
                          className="accent-pink-500"
                        />
                        Ocultar edad/años
                      </label>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          
          <button 
            onClick={() => {
              const newReminder: ReminderEvent = {
                id: Date.now().toString(),
                title: 'Nuevo evento',
                date: new Date().toISOString().split('T')[0],
                notifyYearly: true,
                notifyMonthly: false,
                notify100Days: false
              };
              onUpdateReminders([...reminders, newReminder]);
            }}
            className="w-full py-3 border-2 border-dashed border-stone-800 rounded-xl text-stone-500 font-bold flex items-center justify-center gap-2 hover:border-pink-900/50 hover:text-pink-400 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Añadir Recordatorio
          </button>
        </div>
      )}
    </div>
  );
};
