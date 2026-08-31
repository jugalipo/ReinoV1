import React, { useState, useEffect, useRef } from 'react';
import { AppData, ViewState, Friend, Task, ResourceTask, WeeklyTask, GympiezaState, DailyFoodScore } from './types';
import { DailyHunos } from './components/DailyHunos';
import { TrainView } from './components/TrainView';
import { SetsView } from './components/SetsView';
import { LoveTreeView } from './components/LoveTreeView';
import { FoodBoardView, calculateAllDaysTotal, DEFAULT_MEALS } from './components/FoodBoardView';
import { ResourceTrackerView } from './components/ResourceTrackerView';
import { PianoView } from './components/PianoView';
import { HistoryEditorModal } from './components/HistoryEditorModal';
import { StatsView } from './components/StatsView';
import { FootTasksModal } from './components/FootTasksModal';
import { YunqueView } from './components/YunqueView';
import { CaminosView } from './components/CaminosView';
import { ToolsView } from './components/ToolsView';
import { Heart, Utensils, BarChart3, X, Settings, Cat, Settings as GearIcon, CalendarClock, CheckCircle2, Dumbbell, Edit2, Save, Plus, Trash2, Trophy, Train, Music, Download, Upload, LogOut, Check, Footprints, Sparkles, Anvil, TreeDeciduous, Map as MapIcon, Cloud, Flame, ShieldAlert, Info, RotateCw, Wrench, Film, Tv, Star, ArrowLeft, BookOpen, Timer, Bike } from 'lucide-react';
import { auth, db, loginWithGoogle, logout, carteleraDb, bibliotecaDb, bosqueDb, aspavientosDb, desencadenadoDb, puertoDb } from './firebase';
import { collection, doc, writeBatch, onSnapshot, getDocs, getDocsFromServer, getDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const DebouncedInput = ({ value, onChange, ...props }: any) => {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => { setLocalValue(value); }, [value]);
  return (
    <input
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => { if (localValue !== value) onChange(localValue); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          if (localValue !== value) onChange(localValue);
          e.currentTarget.blur();
        }
      }}
    />
  );
};

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const getStartOfDay = (timeMs: number): number => {
  const d = new Date(timeMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const getHunoCreationTime = (id: string): number => {
  if (id.startsWith('huno-')) return 0;
  const timestamp = parseFloat(id);
  if (isNaN(timestamp)) return 0;
  return getStartOfDay(timestamp);
};

const parseDateKey = (dateKey: string): number => {
  const t = Date.parse(dateKey);
  if (isNaN(t)) return 0;
  return getStartOfDay(t);
};

export const calculateHunosPlenosAndPending = (
  hunos: Task[],
  hunosHistory: Record<string, string[]>,
  todayCompletedIds: string[]
) => {
  const visibleHunos = hunos.filter(t => t.text !== 'GAP');
  const visibleHunoIdsSet = new Set(visibleHunos.map(t => t.id));
  const todayKey = new Date().toDateString();

  const getActiveHunoIdsForTime = (timeMs: number): string[] => {
    return visibleHunos
      .filter(h => getHunoCreationTime(h.id) <= timeMs)
      .map(h => h.id);
  };

  let plenos = 0;
  const completedInCurrentCycle = new Set<string>();

  // Sort history keys chronologically (excluding today's date)
  const sortedDateKeys = Object.keys(hunosHistory || {})
    .filter(key => key !== todayKey)
    .sort((a, b) => parseDateKey(a) - parseDateKey(b));

  // Process history day by day
  sortedDateKeys.forEach(dateKey => {
    const timeMs = parseDateKey(dateKey);
    const activeHunoIds = getActiveHunoIdsForTime(timeMs);
    if (activeHunoIds.length === 0) return;

    const completedIds = hunosHistory[dateKey] || [];
    const dayCompletions = completedIds.filter(id => visibleHunoIdsSet.has(id));

    dayCompletions.forEach(id => {
      completedInCurrentCycle.add(id);
    });

    const isCycleComplete = activeHunoIds.every(id => completedInCurrentCycle.has(id));
    if (isCycleComplete) {
      plenos++;
      completedInCurrentCycle.clear();
    }
  });

  // Process today's completions
  const todayTimeMs = Date.now();
  const activeHunoIdsToday = getActiveHunoIdsForTime(todayTimeMs);
  if (activeHunoIdsToday.length > 0) {
    const todayCompletions = todayCompletedIds.filter(id => visibleHunoIdsSet.has(id));
    todayCompletions.forEach(id => {
      completedInCurrentCycle.add(id);
    });

    const isCycleCompleteToday = activeHunoIdsToday.every(id => completedInCurrentCycle.has(id));
    if (isCycleCompleteToday) {
      plenos++;
      completedInCurrentCycle.clear();
    }
  }

  // Pending are the active Hunos today that are not completed in the current cycle
  const pendingInCurrentCycle = activeHunoIdsToday.filter(id => !completedInCurrentCycle.has(id));

  return {
    plenos,
    pendingHunoIds: pendingInCurrentCycle
  };
};

const MUSHROOM_TASKS = [
  { text: "🍄 Cascada 🍄 20'", subtasks: ["Fecha", "Agenda semanal al PC", "Cambiar pijama", "Disco al ordenador", "Whattsapps no leídos", "Contadores DTH", "Ferrocopos", "Cumple y Calla", "Neceser", "Una calle de Granada", "Actualizar excel Reino"] },
  { text: "🍄 Bloqueos 5'", subtasks: ["Bloqueos Mac", "Bloqueo móvil", "Bloqueo tablet"] },
  { text: "🍄 Agenda 15'", subtasks: [] },
  { text: "🍄 Lavadora(S) 30'", subtasks: ["Ajuar cambiar", "Lavadoras ajuar", "Destender"] },
  { text: "🍄 Foto Cocina 15'", subtasks: [] },
  { text: "🍄 Ruta con mapa 15'", subtasks: [] },
  { text: "🍄 Esteticién 10'", subtasks: ["Uñas", "Pinzas", "Afeitar", "Alicia U", "Alicia C"] },
  { text: "🍄 Web Reino", subtasks: ["Actualizar plugins", "Añadir un detalle"] },
  { text: "🍄 1 Wasap antiguo 15'", subtasks: [] },
  { text: "🍄 Disco 5'", subtasks: [] }
];

const TRAIN_TASKS = [
  { text: "🦁 Cuentas 1h ⭐", subtasks: ["Clasificar gastos ING", "Anotar gastos", "Presupuesto", "Balance", "Transferencias"] },
  { text: "🦁 Compra 30' ⭐", subtasks: ["Lista", "Primera compra", "Revisión"] },
  { text: "🦁 Reino 30'", subtasks: ["Actualizar excel Reino", "Tablón del Reino"] },
  { text: "🦁 Cine 1h", subtasks: ["Ver estrenos ⭐", "Torrents", "Descargar 2"] },
  { text: "🦁 Libros 15'", subtasks: ["Librículas ⭐", "GoodReads"] },
  { text: "🦁 Cartera 15'", subtasks: ["Ver gráficos", "Hacer compras", "Apuntar en Reino"] },
  { text: "🦁 Vídeos 30'", subtasks: ["Canales de Youtube", "Guardar para más tarde", "Ver 1 vídeo", "Ver 2 vídeos", "Ver 3 vídeos", "Ver 4 vídeos", "Ver 5 vídeos", "Ver 6 vídeos", "Ver 7 vídeos", "Ver 8 vídeos", "Ver 9 vídeos", "Ver 10 vídeos"] },
  { text: "🦁 RRSS 15'", subtasks: ["Youtube", "Tiktok", "Instagram", "Apuntar Estadísticas de RRSS"] },
  { text: "🦁 Arroz 15'", subtasks: ["Contar tareas", "Colocar granos de arroz -"] },
  { text: "🦁 Medidas 1h", subtasks: ["Peso Alicia", "Foto", "Peso", "Plicómetro", "Perímetros", "Calcular pasos", "Ver Daylio", "Tensión", "Dominadas", "Flexiones", "Sentadillas", "Abdominales", "Pino", "Contadores ⭐", "Horas de móvil", "Actualizar DTH ⭐", "Nota Cuerpo ⭐"] },
  { text: "🦁 Destrasteo 2h", subtasks: ["Actualizar destrasteos ⭐", "Destrasteo Objetos -", "Destrasteo Habitaciones -", "Destrasteo Limpieza -", "Destrasteo (decoración) -", "Destrasteo (Memorando) -"] },
  { text: "🦁 Notas 30'", subtasks: ["Activos", "Cuerpo", "Amor", "Nubes", "Diario"] },
  { text: "🦁 Papeles 15'", subtasks: ["Seleccionar ⭐", "Leer"] },
  { text: "🦁 Escáner 15'", subtasks: ["Enchufar ⭐", "Escanear"] },
  { text: "🦁 Digital 30'", subtasks: ["Fondos de pantalla ⭐", "Carpetas pc", "Google Fotos", "Móvil", "Navegador", "IAs", "WhatsApp", "Telegram"] },
  { text: "🦁 Silla 5'", subtasks: ["Sacar inflador", "Inflar la silla"] },
  { text: "🦁 StayFocus 5'", subtasks: ["Descargar copia de seguridad", "Guardar en Drive"] },
  { text: "🦁 Compranda 30'", subtasks: ["Lista de Compranda ⭐", "Compras por internet", "Quedar para compras en la calle"] },
  { text: "🦁 Ser o no ser 15'", subtasks: ["Escribir lo que no soy", "Escribir lo que no soy"] },
  { text: "🍏 Sauna 1h", subtasks: ["Poner la bañera", "Poner música", "Sauna", "Agua fría"] },
  { text: "🍏 Día sin Pantallas 15'", subtasks: ["Elegir ⭐", "Poner bloqueos", "Día sin Pantallas -"] },
  { text: "🍏 Videnda 30h", subtasks: ["Actualizar excel ⭐", "Dvd", "Garci", "Serie", "Alicia", "Mes", "Videnda", "Revista"] },
  { text: "🍏 Liturgia 30'", subtasks: ["Sacar el libro ⭐", "Leer liturgia"] },
  { text: "❤️ Turistáculo 30'", subtasks: ["Elegir ⭐", "Comprar ⭐", "Quedar -"] },
  { text: "❤️ Bosque 15'", subtasks: ["Elegir Bosque ⭐", "Quedar -"] },
  { text: "❤️ Viaje 30'", subtasks: ["Elegir Viaje ⭐", "Comprar Viaje ⭐", "Ir de Viaje -"] },
  { text: "❤️ Anfitrión 15'", subtasks: ["Elegir Anfitrión ⭐", "Invitar Anfitrión", "Anfitrionar -"] },
  { text: "❤️ Donanda 30'", subtasks: ["Escribir Donanda ⭐", "Preparar", "Entregar -"] },
  { text: "❤️ S Aristocráticas 15'", subtasks: ["Elegir ⭐", "Reservar ⭐", "Ir -"] },
  { text: "❤️ Querida Alicia 2h", subtasks: ["Escribir", "Grabar", "Programar subida"] },
  { text: "❤️ Aliciología 1h", subtasks: ["Elegir tema", "Profundizar -"] },
  { text: "❤️ El Chef 1h", subtasks: ["Receta de Alicia ⭐", "Elegir receta ⭐", "Compromiso con Alicia ⭐", "Cocinar -"] },
  { text: "❤️ Querida Familia 1h", subtasks: ["Eleigr Querida Familia ⭐", "Escribir Querida Familia -"] },
  { text: "❤️ Falmuerzo 15'", subtasks: ["Invitar ⭐", "Falmuerzo -"] },
  { text: "📘 Diario en vídeo 10'", subtasks: ["Pensar", "Grabar"] },
  { text: "📘 Reválidas 2h", subtasks: ["Latín", "Inglés", "Árabe", "Imagen", "Matemáticas", "Literatura", "Trading", "Música", "Diccionario", "Biología", "Países"] },
  { text: "📘 Dora 30'", subtasks: ["Elegir Dora ⭐", "Hacer -"] },
  { text: "📘 Eficiencia 2h", subtasks: ["Escribir Eficiencia ⭐", "Limpieza -", "Orden -", "Alimentos -", "Ejercicio -", "PC / móvil -", "Limites -", "Registros -", "Web / RRSS -", "Personas -", "Dinero -", "Afilar hacha: móvil pc apps atajos -"] },
  { text: "📘 Desafío Cuerpo 5'", subtasks: ["Elegir desafío ⭐", "Comprometerme ⭐", "Ejecutar -", "(Test anual) -"] }
];

const GYMPIEZA_TASKS_LIST = [
  { text: "Superficies lavadero", type: 'superficies' },
  { text: "Superficies cocina", type: 'superficies' },
  { text: "Superficies pasillos", type: 'superficies' },
  { text: "Superficies despacho", type: 'superficies' },
  { text: "Superficies sala multiusos", type: 'superficies' },
  { text: "Superficies baño 1", type: 'superficies' },
  { text: "Superficies baño 2", type: 'superficies' },
  { text: "Superficies dormitorio", type: 'superficies' },
  { text: "Superficies salón", type: 'superficies' },
  { text: "Superficies terraza", type: 'superficies' },
  { text: "Barrer lavadero", type: 'barrer' },
  { text: "Barrer cocina", type: 'barrer' },
  { text: "Barrer pasillos", type: 'barrer' },
  { text: "Barrer despacho", type: 'barrer' },
  { text: "Barrer sala multiusos", type: 'barrer' },
  { text: "Barrer baños", type: 'barrer' },
  { text: "Barrer dormitorio", type: 'barrer' },
  { text: "Barrer salón", type: 'barrer' },
  { text: "Barrer terraza", type: 'barrer' },
  { text: "Fregar lavadero", type: 'fregar' },
  { text: "Fregar cocina", type: 'fregar' },
  { text: "Fregar pasillos", type: 'fregar' },
  { text: "Fregar despacho", type: 'fregar' },
  { text: "Fregar sala multiusos", type: 'fregar' },
  { text: "Fregar baños", type: 'fregar' },
  { text: "Fregar dormitorio", type: 'fregar' },
  { text: "Fregar salón", type: 'fregar' },
  { text: "Fregar terraza", type: 'fregar' }
] as const;

const ANNUAL_TRAIN_TASKS = [
  { text: "🚂 Peluquería (IMPAR)", subtasks: ["Cita Peluquería", "Corte", "Descafeinado 15"] },
  { text: "🚂 Pulsera FIT-09", subtasks: ["Sacar pulsera", "Configurar móvil", "Medir", "Anotar resultados"] },
  { text: "🚂 Agenda (DIC)", subtasks: ["Revisar mejoras de Agenda", "Maquetar nueva Agenda", "Imprimir Agenda"] },
  { text: "🚂 Inventarios (DIC)", subtasks: ["Anotar inventarios", "Biblioteca", "Legenda", "Cartelera", "Videnda", "Cancionero", "Memorando", "Gimnasio", "Flores", "Alcancía", "Museo", "Baúl mundo", "Amortizaciones", "Palabrario", "Liceo"] },
  { text: "🚂 Prontuario (DIC)", subtasks: ["Añadir textos Prontuario", "Ordenar textos", "Corregir y refinar", "Maquetar", "Imprimir"] },
  { text: "🚂 Álbum (DIC)", subtasks: ["Elegir fotos", "Editar fotos", "Maquetar", "Imprimir"] },
  { text: "🚂 Confesiones (DIC)", subtasks: ["Añadir novedades", "Revisar", "Maquetar", "Imprimir"] },
  { text: "🚂 Testamento (DIC)", subtasks: ["Revisar testamento", "(Pedir cita)"] },
  { text: "🚂 Aspavientos (DIC)", subtasks: ["Ordenar textos", "Revisar y corregir", "Maquetar", "Imprimir"] },
  { text: "🚂 Cosas del Reino (DIC)", subtasks: ["Actualizar Índices de la Biblioteca", "Revisar mapa Reino", "Excel Servanda", "Nuevos propósitos anuales", "Los Illustrator del Reino", "Excel del Reino"] }
];

const HUNOS_TASKS = [
  // Fila 1
  { text: "T1 🦁🦁🦁 20'", shortcut: 'leones' },
  { text: "Gim 🏋️ 60'" },
  { text: "❤️❤️ 20'", shortcut: 'love' },
  { text: "Leer 📖 30'", shortcut: 'read' },

  // Bloque medio
  { text: "Frío ❄️ 15'" },
  { text: "Diana 🎯 15'" },
  { text: "IdiomaS 🏛️ 20'" },
  { text: "T2 🔥 40'", shortcut: 'forjas' },
  { text: "T3 🚢 20'", shortcut: 'yunque' },
  { text: "pág 📘 30'" },
  { text: "WH - m 🫁 15'" },
  { text: "🍄🍄 30'", shortcut: 'sets' },
  { text: "🚂🚂🚂 110'", shortcut: 'trains' },
  { text: "P ⚙️ 44'", shortcut: 'projects' },
  { text: "Masajercicio ✋ 20'" },

  // Fila 5 (Últimas)
  { text: "8 ⏰" },
  { text: "10.000 🦶 60'" },
  { text: "Sol ☀️ 15'" },
  { text: "Ayuno 🚫", shortcut: 'food' },
  { text: "Menú 🍴 60'", shortcut: 'food' },
  { text: "1 FAH 🍰" },
  { text: "Sano 🍏" }
];

const PROJECT_DEFINITIONS = [
  { text: "Garci 🎬 1h", emoji: "🎬" },
  { text: "Piano 🎹 2x", emoji: "🎹" },
  { text: "Trivium 🎓 10p", emoji: "🎓" },
  { text: "Disco 📀 1", emoji: "📀" },
  { text: "Itineranda 🌍 1h", emoji: "🌍" },
  { text: "Audi 🎧 1h", emoji: "🎧" },
  { text: "Latín/Griego 🏛️10p", emoji: "🏛️" },
  { text: "Gympieza 🧹 1h", emoji: "🧹" }
];

const INITIAL_DATA: AppData = {
  lastDate: new Date().toDateString(),
  lastSetsReset: Date.now(),
  lastTrainsReset: Date.now(),
  lastFoodEntryClick: 0,
  lastBookFormSunday: "",
  setsPlenoClaimed: false,
  trainsPlenoClaimed: false,
  stats: {
    perfectSetsWeeks: 0,
    hunoPlenos: 0,
    perfectTrainMonths: 0,
    projectPlenos: 0,
    hunoPlenoCurrent: 0,
    projectPlenoCurrent: 0,
    hunoReward: "Premio por definir",
    projectReward: "Premio por definir",
    setsHistory: [],
    trainsHistory: [],
    interactionsHistory: [],
    lastTotalInteractions: 0
  },
  hunos: HUNOS_TASKS.map((item, i) => ({
    id: `huno-${i}`,
    text: item.text,
    shortcut: item.shortcut,
    completed: false,
    failedYesterday: false,
    missedDays: 0,
    plenoCompleted: false
  })),
  hunosHistory: {},
  streakReviewedDays: {},
  firewallDay: 0,
  firewallLastCompletedDate: "",
  firewallChecked: { ducha: false, calle: false, huno: false },
  trains: TRAIN_TASKS.map((task, i) => ({
    id: `train-${i}`,
    text: task.text,
    completed: false,
    subtasks: task.subtasks.map((st, j) => ({ id: `sub-${i}-${j}`, text: st, completed: false }))
  })),
  annualTrains: ANNUAL_TRAIN_TASKS.map((task, i) => ({
    id: `annual-train-${i}`,
    text: task.text,
    completed: false,
    subtasks: task.subtasks.map((st, j) => ({ id: `annual-sub-${i}-${j}`, text: st, completed: false }))
  })),
  sets: MUSHROOM_TASKS.map((task, i) => ({
    id: `set-${i}`,
    text: task.text,
    completed: false,
    subtasks: task.subtasks.map((st, j) => ({ id: `sub-${i}-${j}`, text: st, completed: false }))
  })),
  friends: [],
  food: {
    score: 0,
    lastMonthlyReset: Date.now(),
    ritualCount: 0,
    wheel: { drink: false, nuts: false, dairy: false, spices: false, coffee: false },
    broccoliWheel: { dance: false, broccoli: false, tablecloth: false, pushups: false, dustpan: false },
    monthlyBonuses: { organs: [false, false, false, false], legumes: [false, false, false, false], fast24: [false, false, false, false] },
    wheelPlenoCount: 0,
    broccoliPlenoCount: 0,
    dishes: {},
    monthlyHistory: {},
    history: []
  },
  forjas: [
    { id: 'permanent-objective', name: 'Objetivo Principal', current: 0, target: 100, unit: 'pts' },
    { id: 'q1-money', name: 'Dinero', current: 0, target: 1000, unit: '€' },
    { id: 'q2-health', name: 'Salud', current: 0, target: 10, unit: 'kg' },
    { id: 'q3-love', name: 'Amor', current: 0, target: 50, unit: 'pts' },
    { id: 'q4-proj', name: 'Nubes', current: 0, target: 100, unit: 'h' }
  ],
  leones: [],
  forjaTasks: [],
  projects: PROJECT_DEFINITIONS.map((def, i) => ({
    id: `new-proj-${i}`,
    text: def.text,
    completed: false
  })),
  exercise: {
    seriesCurrent: 0,
    daysTrained: 0,
    totalMinutes: 0,
    sprintCount: 0,
    stretchCount: 0,
    history: {}
  },
  billetesState: Array(20).fill(false),
  huchaCount: 0,
  energy: 1,
  energyHistory: {},
  gympieza: {
    lastReset: Date.now(),
    tasks: GYMPIEZA_TASKS_LIST.map((t, i) => ({
      id: `gym-${i}`,
      text: t.text,
      completed: false,
      type: t.type as 'superficies' | 'barrer' | 'fregar'
    }))
  },
  yunqueLargas: [],
  yunqueRapidas: [],
  caminos: []
};

const MushroomIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 10C2 13.5 4.5 16 8 16V20C8 21.1 8.9 22 10 22H14C15.1 22 16 21.1 16 20V16C19.5 16 22 13.5 22 10C22 6.48 17.52 2 12 2ZM12 4C14.5 4 16.5 6 16.5 6C16.5 6 15 8 12 8C9 8 7.5 6 7.5 6C7.5 6 9.5 4 12 4Z" />
  </svg>
);

const getEmoji = (text: string) => {
  const match = text.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u);
  return match ? match[0] : '❓';
};

const getWeekLabel = () => {
  const now = new Date();
  const onejan = new Date(now.getFullYear(), 0, 1);
  const millisecsInDay = 86400000;
  const weekNum = Math.ceil((((now.getTime() - onejan.getTime()) / millisecsInDay) + onejan.getDay() + 1) / 7);

  const day = now.getDay();
  const diff = now.getDate() - day;
  const sunday = new Date(now);
  sunday.setDate(diff);

  const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  return `Semana ${weekNum} · ${sunday.getDate()} ${monthNames[sunday.getMonth()]}`;
};

const shouldJumangiareBounce = (
  lastClick: number,
  dailyScores: Record<string, DailyFoodScore> = {}
): boolean => {
  const now = new Date();
  
  // 1. Check past days (e.g., yesterday and 2 days ago)
  for (let i = 1; i <= 3; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() - i);
    const dateStr = checkDate.toDateString();
    const score = dailyScores[dateStr];
    
    const lunchLogged = score ? (score.lunch || score.fasting || score.deliveryLunch) : false;
    const dinnerLogged = score ? (score.dinner || score.fasting || score.deliveryDinner) : false;
    
    if (!lunchLogged || !dinnerLogged) {
      return true; // Bounce because a past meal is missing!
    }
  }

  // 2. Check today's meals
  const todayStr = now.toDateString();
  const todayScore = dailyScores[todayStr];
  const currentHour = now.getHours();

  // Today's Lunch (due from 15:00 onwards)
  if (currentHour >= 15) {
    const lunchLogged = todayScore ? (todayScore.lunch || todayScore.fasting || todayScore.deliveryLunch) : false;
    if (!lunchLogged) {
      const limit15 = new Date(now);
      limit15.setHours(15, 0, 0, 0);
      if (lastClick < limit15.getTime()) {
        return true;
      }
    }
  }

  // Today's Dinner (due from 22:00 onwards)
  if (currentHour >= 22) {
    const dinnerLogged = todayScore ? (todayScore.dinner || todayScore.fasting || todayScore.deliveryDinner) : false;
    if (!dinnerLogged) {
      const limit22 = new Date(now);
      limit22.setHours(22, 0, 0, 0);
      if (lastClick < limit22.getTime()) {
        return true;
      }
    }
  }

  return false;
};

