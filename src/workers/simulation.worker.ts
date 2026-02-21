import type {
  Individual,
  SimulationParams,
  SimulationResult,
  SimulationSummary,
  TimeStep,
  WorkerMessage,
  WorkerResponse,
} from '../lib/types';

// ─── Pseudo-random number generator (seeded for reproducibility) ─────────────
let seed = 42;
function seededRandom(): number {
  seed = (seed * 1664525 + 1013904223) & 0xffffffff;
  return (seed >>> 0) / 0xffffffff;
}

function setSeed(s: number) {
  seed = s;
}

// Box-Muller transform for normally distributed values
function gaussianRandom(mean: number, std: number): number {
  const u1 = Math.max(seededRandom(), 1e-10);
  const u2 = seededRandom();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, Math.min(1, mean + std * z));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ─── Population generation ────────────────────────────────────────────────────
function generateIndividual(id: number): Individual {
  const neuroticism = gaussianRandom(0.5, 0.2);
  const anxiety = gaussianRandom(0.3 + neuroticism * 0.3, 0.15); // correlated with neuroticism

  return {
    id,
    personality: {
      openness: gaussianRandom(0.5, 0.2),
      conscientiousness: gaussianRandom(0.5, 0.2),
      extraversion: gaussianRandom(0.5, 0.2),
      agreeableness: gaussianRandom(0.5, 0.2),
      neuroticism,
    },
    attachment: {
      anxiety: clamp(anxiety, 0, 1),
      avoidance: gaussianRandom(0.3, 0.2),
    },
    values: {
      family_orientation: gaussianRandom(0.5, 0.25),
      career_ambition: gaussianRandom(0.5, 0.25),
      novelty_seeking: gaussianRandom(0.5, 0.2),
      security_seeking: gaussianRandom(0.5, 0.2),
      social_orientation: gaussianRandom(0.5, 0.2),
    },
    skills: {
      emotional_regulation: gaussianRandom(0.5, 0.2),
      communication_quality: gaussianRandom(0.5, 0.2),
      conflict_resolution: gaussianRandom(0.5, 0.2),
      empathy: gaussianRandom(0.5, 0.2),
    },
    age: Math.floor(seededRandom() * 30) + 20, // 20–50
    preference_weights: {
      agreeableness: 0.3 + seededRandom() * 0.4,
      emotional_regulation: 0.2 + seededRandom() * 0.3,
    },
  };
}

function generatePopulation(n: number): Individual[] {
  const pop: Individual[] = [];
  for (let i = 0; i < n; i++) {
    pop.push(generateIndividual(i));
  }
  return pop;
}

// ─── Pairing strategies ────────────────────────────────────────────────────────
function similarityScore(a: Individual, b: Individual): number {
  const pDiff = (
    Math.abs(a.personality.openness - b.personality.openness) +
    Math.abs(a.personality.conscientiousness - b.personality.conscientiousness) +
    Math.abs(a.personality.extraversion - b.personality.extraversion) +
    Math.abs(a.personality.agreeableness - b.personality.agreeableness) +
    Math.abs(a.personality.neuroticism - b.personality.neuroticism)
  ) / 5;
  const vDiff = (
    Math.abs(a.values.family_orientation - b.values.family_orientation) +
    Math.abs(a.values.career_ambition - b.values.career_ambition)
  ) / 2;
  return 1 - (pDiff * 0.6 + vDiff * 0.4);
}

function generatePairs(
  population: Individual[],
  strategy: SimulationParams['pairingStrategy'],
  numCollisions: number
): [Individual, Individual][] {
  const pairs: [Individual, Individual][] = [];
  const n = population.length;

  for (let i = 0; i < numCollisions; i++) {
    const idx1 = Math.floor(seededRandom() * n);
    let idx2 = idx1;

    if (strategy === 'similarity') {
      // Sample a few candidates, pick most similar
      let bestScore = -1;
      let bestIdx = (idx1 + 1) % n;
      for (let trial = 0; trial < 5; trial++) {
        const candidate = Math.floor(seededRandom() * n);
        if (candidate === idx1) continue;
        const score = similarityScore(population[idx1], population[candidate]);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = candidate;
        }
      }
      idx2 = bestIdx;
    } else {
      while (idx2 === idx1) {
        idx2 = Math.floor(seededRandom() * n);
      }
    }

    pairs.push([population[idx1], population[idx2]]);
  }
  return pairs;
}

// ─── Core relationship dynamics equations ─────────────────────────────────────

/**
 * Initial attraction between two individuals.
 * Combines similarity on values + complementarity on extraversion +
 * agreeableness of both partners.
 */
