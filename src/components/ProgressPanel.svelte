<script lang="ts">
  import { simulationState, currentProgress, progressPercent, summary, errorMessage } from '../lib/simulation-store';
</script>

<div class="progress-panel card">
  <div class="status-row">
    <span class="status-label">Status:</span>
    <span class="badge status-{$simulationState}">
      {$simulationState.toUpperCase()}
    </span>
  </div>

  {#if $simulationState === 'running' || $simulationState === 'paused'}
    <div class="progress-info">
      <span>{$currentProgress.completed} / {$currentProgress.total} pairs</span>
      <span>{$progressPercent}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-bar-fill" style="width: {$progressPercent}%"></div>
    </div>
  {/if}

  {#if $simulationState === 'error'}
    <p class="error-msg">Error: {$errorMessage}</p>
  {/if}

  {#if $summary}
    <div class="summary-grid">
      <div class="stat-card">
        <span class="stat-value">{$summary.totalPairs.toLocaleString()}</span>
        <span class="stat-label">Total Pairs</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{$summary.formedRelationships.toLocaleString()}</span>
        <span class="stat-label">Formed</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{$summary.stableRelationships.toLocaleString()}</span>
        <span class="stat-label">Stable</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{Math.round($summary.avgDuration)}mo</span>
        <span class="stat-label">Avg Duration</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{($summary.avgFinalBond * 100).toFixed(1)}%</span>
        <span class="stat-label">Avg Bond</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{($summary.avgSatisfaction * 100).toFixed(1)}%</span>
        <span class="stat-label">Avg Satisfaction</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .progress-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .status-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .status-label {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .badge {
    padding: 0.2rem 0.6rem;
    border-radius: 99px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
  }

  .status-idle { background: var(--color-surface-2); color: var(--color-text-muted); }
  .status-running { background: rgba(99, 102, 241, 0.2); color: var(--color-accent); animation: pulse 2s infinite; }
  .status-paused { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
  .status-complete { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }
  .status-error { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .error-msg {
    color: var(--color-danger);
    font-size: 0.875rem;
    margin: 0;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);
  }

  @media (max-width: 480px) {
    .summary-grid { grid-template-columns: repeat(2, 1fr); }
  }

  .stat-card {
    background: var(--color-surface-2);
    border-radius: var(--radius);
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    text-align: center;
  }

  .stat-value {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--color-accent);
  }

  .stat-label {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
