const HIGH_SCORE_KEY = 'echo-runner-high-score';

export function readHighScore(): number {
  if (typeof window === 'undefined') {
    return 0;
  }

  const storedValue = window.localStorage.getItem(HIGH_SCORE_KEY);
  const parsedValue = Number.parseInt(storedValue ?? '', 10);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function writeHighScore(score: number): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(HIGH_SCORE_KEY, String(Math.max(0, Math.floor(score))));
}
