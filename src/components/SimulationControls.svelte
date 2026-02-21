<script lang="ts">
  import { simulationParams, simulationState, startSimulation, pauseSimulation, resumeSimulation, cancelSimulation, resetSimulation } from '../lib/simulation-store';
  import type { SimulationParams } from '../lib/types';

  let params = { ...$simulationParams };

  // Two-way sync
  simulationParams.subscribe(v => { params = { ...v }; });

  function updateParam<K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) {
    params = { ...params, [key]: value };
    simulationParams.set(params);
  }

  function handleStart() {
    startSimulation(params);
  }
</script>

<div class="controls-panel card">
  <h3>Simulation Parameters</h3>

  <div class="param-grid">
    <!-- Population -->
    <div class="param-group">
      <label>Population Size: <strong>{params.populationSize}</strong></label>
      <input type="range" min="50" max="2000" step="50"
        value={params.populationSize}
        on:input={e => updateParam('populationSize', +e.currentTarget.value)} />
    </div>

    <!-- Collisions -->
    <div class="param-group">
      <label>Pair Simulations: <strong>{params.numCollisions}</strong></label>
      <input type="range" min="50" max="5000" step="50"
        value={params.numCollisions}
        on:input={e => updateParam('numCollisions', +e.currentTarget.value)} />
    </div>

    <!-- Max duration -->
    <div class="param-group">
      <label>Max Duration (months): <strong>{params.maxDuration}</strong></label>
      <input type="range" min="12" max="600" step="12"
        value={params.maxDuration}
        on:input={e => updateParam('maxDuration', +e.currentTarget.value)} />
    </div>

    <!-- Stress level -->
    <div class="param-group">
      <label>External Stress Level: <strong>{params.stressLevel.toFixed(2)}</strong></label>
      <input type="range" min="0" max="1" step="0.05"
        value={params.stressLevel}
        on:input={e => updateParam('stressLevel', +e.currentTarget.value)} />
    </div>

    <!-- Alpha -->
    <div class="param-group">
      <label>α (Positive Interaction Weight): <strong>{params.alpha.toFixed(3)}</strong></label>
      <input type="range" min="0.01" max="0.5" step="0.01"
        value={params.alpha}
        on:input={e => updateParam('alpha', +e.currentTarget.value)} />
    </div>

    <!-- Beta -->
    <div class="param-group">
      <label>β (Negative Interaction Weight): <strong>{params.beta.toFixed(3)}</strong></label>
      <input type="range" min="0.01" max="0.5" step="0.01"
        value={params.beta}
        on:input={e => updateParam('beta', +e.currentTarget.value)} />
    </div>

    <!-- Gamma -->
    <div class="param-group">
      <label>γ (Bond Decay Rate): <strong>{params.gamma.toFixed(3)}</strong></label>
      <input type="range" min="0.001" max="0.1" step="0.001"
        value={params.gamma}
        on:input={e => updateParam('gamma', +e.currentTarget.value)} />
    </div>

    <!-- Initial attraction threshold -->
    <div class="param-group">
      <label>Attraction Threshold: <strong>{params.initialAttractionThreshold.toFixed(2)}</strong></label>
      <input type="range" min="0.1" max="0.7" step="0.05"
        value={params.initialAttractionThreshold}
        on:input={e => updateParam('initialAttractionThreshold', +e.currentTarget.value)} />
    </div>

    <!-- Pairing strategy -->
    <div class="param-group">
      <label>Pairing Strategy</label>
      <select value={params.pairingStrategy}
        on:change={e => updateParam('pairingStrategy', e.currentTarget.value as SimulationParams['pairingStrategy'])}>
        <option value="random">Random Collision</option>
        <option value="similarity">Similarity-Based</option>
        <option value="preference">Preference-Based</option>
      </select>
    </div>
  </div>

  <div class="control-actions">
    {#if $simulationState === 'idle' || $simulationState === 'complete' || $simulationState === 'error'}
      <button class="btn btn-primary" on:click={handleStart}>
        ▶ Run Simulation
      </button>
    {:else if $simulationState === 'running'}
      <button class="btn btn-outline" on:click={pauseSimulation}>⏸ Pause</button>
      <button class="btn btn-danger" on:click={cancelSimulation}>✕ Cancel</button>
    {:else if $simulationState === 'paused'}
      <button class="btn btn-primary" on:click={resumeSimulation}>▶ Resume</button>
      <button class="btn btn-danger" on:click={cancelSimulation}>✕ Cancel</button>
    {/if}

    {#if $simulationState !== 'idle'}
      <button class="btn btn-outline" on:click={resetSimulation}>↺ Reset</button>
    {/if}
  </div>

  <div class="equation-box">
    <p class="eq-label">Active equations:</p>
    <code>dB/dt = {params.alpha.toFixed(2)}·P(T₁,T₂) − {params.beta.toFixed(2)}·N(T₁,T₂) − {params.gamma.toFixed(3)}·B</code>
    <code>P(dissolve|t) = f(B, S̄, σ={params.stressLevel.toFixed(2)})</code>
  </div>
</div>

<style>
  .controls-panel {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .controls-panel h3 {
    color: var(--color-accent);
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 0;
  }

  .param-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem 1.5rem;
  }

  @media (max-width: 600px) {
    .param-grid { grid-template-columns: 1fr; }
  }

  .param-group {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .param-group label {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .param-group label strong {
    color: var(--color-text);
  }

  .control-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);
  }

  .equation-box {
    background: var(--color-surface-2);
    border-radius: var(--radius);
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .eq-label {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin: 0;
  }

  .equation-box code {
    font-size: 0.8rem;
    background: none;
    padding: 0;
    color: #a5b4fc;
  }
</style>
