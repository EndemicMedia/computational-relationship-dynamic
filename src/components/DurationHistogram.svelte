<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import { formedResults } from '../lib/simulation-store';
  import type { SimulationResult } from '../lib/types';

  let svgEl: SVGSVGElement;
  let unsubscribe: () => void;

  const MARGIN = { top: 20, right: 20, bottom: 40, left: 50 };
  const W = 560, H = 240;
  const innerW = W - MARGIN.left - MARGIN.right;
  const innerH = H - MARGIN.top - MARGIN.bottom;

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
        .attr('fill', '#9ca3af').attr('font-size', '14px')
        .text('No data yet');
      return;
    }

    const durations = results.map(r => r.duration);
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(durations) ?? 120])
      .range([0, innerW]);

    const histogram = d3.bin<number, number>()
      .domain(xScale.domain() as [number, number])
      .thresholds(xScale.ticks(20));

    const bins = histogram(durations);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length) ?? 1])
      .range([innerH, 0]);

    // Color by outcome — stable = green, dissolved = purple
    const stableDurations = new Set(results.filter(r => r.outcome === 'stable').map(r => r.duration));

    // Draw bars
    g.selectAll('rect')
      .data(bins)
      .join('rect')
        .attr('x', d => xScale(d.x0 ?? 0) + 1)
        .attr('width', d => Math.max(0, xScale(d.x1 ?? 0) - xScale(d.x0 ?? 0) - 2))
        .attr('y', d => yScale(d.length))
        .attr('height', d => innerH - yScale(d.length))
        .attr('fill', '#6366f1')
        .attr('opacity', 0.75)
        .attr('rx', 2);

    // X axis
    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(8).tickFormat(d => `${d}mo`))
      .call(gEl => gEl.select('.domain').attr('stroke', '#374151'))
      .call(gEl => gEl.selectAll('text').attr('fill', '#9ca3af').attr('font-size', '11px'));

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(4))
      .call(gEl => gEl.select('.domain').attr('stroke', '#374151'))
      .call(gEl => gEl.selectAll('text').attr('fill', '#9ca3af').attr('font-size', '11px'));

    // Labels
    g.append('text')
      .attr('x', -innerH / 2).attr('y', -36)
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
      .attr('fill', '#9ca3af').attr('font-size', '11px')
      .text('Count');

    g.append('text')
      .attr('x', innerW / 2).attr('y', innerH + 35)
      .attr('text-anchor', 'middle')
      .attr('fill', '#9ca3af').attr('font-size', '11px')
      .text('Relationship Duration (months)');

    // Median line
    const median = d3.median(durations) ?? 0;
    g.append('line')
      .attr('x1', xScale(median)).attr('x2', xScale(median))
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', '#f59e0b').attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3');

    g.append('text')
      .attr('x', xScale(median) + 4).attr('y', 14)
      .attr('fill', '#f59e0b').attr('font-size', '10px')
      .text(`Median: ${Math.round(median)}mo`);
  }

  onMount(() => {
    draw([]);
    unsubscribe = formedResults.subscribe(draw);
  });

  onDestroy(() => unsubscribe?.());
</script>

<div class="chart-wrap card">
  <div class="chart-header">
    <h4>Relationship Duration Distribution</h4>
    <span class="chart-subtitle">Histogram of simulated relationship lengths</span>
  </div>
  <svg bind:this={svgEl} style="width:100%;height:auto;display:block;" />
</div>

<style>
  .chart-wrap { padding: 1rem 1.25rem; }
  .chart-header { margin-bottom: 0.5rem; }
  .chart-header h4 { font-size: 0.95rem; margin: 0 0 0.2rem; }
  .chart-subtitle { font-size: 0.75rem; color: var(--color-text-muted); }
</style>
