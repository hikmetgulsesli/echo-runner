import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Lane, Obstacle, RunnerActions, RunnerSnapshot, RuntimeAppBridge } from '../types/domain';
import { readHighScore, writeHighScore } from '../utils/storage';

const GAME_DURATION_MS = 60_000;
const TICK_MS = 120;
const OBSTACLE_STEP = 9;
const COLLISION_Y = 84;
const STARTING_OBSTACLES: Obstacle[] = [
  { id: 1, lane: 0, y: 18 },
  { id: 2, lane: 2, y: 52 },
  { id: 3, lane: 1, y: 86 },
];

interface RunnerState extends RunnerSnapshot {
  nextObstacleId: number;
}

function clampLane(lane: number): Lane {
  return Math.max(0, Math.min(2, lane)) as Lane;
}

function createObstacles(seedId: number, score: number): { obstacles: Obstacle[]; nextObstacleId: number } {
  const lane = ((seedId + score) % 3) as Lane;
  return {
    obstacles: [{ id: seedId, lane, y: -12 }],
    nextObstacleId: seedId + 1,
  };
}

function createInitialState(highScore = readHighScore()): RunnerState {
  return {
    screen: 'menu',
    status: 'idle',
    playerLane: 1,
    score: 0,
    elapsedMs: 0,
    remainingMs: GAME_DURATION_MS,
    highScore,
    obstacles: STARTING_OBSTACLES,
    lastMessage: 'Ready',
    nextObstacleId: 4,
  };
}

function resetForRun(previous: RunnerState): RunnerState {
  return {
    ...createInitialState(previous.highScore),
    screen: 'playing',
    status: 'running',
    lastMessage: 'Run started',
  };
}

function finishRun(state: RunnerState, message: string): RunnerState {
  const highScore = Math.max(state.highScore, state.score);
  writeHighScore(highScore);
  return {
    ...state,
    screen: 'gameOver',
    status: 'ended',
    highScore,
    remainingMs: Math.max(0, GAME_DURATION_MS - state.elapsedMs),
    lastMessage: message,
  };
}

export function useAppState(): RuntimeAppBridge {
  const [state, setState] = useState<RunnerState>(() => createInitialState());
  const touchStartX = useRef<number | null>(null);

  const moveToLane = useCallback((lane: Lane) => {
    setState((current) => ({ ...current, playerLane: clampLane(lane) }));
  }, []);

  const moveLeft = useCallback(() => {
    setState((current) => ({ ...current, playerLane: clampLane(current.playerLane - 1) }));
  }, []);

  const moveRight = useCallback(() => {
    setState((current) => ({ ...current, playerLane: clampLane(current.playerLane + 1) }));
  }, []);

  const actions: RunnerActions = useMemo(
    () => ({
      startGame: () => setState((current) => resetForRun(current)),
      resume: () =>
        setState((current) => ({
          ...current,
          screen: 'playing',
          status: current.status === 'ended' ? 'ended' : 'running',
          lastMessage: 'Running',
        })),
      pause: () =>
        setState((current) =>
          current.status === 'running'
            ? { ...current, screen: 'paused', status: 'paused', lastMessage: 'Paused' }
            : current,
        ),
      restart: () => setState((current) => resetForRun(current)),
      mainMenu: () =>
        setState((current) => ({
          ...createInitialState(current.highScore),
          screen: 'menu',
          lastMessage: current.score > 0 ? 'Run saved' : 'Ready',
        })),
      openControls: () => setState((current) => ({ ...current, screen: 'help', lastMessage: 'Controls' })),
      moveLeft,
      moveRight,
      moveToLane,
    }),
    [moveLeft, moveRight, moveToLane],
  );

  useEffect(() => {
    if (state.status !== 'running') {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setState((current) => {
        if (current.status !== 'running') {
          return current;
        }

        const elapsedMs = current.elapsedMs + TICK_MS;
        const score = current.score + 1;
        const movedObstacles = current.obstacles.map((obstacle) => ({ ...obstacle, y: obstacle.y + OBSTACLE_STEP }));
        const hitObstacle = movedObstacles.some(
          (obstacle) => obstacle.lane === current.playerLane && obstacle.y >= COLLISION_Y && obstacle.y <= 100,
        );

        if (hitObstacle) {
          return finishRun({ ...current, elapsedMs, score, obstacles: movedObstacles }, 'Echo clipped an obstacle');
        }

        if (elapsedMs >= GAME_DURATION_MS) {
          return finishRun({ ...current, elapsedMs, score, obstacles: movedObstacles }, 'Course cleared');
        }

        const visibleObstacles = movedObstacles.filter((obstacle) => obstacle.y <= 112);
        const shouldSpawn = visibleObstacles.length < STARTING_OBSTACLES.length;
        const spawned = shouldSpawn ? createObstacles(current.nextObstacleId, score) : null;

        return {
          ...current,
          elapsedMs,
          remainingMs: GAME_DURATION_MS - elapsedMs,
          score,
          obstacles: spawned ? [...visibleObstacles, ...spawned.obstacles] : visibleObstacles,
          nextObstacleId: spawned ? spawned.nextObstacleId : current.nextObstacleId,
          lastMessage: 'Running',
        };
      });
    }, TICK_MS);

    return () => window.clearInterval(intervalId);
  }, [state.status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        event.preventDefault();
        actions.moveLeft();
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        event.preventDefault();
        actions.moveRight();
      }
      if (event.key === ' ' || event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setState((current) =>
          current.status === 'running'
            ? { ...current, screen: 'paused', status: 'paused', lastMessage: 'Paused' }
            : current.status === 'paused'
              ? { ...current, screen: 'playing', status: 'running', lastMessage: 'Running' }
              : current,
        );
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      touchStartX.current = event.touches[0]?.clientX ?? null;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (touchStartX.current === null) {
        return;
      }
      const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
      const deltaX = endX - touchStartX.current;
      touchStartX.current = null;

      if (Math.abs(deltaX) < 24) {
        return;
      }
      if (deltaX < 0) {
        actions.moveLeft();
      } else {
        actions.moveRight();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [actions]);

  const bridge = useMemo<RuntimeAppBridge>(
    () => ({
      screen: state.screen,
      status: state.status,
      playerLane: state.playerLane,
      score: state.score,
      elapsedMs: state.elapsedMs,
      remainingMs: state.remainingMs,
      highScore: state.highScore,
      obstacles: state.obstacles,
      lastMessage: state.lastMessage,
      actions,
    }),
    [actions, state],
  );

  useEffect(() => {
    window.app = bridge;
    globalThis.app = bridge;
    return () => {
      if (window.app === bridge) {
        window.app = undefined;
      }
      if (globalThis.app === bridge) {
        globalThis.app = undefined;
      }
    };
  }, [bridge]);

  return bridge;
}