export const sanitizeForFirestore = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        result[key] = sanitizeForFirestore(value);
      }
    }
  }
  return result;
};

const serializeAppData = (data: AppData) => {
  const rawDocs = [
    { id: 'core', data: { lastDate: data.lastDate, lastSetsReset: data.lastSetsReset, lastTrainsReset: data.lastTrainsReset, setsPlenoClaimed: data.setsPlenoClaimed, trainsPlenoClaimed: data.trainsPlenoClaimed, stats: data.stats, food: data.food, exercise: data.exercise, billetesState: data.billetesState, huchaCount: data.huchaCount, leonesState: data.leonesState, leonesCount: data.leonesCount, reminders: data.reminders, piano: data.piano, weeklyGoals: data.weeklyGoals, reminderTime: data.reminderTime, lastReminderDate: data.lastReminderDate, gympieza: data.gympieza, loveTreeSortBy: data.loveTreeSortBy, streakReviewedDays: data.streakReviewedDays || {}, firewallDay: data.firewallDay || 0, firewallLastCompletedDate: data.firewallLastCompletedDate || "", firewallChecked: data.firewallChecked || { ducha: false, calle: false, huno: false }, lastFoodEntryClick: data.lastFoodEntryClick || 0, lastBookFormSunday: data.lastBookFormSunday || "" } },
    { id: 'hunos', data: { items: data.hunos } },
    { id: 'trains', data: { items: data.trains, annual: data.annualTrains } },
    { id: 'sets', data: { items: data.sets } },
    { id: 'friends', data: { items: data.friends } },
    { id: 'projects', data: { items: data.projects } },
    { id: 'forjas', data: { items: data.forjas } },
    { id: 'forjaTasks', data: { items: data.forjaTasks } },
    { id: 'leones', data: { items: data.leones } },
    { id: 'hunosHistory', data: { items: data.hunosHistory } },
    { id: 'energy', data: { value: data.energy || 1, history: data.energyHistory || {} } },
    { id: 'yunque', data: { largas: data.yunqueLargas || [], rapidas: data.yunqueRapidas || [] } },
    { id: 'caminos', data: { items: data.caminos || [] } },
  ];
  return rawDocs.map(doc => ({
    id: doc.id,
    data: sanitizeForFirestore(doc.data)
  }));
};

const deserializeAppData = (docs: any[]): AppData => {
  const result: any = { ...INITIAL_DATA };
  docs.forEach(doc => {
    if (doc.id === 'core') {
      Object.assign(result, doc.data);
      result.streakReviewedDays = doc.data.streakReviewedDays || {};
      result.firewallDay = doc.data.firewallDay || 0;
      result.firewallLastCompletedDate = doc.data.firewallLastCompletedDate || "";
      result.firewallChecked = doc.data.firewallChecked || { ducha: false, calle: false, huno: false };
      result.lastBookFormSunday = doc.data.lastBookFormSunday || "";
    } else if (doc.id === 'hunos') {
      result.hunos = doc.data.items || INITIAL_DATA.hunos;
    } else if (doc.id === 'trains') {
      result.trains = doc.data.items || INITIAL_DATA.trains;
      result.annualTrains = doc.data.annual || INITIAL_DATA.annualTrains;
    } else if (doc.id === 'sets') {
      result.sets = doc.data.items || INITIAL_DATA.sets;
    } else if (doc.id === 'friends') {
      result.friends = doc.data.items || INITIAL_DATA.friends;
    } else if (doc.id === 'projects') {
      result.projects = doc.data.items || INITIAL_DATA.projects;
    } else if (doc.id === 'forjas') {
      result.forjas = doc.data.items || INITIAL_DATA.forjas;
    } else if (doc.id === 'forjaTasks') {
      result.forjaTasks = doc.data.items || INITIAL_DATA.forjaTasks;
    } else if (doc.id === 'leones') {
      result.leones = doc.data.items || INITIAL_DATA.leones;
    } else if (doc.id === 'hunosHistory') {
      result.hunosHistory = doc.data.items || INITIAL_DATA.hunosHistory;
    } else if (doc.id === 'energy') {
      result.energy = doc.data.value || 1;
      result.energyHistory = doc.data.history || {};
    } else if (doc.id === 'yunque') {
      result.yunqueLargas = doc.data.largas || INITIAL_DATA.yunqueLargas || [];
      result.yunqueRapidas = doc.data.rapidas || INITIAL_DATA.yunqueRapidas || [];
    } else if (doc.id === 'caminos') {
      result.caminos = doc.data.items || INITIAL_DATA.caminos || [];
    }
  });
  return result as AppData;
};

const processResets = (parsed: AppData): AppData => {
  const result = JSON.parse(JSON.stringify(parsed)) as AppData;

  // Ensure Hunos have stable shortcuts even if user changed their text
  if (result.hunos) {
    result.hunos = result.hunos.map((t, i) => {
      if (!t.shortcut) {
        // Find the original definition by index (assuming original order was preserved)
        const originalByIndex = HUNOS_TASKS[i];
        if (originalByIndex && t.id === `huno-${i}`) {
          return { ...t, shortcut: originalByIndex.shortcut };
        }
        // Fallback: match by original text if the task was moved
        const originalByText = HUNOS_TASKS.find(ot => ot.text === t.text);
        if (originalByText) {
          return { ...t, shortcut: originalByText.shortcut };
        }
      }
      return t;
    });
  }

  if (!result.stats) { result.stats = { perfectSetsWeeks: 0, hunoPlenos: 0, perfectTrainMonths: 0, projectPlenos: 0, hunoPlenoCurrent: 0, projectPlenoCurrent: 0, hunoReward: "Premio por definir", projectReward: "Premio por definir", setsHistory: [], trainsHistory: [], interactionsHistory: [], lastTotalInteractions: 0 }; }
  if (typeof result.stats.projectPlenos === 'undefined') { result.stats.projectPlenos = 0; }
  if (typeof result.stats.hunoPlenoCurrent === 'undefined') { result.stats.hunoPlenoCurrent = 0; }
  if (typeof result.stats.projectPlenoCurrent === 'undefined') { result.stats.projectPlenoCurrent = 0; }
  if (typeof result.stats.hunoReward === 'undefined') { result.stats.hunoReward = "Premio por definir"; }
  if (typeof result.stats.projectReward === 'undefined') { result.stats.projectReward = "Premio por definir"; }
  if (typeof result.setsPlenoClaimed === 'undefined') { result.setsPlenoClaimed = false; }
  if (typeof result.trainsPlenoClaimed === 'undefined') { result.trainsPlenoClaimed = false; }
  if (!result.hunosHistory) { result.hunosHistory = {}; }
  if (!result.stats.setsHistory) { result.stats.setsHistory = []; }
  if (!result.stats.trainsHistory) { result.stats.trainsHistory = []; }
  if (!result.stats.interactionsHistory) { result.stats.interactionsHistory = []; }
  if (!result.lastSetsReset) { result.lastSetsReset = Date.now(); }
  if (!result.lastTrainsReset) { result.lastTrainsReset = Date.now(); }
  if (!result.food.dishes) { result.food.dishes = {}; }
  if (!result.food.lastMonthlyDishesReset) { result.food.lastMonthlyDishesReset = Date.now(); }
  if (typeof result.loveTreeSortBy === 'undefined') { result.loveTreeSortBy = 'interactions'; }
  if (typeof result.lastFoodEntryClick === 'undefined') { result.lastFoodEntryClick = 0; }

  const calculateTotalInteractions = (friendsList: Friend[]) => {
    return friendsList.reduce((acc, friend) => {
      const interactions = (Object.values(friend.interactions || {}) as number[]).reduce((a, b) => a + b, 0);
      return acc + interactions;
    }, 0);
  };
  if (typeof result.stats.lastTotalInteractions === 'undefined') {
    result.stats.lastTotalInteractions = calculateTotalInteractions(result.friends || []);
  }
  if (!result.forjas) { result.forjas = []; }
  const quarterlyDefaults = [
    { id: 'q1-money', name: 'Dinero', current: 0, target: 1000, unit: '€' },
    { id: 'q2-health', name: 'Salud', current: 0, target: 10, unit: 'kg' },
    { id: 'q3-love', name: 'Amor', current: 0, target: 50, unit: 'pts' },
    { id: 'q4-proj', name: 'Nubes', current: 0, target: 100, unit: 'h' }
  ];
  if (result.forjas.length < 5) {
    if (result.forjas.length === 0) {
      result.forjas.push({ id: 'permanent-objective', name: 'Objetivo Principal', current: 0, target: 100, unit: 'pts' });
    }
    for (let i = result.forjas.length; i < 5; i++) {
      result.forjas.push(quarterlyDefaults[i - 1]);
    }
  }
  if (!result.leones) { result.leones = []; }
  if (!result.forjaTasks) { result.forjaTasks = []; }
  if (!result.annualTrains) {
    result.annualTrains = ANNUAL_TRAIN_TASKS.map((task, i) => ({
      id: `annual-train-${i}`,
      text: task.text,
      completed: false,
      subtasks: task.subtasks.map((st, j) => ({ id: `annual-sub-${i}-${j}`, text: st, completed: false }))
    }));
  }
  if (!result.exercise) {
    result.exercise = { seriesCurrent: 0, daysTrained: 0, totalMinutes: 0, sprintCount: 0, stretchCount: 0, history: {} };
  }
  if (!result.exercise.history) {
    result.exercise.history = {};
  }
  if (typeof result.exercise.totalMinutes === 'undefined') {
    result.exercise.totalMinutes = 0;
  }
  if (!result.projects || result.projects.length === 0) {
    result.projects = PROJECT_DEFINITIONS.map((def, i) => ({ id: `new-proj-${i}`, text: def.text, completed: false }));
  } else {
    result.projects = result.projects.map(p => {
      if (p.text === "Trivium 10p") {
        return { ...p, text: "Trivium 🎓 10p" };
      }
      return p;
    });
  }
  if (!result.food.monthlyBonuses) {
    result.food.monthlyBonuses = { organs: [false, false, false, false], legumes: [false, false, false, false], fast24: [false, false, false, false] };
  }
  if (!result.food.broccoliWheel) {
    result.food.broccoliWheel = { dance: false, broccoli: false, tablecloth: false, pushups: false, dustpan: false };
  }
  if (typeof result.food.wheelPlenoCount === 'undefined') result.food.wheelPlenoCount = 0;
  if (typeof result.food.broccoliPlenoCount === 'undefined') result.food.broccoliPlenoCount = 0;
  if (!result.food.weeklyExtras) {
    result.food.weeklyExtras = {};
  }
  if (result.friends) {
    result.friends = result.friends.map((f: any) => ({ ...f, interactions: f.interactions || { person: 0, call: 0, gift: 0, photo: 0, message: 0 }, tasks: f.tasks || [] }));
  }
  if (result.hunos) {
    result.hunos = result.hunos.map(task => {
      if (task.text === "1 FAH 🚫🍰") {
        return { ...task, text: "1 FAH 🍰" };
      }
      return task;
    });
  }
  if (!result.billetesState) { result.billetesState = Array(20).fill(false); }
  if (typeof result.huchaCount === 'undefined') { result.huchaCount = 0; }
  if (typeof result.energy === 'undefined') { result.energy = 1; }
  if (!result.energyHistory) { result.energyHistory = {}; }
  if (!result.caminos) { result.caminos = []; }

  // Cleanup old GAP task
  result.hunos = result.hunos.filter(t => t.text !== 'GAP');

  if (!result.reminderTime) { result.reminderTime = '07:00'; }
  if (!result.exercise.timerBlocks) {
    result.exercise.timerBlocks = [
      { id: 'default-1', workSecs: 45, restSecs: 15, rounds: 3 }
    ];
  }

  const now = new Date();
  const today = now.toDateString();
  if (result.lastDate !== today) {
    const yesterdayKey = result.lastDate || '';
    if (yesterdayKey) {
      const completedIds = result.hunos.filter(t => t.completed).map(t => t.id);
      if (!result.hunosHistory) result.hunosHistory = {};
      result.hunosHistory[yesterdayKey] = completedIds;
      
      if (!result.energyHistory) result.energyHistory = {};
      result.energyHistory[yesterdayKey] = result.energy || 1;
    }

    result.energy = 1;

    const yesterdayDate = new Date(result.lastDate || today);
    const todayDate = new Date(today);
    const diffTime = Math.abs(todayDate.getTime() - yesterdayDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    result.hunos = result.hunos.map(task => {
      let newMissedDays = task.missedDays || 0;
      if (!task.completed) {
        newMissedDays += diffDays;
      } else {
        newMissedDays = Math.max(0, diffDays - 1);
      }
      return {
        ...task,
        failedYesterday: newMissedDays > 0,
        missedDays: newMissedDays,
        completed: false
      };
    });

    if (result.firewallDay > 0) {
      const fwYesterdayDate = new Date(todayDate);
      fwYesterdayDate.setDate(todayDate.getDate() - 1);
      const fwYesterdayStr = fwYesterdayDate.toDateString();
      if (result.firewallLastCompletedDate !== fwYesterdayStr && result.firewallLastCompletedDate !== today) {
        result.firewallDay = 1;
        result.firewallLastCompletedDate = "";
        result.firewallChecked = { ducha: false, calle: false, huno: false };
      }
    }

    result.lastDate = today;
  }

  const dayOfWeek = now.getDay();
  const diffToSunday = now.getDate() - dayOfWeek;
  const startOfCurrentWeek = new Date(now.getTime());
  startOfCurrentWeek.setDate(diffToSunday);
  startOfCurrentWeek.setHours(0, 0, 0, 0);
  const lastSetsResetDate = new Date(result.lastSetsReset);
  if (lastSetsResetDate.getTime() < startOfCurrentWeek.getTime()) {
    const completedCount = result.sets.filter(t => t.completed).length;

    const completedSetIds = result.sets.filter(t => t.completed).map(t => t.id);
    if (!result.setsHistoryMap) result.setsHistoryMap = {};
    const resetDateKey = new Date(Date.now()).toDateString();
    if (completedSetIds.length > 0) result.setsHistoryMap[resetDateKey] = completedSetIds;

    const allSetsCompleted = completedCount === result.sets.length;
    if (allSetsCompleted && !result.setsPlenoClaimed) {
      result.stats.perfectSetsWeeks += 1;
    }
    if (!result.stats.setsHistory) result.stats.setsHistory = [];
    result.stats.setsHistory.push(completedCount);
    if (result.stats.setsHistory.length > 52) result.stats.setsHistory.shift();
    result.sets = result.sets.map(t => ({ ...t, completed: false, subtasks: t.subtasks?.map(s => ({ ...s, completed: false })) }));
    result.setsPlenoClaimed = false;
    result.lastSetsReset = Date.now();
  }

  // Weekly food reset removed (transitioned to monthly)

  if (!result.weeklyGoals) {
    result.weeklyGoals = {
      leones: { text: "", completed: false },
      forjas: { text: "", completed: false },
      puerto: { text: "", completed: false },
      lastReset: Date.now()
    };
  }

  const lastWeeklyGoalsResetDate = new Date(result.weeklyGoals.lastReset || 0);
  // We no longer automatically reset weekly goals. The user must manually reset them.
  // This allows them to see the expired state.

  const lastTrainsResetDate = new Date(result.lastTrainsReset);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const resetMonth = lastTrainsResetDate.getMonth();
  const resetYear = lastTrainsResetDate.getFullYear();
  if (currentYear > resetYear) {
    result.annualTrains = result.annualTrains.map(t => ({ ...t, completed: false, subtasks: t.subtasks?.filter(s => !s.isProvisional).map(s => ({ ...s, completed: false })) }));
  }
  if (currentYear > resetYear || (currentYear === resetYear && currentMonth > resetMonth)) {
    const completedCount = result.trains.filter(t => t.completed).length;

    const completedTrainIds = result.trains.filter(t => t.completed).map(t => t.id);
    if (!result.trainsHistoryMap) result.trainsHistoryMap = {};
    const todayStr = new Date(Date.now()).toDateString();
    if (completedTrainIds.length > 0) result.trainsHistoryMap[todayStr] = completedTrainIds;

    const allTrainsCompleted = result.trains.every(t => t.completed);
    if (allTrainsCompleted && !result.trainsPlenoClaimed) {
      result.stats.perfectTrainMonths += 1;
    }
    if (!result.stats.trainsHistory) result.stats.trainsHistory = [];
    result.stats.trainsHistory.push(completedCount);
    if (result.stats.trainsHistory.length > 12) result.stats.trainsHistory.shift();
    const currentTotalInteractions = calculateTotalInteractions(result.friends);
    const interactionsThisMonth = currentTotalInteractions - (result.stats.lastTotalInteractions || 0);
    if (!result.stats.interactionsHistory) result.stats.interactionsHistory = [];
    result.stats.interactionsHistory.push(interactionsThisMonth);
    if (result.stats.interactionsHistory.length > 12) result.stats.interactionsHistory.shift();
    result.stats.lastTotalInteractions = currentTotalInteractions;
    result.trains = result.trains.map(t => ({ ...t, completed: false, subtasks: t.subtasks?.filter(s => !s.isProvisional).map(s => ({ ...s, completed: false })) }));
    result.annualTrains = result.annualTrains.map(t => {
      if (currentYear === resetYear && t.repeaterMonths && t.repeaterMonths.includes(currentMonth)) {
        return { ...t, completed: false, subtasks: t.subtasks?.filter(s => !s.isProvisional).map(s => ({ ...s, completed: false })) };
      }
      return t;
    });
    result.trainsPlenoClaimed = false;
    result.lastTrainsReset = Date.now();
  }

  const lastFoodMonthlyResetDate = new Date(result.food.lastMonthlyReset || result.food.lastMonthlyDishesReset || 0);
  const resetFoodMonth = lastFoodMonthlyResetDate.getMonth();
  const resetFoodYear = lastFoodMonthlyResetDate.getFullYear();
  if (currentYear > resetFoodYear || (currentYear === resetFoodYear && currentMonth > resetFoodMonth)) {
    // Save current month data before reset
    const prevMonthDate = new Date(resetFoodYear, resetFoodMonth, 1);
    const monthKey = `${prevMonthDate.getFullYear()}-${(prevMonthDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!result.food.monthlyHistory) result.food.monthlyHistory = {};
    result.food.monthlyHistory[monthKey] = {
      wheelPlenoCount: result.food.wheelPlenoCount || 0,
      broccoliPlenoCount: result.food.broccoliPlenoCount || 0,
      bonuses: result.food.monthlyBonuses || { organs: [false, false, false, false], legumes: [false, false, false, false], fast24: [false, false, false, false] },
      dishes: result.food.dishes || {},
      wheel: result.food.wheel || { drink: false, nuts: false, dairy: false, spices: false, coffee: false },
      broccoliWheel: result.food.broccoliWheel || { dance: false, broccoli: false, tablecloth: false, pushups: false, dustpan: false }
    };

    result.food.score = 0;
    result.food.wheel = { drink: false, nuts: false, dairy: false, spices: false, coffee: false };
    result.food.broccoliWheel = { dance: false, broccoli: false, tablecloth: false, pushups: false, dustpan: false };
    result.food.monthlyBonuses = { organs: [false, false, false, false], legumes: [false, false, false, false], fast24: [false, false, false, false] };
    result.food.wheelPlenoCount = 0;
    result.food.broccoliPlenoCount = 0;
    result.food.dishes = {};
    result.food.lastMonthlyReset = Date.now();
    result.food.lastMonthlyDishesReset = Date.now();
  }

  if (result.food) {
    if (!Array.isArray(result.food.history)) {
      result.food.history = [];
    }
  }

  // Special correction for Mon May 18 2026: recover Day 2 of the firewall
  if (today === "Mon May 18 2026") {
    if (result.firewallDay === 1 && (!result.firewallLastCompletedDate || result.firewallLastCompletedDate === "")) {
      result.firewallDay = 2;
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      result.firewallLastCompletedDate = yesterdayDate.toDateString();
    }
  }

  // Dynamic calculation of Hunos Plenos from the entire history + current day completions
  if (result.hunos) {
    const todayCompletedIds = result.hunos.filter(t => t.completed).map(t => t.id);
    const { plenos } = calculateHunosPlenosAndPending(
      result.hunos,
      result.hunosHistory || {},
      todayCompletedIds
    );
    result.stats.hunoPlenos = plenos;
    result.stats.hunoPlenoCurrent = plenos % 50;
  }

  return result;
};

const processBosqueData = (bosqueData: any, desencadenadoData?: any) => {
  if (!bosqueData && !desencadenadoData) return { trainedToday: false, weeklyMinutes: 0, exercises: [] };
  
  const now = new Date();
  const startOfWeek = new Date(now);
  const day = now.getDay() || 7; // Monday = 1, Sunday = 7
  startOfWeek.setDate(now.getDate() - day + 1);
  startOfWeek.setHours(0,0,0,0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23,59,59,999);

  let weeklyMinutes = 0;
  let trainedToday = false;

  const todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

  const finalExercises: any[] = [];
  const seenIds = new Set<string>();

  // 1. Bosque saves exercises inside dailyLogs[].exercises (or legacy log.exercise)
  if (bosqueData && Array.isArray(bosqueData.dailyLogs)) {
    bosqueData.dailyLogs.forEach((log: any) => {
      const dateStr = log.date;
      if (!dateStr) return;
      if (Array.isArray(log.exercises)) {
        log.exercises.forEach((ex: any, exIdx: number) => {
          const id = ex.id || `bosque_${dateStr}_${exIdx}_${ex.name || 'ex'}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            finalExercises.push({ id, date: dateStr, duration: ex.duration || 0, name: ex.name, type: ex.type });
          }
        });
      }
      if (log.exercise && typeof log.exercise === 'object') {
        const id = log.exercise.id || log.id || `bosque_${dateStr}_legacy`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          finalExercises.push({ id, date: dateStr, duration: log.exercise.duration || 0, name: log.exercise.name, type: log.exercise.type });
        }
      }
    });
  }

  // 2. Helper for Desencadenado workouts
  const processDesenWorkouts = (workouts: any[], programId = 'current') => {
    workouts.forEach(w => {
      if (w.sessionLogs && w.sessionLogs.length > 0) {
        w.sessionLogs.forEach((log: any, logIdx: number) => {
          let dateStr = log.date;
          if (!dateStr && w.date) {
            const d = new Date(w.date);
            dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
          }
          const id = `desen_${programId}_${w.id || 'w'}_log_${logIdx}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            const mins = Math.round((log.durationSeconds || 0) / 60) || 1;
            finalExercises.push({ id, date: dateStr, duration: mins, name: w.type || w.name || 'Desencadenado', type: 'fuerza', subtype: 'desencadenado' });
          }
        });
      } else {
        const isEligible = w.status === 'completed' || w.status === 'in_progress' || w.status === 'in-progress' || (w.durationSeconds && w.durationSeconds > 0);
        if (isEligible) {
          let dateStr = w.date;
          if (w.date) {
             const d = new Date(w.date);
             dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
          } else if (w.createdAt) {
             const d = new Date(w.createdAt);
             dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
          }
          const id = `desen_${programId}_${w.id || dateStr || 'w'}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            const mins = Math.round((w.durationSeconds || 0) / 60) || w.duration || w.minutes || 15;
            finalExercises.push({ id, date: dateStr, duration: mins, name: w.type || w.name || 'Desencadenado', type: 'fuerza', subtype: 'desencadenado' });
          }
        }
      }
    });
  };

  // Determine single source of truth for Desencadenado (prefer direct desencadenado database doc)
  const desenSource = (desencadenadoData && ((desencadenadoData.workouts && desencadenadoData.workouts.length > 0) || (desencadenadoData.completedPrograms && desencadenadoData.completedPrograms.length > 0)))
    ? desencadenadoData
    : (bosqueData?.desencadenado || desencadenadoData);

  if (desenSource) {
    if (Array.isArray(desenSource.workouts)) {
      processDesenWorkouts(desenSource.workouts, 'current');
    }
    if (Array.isArray(desenSource.completedPrograms)) {
      desenSource.completedPrograms.forEach((p: any, pIdx: number) => {
        if (Array.isArray(p.workouts)) processDesenWorkouts(p.workouts, p.id || `prog_${pIdx}`);
      });
    }
  }

  finalExercises.forEach(ex => {
    if (!ex.date) return;
    const d = new Date(ex.date + 'T12:00:00');
    if (d >= startOfWeek && d <= endOfWeek) {
      weeklyMinutes += (ex.duration || 0);
    }
    if (ex.date === todayStr) {
      trainedToday = true;
    }
  });

  return { trainedToday, weeklyMinutes, exercises: finalExercises };
};


