import React, { useState, useEffect } from 'react';
import { AppData, ViewState, Friend, Task, ResourceTask, WeeklyTask } from './types';
import { DailyHunos } from './components/DailyHunos';
import { TrainView } from './components/TrainView';
import { SetsView } from './components/SetsView';
import { LoveTreeView } from './components/LoveTreeView';
import { FoodBoardView } from './components/FoodBoardView';
import { ResourceTrackerView } from './components/ResourceTrackerView';
import { ExerciseView } from './components/ExerciseView';
import { HistoryEditorModal } from './components/HistoryEditorModal';
import { StatsView } from './components/StatsView';
import { Heart, Utensils, BarChart3, X, Settings, Flame, Cat, Settings as GearIcon, CalendarClock, CheckCircle2, Dumbbell, Edit2, Save, Plus, Trash2, Trophy, Train } from 'lucide-react';

const MUSHROOM_TASKS = [
  "🍄 Agenda 15'", 
  "🍄 Bloqueos 5'", 
  "🍄 Lavadora(S) 30'",
  "🍄 Foto Cocina y Mesa 15'", 
  "🍄 Esteticién 10'", 
  "🍄 Web Reino",
  "🍄 Wasap 15'", 
  "🍄 Disco 5'"
];

const TRAIN_TASKS = [
  "🦁Cuentas 1h", "🦁Compra 30'", "🦁Reino 30'", "🦁Cine 1h", "🦁Libros 15'", "🦁Cartera 15'", 
  "🦁Subs 30'", "🦁RRSS 15'", "🦁Arroz 15'", "🦁Medidas 1h", "🦁Destrasteo 2h", "🦁Notas 30'", 
  "🦁Papeles 15'", "🦁Escáner 15'", "🦁Digital 30' (llevo 40)", "🦁Silla 5'", "🦁StayFocus 5'", 
  "🦁Compranda 30'", "🍏Sauna 1h", "🍏Día sin Pantallas 15'", "🍏Videnda 30h", "🍏Liturgia 30'", 
  "❤️Turistáculo 30'", "❤️Bosque 15'", "❤️Viaje 30'", "❤️Anfitrión 15'", "❤️Donanda 30'", 
  "❤️S Aristocráticas 15'", "❤️Querida Alicia 2h", "❤️Aliciología 1h", "❤️El Chef 1h", 
  "❤️Querida Familia 1h", "❤️Falmuerzo 15'", "📘Reválidas 2h", "📘Dora 30'", "📘Eficiencia 2h", 
  "📘Desafío Cuerpo 5'"
];

