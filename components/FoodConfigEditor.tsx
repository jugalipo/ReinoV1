import React, { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { FoodConfig } from '../types';

interface FoodConfigEditorProps {
  initialConfig: FoodConfig;
  onSave: (config: FoodConfig) => void;
  onClose: () => void;
}

export const FoodConfigEditor: React.FC<FoodConfigEditorProps> = ({ initialConfig, onSave, onClose }) => {
  const [config, setConfig] = useState<FoodConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<'wheel' | 'broccoli' | 'bonuses' | 'meals'>('wheel');

  const handleSave = () => {
    onSave(config);
  };

  const updateWheel = (index: number, field: string, value: string) => {
    const newWheel = [...config.wheel];
    newWheel[index] = { ...newWheel[index], [field]: value };
    setConfig({ ...config, wheel: newWheel });
  };

  const addWheelItem = () => {
    setConfig({
      ...config,
      wheel: [...config.wheel, { id: `item_${Date.now()}`, icon: '❓' }]
    });
  };

  const removeWheelItem = (index: number) => {
    const newWheel = [...config.wheel];
    newWheel.splice(index, 1);
    setConfig({ ...config, wheel: newWheel });
  };

  const updateBroccoli = (index: number, field: string, value: string) => {
    const newBroccoli = [...config.broccoli];
    newBroccoli[index] = { ...newBroccoli[index], [field]: value };
    setConfig({ ...config, broccoli: newBroccoli });
  };

  const addBroccoliItem = () => {
    setConfig({
      ...config,
      broccoli: [...config.broccoli, { id: `step_${Date.now()}`, icon: '❓' }]
    });
  };

  const removeBroccoliItem = (index: number) => {
    const newBroccoli = [...config.broccoli];
    newBroccoli.splice(index, 1);
    setConfig({ ...config, broccoli: newBroccoli });
  };

  const updateBonus = (index: number, field: string, value: string | number) => {
    const newBonuses = [...config.bonuses];
    newBonuses[index] = { ...newBonuses[index], [field]: value };
    setConfig({ ...config, bonuses: newBonuses });
  };

  const addBonusItem = () => {
    setConfig({
      ...config,
      bonuses: [...config.bonuses, { id: `bonus_${Date.now()}`, icon: '❓', label: 'NUEVO', points: 1 }]
    });
  };

  const removeBonusItem = (index: number) => {
    const newBonuses = [...config.bonuses];
    newBonuses.splice(index, 1);
    setConfig({ ...config, bonuses: newBonuses });
  };

  const updateMeal = (index: number, field: string, value: string | number) => {
    const newMeals = [...config.meals];
    newMeals[index] = { ...newMeals[index], [field]: value };
    setConfig({ ...config, meals: newMeals });
  };

  const addMealItem = () => {
    setConfig({
      ...config,
      meals: [...config.meals, { name: 'Nueva comida', icon: '❓', max: 1 }]
    });
  };

  const removeMealItem = (index: number) => {
    const newMeals = [...config.meals];
    newMeals.splice(index, 1);
    setConfig({ ...config, meals: newMeals });
  };

  return (
    <div className="fixed inset-0 max-w-md mx-auto z-[100] bg-stone-950 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
      <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-full">
            <X className="w-6 h-6 text-stone-400" />
          </button>
          <h1 className="text-xl font-black text-stone-100 uppercase tracking-tighter italic">Editar Jumangiare</h1>
        </div>
        <button onClick={handleSave} className="p-2 bg-lime-600 hover:bg-lime-500 text-stone-950 rounded-full shadow-lg">
          <Save className="w-5 h-5" />
        </button>
      </div>

      <div className="flex border-b border-stone-800 overflow-x-auto shrink-0 hide-scrollbar">
        {[
          { id: 'wheel', label: 'La Rueda' },
          { id: 'broccoli', label: 'Brócoli' },
          { id: 'bonuses', label: 'Bonus' },
          { id: 'meals', label: 'Comidas' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? 'text-lime-500 border-b-2 border-lime-500' 
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'wheel' && (
          <div className="space-y-3">
            <p className="text-sm text-stone-400 mb-4">Configura los iconos de La Rueda. El ID interno no se puede cambiar para no perder el progreso, pero puedes cambiar el icono.</p>
            {config.wheel.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-stone-900 p-3 rounded-xl border border-stone-800">
                <input 
                  type="text" 
                  value={item.icon} 
                  onChange={(e) => updateWheel(idx, 'icon', e.target.value)}
                  className="w-12 h-12 text-center text-2xl bg-stone-950 rounded-lg border border-stone-700 focus:border-lime-500 focus:outline-none"
                  placeholder="Icon"
                />
                <div className="flex-1 text-sm text-stone-500 font-mono">{item.id}</div>
                <button onClick={() => removeWheelItem(idx)} className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            <button onClick={addWheelItem} className="w-full py-3 border-2 border-dashed border-stone-800 text-stone-500 rounded-xl hover:bg-stone-900 hover:text-stone-300 flex items-center justify-center gap-2 font-bold">
              <Plus className="w-5 h-5" /> Añadir Icono
            </button>
          </div>
        )}

        {activeTab === 'broccoli' && (
          <div className="space-y-3">
            <p className="text-sm text-stone-400 mb-4">Configura los pasos de la rutina Brócoli. El orden aquí es el orden en el que aparecerán.</p>
            {config.broccoli.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-stone-900 p-3 rounded-xl border border-stone-800">
                <div className="w-6 text-center text-stone-500 font-bold">{idx + 1}.</div>
                <input 
                  type="text" 
                  value={item.icon} 
                  onChange={(e) => updateBroccoli(idx, 'icon', e.target.value)}
                  className="w-12 h-12 text-center text-2xl bg-stone-950 rounded-lg border border-stone-700 focus:border-lime-500 focus:outline-none"
                  placeholder="Icon"
                />
                <div className="flex-1 text-sm text-stone-500 font-mono">{item.id}</div>
                <button onClick={() => removeBroccoliItem(idx)} className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            <button onClick={addBroccoliItem} className="w-full py-3 border-2 border-dashed border-stone-800 text-stone-500 rounded-xl hover:bg-stone-900 hover:text-stone-300 flex items-center justify-center gap-2 font-bold">
              <Plus className="w-5 h-5" /> Añadir Paso
            </button>
          </div>
        )}

        {activeTab === 'bonuses' && (
          <div className="space-y-3">
            <p className="text-sm text-stone-400 mb-4">Configura los botones de Bonus semanales.</p>
            {config.bonuses.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-2 bg-stone-900 p-3 rounded-xl border border-stone-800">
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    value={item.icon} 
                    onChange={(e) => updateBonus(idx, 'icon', e.target.value)}
                    className="w-12 h-12 text-center text-2xl bg-stone-950 rounded-lg border border-stone-700 focus:border-lime-500 focus:outline-none"
                    placeholder="Icon"
                  />
                  <input 
                    type="text" 
                    value={item.label} 
                    onChange={(e) => updateBonus(idx, 'label', e.target.value)}
                    className="flex-1 bg-stone-950 px-3 py-2 rounded-lg border border-stone-700 focus:border-lime-500 focus:outline-none text-stone-200 font-bold uppercase text-sm"
                    placeholder="Nombre"
                  />
                  <button onClick={() => removeBonusItem(idx)} className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-500">Puntos:</span>
                  <input 
                    type="number" 
                    value={item.points} 
                    onChange={(e) => updateBonus(idx, 'points', parseInt(e.target.value) || 0)}
                    className="w-16 bg-stone-950 px-2 py-1 rounded-lg border border-stone-700 focus:border-lime-500 focus:outline-none text-stone-200 text-center"
                  />
                </div>
              </div>
            ))}
            <button onClick={addBonusItem} className="w-full py-3 border-2 border-dashed border-stone-800 text-stone-500 rounded-xl hover:bg-stone-900 hover:text-stone-300 flex items-center justify-center gap-2 font-bold">
              <Plus className="w-5 h-5" /> Añadir Bonus
            </button>
          </div>
        )}

        {activeTab === 'meals' && (
          <div className="space-y-3">
            <p className="text-sm text-stone-400 mb-4">Configura la lista de comidas mensuales y su límite máximo.</p>
            {config.meals.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-2 bg-stone-900 p-3 rounded-xl border border-stone-800">
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    value={item.icon} 
                    onChange={(e) => updateMeal(idx, 'icon', e.target.value)}
                    className="w-12 h-12 text-center text-2xl bg-stone-950 rounded-lg border border-stone-700 focus:border-lime-500 focus:outline-none"
                    placeholder="Icon"
                  />
                  <input 
                    type="text" 
                    value={item.name} 
                    onChange={(e) => updateMeal(idx, 'name', e.target.value)}
                    className="flex-1 bg-stone-950 px-3 py-2 rounded-lg border border-stone-700 focus:border-lime-500 focus:outline-none text-stone-200 font-bold text-sm"
                    placeholder="Nombre de la comida"
                  />
                  <button onClick={() => removeMealItem(idx)} className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-500">Máximo al mes:</span>
                  <input 
                    type="number" 
                    value={item.max} 
                    onChange={(e) => updateMeal(idx, 'max', parseInt(e.target.value) || 1)}
                    className="w-16 bg-stone-950 px-2 py-1 rounded-lg border border-stone-700 focus:border-lime-500 focus:outline-none text-stone-200 text-center"
                  />
                </div>
              </div>
            ))}
            <button onClick={addMealItem} className="w-full py-3 border-2 border-dashed border-stone-800 text-stone-500 rounded-xl hover:bg-stone-900 hover:text-stone-300 flex items-center justify-center gap-2 font-bold">
              <Plus className="w-5 h-5" /> Añadir Comida
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