function computeInitialAttraction(a: Individual, b: Individual): number {
  const valueSim = 1 - (
    Math.abs(a.values.family_orientation - b.values.family_orientation) * 0.4 +
    Math.abs(a.values.security_seeking - b.values.security_seeking) * 0.3 +
    Math.abs(a.values.novelty_seeking - b.values.novelty_seeking) * 0.3
  );

  // Extraversion complementarity: moderate difference is OK
  const extDiff = Math.abs(a.personality.extraversion - b.personality.extraversion);
  const extComp = 1 - Math.max(0, extDiff - 0.4);

  const agreeableness = (a.personality.agreeableness + b.personality.agreeableness) / 2;
  const secureAttachment = 1 - (a.attachment.anxiety + b.attachment.avoidance) / 2 * 0.4;

  return clamp(valueSim * 0.35 + extComp * 0.2 + agreeableness * 0.25 + secureAttachment * 0.2, 0, 1);
}

/**
 * Positive interaction rate at a time step.
 * Driven by shared values alignment, communication quality, and empathy.
 */
function positiveInteractions(a: Individual, b: Individual, B: number): number {
  const commAvg = (a.skills.communication_quality + b.skills.communication_quality) / 2;
  const empAvg = (a.skills.empathy + b.skills.empathy) / 2;
  const valAlign = 1 - Math.abs(a.values.family_orientation - b.values.family_orientation) * 0.5;
  return (commAvg * 0.4 + empAvg * 0.35 + valAlign * 0.25) * (0.5 + B * 0.5);
}

/**
 * Negative interaction rate at a time step.
 * Driven by neuroticism, attachment anxiety, and poor conflict resolution.
 */
function negativeInteractions(a: Individual, b: Individual, _B: number): number {
  const neurAvg = (a.personality.neuroticism + b.personality.neuroticism) / 2;
  const anxAvg = (a.attachment.anxiety + b.attachment.anxiety) / 2;
  const conflictPoor = 1 - (a.skills.conflict_resolution + b.skills.conflict_resolution) / 2;
  return neurAvg * 0.4 + anxAvg * 0.3 + conflictPoor * 0.3;
}

/**
 * Satisfaction delta for individual i in the pair.
 * Based on bond strength, how well partner matches preferences, and stress.
 */
function satisfactionDelta(
  self: Individual,
  partner: Individual,
  B: number,
  stressLevel: number
): number {
  const matchScore = (
    (partner.personality.agreeableness * (self.preference_weights.agreeableness ?? 0.3)) +
    (partner.skills.emotional_regulation * (self.preference_weights.emotional_regulation ?? 0.3))
  );

  const stressEffect = -stressLevel * self.personality.neuroticism * 0.4;
  const bondContrib = (B - 0.5) * 0.3;

  return clamp(matchScore * 0.04 + bondContrib * 0.02 + stressEffect * 0.01, -0.05, 0.05);
}

/**
 * Probability of relationship dissolution at this time step.
 */
function dissolutionProbability(B: number, S1: number, S2: number, stressLevel: number): number {
  const avgSat = (S1 + S2) / 2;
  if (B < 0.05) return 0.95;
  const baseDissolution = (1 - B) * 0.02 + (1 - avgSat) * 0.02 + stressLevel * 0.01;
  return clamp(baseDissolution, 0, 1);
}

