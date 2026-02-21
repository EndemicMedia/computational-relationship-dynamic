import { writable, derived, get } from 'svelte/store';
import { formedResults, simulationState } from './simulation-store';

// Internal float position (for smooth rAF animation)
const _currentMonth = writable(0);

// Integer month used by all components for trajectory lookups
export const displayMonth = derived(_currentMonth, m => Math.floor(m));

export const isPlaying = writable(false);
export const playbackSpeed = writable(12); // months per second

export const maxSimMonth = derived(formedResults, ($r) =>
  $r.length === 0 ? 0 : Math.max(0, ...$r.map(r => r.trajectory.length - 1))
);

// Live stats at the current month — updated on every tick
export const monthSnapshot = derived(
  [formedResults, displayMonth],
  ([$results, $month]) => {
    let activeCount = 0;
    let dissolutionCount = 0;
    let totalBond = 0;
    let totalSat = 0;
    for (const r of $results) {
      const step = r.trajectory[$month];
      if (!step) continue;
      activeCount++;
      totalBond += step.B;
      totalSat += (step.S1 + step.S2) / 2;
      if (step.dissolved) dissolutionCount++;
    }
    return {
      activeCount,
      dissolutionCount,
      avgBond: activeCount > 0 ? totalBond / activeCount : 0,
      avgSat: activeCount > 0 ? totalSat / activeCount : 0,
    };
  }
);

let rafId: number | null = null;
let lastTs: number | null = null;

function tick(ts: number) {
  if (lastTs === null) lastTs = ts;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  const speed = get(playbackSpeed);
  const max = get(maxSimMonth);
  let done = false;

  _currentMonth.update(m => {
    const next = m + dt * speed;
    if (next >= max) { done = true; return max; }
    return next;
  });

  if (done) {
    isPlaying.set(false);
    lastTs = null;
    rafId = null;
  } else {
    rafId = requestAnimationFrame(tick);
  }
}

export function play() {
  if (get(isPlaying)) return;
  // If at or past end, restart from month 0
  if (Math.floor(get(_currentMonth)) >= get(maxSimMonth)) {
    _currentMonth.set(0);
  }
  isPlaying.set(true);
  lastTs = null;
  rafId = requestAnimationFrame(tick);
}

export function pause() {
  isPlaying.set(false);
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  lastTs = null;
}

export function seek(month: number) {
  _currentMonth.set(month);
}

export function stepForward() {
  _currentMonth.update(m => Math.min(Math.floor(m) + 1, get(maxSimMonth)));
}

export function stepBack() {
  _currentMonth.update(m => Math.max(Math.floor(m) - 1, 0));
}

export function resetTimeline() {
  pause();
  _currentMonth.set(0);
}

// Auto-reset when a new simulation starts
simulationState.subscribe(state => {
  if (state === 'running') resetTimeline();
});
