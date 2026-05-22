export type ViewState = 'home' | 'trains' | 'sets' | 'love' | 'food' | 'stats' | 'forjas' | 'leones' | 'exercise' | 'yunque' | 'caminos';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  subtasks?: Task[];
  failedYesterday?: boolean;
  missedDays?: number;
  plenoCompleted?: boolean; // true if completed at least once in the current "pleno" cycle
  phase?: 'Fase 1' | 'Fase 2' | 'Fase 3' | 'Fase 4';
  isProvisional?: boolean;
  repeaterMonths?: number[]; // Array of months (0-11) where this task automatically resets
  hunoType?: 'fantastico' | 'enanito' | 'fondo';
  shortcut?: string;
  notes?: string; // Additional details for AI recommendations
}

export interface GympiezaTask {
  id: string;
  text: string;
  completed: boolean;
  type: 'superficies' | 'barrer' | 'fregar';
}

export interface GympiezaState {
  lastReset: number;
  tasks: GympiezaTask[];
  scrollPosition?: number;
}

export interface WeeklyTask extends Task {
  dayCompleted?: number; // timestamp
}

export interface ResourceTask {
  id: string;
  name: string;
  unit: string;
  current: number;
  target: number;
  isPrincipal?: boolean;
}

export interface Book {
  id: string;
  title: string;
  currentPage: number;
  totalPages: number;
  completed: boolean;
}

export interface Camino {
  id: string;
  name: string;
  progress: number; // This will now represent the current count
  target?: number;
  unit?: string;
}

export interface FriendInteractions {
  person: number;
  call: number;
  gift: number;
  photo: number;
  message: number;
}

export interface FriendTask {
  id: string;
  text: string;
}

export interface Friend {
  id: string;
  name: string;
  lastInteraction: number; // timestamp
  interactions: FriendInteractions;
  tasks: FriendTask[];
  birthday?: string; // YYYY-MM-DD
  isSporadic?: boolean;
}

export interface FoodWheel {
  [key: string]: boolean;
}

export interface FoodBonuses {
  [key: string]: boolean;
}

export interface FoodConfig {
  wheel: { id: string; icon: string; label: string }[];
  broccoli: { id: string; icon: string; label: string }[];
  bonuses: { id: string; icon: string; label: string; points: number }[];
  meals: { name: string; icon: string; max: number }[];
}

export interface DailyFoodScore {
  lunch: boolean;
  lunchMeal?: string;
  dinner: boolean;
  dinnerMeal?: string;
  fasting: boolean;
  deliveryLunch: boolean;
  deliveryDinner: boolean;
  fah: boolean[]; // length 4
  calories?: number;
}

export interface FoodState {
  score: number; // 0 to 50
  lastMonthlyReset: number; // timestamp
  lastMonthlyDishesReset?: number; // timestamp
  ritualCount: number; // 0 to 10
  wheel: FoodWheel;
  broccoliWheel: FoodWheel; // Added for any-order broccoli habits
  monthlyBonuses: Record<string, boolean[]>; // Changed from weeklyBonuses: FoodBonuses
  wheelPlenoCount: number; // Added
  broccoliPlenoCount: number; // Added
  dishes?: Record<string, boolean>; // Monthly meal checklist
  dailyScores?: Record<string, DailyFoodScore>; // YYYY-MM-DD -> DailyFoodScore
  pastWheels?: Record<string, FoodWheel>;
  pastBroccoli?: Record<string, number>;
  config?: FoodConfig;
  weeklyExtras?: Record<string, number>; // YYYY-MM-DD (Monday) -> Total Extra Points for that week
  monthlyHistory?: Record<string, { // YYYY-MM -> Month data
    wheelPlenoCount: number;
    broccoliPlenoCount: number;
    bonuses: Record<string, boolean[]>;
    dishes: Record<string, boolean>;
    wheel: FoodWheel;
    broccoliWheel: FoodWheel;
  }>;
  history: {
    action: string;
    timestamp: number;
    delta: number;
  }[];
}

export interface ExerciseDayStats {
  minutes: number;
  workouts: number;
}

export interface WorkoutBlock {
  id: string;
  workSecs: number;
  restSecs: number;
  rounds: number;
}

export interface ExerciseState {
  seriesCurrent: number; // 0 to 8 (resets on 9)
  daysTrained: number;   // Increments when series hits 9
  totalMinutes: number;  // Total minutes trained
  sprintCount: number;
  stretchCount: number;
  pushCount?: number;
  pullCount?: number;
  legsCount?: number;
  timerBlocks?: WorkoutBlock[];
  history?: Record<string, ExerciseDayStats>;
}

