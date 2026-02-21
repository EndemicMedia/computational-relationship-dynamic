<script lang="ts">
  import {
    displayMonth, isPlaying, playbackSpeed, maxSimMonth, monthSnapshot,
    play, pause, seek, stepForward, stepBack,
  } from '../lib/timeline-store';
  import { simulationState } from '../lib/simulation-store';

  const SPEEDS = [
    { value: 3,   label: '3mo/s'  },
    { value: 12,  label: '1yr/s'  },
    { value: 36,  label: '3yr/s'  },
    { value: 120, label: '10yr/s' },
  ];
</script>

{#if $simulationState === 'complete' && $maxSimMonth > 0}
<div class="timeline-panel card">
  <div class="tl-header">
    <h4>Timeline Playback</h4>
    <span class="month-badge">
      Month <strong>{$displayMonth}</strong> / {$maxSimMonth}
    </span>
  </div>

  <div class="tl-stats">
    <div class="tl-stat">
      <span class="tl-val">{$monthSnapshot.activeCount}</span>
      <span class="tl-lbl">Active pairs</span>
    </div>
    <div class="tl-stat dissolved">
      <span class="tl-val">{$monthSnapshot.dissolutionCount}</span>
      <span class="tl-lbl">Dissolved ↓</span>
    </div>
    <div class="tl-stat">
      <span class="tl-val">{($monthSnapshot.avgBond * 100).toFixed(0)}%</span>
      <span class="tl-lbl">Avg bond</span>
    </div>
    <div class="tl-stat">
      <span class="tl-val">{($monthSnapshot.avgSat * 100).toFixed(0)}%</span>
      <span class="tl-lbl">Avg sat</span>
    </div>
  </div>

  <input
    class="scrubber"
    type="range"
    min="0"
    max={$maxSimMonth}
    step="1"
    value={$displayMonth}
    on:input={e => seek(+e.currentTarget.value)}
  />

  <div class="tl-controls">
    <div class="playback">
      <button class="icon-btn" on:click={stepBack} title="−1 month">⏮</button>
      {#if $isPlaying}
        <button class="icon-btn primary" on:click={pause} title="Pause">⏸</button>
      {:else}
        <button class="icon-btn primary" on:click={play}
          title={$displayMonth >= $maxSimMonth ? 'Replay from start' : 'Play'}>
          {$displayMonth >= $maxSimMonth ? '↺' : '▶'}
        </button>
      {/if}
      <button class="icon-btn" on:click={stepForward} title="+1 month">⏭</button>
    </div>
    <div class="speeds">
      {#each SPEEDS as s}
        <button
          class="speed-btn"
          class:active={$playbackSpeed === s.value}
          on:click={() => playbackSpeed.set(s.value)}
        >{s.label}</button>
      {/each}
    </div>
  </div>
</div>
{/if}

<style>
  .timeline-panel {
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .tl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .tl-header h4 {
    font-size: 0.95rem;
    margin: 0;
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .month-badge {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .month-badge strong { color: var(--color-text); }

  .tl-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.4rem;
  }

  .tl-stat {
    background: var(--color-surface-2);
    border-radius: var(--radius);
    padding: 0.45rem 0.3rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .tl-val {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
    font-family: var(--font-mono);
  }

  .tl-lbl {
    font-size: 0.6rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .tl-stat.dissolved .tl-val { color: #f87171; }

  .scrubber {
    width: 100%;
    cursor: pointer;
    accent-color: var(--color-accent);
  }

  .tl-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .playback { display: flex; gap: 0.4rem; align-items: center; }

  .icon-btn {
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    border-radius: var(--radius);
    padding: 0.35rem 0.55rem;
    cursor: pointer;
    font-size: 0.85rem;
    line-height: 1;
    transition: background 0.15s;
  }

  .icon-btn:hover { background: var(--color-border); }

  .icon-btn.primary {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: white;
    padding: 0.35rem 1rem;
  }

  .icon-btn.primary:hover { opacity: 0.85; }

  .speeds { display: flex; gap: 0.3rem; }

  .speed-btn {
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    border-radius: var(--radius);
    padding: 0.2rem 0.45rem;
    cursor: pointer;
    font-size: 0.68rem;
    font-family: var(--font-mono);
    transition: all 0.15s;
  }

  .speed-btn:hover {
    border-color: var(--color-accent);
    color: var(--color-text);
  }

  .speed-btn.active {
    background: rgba(99, 102, 241, 0.18);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
</style>
