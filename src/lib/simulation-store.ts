import { writable, derived } from 'svelte/store';
import type { SimulationParams, SimulationResult, SimulationSummary } from './types';
import { DEFAULT_PARAMS } from './types';

export type SimulationState = 'idle' | 'running' | 'paused' | 'complete' | 'error';

// Core state stores
export const simulationParams = writable<SimulationParams>({ ...DEFAULT_PARAMS });
export const simulationState = writable<SimulationState>('idle');
export const currentProgress = writable<{ completed: number; total: number }>({ completed: 0, total: 0 });
export const results = writable<SimulationResult[]>([]);
export const summary = writable<SimulationSummary | null>(null);
export const errorMessage = writable<string>('');

// Derived stores
export const progressPercent = derived(currentProgress, ($p) =>
  $p.total > 0 ? Math.round(($p.completed / $p.total) * 100) : 0
);

export const formedResults = derived(results, ($r) => $r.filter(r => r.formed));

export const stableResults = derived(formedResults, ($r) => $r.filter(r => r.outcome === 'stable'));

// Worker management
let worker: Worker | null = null;

export function startSimulation(params: SimulationParams) {
  if (worker) {
    worker.terminate();
  }

  results.set([]);
  summary.set(null);
  currentProgress.set({ completed: 0, total: params.numCollisions });
  simulationState.set('running');
  errorMessage.set('');

  worker = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), {
    type: 'module',
  });

  worker.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg.type === 'progress') {
      currentProgress.set({ completed: msg.completed, total: msg.total });
      if (msg.result) {
        results.update(r => [...r, msg.result]);
      }
    } else if (msg.type === 'complete') {
      summary.set(msg.summary);
      simulationState.set('complete');
      worker?.terminate();
      worker = null;
    } else if (msg.type === 'error') {
      errorMessage.set(msg.message);
      simulationState.set('error');
      worker?.terminate();
      worker = null;
    }
  });

  worker.postMessage({ type: 'start', params });
}

export function pauseSimulation() {
  worker?.postMessage({ type: 'pause' });
  simulationState.set('paused');
}

export function resumeSimulation() {
  worker?.postMessage({ type: 'resume' });
  simulationState.set('running');
}

export function cancelSimulation() {
  worker?.postMessage({ type: 'cancel' });
  worker?.terminate();
  worker = null;
  simulationState.set('idle');
}

export function resetSimulation() {
  cancelSimulation();
  results.set([]);
  summary.set(null);
  currentProgress.set({ completed: 0, total: 0 });
  errorMessage.set('');
}
