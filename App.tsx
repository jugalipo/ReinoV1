import React, { useState, useEffect, useRef } from 'react';
import { AppData, ViewState, Friend, Task, ResourceTask, WeeklyTask } from './types';
import { DailyHunos } from './components/DailyHunos';
import { TrainView } from './components/TrainView';
import { SetsView } from './components/SetsView';
import { LoveTreeView } from './components/LoveTreeView';
import { FoodBoardView } from './components/FoodBoardView';
import { ResourceTrackerView } from './components/ResourceTrackerView';
import { ExerciseView } from './components/ExerciseView';
import { PianoView } from './components/PianoView';
import { HistoryEditorModal } from './components/HistoryEditorModal';
import { StatsView } from './components/StatsView';
import { Heart, Utensils, BarChart3, X, Settings, Flame, Cat, Settings as GearIcon, CalendarClock, CheckCircle2, Dumbbell, Edit2, Save, Plus, Trash2, Trophy, Train, Music, Download, Upload, LogOut, Check } from 'lucide-react';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { collection, doc, writeBatch, onSnapshot, getDocs } from 'firebase/firestore';
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
  { text: "🦁 Notas 30'", subtasks: ["Activos", "Cuerpo", "Amor", "Proyectos", "Diario"] },
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
  "T1 🦁🦁🦁 20'", 
  "Gim 🏋️ 60'", 
  "❤️❤️ 20'", 
  "Leer 📖 30'",
  
  // Bloque medio
  "Frío ❄️ 15'", 
  "Diana 🎯 15'", 
  "IdiomaS 🏛️ 20'",
  "T2 🔥 40'", 
  "T3 🚢 20'", 
  "pág 📘 30'", 
  "WH - m 🫁 15'", 
  "🍄🍄 30'", 
  "🚂🚂🚂 110'", 
  "P ⚙️ 44'", 
  "Masajercicio ✋ 20'",
  
  // Fila 5 (Últimas)
  "8 ⏰", 
  "10.000 🦶 60'", 
  "Sol ☀️ 15'",
  "Ayuno 🚫", 
  "Menú 🍴 60'", 
  "1 FAH 🍰", 
  "Sano 🍏"
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
  setsPlenoClaimed: false,
  trainsPlenoClaimed: false,
  stats: {
    perfectSetsWeeks: 0,
    hunoPlenos: 0,
    perfectTrainMonths: 0,
    projectPlenos: 0,
    setsHistory: [],
    trainsHistory: [],
    interactionsHistory: [],
    lastTotalInteractions: 0
  },
  hunos: HUNOS_TASKS.map((text, i) => ({
    id: `huno-${i}`,
    text,
    completed: false,
    failedYesterday: false,
    missedDays: 0,
    plenoCompleted: false
  })),
  hunosHistory: {},
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
      lastWeeklyReset: Date.now(),
      fridgeCount: 0,
      ritualCount: 0,
      wheel: { lemon: false, nuts: false, dairy: false, coffee: false, spices: false, supplements: false },
      weeklyBonuses: { organs: false, legumes: false, fast24: false },
      dishes: {},
      history: [] 
  },
  forjas: [
      { id: 'permanent-objective', name: 'Objetivo Principal', current: 0, target: 100, unit: 'pts' },
      { id: 'q1-money', name: 'Dinero', current: 0, target: 1000, unit: '€' },
      { id: 'q2-health', name: 'Salud', current: 0, target: 10, unit: 'kg' },
      { id: 'q3-love', name: 'Amor', current: 0, target: 50, unit: 'pts' },
      { id: 'q4-proj', name: 'Proyectos', current: 0, target: 100, unit: 'h' }
  ],
  leones: [],
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
  huchaCount: 0
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
    { id: 'core', data: { lastDate: data.lastDate, lastSetsReset: data.lastSetsReset, lastTrainsReset: data.lastTrainsReset, setsPlenoClaimed: data.setsPlenoClaimed, trainsPlenoClaimed: data.trainsPlenoClaimed, stats: data.stats, food: data.food, exercise: data.exercise, billetesState: data.billetesState, huchaCount: data.huchaCount, leonesState: data.leonesState, leonesCount: data.leonesCount, reminders: data.reminders, piano: data.piano, weeklyGoals: data.weeklyGoals, reminderTime: data.reminderTime, lastReminderDate: data.lastReminderDate } },
    { id: 'hunos', data: { items: data.hunos } },
    { id: 'trains', data: { items: data.trains, annual: data.annualTrains } },
    { id: 'sets', data: { items: data.sets } },
    { id: 'friends', data: { items: data.friends } },
    { id: 'projects', data: { items: data.projects } },
    { id: 'forjas', data: { items: data.forjas } },
    { id: 'leones', data: { items: data.leones } },
    { id: 'hunosHistory', data: { items: data.hunosHistory } },
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
    } else if (doc.id === 'leones') {
      result.leones = doc.data.items || INITIAL_DATA.leones;
    } else if (doc.id === 'hunosHistory') {
      result.hunosHistory = doc.data.items || INITIAL_DATA.hunosHistory;
    }
  });
  return result as AppData;
};

