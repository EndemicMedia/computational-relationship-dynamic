<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import { summary, formedResults } from '../lib/simulation-store';
  import type { SimulationSummary, SimulationResult } from '../lib/types';

  let donutEl: SVGSVGElement;
  let barEl: SVGSVGElement;
  let unsubSummary: () => void;
  let unsubResults: () => void;

  function drawDonut(s: SimulationSummary | null) {
    if (!donutEl || !s) return;
    const svg = d3.select(donutEl);
    svg.selectAll('*').remove();

    const size = 180;
    const r = size / 2 - 10;
    const innerR = r * 0.55;

    const g = svg.attr('viewBox', `0 0 ${size} ${size}`)
      .append('g').attr('transform', `translate(${size / 2},${size / 2})`);

    const neverFormed = s.totalPairs - s.formedRelationships;
    const dissolved = s.formedRelationships - s.stableRelationships;
    const stable = s.stableRelationships;

    const data = [
      { label: 'Never Formed', value: neverFormed, color: '#374151' },
      { label: 'Dissolved', value: dissolved, color: '#ef4444' },
      { label: 'Stable', value: stable, color: '#10b981' },
    ].filter(d => d.value > 0);

    const pie = d3.pie<typeof data[0]>().value(d => d.value).sort(null);
    const arc = d3.arc<d3.PieArcDatum<typeof data[0]>>().innerRadius(innerR).outerRadius(r);

    g.selectAll('path')
      .data(pie(data))
      .join('path')
        .attr('d', arc)
        .attr('fill', d => d.data.color)
        .attr('stroke', '#0a0e1a')
        .attr('stroke-width', 2);

    // Center text
    const total = s.totalPairs;
    g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.3em')
      .attr('fill', '#f9fafb').attr('font-size', '14px').attr('font-weight', '700')
      .text(total.toLocaleString());
    g.append('text').attr('text-anchor', 'middle').attr('dy', '1em')
      .attr('fill', '#9ca3af').attr('font-size', '9px').text('Total Pairs');
  }

  function drawDissolveReasons(results: SimulationResult[]) {
    if (!barEl) return;
    const svg = d3.select(barEl);
    svg.selectAll('*').remove();

    const dissolved = results.filter(r => r.outcome === 'dissolved' && r.dissolutionReason);
    if (dissolved.length === 0) {
      svg.attr('viewBox', '0 0 300 80')
        .append('text').attr('x', 150).attr('y', 40)
        .attr('text-anchor', 'middle').attr('fill', '#9ca3af').attr('font-size', '12px')
        .text('No dissolved pairs yet');
      return;
    }

    const counts: Record<string, number> = {};
    for (const r of dissolved) {
      const reason = r.dissolutionReason ?? 'unknown';
      counts[reason] = (counts[reason] ?? 0) + 1;
    }

    const data = Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const M = { top: 12, right: 16, bottom: 8, left: 100 };
    const W = 300, H = Math.max(80, data.length * 30 + M.top + M.bottom);
    const innerW = W - M.left - M.right;
    const innerH = H - M.top - M.bottom;

    const g = svg.attr('viewBox', `0 0 ${W} ${H}`)
      .append('g').attr('transform', `translate(${M.left},${M.top})`);

    const xScale = d3.scaleLinear().domain([0, d3.max(data, d => d.value) ?? 1]).range([0, innerW]);
    const yScale = d3.scaleBand().domain(data.map(d => d.label)).range([0, innerH]).padding(0.3);

    const labelMap: Record<string, string> = {
      low_bond: 'Low Bond',
      low_satisfaction: 'Low Satisfaction',
      stress: 'External Stress',
      incompatibility: 'Incompatibility',
    };

    const colorMap: Record<string, string> = {
      low_bond: '#6366f1',
      low_satisfaction: '#f59e0b',
      stress: '#ef4444',
      incompatibility: '#8b5cf6',
    };

    g.selectAll('rect')
      .data(data)
      .join('rect')
        .attr('x', 0)
        .attr('y', d => yScale(d.label) ?? 0)
        .attr('width', d => xScale(d.value))
        .attr('height', yScale.bandwidth())
        .attr('fill', d => colorMap[d.label] ?? '#6366f1')
        .attr('rx', 3);

    g.selectAll('.val-label')
      .data(data)
      .join('text')
        .attr('class', 'val-label')
        .attr('x', d => xScale(d.value) + 4)
        .attr('y', d => (yScale(d.label) ?? 0) + yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('fill', '#9ca3af').attr('font-size', '10px')
        .text(d => d.value);

    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => labelMap[d] ?? d))
      .call(gEl => gEl.select('.domain').remove())
      .call(gEl => gEl.selectAll('text').attr('fill', '#9ca3af').attr('font-size', '10px'));
  }

  onMount(() => {
    unsubSummary = summary.subscribe(s => drawDonut(s));
    unsubResults = formedResults.subscribe(r => drawDissolveReasons(r));
  });

  onDestroy(() => {
    unsubSummary?.();
    unsubResults?.();
  });
</script>

<div class="outcome-wrap card">
  <h4>Outcome Summary</h4>
  <div class="charts-row">
    <div class="donut-section">
      <svg bind:this={donutEl} style="width:180px;height:180px;" />
      <div class="donut-legend">
        <div class="legend-item"><span class="dot" style="background:#374151"></span>Never Formed</div>
        <div class="legend-item"><span class="dot" style="background:#ef4444"></span>Dissolved</div>
        <div class="legend-item"><span class="dot" style="background:#10b981"></span>Stable</div>
      </div>
    </div>
    <div class="bars-section">
      <p class="section-label">Dissolution Reasons</p>
      <svg bind:this={barEl} style="width:100%;height:auto;" />
    </div>
  </div>
</div>

<style>
  .outcome-wrap { padding: 1rem 1.25rem; }
  .outcome-wrap h4 { font-size: 0.95rem; margin: 0 0 0.75rem; }

  .charts-row {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .donut-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .donut-legend {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .bars-section {
    flex: 1;
    min-width: 200px;
  }

  .section-label {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-bottom: 0.4rem;
  }
</style>
