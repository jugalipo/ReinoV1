import React, { useState } from 'react';
import { Task } from '../types';
import { ArrowLeft, Plus, Check, Trash2, Edit2, Circle, CheckCircle2, X } from 'lucide-react';

interface YunqueViewProps {
  largas: Task[];
  rapidas: Task[];
  onUpdateLargas: (tasks: Task[]) => void;
  onUpdateRapidas: (tasks: Task[]) => void;
  onBack: () => void;
}

export const YunqueView: React.FC<YunqueViewProps> = ({ 
  largas, 
  rapidas, 
  onUpdateLargas, 
  onUpdateRapidas, 
  onBack 
}) => {
  // Navigation & General Modes
  const [isEditing, setIsEditing] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState<'grapas' | 'argollas'>('grapas');
  
  // Normal Mode Add Forms
  const [addingType, setAddingType] = useState<'grapa' | 'argolla' | null>(null);
  const [newNormalText, setNewNormalText] = useState('');

  // Edit Mode Inputs
  const [editModeNewText, setEditModeNewText] = useState('');
  const [newSubtaskTexts, setNewSubtaskTexts] = useState<Record<string, string>>({});

  // Deletion Modal State
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; type: 'grapas' | 'argollas' } | null>(null);

  // Helper: toggle/append foot emoji to string
  const toggleFootEmoji = (text: string, setter: (val: string) => void) => {
    if (text.includes('🦶')) {
      setter(text.replace(/ 🦶|🦶/g, '').trim());
    } else {
      setter(text.trim() + ' 🦶');
    }
  };

  // Task & Subtask management helpers
  const handleAddTasks = (
    text: string, 
    currentTasks: Task[], 
    onUpdate: (tasks: Task[]) => void, 
    setter: (val: string) => void
  ) => {
    if (!text.trim()) return;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const newTasks: Task[] = lines.map(l => ({
      id: `yunque-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: l,
      completed: false
    }));
    onUpdate([...currentTasks, ...newTasks]);
    setter('');
  };

  const toggleTask = (taskId: string, currentTasks: Task[], onUpdate: (tasks: Task[]) => void) => {
    onUpdate(currentTasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const setMainTask = (taskId: string, currentTasks: Task[], onUpdate: (tasks: Task[]) => void) => {
    const isAlreadyMain = currentTasks.find(t => t.id === taskId)?.isMain;
    onUpdate(currentTasks.map(t => ({
      ...t,
      isMain: t.id === taskId ? !isAlreadyMain : false
    })));
  };

  const addSubtask = (taskId: string, text: string, currentTasks: Task[], onUpdate: (tasks: Task[]) => void) => {
    if (!text.trim()) return;
    onUpdate(currentTasks.map(t => {
      if (t.id === taskId) {
        const subtasks = t.subtasks || [];
        return {
          ...t,
          subtasks: [...subtasks, {
            id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            text: text.trim(),
            completed: false
          }]
        };
      }
      return t;
    }));
  };

  const updateSubtask = (taskId: string, subId: string, text: string, currentTasks: Task[], onUpdate: (tasks: Task[]) => void) => {
    onUpdate(currentTasks.map(t => {
      if (t.id === taskId && t.subtasks) {
        return {
          ...t,
          subtasks: t.subtasks.map(s => s.id === subId ? { ...s, text } : s)
        };
      }
      return t;
    }));
  };

  const toggleSubtask = (taskId: string, subId: string, currentTasks: Task[], onUpdate: (tasks: Task[]) => void) => {
    onUpdate(currentTasks.map(t => {
      if (t.id === taskId && t.subtasks) {
        return {
          ...t,
          subtasks: t.subtasks.map(s => s.id === subId ? { ...s, completed: !s.completed } : s)
        };
      }
      return t;
    }));
  };

  const deleteSubtask = (taskId: string, subId: string, currentTasks: Task[], onUpdate: (tasks: Task[]) => void) => {
    onUpdate(currentTasks.map(t => {
      if (t.id === taskId && t.subtasks) {
        return {
          ...t,
          subtasks: t.subtasks.filter(s => s.id !== subId)
        };
      }
      return t;
    }));
  };

  const deleteTask = (taskId: string, currentTasks: Task[], onUpdate: (tasks: Task[]) => void) => {
    onUpdate(currentTasks.filter(t => t.id !== taskId));
  };

  // Find main tasks for normal mode display
  const mainGrapa = rapidas.find(t => t.isMain);
  const mainArgolla = largas.find(t => t.isMain);

  // Count uncompleted for badge
  const uncompletedGrapas = rapidas.filter(t => !t.completed).length;
  const uncompletedArgollas = largas.filter(t => !t.completed).length;

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-stone-950 relative animate-in fade-in duration-300">
      {/* Header aligned to other views (like Leones) */}
      <header className="sticky top-0 z-20 bg-stone-900 shadow-sm p-4 flex items-center justify-between border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-stone-800 rounded-full transition-colors text-stone-400 hover:text-stone-200 active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-stone-400" />
          </button>
          <h1 className="text-xl font-bold text-stone-100">Yunque</h1>
        </div>
        <button 
          onClick={() => {
            setIsEditing(!isEditing);
            setAddingType(null);
            setNewNormalText('');
            setEditModeNewText('');
          }}
          className="p-2 hover:bg-stone-800 rounded-full transition-colors active:scale-95 text-stone-400 hover:text-stone-200"
        >
          {isEditing ? <Check className="w-6 h-6 text-teal-400" /> : <Edit2 className="w-6 h-6 text-stone-400" />}
        </button>
      </header>

      {/* Main Content Area */}
      <div className="p-5 flex-1 pb-28 overflow-y-auto no-scrollbar">
        {!isEditing ? (
          /* ========================================================
             NORMAL MODE: Only show main tasks and addition buttons
             ======================================================== */
          <div className="space-y-6">
            {/* GRAPA PRINCIPAL SECTION */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-teal-400 uppercase tracking-widest">Grapas</h3>
              {mainGrapa ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl border bg-stone-900 border-stone-800 hover:border-stone-700 shadow-lg transition-all">
                  <button
                    onClick={() => toggleTask(mainGrapa.id, rapidas, onUpdateRapidas)}
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      mainGrapa.completed ? 'bg-teal-500 border-teal-500' : 'border-stone-500 hover:border-stone-300'
                    }`}
                  >
                    {mainGrapa.completed && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <span className={`flex-1 text-sm font-bold ${mainGrapa.completed ? 'line-through text-stone-500' : 'text-stone-200'}`}>
                    {mainGrapa.text}
                  </span>
                </div>
              ) : (
                <div className="border border-dashed border-stone-800 rounded-2xl p-5 text-center bg-stone-900/10">
                  <p className="text-xs text-stone-500 font-bold">No hay ninguna Grapa marcada como principal.</p>
                  <p className="text-[10px] text-stone-600 mt-1">Activa el modo edición (lápiz) para marcar una.</p>
                </div>
              )}
            </div>

            {/* ARGOLLA PRINCIPAL SECTION */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Argollas</h3>
              {mainArgolla ? (
                <div className="p-4 rounded-2xl border bg-stone-900 border-stone-800 hover:border-stone-700 shadow-lg transition-all space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleTask(mainArgolla.id, largas, onUpdateLargas)}
                      className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                        mainArgolla.completed ? 'bg-indigo-500 border-indigo-500' : 'border-stone-500 hover:border-stone-300'
                      }`}
                    >
                      {mainArgolla.completed && <Check className="w-4 h-4 text-white" />}
                    </button>
                    <span className={`flex-1 text-sm font-bold ${mainArgolla.completed ? 'line-through text-stone-500' : 'text-stone-200'}`}>
                      {mainArgolla.text}
                    </span>
                  </div>

                  {/* Subtasks (view only toggling in Normal Mode) */}
                  {(mainArgolla.subtasks || []).length > 0 && (
                    <div className="ml-8 space-y-2 border-l-2 border-stone-800/80 pl-4">
                      {(mainArgolla.subtasks || []).map(sub => (
                        <div key={sub.id} className="flex items-center gap-3">
                          <button
                            onClick={() => toggleSubtask(mainArgolla.id, sub.id, largas, onUpdateLargas)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors flex-shrink-0 ${
                              sub.completed ? 'bg-stone-600 border-stone-600' : 'border-stone-700 hover:border-stone-500'
                            }`}
                          >
                            {sub.completed && <Check className="w-3 h-3 text-white" />}
                          </button>
                          <span className={`text-xs font-bold ${sub.completed ? 'line-through text-stone-500' : 'text-stone-400'}`}>
                            {sub.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-dashed border-stone-800 rounded-2xl p-5 text-center bg-stone-900/10">
                  <p className="text-xs text-stone-500 font-bold">No hay ninguna Argolla marcada como principal.</p>
                  <p className="text-[10px] text-stone-600 mt-1">Activa el modo edición (lápiz) para marcar una.</p>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setAddingType(addingType === 'grapa' ? null : 'grapa');
                    setNewNormalText('');
                  }}
                  className={`py-3 px-4 rounded-xl text-stone-950 font-black transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md ${
                    addingType === 'grapa' 
                      ? 'bg-teal-400 ring-2 ring-teal-500/50' 
                      : 'bg-teal-500 hover:bg-teal-400 shadow-teal-950/20'
                  }`}
                >
                  <Plus className="w-4 h-4" /> Grapa
                </button>
                <button
                  onClick={() => {
                    setAddingType(addingType === 'argolla' ? null : 'argolla');
                    setNewNormalText('');
                  }}
                  className={`py-3 px-4 rounded-xl text-stone-950 font-black transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md ${
                    addingType === 'argolla' 
                      ? 'bg-indigo-400 ring-2 ring-indigo-500/50' 
                      : 'bg-indigo-500 hover:bg-indigo-400 shadow-indigo-950/20'
                  }`}
                >
                  <Plus className="w-4 h-4" /> Argolla
                </button>
              </div>

              {/* INLINE ADD FORM */}
              {addingType && (
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-xl space-y-3 animate-in slide-in-from-top-3 duration-200">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-black uppercase ${addingType === 'grapa' ? 'text-teal-400' : 'text-indigo-400'}`}>
                      Añadir {addingType === 'grapa' ? 'Grapa' : 'Argolla'}
                    </span>
                  </div>
                  
                  <textarea
                    value={newNormalText}
                    onChange={(e) => setNewNormalText(e.target.value)}
                    placeholder="Escribe la tarea..."
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-200 focus:outline-none focus:border-stone-700 transition-colors text-sm h-16 resize-none shadow-inner"
                  />

                  <div className="flex gap-3 items-center">
                    <button
                      onClick={() => toggleFootEmoji(newNormalText, setNewNormalText)}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-black flex items-center gap-1 transition-all active:scale-95 shrink-0 ${
                        newNormalText.includes('🦶')
                          ? 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
                          : 'bg-stone-950 border-stone-800 text-stone-500 hover:text-stone-300'
                      }`}
                    >
                      <span>🦶</span> Passeggiata
                    </button>
                    
                    <button
                      onClick={() => {
                        if (addingType === 'grapa') {
                          handleAddTasks(newNormalText, rapidas, onUpdateRapidas, setNewNormalText);
                        } else {
                          handleAddTasks(newNormalText, largas, onUpdateLargas, setNewNormalText);
                        }
                        setAddingType(null);
                      }}
                      className={`flex-1 py-2 rounded-xl text-sm font-black text-stone-950 transition-colors active:scale-95 text-center ${
                        addingType === 'grapa' ? 'bg-teal-500 hover:bg-teal-450' : 'bg-indigo-500 hover:bg-indigo-450'
                      }`}
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================
             EDIT MODE: Switcher tabs and slot creator at top of list
             ======================================================== */
          <div className="space-y-5">
            {/* TABS SWITCHER */}
            <div className="grid grid-cols-2 gap-2 bg-stone-900/60 p-1.5 border border-stone-800 rounded-2xl">
              <button
                onClick={() => {
                  setActiveEditTab('grapas');
                  setEditModeNewText('');
                }}
                className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeEditTab === 'grapas'
                    ? 'bg-teal-500 text-stone-950 shadow-md font-black'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Grapas ({uncompletedGrapas})
              </button>
              <button
                onClick={() => {
                  setActiveEditTab('argollas');
                  setEditModeNewText('');
                }}
                className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeEditTab === 'argollas'
                    ? 'bg-indigo-500 text-stone-950 shadow-md font-black'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Argollas ({uncompletedArgollas})
              </button>
            </div>

            {/* TASK LIST AREA */}
            <div className="space-y-4">
              {/* FIRST SLOT CREATOR ("HUECO") */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5 shadow-md flex flex-col gap-2.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editModeNewText}
                    onChange={(e) => setEditModeNewText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && editModeNewText.trim()) {
                        if (activeEditTab === 'grapas') {
                          handleAddTasks(editModeNewText, rapidas, onUpdateRapidas, setEditModeNewText);
                        } else {
                          handleAddTasks(editModeNewText, largas, onUpdateLargas, setEditModeNewText);
                        }
                      }
                    }}
                    placeholder={`Añadir nueva ${activeEditTab === 'grapas' ? 'grapa' : 'argolla'}...`}
                    className="flex-1 bg-stone-950 border border-stone-800/80 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-stone-700 transition-colors shadow-inner"
                  />
                  <button
                    onClick={() => {
                      if (editModeNewText.trim()) {
                        if (activeEditTab === 'grapas') {
                          handleAddTasks(editModeNewText, rapidas, onUpdateRapidas, setEditModeNewText);
                        } else {
                          handleAddTasks(editModeNewText, largas, onUpdateLargas, setEditModeNewText);
                        }
                      }
                    }}
                    className={`p-2.5 rounded-xl text-stone-950 font-black transition-colors active:scale-95 ${
                      activeEditTab === 'grapas' ? 'bg-teal-500 hover:bg-teal-400' : 'bg-indigo-500 hover:bg-indigo-400'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex justify-start">
                  <button
                    onClick={() => toggleFootEmoji(editModeNewText, setEditModeNewText)}
                    className={`px-2.5 py-1 rounded-md border text-[10px] font-black flex items-center gap-1 transition-all active:scale-95 ${
                      editModeNewText.includes('🦶')
                        ? 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
                        : 'bg-stone-950 border-stone-800 text-stone-500 hover:text-stone-300'
                    }`}
                  >
                    <span>🦶</span> Passeggiata
                  </button>
                </div>
              </div>

              {/* LIST ITEMS */}
              <div className="space-y-3">
                {activeEditTab === 'grapas' ? (
                  // --- GRAPAS LIST ---
                  rapidas.length === 0 ? (
                    <p className="text-center text-stone-600 italic py-6 text-xs font-bold">No hay grapas registradas.</p>
                  ) : (
                    rapidas.map(task => (
                      <div 
                        key={task.id} 
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                          task.completed 
                            ? 'bg-stone-950/60 border-stone-900 opacity-60' 
                            : 'bg-stone-900/60 border-stone-800/80 shadow-sm'
                        }`}
                      >
                        {/* Selector para Principal */}
                        <button
                          onClick={() => setMainTask(task.id, rapidas, onUpdateRapidas)}
                          className="text-stone-500 hover:text-teal-400 transition-colors p-1"
                          title={task.isMain ? "Principal" : "Marcar como principal"}
                        >
                          {task.isMain ? (
                            <CheckCircle2 className="w-5 h-5 text-teal-400 fill-teal-950/40" />
                          ) : (
                            <Circle className="w-5 h-5 text-stone-600 hover:text-stone-400" />
                          )}
                        </button>

                        <span className={`flex-1 text-sm font-bold ${task.completed ? 'line-through text-stone-500' : 'text-stone-200'}`}>
                          {task.text}
                        </span>

                        <button 
                          onClick={() => setTaskToDelete({ id: task.id, type: 'grapas' })}
                          className="text-stone-700 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-950/30 active:scale-90"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )
                ) : (
                  // --- ARGOLLAS LIST ---
                  largas.length === 0 ? (
                    <p className="text-center text-stone-600 italic py-6 text-xs font-bold">No hay argollas registradas.</p>
                  ) : (
                    largas.map(task => {
                      const subText = newSubtaskTexts[task.id] || '';
                      return (
                        <div key={task.id} className="space-y-2.5">
                          <div 
                            className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                              task.completed 
                                ? 'bg-stone-950/60 border-stone-900 opacity-60' 
                                : 'bg-stone-900/60 border-stone-800/80 shadow-sm'
                            }`}
                          >
                            {/* Selector para Principal */}
                            <button
                              onClick={() => setMainTask(task.id, largas, onUpdateLargas)}
                              className="text-stone-500 hover:text-indigo-400 transition-colors p-1"
                              title={task.isMain ? "Principal" : "Marcar como principal"}
                            >
                              {task.isMain ? (
                                <CheckCircle2 className="w-5 h-5 text-indigo-400 fill-indigo-950/40" />
                              ) : (
                                <Circle className="w-5 h-5 text-stone-600 hover:text-stone-400" />
                              )}
                            </button>

                            <span className={`flex-1 text-sm font-bold ${task.completed ? 'line-through text-stone-500' : 'text-stone-200'}`}>
                              {task.text}
                            </span>

                            <button 
                              onClick={() => setTaskToDelete({ id: task.id, type: 'argollas' })}
                              className="text-stone-700 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-950/30 active:scale-90"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Subtasks rendering inside Edit Mode */}
                          <div className="ml-8 space-y-2 border-l border-stone-850 pl-4 pb-3">
                            {(task.subtasks || []).map(sub => (
                              <div key={sub.id} className="flex items-center gap-2 group/sub">
                                <button
                                  onClick={() => toggleSubtask(task.id, sub.id, largas, onUpdateLargas)}
                                  className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                                    sub.completed ? 'bg-stone-600 border-stone-600' : 'border-stone-800 hover:border-stone-600'
                                  }`}
                                >
                                  {sub.completed && <Check className="w-3 h-3 text-white" />}
                                </button>
                                
                                <input
                                  type="text"
                                  value={sub.text}
                                  onChange={(e) => updateSubtask(task.id, sub.id, e.target.value, largas, onUpdateLargas)}
                                  className={`flex-1 bg-transparent text-xs focus:outline-none transition-colors font-medium border-b border-transparent focus:border-stone-800 pb-0.5 ${
                                    sub.completed ? 'line-through text-stone-600' : 'text-stone-400 focus:text-stone-200'
                                  }`}
                                />

                                <button
                                  onClick={() => {
                                    const nextText = sub.text.includes('🦶')
                                      ? sub.text.replace(/ 🦶|🦶/g, '').trim()
                                      : sub.text.trim() + ' 🦶';
                                    updateSubtask(task.id, sub.id, nextText, largas, onUpdateLargas);
                                  }}
                                  className={`p-1 rounded text-[10px] transition-all ${
                                    sub.text.includes('🦶')
                                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/60'
                                      : 'text-stone-600 hover:text-stone-400'
                                  }`}
                                  title="Enviar a Passeggiata"
                                >
                                  🦶
                                </button>

                                <button 
                                  onClick={() => deleteSubtask(task.id, sub.id, largas, onUpdateLargas)}
                                  className="text-stone-700 hover:text-red-500 transition-colors p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}

                            {/* Add subtask inline form */}
                            <div className="flex items-center gap-2 mt-1 bg-stone-900/20 p-1.5 rounded-lg border border-stone-800">
                              <input
                                type="text"
                                placeholder="Añadir subtarea..."
                                value={subText}
                                onChange={(e) => setNewSubtaskTexts(prev => ({ ...prev, [task.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && subText.trim()) {
                                    addSubtask(task.id, subText.trim(), largas, onUpdateLargas);
                                    setNewSubtaskTexts(prev => ({ ...prev, [task.id]: '' }));
                                  }
                                }}
                                className="flex-1 bg-transparent text-xs focus:outline-none text-stone-500 focus:text-stone-300 font-medium italic"
                              />
                              <button
                                onClick={() => toggleFootEmoji(subText, (val) => setNewSubtaskTexts(prev => ({ ...prev, [task.id]: val })))}
                                className={`p-1 rounded text-[10px] transition-colors border ${
                                  subText.includes('🦶') 
                                    ? 'bg-emerald-950 border-emerald-900 text-emerald-400' 
                                    : 'bg-stone-950 border-stone-800 text-stone-650 hover:text-stone-400'
                                }`}
                              >
                                🦶
                              </button>
                              <button
                                onClick={() => {
                                  if (subText.trim()) {
                                    addSubtask(task.id, subText.trim(), largas, onUpdateLargas);
                                    setNewSubtaskTexts(prev => ({ ...prev, [task.id]: '' }));
                                  }
                                }}
                                className="p-1 rounded text-stone-500 hover:text-stone-300 active:scale-90"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (Premium Overlay Design) */}
      {taskToDelete && (
        <div 
          className="fixed inset-0 max-w-md mx-auto z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setTaskToDelete(null)}
        >
          <div 
            className="bg-stone-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-950/30 rounded-full flex items-center justify-center mb-4 border border-red-800/40">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-stone-100 mb-2">¿Eliminar Tarea?</h2>
              <p className="text-stone-400 mb-6 text-sm leading-relaxed">
                ¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer.
              </p>
              
              <div className="grid grid-cols-2 gap-3 w-full">
                <button 
                  onClick={() => setTaskToDelete(null)}
                  className="py-3 rounded-xl border border-stone-800 text-stone-400 hover:bg-stone-850 font-bold transition-all text-xs uppercase"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (taskToDelete.type === 'grapas') {
                      deleteTask(taskToDelete.id, rapidas, onUpdateRapidas);
                    } else {
                      deleteTask(taskToDelete.id, largas, onUpdateLargas);
                    }
                    setTaskToDelete(null);
                  }}
                  className="py-3 rounded-xl bg-red-600 text-white hover:bg-red-500 font-bold transition-all text-xs uppercase"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