const processResets = (parsed: AppData): AppData => {
  const result = JSON.parse(JSON.stringify(parsed)) as AppData;
  
  if (!result.stats) { result.stats = { perfectSetsWeeks: 0, hunoPlenos: 0, perfectTrainMonths: 0, projectPlenos: 0, setsHistory: [], trainsHistory: [], interactionsHistory: [], lastTotalInteractions: 0 }; }
  if (typeof result.stats.projectPlenos === 'undefined') { result.stats.projectPlenos = 0; }
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
      { id: 'q4-proj', name: 'Proyectos', current: 0, target: 100, unit: 'h' }
  ];
  if (result.forjas.length < 5) {
       if (result.forjas.length === 0) {
           result.forjas.push({ id: 'permanent-objective', name: 'Objetivo Principal', current: 0, target: 100, unit: 'pts' });
       }
       for (let i = result.forjas.length; i < 5; i++) {
           result.forjas.push(quarterlyDefaults[i-1]);
       }
  }
  if (!result.leones) { result.leones = []; }
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
  if (typeof result.food.fridgeCount === 'undefined') {
      result.food = { ...result.food, fridgeCount: 0, ritualCount: 0, lastWeeklyReset: Date.now(), wheel: { lemon: false, nuts: false, dairy: false, coffee: false, spices: false, supplements: false }, weeklyBonuses: { organs: false, legumes: false, fast24: false } };
  }
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
      }
      
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
      
      result.lastDate = today;
  }
  
  const day = now.getDay();
  const diff = now.getDate() - day;
  const startOfCurrentWeek = new Date(now.setDate(diff));
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
  
  const lastFoodResetDate = new Date(result.food.lastWeeklyReset || 0);
  if (lastFoodResetDate.getTime() < startOfCurrentWeek.getTime()) {
      if (!result.stats.foodHistory) result.stats.foodHistory = [];
      result.stats.foodHistory.push(result.food.score);
      if (result.stats.foodHistory.length > 52) result.stats.foodHistory.shift();
      result.food.score = 0;
      result.food.weeklyBonuses = { organs: false, legumes: false, fast24: false };
      result.food.lastWeeklyReset = Date.now();
      
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const mondayStr = monday.toISOString().split('T')[0];
      if (!result.food.weeklyExtras) result.food.weeklyExtras = {};
      result.food.weeklyExtras[mondayStr] = 0;
  }
  
  if (!result.weeklyGoals) {
      result.weeklyGoals = {
          leones: { text: "", completed: false },
          forjas: { text: "", completed: false },
          puerto: { text: "", completed: false },
          lastReset: Date.now()
      };
  }

  const lastWeeklyGoalsResetDate = new Date(result.weeklyGoals.lastReset || 0);
  if (lastWeeklyGoalsResetDate.getTime() < startOfCurrentWeek.getTime()) {
      result.weeklyGoals.leones.completed = false;
      result.weeklyGoals.forjas.completed = false;
      result.weeklyGoals.puerto.completed = false;
      result.weeklyGoals.lastReset = Date.now();
  }
  
  const lastTrainsResetDate = new Date(result.lastTrainsReset);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const resetMonth = lastTrainsResetDate.getMonth();
  const resetYear = lastTrainsResetDate.getFullYear();
  if (currentYear > resetYear) {
       result.annualTrains = result.annualTrains.map(t => ({ ...t, completed: false, subtasks: t.subtasks?.map(s => ({ ...s, completed: false })) }));
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
       result.trains = result.trains.map(t => ({ ...t, completed: false, subtasks: t.subtasks?.map(s => ({ ...s, completed: false })) }));
       result.trainsPlenoClaimed = false;
       result.lastTrainsReset = Date.now();
  }
  
  const lastFoodDishesResetDate = new Date(result.food.lastMonthlyDishesReset || 0);
  const resetFoodMonth = lastFoodDishesResetDate.getMonth();
  const resetFoodYear = lastFoodDishesResetDate.getFullYear();
  if (currentYear > resetFoodYear || (currentYear === resetFoodYear && currentMonth > resetFoodMonth)) {
      result.food.dishes = {};
      result.food.lastMonthlyDishesReset = Date.now();
  }

  return result;
};

