
export type ViewState = 'home' | 'trains' | 'sets' | 'love' | 'food' | 'stats' | 'forjas' | 'leones' | 'exercise';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  subtasks?: Task[];
  failedYesterday?: boolean;
  plenoCompleted?: boolean; // true if completed at least once in the current "pleno" cycle
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
}

export interface Book {
  id: string;
  title: string;
  currentPage: number;
  totalPages: number;
  completed: boolean;
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
}

export interface FoodWheel {
  lemon: boolean;
  nuts: boolean;
  dairy: boolean;
  coffee: boolean;
  spices: boolean;
  supplements: boolean;
}

export interface FoodBonuses {
  organs: boolean;
  legumes: boolean;
  fast24: boolean;
}

export interface FoodState {
  score: number; // 0 to 50
  lastWeeklyReset: number; // timestamp
  fridgeCount: number; // 0 to 20
  ritualCount: number; // 0 to 10
  wheel: FoodWheel;
  weeklyBonuses: FoodBonuses;
  history: {
    action: string;
    timestamp: number;
    delta: number;
  }[];
}

export interface ExerciseState {
  seriesCurrent: number; // 0 to 8 (resets on 9)
  daysTrained: number;   // Increments when series hits 9
  totalMinutes: number;  // Total minutes trained
  sprintCount: number;
  stretchCount: number;
}

export interface Stats {
  perfectSetsWeeks: number;
  hunoPlenos: number;
  perfectTrainMonths: number;
  projectPlenos: number; // Completed project rounds
  setsHistory: number[]; // Array of completed counts for previous weeks
  trainsHistory: number[]; // Array of completed counts for previous months
  interactionsHistory: number[]; // Array of interaction counts for previous months
  lastTotalInteractions: number; // Snapshot of total interactions at the start of the current month
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
  friends: Friend[];
  food: FoodState;
  forjas: ResourceTask[];
  leones: ResourceTask[];
  projects: Task[]; // Independent project list
  exercise: ExerciseState;
  billetesState?: boolean[]; // 20 booleans for the money grid
  huchaCount?: number; // Count of completed sets of 20 billetes
}
