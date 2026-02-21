<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import { formedResults } from '../lib/simulation-store';
  import type { SimulationResult, TimeStep } from '../lib/types';

  let svgEl: SVGSVGElement;
  let unsubscribe: () => void;

  const MARGIN = { top: 20, right: 20, bottom: 40, left: 50 };
  const W = 560, H = 280;
  const innerW = W - MARGIN.left - MARGIN.right;
  const innerH = H - MARGIN.top - MARGIN.bottom;

  // Show at most N trajectories to avoid overdrawing
  const MAX_TRAJECTORIES = 80;

  function draw(results: SimulationResult[]) {
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const g = svg
      .attr('viewBox', `0 0 ${W} ${H}`)
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    if (results.length === 0) {
      g.append('text')
        .attr('x', innerW / 2).attr('y', innerH / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '14px')
        .text('Run the simulation to see trajectories');
      return;
    }

    const sample = results.slice(-MAX_TRAJECTORIES);
    const maxT = d3.max(sample, r => r.trajectory.length) ?? 120;

    const xScale = d3.scaleLinear().domain([0, maxT]).range([0, innerW]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([innerH, 0]);
    const colorScale = d3.scaleSequential(d3.interpolateCool).domain([0, MAX_TRAJECTORIES]);

    // Grid lines
    g.append('g').attr('class', 'grid')
      .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW).tickFormat(() => ''))
      .call(gEl => gEl.select('.domain').remove())
      .call(gEl => gEl.selectAll('line').attr('stroke', '#374151').attr('stroke-dasharray', '3,3'));

    // Bond strength trajectories
    const line = d3.line<TimeStep>()
      .x(d => xScale(d.t))
      .y(d => yScale(d.B))
      .curve(d3.curveBasis);

    sample.forEach((result, i) => {
      if (result.trajectory.length === 0) return;
      g.append('path')
        .datum(result.trajectory)
        .attr('fill', 'none')
        .attr('stroke', colorScale(i))
        .attr('stroke-width', 1.2)
        .attr('opacity', 0.45)
        .attr('d', line);
    });

    // Average bond trajectory
    const maxLen = d3.max(sample, r => r.trajectory.length) ?? 0;
    const avgPoints: TimeStep[] = [];
    for (let t = 0; t < maxLen; t++) {
      const atT = sample
        .map(r => r.trajectory[t])
        .filter(Boolean);
      if (atT.length < 2) continue;
      avgPoints.push({
        t,
        B: d3.mean(atT, d => d.B) ?? 0,
        S1: d3.mean(atT, d => d.S1) ?? 0,
        S2: d3.mean(atT, d => d.S2) ?? 0,
        dissolved: false,
      });
    }

    if (avgPoints.length > 1) {
      g.append('path')
        .datum(avgPoints)
        .attr('fill', 'none')
        .attr('stroke', '#818cf8')
        .attr('stroke-width', 2.5)
        .attr('opacity', 1)
        .attr('d', line);
    }

    // Axes
    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => `${d}mo`))
      .call(gEl => gEl.select('.domain').attr('stroke', '#374151'))
      .call(gEl => gEl.selectAll('text').attr('fill', '#9ca3af').attr('font-size', '11px'));

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${Math.round(+d * 100)}%`))
      .call(gEl => gEl.select('.domain').attr('stroke', '#374151'))
      .call(gEl => gEl.selectAll('text').attr('fill', '#9ca3af').attr('font-size', '11px'));

    // Labels
    g.append('text')
      .attr('x', -innerH / 2).attr('y', -36)
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
      .attr('fill', '#9ca3af').attr('font-size', '11px')
      .text('Bond Strength B(t)');

    g.append('text')
      .attr('x', innerW / 2).attr('y', innerH + 35)
      .attr('text-anchor', 'middle')
      .attr('fill', '#9ca3af').attr('font-size', '11px')
      .text('Time (months)');

    // Legend
    const legend = g.append('g').attr('transform', `translate(${innerW - 120}, 4)`);
    legend.append('line').attr('x1', 0).attr('x2', 24).attr('y1', 8).attr('y2', 8)
      .attr('stroke', '#818cf8').attr('stroke-width', 2.5);
    legend.append('text').attr('x', 28).attr('y', 12)
      .attr('fill', '#9ca3af').attr('font-size', '10px').text('Mean trajectory');
    legend.append('line').attr('x1', 0).attr('x2', 24).attr('y1', 24).attr('y2', 24)
      .attr('stroke', '#60a5fa').attr('stroke-width', 1.2).attr('opacity', 0.6);
    legend.append('text').attr('x', 28).attr('y', 28)
      .attr('fill', '#9ca3af').attr('font-size', '10px').text('Individual pairs');
  }

  onMount(() => {
    draw([]);
    unsubscribe = formedResults.subscribe(draw);
  });

  onDestroy(() => unsubscribe?.());
</script>

<div class="chart-wrap card">
  <div class="chart-header">
    <h4>Bond Strength Trajectories</h4>
    <span class="chart-subtitle">B(t) over time — showing up to 80 individual trajectories + mean</span>
  </div>
  <svg bind:this={svgEl} style="width:100%;height:auto;display:block;" />
</div>

<style>
  .chart-wrap { padding: 1rem 1.25rem; }
  .chart-header { margin-bottom: 0.5rem; }
  .chart-header h4 { font-size: 0.95rem; margin: 0 0 0.2rem; }
  .chart-subtitle { font-size: 0.75rem; color: var(--color-text-muted); }
</style>