function App() {
  const [view, setView] = useState<ViewState>('home');
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [loaded, setLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [historyInitialDate, setHistoryInitialDate] = useState<Date | undefined>(undefined);

  const [showFirewallModal, setShowFirewallModal] = useState(false);

  // Modo Telón (Visual Lock Screen) States
  const [modoTelonActive, setModoTelonActive] = useState(false);
  const [telonDismissed, setTelonDismissed] = useState(false);
  const [selectedEnergy, setSelectedEnergy] = useState<number | null>(null);

  // New Modo Telón form states
  const [telonStep, setTelonStep] = useState<'energy' | 'movie_ask' | 'movie_fields' | 'book_ask' | 'book_fields' | 'food' | 'workout_ask' | 'diary'>('energy');
  const [formDiaryContent, setFormDiaryContent] = useState<string>('');
  const [focusCameFromTelon, setFocusCameFromTelon] = useState<boolean>(false);
  const [formEnergy, setFormEnergy] = useState<number | null>(null);
  const [formMovieWatched, setFormMovieWatched] = useState<boolean>(false);
  const [formMovieNote, setFormMovieNote] = useState<string>('');
  
  // Book states
  const [formBookRead, setFormBookRead] = useState<boolean>(false);
  const [formBookNote, setFormBookNote] = useState<string>('');

  const [formFoodChoice, setFormFoodChoice] = useState<string>('saltar');
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [sebastianResponse, setSebastianResponse] = useState<string | null>(null);
  const [priorityTaskId, setPriorityTaskId] = useState<string | null>(null);
  const [hasCheckedInitialEnergy, setHasCheckedInitialEnergy] = useState(false);

  // Focus States
  const [showFocusModal, setShowFocusModal] = useState(false);

  const [bosqueWeeklyMinutes, setBosqueWeeklyMinutes] = useState(0);
  const [bosqueTrainedToday, setBosqueTrainedToday] = useState(false);
  const [bosqueExercises, setBosqueExercises] = useState<{date: string, duration: number}[]>([]);
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusRecommendation, setFocusRecommendation] = useState<string | null>(null);
  const [focusRecommendedTaskId, setFocusRecommendedTaskId] = useState<string | null>(null);
  const [rejectedFocusTaskIds, setRejectedFocusTaskIds] = useState<string[]>([]);
  const [focusTimerEndTime, setFocusTimerEndTime] = useState<number | null>(null);
  const [focusTimerProgress, setFocusTimerProgress] = useState<number>(0);

  useEffect(() => {
    if (!loaded || isInitializing || hasCheckedInitialEnergy) return;

    const todayStr = new Date().toDateString();
    const hasTodayEnergy = data.energyHistory && data.energyHistory[todayStr] !== undefined;
    if (!hasTodayEnergy) {
      setTelonStep('energy');
      setFormEnergy(null);
      setFormMovieWatched(false);
      setFormMovieNote('');
      setFormBookRead(false);
      setFormBookNote('');
      setFormFoodChoice('saltar');
      setModoTelonActive(true);
    }
    setHasCheckedInitialEnergy(true);
  }, [loaded, isInitializing, data.energyHistory, hasCheckedInitialEnergy]);

  useEffect(() => {
    if (view === 'food') {
      setData(prev => ({ ...prev, lastFoodEntryClick: Date.now() }));
    }
  }, [view]);

  const fetchGeminiRecommendation = async (energyVal: number) => {
    const startTime = Date.now();
    setGeminiLoading(true);
    setSebastianResponse(null);
    setPriorityTaskId(null);

    const hunosPending = data.hunos.filter(t => !t.completed);
    const yunqueLargasPending = (data.yunqueLargas || []).filter(t => !t.completed);
    const yunqueRapidasPending = (data.yunqueRapidas || []).filter(t => !t.completed);
    const roblePending = (data.forjaTasks || []).filter(t => !t.completed);
    const leonesPending = (data.leones || []).filter(t => t.current < t.target);

    const totalUncompleted = hunosPending.length + yunqueLargasPending.length + yunqueRapidasPending.length + roblePending.length + leonesPending.length;

    if (totalUncompleted === 0) {
      setSebastianResponse("Vuestros backlogs están completamente vacíos, mi señor. Disfrutad de un merecido descanso.\nSebastian, su mayordomo");
      setPriorityTaskId("none");
      setGeminiLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

    try {
      const apiKey = process.env.GEMINI_API_KEY || ((import.meta as any).env && ((import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY));

      console.log("Modo Telón - API Key starts with:", apiKey ? apiKey.substring(0, 7) + "..." : "undefined");

      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined in environment variables.");
      }

      const promptText = `
Eres Sebastian, el mayordomo del Reino. Tu señor te ha indicado que hoy tiene un nivel de energía de ${energyVal} sobre 10.
Analiza la lista de tareas pendientes que tiene acumuladas en sus diferentes backlogs y selecciona una única tarea prioritaria que se adapte mejor a su nivel de energía de hoy.
Nivel de energía: ${energyVal}/10 (donde 1 es muy baja energía y 10 es energía máxima).

${data.sebastianInstructions ? `Directrices y preferencias de tu señor para hoy:
${data.sebastianInstructions}

` : ''}Backlogs de tareas pendientes:
1. Hunos (Tareas Diarias):
${hunosPending.map(t => `- [${t.id}] ${t.text}${t.notes ? ` (Nota: ${t.notes})` : ''}`).join('\n')}

2. Yunque Largas (Tareas Complejas):
${yunqueLargasPending.map(t => `- [${t.id}] ${t.text}${t.notes ? ` (Nota: ${t.notes})` : ''}`).join('\n')}

3. Yunque Rápidas (Tareas Rápidas):
${yunqueRapidasPending.map(t => `- [${t.id}] ${t.text}${t.notes ? ` (Nota: ${t.notes})` : ''}`).join('\n')}

4. Roble (Tareas Trimestrales/Proyectos):
${roblePending.map(t => `- [${t.id}] ${t.text}${t.notes ? ` (Nota: ${t.notes})` : ''}`).join('\n')}

5. Leones (Objetivos de Recursos):
${leonesPending.map(t => `- [${t.id}] ${t.name} (${t.current}/${t.target} ${t.unit})`).join('\n')}

Por favor, responde con un objeto JSON que contenga:
- "text": Una única frase corta y respetuosa, adaptada a su nivel de energía de hoy, que explique por qué se ha seleccionado esta tarea en particular y que termine con la firma 'Sebastian, su mayordomo'.
- "taskId": El ID de la tarea seleccionada de la lista anterior. Debe coincidir exactamente con el ID proporcionado en el contexto.

Ejemplo de respuesta en "text":
"Dada la gran energía que os acompaña hoy, considero oportuno afrontar esta tarea, mi señor. Sebastian, su mayordomo"
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              thinkingConfig: {
                thinkingBudget: 0
              },
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  text: {
                    type: 'STRING',
                    description: "A single short sentence signed by 'Sebastian, su mayordomo'."
                  },
                  taskId: {
                    type: 'STRING',
                    description: "The ID of the single priority task selected from the context backlogs."
                  }
                },
                required: ['text', 'taskId']
              }
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      const contentText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!contentText) {
        throw new Error("Invalid response format from Gemini API");
      }

      const parsedData = JSON.parse(contentText);
      if (parsedData.text && parsedData.taskId) {
        setSebastianResponse(parsedData.text);
        setPriorityTaskId(parsedData.taskId);
      } else {
        throw new Error("Missing required fields in Gemini response");
      }
    } catch (e: any) {
      const elapsed = Date.now() - startTime;
      if (e.name === 'AbortError') {
        console.error(`Gemini API call timed out/aborted after ${elapsed}ms.`);
      } else {
        console.error(`Failed to fetch recommendation from Gemini API after ${elapsed}ms:`, e);
      }
      applyFallback(hunosPending, yunqueLargasPending, yunqueRapidasPending, roblePending, leonesPending);
    } finally {
      clearTimeout(timeoutId);
      setGeminiLoading(false);
    }
  };

  const applyFallback = (
    hunosPending: any[],
    yunqueLargasPending: any[],
    yunqueRapidasPending: any[],
    roblePending: any[],
    leonesPending: any[]
  ) => {
    let selected = null;
    if (hunosPending.length > 0) selected = hunosPending[0];
    else if (yunqueRapidasPending.length > 0) selected = yunqueRapidasPending[0];
    else if (yunqueLargasPending.length > 0) selected = yunqueLargasPending[0];
    else if (roblePending.length > 0) selected = roblePending[0];
    else if (leonesPending.length > 0) selected = leonesPending[0];

    if (selected) {
      setSebastianResponse(`No he podido contactar con el oráculo de Gemini, pero os sugiero esta tarea para hoy, mi señor. Sebastian, su mayordomo`);
      setPriorityTaskId(selected.id);
    } else {
      setSebastianResponse(`Vuestros backlogs están completamente vacíos, mi señor, disfrutad de un merecido descanso. Sebastian, su mayordomo`);
      setPriorityTaskId("none");
    }
  };

  useEffect(() => {
    if (!focusTimerEndTime) {
      setFocusTimerProgress(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const totalDuration = 3 * 60 * 1000; // 3 minutes
      const remaining = focusTimerEndTime - now;

      if (remaining <= 0) {
        setFocusTimerEndTime(null);
        setFocusTimerProgress(0);
        clearInterval(interval);
        
        // Play notification chime using Web Audio API (Synthesizer)
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const nowTime = ctx.currentTime;
            
            const playTone = (time: number, freq: number, duration: number) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, time);
              
              gain.gain.setValueAtTime(0, time);
              gain.gain.linearRampToValueAtTime(0.5, time + 0.05);
              gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
              
              osc.start(time);
              osc.stop(time + duration);
            };
            
            // Nice triple notification beep
            playTone(nowTime, 587.33, 0.3); // D5
            playTone(nowTime + 0.2, 587.33, 0.3);
            playTone(nowTime + 0.4, 880.00, 0.8); // A5
          }
        } catch (err) {
          console.error("Failed to play focus timer audio:", err);
        }
      } else {
        const elapsed = totalDuration - remaining;
        const progress = Math.max(0, Math.min(1.0, elapsed / totalDuration));
        setFocusTimerProgress(progress);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [focusTimerEndTime]);

  const toggleFocusTimer = () => {
    if (focusTimerEndTime) {
      setFocusTimerEndTime(null);
      setFocusTimerProgress(0);
    } else {
      // Warm up Web Audio context to allow locked/background audio playback
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const dummyCtx = new AudioContextClass();
          if (dummyCtx.state === 'suspended') {
            dummyCtx.resume();
          }
          const osc = dummyCtx.createOscillator();
          const gain = dummyCtx.createGain();
          osc.connect(gain);
          gain.connect(dummyCtx.destination);
          gain.gain.setValueAtTime(0.0001, dummyCtx.currentTime);
          osc.start(0);
          osc.stop(0.01);
        }
      } catch (e) {
        console.warn("Failed to warm up AudioContext:", e);
      }

      setFocusTimerEndTime(Date.now() + 3 * 60 * 1000);
      setFocusTimerProgress(0);
    }
  };

  const fetchFocusRecommendation = async (isReload = false) => {
    const startTime = Date.now();
    setFocusLoading(true);
    setFocusRecommendation(null);

    let currentRejected = rejectedFocusTaskIds;
    if (isReload && focusRecommendedTaskId && focusRecommendedTaskId !== 'none') {
      currentRejected = [...rejectedFocusTaskIds, focusRecommendedTaskId];
      setRejectedFocusTaskIds(currentRejected);
    } else {
      currentRejected = [];
      setRejectedFocusTaskIds([]);
    }

    setFocusRecommendedTaskId(null);
    setShowFocusModal(true);

    let hunosPending = data.hunos.filter(t => !t.completed && !currentRejected.includes(t.id));
    let yunqueLargasPending = (data.yunqueLargas || []).filter(t => !t.completed && !currentRejected.includes(t.id));
    let yunqueRapidasPending = (data.yunqueRapidas || []).filter(t => !t.completed && !currentRejected.includes(t.id));
    let roblePending = (data.forjaTasks || []).filter(t => !t.completed && !currentRejected.includes(t.id));
    let leonesPending = (data.leones || []).filter(t => t.current < t.target && !currentRejected.includes(t.id));

    let totalUncompleted = hunosPending.length + yunqueLargasPending.length + yunqueRapidasPending.length + roblePending.length + leonesPending.length;

    if (totalUncompleted === 0 && currentRejected.length > 0) {
      // Clear rejected list and retry with full pending list
      currentRejected = [];
      setRejectedFocusTaskIds([]);
      hunosPending = data.hunos.filter(t => !t.completed);
      yunqueLargasPending = (data.yunqueLargas || []).filter(t => !t.completed);
      yunqueRapidasPending = (data.yunqueRapidas || []).filter(t => !t.completed);
      roblePending = (data.forjaTasks || []).filter(t => !t.completed);
      leonesPending = (data.leones || []).filter(t => t.current < t.target);
      totalUncompleted = hunosPending.length + yunqueLargasPending.length + yunqueRapidasPending.length + roblePending.length + leonesPending.length;
    }

    if (totalUncompleted === 0) {
      setFocusRecommendation("Vuestros backlogs están completamente vacíos, mi señor. Disfrutad de un merecido descanso.");
      setFocusRecommendedTaskId("none");
      setFocusLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

    try {
      const apiKey = process.env.GEMINI_API_KEY || ((import.meta as any).env && ((import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY));
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined.");
      }

      const energyLevel = data.energy;
      const promptText = `
Eres Sebastian, el mayordomo del Reino. Tu señor te ha pedido una recomendación rápida ("Enfoque") para retomar el hilo del día.
Analiza la lista de tareas pendientes en sus backlogs y selecciona una única tarea prioritaria para retomar el rumbo de forma inmediata.

${energyLevel !== undefined && energyLevel !== null ? `El nivel de energía actual de tu señor para hoy es: ${energyLevel}/10. Selecciona una tarea acorde a este nivel de energía (por ejemplo, si su energía es baja, prioriza tareas más rápidas o simples; si su energía es alta, puedes proponer una tarea compleja o de mayor esfuerzo).
` : ''}
${data.sebastianInstructions ? `Directrices y preferencias de tu señor:
${data.sebastianInstructions}

` : ''}Backlogs de tareas pendientes:
1. Hunos (Tareas Diarias):
${hunosPending.map(t => `- [${t.id}] ${t.text}${t.notes ? ` (Nota: ${t.notes})` : ''}`).join('\n')}

2. Yunque Largas (Tareas Complejas):
${yunqueLargasPending.map(t => `- [${t.id}] ${t.text}${t.notes ? ` (Nota: ${t.notes})` : ''}`).join('\n')}

3. Yunque Rápidas (Tareas Rápidas):
${yunqueRapidasPending.map(t => `- [${t.id}] ${t.text}${t.notes ? ` (Nota: ${t.notes})` : ''}`).join('\n')}

4. Roble (Tareas Trimestrales/Proyectos):
${roblePending.map(t => `- [${t.id}] ${t.text}${t.notes ? ` (Nota: ${t.notes})` : ''}`).join('\n')}

5. Leones (Objetivos de Recursos):
${leonesPending.map(t => `- [${t.id}] ${t.name} (${t.current}/${t.target} ${t.unit})`).join('\n')}

Por favor, responde con un objeto JSON que contenga:
- "text": Una única frase muy breve y directa (máximo 15-20 palabras) que explique qué tarea sugieres y por qué, de forma motivadora y respetuosa para tu señor. NO firmes con tu nombre al final, no pongas "Sebastian, su mayordomo" ni nada parecido. Sólo la frase.
- "taskId": El ID de la tarea seleccionada de la lista anterior. Debe coincidir exactamente con el ID proporcionado en el contexto.

Ejemplo de respuesta en "text":
"Os sugiero priorizar hoy la tarea de hacer la compra ya que vuestros recursos de comida se están agotando."
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              thinkingConfig: {
                thinkingBudget: 0
              },
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  text: {
                    type: 'STRING',
                    description: "A single very brief sentence explaining what to do and why. Maximum 20 words. No signature."
                  },
                  taskId: {
                    type: 'STRING',
                    description: "The ID of the single priority task selected from the context backlogs."
                  }
                },
                required: ['text', 'taskId']
              }
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      const contentText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!contentText) {
        throw new Error("Invalid response format from Gemini API");
      }

      const parsedData = JSON.parse(contentText);
      if (parsedData.text && parsedData.taskId) {
        setFocusRecommendation(parsedData.text);
        setFocusRecommendedTaskId(parsedData.taskId);
      } else {
        throw new Error("Missing required fields");
      }
    } catch (e) {
      console.error("Error in focus recommendation:", e);
      applyFocusFallback(hunosPending, yunqueLargasPending, yunqueRapidasPending, roblePending, leonesPending);
    } finally {
      clearTimeout(timeoutId);
      setFocusLoading(false);
    }
  };

  const applyFocusFallback = (
    hunosPending: any[],
    yunqueLargasPending: any[],
    yunqueRapidasPending: any[],
    roblePending: any[],
    leonesPending: any[]
  ) => {
    let selected = null;
    if (hunosPending.length > 0) selected = hunosPending[0];
    else if (yunqueRapidasPending.length > 0) selected = yunqueRapidasPending[0];
    else if (yunqueLargasPending.length > 0) selected = yunqueLargasPending[0];
    else if (roblePending.length > 0) selected = roblePending[0];
    else if (leonesPending.length > 0) selected = leonesPending[0];

    if (selected) {
      setFocusRecommendation(`Os sugiero avanzar con la tarea de "${selected.text || selected.name}" para mantener el rumbo de hoy.`);
      setFocusRecommendedTaskId(selected.id);
    } else {
      setFocusRecommendation("Vuestros backlogs están completamente vacíos, disfrutad de un merecido descanso.");
      setFocusRecommendedTaskId("none");
    }
  };

  const getFocusRecommendedTask = (): { text: string; completed: boolean; typeName: string } | null => {
    if (!focusRecommendedTaskId || focusRecommendedTaskId === 'none') return null;
    
    const huno = data.hunos.find(t => t.id === focusRecommendedTaskId);
    if (huno) return { text: huno.text, completed: huno.completed, typeName: "Diaria" };

    const yl = (data.yunqueLargas || []).find(t => t.id === focusRecommendedTaskId);
    if (yl) return { text: yl.text, completed: yl.completed, typeName: "Compleja (Yunque)" };

    const yr = (data.yunqueRapidas || []).find(t => t.id === focusRecommendedTaskId);
    if (yr) return { text: yr.text, completed: yr.completed, typeName: "Rápida (Yunque)" };

    const ft = (data.forjaTasks || []).find(t => t.id === focusRecommendedTaskId);
    if (ft) return { text: ft.text, completed: ft.completed, typeName: "Roble" };

    const lion = (data.leones || []).find(t => t.id === focusRecommendedTaskId);
    if (lion) return { text: lion.name, completed: lion.current >= lion.target, typeName: "Recurso (Leones)" };

    return null;
  };

  const handleRegisterEnergy = async (val: number) => {
    setSelectedEnergy(val);
    const todayStr = new Date().toDateString();
    
    setData(prev => ({
      ...prev,
      energy: val,
      energyHistory: {
        ...(prev.energyHistory || {}),
        [todayStr]: val
      }
    }));

    await fetchGeminiRecommendation(val);
  };

  const getEffectiveDishesForDate = (date: Date) => {
    if (!data || !data.food) return {};
    const now = new Date();
    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
      return data.food.dishes || {};
    }
    
    const targetMonth = date.getMonth();
    const targetYear = date.getFullYear();
    const targetMonthKey = `${targetYear}-${(targetMonth + 1).toString().padStart(2, '0')}`;
    
    return data.food.monthlyHistory?.[targetMonthKey]?.dishes || {};
  };

  const getPrecedingSunday = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const diff = d.getDate() - day; // day is how many days since Sunday
    const sunday = new Date(d.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  };

  const shouldAskBookForm = () => {
    if (!data) return false;
    const today = new Date();
    const sunday = getPrecedingSunday(today);
    const sundayKey = sunday.toDateString();
    return data.lastBookFormSunday !== sundayKey;
  };

  const getUnloggedMealInfo = () => {
    if (!data || !data.food) return null;
    const now = new Date();
    const isBefore15 = now.getHours() < 15;
    
    // We will generate the sequence of meals going backwards.
    // For offset 0:
    //   if isBefore15: we don't ask about today's lunch yet (skip offset 0).
    //   if >= 15: we ask about today's lunch first.
    // For offset > 0 (1 to 7):
    //   we check dinner, then lunch of (offset) days ago.
    const candidates: { date: Date; mealType: 'lunch' | 'dinner'; dayOffset: number }[] = [];
    
    if (!isBefore15) {
      const today = new Date();
      candidates.push({ date: today, mealType: 'lunch', dayOffset: 0 });
    }
    
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      candidates.push({ date: d, mealType: 'dinner', dayOffset: i });
      candidates.push({ date: d, mealType: 'lunch', dayOffset: i });
    }
    
    for (const cand of candidates) {
      const dateStr = cand.date.toDateString();
      const score = data.food.dailyScores?.[dateStr] || {
        lunch: false,
        dinner: false,
        fasting: false,
        deliveryLunch: false,
        deliveryDinner: false,
        fah: [false, false, false, false]
      };
      
      const isLogged = cand.mealType === 'lunch'
        ? (score.lunch || score.fasting || score.deliveryLunch)
        : (score.dinner || score.fasting || score.deliveryDinner);
        
      if (!isLogged) {
        let question = '';
        const isToday = cand.dayOffset === 0;
        const isYesterday = cand.dayOffset === 1;
        const dayName = cand.date.toLocaleDateString('es-ES', { weekday: 'long' });
        
        if (cand.mealType === 'lunch') {
          if (isToday) {
            question = '¿Qué almorzaste?';
          } else if (isYesterday) {
            question = '¿Qué almorzaste ayer?';
          } else {
            question = `¿Qué almorzaste el ${dayName}?`;
          }
        } else {
          if (isYesterday) {
            question = '¿Qué cenaste?';
          } else {
            question = `¿Qué cenaste el ${dayName}?`;
          }
        }
        
        return {
          date: cand.date,
          mealType: cand.mealType,
          question
        };
      }
    }
    
    return null;
  };

  const saveJumangiareChoice = (
    currentFoodState: any,
    targetDate: Date,
    mealType: 'lunch' | 'dinner',
    choice: string
  ) => {
    const dateStr = targetDate.toDateString();
    const dailyScores = currentFoodState.dailyScores || {};
    const oldDailyScore = dailyScores[dateStr] || {
      lunch: false,
      dinner: false,
      fasting: false,
      deliveryLunch: false,
      deliveryDinner: false,
      fah: [false, false, false, false]
    };

    const newDailyScore = { ...oldDailyScore };
    if (choice === 'ayuno') {
      if (mealType === 'lunch') {
        newDailyScore.lunch = true;
        newDailyScore.lunchMeal = 'Ayuno';
      } else {
        newDailyScore.dinner = true;
        newDailyScore.dinnerMeal = 'Ayuno';
      }
    } else if (choice === 'delivery') {
      if (mealType === 'lunch') {
        newDailyScore.lunch = true;
        newDailyScore.lunchMeal = 'A domicilio';
        newDailyScore.deliveryLunch = true;
      } else {
        newDailyScore.dinner = true;
        newDailyScore.dinnerMeal = 'A domicilio';
        newDailyScore.deliveryDinner = true;
      }
    } else {
      if (mealType === 'lunch') {
        newDailyScore.lunch = true;
        newDailyScore.lunchMeal = choice;
      } else {
        newDailyScore.dinner = true;
        newDailyScore.dinnerMeal = choice;
      }
    }

    const newScores = { ...dailyScores, [dateStr]: newDailyScore };
    const oldTotal = calculateAllDaysTotal(dailyScores);
    const newTotal = calculateAllDaysTotal(newScores);
    const diff = newTotal - oldTotal;

    const activeConfig = {
      wheel: currentFoodState.config?.wheel || [],
      broccoli: currentFoodState.config?.broccoli || [],
      bonuses: currentFoodState.config?.bonuses || [],
      meals: currentFoodState.config?.meals || DEFAULT_MEALS
    };

    const now = new Date();
    const isCurrentMonthDate = targetDate.getMonth() === now.getMonth() && targetDate.getFullYear() === now.getFullYear();

    let effectiveDishes = {};
    if (isCurrentMonthDate) {
      effectiveDishes = currentFoodState.dishes || {};
    } else {
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();
      const targetMonthKey = `${targetYear}-${(targetMonth + 1).toString().padStart(2, '0')}`;
      effectiveDishes = currentFoodState.monthlyHistory?.[targetMonthKey]?.dishes || {};
    }

    const newDishes = { ...effectiveDishes };

    const getDishCountLocal = (baseName: string, max: number, currentDishes: Record<string, boolean>) => {
      let count = 0;
      for (let i = 0; i < max; i++) {
        const key = baseName + ' '.repeat(i);
        if (currentDishes[key]) count++;
      }
      return count;
    };

    const decrementDishLocal = (baseName: string, max: number, currentDishes: Record<string, boolean>) => {
      let count = getDishCountLocal(baseName, max, currentDishes);
      if (count > 0) {
        const key = baseName + ' '.repeat(count - 1);
        currentDishes[key] = false;
      }
    };

    const incrementDishLocal = (baseName: string, max: number, currentDishes: Record<string, boolean>) => {
      let count = getDishCountLocal(baseName, max, currentDishes);
      if (count < max) {
        const key = baseName + ' '.repeat(count);
        currentDishes[key] = true;
      }
    };

    if (oldDailyScore.lunchMeal && oldDailyScore.lunchMeal !== newDailyScore.lunchMeal) {
      const mealConfig = activeConfig.meals.find((m: any) => m.name === oldDailyScore.lunchMeal);
      if (mealConfig) decrementDishLocal(mealConfig.name, mealConfig.max, newDishes);
    }
    if (newDailyScore.lunchMeal && newDailyScore.lunchMeal !== oldDailyScore.lunchMeal) {
      const mealConfig = activeConfig.meals.find((m: any) => m.name === newDailyScore.lunchMeal);
      if (mealConfig) incrementDishLocal(mealConfig.name, mealConfig.max, newDishes);
    }

    if (oldDailyScore.dinnerMeal && oldDailyScore.dinnerMeal !== newDailyScore.dinnerMeal) {
      const mealConfig = activeConfig.meals.find((m: any) => m.name === oldDailyScore.dinnerMeal);
      if (mealConfig) decrementDishLocal(mealConfig.name, mealConfig.max, newDishes);
    }
    if (newDailyScore.dinnerMeal && newDailyScore.dinnerMeal !== oldDailyScore.dinnerMeal) {
      const mealConfig = activeConfig.meals.find((m: any) => m.name === newDailyScore.dinnerMeal);
      if (mealConfig) incrementDishLocal(mealConfig.name, mealConfig.max, newDishes);
    }

    const updateScore = (delta: number) => {
      return currentFoodState.score + delta;
    };

    const addHistory = (action: string, delta: number) => {
      return [
        { action, timestamp: Date.now(), delta },
        ...(currentFoodState.history || [])
      ].slice(0, 50);
    };

    if (isCurrentMonthDate) {
      return {
        ...currentFoodState,
        score: updateScore(diff),
        dailyScores: newScores,
        dishes: newDishes,
        history: diff !== 0 ? addHistory(`Día: ${targetDate.getDate()}`, diff) : (currentFoodState.history || [])
      };
    } else {
      const historyMap = currentFoodState.monthlyHistory || {};
      const monthKeyForDate = `${targetDate.getFullYear()}-${(targetDate.getMonth() + 1).toString().padStart(2, '0')}`;
      const oldMonthData = historyMap[monthKeyForDate] || {
        wheelPlenoCount: 0,
        broccoliPlenoCount: 0,
        bonuses: { organs: [false, false, false, false], legumes: [false, false, false, false], fast24: [false, false, false, false] },
        dishes: {}
      };

      return {
        ...currentFoodState,
        dailyScores: newScores,
        monthlyHistory: {
          ...historyMap,
          [monthKeyForDate]: {
            ...oldMonthData,
            dishes: newDishes
          }
        },
        history: diff !== 0 ? addHistory(`Retro-Día: ${targetDate.getDate()} (${monthKeyForDate})`, diff) : (currentFoodState.history || [])
      };
    }
  };

  const handleCompleteDailyForm = async (
    foodChoiceParam: string = 'saltar',
    movieWatchedParam: boolean = formMovieWatched,
    bookReadParam: boolean = formBookRead
  ) => {
    if (formEnergy === null) return;
    
    // 1. Process Energy Level
    setSelectedEnergy(formEnergy);
    const todayStr = new Date().toDateString();
    
    let nextData = { ...data };
    nextData.energy = formEnergy;
    nextData.energyHistory = {
      ...(nextData.energyHistory || {}),
      [todayStr]: formEnergy
    };

    // 2. Process Movie (Send note to Puerto)
    if (movieWatchedParam && formMovieNote.trim()) {
      try {
        if (user) {
          await addDoc(collection(puertoDb, 'notes'), {
            title: '',
            content: formMovieNote.trim(),
            category: 'Inbox',
            color: 'default',
            isPinned: false,
            isArchived: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            userId: user.uid,
            images: [],
            tags: []
          });
        }
      } catch (err) {
        console.error("Error saving movie note to Puerto DB:", err);
      }
    }

    // 3. Process Book (Send note to Puerto)
    const sundayKey = getPrecedingSunday(new Date()).toDateString();
    if (shouldAskBookForm()) {
      nextData.lastBookFormSunday = sundayKey;
      
      if (bookReadParam && formBookNote.trim()) {
        try {
          if (user) {
            await addDoc(collection(puertoDb, 'notes'), {
              title: '',
              content: formBookNote.trim(),
              category: 'Inbox',
              color: 'default',
              isPinned: false,
              isArchived: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              userId: user.uid,
              images: [],
              tags: []
            });
          }
        } catch (err) {
          console.error("Error saving book note to Puerto DB:", err);
        }
      }
    }

    // 4. Process Jumangiare
    const unloggedMeal = getUnloggedMealInfo();
    const finalFoodChoice = foodChoiceParam;
    if (unloggedMeal && finalFoodChoice !== 'saltar') {
      const updatedFood = saveJumangiareChoice(
        nextData.food || { score: 0, dishes: {}, dailyScores: {}, history: [] },
        unloggedMeal.date,
        unloggedMeal.mealType,
        finalFoodChoice
      );
      nextData.food = updatedFood;
    }

    // Update state to trigger Firestore sync
    setData(nextData);
  };

  const handleFinishTelon = async (
    foodChoice: string = 'saltar',
    movieWatched: boolean = formMovieWatched,
    bookRead: boolean = formBookRead
  ) => {
    await handleCompleteDailyForm(foodChoice, movieWatched, bookRead);
    setModoTelonActive(false);
    setTelonDismissed(true);
    setFocusCameFromTelon(true);
    await fetchFocusRecommendation();
  };

  const saveDiaryToAspavientos = async (content: string) => {
    if (!user) return;
    try {
      const metaDocRef = doc(aspavientosDb, 'metadata', 'meta');
      const metaSnap = await getDoc(metaDocRef);
      let lastEntryNumber = 0;
      let totalEntries = 0;
      let existingMeta = {};
      
      if (metaSnap.exists()) {
        existingMeta = metaSnap.data();
        lastEntryNumber = existingMeta.lastEntryNumber || 0;
        totalEntries = existingMeta.totalEntries || 0;
      }
      
      const newId = lastEntryNumber + 1;
      const now = Date.now();
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const year = yesterday.getFullYear();
      const month = String(yesterday.getMonth() + 1).padStart(2, '0');
      const day = String(yesterday.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const entry = {
        id: newId,
        date: dateStr,
        content: content,
        palabrario: [],
        flores: "",
        createdAt: now,
        updatedAt: now
      };
      
      const entryDocRef = doc(aspavientosDb, 'entries', newId.toString());
      await setDoc(entryDocRef, entry);
      
      const updatedMeta = {
        ...existingMeta,
        lastEntryNumber: newId,
        totalEntries: totalEntries + 1,
        lastUpdated: now
      };
      await setDoc(metaDocRef, updatedMeta);
      console.log("Guardada entrada en Aspavientos:", newId, dateStr);
    } catch (e) {
      console.error("Error guardando en la base de datos de Aspavientos:", e);
    }
  };

  const handleSaveWorkoutToBosque = async (workoutType: string, completed: boolean) => {
    if (!user) return;
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const year = yesterday.getFullYear();
      const month = String(yesterday.getMonth() + 1).padStart(2, '0');
      const day = String(yesterday.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const monthPrefix = `${year}-${month}`;

      const docRef = doc(bosqueDb, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      let bosqueData: any = { dailyLogs: [], body: [] };
      if (docSnap.exists()) {
        bosqueData = docSnap.data();
      }
      
      const dailyLogs = bosqueData.dailyLogs || [];
      const bodyEntries = bosqueData.body || [];
      
      let log = dailyLogs.find((l: any) => l.date === dateStr);
      if (!log) {
        log = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), date: dateStr };
        dailyLogs.push(log);
      }
      
      // Update daily logs yesterdayWorkout
      log.yesterdayWorkout = {
        type: workoutType,
        completed: completed,
        timestamp: Date.now()
      };
      
      // Find or create monthly body entry
      let bodyEntry = bodyEntries.find((b: any) => b.date && b.date.startsWith(monthPrefix) && b.date.endsWith('-01'));
      if (!bodyEntry) {
        bodyEntry = bodyEntries.find((b: any) => b.date && b.date.startsWith(monthPrefix));
      }
      if (!bodyEntry) {
        bodyEntry = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          date: `${monthPrefix}-01`,
          impulso: 0,
          peso: 0
        };
        bodyEntries.push(bodyEntry);
      }
      
      // Calculate total completed days for this month from dailyLogs
      const monthLogs = dailyLogs.filter((l: any) => l.date && l.date.startsWith(monthPrefix));
      const impulsoCount = monthLogs.filter((l: any) => l.yesterdayWorkout?.type === 'impulso' && l.yesterdayWorkout?.completed === true).length;
      const pesoCount = monthLogs.filter((l: any) => l.yesterdayWorkout?.type === 'peso' && l.yesterdayWorkout?.completed === true).length;
      
      bodyEntry.impulso = impulsoCount;
      bodyEntry.peso = pesoCount;
      
      await setDoc(docRef, { ...bosqueData, dailyLogs, body: bodyEntries }, { merge: true });
      console.log("Guardado registro de impulso/peso en Bosque:", dateStr, log.yesterdayWorkout, "y actualizado cuerpo:", bodyEntry);
    } catch (e) {
      console.error("Error guardando registro en Bosque:", e);
    }
  };

  const triggerTelonManually = () => {
    setTelonStep('energy');
    setFormEnergy(null);
    setFormMovieWatched(false);
    setFormMovieNote('');
    
    setFormBookRead(false);
    setFormBookNote('');

    setFormFoodChoice('saltar');
    setFormDiaryContent('');
    setFocusCameFromTelon(false);
    setSelectedEnergy(null);
    
    setShowHistory(false);
    setHistoryInitialDate(undefined);
    setModoTelonActive(true);
  };

  const isPriorityTaskCompleted = (taskId: string | null): boolean => {
    if (!taskId || taskId === 'none') return false;
    
    const huno = data.hunos.find(t => t.id === taskId);
    if (huno) return huno.completed;

    const yl = (data.yunqueLargas || []).find(t => t.id === taskId);
    if (yl) return yl.completed;

    const yr = (data.yunqueRapidas || []).find(t => t.id === taskId);
    if (yr) return yr.completed;

    const ft = (data.forjaTasks || []).find(t => t.id === taskId);
    if (ft) return ft.completed;

    const lt = (data.leones || []).find(t => t.id === taskId);
    if (lt) return lt.current >= lt.target;

    // For weekly tasks (Setas), link completion status to the corresponding daily Huno containing "seta"
    if ((data.sets || []).some(t => t.id === taskId)) {
      const setaHuno = data.hunos.find(h => h.text.toLowerCase().includes('seta'));
      return setaHuno ? setaHuno.completed : false;
    }

    // For monthly/annual tasks (Trenes), link completion status to the corresponding daily Huno containing "tren"
    if ((data.trains || []).some(t => t.id === taskId) || (data.annualTrains || []).some(t => t.id === taskId)) {
      const trenHuno = data.hunos.find(h => h.text.toLowerCase().includes('tren'));
      return trenHuno ? trenHuno.completed : false;
    }

    // For Nubes (proyectos), link completion status to the corresponding daily Huno containing "nube" or "proyecto"
    if ((data.projects || []).some(t => t.id === taskId)) {
      const nubeHuno = data.hunos.find(h => h.text.toLowerCase().includes('nube') || h.text.toLowerCase().includes('proyecto'));
      return nubeHuno ? nubeHuno.completed : false;
    }

    // For Leones (resources), link completion status to the corresponding daily Huno containing "león" or "leon" or "leones"
    if ((data.leones || []).some(t => t.id === taskId)) {
      const leonesHuno = data.hunos.find(h => h.text.toLowerCase().includes('león') || h.text.toLowerCase().includes('leon') || h.text.toLowerCase().includes('leones'));
      return leonesHuno ? leonesHuno.completed : false;
    }

    return false;
  };

  const getPriorityTaskText = (taskId: string | null): string => {
    if (!taskId || taskId === 'none') return "";

    const huno = data.hunos.find(t => t.id === taskId);
    if (huno) return huno.text;

    const yl = (data.yunqueLargas || []).find(t => t.id === taskId);
    if (yl) return yl.text;

    const yr = (data.yunqueRapidas || []).find(t => t.id === taskId);
    if (yr) return yr.text;

    const ft = (data.forjaTasks || []).find(t => t.id === taskId);
    if (ft) return ft.text;

    const lt = (data.leones || []).find(t => t.id === taskId);
    if (lt) return lt.name;

    const st = (data.sets || []).find(t => t.id === taskId);
    if (st) return st.text;

    const tr = (data.trains || []).find(t => t.id === taskId);
    if (tr) return tr.text;

    const atr = (data.annualTrains || []).find(t => t.id === taskId);
    if (atr) return atr.text;

    const projectTask = (data.projects || []).find(t => t.id === taskId);
    if (projectTask) return projectTask.text;

    return "Tarea desconocida";
  };

  const getPriorityTaskType = (taskId: string | null): string => {
    if (!taskId || taskId === 'none') return "";

    if (data.hunos.some(t => t.id === taskId)) return "Hunos";
    if ((data.yunqueLargas || []).some(t => t.id === taskId)) return "Yunque (Larga)";
    if ((data.yunqueRapidas || []).some(t => t.id === taskId)) return "Yunque (Rápida)";
    if ((data.forjaTasks || []).some(t => t.id === taskId)) return "Roble";
    if ((data.leones || []).some(t => t.id === taskId)) return "Leones";
    if ((data.sets || []).some(t => t.id === taskId)) return "Setas (Semanales)";
    if ((data.trains || []).some(t => t.id === taskId)) return "Trenes (Mensuales)";
    if ((data.annualTrains || []).some(t => t.id === taskId)) return "Trenes Anuales";
    if ((data.projects || []).some(t => t.id === taskId)) return "Nubes (Proyectos)";

    return "Desconocido";
  };

  const handlePriorityTaskToggle = (taskId: string | null) => {
    if (!taskId || taskId === 'none') return;

    const isCompleted = isPriorityTaskCompleted(taskId);

    if (data.hunos.some(t => t.id === taskId)) {
      const hunoTask = data.hunos.find(t => t.id === taskId);
      if (hunoTask && (hunoTask.text.includes('Gim'))) return;
      const nextHunos = data.hunos.map(t => t.id === taskId ? { ...t, completed: !isCompleted } : t);
      handleHunosUpdate(nextHunos);
      return;
    }

    // For weekly tasks (Setas), toggle the daily Huno instead of the specific weekly task
    if ((data.sets || []).some(t => t.id === taskId)) {
      const setaHuno = data.hunos.find(h => h.text.toLowerCase().includes('seta'));
      if (setaHuno) {
        const nextHunos = data.hunos.map(t => t.id === setaHuno.id ? { ...t, completed: !isCompleted } : t);
        handleHunosUpdate(nextHunos);
      }
      return;
    }

    // For monthly/annual tasks (Trenes), toggle the daily Huno instead of the specific monthly/annual task
    if ((data.trains || []).some(t => t.id === taskId) || (data.annualTrains || []).some(t => t.id === taskId)) {
      const trenHuno = data.hunos.find(h => h.text.toLowerCase().includes('tren'));
      if (trenHuno) {
        const nextHunos = data.hunos.map(t => t.id === trenHuno.id ? { ...t, completed: !isCompleted } : t);
        handleHunosUpdate(nextHunos);
      }
      return;
    }

    // For Nubes (proyectos), toggle the daily Huno instead of the specific Nube task
    if ((data.projects || []).some(t => t.id === taskId)) {
      const nubeHuno = data.hunos.find(h => h.text.toLowerCase().includes('nube') || h.text.toLowerCase().includes('proyecto'));
      if (nubeHuno) {
        const nextHunos = data.hunos.map(t => t.id === nubeHuno.id ? { ...t, completed: !isCompleted } : t);
        handleHunosUpdate(nextHunos);
      }
      return;
    }

    // For Leones (resources), toggle the daily Huno instead of the specific resource task
    if ((data.leones || []).some(t => t.id === taskId)) {
      const leonesHuno = data.hunos.find(h => h.text.toLowerCase().includes('león') || h.text.toLowerCase().includes('leon') || h.text.toLowerCase().includes('leones'));
      if (leonesHuno) {
        const nextHunos = data.hunos.map(t => t.id === leonesHuno.id ? { ...t, completed: !isCompleted } : t);
        handleHunosUpdate(nextHunos);
      }
      return;
    }
  };

  const handleTelonBack = () => {
    if (telonStep === 'movie_ask') {
      setTelonStep('energy');
      setFormEnergy(null);
    } else if (telonStep === 'movie_fields') {
      setTelonStep('movie_ask');
    } else if (telonStep === 'book_ask') {
      if (formMovieWatched) {
        setTelonStep('movie_fields');
      } else {
        setTelonStep('movie_ask');
      }
    } else if (telonStep === 'book_fields') {
      setTelonStep('book_ask');
    } else if (telonStep === 'food') {
      if (shouldAskBookForm()) {
        if (formBookRead) {
          setTelonStep('book_fields');
        } else {
          setTelonStep('book_ask');
        }
      } else {
        if (formMovieWatched) {
          setTelonStep('movie_fields');
        } else {
          setTelonStep('movie_ask');
        }
      }
    } else if (telonStep === 'workout_ask') {
      const unlogged = getUnloggedMealInfo();
      if (unlogged) {
        setTelonStep('food');
      } else if (shouldAskBookForm()) {
        if (formBookRead) {
          setTelonStep('book_fields');
        } else {
          setTelonStep('book_ask');
        }
      } else {
        if (formMovieWatched) {
          setTelonStep('movie_fields');
        } else {
          setTelonStep('movie_ask');
        }
      }
    } else if (telonStep === 'diary') {
      setTelonStep('workout_ask');
    } else if (telonStep === 'focus') {
      setTelonStep('diary');
    }
  };

  const renderModoTelon = () => {
    const isCompleted = isPriorityTaskCompleted(priorityTaskId);
    const taskText = getPriorityTaskText(priorityTaskId);
    const taskType = getPriorityTaskType(priorityTaskId);
    const unloggedMeal = getUnloggedMealInfo();

    const activeConfig = {
      wheel: data.food?.config?.wheel || [],
      broccoli: data.food?.config?.broccoli || [],
      bonuses: data.food?.config?.bonuses || [],
      meals: data.food?.config?.meals || DEFAULT_MEALS
    };

    const targetDate = unloggedMeal?.date;
    const currentDishes = targetDate ? getEffectiveDishesForDate(targetDate) : {};
    const availableDishes = activeConfig.meals.filter(meal => {
      let count = 0;
      for (let i = 0; i < meal.max; i++) {
        const key = meal.name + ' '.repeat(i);
        if (currentDishes[key]) count++;
      }
      return count < meal.max;
    });

    const isMovieFormValid = !formMovieWatched || formMovieNote.trim().length > 0;
    const isBookFormValid = !formBookRead || formBookNote.trim().length > 0;
    const isFormValid = formEnergy !== null && isMovieFormValid && isBookFormValid;

    return (
      <div className="flex flex-col min-h-screen max-w-md mx-auto bg-stone-950 p-6 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-yellow-500/5 blur-3xl rounded-full pointer-events-none" />

        <header className="flex justify-between items-center z-10 mb-6 mt-4 min-h-[32px]">
          <div>
            {telonStep !== 'energy' && (
              <button
                type="button"
                onClick={handleTelonBack}
                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-stone-500 hover:text-stone-300 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Atrás
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setModoTelonActive(false);
              setTelonDismissed(true);
            }}
            className="text-[10px] font-black uppercase tracking-wider text-stone-500 hover:text-stone-300 transition-colors py-1.5 px-3 rounded-full hover:bg-stone-900/50"
          >
            Saltar a la App
          </button>
        </header>

        <div className="flex-1 flex flex-col justify-center items-center z-10 max-w-sm mx-auto w-full overflow-hidden">
          <div className="w-full space-y-6 animate-in fade-in duration-300 pr-2">
              {telonStep === 'energy' && (
                <div className="w-full text-center space-y-8 animate-in fade-in duration-500">
                  <div className="space-y-3">
                    <h1 className="text-3xl font-black text-stone-100 tracking-tighter uppercase italic">
                      Energía
                    </h1>
                  </div>

                  <div className="grid grid-cols-5 gap-3 max-w-xs mx-auto">
                    {Array.from({ length: 10 }).map((_, i) => {
                      const val = i + 1;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setFormEnergy(val);
                            const todayStr = new Date().toDateString();
                            setData(prev => ({
                              ...prev,
                              energy: val,
                              energyHistory: {
                                ...(prev.energyHistory || {}),
                                [todayStr]: val
                              }
                            }));
                            setTelonStep('movie_ask');
                          }}
                          className="aspect-square rounded-full border-2 border-amber-900/40 bg-stone-900 text-amber-200 hover:border-amber-500 hover:bg-amber-900/20 active:scale-95 transition-all font-black text-lg flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.05)] hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {telonStep === 'movie_ask' && (
                <div className="w-full text-center space-y-8 animate-in fade-in duration-500">
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-amber-950/40 border border-amber-500/30 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                      <Film className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-black text-stone-100 tracking-tighter uppercase italic">
                      Cartelera
                    </h1>
                    <p className="text-stone-400 text-xs font-medium max-w-[280px] mx-auto leading-relaxed">
                      ¿Ayer viste alguna película?
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setFormMovieWatched(true);
                        setTelonStep('movie_fields');
                      }}
                      className="py-4 px-6 rounded-2xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-stone-950 font-black text-sm uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-2 shadow-lg shadow-amber-950/20"
                    >
                      <Check className="w-5 h-5 stroke-[3]" />
                      Sí, vi una
                    </button>
                    
                    <button
                      type="button"
                      onClick={async () => {
                        setFormMovieWatched(false);
                        if (shouldAskBookForm()) {
                          setTelonStep('book_ask');
                        } else {
                          const unlogged = getUnloggedMealInfo();
                          if (unlogged) {
                            setTelonStep('food');
                          } else {
                            setTelonStep('workout_ask');
                          }
                        }
                      }}
                      className="py-4 px-6 rounded-2xl bg-stone-900 border border-stone-800 hover:border-stone-700 active:scale-95 text-stone-300 font-bold text-sm uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5 text-stone-500 stroke-[3]" />
                      No
                    </button>
                  </div>
                </div>
              )}

              {telonStep === 'movie_fields' && (
                <div className="w-full space-y-6 animate-in fade-in duration-500 max-w-xs mx-auto text-left">
                  <div className="text-center">
                    <h2 className="text-2xl font-black text-stone-100 tracking-tighter uppercase italic">
                      Cartelera
                    </h2>
                  </div>

                  <div className="bg-stone-900 backdrop-blur-md rounded-2xl p-5 shadow-xl">
                    <textarea 
                      rows={4}
                      placeholder="Ejemplo: Ayer vi..."
                      value={formMovieNote}
                      onChange={(e) => setFormMovieNote(e.target.value)}
                      className="bg-stone-950 text-stone-200 placeholder-stone-600 rounded-xl p-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 w-full transition-colors resize-none leading-relaxed border border-stone-800/60"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={!formMovieNote.trim()}
                    onClick={async () => {
                      if (shouldAskBookForm()) {
                        setTelonStep('book_ask');
                      } else {
                        const unlogged = getUnloggedMealInfo();
                        if (unlogged) {
                          setTelonStep('food');
                        } else {
                          setTelonStep('workout_ask');
                        }
                      }
                    }}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest italic transition-all duration-300 border border-transparent
                      ${formMovieNote.trim()
                        ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-stone-950 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)] cursor-pointer'
                        : 'bg-stone-950 text-stone-700 cursor-not-allowed'}`}
                  >
                    Siguiente
                  </button>
                </div>
              )}

              {telonStep === 'book_ask' && (
                <div className="w-full text-center space-y-8 animate-in fade-in duration-500">
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-indigo-950/40 border border-indigo-500/30 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-black text-stone-100 tracking-tighter uppercase italic">
                      Biblioteca
                    </h1>
                    <p className="text-stone-400 text-xs font-medium max-w-[280px] mx-auto leading-relaxed">
                      ¿Has leído algún libro esta semana?
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setFormBookRead(true);
                        setTelonStep('book_fields');
                      }}
                      className="py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-stone-950 font-black text-sm uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-2 shadow-lg shadow-indigo-950/20"
                    >
                      <Check className="w-5 h-5 stroke-[3]" />
                      Sí, leí uno
                    </button>
                    
                    <button
                      type="button"
                      onClick={async () => {
                        setFormBookRead(false);
                        const unlogged = getUnloggedMealInfo();
                        if (unlogged) {
                          setTelonStep('food');
                        } else {
                          setTelonStep('workout_ask');
                        }
                      }}
                      className="py-4 px-6 rounded-2xl bg-stone-900 border border-stone-800 hover:border-stone-700 active:scale-95 text-stone-300 font-bold text-sm uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5 text-stone-500 stroke-[3]" />
                      No
                    </button>
                  </div>
                </div>
              )}

              {telonStep === 'book_fields' && (
                <div className="w-full space-y-6 animate-in fade-in duration-500 max-w-xs mx-auto text-left">
                  <div className="text-center">
                    <h2 className="text-2xl font-black text-stone-100 tracking-tighter uppercase italic">
                      Biblioteca
                    </h2>
                  </div>

                  <div className="bg-stone-900 backdrop-blur-md rounded-2xl p-5 shadow-xl">
                    <textarea 
                      rows={4}
                      placeholder="Ejemplo: Esta semana he leído..."
                      value={formBookNote}
                      onChange={(e) => setFormBookNote(e.target.value)}
                      className="bg-stone-950 text-stone-200 placeholder-stone-600 rounded-xl p-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 w-full transition-colors resize-none leading-relaxed border border-stone-800/60"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={!formBookNote.trim()}
                    onClick={async () => {
                      const unlogged = getUnloggedMealInfo();
                      if (unlogged) {
                        setTelonStep('food');
                      } else {
                        setTelonStep('workout_ask');
                      }
                    }}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest italic transition-all duration-300 border border-transparent
                      ${formBookNote.trim()
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-stone-950 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(99,102,241,0.2)] cursor-pointer'
                        : 'bg-stone-950 text-stone-700 cursor-not-allowed'}`}
                  >
                    Siguiente
                  </button>
                </div>
              )}

              {telonStep === 'food' && unloggedMeal && (
                <div className="w-full space-y-6 animate-in fade-in duration-500 max-w-lg mx-auto text-left">
                  <div className="space-y-1 text-center">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-emerald-950/40 border border-emerald-500/30 text-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.1)] shrink-0">
                        <Utensils className="w-4 h-4" />
                      </div>
                      <h2 className="text-2xl font-black text-stone-100 tracking-tighter uppercase italic leading-none">
                        Jumangiare
                      </h2>
                    </div>
                    <p className="text-stone-400 text-xs font-medium text-center">
                      {unloggedMeal.question}
                    </p>
                  </div>

                  <div className="bg-stone-900 backdrop-blur-md rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="flex flex-wrap gap-2 pr-1">
                      {availableDishes.map((meal) => (
                        <button
                          key={meal.name}
                          type="button"
                          onClick={() => {
                            setFormFoodChoice(meal.name);
                            setTelonStep('workout_ask');
                          }}
                          className="px-3.5 py-2 rounded-xl bg-stone-950 border border-transparent text-stone-300 hover:border-emerald-500 hover:bg-emerald-950/20 active:scale-95 transition-all text-left font-bold text-xs flex items-center gap-2"
                        >
                          <span className="text-sm">{meal.icon}</span>
                          <span>{meal.name}</span>
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          setFormFoodChoice('ayuno');
                          setTelonStep('workout_ask');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-blue-950/30 border border-blue-900/30 text-blue-300 hover:border-blue-500 hover:bg-blue-950/50 active:scale-95 transition-all text-left font-bold text-xs flex items-center gap-2"
                      >
                        <Timer className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>Ayuno</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFormFoodChoice('delivery');
                          setTelonStep('workout_ask');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-red-950/50 border border-red-900/40 text-red-300 hover:border-red-500 hover:bg-red-950/70 active:scale-95 transition-all text-left font-bold text-xs flex items-center gap-2"
                      >
                        <Bike className="w-4 h-4 text-red-400 shrink-0" />
                        <span>A domicilio</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFormFoodChoice('Meh');
                          setTelonStep('workout_ask');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-stone-950 border border-transparent text-stone-400 hover:border-stone-600 hover:bg-stone-900/20 active:scale-95 transition-all text-left font-bold text-xs flex items-center gap-2"
                      >
                        <span className="text-sm">🤷</span>
                        <span>Meh</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {telonStep === 'workout_ask' && (() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const dayNum = yesterday.getDate();
                const isOdd = dayNum % 2 !== 0;
                const workoutType = isOdd ? 'impulso' : 'peso';
                const emoji = isOdd ? '🏃' : '🏋️';
                const label = isOdd ? 'Impulso (Día Impar)' : 'Peso (Día Par)';

                return (
                  <div className="w-full text-center space-y-8 animate-in fade-in duration-500 max-w-xs mx-auto">
                    <div className="space-y-3">
                      <div className="w-12 h-12 bg-amber-950/40 border border-amber-500/30 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                        <span className="text-2xl">{emoji}</span>
                      </div>
                      <h1 className="text-2xl font-black text-stone-100 tracking-tighter uppercase italic leading-none">
                        {label}
                      </h1>
                      <p className="text-stone-400 text-xs font-medium max-w-[280px] mx-auto leading-relaxed">
                        ¿Hiciste ayer el entrenamiento de **{workoutType}**?
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                      <button
                        type="button"
                        onClick={async () => {
                          await handleSaveWorkoutToBosque(workoutType, true);
                          setTelonStep('diary');
                        }}
                        className="py-4 px-6 rounded-2xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-stone-950 font-black text-sm uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-2 shadow-lg shadow-amber-950/20"
                      >
                        <Check className="w-5 h-5 stroke-[3]" />
                        Sí, completado
                      </button>
                      
                      <button
                        type="button"
                        onClick={async () => {
                          await handleSaveWorkoutToBosque(workoutType, false);
                          setTelonStep('diary');
                        }}
                        className="py-4 px-6 rounded-2xl bg-stone-900 border border-stone-800 hover:border-stone-700 active:scale-95 text-stone-300 font-bold text-sm uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-2"
                      >
                        <X className="w-5 h-5 text-stone-500 stroke-[3]" />
                        No lo hice
                      </button>
                    </div>
                  </div>
                );
              })()}
              {telonStep === 'diary' && (
                <div className="w-full space-y-6 animate-in fade-in duration-500 max-w-sm mx-auto text-left">
                  <div className="space-y-1 text-center">
                    <h2 className="text-2xl font-black text-stone-100 tracking-tighter uppercase italic">
                      Aspavientos
                    </h2>
                    <p className="text-stone-400 text-xs font-medium leading-relaxed">
                      ¿Qué recuerdas de ayer?
                    </p>
                  </div>

                  <div className="bg-stone-900 backdrop-blur-md rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="space-y-1">
                      <textarea
                        placeholder="Escribe aquí tus recuerdos de ayer..."
                        value={formDiaryContent}
                        onChange={(e) => setFormDiaryContent(e.target.value)}
                        className="bg-stone-950 text-stone-200 placeholder-stone-600 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 w-full min-h-[180px] resize-none transition-colors leading-relaxed"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (formDiaryContent.trim()) {
                        await saveDiaryToAspavientos(formDiaryContent.trim());
                      }
                      await handleFinishTelon(formFoodChoice, formMovieWatched, formBookRead);
                    }}
                    className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest italic transition-all duration-300 bg-gradient-to-r from-amber-600 to-yellow-600 text-stone-950 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)] cursor-pointer text-center"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>

        <footer className="mt-12 text-center text-stone-800 text-[10px] font-bold tracking-widest uppercase z-10 shrink-0">
          Sebastian · Reino de la Voluntad
        </footer>
      </div>
    );
  };

  useEffect(() => {
    if (!loaded) return;

    const todayStr = new Date().toDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();
    const currentFirewallDay = data.firewallDay || 0;

    if (currentFirewallDay > 0 && currentFirewallDay <= 3) {
      if (data.firewallLastCompletedDate === todayStr) {
        setShowFirewallModal(false);
      } else if (data.firewallLastCompletedDate === yesterdayStr) {
        setShowFirewallModal(true);
      } else {
        const currentChecked = data.firewallChecked || { ducha: false, calle: false, huno: false };
        const hasCheckedItems = currentChecked.ducha || currentChecked.calle || currentChecked.huno;
        if (data.firewallDay !== 1 || data.firewallLastCompletedDate !== "") {
          setData(prev => ({
            ...prev,
            firewallDay: 1,
            firewallLastCompletedDate: "",
            firewallChecked: { ducha: false, calle: false, huno: false }
          }));
        }
        setShowFirewallModal(true);
      }
    } else {
      const reviews = data.streakReviewedDays || {};
      let unreviewedDaysCount = 0;
      for (let i = 1; i <= 4; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toDateString();
        if (!reviews[key]) {
          unreviewedDaysCount++;
        }
      }

      if (unreviewedDaysCount === 4) {
        const currentChecked = data.firewallChecked || { ducha: false, calle: false, huno: false };
        const hasCheckedItems = currentChecked.ducha || currentChecked.calle || currentChecked.huno;
        if (data.firewallDay !== 1 || data.firewallLastCompletedDate !== "") {
          setData(prev => ({
            ...prev,
            firewallDay: 1,
            firewallLastCompletedDate: "",
            firewallChecked: { ducha: false, calle: false, huno: false }
          }));
        }
        setShowFirewallModal(true);
      } else {
        setShowFirewallModal(false);
      }
    }
  }, [loaded, data.firewallDay, data.firewallLastCompletedDate, data.streakReviewedDays]);

  const handleCompleteFirewallDay = () => {
    const todayStr = new Date().toDateString();
    const currentChecked = data.firewallChecked || { ducha: false, calle: false, huno: false };
    const isFulfilled = Object.values(currentChecked).every(v => v);
    
    setData(prev => {
      const currentDay = prev.firewallDay || 1;
      let nextDay = 1; // Default to resetting to Day 1 if not fulfilled
      if (isFulfilled) {
        nextDay = currentDay >= 3 ? 0 : currentDay + 1;
      }
      return {
        ...prev,
        firewallDay: nextDay,
        firewallLastCompletedDate: todayStr,
        firewallChecked: { ducha: false, calle: false, huno: false } // Reset checked status upon completion!
      };
    });
    setShowFirewallModal(false);
  };

  const getPastFiveDays = () => {
    const days = [];
    for (let i = 5; i >= 1; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    return days;
  };

  const calculateStreak = () => {
    const reviews = data.streakReviewedDays || {};
    const todayStr = new Date().toDateString();
    
    const isReviewed = (dateStr: string) => {
      return !!reviews[dateStr];
    };

    let streak = 0;
    const checkDate = new Date();
    
    if (isReviewed(todayStr)) {
      while (isReviewed(checkDate.toDateString())) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    } else {
      checkDate.setDate(checkDate.getDate() - 1);
      if (isReviewed(checkDate.toDateString())) {
        while (isReviewed(checkDate.toDateString())) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
    }
    
    return streak;
  };

  const toggleStreakDayReview = (date: Date) => {
    const dateKey = date.toDateString();
    const isCurrentlyMarked = !!data.streakReviewedDays?.[dateKey];
    const newMarked = !isCurrentlyMarked;
    
    setData(prev => ({
      ...prev,
      streakReviewedDays: {
        ...(prev.streakReviewedDays || {}),
        [dateKey]: newMarked
      }
    }));

    if (newMarked) {
      setTimeout(() => {
        setHistoryInitialDate(date);
        setShowHistory(true);
      }, 400);
    }
  };

  const [showProjectConfirm, setShowProjectConfirm] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState<{ show: boolean, type: 'hunos' | 'projects', reward: string }>({ show: false, type: 'hunos', reward: '' });
  const [lastProjectToggledIndex, setLastProjectToggledIndex] = useState<number | null>(null);

  const [isEditingProjects, setIsEditingProjects] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectText, setNewProjectText] = useState('');
  const [showProjectPromptModal, setShowProjectPromptModal] = useState(false);
  const [isNubesCollapsed, setIsNubesCollapsed] = useState(true);
  const [noteEditingProjectId, setNoteEditingProjectId] = useState<string | null>(null);
  const [tempProjectNoteText, setTempProjectNoteText] = useState('');

  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showFootModal, setShowFootModal] = useState(false);
  const [showGympiezaModal, setShowGympiezaModal] = useState(false);

  // Magic Task Interception States
  const [magicTaskId, setMagicTaskId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get('magicTask');
  });
  const [magicTaskProcessing, setMagicTaskProcessing] = useState<boolean>(!!magicTaskId);

  // --- MOBILE BACK BUTTON SUPPORT ---
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state) {
        if (state.view) setView(state.view);
        if (state.modal === 'gympieza') setShowGympiezaModal(true);
        else setShowGympiezaModal(false);
      } else {
        setView('home');
        setShowGympiezaModal(false);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Ensure initial state exists
    if (!window.history.state) {
      window.history.replaceState({ view: 'home' }, '');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const currentState = window.history.state;
    const modalState = showGympiezaModal ? 'gympieza' : null;
    
    // Solo hacemos push si el estado actual es diferente al deseado
    if (currentState?.view !== view || currentState?.modal !== modalState) {
      window.history.pushState({ view, modal: modalState }, '');
    }
  }, [view, showGympiezaModal]);

  // --- NOTIFICATION REMINDER LOOP ---
  useEffect(() => {
    if (!loaded || isInitializing) return;

    const checkNotification = () => {
      const now = new Date();
      const currentHHiMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayDate = now.toDateString();

      // Check if it's time and we haven't sent it today
      if (currentHHiMM === (data.reminderTime || '07:00') && data.lastReminderDate !== todayDate) {
        if (Notification.permission === 'granted') {
          new Notification("¿El Reino?", {
            body: "¿Apuntaste todo lo de ayer?",
            icon: '/pwa-192x192.png',
            tag: 'daily-reminder' // Avoid duplicates
          });

          // Update lastReminderDate to avoid repeat in the same minute or day
          const updatedData = { ...data, lastReminderDate: todayDate };
          setData(updatedData);

          // Persist to Firebase if user is logged in
          if (user) {
            const habitsRef = collection(db, 'users', user.uid, 'habits');
            const serialized = serializeAppData(updatedData);
            const batch = writeBatch(db);
            serialized.forEach(d => {
              batch.set(doc(habitsRef, d.id), d.data);
            });
            batch.commit().catch(console.error);
          }
        }
      }
    };

    const timer = setInterval(checkNotification, 60000); // Check every minute
    checkNotification(); // Initial check

    return () => clearInterval(timer);
  }, [data.reminderTime, data.lastReminderDate, loaded, isInitializing, user, data]);
  // ----------------------------------
  // ----------------------------------
  const [authReady, setAuthReady] = useState(false);
  const lastSnapshotData = useRef<string>('');
  const isFirstRender = useRef(true);
  const isRemoteUpdate = useRef(false);
  const pendingWritesTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email !== 'jugalipo@gmail.com') {
        setAuthError('Solo el usuario jugalipo@gmail.com está autorizado para acceder a esta aplicación.');
        await logout();
        setUser(null);
      } else {
        setUser(currentUser);
        if (currentUser) {
          setAuthError(null);
        }
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      setAuthError(null);
      const loggedUser = await loginWithGoogle();
      if (loggedUser && loggedUser.email !== 'jugalipo@gmail.com') {
        setAuthError('Solo el usuario jugalipo@gmail.com está autorizado para acceder a esta aplicación.');
        await logout();
        setUser(null);
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setAuthError('Error al iniciar sesión con Google.');
    }
  };

  useEffect(() => {
    if (!magicTaskId || !authReady) return;

    if (!user) {
      setMagicTaskProcessing(false);
      return;
    }

    setMagicTaskProcessing(true);

    const executeMagicTask = async () => {
      try {
        const hunosDocRef = doc(db, 'users', user.uid, 'habits', 'hunos');
        const yunqueDocRef = doc(db, 'users', user.uid, 'habits', 'yunque');

        const [hunosSnap, yunqueSnap] = await Promise.all([
          getDoc(hunosDocRef),
          getDoc(yunqueDocRef)
        ]);

        let hunosUpdated = false;
        let yunqueUpdated = false;

        let hunosItems = [];
        if (hunosSnap.exists()) {
          hunosItems = hunosSnap.data()?.items || [];
        }

        let yunqueLargas = [];
        let yunqueRapidas = [];
        if (yunqueSnap.exists()) {
          yunqueLargas = yunqueSnap.data()?.largas || [];
          yunqueRapidas = yunqueSnap.data()?.rapidas || [];
        }

        hunosItems = hunosItems.map((task: any) => {
          if (task.id === magicTaskId) {
            hunosUpdated = true;
            return { ...task, completed: true };
          }
          return task;
        });

        yunqueLargas = yunqueLargas.map((task: any) => {
          if (task.id === magicTaskId) {
            yunqueUpdated = true;
            return { ...task, completed: true };
          }
          return task;
        });
        yunqueRapidas = yunqueRapidas.map((task: any) => {
          if (task.id === magicTaskId) {
            yunqueUpdated = true;
            return { ...task, completed: true };
          }
          return task;
        });

        if (hunosUpdated || yunqueUpdated) {
          const batch = writeBatch(db);
          if (hunosUpdated) {
            batch.set(hunosDocRef, { items: hunosItems }, { merge: true });
          }
          if (yunqueUpdated) {
            batch.set(yunqueDocRef, { largas: yunqueLargas, rapidas: yunqueRapidas }, { merge: true });
          }
          await batch.commit();
          console.log("Magic task updated successfully in Firestore.");
        } else {
          console.log("Magic task not found in hunos or yunque.");
        }
      } catch (error) {
        console.error("Error executing magic task:", error);
      } finally {
        const url = new URL(window.location.href);
        url.searchParams.delete('magicTask');
        window.history.replaceState(null, '', url.pathname + url.search);

        setMagicTaskId(null);
        setMagicTaskProcessing(false);
      }
    };

    executeMagicTask();
  }, [authReady, user, magicTaskId]);

  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      setLoaded(true);
      setIsInitializing(false);
      return;
    }

    const habitsRef = collection(db, 'users', user.uid, 'habits');
    let unsubscribe: (() => void) | undefined;
    let unsubscribeBosque: (() => void) | undefined;
    let unsubscribeDesencadenado: (() => void) | undefined;

    const initializeData = async () => {
      setIsInitializing(true);
      isFirstRender.current = true;
      try {
        let snapshot;
        try {
          snapshot = await getDocsFromServer(habitsRef);
        } catch (e) {
          console.log("No se pudo obtener del servidor, usando caché", e);
          snapshot = await getDocs(habitsRef);
        }

        if (!snapshot.empty) {
          const docs = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
          const newData = deserializeAppData(docs);
          const processedData = processResets(newData);

          if (JSON.stringify(newData) !== JSON.stringify(processedData)) {
            if (!snapshot.metadata.fromCache) {
              const batch = writeBatch(db);
              const serializedDocs = serializeAppData(processedData);
              serializedDocs.forEach(d => {
                batch.set(doc(habitsRef, d.id), d.data);
              });
              await batch.commit().catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/habits`));
            } else {
              isRemoteUpdate.current = true;
            }
          }

          lastSnapshotData.current = JSON.stringify(processedData);
          setData(processedData);
        } else {
          const localDataStr = localStorage.getItem('warrior_habits_v4');
          if (localDataStr) {
            console.log("Migrating local data to Firestore...");
            const localData = JSON.parse(localDataStr);
            const batch = writeBatch(db);
            const docs = serializeAppData(localData);
            docs.forEach(d => {
              batch.set(doc(habitsRef, d.id), d.data);
            });
            await batch.commit();
            console.log("Purging local storage...");
            localStorage.removeItem('warrior_habits_v4');

            const processedData = processResets(localData);
            lastSnapshotData.current = JSON.stringify(processedData);
            setData(processedData);
          } else {
            const batch = writeBatch(db);
            const docs = serializeAppData(INITIAL_DATA);
            docs.forEach(d => {
              batch.set(doc(habitsRef, d.id), d.data);
            });
            await batch.commit().catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/habits`));
            lastSnapshotData.current = JSON.stringify(INITIAL_DATA);
            setData(INITIAL_DATA);
          }
        }
      } catch (error) {
        console.error("Initialization failed:", error);
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/habits`);
      } finally {
        setIsInitializing(false);
        setLoaded(true);

        unsubscribe = onSnapshot(habitsRef, (snapshot) => {
          if (!snapshot.empty) {
            if (pendingWritesTimer.current) return;

            const docs = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
            const newData = deserializeAppData(docs);
            const processedData = processResets(newData);

            const newProcessedStr = JSON.stringify(processedData);
            if (lastSnapshotData.current !== newProcessedStr) {
              lastSnapshotData.current = newProcessedStr;
              isRemoteUpdate.current = true;
              setData(processedData);
            }
          }
        }, (error) => {
          console.error("Firestore sync error:", error);
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}/habits`);
        });

        let latestBosqueData: any = null;
        let latestDesencadenadoData: any = null;

        const updateBosqueStats = () => {
          const { trainedToday, weeklyMinutes, exercises } = processBosqueData(latestBosqueData, latestDesencadenadoData);
          setBosqueTrainedToday(trainedToday);
          setBosqueWeeklyMinutes(weeklyMinutes);
          setBosqueExercises(exercises);
        };

        unsubscribeBosque = onSnapshot(doc(bosqueDb, 'users', user.uid), (snapshot) => {
          if (snapshot.exists()) {
            latestBosqueData = snapshot.data();
            updateBosqueStats();
          }
        }, (error) => {
          console.error('Bosque Firestore sync error:', error);
        });

        unsubscribeDesencadenado = onSnapshot(doc(desencadenadoDb, 'state', user.uid), (snapshot) => {
          if (snapshot.exists()) {
            latestDesencadenadoData = snapshot.data();
            updateBosqueStats();
          }
        }, (error) => {
          console.error('Desencadenado Firestore sync error:', error);
        });
      }
    };

    initializeData();

    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribeBosque) unsubscribeBosque();
      if (unsubscribeDesencadenado) unsubscribeDesencadenado();
    };
  }, [user, authReady]);

  useEffect(() => {
    if (!isInitializing && loaded && (bosqueTrainedToday || bosqueExercises.length > 0)) {
      setData(prev => {
        const gimHuno = prev.hunos.find(h => h.shortcut === 'exercise' || h.text.toLowerCase().includes('gim'));
        if (!gimHuno) return prev;

        let changed = false;
        let newHunos = prev.hunos;
        let newHistory = prev.hunosHistory ? { ...prev.hunosHistory } : {};

        // 1. Auto-mark today if trainedToday
        if (bosqueTrainedToday) {
          const gimIndex = prev.hunos.findIndex(h => h.id === gimHuno.id);
          if (gimIndex !== -1 && !prev.hunos[gimIndex].completed) {
            newHunos = [...newHunos];
            newHunos[gimIndex] = { ...newHunos[gimIndex], completed: true };
            changed = true;
          }
        }

        // 2. Check historical exercises: for each date in bosqueExercises, ensure gimHuno is in hunosHistory
        const todayKey = new Date().toDateString();
        bosqueExercises.forEach(ex => {
          if (!ex.date) return;
          const d = new Date(ex.date + 'T12:00:00');
          const dateKey = d.toDateString();
          if (dateKey !== todayKey) {
            const completedList = newHistory[dateKey] || [];
            if (!completedList.includes(gimHuno.id)) {
              newHistory[dateKey] = [...completedList, gimHuno.id];
              changed = true;
            }
          }
        });

        if (changed) {
          // Recalculate missedDays & failedYesterday for all hunos based on updated history
          const historyDates = Object.keys(newHistory).map(d => new Date(d).getTime());
          const oldestHistoryDate = historyDates.length > 0 ? Math.min(...historyDates) : new Date().getTime();

          newHunos = newHunos.map(t => {
            let missedCount = 0;
            let checkDate = new Date();
            checkDate.setDate(checkDate.getDate() - 1);
            checkDate.setHours(0, 0, 0, 0);

            while (checkDate.getTime() >= oldestHistoryDate) {
              const checkString = checkDate.toDateString();
              const completedOnCheckDate = (newHistory[checkString] || []).includes(t.id);
              if (completedOnCheckDate) {
                break;
              } else {
                missedCount++;
                checkDate.setDate(checkDate.getDate() - 1);
                checkDate.setHours(0, 0, 0, 0);
                if (missedCount >= 30) break;
              }
            }

            return {
              ...t,
              failedYesterday: missedCount > 0,
              missedDays: missedCount
            };
          });

          return {
            ...prev,
            hunos: newHunos,
            hunosHistory: newHistory
          };
        }

        return prev;
      });
    }
  }, [bosqueTrainedToday, bosqueExercises, isInitializing, loaded]);

  useEffect(() => {
    if (isInitializing || !loaded || !user) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    if (pendingWritesTimer.current) {
      clearTimeout(pendingWritesTimer.current);
    }

    pendingWritesTimer.current = setTimeout(async () => {
      try {
        const batch = writeBatch(db);
        const docs = serializeAppData(data);
        const habitsRef = collection(db, 'users', user.uid, 'habits');
        docs.forEach(d => {
          batch.set(doc(habitsRef, d.id), d.data);
        });
        await batch.commit();
        lastSnapshotData.current = JSON.stringify(data);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/habits`);
      } finally {
        pendingWritesTimer.current = null;
      }
    }, 500);

  }, [data, loaded, user, isInitializing]);

  if (magicTaskProcessing) {
    return (
      <div className="bg-stone-950 min-h-screen text-stone-200 font-sans select-none sm:select-text relative flex items-center justify-center">
        <div className="text-xl text-stone-400 font-medium tracking-tight">
          Registrado por Sebastian.
        </div>
      </div>
    );
  }

  if (!loaded || !authReady) return (
    <div className="bg-stone-950 min-h-screen text-stone-200 font-sans select-none sm:select-text relative">
      <div className="max-w-md mx-auto bg-stone-950 min-h-screen shadow-2xl overflow-hidden relative border-x border-stone-900 flex items-center justify-center">
        <div className="text-stone-400">Cargando...</div>
      </div>
    </div>
  );

  if (!user && !isGuest) {
    return (
      <div className="bg-stone-950 min-h-screen text-stone-200 font-sans select-none sm:select-text relative">
        <div className="max-w-md mx-auto bg-stone-950 min-h-screen shadow-2xl overflow-hidden relative border-x border-stone-900 flex flex-col items-center justify-center p-6">
          <h1 className="text-4xl font-black text-stone-100 tracking-tighter mb-8">EL REINO</h1>
          <p className="text-stone-400 mb-8 text-center max-w-sm">
            Inicia sesión para sincronizar tus hábitos entre dispositivos.
          </p>
          {authError && (
            <div className="bg-red-950/40 border border-red-500/30 text-red-200 px-4 py-3 rounded-2xl text-xs font-black text-center mb-6 max-w-xs uppercase tracking-wider animate-in fade-in slide-in-from-top-2 duration-300">
              ⚠️ {authError}
            </div>
          )}
          <button
            onClick={handleLogin}
            className="bg-stone-100 text-stone-900 font-bold py-3 px-6 rounded-xl hover:bg-white transition-colors mb-4"
          >
            Iniciar sesión con Google
          </button>
          <button
            onClick={() => {
              setAuthError(null);
              setIsGuest(true);
            }}
            className="text-stone-500 font-medium py-2 px-4 rounded-xl hover:text-stone-300 transition-colors"
          >
            Continuar como invitado
          </button>
        </div>
      </div>
    );
  }

  const handleHunosUpdate = (newTasks: Task[], incrementPleno: boolean = false) => {
    // Helper to find task by shortcut and trigger view change if just completed
    const triggerShortcut = (shortcut: string, view: ViewState | (() => void)) => {
      const tasksNew = newTasks.filter(t => t.shortcut === shortcut);
      tasksNew.forEach(tNew => {
        const tOld = data.hunos.find(t => t.id === tNew.id);
        if (tOld && !tOld.completed && tNew.completed) {
          if (typeof view === 'function') {
            setTimeout(view, 1200);
          } else {
            setTimeout(() => setView(view), 1200);
          }
        }
      });
    };

    triggerShortcut('love', 'love');
    triggerShortcut('forjas', 'forjas');
    triggerShortcut('yunque', 'yunque');
    triggerShortcut('leones', 'leones');
    triggerShortcut('food', 'food');
    triggerShortcut('sets', 'sets');
    triggerShortcut('trains', 'trains');
    triggerShortcut('projects', () => setShowProjectPromptModal(true));

    const todayKey = new Date().toDateString();
    const completedIds = newTasks.filter(t => t.completed).map(t => t.id);
    const updatedHistory = { ...(data.hunosHistory || {}), [todayKey]: completedIds };

    // Dynamic calculation of Hunos Plenos from the entire history + today's completions
    const { plenos: newHunoPlenos } = calculateHunosPlenosAndPending(
      newTasks,
      data.hunosHistory || {},
      completedIds
    );

    const newHunoPlenoCurrent = newHunoPlenos % 50;

    // Trigger congratulations if a new 50-plenos threshold is crossed
    const oldHunoPlenos = data.stats.hunoPlenos || 0;
    if (newHunoPlenos > oldHunoPlenos) {
      const oldThresh = Math.floor(oldHunoPlenos / 50);
      const newThresh = Math.floor(newHunoPlenos / 50);
      if (newThresh > oldThresh) {
        setShowCongratulations({ show: true, type: 'hunos', reward: data.stats.hunoReward || 'Tu recompensa' });
      }
    }

    setData(prev => ({
      ...prev,
      hunos: newTasks,
      hunosHistory: updatedHistory,
      stats: {
        ...prev.stats,
        hunoPlenos: newHunoPlenos,
        hunoPlenoCurrent: newHunoPlenoCurrent
      }
    }));
  };

  const updateWeeklyGoal = (type: 'leones' | 'forjas' | 'puerto', field: 'text' | 'completed', value: string | boolean) => {
    setData(prev => {
      const currentGoals = prev.weeklyGoals || {
        leones: { text: "", completed: false },
        forjas: { text: "", completed: false },
        puerto: { text: "", completed: false },
        lastReset: Date.now()
      };
      return {
        ...prev,
        weeklyGoals: {
          ...currentGoals,
          [type]: {
            ...currentGoals[type],
            [field]: value
          }
        }
      };
    });
  };

  const toggleProject = (index: number) => {
    if (isEditingProjects) return;
    const project = data.projects[index];
    const todayStr = new Date(Date.now()).toDateString();

    if (project.completed) {
      const newProjects = [...data.projects];
      newProjects[index] = { ...project, completed: false };
      setData(prev => {
        const hm = { ...(prev.projectsHistoryMap || {}) };
        if (hm[todayStr]) {
          hm[todayStr] = hm[todayStr].filter(id => id !== project.id);
        }
        return { ...prev, projects: newProjects, projectsHistoryMap: hm };
      });
      return;
    }
    const newProjects = [...data.projects];
    newProjects[index] = { ...project, completed: true };
    setData(prev => {
      const hm = { ...(prev.projectsHistoryMap || {}) };
      const todayP = [...(hm[todayStr] || [])];
      if (!todayP.includes(project.id)) todayP.push(project.id);
      hm[todayStr] = todayP;
      return { ...prev, projects: newProjects, projectsHistoryMap: hm };
    });

    const isLastOne = newProjects.every(p => p.completed);
    if (isLastOne) {
      setLastProjectToggledIndex(index);
      setShowProjectConfirm(true);
    }
  };

  const handleProjectTextChange = (id: string, newText: string) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, text: newText } : p)
    }));
  };

  const handleProjectNotesChange = (id: string, newNotes: string) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, notes: newNotes } : p)
    }));
  };

  const initiateAddProject = () => { setIsAddingProject(true); setNewProjectText(''); };
  const confirmAddProject = () => {
    if (!newProjectText.trim()) return;
    const newProj = { id: `proj-${Date.now()}`, text: newProjectText, completed: false };
    setData(prev => ({ ...prev, projects: [...prev.projects, newProj] }));
    setIsAddingProject(false);
  };
  const initiateDeleteProject = (id: string) => setProjectToDelete(id);
  const confirmDeleteProject = () => {
    if (!projectToDelete) return;
    setData(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== projectToDelete) }));
    setProjectToDelete(null);
  };
  const confirmProjectPleno = () => {
    let newProjectPlenoCurrent = (data.stats.projectPlenoCurrent || 0) + 1;
    let newProjectTrophies = data.stats.projectPlenos || 0;

    if (newProjectPlenoCurrent >= 20) {
      newProjectPlenoCurrent = 0;
      newProjectTrophies += 1;
      setShowCongratulations({ show: true, type: 'projects', reward: data.stats.projectReward || 'Tu recompensa' });
    }

    setData(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        projectPlenos: newProjectTrophies,
        projectPlenoCurrent: newProjectPlenoCurrent
      },
      projects: prev.projects.map(p => ({ ...p, completed: false }))
    }));
    setShowProjectConfirm(false);
    setLastProjectToggledIndex(null);
  };
  const cancelProjectPleno = () => {
    if (lastProjectToggledIndex !== null) {
      const reverted = [...data.projects];
      reverted[lastProjectToggledIndex].completed = false;
      setData({ ...data, projects: reverted });
    }
    setShowProjectConfirm(false);
    setLastProjectToggledIndex(null);
  };

  const handleSetsUpdate = (newTasks: WeeklyTask[]) => {
    const allCompleted = newTasks.length > 0 && newTasks.every(t => t.completed);
    const wasClaimed = data.setsPlenoClaimed || false;
    let newStats = { ...data.stats };
    let newClaimed = wasClaimed;
    if (allCompleted && !wasClaimed) { newStats.perfectSetsWeeks += 1; newClaimed = true; }
    else if (!allCompleted && wasClaimed) { newStats.perfectSetsWeeks = Math.max(0, newStats.perfectSetsWeeks - 1); newClaimed = false; }
    setData(prev => ({ ...prev, sets: newTasks, stats: newStats, setsPlenoClaimed: newClaimed }));
  };

  const handleTrainsUpdate = (newTasks: Task[]) => {
    const allCompleted = newTasks.length > 0 && newTasks.every(t => t.completed);
    const wasClaimed = data.trainsPlenoClaimed || false;
    let newStats = { ...data.stats };
    let newClaimed = wasClaimed;
    if (allCompleted && !wasClaimed) { newStats.perfectTrainMonths += 1; newClaimed = true; }
    else if (!allCompleted && wasClaimed) { newStats.perfectTrainMonths = Math.max(0, newStats.perfectTrainMonths - 1); newClaimed = false; }
    setData(prev => ({ ...prev, trains: newTasks, stats: newStats, trainsPlenoClaimed: newClaimed }));
  };

  const getCurrentMonthlyFoodScore = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const baseScore = calculateAllDaysTotal(data.food.dailyScores || {}, currentMonth, currentYear);
    const plenoScore = (data.food.wheelPlenoCount || 0) * 3 + (data.food.broccoliPlenoCount || 0) * 1;
    
    const bonuses = data.food.monthlyBonuses || {};
    let bonusScore = 0;
    if (bonuses.organs) bonusScore += (bonuses.organs as boolean[]).filter(s => s).length * 3;
    if (bonuses.legumes) bonusScore += (bonuses.legumes as boolean[]).filter(s => s).length * 3;
    if (bonuses.fast24) bonusScore += (bonuses.fast24 as boolean[]).filter(s => s).length * 4;
    
    return baseScore + plenoScore + bonusScore;
  };

  const getTrainProgress = () => {
    if (data.trains.length === 0) return 0;
    return Math.round((data.trains.filter(t => t.completed).length / data.trains.length) * 100);
  };

  const hasImportantLoveEventToday = () => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const hasBirthday = data.friends?.some(f => {
      if (!f.birthday) return false;
      const parts = f.birthday.split('-');
      if (parts.length === 3) {
        return parseInt(parts[1], 10) === currentMonth && parseInt(parts[2], 10) === currentDay;
      }
      return false;
    });

    if (hasBirthday) return true;

    // Default fallback to match RemindersSection if user hasn't modified reminders yet
    const fallbackReminders = [
      { id: '1', title: 'Nos casamos', date: '2022-05-22', notifyYearly: true, notifyMonthly: true, notify100Days: true },
      { id: '2', title: 'Empezamos a salir', date: '2017-05-24', notifyYearly: true, notifyMonthly: true, notify100Days: true },
      { id: '3', title: 'Nos fuimos a vivir juntos', date: '2017-09-04', notifyYearly: true, notifyMonthly: true, notify100Days: true },
      { id: '4', title: 'Empezó a trabajar', date: '2020-10-16', notifyYearly: true, notifyMonthly: true, notify100Days: true },
      { id: '5', title: 'En Hacienda', date: '2024-06-15', notifyYearly: true, notifyMonthly: true, notify100Days: true },
      { id: '6', title: 'Días Cotizados', date: '2020-07-18', notifyYearly: true, notifyMonthly: true, notify100Days: true },
      { id: '7', title: 'Santa Alicia', date: '2000-06-23', notifyYearly: true, notifyMonthly: false, notify100Days: false, hideAge: true },
      { id: '8', title: 'Cumpleaños Alicia', date: '1993-06-14', notifyYearly: true, notifyMonthly: false, notify100Days: false }
    ];

    const hasReminder = (data.reminders || fallbackReminders).some((reminder: any) => {
      if (!reminder.date) return false;
      const eventDate = new Date(reminder.date);
      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      
      if (reminder.notifyYearly) {
        let nextA = new Date(todayDate.getFullYear(), eventDateOnly.getMonth(), eventDateOnly.getDate());
        if (nextA.getTime() < todayDate.getTime()) {
          nextA = new Date(todayDate.getFullYear() + 1, eventDateOnly.getMonth(), eventDateOnly.getDate());
        }
        if (Math.floor((nextA.getTime() - todayDate.getTime()) / 86400000) === 0) return true;
      }
      
      if (reminder.notifyMonthly) {
        let nextM = new Date(todayDate.getFullYear(), todayDate.getMonth(), eventDateOnly.getDate());
        if (nextM.getTime() < todayDate.getTime()) {
          nextM = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, eventDateOnly.getDate());
        }
        if (Math.floor((nextM.getTime() - todayDate.getTime()) / 86400000) === 0) return true;
      }
      
      if (reminder.notify100Days) {
        const diffDaysStart = Math.floor((todayDate.getTime() - eventDateOnly.getTime()) / 86400000);
        if (diffDaysStart >= 0) {
            let next100 = Math.ceil(diffDaysStart / 100) * 100;
            if (next100 === 0) next100 = 100;
            if (next100 - diffDaysStart === 0) return true;
        }
      }
      return false;
    });

    return hasReminder;
  };

  const getLoveProgress = () => {
    if (data.friends.length === 0) return 0;
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    const greenCount = data.friends.filter(f => now - f.lastInteraction < oneMonth).length;
    return Math.round((greenCount / data.friends.length) * 100);
  };

  const getResourceProgress = (tasks: ResourceTask[], isForjas: boolean = false) => {
    if (tasks.length === 0) return 0;

    if (isForjas) {
      // Quarterly Tasks are indices 1-4 (if they exist)
      const quarterlyTasks = tasks.length > 1 ? tasks.slice(1, 5) : [];
      if (quarterlyTasks.length === 0) return 0;

      return quarterlyTasks.reduce((acc, task) => acc + Math.min(100, (task.current / task.target) * 100), 0) / quarterlyTasks.length;
    }

    const task = tasks[0];
    if (task.target === 0) return 0;
    return Math.min(100, (task.current / task.target) * 100);
  };

  const renderSetsPreview = () => {
    const createCapSlicePath = (index: number, total: number, radius: number, cx: number, cy: number) => {
      const span = 180;
      const startAngle = 180 + (index * span) / total;
      const endAngle = 180 + ((index + 1) * span) / total;
      const startRad = startAngle * (Math.PI / 180);
      const endRad = endAngle * (Math.PI / 180);
      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);
      return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
    };

    const stemPath = `
      M 75 100 
      L 125 100 
      Q 130 100 130 110
      L 130 145
      A 30 20 0 0 1 70 145
      L 70 110
      Q 70 100 75 100
      Z
    `;

    const chartTasks = [...data.sets].sort((a, b) => Number(b.completed) - Number(a.completed));
    const total = data.sets.length;
    const tasksCount = total > 0 ? total : 1;
    const slices = total > 0 ? chartTasks : [{ id: 'empty', completed: false }];

    return (
      <svg width="100%" height="100%" viewBox="0 0 200 160" className="w-full h-full object-contain">
        {slices.map((task, index) => (
            <path
                key={task.id}
                d={createCapSlicePath(index, tasksCount, 90, 100, 100)}
                fill={task.completed ? '#ef4444' : '#450a0a'}
                stroke="#1c1917"
                strokeWidth="2.5"
                className="transition-all duration-300 ease-in-out"
            />
        ))}
        <line x1="10" y1="100" x2="190" y2="100" stroke="#1c1917" strokeWidth="3" />
        <path d={stemPath} fill="#ffffff" stroke="#1c1917" strokeWidth="2.5" />
      </svg>
    );
  };

  const renderTrainsPreview = () => {
    let completedSubtasksCount = 0;
    let totalSubtasksCount = 0;
    
    data.trains.forEach(task => {
        const subs = task.subtasks || [];
        if (subs.length > 0) {
            totalSubtasksCount += subs.length;
            completedSubtasksCount += subs.filter(s => s.completed).length;
        } else {
            totalSubtasksCount += 1;
            completedSubtasksCount += task.completed ? 1 : 0;
        }
    });

    const progress = totalSubtasksCount === 0 ? 0 : (completedSubtasksCount / totalSubtasksCount) * 100;

    return (
      <svg width="100%" height="100%" viewBox="0 0 400 120" className="w-full h-full object-contain overflow-visible px-2">
          <path 
              d="M 380 60 H 350 V 100 H 300 V 20 H 250 V 100 H 200 V 20 H 150 V 100 H 100 V 20 H 50 V 60 H 20" 
              fill="none" 
              stroke="#262626" 
              strokeWidth="14" 
              strokeLinecap="round" 
              strokeLinejoin="round"
          />
          <path 
              d="M 380 60 H 350 V 100 H 300 V 20 H 250 V 100 H 200 V 20 H 150 V 100 H 100 V 20 H 50 V 60 H 20" 
              fill="none" 
              stroke="url(#progressGradientTrain)" 
              strokeWidth="14" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              strokeDasharray="1000"
              strokeDashoffset={1000 - (1000 * (progress / 100))}
              className="transition-all duration-1000 ease-in-out"
              style={{ filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.4))' }}
          />
          <defs>
              <linearGradient id="progressGradientTrain" x1="100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
          </defs>
      </svg>
    );
  };

  const getMonthLabel = () => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[new Date().getMonth()];
  };

  const renderView = () => {
    if (modoTelonActive) {
      return renderModoTelon();
    }
    switch (view) {
      case 'trains': return <TrainView tasks={data.trains} annualTasks={data.annualTrains} onUpdate={handleTrainsUpdate} onUpdateAnnual={(t) => setData(prev => ({ ...prev, annualTrains: t }))} onBack={() => setView('home')} reminderDismissedToday={data.lastAnnualTrainReminderDate === new Date().toISOString().split('T')[0]} onDismissReminder={() => setData(prev => ({ ...prev, lastAnnualTrainReminderDate: new Date().toISOString().split('T')[0] }))} />;
      case 'sets': return <SetsView tasks={data.sets} onUpdate={handleSetsUpdate} onBack={() => setView('home')} />;
      case 'love': return <LoveTreeView 
        friends={data.friends} 
        onUpdate={(f) => setData(prev => ({ ...prev, friends: f }))} 
        onBack={() => setView('home')} 
        reminders={data.reminders} 
        onUpdateReminders={(r) => setData(prev => ({ ...prev, reminders: r }))}
        sortBy={data.loveTreeSortBy}
        onSortChange={(s) => setData(prev => ({ ...prev, loveTreeSortBy: s }))}
      />;
      case 'food': return <FoodBoardView foodState={data.food} onUpdate={(f) => setData(prev => ({ ...prev, food: f }))} onBack={() => setView('home')} />;
      case 'forjas': return <ResourceTrackerView title="Roble" themeColor="orange" tasks={data.forjas} forjaTasks={data.forjaTasks || []} onUpdateForjaTasks={t => setData(prev => ({ ...prev, forjaTasks: t }))} onUpdate={t => setData(prev => ({ ...prev, forjas: t }))} onBack={() => setView('home')} />;
      case 'leones': return <ResourceTrackerView title="Leones" themeColor="amber" tasks={data.leones} billetesState={data.billetesState || Array(20).fill(false)} huchaCount={data.huchaCount || 0} onUpdateBilletes={(bs, hc) => setData(prev => ({ ...prev, billetesState: bs, huchaCount: hc }))} leonesState={data.leonesState || Array(20).fill(false)} leonesCount={data.leonesCount || 0} onUpdateLeones={(ls, lc) => setData(prev => ({ ...prev, leonesState: ls, leonesCount: lc }))} onUpdate={t => setData(prev => ({ ...prev, leones: t }))} onBack={() => setView('home')} />;
      case 'piano': return <PianoView pianoState={data.piano} onUpdate={p => setData(prev => ({ ...prev, piano: p }))} onBack={() => setView('home')} />;
      case 'yunque': return <YunqueView largas={data.yunqueLargas || []} rapidas={data.yunqueRapidas || []} onUpdateLargas={t => setData(prev => ({ ...prev, yunqueLargas: t }))} onUpdateRapidas={t => setData(prev => ({ ...prev, yunqueRapidas: t }))} onBack={() => setView('home')} />;
      case 'stats': return <StatsView data={data} bosqueExercises={bosqueExercises} onUpdate={setData} onBack={() => setView('home')} onNavigate={setView} />;
      case 'caminos': return <CaminosView caminos={data.caminos || []} onUpdate={c => setData(prev => ({ ...prev, caminos: c }))} onBack={() => setView('home')} />;
      case 'tools': return <ToolsView onBack={() => setView('home')} />;
      default:
        const trainProgress = getTrainProgress();
        const isTrainPleno = trainProgress === 100;
        const isSetsPleno = data.sets.length > 0 && data.sets.every(t => t.completed);
        const currentFoodScore = getCurrentMonthlyFoodScore();
        const isFoodPleno = currentFoodScore >= 200;
        return (
          <div className={`flex flex-col min-h-screen max-w-md mx-auto bg-stone-950 p-6 relative ${!hideFloatingButtons ? 'pb-28' : ''}`}>
            <header className="mb-6 mt-4 flex justify-between items-center w-full gap-2">
              {/* Small Streak Dial in Header */}
              <div className="flex-1 flex items-center justify-between">
                {/* Left Side: 5 circles representing the past 5 days, connected by a line */}
                <div className="flex-1 flex flex-col justify-center pr-4">
                  <div className="relative flex justify-between items-center w-full px-2">
                    {/* Connecting Line */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-[10%] right-[10%] h-[2px] bg-stone-800 -z-0" />
                    
                    {(() => {
                      const pastDays = getPastFiveDays();
                      return pastDays.map((d, index) => {
                        const dateKey = d.toDateString();
                        const isMarked = !!data.streakReviewedDays?.[dateKey];
                        const dayNumber = d.getDate();

                        return (
                          <div key={dateKey} className="flex flex-col items-center relative z-10">
                            {/* Interactive Circle Button */}
                            <button
                              onClick={() => toggleStreakDayReview(d)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                                isMarked
                                  ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)] scale-105 hover:bg-purple-500'
                                  : 'bg-stone-950 border-stone-800 text-stone-600 hover:border-stone-600 hover:text-stone-400'
                              }`}
                              title={`Revisar ${d.toLocaleDateString()}`}
                            >
                              {isMarked ? (
                                <Check className="w-5 h-5 stroke-[3]" />
                              ) : (
                                <span className="text-xs font-black">{dayNumber}</span>
                              )}
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Right Side: Speech Bubble showing current Streak */}
                {(() => {
                  const currentStreak = calculateStreak();
                  return (
                    <div className="flex flex-col items-center justify-center pl-2">
                      <div className="relative">
                        {/* Speech Bubble / Badge */}
                        <div className={`bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-stone-950 px-4 h-11 rounded-2xl shadow-[0_0_15px_rgba(249,115,22,0.4)] flex flex-col items-center justify-center min-w-[50px] relative ${
                          currentStreak === 0 ? 'animate-pulse duration-[3000ms]' : ''
                        }`}>
                          <span className="text-2xl font-black tracking-tighter leading-none">
                            {currentStreak}
                          </span>
                          {/* Tiny speech bubble pointer/arrow */}
                          <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-orange-500 rotate-45" style={{ zIndex: -1 }} />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Stats Button */}
              <div className="flex items-center">
                <button onClick={() => setView('stats')} className="h-11 w-11 bg-stone-900 rounded-2xl hover:bg-stone-800 transition-colors border border-stone-800 flex items-center justify-center shadow-sm">
                  <BarChart3 className="w-5 h-5 text-stone-500" />
                </button>
              </div>
            </header>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => setView('trains')}
                className={`aspect-[4/3] rounded-2xl p-4 flex items-center justify-center transition-all duration-700 border shadow-sm group ${isTrainPleno
                    ? 'bg-blue-600/30 border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.4)] ring-2 ring-blue-500/20 scale-[1.02] animate-pulse'
                    : 'bg-blue-950/30 border-blue-900/50 hover:bg-blue-900/50'
                  }`}
              >
                <div className={`w-full h-full flex items-center justify-center transition-all ${isTrainPleno ? 'brightness-125 saturate-150' : ''}`}>
                  {renderTrainsPreview()}
                </div>
              </button>
              <button
                onClick={() => setView('sets')}
                className={`aspect-[4/3] rounded-2xl p-4 flex items-center justify-center transition-all duration-700 border shadow-sm group ${isSetsPleno
                    ? 'bg-red-600/30 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.4)] ring-2 ring-red-500/20 scale-[1.02] animate-pulse'
                    : 'bg-red-950/30 border-red-900/50 hover:bg-red-900/50'
                  }`}
              >
                <div className={`w-full h-full flex items-center justify-center transition-all ${isSetsPleno ? 'brightness-125 saturate-150' : ''}`}>
                  {renderSetsPreview()}
                </div>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <button onClick={() => setView('love')} className="aspect-square bg-pink-950/30 rounded-xl flex flex-col items-center justify-between p-2 hover:bg-pink-900/50 transition-colors border border-pink-900/50 group relative">
                <div className="flex-1 flex items-center justify-center">
                  <Heart className={`w-8 h-8 transition-colors ${hasImportantLoveEventToday() ? 'text-yellow-500 fill-current drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] scale-110' : 'text-pink-500 group-hover:text-pink-400'}`} />
                </div>
                <div className="w-full h-1 bg-pink-900/40 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 transition-all duration-300" style={{ width: `${getLoveProgress()}%` }}></div>
                </div>
              </button>
              <button onClick={() => setView('leones')} className="aspect-square bg-amber-950/30 rounded-xl flex flex-col items-center justify-between p-2 hover:bg-amber-900/50 transition-colors border border-amber-900/50 group relative"><div className="flex-1 flex items-center justify-center"><Cat className="w-8 h-8 text-amber-500 group-hover:text-amber-400 transition-colors" /></div><div className="w-full h-1 bg-amber-900/40 rounded-full overflow-hidden"><div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${getResourceProgress(data.leones)}%` }}></div></div></button>
              <button onClick={() => setView('forjas')} className="aspect-square bg-orange-950/30 rounded-xl flex flex-col items-center justify-between p-2 hover:bg-orange-900/50 transition-colors border border-orange-900/50 group relative"><div className="flex-1 flex items-center justify-center"><TreeDeciduous className="w-8 h-8 text-orange-500 group-hover:text-orange-400 transition-colors" /></div><div className="w-full h-1 bg-orange-900/40 rounded-full overflow-hidden"><div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${getResourceProgress(data.forjas, true)}%` }}></div></div></button>
              <button onClick={() => setView('yunque')} className="aspect-square bg-slate-950/30 rounded-xl flex flex-col items-center justify-center p-2 hover:bg-slate-900/50 transition-colors border border-slate-900/50 group relative">
                <Anvil className="w-8 h-8 text-slate-500 group-hover:text-slate-400 transition-colors" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {/* Pie (Footprints) Button - 1/4 width */}
              {(() => {
                const footTasks = [
                  ...data.trains.flatMap(t => t.subtasks || []),
                  ...data.sets.flatMap(s => s.subtasks || []),
                  ...(data.yunqueLargas || []),
                  ...(data.yunqueRapidas || [])
                ].filter(s => s && s.text && s.text.includes('🦶'));
                const footProgress = footTasks.length > 0 ? (footTasks.filter(s => s.completed).length / footTasks.length) : 0;
                
                return (
                  <button 
                    onClick={() => setShowFootModal(true)}
                    className="col-span-1 aspect-square flex flex-col items-center justify-between p-3 transition-all group relative"
                  >
                    <div className="flex-1 flex items-center justify-center">
                      <Footprints className="w-8 h-8 text-emerald-500 group-hover:text-emerald-400 transition-colors drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                    </div>
                    <div className="w-full h-1 bg-emerald-900/40 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${footProgress * 100}%` }}></div>
                    </div>
                  </button>
                );
              })()}

              {/* Bosque Progress - 2/4 width */}
              <div className="col-span-2 flex flex-col justify-center items-center h-full w-full p-2">
                <div className="flex flex-col gap-1 w-full px-2">
                  <div className="flex gap-1 w-full">
                    {Array.from({ length: 6 }).map((_, i) => {
                      const isFilled = i < Math.floor(bosqueWeeklyMinutes / 20);
                      const bgClass = isFilled ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'bg-emerald-950/40 border border-emerald-900/30';
                      return <div key={i} className={`flex-1 aspect-square rounded-md transition-all duration-300 ${bgClass}`} />;
                    })}
                  </div>
                  <div className="flex gap-1 w-full">
                    {Array.from({ length: 6 }).map((_, i) => {
                      const absIndex = i + 6;
                      const isFilled = absIndex < Math.floor(bosqueWeeklyMinutes / 20);
                      const bgClass = isFilled ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]' : 'bg-emerald-950/40 border border-emerald-900/30';
                      return <div key={i} className={`flex-1 aspect-square rounded-md transition-all duration-300 ${bgClass}`} />;
                    })}
                  </div>
                </div>
              </div>

              {/* Jumangiare (Food) Button - 1/4 width */}
              <button
                onClick={() => {
                  setView('food');
                  setData(prev => ({ ...prev, lastFoodEntryClick: Date.now() }));
                }}
                className={`col-span-1 aspect-square flex flex-col items-center justify-between p-2 transition-all duration-700 group relative ${
                    currentFoodScore < 0 
                      ? 'animate-blink' 
                      : isFoodPleno
                        ? 'scale-[1.05] animate-pulse'
                        : ''
                  }`}
              >
                <div className="flex-1 flex items-center justify-center">
                  <Utensils className={`w-8 h-8 transition-colors ${
                      shouldJumangiareBounce(data.lastFoodEntryClick || 0, data.food.dailyScores || {}) ? 'animate-cutlery-bounce text-lime-400' :
                      currentFoodScore < 0 ? 'text-red-500' :
                      isFoodPleno ? 'text-lime-200' : 'text-lime-500 group-hover:text-lime-400'
                    }`} />
                </div>
                <div className={`w-full h-1 bg-lime-900/40 rounded-full overflow-hidden transition-opacity duration-300 ${currentFoodScore < 0 ? 'opacity-0' : 'opacity-100'}`}>
                  <div
                    className="h-full bg-lime-500 transition-all duration-500"
                    style={{ width: `${Math.max(0, Math.min(100, (currentFoodScore / 200) * 100))}%` }}
                  ></div>
                </div>
              </button>
            </div>



            {(() => {
              const now = new Date();
              const day = now.getDay(); // 0 is Sunday, 6 is Saturday
              const diff = now.getDate() - day;
              const startOfCurrentWeek = new Date(now.getFullYear(), now.getMonth(), diff);
              startOfCurrentWeek.setHours(0, 0, 0, 0);

              const goalsLastReset = new Date(data.weeklyGoals?.lastReset || 0);
              const isExpired = goalsLastReset.getTime() < startOfCurrentWeek.getTime();

              return (
                <div className="w-full mb-3 relative overflow-hidden">
                  {/* Expired Overlay */}
                  {isExpired && (
                    <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-300">
                      <span className="text-5xl mb-3 animate-bounce">⏳</span>
                      <h3 className="text-stone-100 font-black tracking-tighter text-xl uppercase italic">Tiempo Agotado</h3>
                      <p className="text-stone-500 text-[10px] font-bold tracking-widest uppercase mb-6">La semana ha terminado</p>
                      <button 
                        onClick={() => {
                          setData(prev => ({
                            ...prev,
                            weeklyGoals: {
                              leones: { text: '', completed: false },
                              forjas: { text: '', completed: false },
                              puerto: { text: '', completed: false },
                              lastReset: Date.now()
                            }
                          }))
                        }}
                        className="bg-stone-200 text-stone-900 font-black px-6 py-3 rounded-xl text-xs hover:bg-white transition-all hover:scale-105 active:scale-95 shadow-xl uppercase tracking-widest flex items-center gap-2"
                      >
                         <Plus className="w-4 h-4" /> Nuevas Tareas
                      </button>
                    </div>
                  )}

                  <div className={`space-y-3 transition-opacity duration-500 ${isExpired ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'}`}>
                    {/* Leones */}
                    <div className="flex items-center gap-3">
                      <span className="text-2xl flex-shrink-0">🦁</span>
                      {(() => {
                        const completed = !!data.weeklyGoals?.leones.completed;
                        return (
                          <DebouncedInput
                            type="text"
                            value={data.weeklyGoals?.leones.text || ''}
                            onChange={(val: string) => updateWeeklyGoal('leones', 'text', val)}
                            disabled={completed}
                            className={`flex-1 min-w-0 rounded-lg px-3 py-2 transition-colors ${
                              completed 
                                ? 'bg-amber-900/20 border border-amber-700/40 text-stone-400 cursor-not-allowed' 
                                : 'bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500'
                            }`}
                            placeholder="Objetivo Leones..."
                          />
                        );
                      })()}
                      <button
                        onClick={() => !isExpired && updateWeeklyGoal('leones', 'completed', !(data.weeklyGoals?.leones.completed || false))}
                        className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${data.weeklyGoals?.leones.completed ? 'bg-amber-600 border-amber-600' : 'border-stone-700 hover:border-amber-500'}`}
                      >
                        {data.weeklyGoals?.leones.completed && <Check className="w-5 h-5 text-white" />}
                      </button>
                    </div>

                    {/* Forjas */}
                    <div className="flex items-center gap-3">
                      <span className="text-2xl flex-shrink-0">🍁</span>
                      {(() => {
                        const completed = !!data.weeklyGoals?.forjas.completed;
                        return (
                          <DebouncedInput
                            type="text"
                            value={data.weeklyGoals?.forjas.text || ''}
                            onChange={(val: string) => updateWeeklyGoal('forjas', 'text', val)}
                            disabled={completed}
                            className={`flex-1 min-w-0 rounded-lg px-3 py-2 transition-colors ${
                              completed 
                                ? 'bg-orange-900/20 border border-orange-700/40 text-stone-400 cursor-not-allowed' 
                                : 'bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none focus:border-orange-500'
                            }`}
                            placeholder="Objetivo Roble..."
                          />
                        );
                      })()}
                      <button
                        onClick={() => !isExpired && updateWeeklyGoal('forjas', 'completed', !(data.weeklyGoals?.forjas.completed || false))}
                        className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${data.weeklyGoals?.forjas.completed ? 'bg-orange-600 border-orange-600' : 'border-stone-700 hover:border-orange-500'}`}
                      >
                        {data.weeklyGoals?.forjas.completed && <Check className="w-5 h-5 text-white" />}
                      </button>
                    </div>

                    {/* Puerto */}
                    <div className="flex items-center gap-3">
                      <span className="text-2xl flex-shrink-0">⚔️</span>
                      {(() => {
                        const completed = !!data.weeklyGoals?.puerto.completed;
                        return (
                          <DebouncedInput
                            type="text"
                            value={data.weeklyGoals?.puerto.text || ''}
                            onChange={(val: string) => updateWeeklyGoal('puerto', 'text', val)}
                            disabled={completed}
                            className={`flex-1 min-w-0 rounded-lg px-3 py-2 transition-colors ${
                              completed 
                                ? 'bg-blue-900/20 border border-blue-700/40 text-stone-400 cursor-not-allowed' 
                                : 'bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none focus:border-blue-500'
                            }`}
                            placeholder="Objetivo Yunque..."
                          />
                        );
                      })()}
                      <button
                        onClick={() => !isExpired && updateWeeklyGoal('puerto', 'completed', !(data.weeklyGoals?.puerto.completed || false))}
                        className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${data.weeklyGoals?.puerto.completed ? 'bg-blue-600 border-blue-600' : 'border-stone-700 hover:border-blue-500'}`}
                      >
                        {data.weeklyGoals?.puerto.completed && <Check className="w-5 h-5 text-white" />}
                      </button>
                    </div>
                  </div>

                  {/* Weekly Timeline - Linea discontinua de 7 secciones */}
                  <div className={`mt-4 transition-opacity duration-500 ${isExpired ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex gap-1.5 h-1.5 w-full">
                      {Array.from({ length: 7 }).map((_, i) => {
                        const isPassed = i < day;
                        const isToday = i === day;
                        
                        let bgColor = 'bg-stone-800';
                        if (isPassed) bgColor = 'bg-stone-500';
                        if (isToday) bgColor = 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]';

                        return (
                          <div 
                            key={i} 
                            className={`flex-1 rounded-full transition-all duration-700 ${bgColor}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {(() => {
              const { pendingHunoIds } = calculateHunosPlenosAndPending(
                data.hunos,
                data.hunosHistory || {},
                data.hunos.filter(t => t.completed).map(t => t.id)
              );
              const combinedPendingHunoIds = pendingHunoIds;
              return (
                <DailyHunos
                  tasks={data.hunos}
                  hunosHistory={data.hunosHistory || {}}
                  pendingHunoIds={combinedPendingHunoIds}
                  lockedTaskIds={(() => {
                    const gimHuno = data.hunos.find(h => h.shortcut === 'exercise' || h.text.includes('Gim'));
                    return gimHuno ? [gimHuno.id] : [];
                  })()}
                  hunoPlenoCurrent={data.stats.hunoPlenoCurrent || 0}
                  hunoPlenos={data.stats.hunoPlenos || 0}
                  hunoReward={data.stats.hunoReward || "Premio por definir"}
                  onUpdate={handleHunosUpdate}
                  onUpdateReward={(reward) => setData(prev => ({ ...prev, stats: { ...prev.stats, hunoReward: reward } }))}
                  energy={data.energy || 1}
                  onUpdateEnergy={(val) => {
                    const todayStr = new Date().toDateString();
                    setData(prev => ({
                      ...prev,
                      energy: val,
                      energyHistory: {
                        ...(prev.energyHistory || {}),
                        [todayStr]: val
                      }
                    }));
                  }}
                />
              );
            })()}

            <div className="bg-stone-900 rounded-2xl shadow-sm p-6 w-full mt-6 border border-stone-800 transition-all duration-300">
              <div 
                onClick={() => setIsNubesCollapsed(!isNubesCollapsed)}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <Cloud className="w-6 h-6 text-stone-400" />
                  <h2 className="text-xl font-bold text-stone-200">Nubes</h2>

                  <div className="flex items-center gap-2 px-2 py-1 bg-stone-950/50 rounded-full border border-stone-800 ml-1" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <div className="relative">
                        <Trophy className="w-5 h-5 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                        <div className="absolute -top-2 -right-2 bg-yellow-600 text-stone-950 text-[10px] font-black px-1.5 rounded-full border border-stone-900 min-w-[1.2rem] h-5 flex items-center justify-center">
                          {data.stats.projectPlenos || 0}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-tighter">
                      {data.stats.projectPlenoCurrent || 0} <span className="text-stone-700">/ 20</span>
                    </span>
                  </div>
                </div>

                {!isNubesCollapsed && (
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setIsEditingProjects(!isEditingProjects); 
                    }} 
                    className={`p-2 rounded-full transition-colors ${isEditingProjects ? 'bg-stone-700 text-white' : 'hover:bg-stone-800 text-stone-500'}`}
                  >
                    {isEditingProjects ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                  </button>
                )}
              </div>

              {isNubesCollapsed && (data.projects || []).length > 0 && (
                <div 
                  className="grid w-full mt-3 gap-1 animate-in fade-in duration-300 cursor-pointer"
                  style={{ gridTemplateColumns: `repeat(${(data.projects || []).length}, minmax(0, 1fr))` }}
                  onClick={() => setIsNubesCollapsed(false)}
                >
                  {(data.projects || []).map((proj, idx) => {
                    const completedCount = (data.projects || []).filter(p => p.completed).length;
                    const isFilled = idx < completedCount;
                    return (
                      <div 
                        key={proj.id}
                        className={`w-2.5 h-2.5 max-w-full aspect-square mx-auto rounded-full transition-all duration-300 ${
                          isFilled 
                            ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)] animate-pulse' 
                            : 'bg-stone-950 border border-stone-800'
                        }`}
                      />
                    );
                  })}
                </div>
              )}

              {!isNubesCollapsed && (
                <div className="mt-4 animate-in fade-in duration-300">
                  {isEditingProjects ? (
                    <div className="space-y-3">
                      {data.projects.map(proj => (
                        <div key={proj.id} className="flex gap-2">
                          <button
                            onClick={() => {
                              setNoteEditingProjectId(proj.id);
                              setTempProjectNoteText(proj.notes || '');
                            }}
                            className={`p-2.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center shrink-0 ${
                              proj.notes 
                                ? 'bg-amber-950/25 border-amber-900/40 text-amber-400' 
                                : 'bg-stone-950 border-stone-700 text-stone-500 hover:text-stone-300 hover:border-stone-600'
                            }`}
                            title="Editar Notas de Sebastian"
                          >
                            <Info className="w-5 h-5" />
                          </button>
                          <DebouncedInput type="text" value={proj.text} onChange={(val: string) => handleProjectTextChange(proj.id, val)} className="flex-1 min-w-0 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-stone-500 transition-all" />
                          <button onClick={() => initiateDeleteProject(proj.id)} className="p-2 bg-stone-950 border border-stone-700 rounded-lg text-red-500 hover:bg-red-900/20 transition-colors"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      ))}
                      <button onClick={initiateAddProject} className="w-full mt-4 py-3 border-2 border-dashed border-stone-700 rounded-xl flex items-center justify-center gap-2 text-stone-500 hover:text-stone-300 hover:border-stone-600 hover:bg-stone-800/50 transition-all"><Plus className="w-5 h-5" /><span>Añadir Proyecto</span></button>

                      <div className="pt-4 mt-2 border-t border-stone-800">
                        <label className="block text-xs font-black text-stone-600 uppercase tracking-widest mb-2">Premio Objetivo 20 Plenos</label>
                        <input
                          type="text"
                          value={data.stats.projectReward || ''}
                          onChange={(e) => setData(prev => ({ ...prev, stats: { ...prev.stats, projectReward: e.target.value } }))}
                          className="w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-3 text-stone-200 focus:outline-none focus:border-yellow-500 font-bold"
                          placeholder="Escribe tu premio aquí..."
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 gap-3">
                        {data.projects.length === 0 && <p className="col-span-4 text-center text-stone-600 italic py-2">Sin nubes activas.</p>}
                        {data.projects.map((proj, idx) => (
                          <button key={proj.id} onClick={() => toggleProject(idx)} className={`aspect-square rounded-xl border-2 text-2xl flex items-center justify-center transition-all duration-300 ${proj.completed ? 'bg-yellow-500/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)] scale-105' : 'bg-stone-950 border-stone-800 hover:border-stone-700 text-stone-500 grayscale opacity-70 hover:opacity-100'}`}>
                            <span className={proj.completed ? 'grayscale-0' : 'grayscale'}>{getEmoji(proj.text)}</span>
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setView('piano')} className="w-full mt-4 py-3 bg-indigo-950/30 border border-indigo-900/50 rounded-xl flex items-center justify-center gap-2 text-indigo-400 hover:bg-indigo-900/50 hover:text-indigo-300 transition-all">
                        <Music className="w-5 h-5" />
                        <span className="font-bold">Profundizar en Piano</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setShowGympiezaModal(true); }} className="w-full mt-3 py-3 bg-emerald-950/30 border border-emerald-900/50 rounded-xl flex items-center justify-center gap-2 text-emerald-400 hover:bg-emerald-900/50 hover:text-emerald-300 transition-all">
                        <Sparkles className="w-5 h-5" />
                        <span className="font-bold">Gympieza</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 w-full">
              <button 
                onClick={() => setView('caminos')}
                className="py-4 bg-stone-900 border border-stone-800 rounded-2xl flex items-center justify-center gap-3 text-stone-100 hover:bg-stone-800 hover:border-stone-700 transition-all shadow-xl group"
              >
                <div className="w-10 h-10 bg-stone-800 rounded-xl flex items-center justify-center border border-stone-700 group-hover:bg-stone-700 transition-colors shrink-0">
                  <MapIcon className="w-6 h-6 text-stone-400" />
                </div>
                <span className="font-black text-lg uppercase tracking-tighter italic">Caminos</span>
              </button>

              <button 
                onClick={() => setView('tools')}
                className="py-4 bg-stone-900 border border-stone-800 rounded-2xl flex items-center justify-center gap-3 text-stone-100 hover:bg-stone-800 hover:border-stone-700 transition-all shadow-xl group"
              >
                <div className="w-10 h-10 bg-stone-800 rounded-xl flex items-center justify-center border border-stone-700 group-hover:bg-stone-700 transition-colors shrink-0">
                  <Wrench className="w-6 h-6 text-stone-400" />
                </div>
                <span className="font-black text-lg uppercase tracking-tighter italic">Trastos</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3 w-full">
              <button 
                onClick={() => setShowHistory(true)}
                className="py-4 bg-stone-900 border border-stone-800 rounded-2xl flex items-center justify-center gap-3 text-stone-100 hover:bg-stone-800 hover:border-stone-700 transition-all shadow-xl group"
              >
                <div className="w-10 h-10 bg-stone-800 rounded-xl flex items-center justify-center border border-stone-700 group-hover:bg-stone-700 transition-colors shrink-0">
                  <CalendarClock className="w-6 h-6 text-stone-400" />
                </div>
                <span className="font-black text-lg uppercase tracking-tighter italic">Bitácora</span>
              </button>

              <button 
                onClick={() => { if (isGuest) setIsGuest(false); else logout(); }}
                className="py-4 bg-stone-900 border border-stone-800 rounded-2xl flex items-center justify-center gap-3 text-stone-100 hover:bg-stone-800 hover:border-red-900/50 transition-all shadow-xl group"
              >
                <div className="w-10 h-10 bg-stone-800 rounded-xl flex items-center justify-center border border-stone-700 group-hover:bg-stone-700 transition-colors shrink-0">
                  <LogOut className="w-6 h-6 text-stone-400 group-hover:text-red-400 animate-in spin-in-12 duration-500" />
                </div>
                <span className="font-black text-lg uppercase tracking-tighter italic group-hover:text-red-400">Salir</span>
              </button>
            </div>

            <footer className="mt-12 text-center text-stone-700 text-sm">SEMPER ITERVM RVDIS</footer>
            {showHistory && (
              <HistoryEditorModal 
                data={data} 
                onUpdateData={setData} 
                initialDate={historyInitialDate}
                onClose={() => {
                  setShowHistory(false);
                  setHistoryInitialDate(undefined);
                }} 
                onTriggerTelon={triggerTelonManually}
              />
            )}

            {showProjectPromptModal && (
              <div className="fixed inset-0 max-w-md mx-auto z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-stone-800 rounded-full flex items-center justify-center">
                      <Cloud className="w-6 h-6 text-stone-400" />
                    </div>
                    <h3 className="text-xl font-bold text-stone-200">Nubes</h3>
                  </div>
                  <p className="text-stone-400 mb-6 font-medium">¿Has cumplido alguna de las 8 nubes hoy?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowProjectPromptModal(false)}
                      className="flex-1 py-3 rounded-xl font-bold bg-stone-800 text-stone-300 hover:bg-stone-700 transition-colors border border-stone-700"
                    >
                      No
                    </button>
                    <button
                      onClick={() => {
                        setShowProjectPromptModal(false);
                        setIsNubesCollapsed(false);
                        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                      }}
                      className="flex-1 py-3 rounded-xl font-bold bg-lime-600 text-stone-950 hover:bg-lime-500 transition-colors shadow-lg shadow-lime-900/20"
                    >
                      Sí
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showFirewallModal && (
              <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-md z-[200] flex items-center justify-center p-4 select-none animate-in fade-in duration-300">
                <div className="bg-stone-900 border border-red-900/60 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col items-center relative overflow-hidden animate-in zoom-in duration-300">
                  {/* Warning Icon */}
                  <div className="w-16 h-16 bg-red-950/40 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse">
                    <ShieldAlert className="w-8 h-8 stroke-[2]" />
                  </div>

                  {/* Title & Day Indicator */}
                  <h2 className="text-red-500 font-black tracking-tighter text-2xl uppercase italic animate-pulse">
                    CORTAFUEGOS
                  </h2>
                  <p className="text-stone-400 font-bold tracking-widest text-xs uppercase mt-1 mb-6">
                    Día {data.firewallDay || 1} de 3
                  </p>

                  <p className="text-stone-500 text-[10px] text-center uppercase tracking-wider font-bold mb-6 max-w-[280px]">
                    Has estado inactivo los últimos 4 días. Para desbloquear el reino, completa estas 3 acciones esenciales de supervivencia hoy:
                  </p>

                  {/* Checklist Buttons */}
                  <div className="w-full flex flex-col gap-3 mb-8">
                    {[
                      { key: 'ducha', label: 'Una ducha', emoji: '🚿' },
                      { key: 'calle', label: 'Salir a la calle', emoji: '🌳' },
                      { key: 'huno', label: 'Un huno', emoji: '⚔️' }
                    ].map(item => {
                      const currentChecked = data.firewallChecked || { ducha: false, calle: false, huno: false };
                      const isChecked = currentChecked[item.key as keyof typeof currentChecked];
                      return (
                        <button
                          key={item.key}
                          onClick={() => {
                            setData(prev => {
                              const checked = prev.firewallChecked || { ducha: false, calle: false, huno: false };
                              return {
                                ...prev,
                                firewallChecked: {
                                  ...checked,
                                  [item.key]: !isChecked
                                }
                              };
                            });
                          }}
                          className={`w-full py-3.5 px-5 rounded-2xl border border-transparent flex items-center justify-between transition-all duration-300 font-bold uppercase tracking-wider text-xs ${
                            isChecked
                              ? 'bg-red-950/30 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                              : 'bg-stone-950 text-stone-500 hover:text-stone-400'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <span className="text-base">{item.emoji}</span>
                            {item.label}
                          </span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isChecked ? 'border-red-500 bg-red-500 text-stone-950' : 'border-stone-700 bg-transparent'
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[4]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Complete Button */}
                  <button
                    disabled={!Object.values(data.firewallChecked || { ducha: false, calle: false, huno: false }).every(v => v)}
                    onClick={handleCompleteFirewallDay}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest italic transition-all duration-500 border border-transparent ${
                      Object.values(data.firewallChecked || { ducha: false, calle: false, huno: false }).every(v => v)
                        ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white hover:scale-[1.02] shadow-[0_0_20px_rgba(239,68,68,0.3)] cursor-pointer'
                        : 'bg-stone-950 text-stone-700 cursor-not-allowed'
                    }`}
                  >
                    Semper Iterum Rudis
                  </button>
                </div>
              </div>
            )}

            {showProjectConfirm && (
              <div className="fixed inset-0 max-w-md mx-auto z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-stone-900 w-full max-w-sm rounded-3xl shadow-2xl border border-stone-800 overflow-hidden">
                  <div className="p-8 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-yellow-600/20 rounded-full flex items-center justify-center mb-6 border border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                      <Trophy className="w-10 h-10 text-yellow-500" />
                    </div>
                    <h2 className="text-2xl font-black text-stone-100 mb-2 uppercase tracking-tighter italic">¡Pleno de Nubes!</h2>
                    <p className="text-stone-400 mb-8 text-sm leading-relaxed">
                      Has completado todas tus nubes activas. <br />¿Quieres sumar un **Pleno de Nube** y reiniciar la lista?
                    </p>

                    <div className="grid grid-cols-2 gap-4 w-full">
                      <button
                        onClick={cancelProjectPleno}
                        className="py-4 rounded-2xl border border-stone-800 text-stone-500 hover:bg-stone-800 font-bold transition-all text-sm uppercase"
                      >
                        Error
                      </button>
                      <button
                        onClick={confirmProjectPleno}
                        className="py-4 rounded-2xl bg-yellow-600 text-stone-950 font-black hover:bg-yellow-500 transition-all shadow-lg shadow-yellow-900/20 text-sm uppercase"
                      >
                        ¡Sí, Pleno!
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isAddingProject && (
              <div className="fixed inset-0 max-w-md mx-auto z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">
                  <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-800/50">
                    <h3 className="font-bold text-stone-200 text-lg">Nuevo Proyecto</h3>
                    <button onClick={() => setIsAddingProject(false)} className="p-1 hover:bg-stone-700 rounded-full">
                      <X className="w-6 h-6 text-stone-400" />
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="mb-6">
                      <input
                        autoFocus
                        type="text"
                        value={newProjectText}
                        onChange={(e) => setNewProjectText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && confirmAddProject()}
                        placeholder="Nombre del proyecto..."
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl p-4 text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-500 text-lg"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button
                        onClick={() => setIsAddingProject(false)}
                        className="py-3 rounded-xl border border-stone-700 text-stone-400 hover:bg-stone-800 font-bold transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={confirmAddProject}
                        className="py-3 rounded-xl bg-stone-200 text-stone-900 font-bold hover:bg-white transition-colors shadow-lg"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {projectToDelete && (
              <div className="fixed inset-0 max-w-md mx-auto z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-900/50">
                      <Trash2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="font-bold text-stone-200 text-xl mb-2">¿Eliminar Proyecto?</h3>
                    <p className="text-stone-400 mb-6 text-sm">Esta acción no se puede deshacer.</p>

                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button
                        onClick={() => setProjectToDelete(null)}
                        className="py-3 rounded-xl border border-stone-700 text-stone-400 hover:bg-stone-800 font-bold transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={confirmDeleteProject}
                        className="py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {noteEditingProjectId && (
              <div 
                className="fixed inset-0 max-w-md mx-auto z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setNoteEditingProjectId(null)}
              >
                <div 
                  className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6 flex flex-col space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-stone-850">
                      <Info className="w-5 h-5 text-amber-500" />
                      <h3 className="text-base font-bold text-stone-200">
                        Notas para: "{data.projects.find(p => p.id === noteEditingProjectId)?.text || 'Nube'}"
                      </h3>
                    </div>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      Estas notas le servirán a Sebastian para sugerirte esta nube/proyecto según tu nivel de energía y directrices del día.
                    </p>
                    <textarea
                      value={tempProjectNoteText}
                      onChange={(e) => setTempProjectNoteText(e.target.value)}
                      placeholder="Ej: Si mi energía es alta, enfocarme en programar. O: Tareas rápidas para días cansados..."
                      className="w-full h-32 bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-200 text-sm focus:outline-none focus:border-amber-500 font-sans resize-none placeholder:text-stone-600 leading-relaxed"
                    />
                    <div className="grid grid-cols-2 gap-3 w-full pt-2">
                      <button 
                        onClick={() => setNoteEditingProjectId(null)}
                        className="py-3 rounded-xl border border-stone-750 text-stone-400 hover:bg-stone-800 font-bold transition-colors text-sm"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={() => {
                          handleProjectNotesChange(noteEditingProjectId, tempProjectNoteText);
                          setNoteEditingProjectId(null);
                        }}
                        className="py-3 rounded-xl bg-amber-600 text-stone-950 font-bold hover:bg-amber-500 transition-colors shadow-lg shadow-amber-900/20 text-sm"
                      >
                        Guardar Notas
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showCongratulations.show && (
              <div className="fixed inset-0 max-w-md mx-auto z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500">
                <div className="bg-stone-900 w-full max-w-sm rounded-[3rem] shadow-2xl border border-yellow-500/30 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent animate-shimmer" />
                  <div className="p-10 flex flex-col items-center text-center">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-2xl animate-pulse" />
                      <div className="w-24 h-24 bg-yellow-600/30 rounded-full flex items-center justify-center border-2 border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.4)] relative z-10">
                        <Trophy className="w-12 h-12 text-yellow-400" />
                      </div>
                    </div>

                    <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter italic">¡ENHORABUENA!</h2>
                    <p className="text-yellow-500 font-bold mb-6 text-sm tracking-widest uppercase">
                      Objetivo {showCongratulations.type === 'hunos' ? '50' : '20'} Plenos alcanzado
                    </p>

                    <div className="w-full bg-stone-950/80 rounded-3xl p-6 border border-stone-800 mb-8 shadow-inner">
                      <p className="text-stone-400 text-xs uppercase font-black tracking-widest mb-3 opacity-50">Tu Recompensa:</p>
                      <p className="text-2xl font-bold text-white tracking-tight leading-tight">
                        {showCongratulations.reward}
                      </p>
                    </div>

                    <button
                      onClick={() => setShowCongratulations({ ...showCongratulations, show: false })}
                      className="w-full py-5 rounded-2xl bg-white text-stone-950 font-black hover:bg-stone-100 transition-all shadow-xl text-lg uppercase tracking-tight"
                    >
                      Recibir con Honor
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showFootModal && (
              <FootTasksModal 
                trains={data.trains}
                sets={data.sets}
                yunqueLargas={data.yunqueLargas || []}
                yunqueRapidas={data.yunqueRapidas || []}
                onUpdateTrains={handleTrainsUpdate}
                onUpdateSets={handleSetsUpdate}
                onUpdateYunqueLargas={t => setData(prev => ({ ...prev, yunqueLargas: t }))}
                onUpdateYunqueRapidas={t => setData(prev => ({ ...prev, yunqueRapidas: t }))}
                onClose={() => setShowFootModal(false)}
              />
            )}

            {showGympiezaModal && (
              <GympiezaModal 
                gympieza={data.gympieza || { lastReset: Date.now(), tasks: [] }}
                onUpdate={(g) => setData(prev => ({ ...prev, gympieza: g }))}
                onClose={() => setShowGympiezaModal(false)}
                onCompleteAll={() => {
                  const idx = data.projects.findIndex(p => p.text.includes('Gympieza'));
                  if (idx !== -1 && !data.projects[idx].completed) {
                    toggleProject(idx);
                  }
                }}
              />
            )}

            {showFocusModal && (
              <div className="fixed inset-0 max-w-md mx-auto z-[200] bg-stone-950 flex flex-col p-6 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex justify-between items-center pb-2 mb-2">
                  <div className="flex items-center gap-3">
                    {focusCameFromTelon && (
                      <button
                        type="button"
                        onClick={() => {
                          setModoTelonActive(true);
                          setTelonStep('diary');
                          setShowFocusModal(false);
                        }}
                        className="p-2 hover:bg-stone-900 rounded-xl transition-colors active:scale-95 shrink-0"
                        title="Atrás"
                      >
                        <ArrowLeft className="w-4 h-4 text-stone-400 hover:text-stone-200" />
                      </button>
                    )}
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-amber-500 uppercase tracking-widest leading-none">Sebastian</p>
                      <p className="text-[10px] text-stone-500 uppercase tracking-wider font-bold mt-1">Mayordomo del Reino</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!focusLoading && (
                      <button 
                        onClick={() => fetchFocusRecommendation(true)} 
                        className="p-2 hover:bg-stone-900 rounded-xl transition-colors active:scale-95"
                        title="Proponer otra tarea"
                      >
                        <RotateCw className="w-5 h-5 text-stone-400 hover:text-stone-200" />
                      </button>
                    )}
                    <button 
                      onClick={() => setShowFocusModal(false)} 
                      className="p-2 hover:bg-stone-900 rounded-xl transition-colors active:scale-95"
                      title="Salir"
                    >
                      <X className="w-5 h-5 text-stone-400 hover:text-stone-200" />
                    </button>
                  </div>
                </div>

                {focusLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl animate-pulse" />
                      <div className="w-16 h-16 border-4 border-transparent border-t-amber-500 rounded-full animate-spin relative z-10" />
                    </div>
                    <p className="text-xs text-amber-500 font-black uppercase tracking-widest animate-pulse mt-4">
                      Sebastian está preparando vuestro siguiente deber...
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col py-2">
                    {/* Sebastian's comment (motivational quote) */}
                    <div className="w-full max-w-sm mx-auto mb-0 shrink-0">
                      <div className="relative bg-stone-900/40 rounded-2xl p-4 shadow-inner w-full text-left">
                        <p className="text-stone-200 text-base leading-relaxed whitespace-pre-wrap italic font-medium">
                          {focusRecommendation || "Vuestras tareas requieren vuestra atención, mi señor."}
                        </p>
                      </div>
                    </div>

                    {/* Centered Task & Toggle Button */}
                    {(() => {
                      const recTask = getFocusRecommendedTask();
                      if (!recTask) return (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                          <p className="text-stone-500 italic">No hay tareas pendientes en vuestro reino, mi señor.</p>
                        </div>
                      );

                      const getFocusTaskEmoji = (task: any) => {
                        if (task.typeName === "Diaria") {
                          return getEmoji(task.text);
                        }
                        let shortcut = "";
                        if (task.typeName.includes("Yunque")) shortcut = "yunque";
                        else if (task.typeName === "Roble") shortcut = "forjas";
                        else if (task.typeName.includes("Leones")) shortcut = "leones";
                        else if (task.typeName.includes("Setas")) shortcut = "sets";
                        else if (task.typeName.includes("Trenes")) shortcut = "trains";
                        else if (task.typeName.includes("Nubes")) shortcut = "projects";

                        if (shortcut) {
                          const parentHuno = data.hunos.find(h => h.shortcut === shortcut);
                          if (parentHuno) {
                            return getEmoji(parentHuno.text);
                          }
                        }
                        
                        const ownEmoji = getEmoji(task.text);
                        if (ownEmoji !== '❓') return ownEmoji;

                        if (task.typeName.includes("Yunque")) return "⚔️";
                        if (task.typeName === "Roble") return "🍁";
                        if (task.typeName.includes("Leones")) return "🦁";
                        if (task.typeName.includes("Setas")) return "🍄";
                        if (task.typeName.includes("Trenes")) return "🚂";
                        if (task.typeName.includes("Nubes")) return "🌦️";

                        return "❓";
                      };

                      const taskEmoji = getFocusTaskEmoji(recTask);

                      return (
                        <div className="flex-1 flex flex-col items-center justify-center my-auto space-y-6 animate-in zoom-in-95 duration-300">
                          {/* Task Category Tag */}
                          <span className="px-4 py-1.5 bg-stone-900 text-[9px] font-black text-amber-500/80 uppercase tracking-[0.2em] rounded-full">
                            {recTask.typeName}
                          </span>

                          {/* Huge Centered Emoji Container with Progress Ring */}
                          <div className="relative w-56 h-56 flex items-center justify-center">
                            {/* SVG Progress Ring */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                              <circle
                                cx="112"
                                cy="112"
                                r="100"
                                stroke="#292524" // stone-800
                                strokeWidth="8"
                                fill="transparent"
                              />
                              <circle
                                cx="112"
                                cy="112"
                                r="100"
                                stroke="#f59e0b" // amber-500
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={2 * Math.PI * 100}
                                strokeDashoffset={2 * Math.PI * 100 * (1 - focusTimerProgress)}
                                strokeLinecap="round"
                                className="transition-all duration-300 ease-linear"
                              />
                            </svg>

                            <button
                              onClick={() => {
                                handlePriorityTaskToggle(focusRecommendedTaskId);
                                // After 600ms, fetch the next task automatically!
                                setTimeout(() => {
                                  fetchFocusRecommendation();
                                }, 600);
                              }}
                              className={`w-44 h-44 rounded-full flex items-center justify-center text-7xl select-none transition-all active:scale-95 duration-300 relative z-10 ${
                                recTask.completed
                                  ? 'bg-emerald-950/20 text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.25)]'
                                  : 'bg-stone-900/40 text-stone-300 hover:text-amber-500 shadow-[0_0_35px_rgba(0,0,0,0.35)]'
                              }`}
                            >
                              {taskEmoji}
                            </button>
                          </div>

                          {/* Task Description Text */}
                          <h3 className="text-xl font-black text-stone-100 text-center max-w-sm px-6 leading-snug tracking-tight">
                            {recTask.text}
                          </h3>
                        </div>
                      );
                    })()}

                    {/* Bottom Timer Icon */}
                    <div className="flex justify-center pt-2 mt-auto shrink-0">
                      <button
                        onClick={toggleFocusTimer}
                        className={`p-3 rounded-full transition-all active:scale-90 ${
                          focusTimerEndTime !== null
                            ? 'bg-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse'
                            : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                        }`}
                        title={focusTimerEndTime !== null ? "Cancelar Temporizador de 3 min" : "Iniciar Temporizador de 3 min"}
                      >
                        <Timer className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
    }
  };

  const hideFloatingButtons = modoTelonActive || showHistory || showFirewallModal || showProjectPromptModal || showProjectConfirm || showFootModal || showGympiezaModal || showCongratulations.show || showFocusModal;

  return (
    <div className="bg-stone-950 min-h-screen text-stone-200 font-sans select-none sm:select-text relative">
      <div className="max-w-md mx-auto bg-stone-950 min-h-screen shadow-2xl overflow-hidden relative border-x border-stone-900">
        {renderView()}

        {/* Fixed Bottom Footer */}
        {!hideFloatingButtons && (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-stone-900/90 backdrop-blur-md border-t border-stone-800 border-x border-stone-900 px-6 py-4 flex z-[90] shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
            <button 
              onClick={() => {
                setFocusCameFromTelon(false);
                fetchFocusRecommendation();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-stone-950/50 hover:bg-stone-950/80 text-amber-500 hover:text-amber-400 shadow-sm transition-all active:scale-95 font-bold text-sm uppercase tracking-tighter italic"
              title="Enfoque"
            >
              <Sparkles className="w-5 h-5" />
              <span>Enfoque</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const GympiezaModal = ({ gympieza, onUpdate, onClose, onCompleteAll }: { gympieza: GympiezaState, onUpdate: (g: GympiezaState) => void, onClose: () => void, onCompleteAll: () => void }) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Restaurar posición de scroll inicial
    if (scrollContainerRef.current && gympieza.scrollPosition) {
      scrollContainerRef.current.scrollTop = gympieza.scrollPosition;
    }
    // No gestionamos historial aquí, ya lo hace App.tsx globalmente
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Solo actualizamos el ref, sin disparar re-renders masivos del App
    if (scrollContainerRef.current) {
      scrollContainerRef.current.dataset.scrollPos = e.currentTarget.scrollTop.toString();
    }
  };

  const handleInternalClose = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Guardar posición final antes de cerrar
    const finalScroll = scrollContainerRef.current ? parseInt(scrollContainerRef.current.dataset.scrollPos || "0") : (gympieza.scrollPosition || 0);
    onUpdate({ ...gympieza, scrollPosition: finalScroll });
    onClose();
  };

  const toggleTask = (taskId: string) => {
    const taskIndex = gympieza.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const nextTasks = gympieza.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    const currentScroll = scrollContainerRef.current ? parseInt(scrollContainerRef.current.dataset.scrollPos || "0") : (gympieza.scrollPosition || 0);
    onUpdate({ ...gympieza, tasks: nextTasks, scrollPosition: currentScroll });

    if (nextTasks.every(t => t.completed)) {
      setTimeout(() => setShowConfirmReset(true), 600);
    }
  };

  const handleConfirmReset = () => {
    const resetTasks = gympieza.tasks.map(t => ({ ...t, completed: false }));
    onUpdate({ ...gympieza, tasks: resetTasks, scrollPosition: 0 });
    onCompleteAll();
    setShowConfirmReset(false);
    onClose();
  };

  const completedCount = gympieza.tasks.filter(t => t.completed).length;
  const progress = (completedCount / gympieza.tasks.length) * 100;

  return (
    <div 
      className="fixed inset-0 max-w-md mx-auto z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleInternalClose(e);
      }}
    >
      <div 
        className="bg-stone-900 w-full max-h-[80vh] rounded-3xl shadow-2xl border border-stone-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-stone-800 flex justify-between items-center bg-stone-800/30">
          <div>
            <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Gympieza
            </h3>
          </div>
          <button onClick={() => handleInternalClose()} className="p-2 hover:bg-stone-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-stone-500" />
          </button>
        </div>

        <div className="p-4 bg-stone-950/50">
          <div className="w-full h-3 bg-stone-800 rounded-full overflow-hidden border border-stone-700 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(52,211,153,0.3)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 px-1">
            <span className="text-[10px] font-black text-stone-500 uppercase tracking-tighter">{completedCount} / {gympieza.tasks.length} Tareas</span>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">{Math.round(progress)}%</span>
          </div>
        </div>

        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar"
        >
          {[...gympieza.tasks].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1)).map((task, idx) => {
            const isClickable = true;
            const isNext = !task.completed;
            
            let typeColor = "text-stone-400";
            let bgColor = "bg-stone-800/20";
            let borderColor = "border-stone-800";

            if (task.completed) {
              bgColor = "bg-emerald-900/20";
              borderColor = "border-emerald-900/50";
              typeColor = "text-emerald-500";
            } else if (isNext) {
              bgColor = "bg-stone-800/50";
              borderColor = "border-stone-600";
              typeColor = "text-stone-200";
            }

            return (
              <button
                key={task.id}
                onClick={() => toggleTask(task.id)}
                disabled={!isClickable}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 ${bgColor} ${borderColor} ${!isClickable ? 'opacity-40 grayscale' : 'hover:scale-[1.01] active:scale-[0.98]'}`}
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-stone-700'}`}>
                  {task.completed && <Check className="w-4 h-4 text-stone-900 stroke-[4px]" />}
                </div>
                <div className="flex-1 text-left">
                  <div className={`text-sm font-bold ${task.completed ? 'text-emerald-200 line-through opacity-70' : isNext ? 'text-stone-100' : 'text-stone-500'}`}>
                    {task.text}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-0.5">
                    {task.type}
                  </div>
                </div>
                {isNext && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              </button>
            );
          })}
        </div>
        
        {/* Botón inferior eliminado por redundancia con cierre exterior/atrás */}
      </div>

      {showConfirmReset && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in zoom-in-95 duration-300">
          <div className="bg-stone-900 border border-emerald-500/30 rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(16,185,129,0.2)]">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/50">
              <Sparkles className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight italic">¡Gympieza Completa!</h3>
            <p className="text-stone-400 mb-8 text-sm leading-relaxed">
              Has terminado todas las tareas de limpieza. ¿Quieres marcar el **Proyecto Gympieza** y resetear la lista?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowConfirmReset(false)}
                className="py-4 rounded-2xl border border-stone-800 text-stone-500 font-bold hover:bg-stone-800 transition-all text-xs uppercase"
              >
                Todavía no
              </button>
              <button 
                onClick={handleConfirmReset}
                className="py-4 rounded-2xl bg-emerald-500 text-stone-950 font-black hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-900/20 text-xs uppercase"
              >
                ¡Sí, Marcar!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

//Forzar reinicio Netlify