<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { formedResults, simulationState } from '../lib/simulation-store';
  import { displayMonth } from '../lib/timeline-store';
  import type { SimulationResult } from '../lib/types';

  let canvas: HTMLCanvasElement;
  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let animationId: number;
  let particlesMesh: THREE.Points;
  let bondLinesMesh: THREE.LineSegments;
  let startTime: number;
  let unsubscribeResults: () => void;
  let unsubscribeState: () => void;
  let unsubscribeMonth: () => void;

  let storedResults: SimulationResult[] = [];
  let currentDisplayMonth = 0;

  // Particle data
  let positions: Float32Array;
  let velocities: Float32Array;
  let colors: Float32Array;
  let particleCount = 0;

  const MAX_PARTICLES = 300;
  const MAX_BONDS = 200;

  function initThree() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0e1a, 1);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0e1a, 0.035);

    const aspect = canvas.clientWidth / canvas.clientHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
    camera.position.set(0, 0, 18);

    startTime = performance.now();

    // Ambient + point lights for glow effect
    scene.add(new THREE.AmbientLight(0x111122, 2));
    const pointLight = new THREE.PointLight(0x6366f1, 5, 40);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    // Initialize particle system
    initParticles();
    initBondLines();

    // Background stars
    addStarField();

    window.addEventListener('resize', onResize);
    animate();
  }

  function initParticles() {
    positions = new Float32Array(MAX_PARTICLES * 3);
    velocities = new Float32Array(MAX_PARTICLES * 3);
    colors = new Float32Array(MAX_PARTICLES * 3);

    // Spread particles in 3D trait-space sphere
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 5 + Math.random() * 5;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi) - 2;

      // Slow orbital velocities
      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.005;

      // Default color: cool blue-purple
      colors[i * 3] = 0.3 + Math.random() * 0.3;
      colors[i * 3 + 1] = 0.3 + Math.random() * 0.2;
      colors[i * 3 + 2] = 0.7 + Math.random() * 0.3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    particlesMesh = new THREE.Points(geometry, material);
    scene.add(particlesMesh);
    particleCount = MAX_PARTICLES;
  }

  function initBondLines() {
    const geo = new THREE.BufferGeometry();
    const bondPositions = new Float32Array(MAX_BONDS * 2 * 3);
    const bondColors = new Float32Array(MAX_BONDS * 2 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(bondPositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(bondColors, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    bondLinesMesh = new THREE.LineSegments(geo, mat);
    scene.add(bondLinesMesh);
  }

  function addStarField() {
    const starCount = 800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 100;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.08,
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true,
    });
    scene.add(new THREE.Points(geo, mat));
  }

  function updateAtMonth(results: SimulationResult[], month: number) {
    if (!particlesMesh || results.length === 0) return;

    const colAttr = particlesMesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    const recent = results.slice(-MAX_PARTICLES);

    for (let i = 0; i < Math.min(recent.length, MAX_PARTICLES); i++) {
      const r = recent[i];
      // Use the step at the current month; fall back to final step if past the end
      const step = r.trajectory[month] ?? r.trajectory[r.trajectory.length - 1];
      if (!step) {
        colAttr.setXYZ(i, 0.15, 0.15, 0.35); // dim — never formed
        continue;
      }

      const B = step.B;
      const avgSat = (step.S1 + step.S2) / 2;
      const isDissolved = step.dissolved || month >= r.trajectory.length;

      if (isDissolved) {
        // Red-orange: fading signal of a dissolved bond
        colAttr.setXYZ(i, 0.7 * (1 - B * 0.3), 0.15, 0.15);
      } else {
        // Blue-to-green: active bond; brighter = stronger
        colAttr.setXYZ(i, 0.1 + 0.1 * (1 - B), 0.3 + 0.5 * avgSat, 0.4 + 0.4 * B);
      }
    }
    colAttr.needsUpdate = true;
    updateBondLines(recent, month);
  }

  // Keep legacy name so onMount wiring below still works
  function updateFromResults(results: SimulationResult[]) {
    storedResults = results;
    updateAtMonth(results, currentDisplayMonth);
  }

  function updateBondLines(results: SimulationResult[], month: number) {
    if (!bondLinesMesh) return;
    const posAttr = particlesMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const bondPos = bondLinesMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const bondCol = bondLinesMesh.geometry.getAttribute('color') as THREE.BufferAttribute;

    const numBonds = Math.min(results.length, MAX_BONDS);
    for (let i = 0; i < numBonds; i++) {
      const r = results[i];
      if (!r.formed || r.trajectory.length === 0) continue;

      const step = r.trajectory[month] ?? r.trajectory[r.trajectory.length - 1];
      const B = step?.B ?? 0;
      const isDissolved = !step || step.dissolved || month >= r.trajectory.length;

      const idx1 = r.individual1 % MAX_PARTICLES;
      const idx2 = r.individual2 % MAX_PARTICLES;

      const x1 = posAttr.getX(idx1), y1 = posAttr.getY(idx1), z1 = posAttr.getZ(idx1);
      const x2 = posAttr.getX(idx2), y2 = posAttr.getY(idx2), z2 = posAttr.getZ(idx2);

      bondPos.setXYZ(i * 2,     x1, y1, z1);
      bondPos.setXYZ(i * 2 + 1, x2, y2, z2);

      if (isDissolved) {
        // Faint red bond line after dissolution
        bondCol.setXYZ(i * 2,     0.5, 0.1, 0.1);
        bondCol.setXYZ(i * 2 + 1, 0.4, 0.1, 0.1);
      } else {
        // Bright green-to-teal, intensity proportional to bond strength
        bondCol.setXYZ(i * 2,     0.1,       0.6 + 0.3 * B, 0.4 * B);
        bondCol.setXYZ(i * 2 + 1, 0.1 * B,   0.5 + 0.4 * B, 0.5 * B);
      }
    }

    bondPos.needsUpdate = true;
    bondCol.needsUpdate = true;
    bondLinesMesh.geometry.setDrawRange(0, numBonds * 2);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    const elapsed = (performance.now() - startTime) / 1000;

    // Slow camera orbit
    camera.position.x = Math.cos(elapsed * 0.07) * 18;
    camera.position.z = Math.sin(elapsed * 0.07) * 18;
    camera.position.y = Math.sin(elapsed * 0.04) * 4;
    camera.lookAt(0, 0, -2);

    // Drift particles gently
    if (particlesMesh) {
      const posAttr = particlesMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        let x = posAttr.getX(i) + velocities[i * 3];
        let y = posAttr.getY(i) + velocities[i * 3 + 1];
        let z = posAttr.getZ(i) + velocities[i * 3 + 2];

        // Soft boundary — pull back toward sphere
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist > 12) {
          velocities[i * 3] -= x * 0.0005;
          velocities[i * 3 + 1] -= y * 0.0005;
          velocities[i * 3 + 2] -= z * 0.0005;
        }
        if (dist < 3) {
          velocities[i * 3] += x * 0.001;
          velocities[i * 3 + 1] += y * 0.001;
          velocities[i * 3 + 2] += z * 0.001;
        }

        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  function onResize() {
    if (!canvas || !renderer || !camera) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  onMount(() => {
    initThree();
    unsubscribeResults = formedResults.subscribe(updateFromResults);
    unsubscribeState = simulationState.subscribe(() => {});
    unsubscribeMonth = displayMonth.subscribe(m => {
      currentDisplayMonth = m;
      updateAtMonth(storedResults, m);
    });
  });

  onDestroy(() => {
    cancelAnimationFrame(animationId);
    unsubscribeResults?.();
    unsubscribeState?.();
    unsubscribeMonth?.();
    window.removeEventListener('resize', onResize);
    renderer?.dispose();
    particlesMesh?.geometry.dispose();
    bondLinesMesh?.geometry.dispose();
  });
</script>

<div class="collider-wrap card">
  <div class="chart-header">
    <h4>Particle Trait-Space Collider</h4>
    <span class="chart-subtitle">
      Individuals as particles in trait-space · 
      <span style="color:#10b981">Green</span> = stable bond · 
      <span style="color:#ef4444">Red</span> = dissolved
    </span>
  </div>
  <canvas bind:this={canvas} style="width:100%;height:320px;display:block;border-radius:8px;" />
</div>

<style>
  .collider-wrap { padding: 1rem 1.25rem; }
  .chart-header { margin-bottom: 0.75rem; }
  .chart-header h4 { font-size: 0.95rem; margin: 0 0 0.2rem; }
  .chart-subtitle { font-size: 0.75rem; color: var(--color-text-muted); }
</style>
