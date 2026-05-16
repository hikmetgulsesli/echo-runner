export type AppScreen = 'menu' | 'help' | 'playing' | 'paused' | 'gameOver';

export type RunnerStatus = 'idle' | 'running' | 'paused' | 'ended';

export type Lane = 0 | 1 | 2;

export interface Obstacle {
  id: number;
  lane: Lane;
  y: number;
}

export interface RunnerSnapshot {
  screen: AppScreen;
  status: RunnerStatus;
  playerLane: Lane;
  score: number;
  elapsedMs: number;
  remainingMs: number;
  highScore: number;
  obstacles: Obstacle[];
  lastMessage: string;
}

export interface RunnerActions {
  startGame: () => void;
  resume: () => void;
  pause: () => void;
  restart: () => void;
  mainMenu: () => void;
  openControls: () => void;
  moveLeft: () => void;
  moveRight: () => void;
  moveToLane: (lane: Lane) => void;
}

export interface RuntimeAppBridge extends RunnerSnapshot {
  actions: RunnerActions;
}

declare global {
  interface Window {
    app?: RuntimeAppBridge;
  }

  // eslint-disable-next-line no-var
  var app: RuntimeAppBridge | undefined;
}