const ANNUAL_TRAIN_TASKS = [
  "🚂Inventarios",
  "🚂Prontuario",
  "🚂Confesiones",
  "🚂Testamento",
  "🚂Álbum",
  "🚂Aspavientos",
  "🚂Illustrator del Reino"
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
  
  "GAP", // Hueco para saltar a la 5ª fila

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
    plenoCompleted: false
  })),
  hunosHistory: {},
  trains: TRAIN_TASKS.map((text, i) => ({
    id: `train-${i}`,
    text,
    completed: false,
    subtasks: []
  })),
  annualTrains: ANNUAL_TRAIN_TASKS.map((text, i) => ({
    id: `annual-train-${i}`,
    text,
    completed: false,
    subtasks: []
  })),
  sets: MUSHROOM_TASKS.map((text, i) => ({
      id: `set-${i}`,
      text,
      completed: false
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
      stretchCount: 0
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

function App() {
  const [view, setView] = useState<ViewState>('home');
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [loaded, setLoaded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const [showProjectConfirm, setShowProjectConfirm] = useState(false);
  const [lastProjectToggledIndex, setLastProjectToggledIndex] = useState<number | null>(null);
  
  const [isEditingProjects, setIsEditingProjects] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectText, setNewProjectText] = useState('');
  const [showProjectPromptModal, setShowProjectPromptModal] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    const saved = localStorage.getItem('warrior_habits_v4');
    if (saved) {
      try {
        const parsed: AppData = JSON.parse(saved);
        if (!parsed.stats) parsed.stats = { perfectSetsWeeks: 0, hunoPlenos: 0, perfectTrainMonths: 0, projectPlenos: 0, setsHistory: [], trainsHistory: [], interactionsHistory: [], lastTotalInteractions: 0 };
        if (typeof parsed.stats.projectPlenos === 'undefined') parsed.stats.projectPlenos = 0;
        if (typeof parsed.setsPlenoClaimed === 'undefined') parsed.setsPlenoClaimed = false;
        if (typeof parsed.trainsPlenoClaimed === 'undefined') parsed.trainsPlenoClaimed = false;
        if (!parsed.hunosHistory) parsed.hunosHistory = {};
        if (!parsed.stats.setsHistory) parsed.stats.setsHistory = [];
        if (!parsed.stats.trainsHistory) parsed.stats.trainsHistory = [];
        if (!parsed.stats.interactionsHistory) parsed.stats.interactionsHistory = [];
        if (!parsed.lastSetsReset) parsed.lastSetsReset = Date.now();
        if (!parsed.lastTrainsReset) parsed.lastTrainsReset = Date.now();
        
        // Initialize dishes if missing
        if (!parsed.food.dishes) parsed.food.dishes = {};

        const calculateTotalInteractions = (friendsList: Friend[]) => {
            return friendsList.reduce((acc, friend) => {
                const interactions = (Object.values(friend.interactions || {}) as number[]).reduce((a, b) => a + b, 0);
                return acc + interactions;
            }, 0);
        };
        if (typeof parsed.stats.lastTotalInteractions === 'undefined') {
            parsed.stats.lastTotalInteractions = calculateTotalInteractions(parsed.friends || []);
        }
        if (!parsed.forjas) parsed.forjas = [];
        const quarterlyDefaults = [
            { id: 'q1-money', name: 'Dinero', current: 0, target: 1000, unit: '€' },
            { id: 'q2-health', name: 'Salud', current: 0, target: 10, unit: 'kg' },
            { id: 'q3-love', name: 'Amor', current: 0, target: 50, unit: 'pts' },
            { id: 'q4-proj', name: 'Proyectos', current: 0, target: 100, unit: 'h' }
        ];
        if (parsed.forjas.length < 5) {
             if (parsed.forjas.length === 0) {
                 parsed.forjas.push({ id: 'permanent-objective', name: 'Objetivo Principal', current: 0, target: 100, unit: 'pts' });
             }
             for (let i = parsed.forjas.length; i < 5; i++) {
                 parsed.forjas.push(quarterlyDefaults[i-1]);
             }
        }
        if (!parsed.leones) parsed.leones = [];
        if (!parsed.annualTrains) {
            parsed.annualTrains = ANNUAL_TRAIN_TASKS.map((text, i) => ({
                id: `annual-train-${i}`,
                text,
                completed: false,
                subtasks: []
            }));
        }
        if (!parsed.exercise) {
            parsed.exercise = {
                seriesCurrent: 0,
                daysTrained: 0,
                totalMinutes: 0,
                sprintCount: 0,
                stretchCount: 0
            };
        }
        if (typeof parsed.exercise.totalMinutes === 'undefined') {
            parsed.exercise.totalMinutes = 0;
        }
        if (!parsed.projects || parsed.projects.length === 0) {
            parsed.projects = PROJECT_DEFINITIONS.map((def, i) => ({
                id: `new-proj-${i}`,
                text: def.text,
                completed: false
            }));
        } else {
             parsed.projects = parsed.projects.map(p => {
                 if (p.text === "Trivium 10p") {
                     return { ...p, text: "Trivium 🎓 10p" };
                 }
                 return p;
             });
        }
        if (typeof parsed.food.fridgeCount === 'undefined') {
            parsed.food = {
                ...parsed.food,
                fridgeCount: 0,
                ritualCount: 0,
                lastWeeklyReset: Date.now(),
                wheel: { lemon: false, nuts: false, dairy: false, coffee: false, spices: false, supplements: false },
                weeklyBonuses: { organs: false, legumes: false, fast24: false }
            };
        }
        if (parsed.friends) {
            parsed.friends = parsed.friends.map((f: any) => ({
                ...f,
                interactions: f.interactions || { person: 0, call: 0, gift: 0, photo: 0, message: 0 },
                tasks: f.tasks || []
            }));
        }
        if (parsed.hunos) {
            parsed.hunos = parsed.hunos.map(task => {
                if (task.text === "1 FAH 🚫🍰") {
                    return { ...task, text: "1 FAH 🍰" };
                }
                return task;
            });
        }
        if (!parsed.billetesState) parsed.billetesState = Array(20).fill(false);
        if (typeof parsed.huchaCount === 'undefined') parsed.huchaCount = 0;

        const now = new Date();
        const today = now.toDateString();
        if (parsed.lastDate !== today) {
            const yesterdayKey = parsed.lastDate || '';
            if (yesterdayKey) {
                const completedIds = parsed.hunos.filter(t => t.completed).map(t => t.id);
                if (!parsed.hunosHistory) parsed.hunosHistory = {};
                parsed.hunosHistory[yesterdayKey] = completedIds;
            }
            parsed.hunos = parsed.hunos.map(task => ({
                ...task,
                failedYesterday: !task.completed,
                completed: false
            }));
            // Reset daily meal dishes
            parsed.food.dishes = {};
            parsed.lastDate = today;
        }
        const day = now.getDay();
        const diff = now.getDate() - day;
        const startOfCurrentWeek = new Date(now.setDate(diff));
        startOfCurrentWeek.setHours(0, 0, 0, 0);
        const lastSetsResetDate = new Date(parsed.lastSetsReset);
        if (lastSetsResetDate.getTime() < startOfCurrentWeek.getTime()) {
            const completedCount = parsed.sets.filter(t => t.completed).length;
            const allSetsCompleted = completedCount === parsed.sets.length;
            if (allSetsCompleted && !parsed.setsPlenoClaimed) {
                parsed.stats.perfectSetsWeeks += 1;
            }
            if (!parsed.stats.setsHistory) parsed.stats.setsHistory = [];
            parsed.stats.setsHistory.push(completedCount);
            if (parsed.stats.setsHistory.length > 52) parsed.stats.setsHistory.shift();
            parsed.sets = parsed.sets.map(t => ({ ...t, completed: false }));
            parsed.setsPlenoClaimed = false;
            parsed.lastSetsReset = Date.now();
        }
        const lastFoodResetDate = new Date(parsed.food.lastWeeklyReset || 0);
        if (lastFoodResetDate.getTime() < startOfCurrentWeek.getTime()) {
            if (!parsed.stats.foodHistory) parsed.stats.foodHistory = [];
            parsed.stats.foodHistory.push(parsed.food.score);
            if (parsed.stats.foodHistory.length > 52) parsed.stats.foodHistory.shift();
            parsed.food.score = 0;
            parsed.food.weeklyBonuses = { organs: false, legumes: false, fast24: false };
            parsed.food.lastWeeklyReset = Date.now();
        }
        const lastTrainsResetDate = new Date(parsed.lastTrainsReset);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const resetMonth = lastTrainsResetDate.getMonth();
        const resetYear = lastTrainsResetDate.getFullYear();
        if (currentYear > resetYear) {
             parsed.annualTrains = parsed.annualTrains.map(t => ({
                 ...t,
                 completed: false,
                 subtasks: t.subtasks?.map(s => ({ ...s, completed: false }))
             }));
        }
        if (currentYear > resetYear || (currentYear === resetYear && currentMonth > resetMonth)) {
             const completedCount = parsed.trains.filter(t => t.completed).length;
             const allTrainsCompleted = parsed.trains.every(t => t.completed);
             if (allTrainsCompleted && !parsed.trainsPlenoClaimed) {
                 parsed.stats.perfectTrainMonths += 1;
             }
             if (!parsed.stats.trainsHistory) parsed.stats.trainsHistory = [];
             parsed.stats.trainsHistory.push(completedCount);
             if (parsed.stats.trainsHistory.length > 12) parsed.stats.trainsHistory.shift();
             const currentTotalInteractions = calculateTotalInteractions(parsed.friends);
             const interactionsThisMonth = currentTotalInteractions - (parsed.stats.lastTotalInteractions || 0);
             if (!parsed.stats.interactionsHistory) parsed.stats.interactionsHistory = [];
             parsed.stats.interactionsHistory.push(interactionsThisMonth);
             if (parsed.stats.interactionsHistory.length > 12) parsed.stats.interactionsHistory.shift();
             parsed.stats.lastTotalInteractions = currentTotalInteractions;
             parsed.trains = parsed.trains.map(t => ({
                 ...t,
                 completed: false,
                 subtasks: t.subtasks?.map(s => ({ ...s, completed: false }))
             }));
             parsed.trainsPlenoClaimed = false;
             parsed.lastTrainsReset = Date.now();
        }
        setData(parsed);
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem('warrior_habits_v4', JSON.stringify(data));
    }
  }, [data, loaded]);

  if (!loaded) return <div className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-400">Cargando...</div>;

  const handleHunosUpdate = (newTasks: Task[], incrementPleno: boolean = false) => {
    const gymTaskNew = newTasks.find(t => t.text.includes('Gim'));
    const gymTaskOld = data.hunos.find(t => t.id === gymTaskNew?.id);
    if (gymTaskNew && gymTaskOld && !gymTaskOld.completed && gymTaskNew.completed) setView('exercise');
    
    const loveTaskNew = newTasks.find(t => t.text.includes('❤️❤️'));
    const loveTaskOld = data.hunos.find(t => t.id === loveTaskNew?.id);
    if (loveTaskNew && loveTaskOld && !loveTaskOld.completed && loveTaskNew.completed) setView('love');
    
    const forjasTaskNew = newTasks.find(t => t.text.includes('🔥'));
    const forjasTaskOld = data.hunos.find(t => t.id === forjasTaskNew?.id);
    if (forjasTaskNew && forjasTaskOld && !forjasTaskOld.completed && forjasTaskNew.completed) setView('forjas');
    
    const leonesTaskNew = newTasks.find(t => t.text.includes('🦁'));
    const leonesTaskOld = data.hunos.find(t => t.id === leonesTaskNew?.id);
    if (leonesTaskNew && leonesTaskOld && !leonesTaskOld.completed && leonesTaskNew.completed) setView('leones');
    
    const ayunoTaskNew = newTasks.find(t => t.text.includes('Ayuno'));
    const ayunoTaskOld = data.hunos.find(t => t.id === ayunoTaskNew?.id);
    if (ayunoTaskNew && ayunoTaskOld && !ayunoTaskOld.completed && ayunoTaskNew.completed) setView('food');
    
    const menuTaskNew = newTasks.find(t => t.text.includes('Menú'));
    const menuTaskOld = data.hunos.find(t => t.id === menuTaskNew?.id);
    if (menuTaskNew && menuTaskOld && !menuTaskOld.completed && menuTaskNew.completed) setView('food');
    
    const setasTaskNew = newTasks.find(t => t.text.includes('🍄'));
    const setasTaskOld = data.hunos.find(t => t.id === setasTaskNew?.id);
    if (setasTaskNew && setasTaskOld && !setasTaskOld.completed && setasTaskNew.completed) setView('sets');
    
    const trenesTaskNew = newTasks.find(t => t.text.includes('🚂'));
    const trenesTaskOld = data.hunos.find(t => t.id === trenesTaskNew?.id);
    if (trenesTaskNew && trenesTaskOld && !trenesTaskOld.completed && trenesTaskNew.completed) setView('trains');
    
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

  const toggleProject = (index: number) => {
    if (isEditingProjects) return;
    const project = data.projects[index];
    if (project.completed) {
        const newProjects = [...data.projects];
        newProjects[index] = { ...project, completed: false };
        setData(prev => ({ ...prev, projects: newProjects }));
        return;
    }
    const newProjects = [...data.projects];
    newProjects[index] = { ...project, completed: true };
    setData(prev => ({ ...prev, projects: newProjects }));

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
  
  const getResourceProgress = (tasks: ResourceTask[]) => {
      if (tasks.length === 0) return 0;
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
      case 'love': return <LoveTreeView friends={data.friends} onUpdate={(f) => setData(prev => ({ ...prev, friends: f }))} onBack={() => setView('home')} />;
      case 'food': return <FoodBoardView foodState={data.food} onUpdate={(f) => setData(prev => ({ ...prev, food: f }))} onBack={() => setView('home')} />;
      case 'forjas': return <ResourceTrackerView title="Forjas" themeColor="orange" tasks={data.forjas} onUpdate={t => setData(prev => ({ ...prev, forjas: t }))} onBack={() => setView('home')} />;
      case 'leones': return <ResourceTrackerView title="Leones" themeColor="amber" tasks={data.leones} billetesState={data.billetesState || Array(20).fill(false)} huchaCount={data.huchaCount || 0} onUpdateBilletes={(bs, hc) => setData(prev => ({...prev, billetesState: bs, huchaCount: hc}))} onUpdate={t => setData(prev => ({ ...prev, leones: t }))} onBack={() => setView('home')} />;
      case 'exercise': return <ExerciseView exercise={data.exercise} onUpdate={ex => setData(prev => ({ ...prev, exercise: ex }))} onBack={() => setView('home')} />;
      case 'stats': return <StatsView data={data} onBack={() => setView('home')} />;
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
                <button onClick={() => setView('love')} className="aspect-square bg-pink-950/30 rounded-xl flex items-center justify-center hover:bg-pink-900/50 transition-colors border border-pink-900/50 group"><Heart className="w-8 h-8 text-pink-500 group-hover:text-pink-400 transition-colors" /></button>
                <button 
                  onClick={() => setView('food')} 
                  className={`aspect-square rounded-xl flex flex-col items-center justify-between p-2 transition-all duration-700 border group relative ${
                    isFoodPleno 
                      ? 'bg-lime-600/30 border-lime-400 shadow-[0_0_30px_rgba(132,204,22,0.4)] ring-2 ring-lime-500/20 scale-[1.05] animate-pulse' 
                      : 'bg-lime-950/30 border-lime-900/50 hover:bg-lime-900/50'
                  }`}
                >
                    <div className="flex-1 flex items-center justify-center">
                        <Utensils className={`w-8 h-8 transition-colors ${isFoodPleno ? 'text-lime-200' : 'text-lime-500 group-hover:text-lime-400'}`} />
                    </div>
                    <div className="w-full h-1 bg-lime-900/40 rounded-full overflow-hidden">
                        <div className="h-full bg-lime-500 transition-all duration-300" style={{ width: `${Math.min(100, (data.food.score / 50) * 100)}%` }}></div>
                    </div>
                </button>
                <button onClick={() => setView('leones')} className="aspect-square bg-amber-950/30 rounded-xl flex flex-col items-center justify-between p-2 hover:bg-amber-900/50 transition-colors border border-amber-900/50 group relative"><div className="flex-1 flex items-center justify-center"><Cat className="w-8 h-8 text-amber-500 group-hover:text-amber-400 transition-colors" /></div><div className="w-full h-1 bg-amber-900/40 rounded-full overflow-hidden"><div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${getResourceProgress(data.leones)}%` }}></div></div></button>
                <button onClick={() => setView('forjas')} className="aspect-square bg-orange-950/30 rounded-xl flex flex-col items-center justify-between p-2 hover:bg-orange-900/50 transition-colors border border-orange-900/50 group relative"><div className="flex-1 flex items-center justify-center"><Flame className="w-8 h-8 text-orange-500 group-hover:text-orange-400 transition-colors" /></div><div className="w-full h-1 bg-orange-900/40 rounded-full overflow-hidden"><div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${getResourceProgress(data.forjas)}%` }}></div></div></button>
            </div>
            <button onClick={() => setView('exercise')} className="w-full bg-emerald-950/30 hover:bg-emerald-900/50 border border-emerald-900/50 rounded-2xl p-4 flex items-center gap-4 group transition-colors mb-3"><div className="p-2 bg-emerald-900/40 rounded-xl flex-shrink-0"><Dumbbell className="w-6 h-6 text-emerald-500" /></div><div className="flex-1 flex gap-1 h-10">{Array.from({ length: 9 }).map((_, i) => ( <div key={i} className={`flex-1 rounded-sm transition-all duration-300 ${ i < data.exercise.seriesCurrent ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'bg-emerald-950/40 border border-emerald-900/30' }`} /> ))}</div></button>
            <DailyHunos tasks={data.hunos} onUpdate={handleHunosUpdate} />
            <div className="bg-stone-900 rounded-2xl shadow-sm p-6 w-full mt-6 border border-stone-800 transition-all duration-300"><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><GearIcon className="w-6 h-6 text-stone-400" /><h2 className="text-xl font-bold text-stone-200">Proyectos</h2></div><button onClick={() => setIsEditingProjects(!isEditingProjects)} className={`p-2 rounded-full transition-colors ${isEditingProjects ? 'bg-stone-700 text-white' : 'hover:bg-stone-800 text-stone-500'}`}>{isEditingProjects ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}</button></div>{isEditingProjects ? ( <div className="space-y-3 animate-in fade-in duration-300">{data.projects.map(proj => ( <div key={proj.id} className="flex gap-2"><input type="text" value={proj.text} onChange={(e) => handleProjectTextChange(proj.id, e.target.value)} className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-stone-500 transition-all" /><button onClick={() => initiateDeleteProject(proj.id)} className="p-2 bg-stone-950 border border-stone-700 rounded-lg text-red-500 hover:bg-red-900/20 transition-colors"><Trash2 className="w-5 h-5" /></button></div> ))}<button onClick={initiateAddProject} className="w-full mt-4 py-3 border-2 border-dashed border-stone-700 rounded-xl flex items-center justify-center gap-2 text-stone-500 hover:text-stone-300 hover:border-stone-600 hover:bg-stone-800/50 transition-all"><Plus className="w-5 h-5" /><span>Añadir Proyecto</span></button></div> ) : ( <div className="grid grid-cols-4 gap-3">{data.projects.length === 0 && <p className="col-span-4 text-center text-stone-600 italic py-2">Sin proyectos activos.</p>}{data.projects.map((proj, idx) => ( <button key={proj.id} onClick={() => toggleProject(idx)} className={`aspect-square rounded-xl border-2 text-2xl flex items-center justify-center transition-all duration-300 ${ proj.completed ? 'bg-yellow-500/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)] scale-105' : 'bg-stone-950 border-stone-800 hover:border-stone-700 text-stone-500 grayscale opacity-70 hover:opacity-100' }`}><span className={proj.completed ? 'grayscale-0' : 'grayscale'}>{getEmoji(proj.text)}</span></button> ))}</div> )}</div>
            <footer className="mt-12 text-center text-stone-700 text-sm">SEMPER ITERVM RVDIS</footer>
            {showHistory && <HistoryEditorModal data={data} onUpdateData={setData} onClose={() => setShowHistory(false)} />}
            
            {showProjectPromptModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
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