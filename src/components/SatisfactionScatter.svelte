<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import { formedResults } from '../lib/simulation-store';
  import type { SimulationResult } from '../lib/types';

  let svgEl: SVGSVGElement;
  let unsubscribe: () => void;

  const MARGIN = { top: 20, right: 20, bottom: 42, left: 50 };
  const W = 560, H = 280;
  const innerW = W - MARGIN.left - MARGIN.right;
  const innerH = H - MARGIN.top - MARGIN.bottom;
  const MAX_POINTS = 500;

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

    const sample = results.length > MAX_POINTS
      ? results.filter((_, i) => i % Math.ceil(results.length / MAX_POINTS) === 0)
      : results;

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([innerH, 0]);

    // Grid
    g.append('g').call(
      d3.axisLeft(yScale).ticks(5).tickSize(-innerW).tickFormat(() => '')
    )
      .call(gEl => gEl.select('.domain').remove())
      .call(gEl => gEl.selectAll('line').attr('stroke', '#374151').attr('stroke-dasharray', '3,3'));

    g.append('g').attr('transform', `translate(0,${innerH})`).call(
      d3.axisBottom(xScale).ticks(5).tickSize(-innerH).tickFormat(() => '')
    )
      .call(gEl => gEl.select('.domain').remove())
      .call(gEl => gEl.selectAll('line').attr('stroke', '#374151').attr('stroke-dasharray', '3,3'));

    // Diagonal reference line (equal satisfaction)
    g.append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', innerH).attr('y2', 0)
      .attr('stroke', '#374151').attr('stroke-dasharray', '6,4').attr('stroke-width', 1);

    // Data points
    const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, 1]);

    g.selectAll('circle')
      .data(sample)
      .join('circle')
        .attr('cx', d => xScale(d.avgSatisfaction1))
        .attr('cy', d => yScale(d.avgSatisfaction2))
        .attr('r', 3.5)
        .attr('fill', d => colorScale(d.finalBondStrength))
        .attr('opacity', 0.65)
        .attr('stroke', d => d.outcome === 'stable' ? '#10b981' : 'transparent')
        .attr('stroke-width', 1);

    // Axes
    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${Math.round(+d * 100)}%`))
      .call(gEl => gEl.select('.domain').attr('stroke', '#374151'))
      .call(gEl => gEl.selectAll('text').attr('fill', '#9ca3af').attr('font-size', '11px'));

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${Math.round(+d * 100)}%`))
      .call(gEl => gEl.select('.domain').attr('stroke', '#374151'))
      .call(gEl => gEl.selectAll('text').attr('fill', '#9ca3af').attr('font-size', '11px'));

    // Axis labels
    g.append('text')
      .attr('x', innerW / 2).attr('y', innerH + 36)
      .attr('text-anchor', 'middle').attr('fill', '#9ca3af').attr('font-size', '11px')
      .text('Partner 1 Avg Satisfaction S₁');

    g.append('text')
      .attr('x', -innerH / 2).attr('y', -36)
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle').attr('fill', '#9ca3af').attr('font-size', '11px')
      .text('Partner 2 Avg Satisfaction S₂');

    // Color legend (bond strength)
    const legendW = 80, legendH = 8;
    const legendG = g.append('g').attr('transform', `translate(${innerW - legendW - 4}, 4)`);
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'bond-grad');
    grad.append('stop').attr('offset', '0%').attr('stop-color', colorScale(0));
    grad.append('stop').attr('offset', '100%').attr('stop-color', colorScale(1));

    legendG.append('rect')
      .attr('width', legendW).attr('height', legendH)
      .attr('rx', 2).attr('fill', 'url(#bond-grad)');
    legendG.append('text').attr('x', 0).attr('y', legendH + 12)
      .attr('fill', '#9ca3af').attr('font-size', '9px').text('Low bond');
    legendG.append('text').attr('x', legendW).attr('y', legendH + 12)
      .attr('fill', '#9ca3af').attr('font-size', '9px').attr('text-anchor', 'end').text('High bond');
    legendG.append('text').attr('x', legendW / 2).attr('y', -2)
      .attr('fill', '#9ca3af').attr('font-size', '9px').attr('text-anchor', 'middle').text('Bond Strength');
  }

  onMount(() => {
    draw([]);
    unsubscribe = formedResults.subscribe(draw);
  });

  onDestroy(() => unsubscribe?.());
</script>

<div class="chart-wrap card">
  <div class="chart-header">
    <h4>Mutual Satisfaction Scatter</h4>
    <span class="chart-subtitle">S₁ vs S₂ colored by bond strength · green outline = stable outcome</span>
  </div>
  <svg bind:this={svgEl} style="width:100%;height:auto;display:block;" />
</div>

<style>
  .chart-wrap { padding: 1rem 1.25rem; }
  .chart-header { margin-bottom: 0.5rem; }
  .chart-header h4 { font-size: 0.95rem; margin: 0 0 0.2rem; }
  .chart-subtitle { font-size: 0.75rem; color: var(--color-text-muted); }
</style>
