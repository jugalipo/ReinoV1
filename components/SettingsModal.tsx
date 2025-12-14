import React from 'react';
import { AppData } from '../types';
import { X, Download } from 'lucide-react';

interface SettingsModalProps {
  data: AppData;
  onUpdateData: (data: AppData) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ data, onUpdateData, onClose }) => {
  const exportCSV = () => {
    // Generic Header structure to fit all data types
    const headers = ['Category', 'Item/Name', 'Value/Status', 'Details/JSON', 'Timestamp/Extra'];
    const rows: (string | number)[][] = [];

    // --- META & STATS ---
    rows.push(['META', 'Last Date', data.lastDate || '', '', '']);
    rows.push(['META', 'Last Sets Reset', new Date(data.lastSetsReset).toLocaleString(), data.lastSetsReset, '']);
    rows.push(['META', 'Last Trains Reset', new Date(data.lastTrainsReset).toLocaleString(), data.lastTrainsReset, '']);
    
    rows.push(['STATS', 'Perfect Sets Weeks', data.stats.perfectSetsWeeks, '', '']);
    rows.push(['STATS', 'Huno Plenos', data.stats.hunoPlenos, '', '']);
    rows.push(['STATS', 'Perfect Train Months', data.stats.perfectTrainMonths, '', '']);
    rows.push(['STATS', 'Project Plenos', data.stats.projectPlenos, '', '']);
    rows.push(['STATS', 'Last Total Interactions', data.stats.lastTotalInteractions, '', '']);
    
    // History Arrays
    rows.push(['STATS HISTORY', 'Sets History', JSON.stringify(data.stats.setsHistory), '', '']);
    rows.push(['STATS HISTORY', 'Trains History', JSON.stringify(data.stats.trainsHistory), '', '']);
    rows.push(['STATS HISTORY', 'Interactions History', JSON.stringify(data.stats.interactionsHistory), '', '']);

    // --- EXERCISE ---
    if (data.exercise) {
        rows.push(['EXERCISE', 'Days Trained', data.exercise.daysTrained, '', '']);
        rows.push(['EXERCISE', 'Total Minutes', data.exercise.totalMinutes || 0, '', '']);
        rows.push(['EXERCISE', 'Current Series', data.exercise.seriesCurrent, '/ 9', '']);
        rows.push(['EXERCISE', 'Sprints', data.exercise.sprintCount, '', '']);
        rows.push(['EXERCISE', 'Stretches', data.exercise.stretchCount, '', '']);
    }

    // --- HUNOS ---
    data.hunos.forEach(t => {
        const details = JSON.stringify({ failedYesterday: t.failedYesterday, plenoCompleted: t.plenoCompleted });
        rows.push(['HUNO', t.text, t.completed ? 'COMPLETED' : 'PENDING', details, '']);
    });

    // --- SETS ---
    data.sets.forEach(t => {
        const date = t.dayCompleted ? new Date(t.dayCompleted).toLocaleString() : '';
        rows.push(['SET', t.text, t.completed ? 'COMPLETED' : 'PENDING', '', date]);
    });

    // --- TRAINS (MONTHLY) ---
    data.trains.forEach(t => {
        const subtasks = t.subtasks ? JSON.stringify(t.subtasks) : '';
        rows.push(['TRAIN (MONTHLY)', t.text, t.completed ? 'COMPLETED' : 'PENDING', subtasks, '']);
    });

    // --- TRAINS (ANNUAL) ---
    if (data.annualTrains) {
        data.annualTrains.forEach(t => {
            const subtasks = t.subtasks ? JSON.stringify(t.subtasks) : '';
            rows.push(['TRAIN (ANNUAL)', t.text, t.completed ? 'COMPLETED' : 'PENDING', subtasks, '']);
        });
    }

    // --- PROJECTS ---
    data.projects.forEach(t => {
        rows.push(['PROJECT', t.text, t.completed ? 'COMPLETED' : 'PENDING', '', '']);
    });

    // --- RESOURCES (FORJAS & LEONES) ---
    data.forjas.forEach(t => {
        rows.push(['FORJA', t.name, t.current, `Target: ${t.target} ${t.unit}`, '']);
    });
    data.leones.forEach(t => {
        rows.push(['LEON', t.name, t.current, `Target: ${t.target} ${t.unit}`, '']);
    });

    // --- FRIENDS ---
    data.friends.forEach(f => {
        const interactions = JSON.stringify(f.interactions);
        const lastContact = f.lastInteraction ? new Date(f.lastInteraction).toLocaleString() : 'Never';
        rows.push(['FRIEND', f.name, lastContact, interactions, f.lastInteraction]);
        
        // Friend Tasks
        f.tasks.forEach(ft => {
            rows.push(['FRIEND TASK', f.name, ft.text, '', '']);
        });
    });

    // --- FOOD ---
    rows.push(['FOOD', 'Score', data.food.score, '', '']);
    rows.push(['FOOD', 'Fridge Count', data.food.fridgeCount, '', '']);
    rows.push(['FOOD', 'Ritual Count', data.food.ritualCount, '', '']);
    rows.push(['FOOD', 'Wheel State', JSON.stringify(data.food.wheel), '', '']);
    rows.push(['FOOD', 'Bonuses State', JSON.stringify(data.food.weeklyBonuses), '', '']);
    
    // Food History
    data.food.history.forEach(h => {
        rows.push(['FOOD HISTORY', h.action, h.delta, '', new Date(h.timestamp).toLocaleString()]);
    });

    // Create CSV content
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => {
          // Escape quotes and wrap in quotes to handle commas in text
          return e.map(cell => {
              if (cell === null || cell === undefined) return '""';
              const stringCell = String(cell);
              return `"${stringCell.replace(/"/g, '""')}"`;
          }).join(",");
      }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `el_reino_backup_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="absolute inset-0 z-50 bg-stone-950 flex flex-col">
       <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between border-b border-stone-800">
            <h2 className="text-xl font-bold text-stone-200">Ajustes</h2>
            <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-full">
                <X className="w-6 h-6 text-stone-400" />
            </button>
       </div>

       <div className="flex-1 overflow-y-auto p-4">
           {/* Export */}
           <div className="mb-8 p-4 bg-stone-900 rounded-xl border border-stone-800">
               <h3 className="font-bold text-stone-300 mb-2 flex items-center gap-2">
                   <Download className="w-5 h-5" /> Exportar Datos
               </h3>
               <p className="text-sm text-stone-500 mb-4">Descarga tu historial completo en formato CSV. Incluye estadísticas, historiales, interacciones y configuraciones.</p>
               <button onClick={exportCSV} className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-4 py-2 rounded-lg text-sm font-medium border border-stone-700">
                   Descargar Copia Completa (.CSV)
               </button>
           </div>
       </div>
    </div>
  );
};