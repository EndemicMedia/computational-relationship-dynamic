// Core trait structure for each simulated individual
export interface PersonalityTraits {
  openness: number;        // [0, 1]
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface AttachmentStyle {
  anxiety: number;    // [0, 1]
  avoidance: number;  // [0, 1]
}

export interface Values {
  family_orientation: number;
  career_ambition: number;
  novelty_seeking: number;
  security_seeking: number;
  social_orientation: number;
}

export interface RelationshipSkills {
  emotional_regulation: number;
  communication_quality: number;
  conflict_resolution: number;
  empathy: number;
}

export interface Individual {
  id: number;
  personality: PersonalityTraits;
  attachment: AttachmentStyle;
  values: Values;
  skills: RelationshipSkills;
  age: number;
  // Desired trait weights (what this person prioritizes in a partner)
  preference_weights: Partial<PersonalityTraits & AttachmentStyle & Values>;
}

// State of a relationship at a single time step
export interface TimeStep {
  t: number;
  B: number;   // Bond strength [0, 1]
  S1: number;  // Partner 1 satisfaction [0, 1]
  S2: number;  // Partner 2 satisfaction [0, 1]
  dissolved: boolean;
}

// Full result for a single pair simulation
export interface SimulationResult {
  pairId: number;
  individual1: number;
  individual2: number;
  formed: boolean;
  duration: number;
  outcome: 'stable' | 'dissolved' | 'never_formed';
  trajectory: TimeStep[];
  finalBondStrength: number;
  avgSatisfaction1: number;
  avgSatisfaction2: number;
  dissolutionReason?: 'low_bond' | 'low_satisfaction' | 'stress' | 'incompatibility';
}

// Aggregated summary statistics
export interface SimulationSummary {
  totalPairs: number;
  formedRelationships: number;
  stableRelationships: number;
  avgDuration: number;
  avgFinalBond: number;
  avgSatisfaction: number;
  durationDistribution: number[];
  compatibilityMatrix: number[][];
}

// Parameters controlling the simulation
export interface SimulationParams {
  populationSize: number;       // Number of individuals to generate
  numCollisions: number;        // Number of pairs to simulate
  pairingStrategy: 'random' | 'similarity' | 'preference';
  stressLevel: number;          // External stress [0, 1]
  maxDuration: number;          // Max time steps (months)
  initialAttractionThreshold: number;  // Min attraction to form relationship
  alpha: number;                // Positive interaction weight
  beta: number;                 // Negative interaction weight
  gamma: number;                // Bond decay rate
  randomSeed?: number;
}

// Default parameters for the simulation
export const DEFAULT_PARAMS: SimulationParams = {
  populationSize: 500,
  numCollisions: 1000,
  pairingStrategy: 'random',
  stressLevel: 0.3,
  maxDuration: 120,   // 10 years in months
  initialAttractionThreshold: 0.3,
  alpha: 0.15,
  beta: 0.10,
  gamma: 0.02,
};

// Messages passed to/from the simulation Web Worker
export type WorkerMessage =
  | { type: 'start'; params: SimulationParams }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'cancel' };

export type WorkerResponse =
  | { type: 'progress'; completed: number; total: number; result: SimulationResult }
  | { type: 'complete'; summary: SimulationSummary }
  | { type: 'error'; message: string };
