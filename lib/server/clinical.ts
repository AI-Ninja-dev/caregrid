import type { ClinicalPillar } from '../care-plans.ts';

export const liveClinicalPillars: readonly ClinicalPillar[] = [
  'Diabetes management',
  'Hypertension management',
  'Cardiovascular health',
  'Stroke prevention',
] as const;

export const programmesByPillar: Record<ClinicalPillar, readonly string[]> = {
  'Diabetes management': ['Glucose monitoring'],
  'Hypertension management': ['Blood pressure'],
  'Cardiovascular health': ['Heart-health monitoring'],
  'Stroke prevention': ['Risk-factor monitoring'],
};

export function isClinicalPillar(value: unknown): value is ClinicalPillar {
  return typeof value === 'string' && (liveClinicalPillars as readonly string[]).includes(value);
}

export function validateClinicalPillar(value: unknown): ClinicalPillar {
  if (!isClinicalPillar(value)) throw new Error('Choose a valid clinical pillar.');
  return value;
}

export function validateProgramme(pillar: ClinicalPillar, value: unknown): string {
  if (typeof value !== 'string' || !programmesByPillar[pillar].includes(value)) throw new Error('Choose a programme that belongs to the selected clinical pillar.');
  return value;
}

export function legacyProgrammeForPillar(pillar: ClinicalPillar): string {
  return programmesByPillar[pillar][0];
}

export function inferLegacyPillar(programme: unknown): ClinicalPillar | null {
  if (typeof programme !== 'string') return null;
  for (const pillar of liveClinicalPillars) if (programmesByPillar[pillar].includes(programme)) return pillar;
  return null;
}

export function migrationDefaults() {
  return {
    pillar: 'Diabetes management' as ClinicalPillar,
    programme: 'Glucose monitoring',
  };
}
