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
import { Heart, Utensils, BarChart3, X, Settings, Flame, Cat, Settings as GearIcon, CalendarClock, CheckCircle2, Dumbbell, Edit2, Save, Plus, Trash2 } from 'lucide-react';

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

// Definitions for the Projects section (used for initial setup)
const PROJECT_DEFINITIONS = [
    { text: "Garci 🎬 1h", emoji: "🎬" },
    { text: "Piano 🎹 2x", emoji: "🎹" },
    { text: "Trivium 🎓 10p", emoji: "🎓" }, // Updated with Graduation Cap
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
  // Initialize strictly with the defined list
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
  }
};

// Custom Mushroom Icon
const MushroomIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 10C2 13.5 4.5 16 8 16V20C8 21.1 8.9 22 10 22H14C15.1 22 16 21.1 16 20V16C19.5 16 22 13.5 22 10C22 6.48 17.52 2 12 2ZM12 4C14.5 4 16.5 6 16.5 6C16.5 6 15 8 12 8C9 8 7.5 6 7.5 6C7.5 6 9.5 4 12 4Z" />
  </svg>
);

// Custom Steam Locomotive Icon
const SteamLocomotiveIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
     <path d="M18 10h-1.5V6.5c0-.83-.67-1.5-1.5-1.5h-1V3h-1v2H9V3H8v2H5c-1.1 0-2 .9-2 2v8c0 1.66 1.34 3 3 3h.18c.4 1.15 1.49 2 2.82 2s2.42-.85 2.82-2h4.36c.4 1.15 1.49 2 2.82 2s2.42-.85 2.82-2H22v-6.5c0-.83-.67-1.5-1.5-1.5h-2.5zM6 16c-.83 0-1.5-.67-1.5-1.5S5.17 13 6 13s1.5.67 1.5 1.5S6.83 16 6 16zm13 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
     <path d="M12 6h2v2h-2z" opacity="0.3"/>
     <path d="M19 11h-3v2h3v-2z" />
  </svg>
);

// Helper to extract emoji from text
const getEmoji = (text: string) => {
  const match = text.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u);
  return match ? match[0] : '❓';
};

