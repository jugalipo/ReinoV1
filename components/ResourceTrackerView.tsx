import React from 'react';
import { ArrowLeft, Coins, Award, Sparkles } from 'lucide-react';
import { Task, ResourceTask } from '../types';

interface ResourceTrackerViewProps {
  title?: string;
  themeColor?: 'orange' | 'amber';
  tasks?: ResourceTask[];
  onUpdate?: (tasks: ResourceTask[]) => void;
  onBack: () => void;
  forjaTasks?: Task[];
  onUpdateForjaTasks?: (tasks: Task[]) => void;
}

export const ResourceTrackerView: React.FC<ResourceTrackerViewProps> = ({ onBack }) => {
  return (
    <div className="fixed inset-0 max-w-md mx-auto z-50 flex flex-col bg-stone-950 animate-in fade-in duration-200 lg:my-6 lg:rounded-3xl lg:border lg:border-stone-800 lg:shadow-[0_0_60px_rgba(0,0,0,0.85)] overflow-hidden">
      {/* Top Header */}
      <div className="p-4 bg-stone-900/90 backdrop-blur-sm border-b border-stone-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-stone-800 text-stone-400 hover:text-stone-200 rounded-full transition-colors cursor-pointer"
            title="Volver"
          >
            <ArrowLeft className="w-6 h-6 text-amber-500" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-950/40 border border-amber-800/60 rounded-xl">
              <Coins className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-100 leading-tight">Medallero del Reino</h1>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Hitos Vitales & Monedas Físicas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body: Medallero del Reino */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar text-left text-xs pb-12">
        {/* Sección Monedas Acuñadas */}
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2.5 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" /> Monedas Acuñadas (4 Conquistadas)
          </h4>
          <div className="space-y-2">
            {[
              { season: 'Verano 2025', domain: '⚡ Cuerpo', name: '20 Dominadas seguidas' },
              { season: 'Primavera 2024', domain: '⚡ Cuerpo', name: 'Ceto 4 semanas' },
              { season: 'Invierno 2024', domain: '⚡ Cuerpo', name: 'Efecto Kettlebell' },
              { season: 'Otoño 2023', domain: '⚡ Cuerpo', name: 'Desencadenado' },
            ].map((c, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🪙</span>
                  <div>
                    <p className="font-bold text-stone-200 text-sm">{c.name}</p>
                    <p className="text-[10px] text-stone-400">{c.domain} · {c.season}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800/60">
                  ✓ Acuñada
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sección Conquista en Juego Q4 2026 */}
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> En Juego este Trimestre (Roble Q4)
          </h4>
          <div className="space-y-2">
            {[
              { title: 'Vender el Trastero / Cochera', target: '4 lotes Wallapop', domain: '🦁 Leones' },
              { title: 'Calibración Nutricional (Meta Anual)', target: '30 días Nutrilio', domain: '🍏 Bosque' },
              { title: 'Crónicas Calicaseñas impresas', target: 'Crónica 4 sellada', domain: '❤️ Brotes' },
              { title: 'Máster RBG de Fotografía', target: 'Curso Flash completado', domain: '☁️ Nubes' },
            ].map((target, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800 flex items-center justify-between shadow-sm">
                <div>
                  <p className="font-bold text-stone-200 text-sm flex items-center gap-1.5">
                    <span className="text-amber-400">🪙</span> {target.title}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">{target.domain} · Meta: {target.target}</p>
                </div>
                <span className="text-[9px] font-bold text-amber-300 bg-amber-950/50 px-2.5 py-1 rounded-full border border-amber-800/50">
                  En forja
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Axioma Numismático */}
        <div className="p-3.5 bg-stone-900/40 rounded-2xl border border-stone-800/80 text-[11px] text-stone-400 leading-relaxed">
          <p>
            <strong className="text-stone-300">Axioma Numismático:</strong> Cada meta anual o gesta histórica alcanzada se traslada formalmente al Medallero para mandar a forjar su moneda de metal personalizada.
          </p>
        </div>

        {/* Botón Volver */}
        <div className="pt-2">
          <button
            onClick={onBack}
            className="w-full py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold text-xs uppercase tracking-wider border border-stone-800 transition-all active:scale-[0.99] cursor-pointer"
          >
            Volver al Reino
          </button>
        </div>
      </div>
    </div>
  );
};
