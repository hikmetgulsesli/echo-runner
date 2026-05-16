import { ControlsHelp, GameBoard, GameOver, MainMenu, PauseOverlay } from './screens';
import { AppProvider, useAppContext } from './contexts/AppContext';
import './App.css';

const laneLabels = ['Left', 'Center', 'Right'];

function RunnerOverlay() {
  const app = useAppContext();
  const secondsLeft = Math.ceil(app.remainingMs / 1000);

  return (
    <section className="runner-panel" aria-label="Echo Runner live game state">
      <div className="runner-hud" aria-live="polite">
        <span>Score {app.score}</span>
        <span>Time {secondsLeft}s</span>
        <span>Best {app.highScore}</span>
        <span>{app.lastMessage}</span>
      </div>

      <div className="runner-track" role="application" aria-label="Lane runner board">
        {[0, 1, 2].map((lane) => (
          <button
            className="runner-lane"
            key={lane}
            type="button"
            onClick={() => app.actions.moveToLane(lane as 0 | 1 | 2)}
            aria-label={`Move to ${laneLabels[lane]} lane`}
          >
            <span className="runner-lane-label">{laneLabels[lane]}</span>
            {app.obstacles
              .filter((obstacle) => obstacle.lane === lane)
              .map((obstacle) => (
                <span
                  className="runner-obstacle"
                  key={obstacle.id}
                  style={{ top: `${obstacle.y}%` }}
                  aria-hidden="true"
                />
              ))}
            {app.playerLane === lane && <span className="runner-player" aria-label="Echo runner" />}
          </button>
        ))}
      </div>
    </section>
  );
}

function ScreenRouter() {
  const app = useAppContext();

  if (app.screen === 'playing') {
    return (
      <>
        <GameBoard actions={{ 'pause-1': app.actions.pause, 'restart-2': app.actions.restart }} />
        <RunnerOverlay />
      </>
    );
  }

  if (app.screen === 'paused') {
    return (
      <>
        <PauseOverlay actions={{ 'restart-1': app.actions.restart, 'main-menu-2': app.actions.mainMenu }} />
        <RunnerOverlay />
      </>
    );
  }

  if (app.screen === 'gameOver') {
    return (
      <>
        <GameOver actions={{ 'restart-1': app.actions.restart, 'main-menu-2': app.actions.mainMenu }} />
        <RunnerOverlay />
      </>
    );
  }

  if (app.screen === 'help') {
    return (
      <ControlsHelp
        actions={{
          'start-game-1': app.actions.startGame,
          'resume-2': app.actions.resume,
          'open-settings-3': app.actions.openControls,
        }}
      />
    );
  }

  return (
    <MainMenu
      actions={{
        'start-game-1': app.actions.startGame,
        'resume-2': app.actions.resume,
        'open-settings-3': app.actions.openControls,
      }}
    />
  );
}

export default function App() {
  return (
    <AppProvider>
      <div data-setfarm-root="echo-runner" className="app-shell">
        <ScreenRouter />
      </div>
    </AppProvider>
  );
}