function App() {
  const [view, setView] = useState<ViewState>('home');
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [loaded, setLoaded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Custom Modal State for Projects
  const [showProjectConfirm, setShowProjectConfirm] = useState(false);
  
  // Project Editing State
  const [isEditingProjects, setIsEditingProjects] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectText, setNewProjectText] = useState('');

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('warrior_habits_v4');
    if (saved) {
      try {
        const parsed: AppData = JSON.parse(saved);
        
        // Migrations
        if (!parsed.stats) parsed.stats = { perfectSetsWeeks: 0, hunoPlenos: 0, perfectTrainMonths: 0, projectPlenos: 0, setsHistory: [], trainsHistory: [], interactionsHistory: [], lastTotalInteractions: 0 };
        if (typeof parsed.stats.projectPlenos === 'undefined') parsed.stats.projectPlenos = 0;
        
        // Init claimed flags if missing
        if (typeof parsed.setsPlenoClaimed === 'undefined') parsed.setsPlenoClaimed = false;
        if (typeof parsed.trainsPlenoClaimed === 'undefined') parsed.trainsPlenoClaimed = false;
        
        // History Migration
        if (!parsed.hunosHistory) parsed.hunosHistory = {};

        // Remove legacy fields if they exist to prevent confusion
        if ('projectCycles' in parsed.stats) delete (parsed.stats as any).projectCycles;
        if ('morningRoutineCycles' in parsed.stats) delete (parsed.stats as any).morningRoutineCycles;

        if (!parsed.stats.setsHistory) parsed.stats.setsHistory = [];
        if (!parsed.stats.trainsHistory) parsed.stats.trainsHistory = [];
        if (!parsed.stats.interactionsHistory) parsed.stats.interactionsHistory = [];
        
        if (!parsed.lastSetsReset) parsed.lastSetsReset = Date.now();
        if (!parsed.lastTrainsReset) parsed.lastTrainsReset = Date.now();

        // Calculate current total interactions for migration
        const calculateTotalInteractions = (friendsList: Friend[]) => {
            return friendsList.reduce((acc, friend) => {
                const interactions = (Object.values(friend.interactions || {}) as number[]).reduce((a, b) => a + b, 0);
                return acc + interactions;
            }, 0);
        };

        if (typeof parsed.stats.lastTotalInteractions === 'undefined') {
            parsed.stats.lastTotalInteractions = calculateTotalInteractions(parsed.friends || []);
        }

        // Ensure new arrays exist
        if (!parsed.forjas) parsed.forjas = [];
        
        // MIGRATION: Ensure Forjas has 5 items (1 Main + 4 Quarterly)
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
                 // i is index 1..4, corresponding to quarterlyDefaults 0..3
                 parsed.forjas.push(quarterlyDefaults[i-1]);
             }
        }

        if (!parsed.leones) parsed.leones = [];

        // MIGRATION: Initialize Annual Trains if missing
        if (!parsed.annualTrains) {
            parsed.annualTrains = ANNUAL_TRAIN_TASKS.map((text, i) => ({
                id: `annual-train-${i}`,
                text,
                completed: false,
                subtasks: []
            }));
        }
        
        // Exercise Migration
        if (!parsed.exercise) {
            parsed.exercise = {
                seriesCurrent: 0,
                daysTrained: 0,
                totalMinutes: 0,
                sprintCount: 0,
                stretchCount: 0
            };
        }
        
        // MIGRATION: Add totalMinutes if it doesn't exist (for existing exercise objects)
        if (typeof parsed.exercise.totalMinutes === 'undefined') {
            parsed.exercise.totalMinutes = 0;
        }
        
        // Cleanup Morning Routine if present in data but not needed anymore
        if ('morningRoutine' in parsed) delete (parsed as any).morningRoutine;
        
        // PROJECT RE-INITIALIZATION
        // Only re-initialize if project array is empty or structure is very old
        // We want to persist user edits to projects, so we trust parsed.projects if it exists and has items
        if (!parsed.projects || parsed.projects.length === 0) {
            parsed.projects = PROJECT_DEFINITIONS.map((def, i) => ({
                id: `new-proj-${i}`,
                text: def.text,
                completed: false
            }));
        } else {
             // MIGRATION: Update Trivium name if it matches the old default
             parsed.projects = parsed.projects.map(p => {
                 if (p.text === "Trivium 10p") {
                     return { ...p, text: "Trivium 🎓 10p" };
                 }
                 return p;
             });
        }

        // Food Migration
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

        // Friend Data Migration
        if (parsed.friends) {
            parsed.friends = parsed.friends.map((f: any) => ({
                ...f,
                interactions: f.interactions || { person: 0, call: 0, gift: 0, photo: 0, message: 0 },
                tasks: f.tasks || []
            }));
        }

        // Rename FAH task migration
        if (parsed.hunos) {
            parsed.hunos = parsed.hunos.map(task => {
                if (task.text === "1 FAH 🚫🍰") {
                    return { ...task, text: "1 FAH 🍰" };
                }
                return task;
            });
        }
        
        const now = new Date();

        // 1. Daily Reset Logic
        const today = now.toDateString();
        if (parsed.lastDate !== today) {
            // CRITICAL: Save yesterday's completion state to history BEFORE resetting
            const yesterdayKey = parsed.lastDate || '';
            if (yesterdayKey) {
                const completedIds = parsed.hunos.filter(t => t.completed).map(t => t.id);
                if (!parsed.hunosHistory) parsed.hunosHistory = {};
                parsed.hunosHistory[yesterdayKey] = completedIds;
            }

            parsed.hunos = parsed.hunos.map(task => ({
                ...task,
                failedYesterday: !task.completed,
                completed: false,
                plenoCompleted: false // Reset dots daily
            }));
            parsed.lastDate = today;
        }

        // 2. Weekly Reset Logic (Sunday)
        const day = now.getDay();
        const diff = now.getDate() - day;
        const startOfCurrentWeek = new Date(now.setDate(diff));
        startOfCurrentWeek.setHours(0, 0, 0, 0);
        
        // Sets Reset
        const lastSetsResetDate = new Date(parsed.lastSetsReset);
        if (lastSetsResetDate.getTime() < startOfCurrentWeek.getTime()) {
            const completedCount = parsed.sets.filter(t => t.completed).length;
            const allSetsCompleted = completedCount === parsed.sets.length;
            
            // Increment stat only if it wasn't already claimed during the week
            if (allSetsCompleted && !parsed.setsPlenoClaimed) {
                parsed.stats.perfectSetsWeeks += 1;
            }
            
            if (!parsed.stats.setsHistory) parsed.stats.setsHistory = [];
            parsed.stats.setsHistory.push(completedCount);
            if (parsed.stats.setsHistory.length > 52) parsed.stats.setsHistory.shift();

            parsed.sets = parsed.sets.map(t => ({ ...t, completed: false }));
            parsed.setsPlenoClaimed = false; // Reset claim flag
            parsed.lastSetsReset = Date.now();
        }

        // Food Reset (Sunday)
        const lastFoodResetDate = new Date(parsed.food.lastWeeklyReset || 0);
        if (lastFoodResetDate.getTime() < startOfCurrentWeek.getTime()) {
            parsed.food.score = 0;
            parsed.food.weeklyBonuses = { organs: false, legumes: false, fast24: false };
            parsed.food.lastWeeklyReset = Date.now();
        }

        // 3. Monthly & Annual Reset Logic
        const lastTrainsResetDate = new Date(parsed.lastTrainsReset);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const resetMonth = lastTrainsResetDate.getMonth();
        const resetYear = lastTrainsResetDate.getFullYear();

        // Check for YEAR change specifically for Annual Trains
        if (currentYear > resetYear) {
             parsed.annualTrains = parsed.annualTrains.map(t => ({
                 ...t,
                 completed: false,
                 subtasks: t.subtasks?.map(s => ({ ...s, completed: false }))
             }));
        }

        // Check for MONTH change (includes Year change) for Monthly Trains
        if (currentYear > resetYear || (currentYear === resetYear && currentMonth > resetMonth)) {
             const completedCount = parsed.trains.filter(t => t.completed).length;
             const allTrainsCompleted = parsed.trains.every(t => t.completed);
             
             // Increment stat only if it wasn't already claimed during the month
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

             // Reset Monthly Trains
             parsed.trains = parsed.trains.map(t => ({
                 ...t,
                 completed: false,
                 subtasks: t.subtasks?.map(s => ({ ...s, completed: false }))
             }));
             parsed.trainsPlenoClaimed = false; // Reset claim flag
             
             parsed.lastTrainsReset = Date.now();
        }
        
        setData(parsed);
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
    setLoaded(true);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (loaded) {
      localStorage.setItem('warrior_habits_v4', JSON.stringify(data));
    }
  }, [data, loaded]);

  if (!loaded) return <div className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-400">Cargando...</div>;

  const handleHunosUpdate = (newTasks: Task[], incrementPleno: boolean = false) => {
    // Check if Gym task is being completed
    const gymTaskNew = newTasks.find(t => t.text.includes('Gim'));
    // We compare with the *current* state (data.hunos) to see if it transitioned from false to true
    const gymTaskOld = data.hunos.find(t => t.id === gymTaskNew?.id);

    if (gymTaskNew && gymTaskOld && !gymTaskOld.completed && gymTaskNew.completed) {
        setView('exercise');
    }

    // Check if Love task is being completed
    const loveTaskNew = newTasks.find(t => t.text.includes('❤️❤️'));
    const loveTaskOld = data.hunos.find(t => t.id === loveTaskNew?.id);

    if (loveTaskNew && loveTaskOld && !loveTaskOld.completed && loveTaskNew.completed) {
        setView('love');
    }

    // Check if Forjas task (T2) is being completed
    const forjasTaskNew = newTasks.find(t => t.text.includes('🔥'));
    const forjasTaskOld = data.hunos.find(t => t.id === forjasTaskNew?.id);

    if (forjasTaskNew && forjasTaskOld && !forjasTaskOld.completed && forjasTaskNew.completed) {
        setView('forjas');
    }

    // Check if Leones task (T1) is being completed
    const leonesTaskNew = newTasks.find(t => t.text.includes('🦁'));
    const leonesTaskOld = data.hunos.find(t => t.id === leonesTaskNew?.id);

    if (leonesTaskNew && leonesTaskOld && !leonesTaskOld.completed && leonesTaskNew.completed) {
        setView('leones');
    }

    // Check if Ayuno task is being completed
    const ayunoTaskNew = newTasks.find(t => t.text.includes('Ayuno'));
    const ayunoTaskOld = data.hunos.find(t => t.id === ayunoTaskNew?.id);

    if (ayunoTaskNew && ayunoTaskOld && !ayunoTaskOld.completed && ayunoTaskNew.completed) {
        setView('food');
    }

    // Check if Menú task is being completed
    const menuTaskNew = newTasks.find(t => t.text.includes('Menú'));
    const menuTaskOld = data.hunos.find(t => t.id === menuTaskNew?.id);

    if (menuTaskNew && menuTaskOld && !menuTaskOld.completed && menuTaskNew.completed) {
        setView('food');
    }

    // Sync to history
    const todayKey = new Date().toDateString();
    const completedIds = newTasks.filter(t => t.completed).map(t => t.id);
    const updatedHistory = {
        ...(data.hunosHistory || {}),
        [todayKey]: completedIds
    };

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

  // Logic for Projects (Garci, Piano, Trivium, etc.)
  const toggleProject = (index: number) => {
    if (isEditingProjects) return;

    const project = data.projects[index];
    
    // If unchecking, just update normally
    if (project.completed) {
        const newProjects = [...data.projects];
        newProjects[index] = { ...project, completed: false };
        setData(prev => ({ ...prev, projects: newProjects }));
        return;
    }

    // If checking, verify if it's the last one
    // It is the last one if all OTHER projects are already completed
    const isLastOne = data.projects.every((p, i) => i === index || p.completed);

    if (isLastOne) {
        // Instead of window.confirm, show our custom modal
        setShowProjectConfirm(true);
    } else {
        // Normal check
        const newProjects = [...data.projects];
        newProjects[index] = { ...project, completed: true };
        setData(prev => ({ ...prev, projects: newProjects }));
    }
  };

  // PROJECT HANDLERS
  const handleProjectTextChange = (id: string, newText: string) => {
    setData(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === id ? { ...p, text: newText } : p)
    }));
  };

  const initiateAddProject = () => {
    setIsAddingProject(true);
    setNewProjectText('');
  };

  const confirmAddProject = () => {
    if (!newProjectText.trim()) return;
    const newProj = {
        id: `proj-${Date.now()}`,
        text: newProjectText,
        completed: false
    };
    setData(prev => ({ ...prev, projects: [...prev.projects, newProj] }));
    setIsAddingProject(false);
  };

  const initiateDeleteProject = (id: string) => {
    setProjectToDelete(id);
  };

  const confirmDeleteProject = () => {
    if (!projectToDelete) return;
    setData(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== projectToDelete) }));
    setProjectToDelete(null);
  };

  const confirmProjectPleno = () => {
      // Increment stat and reset all to false (start new cycle)
      setData(prev => ({
        ...prev,
        stats: {
            ...prev.stats,
            projectPlenos: (prev.stats.projectPlenos || 0) + 1
        },
        // Reset all
        projects: prev.projects.map(p => ({ ...p, completed: false }))
      }));
      setShowProjectConfirm(false);
  };

  const cancelProjectPleno = () => {
      setShowProjectConfirm(false);
  };

  // HANDLER FOR SETS UPDATE (Including instant stat claim logic)
  const handleSetsUpdate = (newTasks: WeeklyTask[]) => {
      const allCompleted = newTasks.length > 0 && newTasks.every(t => t.completed);
      const wasClaimed = data.setsPlenoClaimed || false;
      
      let newStats = { ...data.stats };
      let newClaimed = wasClaimed;

      if (allCompleted && !wasClaimed) {
          // Grant point instantly
          newStats.perfectSetsWeeks += 1;
          newClaimed = true;
      } else if (!allCompleted && wasClaimed) {
          // Revoke point instantly
          newStats.perfectSetsWeeks = Math.max(0, newStats.perfectSetsWeeks - 1);
          newClaimed = false;
      }

      setData(prev => ({
          ...prev,
          sets: newTasks,
          stats: newStats,
          setsPlenoClaimed: newClaimed
      }));
  };

  // HANDLER FOR TRAINS UPDATE (Including instant stat claim logic)
  const handleTrainsUpdate = (newTasks: Task[]) => {
      const allCompleted = newTasks.length > 0 && newTasks.every(t => t.completed);
      const wasClaimed = data.trainsPlenoClaimed || false;
      
      let newStats = { ...data.stats };
      let newClaimed = wasClaimed;

      if (allCompleted && !wasClaimed) {
          // Grant point instantly
          newStats.perfectTrainMonths += 1;
          newClaimed = true;
      } else if (!allCompleted && wasClaimed) {
          // Revoke point instantly
          newStats.perfectTrainMonths = Math.max(0, newStats.perfectTrainMonths - 1);
          newClaimed = false;
      }

      setData(prev => ({
          ...prev,
          trains: newTasks,
          stats: newStats,
          trainsPlenoClaimed: newClaimed
      }));
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
     if (total === 0) {
        return (
            <svg width="40" height="40" viewBox="0 0 40 40" className="transform -rotate-90">
                <circle cx="20" cy="20" r="16" fill="transparent" stroke="#450a0a" strokeWidth="4" />
            </svg>
        );
     }

     const radius = 16;
     const cx = 20;
     const cy = 20;

     const sortedSets = [...data.sets].sort((a, b) => Number(b.completed) - Number(a.completed));
     
     return (
        <svg width="40" height="40" viewBox="0 0 40 40" className="transform -rotate-90">
             <circle cx="20" cy="20" r="16" fill="transparent" stroke="#450a0a" strokeWidth="4" />
             {sortedSets.map((task, index) => {
                 if (!task.completed) return null;
                 
                 // Special case: Single item circle
                 if (total === 1) {
                     return <circle key={index} cx={cx} cy={cy} r={radius} fill="#ef4444" />;
                 }

                 const sliceAngle = 360 / total;
                 const startAngle = index * sliceAngle;
                 const endAngle = (index + 1) * sliceAngle;
                 
                 const startRad = (startAngle) * (Math.PI / 180);
                 const endRad = (endAngle) * (Math.PI / 180);
                 
                 const x1 = cx + radius * Math.cos(startRad);
                 const y1 = cy + radius * Math.sin(startRad);
                 const x2 = cx + radius * Math.cos(endRad);
                 const y2 = cy + radius * Math.sin(endRad);

                 const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                 
                 const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                 
                 return <path key={index} d={d} fill="#ef4444" />;
             })}
        </svg>
     );
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

  const renderStats = () => {
      const totalInteractions = data.friends.reduce((acc, friend) => {
          acc.person += friend.interactions.person;
          acc.call += friend.interactions.call;
          acc.gift += friend.interactions.gift;
          acc.photo += friend.interactions.photo;
          acc.message += friend.interactions.message;
          return acc;
      }, { person: 0, call: 0, gift: 0, photo: 0, message: 0 });

      const isCurrentSetsPerfect = data.sets.length > 0 && data.sets.every(t => t.completed);
      const displayedSetsScore = data.stats.perfectSetsWeeks + (isCurrentSetsPerfect && !data.setsPlenoClaimed ? 1 : 0); // Logic handled in update now, but keeping display safe

      const isCurrentTrainsPerfect = data.trains.length > 0 && data.trains.every(t => t.completed);
      const displayedTrainsScore = data.stats.perfectTrainMonths + (isCurrentTrainsPerfect && !data.trainsPlenoClaimed ? 1 : 0); // Logic handled in update now, but keeping display safe

      const setsHistory = data.stats.setsHistory || [];
      const currentWeekCount = data.sets.filter(t => t.completed).length;
      const setsChartData = [...setsHistory.slice(-9), currentWeekCount];
      while (setsChartData.length < 10) setsChartData.unshift(0);
      
      const now = new Date();
      const tenWeeksAgo = new Date(now.getTime() - (9 * 7 * 24 * 60 * 60 * 1000));
      const setsStartDayLabel = `${tenWeeksAgo.getDate()}/${tenWeeksAgo.getMonth() + 1}`;
      const setsMaxVal = 8;

      const trainsHistory = data.stats.trainsHistory || [];
      const currentTrainCount = data.trains.filter(t => t.completed).length;
      const trainsChartData = [...trainsHistory.slice(-5), currentTrainCount];
      while (trainsChartData.length < 6) trainsChartData.unshift(0);
      
      const currentMonthIndex = now.getMonth() + 1;
      let startMonthLabel = currentMonthIndex - 5;
      if (startMonthLabel <= 0) startMonthLabel += 12;

      const trainsMaxVal = 37;

      const interactionsHistory = data.stats.interactionsHistory || [];
      const currentTotalInts = data.friends.reduce((acc, friend) => {
          return acc + (Object.values(friend.interactions) as number[]).reduce((a, b) => a + b, 0);
      }, 0);
      const currentMonthInts = Math.max(0, currentTotalInts - (data.stats.lastTotalInteractions || 0));
      
      const interactionsChartData = [...interactionsHistory.slice(-5), currentMonthInts];
      while (interactionsChartData.length < 6) interactionsChartData.unshift(0);
      
      const interactionsMaxVal = Math.max(...interactionsChartData, 5);

      return (
        <div className="flex flex-col h-full bg-stone-900/50">
             <div className="p-4 bg-stone-900 shadow-sm flex items-center justify-between sticky top-0 z-10 border-b border-stone-800">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-stone-200">Estadísticas</h1>
                </div>
                <button onClick={() => setView('home')} className="p-2 hover:bg-stone-800 rounded-full">
                    <X className="w-6 h-6 text-stone-400" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 grid gap-6 pb-20">
                {/* Sets Stats with Chart */}
                <div className="bg-stone-900 border border-red-900/50 p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="text-4xl font-black text-red-500">{data.stats.perfectSetsWeeks}</div>
                            <div className="text-red-200 font-bold">Setas Completadas</div>
                        </div>
                        <MushroomIcon className="w-12 h-12 text-red-900/40" />
                    </div>
                    
                    <div className="mt-4">
                        <div className="flex items-end gap-2 h-24 mb-2">
                            {setsChartData.map((val, idx) => (
                                <div key={idx} className="flex-1 flex flex-col justify-end h-full group relative">
                                    <div 
                                        className={`w-full rounded-t-sm transition-all duration-500 ${idx === 9 ? 'bg-red-500' : 'bg-red-900/40'}`}
                                        style={{ height: `${(val / setsMaxVal) * 100}%` }}
                                    ></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-stone-500 font-mono border-t border-stone-800 pt-1">
                            <span>{setsStartDayLabel}</span>
                            <span>Actual</span>
                        </div>
                    </div>
                </div>

                {/* Trains Stats with Chart */}
                <div className="bg-stone-900 border border-blue-900/50 p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="text-4xl font-black text-blue-500">{data.stats.perfectTrainMonths}</div>
                            <div className="text-blue-200 font-bold">Trenes Llegados</div>
                            <div className="text-xs text-blue-500/60 mt-1">Meses perfectos</div>
                        </div>
                        <SteamLocomotiveIcon className="w-12 h-12 text-blue-900/40" />
                    </div>

                    <div className="mt-4">
                        <div className="flex items-end gap-3 h-24 mb-2">
                            {trainsChartData.map((val, idx) => (
                                <div key={idx} className="flex-1 flex flex-col justify-end h-full group relative">
                                    <div 
                                        className={`w-full rounded-t-sm transition-all duration-500 ${idx === 5 ? 'bg-blue-500' : 'bg-blue-900/40'}`}
                                        style={{ height: `${(val / trainsMaxVal) * 100}%` }}
                                    ></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-stone-500 font-mono border-t border-stone-800 pt-1">
                            <span>{startMonthLabel}</span>
                            <span>Actual</span>
                        </div>
                    </div>
                </div>

                <div className="bg-stone-900 border border-stone-700/50 p-6 rounded-2xl flex items-center justify-between">
                    <div>
                        <div className="text-4xl font-black text-stone-200">{data.stats.hunoPlenos}</div>
                        <div className="text-stone-300 font-bold">Plenos de Hunos</div>
                        <div className="text-xs text-stone-500 mt-1">Ciclos completados</div>
                    </div>
                    <BarChart3 className="w-12 h-12 text-stone-800" />
                </div>

                {/* PROJECT STATS */}
                <div className="bg-stone-900 border border-yellow-900/50 p-6 rounded-2xl flex items-center justify-between">
                    <div>
                        <div className="text-4xl font-black text-stone-200">{data.stats.projectPlenos}</div>
                        <div className="text-stone-300 font-bold">Plenos de Proyectos</div>
                        <div className="text-xs text-stone-500 mt-1">Vueltas completadas</div>
                    </div>
                    <GearIcon className="w-12 h-12 text-yellow-500/50" />
                </div>

                {/* Interaction Stats */}
                <div className="col-span-1 bg-stone-900 border border-pink-900/50 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <Heart className="w-6 h-6 text-pink-500" />
                        <h2 className="text-xl font-bold text-pink-200">Interacciones Totales</h2>
                    </div>
                    <div className="flex justify-between items-center px-2 mb-6">
                         <div className="flex flex-col items-center gap-2">
                             <span className="text-2xl">🫂</span>
                             <span className="text-lg font-bold text-stone-200">{totalInteractions.person}</span>
                         </div>
                         <div className="flex flex-col items-center gap-2">
                             <span className="text-2xl">📞</span>
                             <span className="text-lg font-bold text-stone-200">{totalInteractions.call}</span>
                         </div>
                         <div className="flex flex-col items-center gap-2">
                             <span className="text-2xl">🎁</span>
                             <span className="text-lg font-bold text-stone-200">{totalInteractions.gift}</span>
                         </div>
                         <div className="flex flex-col items-center gap-2">
                             <span className="text-2xl">📸</span>
                             <span className="text-lg font-bold text-stone-200">{totalInteractions.photo}</span>
                         </div>
                         <div className="flex flex-col items-center gap-2">
                             <span className="text-2xl">💬</span>
                             <span className="text-lg font-bold text-stone-200">{totalInteractions.message}</span>
                         </div>
                    </div>

                    <div>
                         <div className="flex items-end gap-3 h-32 mb-2 pt-4">
                            {interactionsChartData.map((val, idx) => (
                                <div key={idx} className="flex-1 flex flex-col justify-end h-full group relative">
                                    <div className="text-[10px] text-pink-500/80 font-mono text-center mb-1">{val}</div>
                                    <div 
                                        className={`w-full rounded-t-sm transition-all duration-500 ${idx === 5 ? 'bg-pink-500' : 'bg-pink-900/40'}`}
                                        style={{ height: `${Math.max(2, (val / interactionsMaxVal) * 100)}%` }}
                                    ></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-stone-500 font-mono border-t border-stone-800 pt-1">
                            <span>{startMonthLabel}</span>
                            <span>Actual</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )
  }

  const renderView = () => {
    switch (view) {
      case 'trains':
        return (
            <TrainView 
                tasks={data.trains} 
                annualTasks={data.annualTrains}
                onUpdate={handleTrainsUpdate} // Updated handler
                onUpdateAnnual={(t) => setData(prev => ({ ...prev, annualTrains: t }))}
                onBack={() => setView('home')} 
            />
        );
      case 'sets':
        return <SetsView tasks={data.sets} onUpdate={handleSetsUpdate} onBack={() => setView('home')} />; // Updated handler
      case 'love':
        return <LoveTreeView friends={data.friends} onUpdate={(f) => setData(prev => ({ ...prev, friends: f }))} onBack={() => setView('home')} />;
      case 'food':
        return <FoodBoardView foodState={data.food} onUpdate={(f) => setData(prev => ({ ...prev, food: f }))} onBack={() => setView('home')} />;
      case 'forjas':
        return <ResourceTrackerView title="Forjas" themeColor="orange" tasks={data.forjas} onUpdate={t => setData(prev => ({ ...prev, forjas: t }))} onBack={() => setView('home')} />;
      case 'leones':
        return <ResourceTrackerView title="Leones" themeColor="amber" tasks={data.leones} onUpdate={t => setData(prev => ({ ...prev, leones: t }))} onBack={() => setView('home')} />;
      case 'exercise':
        return <ExerciseView exercise={data.exercise} onUpdate={ex => setData(prev => ({ ...prev, exercise: ex }))} onBack={() => setView('home')} />;
      case 'stats':
        return renderStats();
      default:
        return (
          <div className="flex flex-col min-h-screen max-w-md mx-auto bg-stone-950 p-6 relative">
            <header className="mb-6 mt-4 flex justify-between items-start">
              <h1 className="text-4xl font-black text-stone-100 tracking-tighter">EL REINO</h1>
              <div className="flex gap-2">
                <button 
                    onClick={() => setShowHistory(true)}
                    className="p-2 bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors border border-stone-800"
                >
                    <CalendarClock className="w-6 h-6 text-stone-500" />
                </button>
                <button 
                    onClick={() => setView('stats')}
                    className="p-2 bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors border border-stone-800"
                >
                    <BarChart3 className="w-6 h-6 text-stone-500" />
                </button>
              </div>
            </header>

            {/* Big Buttons (Trains & Sets) */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button 
                onClick={() => setView('trains')}
                className="aspect-[4/3] bg-blue-950/30 rounded-2xl p-4 flex flex-col justify-between hover:bg-blue-900/50 transition-colors border border-blue-900/50 shadow-sm group relative overflow-hidden"
              >
                <div className="flex justify-between items-start w-full z-10">
                    <SteamLocomotiveIcon className="w-8 h-8 text-blue-500 group-hover:text-blue-400 transition-colors" />
                    <span className="text-xl font-black text-blue-500/50">{getTrainProgress()}%</span>
                </div>
                
                <div className="text-left z-10 w-full pr-1">
                  <span className="block text-blue-200 font-bold text-lg mb-1">Trenes</span>
                  <div className="w-full h-1.5 bg-blue-900/40 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${getTrainProgress()}%` }}></div>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => setView('sets')}
                className="aspect-[4/3] bg-red-950/30 rounded-2xl p-4 flex flex-col justify-between hover:bg-red-900/50 transition-colors border border-red-900/50 shadow-sm group"
              >
                <div className="flex justify-between items-start w-full">
                    <MushroomIcon className="w-8 h-8 text-red-500 group-hover:text-red-400 transition-colors" />
                    <div className="opacity-80 scale-75 origin-top-right">
                        {renderSetsPreview()}
                    </div>
                </div>
                <div className="text-left">
                  <span className="block text-red-200 font-bold text-lg">Setas</span>
                  <span className="text-red-500/80 text-[10px] font-medium leading-tight">{getWeekLabel()}</span>
                </div>
              </button>
            </div>

            {/* Small Buttons Row */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                <button 
                    onClick={() => setView('love')}
                    className="aspect-square bg-pink-950/30 rounded-xl flex items-center justify-center hover:bg-pink-900/50 transition-colors border border-pink-900/50 group"
                >
                    <Heart className="w-8 h-8 text-pink-500 group-hover:text-pink-400 transition-colors" />
                </button>

                <button 
                    onClick={() => setView('food')}
                    className="aspect-square bg-lime-950/30 rounded-xl flex items-center justify-center hover:bg-lime-900/50 transition-colors border border-lime-900/50 group"
                >
                    <Utensils className="w-8 h-8 text-lime-500 group-hover:text-lime-400 transition-colors" />
                </button>

                <button 
                    onClick={() => setView('leones')}
                    className="aspect-square bg-amber-950/30 rounded-xl flex flex-col items-center justify-between p-2 hover:bg-amber-900/50 transition-colors border border-amber-900/50 group relative"
                >
                    <div className="flex-1 flex items-center justify-center">
                        <Cat className="w-8 h-8 text-amber-500 group-hover:text-amber-400 transition-colors" />
                    </div>
                    <div className="w-full h-1 bg-amber-900/40 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-amber-500 transition-all duration-300" 
                            style={{ width: `${getResourceProgress(data.leones)}%` }}
                        ></div>
                    </div>
                </button>

                <button 
                    onClick={() => setView('forjas')}
                    className="aspect-square bg-orange-950/30 rounded-xl flex flex-col items-center justify-between p-2 hover:bg-orange-900/50 transition-colors border border-orange-900/50 group relative"
                >
                     <div className="flex-1 flex items-center justify-center">
                        <Flame className="w-8 h-8 text-orange-500 group-hover:text-orange-400 transition-colors" />
                     </div>
                     <div className="w-full h-1 bg-orange-900/40 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-orange-500 transition-all duration-300" 
                            style={{ width: `${getResourceProgress(data.forjas)}%` }}
                        ></div>
                    </div>
                </button>
            </div>

            {/* NEW EXERCISE BUTTON */}
            <button 
                onClick={() => setView('exercise')}
                className="w-full bg-indigo-950/30 hover:bg-indigo-900/50 border border-indigo-900/50 rounded-2xl p-4 flex items-center gap-4 group transition-colors mb-6"
            >
                <div className="p-2 bg-indigo-900/40 rounded-xl flex-shrink-0">
                    <Dumbbell className="w-6 h-6 text-indigo-500" />
                </div>
                
                {/* 9 Series Bars - Expanded to fill space */}
                <div className="flex-1 flex gap-1 h-10">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div
                            key={i}
                            className={`flex-1 rounded-sm transition-all duration-300 ${
                                i < data.exercise.seriesCurrent
                                    ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]'
                                    : 'bg-indigo-950/40 border border-indigo-900/30'
                            }`}
                        />
                    ))}
                </div>
            </button>

            <DailyHunos 
              tasks={data.hunos} 
              onUpdate={handleHunosUpdate} 
            />

            {/* PROJECTS SECTION */}
            <div className="bg-stone-900 rounded-2xl shadow-sm p-6 w-full mt-6 border border-stone-800 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <GearIcon className="w-6 h-6 text-stone-400" />
                        <h2 className="text-xl font-bold text-stone-200">Proyectos</h2>
                    </div>
                    <button 
                        onClick={() => setIsEditingProjects(!isEditingProjects)}
                        className={`p-2 rounded-full transition-colors ${isEditingProjects ? 'bg-stone-700 text-white' : 'hover:bg-stone-800 text-stone-500'}`}
                    >
                        {isEditingProjects ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                    </button>
                </div>

                {isEditingProjects ? (
                    <div className="space-y-3 animate-in fade-in duration-300">
                        {data.projects.map(proj => (
                            <div key={proj.id} className="flex gap-2">
                                <input 
                                      type="text"
                                      value={proj.text}
                                      onChange={(e) => handleProjectTextChange(proj.id, e.target.value)}
                                      className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 focus:outline-none focus:border-stone-500 transition-all"
                                  />
                                  <button 
                                      onClick={() => initiateDeleteProject(proj.id)}
                                      className="p-2 bg-stone-950 border border-stone-700 rounded-lg text-red-500 hover:bg-red-900/20 transition-colors"
                                  >
                                      <Trash2 className="w-5 h-5" />
                                  </button>
                            </div>
                        ))}
                         <button 
                            onClick={initiateAddProject}
                            className="w-full mt-4 py-3 border-2 border-dashed border-stone-700 rounded-xl flex items-center justify-center gap-2 text-stone-500 hover:text-stone-300 hover:border-stone-600 hover:bg-stone-800/50 transition-all"
                          >
                             <Plus className="w-5 h-5" />
                             <span>Añadir Proyecto</span>
                         </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-3">
                        {data.projects.length === 0 && (
                             <p className="col-span-4 text-center text-stone-600 italic py-2">Sin proyectos activos.</p>
                        )}
                        {data.projects.map((proj, idx) => {
                            const emoji = getEmoji(proj.text);
                            
                            return (
                                <button
                                    key={proj.id}
                                    onClick={() => toggleProject(idx)}
                                    title={proj.text}
                                    className={`aspect-square rounded-xl border-2 text-2xl flex items-center justify-center transition-all duration-300 ${
                                        proj.completed 
                                            ? 'bg-yellow-500/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)] scale-105' 
                                            : 'bg-stone-950 border-stone-800 hover:border-stone-700 text-stone-500 grayscale opacity-70 hover:opacity-100'
                                    }`}
                                >
                                    <span className={proj.completed ? 'grayscale-0' : 'grayscale'}>
                                        {emoji}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            
            <footer className="mt-12 text-center text-stone-700 text-sm">
                SEMPER ITERVM RVDIS
            </footer>
            
            {showHistory && (
                <HistoryEditorModal 
                    data={data} 
                    onUpdateData={(newData) => setData(newData)} 
                    onClose={() => setShowHistory(false)} 
                />
            )}

            {/* CUSTOM PROJECT CONFIRMATION MODAL */}
            {showProjectConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">
                        <div className="p-6 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-yellow-900/30 rounded-full flex items-center justify-center mb-4 border border-yellow-600/50">
                                <CheckCircle2 className="w-10 h-10 text-yellow-500" />
                            </div>
                            <h2 className="text-xl font-bold text-stone-100 mb-2">¡Vuelta Completa!</h2>
                            <p className="text-stone-400 mb-6 text-sm">
                                Has completado todos los proyectos de la rueda. ¿Quieres sumar +1 al contador y reiniciar?
                            </p>
                            
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button 
                                    onClick={cancelProjectPleno}
                                    className="py-3 rounded-xl border border-stone-700 text-stone-400 hover:bg-stone-800 font-bold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={confirmProjectPleno}
                                    className="py-3 rounded-xl bg-yellow-600 text-stone-950 font-bold hover:bg-yellow-500 transition-colors shadow-lg shadow-yellow-900/20"
                                >
                                    ¡Sí, sumar +1!
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD PROJECT MODAL */}
            {isAddingProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
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
                                    className="w-full bg-stone-950 border border-stone-700 rounded-xl p-4 text-stone-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-lg"
                                />
                                <p className="text-xs text-stone-500 mt-2">Incluye un emoji para el icono (ej: "Web 🌐").</p>
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
                                    className="py-3 rounded-xl bg-yellow-600 text-stone-950 font-bold hover:bg-yellow-500 transition-colors shadow-lg shadow-yellow-900/20"
                                >
                                    Añadir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE PROJECT CONFIRMATION MODAL */}
            {projectToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">
                        <div className="p-6 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4 border border-red-600/50">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                            <h2 className="text-xl font-bold text-stone-100 mb-2">¿Borrar Proyecto?</h2>
                            <p className="text-stone-400 mb-6 text-sm">
                                Esta acción no se puede deshacer.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button 
                                    onClick={() => setProjectToDelete(null)}
                                    className="py-3 rounded-xl border border-stone-700 text-stone-400 hover:bg-stone-800 font-bold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={confirmDeleteProject}
                                    className="py-3 rounded-xl bg-red-600 text-stone-950 font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                                >
                                    Borrar
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

  return (
    <div className="bg-stone-950 min-h-screen text-stone-200 font-sans select-none sm:select-text relative">
        <div className="max-w-md mx-auto bg-stone-950 min-h-screen shadow-2xl overflow-hidden relative border-x border-stone-900">
            {renderView()}
        </div>
    </div>
  );
}

export default App;