function App() {
  const [view, setView] = useState<ViewState>('home');
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [loaded, setLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  
  const [showProjectConfirm, setShowProjectConfirm] = useState(false);
  const [lastProjectToggledIndex, setLastProjectToggledIndex] = useState<number | null>(null);
  
  const [isEditingProjects, setIsEditingProjects] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectText, setNewProjectText] = useState('');
  const [showProjectPromptModal, setShowProjectPromptModal] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  // --- MOBILE BACK BUTTON SUPPORT ---
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setView(event.state.view);
      } else {
        setView('home');
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
    // Push new state if the current history view doesn't match the state view
    // This handles both forward navigation (clicking a button) and deep updates
    if (window.history.state?.view !== view) {
      window.history.pushState({ view }, '');
    }
  }, [view]);

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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      setLoaded(true);
      setIsInitializing(false);
      return;
    }

    const habitsRef = collection(db, 'users', user.uid, 'habits');
    let unsubscribe: () => void;

    const initializeData = async () => {
      setIsInitializing(true);
      isFirstRender.current = true;
      try {
        const snapshot = await getDocs(habitsRef);
        
        if (!snapshot.empty) {
          const docs = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
          const newData = deserializeAppData(docs);
          const processedData = processResets(newData);
          
          if (JSON.stringify(newData) !== JSON.stringify(processedData)) {
            const batch = writeBatch(db);
            const serializedDocs = serializeAppData(processedData);
            serializedDocs.forEach(d => {
              batch.set(doc(habitsRef, d.id), d.data);
            });
            await batch.commit().catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/habits`));
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
      }
    };

    initializeData();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, authReady]);

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
          <button 
            onClick={loginWithGoogle}
            className="bg-stone-100 text-stone-900 font-bold py-3 px-6 rounded-xl hover:bg-white transition-colors mb-4"
          >
            Iniciar sesión con Google
          </button>
          <button 
            onClick={() => setIsGuest(true)}
            className="text-stone-500 font-medium py-2 px-4 rounded-xl hover:text-stone-300 transition-colors"
          >
            Continuar como invitado
          </button>
        </div>
      </div>
    );
  }

  const handleHunosUpdate = (newTasks: Task[], incrementPleno: boolean = false) => {
    const gymTaskNew = newTasks.find(t => t.text.includes('Gim'));
    const gymTaskOld = data.hunos.find(t => t.id === gymTaskNew?.id);
    if (gymTaskNew && gymTaskOld && !gymTaskOld.completed && gymTaskNew.completed) setTimeout(() => setView('exercise'), 1200);
    
    const loveTaskNew = newTasks.find(t => t.text.includes('❤️❤️'));
    const loveTaskOld = data.hunos.find(t => t.id === loveTaskNew?.id);
    if (loveTaskNew && loveTaskOld && !loveTaskOld.completed && loveTaskNew.completed) setTimeout(() => setView('love'), 1200);
    
    const forjasTaskNew = newTasks.find(t => t.text.includes('🔥'));
    const forjasTaskOld = data.hunos.find(t => t.id === forjasTaskNew?.id);
    if (forjasTaskNew && forjasTaskOld && !forjasTaskOld.completed && forjasTaskNew.completed) setTimeout(() => setView('forjas'), 1200);
    
    const leonesTaskNew = newTasks.find(t => t.text.includes('🦁'));
    const leonesTaskOld = data.hunos.find(t => t.id === leonesTaskNew?.id);
    if (leonesTaskNew && leonesTaskOld && !leonesTaskOld.completed && leonesTaskNew.completed) setTimeout(() => setView('leones'), 1200);
    
    const ayunoTaskNew = newTasks.find(t => t.text.includes('Ayuno'));
    const ayunoTaskOld = data.hunos.find(t => t.id === ayunoTaskNew?.id);
    if (ayunoTaskNew && ayunoTaskOld && !ayunoTaskOld.completed && ayunoTaskNew.completed) setTimeout(() => setView('food'), 1200);
    
    const menuTaskNew = newTasks.find(t => t.text.includes('Menú'));
    const menuTaskOld = data.hunos.find(t => t.id === menuTaskNew?.id);
    if (menuTaskNew && menuTaskOld && !menuTaskOld.completed && menuTaskNew.completed) setTimeout(() => setView('food'), 1200);
    
    const setasTaskNew = newTasks.find(t => t.text.includes('🍄'));
    const setasTaskOld = data.hunos.find(t => t.id === setasTaskNew?.id);
    if (setasTaskNew && setasTaskOld && !setasTaskOld.completed && setasTaskNew.completed) setTimeout(() => setView('sets'), 1200);
    
    const trenesTaskNew = newTasks.find(t => t.text.includes('🚂'));
    const trenesTaskOld = data.hunos.find(t => t.id === trenesTaskNew?.id);
    if (trenesTaskNew && trenesTaskOld && !trenesTaskOld.completed && trenesTaskNew.completed) setTimeout(() => setView('trains'), 1200);
    
    const projTaskNew = newTasks.find(t => t.text.includes('⚙️'));
    const projTaskOld = data.hunos.find(t => t.id === projTaskNew?.id);
    if (projTaskNew && projTaskOld && !projTaskOld.completed && projTaskNew.completed) {
        setShowProjectPromptModal(true);
    }
    
    const todayKey = new Date().toDateString();
    const completedIds = newTasks.filter(t => t.completed).map(t => t.id);
    const updatedHistory = { ...(data.hunosHistory || {}), [todayKey]: completedIds };
    setData(prev => ({
        ...prev,
        hunos: newTasks,
        hunosHistory: updatedHistory,
        stats: {
            ...prev.stats,
            hunoPlenos: incrementPleno ? prev.stats.hunoPlenos + 1 : prev.stats.hunoPlenos
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
      setData(prev => ({
        ...prev,
        stats: { ...prev.stats, projectPlenos: (prev.stats.projectPlenos || 0) + 1 },
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

  const getTrainProgress = () => {
    if (data.trains.length === 0) return 0;
    return Math.round((data.trains.filter(t => t.completed).length / data.trains.length) * 100);
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
     const total = data.sets.length;
     if (total === 0) return ( <svg width="40" height="40" viewBox="0 0 40 40" className="transform -rotate-90"> <circle cx="20" cy="20" r="16" fill="transparent" stroke="#450a0a" strokeWidth="4" /> </svg> );
     const radius = 16, cx = 20, cy = 20;
     const sortedSets = [...data.sets].sort((a, b) => Number(b.completed) - Number(a.completed));
     return (
        <svg width="40" height="40" viewBox="0 0 40 40" className="transform -rotate-90">
             <circle cx="20" cy="20" r="16" fill="transparent" stroke="#450a0a" strokeWidth="4" />
             {sortedSets.map((task, index) => {
                 if (!task.completed) return null;
                 if (total === 1) return <circle key={index} cx={cx} cy={cy} r={radius} fill="#ef4444" />;
                 const sliceAngle = 360 / total;
                 const startRad = (index * sliceAngle) * (Math.PI / 180);
                 const endRad = ((index + 1) * sliceAngle) * (Math.PI / 180);
                 const x1 = cx + radius * Math.cos(startRad), y1 = cy + radius * Math.sin(startRad);
                 const x2 = cx + radius * Math.cos(endRad), y2 = cy + radius * Math.sin(endRad);
                 const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                 return <path key={index} d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`} fill="#ef4444" />;
             })}
        </svg>
     );
  };

  const renderTrainsPreview = () => {
     const total = data.trains.length;
     if (total === 0) return ( <svg width="40" height="40" viewBox="0 0 40 40" className="transform -rotate-90"> <circle cx="20" cy="20" r="16" fill="transparent" stroke="#1e3a8a" strokeWidth="4" /> </svg> );
     const radius = 16, cx = 20, cy = 20;
     const sortedTrains = [...data.trains].sort((a, b) => Number(b.completed) - Number(a.completed));
     return (
        <svg width="40" height="40" viewBox="0 0 40 40" className="transform -rotate-90">
             <circle cx="20" cy="20" r="16" fill="transparent" stroke="#1e3a8a" strokeWidth="4" />
             {sortedTrains.map((task, index) => {
                 if (!task.completed) return null;
                 if (total === 1) return <circle key={index} cx={cx} cy={cy} r={radius} fill="#3b82f6" />;
                 const sliceAngle = 360 / total;
                 const startRad = (index * sliceAngle) * (Math.PI / 180);
                 const endRad = ((index + 1) * sliceAngle) * (Math.PI / 180);
                 const x1 = cx + radius * Math.cos(startRad), y1 = cy + radius * Math.sin(startRad);
                 const x2 = cx + radius * Math.cos(endRad), y2 = cy + radius * Math.sin(endRad);
                 const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                 return <path key={index} d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`} fill="#3b82f6" />;
             })}
        </svg>
     );
  };

  const getMonthLabel = () => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[new Date().getMonth()];
  };

  const renderView = () => {
    switch (view) {
      case 'trains': return <TrainView tasks={data.trains} annualTasks={data.annualTrains} onUpdate={handleTrainsUpdate} onUpdateAnnual={(t) => setData(prev => ({ ...prev, annualTrains: t }))} onBack={() => setView('home')} />;
      case 'sets': return <SetsView tasks={data.sets} onUpdate={handleSetsUpdate} onBack={() => setView('home')} />;
      case 'love': return <LoveTreeView friends={data.friends} onUpdate={(f) => setData(prev => ({ ...prev, friends: f }))} onBack={() => setView('home')} reminders={data.reminders} onUpdateReminders={(r) => setData(prev => ({ ...prev, reminders: r }))} />;
      case 'food': return <FoodBoardView foodState={data.food} onUpdate={(f) => setData(prev => ({ ...prev, food: f }))} onBack={() => setView('home')} />;
      case 'forjas': return <ResourceTrackerView title="Forjas" themeColor="orange" tasks={data.forjas} onUpdate={t => setData(prev => ({ ...prev, forjas: t }))} onBack={() => setView('home')} />;
      case 'leones': return <ResourceTrackerView title="Leones" themeColor="amber" tasks={data.leones} billetesState={data.billetesState || Array(20).fill(false)} huchaCount={data.huchaCount || 0} onUpdateBilletes={(bs, hc) => setData(prev => ({...prev, billetesState: bs, huchaCount: hc}))} leonesState={data.leonesState || Array(20).fill(false)} leonesCount={data.leonesCount || 0} onUpdateLeones={(ls, lc) => setData(prev => ({...prev, leonesState: ls, leonesCount: lc}))} onUpdate={t => setData(prev => ({ ...prev, leones: t }))} onBack={() => setView('home')} />;
      case 'exercise': return <ExerciseView exercise={data.exercise} onUpdate={ex => setData(prev => ({ ...prev, exercise: ex }))} onBack={() => setView('home')} />;
      case 'piano': return <PianoView pianoState={data.piano} onUpdate={p => setData(prev => ({ ...prev, piano: p }))} onBack={() => setView('home')} />;
      case 'stats': return <StatsView data={data} onUpdate={setData} onBack={() => setView('home')} />;
      default:
        const trainProgress = getTrainProgress();
        const isTrainPleno = trainProgress === 100;
        const isSetsPleno = data.sets.length > 0 && data.sets.every(t => t.completed);
        const isFoodPleno = data.food.score === 50;
        return (
          <div className="flex flex-col min-h-screen max-w-md mx-auto bg-stone-950 p-6 relative">
            <header className="mb-6 mt-4 flex justify-between items-start">
              <h1 className="text-4xl font-black text-stone-100 tracking-tighter">EL REINO</h1>
              <div className="flex gap-2">
                <button onClick={() => setShowHistory(true)} className="p-2 bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors border border-stone-800"><CalendarClock className="w-6 h-6 text-stone-500" /></button>
                <button onClick={() => setView('stats')} className="p-2 bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors border border-stone-800"><BarChart3 className="w-6 h-6 text-stone-500" /></button>
                <button onClick={() => { if (isGuest) setIsGuest(false); else logout(); }} title="Cerrar Sesión" className="p-2 bg-stone-900 rounded-xl hover:bg-red-900/50 transition-colors border border-stone-800"><LogOut className="w-6 h-6 text-stone-500 hover:text-red-400" /></button>
              </div>
            </header>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button 
                onClick={() => setView('trains')} 
                className={`aspect-[4/3] rounded-2xl p-4 flex flex-col justify-between transition-all duration-700 border shadow-sm group ${
                  isTrainPleno 
                    ? 'bg-blue-600/30 border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.4)] ring-2 ring-blue-500/20 scale-[1.02] animate-pulse' 
                    : 'bg-blue-950/30 border-blue-900/50 hover:bg-blue-900/50'
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <Train className={`w-8 h-8 transition-colors ${isTrainPleno ? 'text-blue-300' : 'text-blue-500 group-hover:text-blue-400'}`} />
                  <div className={`opacity-80 scale-75 origin-top-right ${isTrainPleno ? 'brightness-125 saturate-150' : ''}`}>{renderTrainsPreview()}</div>
                </div>
                <div className="text-left">
                  <span className={`block font-bold text-lg ${isTrainPleno ? 'text-white' : 'text-blue-200'}`}>Trenes</span>
                  <span className={`text-[10px] font-medium leading-tight ${isTrainPleno ? 'text-blue-200' : 'text-blue-500/80'}`}>{getMonthLabel()}</span>
                </div>
              </button>
              <button 
                onClick={() => setView('sets')} 
                className={`aspect-[4/3] rounded-2xl p-4 flex flex-col justify-between transition-all duration-700 border shadow-sm group ${
                  isSetsPleno 
                    ? 'bg-red-600/30 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.4)] ring-2 ring-red-500/20 scale-[1.02] animate-pulse' 
                    : 'bg-red-950/30 border-red-900/50 hover:bg-red-900/50'
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <MushroomIcon className={`w-8 h-8 transition-colors ${isSetsPleno ? 'text-red-300' : 'text-red-500 group-hover:text-red-400'}`} />
                  <div className={`opacity-80 scale-75 origin-top-right ${isSetsPleno ? 'brightness-125 saturate-150' : ''}`}>{renderSetsPreview()}</div>
                </div>
                <div className="text-left">
                  <span className={`block font-bold text-lg ${isSetsPleno ? 'text-white' : 'text-red-200'}`}>Setas</span>
                  <span className={`text-[10px] font-medium leading-tight ${isSetsPleno ? 'text-red-200' : 'text-red-500/80'}`}>{getWeekLabel()}</span>
                </div>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-6">
                <button onClick={() => setView('love')} className="aspect-square bg-pink-950/30 rounded-xl flex flex-col items-center justify-between p-2 hover:bg-pink-900/50 transition-colors border border-pink-900/50 group relative">
                    <div className="flex-1 flex items-center justify-center">
                        <Heart className="w-8 h-8 text-pink-500 group-hover:text-pink-400 transition-colors" />
                    </div>
                    <div className="w-full h-1 bg-pink-900/40 rounded-full overflow-hidden">
                        <div className="h-full bg-pink-500 transition-all duration-300" style={{ width: `${getLoveProgress()}%` }}></div>
                    </div>
                </button>
                <button 
                  onClick={() => setView('food')} 
                  className={`aspect-square rounded-xl flex flex-col items-center justify-between p-2 transition-all duration-700 border group relative ${
                    isFoodPleno 
                      ? 'bg-lime-600/30 border-lime-400 shadow-[0_0_30px_rgba(132,204,22,0.4)] ring-2 ring-lime-500/20 scale-[1.05] animate-pulse' 
                      : 'bg-lime-950/30 border-lime-900/50 hover:bg-lime-900/50'
                  }`}
                >
                    <div className="flex-1 flex items-center justify-center">
                        <Utensils className={`w-8 h-8 transition-colors ${
                            isFoodPleno ? 'text-lime-200' : 
                            data.food.score < 0 ? 'text-red-500 animate-blink' : 'text-lime-500 group-hover:text-lime-400'
                        }`} />
                    </div>
                    <div className="w-full h-1 bg-lime-900/40 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 ${
                                data.food.score < 0 ? 'bg-red-500 animate-blink' : 'bg-lime-500'
                            }`} 
                            style={{ width: `${data.food.score < 0 ? 100 : Math.min(100, (data.food.score / 50) * 100)}%` }}
                        ></div>
                    </div>
                </button>
                <button onClick={() => setView('leones')} className="aspect-square bg-amber-950/30 rounded-xl flex flex-col items-center justify-between p-2 hover:bg-amber-900/50 transition-colors border border-amber-900/50 group relative"><div className="flex-1 flex items-center justify-center"><Cat className="w-8 h-8 text-amber-500 group-hover:text-amber-400 transition-colors" /></div><div className="w-full h-1 bg-amber-900/40 rounded-full overflow-hidden"><div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${getResourceProgress(data.leones)}%` }}></div></div></button>
                <button onClick={() => setView('forjas')} className="aspect-square bg-orange-950/30 rounded-xl flex flex-col items-center justify-between p-2 hover:bg-orange-900/50 transition-colors border border-orange-900/50 group relative"><div className="flex-1 flex items-center justify-center"><Flame className="w-8 h-8 text-orange-500 group-hover:text-orange-400 transition-colors" /></div><div className="w-full h-1 bg-orange-900/40 rounded-full overflow-hidden"><div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${getResourceProgress(data.forjas, true)}%` }}></div></div></button>
            </div>
            <button onClick={() => setView('exercise')} className="w-full bg-emerald-950/30 hover:bg-emerald-900/50 border border-emerald-900/50 rounded-2xl p-4 flex items-center gap-4 group transition-colors mb-3"><div className="p-2 bg-emerald-900/40 rounded-xl flex-shrink-0"><Dumbbell className="w-6 h-6 text-emerald-500" /></div><div className="flex-1 flex gap-1 h-10">{Array.from({ length: 9 }).map((_, i) => ( <div key={i} className={`flex-1 rounded-sm transition-all duration-300 ${ i < data.exercise.seriesCurrent ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'bg-emerald-950/40 border border-emerald-900/30' }`} /> ))}</div></button>
            
            <div className="bg-stone-900 rounded-2xl shadow-sm p-4 w-full mb-3 border border-stone-800">
              <div className="space-y-3">
                {/* Leones */}
                <div className="flex items-center gap-3">
                  <span className="text-2xl flex-shrink-0">🦁</span>
                  <DebouncedInput 
                    type="text" 
                    value={data.weeklyGoals?.leones.text || ''} 
                    onChange={(val: string) => updateWeeklyGoal('leones', 'text', val)}
                    className="flex-1 min-w-0 bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-500 transition-colors"
                    placeholder="Objetivo Leones..."
                  />
                  <button 
                    onClick={() => updateWeeklyGoal('leones', 'completed', !(data.weeklyGoals?.leones.completed || false))}
                    className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${data.weeklyGoals?.leones.completed ? 'bg-amber-600 border-amber-600' : 'border-stone-700 hover:border-amber-500'}`}
                  >
                    {data.weeklyGoals?.leones.completed && <Check className="w-5 h-5 text-white" />}
                  </button>
                </div>
                
                {/* Forjas */}
                <div className="flex items-center gap-3">
                  <span className="text-2xl flex-shrink-0">🔥</span>
                  <DebouncedInput 
                    type="text" 
                    value={data.weeklyGoals?.forjas.text || ''} 
                    onChange={(val: string) => updateWeeklyGoal('forjas', 'text', val)}
                    className="flex-1 min-w-0 bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="Objetivo Forjas..."
                  />
                  <button 
                    onClick={() => updateWeeklyGoal('forjas', 'completed', !(data.weeklyGoals?.forjas.completed || false))}
                    className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${data.weeklyGoals?.forjas.completed ? 'bg-orange-600 border-orange-600' : 'border-stone-700 hover:border-orange-500'}`}
                  >
                    {data.weeklyGoals?.forjas.completed && <Check className="w-5 h-5 text-white" />}
                  </button>
                </div>
                
                {/* Puerto */}
                <div className="flex items-center gap-3">
                  <span className="text-2xl flex-shrink-0">⛵</span>
                  <DebouncedInput 
                    type="text" 
                    value={data.weeklyGoals?.puerto.text || ''} 
                    onChange={(val: string) => updateWeeklyGoal('puerto', 'text', val)}
                    className="flex-1 min-w-0 bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Objetivo Puerto..."
                  />
                  <button 
                    onClick={() => updateWeeklyGoal('puerto', 'completed', !(data.weeklyGoals?.puerto.completed || false))}
                    className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${data.weeklyGoals?.puerto.completed ? 'bg-blue-600 border-blue-600' : 'border-stone-700 hover:border-blue-500'}`}
                  >
                    {data.weeklyGoals?.puerto.completed && <Check className="w-5 h-5 text-white" />}
                  </button>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-stone-950 rounded-full overflow-hidden mt-4">
                  <div 
                    className="h-full bg-stone-500 transition-all duration-300" 
                    style={{ width: `${((new Date().getDay() === 0 ? 7 : new Date().getDay()) / 7) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <DailyHunos tasks={data.hunos} hunosHistory={data.hunosHistory || {}} onUpdate={handleHunosUpdate} />
            <div className="bg-stone-900 rounded-2xl shadow-sm p-6 w-full mt-6 border border-stone-800 transition-all duration-300"><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><GearIcon className="w-6 h-6 text-stone-400" /><h2 className="text-xl font-bold text-stone-200">Proyectos</h2></div><button onClick={() => setIsEditingProjects(!isEditingProjects)} className={`p-2 rounded-full transition-colors ${isEditingProjects ? 'bg-stone-700 text-white' : 'hover:bg-stone-800 text-stone-500'}`}>{isEditingProjects ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}</button></div>{isEditingProjects ? ( <div className="space-y-3 animate-in fade-in duration-300">{data.projects.map(proj => ( <div key={proj.id} className="flex gap-2"><DebouncedInput type="text" value={proj.text} onChange={(val: string) => handleProjectTextChange(proj.id, val)} className="flex-1 min-w-0 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-stone-500 transition-all" /><button onClick={() => initiateDeleteProject(proj.id)} className="p-2 bg-stone-950 border border-stone-700 rounded-lg text-red-500 hover:bg-red-900/20 transition-colors"><Trash2 className="w-5 h-5" /></button></div> ))}<button onClick={initiateAddProject} className="w-full mt-4 py-3 border-2 border-dashed border-stone-700 rounded-xl flex items-center justify-center gap-2 text-stone-500 hover:text-stone-300 hover:border-stone-600 hover:bg-stone-800/50 transition-all"><Plus className="w-5 h-5" /><span>Añadir Proyecto</span></button></div> ) : ( <><div className="grid grid-cols-4 gap-3">{data.projects.length === 0 && <p className="col-span-4 text-center text-stone-600 italic py-2">Sin proyectos activos.</p>}{data.projects.map((proj, idx) => ( <button key={proj.id} onClick={() => toggleProject(idx)} className={`aspect-square rounded-xl border-2 text-2xl flex items-center justify-center transition-all duration-300 ${ proj.completed ? 'bg-yellow-500/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)] scale-105' : 'bg-stone-950 border-stone-800 hover:border-stone-700 text-stone-500 grayscale opacity-70 hover:opacity-100' }`}><span className={proj.completed ? 'grayscale-0' : 'grayscale'}>{getEmoji(proj.text)}</span></button> ))}</div><button onClick={() => setView('piano')} className="w-full mt-4 py-3 bg-indigo-950/30 border border-indigo-900/50 rounded-xl flex items-center justify-center gap-2 text-indigo-400 hover:bg-indigo-900/50 hover:text-indigo-300 transition-all"><Music className="w-5 h-5" /><span className="font-bold">Profundizar en Piano</span></button></> )}</div>
            <footer className="mt-12 text-center text-stone-700 text-sm">SEMPER ITERVM RVDIS</footer>
            {showHistory && <HistoryEditorModal data={data} onUpdateData={setData} onClose={() => setShowHistory(false)} />}
            
            {showProjectPromptModal && (
                <div className="fixed inset-0 max-w-md mx-auto z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-stone-800 rounded-full flex items-center justify-center">
                                <GearIcon className="w-6 h-6 text-stone-400" />
                            </div>
                            <h3 className="text-xl font-bold text-stone-200">Proyectos</h3>
                        </div>
                        <p className="text-stone-400 mb-6 font-medium">¿Has cumplido alguno de los 8 proyectos hoy?</p>
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

            {showProjectConfirm && (
                <div className="fixed inset-0 max-w-md mx-auto z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-stone-900 w-full max-w-sm rounded-3xl shadow-2xl border border-stone-800 overflow-hidden">
                        <div className="p-8 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-yellow-600/20 rounded-full flex items-center justify-center mb-6 border border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                                <Trophy className="w-10 h-10 text-yellow-500" />
                            </div>
                            <h2 className="text-2xl font-black text-stone-100 mb-2 uppercase tracking-tighter italic">¡Pleno de Proyectos!</h2>
                            <p className="text-stone-400 mb-8 text-sm leading-relaxed">
                                Has completado todos tus proyectos activos. <br/>¿Quieres sumar un **Pleno de Proyecto** y reiniciar la lista?
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
          </div>
        );
    }
  };

  return ( <div className="bg-stone-950 min-h-screen text-stone-200 font-sans select-none sm:select-text relative"> <div className="max-w-md mx-auto bg-stone-950 min-h-screen shadow-2xl overflow-hidden relative border-x border-stone-900">{renderView()}</div> </div> );
}

export default App;