export interface Stats {
  perfectSetsWeeks: number;
  hunoPlenos: number;
  perfectTrainMonths: number;
  projectPlenos: number; // Completed project rounds
  hunoPlenoCurrent: number; // 0 to 50
  projectPlenoCurrent: number; // 0 to 20
  hunoReward: string;
  projectReward: string;
  setsHistory: number[]; // Array of completed counts for previous weeks
  trainsHistory: number[]; // Array of completed counts for previous months
  interactionsHistory: number[]; // Array of interaction counts for previous months
  foodHistory?: number[]; // Array of food scores for previous weeks
  lastTotalInteractions: number; // Snapshot of total interactions at the start of the current month
}

export interface ReminderEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  notifyYearly: boolean;
  notifyMonthly: boolean;
  notify100Days: boolean;
  hideAge?: boolean;
}

export interface PianoState {
  piezaDesafio: string;
  piezaConsolidacion: string;
  piezaLectura: string;
  henleLevel: number;
  checklist: {
    recuperacionActiva: boolean;
    lecturaPrimeraVista: boolean;
    tecnicaPrecision: boolean;
    construccionIntercalada: boolean;
    consolidacion: boolean;
    audicionCritica: boolean;
  };
  currentScaleIndex?: number;
  sesionesDesafio?: number;
  sesionesConsolidacion?: number;
  sesionesCompletadas?: number;
  timerState?: {
    isOpen: boolean;
    totalTimeInput: string;
    currentSectionIndex: number;
    timeLeftInSection: number;
    sections: {key: string; label: string; duration: number}[];
  };
  scaleExercises?: {
    octava: boolean;
    decima: boolean;
    sexta: boolean;
    tercera: boolean;
    arpegiosEnlazados: boolean;
    arpegiosExtendidos: boolean;
    acordes: boolean;
  };
  hanonExercise?: number;
}

export interface WeeklyGoal {
  text: string;
  completed: boolean;
}

export interface WeeklyGoalsState {
  leones: WeeklyGoal;
  forjas: WeeklyGoal;
  puerto: WeeklyGoal;
  lastReset: number;
}

export interface AppData {
  lastDate?: string; // YYYY-MM-DD to track daily resets
  lastSetsReset: number; // timestamp of last weekly reset
  lastTrainsReset: number; // timestamp of last monthly reset
  setsPlenoClaimed?: boolean; // Track if current week sets point was already claimed
  trainsPlenoClaimed?: boolean; // Track if current month trains point was already claimed
  stats: Stats;
  hunos: Task[];
  hunosHistory: Record<string, string[]>; // DateString -> Array of completed Task IDs
  trains: Task[];
  annualTrains: Task[]; // New annual tasks
  sets: WeeklyTask[];
  setsHistoryMap?: Record<string, string[]>;
  friends: Friend[];
  food: FoodState;
  forjas: ResourceTask[];
  leones: ResourceTask[];
  forjaTasks?: Task[];
  projects: Task[]; // Independent project list
  projectsHistoryMap?: Record<string, string[]>;
  trainsHistoryMap?: Record<string, string[]>;
  exercise: ExerciseState;
  billetesState?: boolean[]; // 20 booleans for the money grid
  huchaCount?: number; // Count of completed sets of 20 billetes
  leonesState?: boolean[]; // 20 booleans for the lions grid
  leonesCount?: number; // Count of completed sets of 20 lions
  reminders?: ReminderEvent[]; // Important dates to remember
  piano?: PianoState;
  weeklyGoals?: WeeklyGoalsState;
  reminderTime?: string; // HH:mm
  lastReminderDate?: string; // YYYY-MM-DD
  energy?: number; // 1 to 10
  energyHistory?: Record<string, number>; // DateString -> Energy value
  gympieza?: GympiezaState;
  yunqueLargas?: Task[];
  yunqueRapidas?: Task[];
  caminos?: Camino[];
  loveTreeSortBy?: 'interactions' | 'days';
  lastAnnualTrainReminderDate?: string; // YYYY-MM-DD — tracks when the user last dismissed the daily annual train reminder
  streakReviewedDays?: Record<string, boolean>; // DateString -> isReviewed
  firewallDay?: number; // 0, 1, 2, 3
  firewallLastCompletedDate?: string; // YYYY-MM-DD or toDateString()
  firewallChecked?: { ducha: boolean; calle: boolean; huno: boolean };
  sebastianInstructions?: string; // Custom instructions for the Gemini agent
}