// ─── Single relationship trajectory simulation ─────────────────────────────────
function simulateRelationship(
  pair: [Individual, Individual],
  params: SimulationParams,
  pairId: number
): SimulationResult {
  const [a, b] = pair;
  const attraction = computeInitialAttraction(a, b);

  if (attraction < params.initialAttractionThreshold) {
    return {
      pairId,
      individual1: a.id,
      individual2: b.id,
      formed: false,
      duration: 0,
      outcome: 'never_formed',
      trajectory: [],
      finalBondStrength: 0,
      avgSatisfaction1: 0,
      avgSatisfaction2: 0,
    };
  }

  let B = attraction;
  let S1 = 0.5 + (attraction - 0.5) * 0.3;
  let S2 = 0.5 + (attraction - 0.5) * 0.3;
  const trajectory: TimeStep[] = [];
  const DT = 1.0; // one month

  let dissolutionReason: SimulationResult['dissolutionReason'];

  for (let t = 0; t < params.maxDuration; t++) {
    // Bond strength differential equation:
    // dB/dt = α·Positive - β·Negative - γ·B (decay)
    const dB =
      params.alpha * positiveInteractions(a, b, B) -
      params.beta * negativeInteractions(a, b, B) -
      params.gamma * B;

    const dS1 = satisfactionDelta(a, b, B, params.stressLevel);
    const dS2 = satisfactionDelta(b, a, B, params.stressLevel);

    B = clamp(B + dB * DT, 0, 1);
    S1 = clamp(S1 + dS1 * DT, 0, 1);
    S2 = clamp(S2 + dS2 * DT, 0, 1);

    const pDissolve = dissolutionProbability(B, S1, S2, params.stressLevel);
    const dissolved = seededRandom() < pDissolve;

    trajectory.push({ t, B, S1, S2, dissolved });

    if (dissolved) {
      if (B < 0.1) dissolutionReason = 'low_bond';
      else if ((S1 + S2) / 2 < 0.3) dissolutionReason = 'low_satisfaction';
      else if (params.stressLevel > 0.6) dissolutionReason = 'stress';
      else dissolutionReason = 'incompatibility';
      break;
    }
  }

  const finalStep = trajectory[trajectory.length - 1];
  const dissolved = finalStep?.dissolved ?? false;
  const avgS1 = trajectory.reduce((s, ts) => s + ts.S1, 0) / Math.max(1, trajectory.length);
  const avgS2 = trajectory.reduce((s, ts) => s + ts.S2, 0) / Math.max(1, trajectory.length);

  return {
    pairId,
    individual1: a.id,
    individual2: b.id,
    formed: true,
    duration: trajectory.length,
    outcome: dissolved ? 'dissolved' : 'stable',
    trajectory,
    finalBondStrength: finalStep?.B ?? 0,
    avgSatisfaction1: avgS1,
    avgSatisfaction2: avgS2,
    dissolutionReason,
  };
}

// ─── Summary aggregation ──────────────────────────────────────────────────────
function buildSummary(results: SimulationResult[]): SimulationSummary {
  const formed = results.filter(r => r.formed);
  const stable = formed.filter(r => r.outcome === 'stable');
  const avgDuration = formed.length > 0
    ? formed.reduce((s, r) => s + r.duration, 0) / formed.length
    : 0;
  const avgFinalBond = formed.length > 0
    ? formed.reduce((s, r) => s + r.finalBondStrength, 0) / formed.length
    : 0;
  const avgSat = formed.length > 0
    ? formed.reduce((s, r) => s + (r.avgSatisfaction1 + r.avgSatisfaction2) / 2, 0) / formed.length
    : 0;

  // Duration distribution in 10 buckets (each = maxDuration/10 months)
  const buckets = 10;
  const durationDist = Array(buckets).fill(0);
  const maxDur = formed.reduce((m, r) => Math.max(m, r.duration), 1);
  for (const r of formed) {
    const bucket = Math.min(buckets - 1, Math.floor((r.duration / maxDur) * buckets));
    durationDist[bucket]++;
  }

  return {
    totalPairs: results.length,
    formedRelationships: formed.length,
    stableRelationships: stable.length,
    avgDuration,
    avgFinalBond,
    avgSatisfaction: avgSat,
    durationDistribution: durationDist,
    compatibilityMatrix: [],
  };
}

// ─── Worker message handler ────────────────────────────────────────────────────
let cancelled = false;
let paused = false;

self.addEventListener('message', async (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  if (msg.type === 'cancel') { cancelled = true; return; }
  if (msg.type === 'pause') { paused = true; return; }
  if (msg.type === 'resume') { paused = false; return; }

  if (msg.type === 'start') {
    cancelled = false;
    paused = false;
    const params = msg.params;

    if (params.randomSeed !== undefined) setSeed(params.randomSeed);

    try {
      const population = generatePopulation(params.populationSize);
      const pairs = generatePairs(population, params.pairingStrategy, params.numCollisions);
      const allResults: SimulationResult[] = [];

      for (let i = 0; i < pairs.length; i++) {
        if (cancelled) return;

        // Yield to allow pause checks
        while (paused) {
          await new Promise(r => setTimeout(r, 100));
        }

        const result = simulateRelationship(pairs[i], params, i);
        allResults.push(result);

        // Post progress every 50 results
        if (i % 50 === 0 || i === pairs.length - 1) {
          const response: WorkerResponse = {
            type: 'progress',
            completed: i + 1,
            total: pairs.length,
            result,
          };
          self.postMessage(response);
        }
      }

      const summary = buildSummary(allResults);
      const finalResponse: WorkerResponse = { type: 'complete', summary };
      self.postMessage(finalResponse);
    } catch (err) {
      const errResponse: WorkerResponse = {
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(errResponse);
    }
  }
});
