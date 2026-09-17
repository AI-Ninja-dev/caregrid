export type PlanStatus = 'Active' | 'Needs review' | 'Paused';
export type ClinicalPillar = 'Diabetes management' | 'Hypertension management' | 'Cardiovascular health' | 'Stroke prevention';

export const clinicalPillars: { name: ClinicalPillar; description: string }[] = [
  { name: 'Diabetes management', description: 'Connected glucose monitoring, review workflows and long-term support.' },
  { name: 'Hypertension management', description: 'Home blood-pressure monitoring with context-aware care-team review.' },
  { name: 'Cardiovascular health', description: 'A multi-metric pathway for heart-health monitoring and coordinated follow-up.' },
  { name: 'Stroke prevention', description: 'Risk-factor visibility and prevention-focused follow-up across connected care pathways.' },
];

export type CarePlan = {
  id: string;
  patientId: string;
  focus: string;
  pillar: ClinicalPillar;
  owner: string;
  cadence: string;
  nextReview: string;
  status: PlanStatus;
  goals: string[];
};

export const sampleCarePlans: CarePlan[] = [
  { id: 'CP-001', patientId: 'CG-001', focus: 'Glucose monitoring support', pillar: 'Diabetes management', owner: 'Clinical reviewer', cadence: 'Weekly review', nextReview: '16 Sep 2026', status: 'Needs review', goals: ['Confirm the sample measurement context', 'Agree the next follow-up through the care team'] },
  { id: 'CP-002', patientId: 'CG-002', focus: 'Blood-pressure monitoring support', pillar: 'Hypertension management', owner: 'Care coordinator', cadence: 'Fortnightly review', nextReview: '21 Sep 2026', status: 'Active', goals: ['Keep the demo device connected', 'Review measurement context before interpretation'] },
  { id: 'CP-003', patientId: 'CG-003', focus: 'Device connection support', pillar: 'Diabetes management', owner: 'Device support', cadence: 'Connection check', nextReview: 'Today', status: 'Needs review', goals: ['Verify the device connection route', 'Use the agreed contact workflow if needed'] },
  { id: 'CP-004', patientId: 'CG-004', focus: 'Blood-pressure monitoring support', pillar: 'Hypertension management', owner: 'Clinical reviewer', cadence: 'Monthly review', nextReview: '04 Oct 2026', status: 'Active', goals: ['Review the illustrative reading sequence', 'Confirm the next planned touchpoint'] },
];

export function plansForPatient(plans: CarePlan[], patientId: string) {
  return plans.filter((plan) => plan.patientId === patientId);
}

export function plansForPillar(plans: CarePlan[], pillar: ClinicalPillar) {
  return plans.filter((plan) => plan.pillar === pillar);
}

export function updatePlanStatus(plans: CarePlan[], id: string, status: PlanStatus) {
  const plan = plans.find((item) => item.id === id);
  if (!plan || plan.status === status) return plans;
  return plans.map((item) => item.id === id ? { ...item, status } : item);
}

export function planCountByStatus(plans: CarePlan[]) {
  return plans.reduce<Record<PlanStatus, number>>((counts, plan) => {
    counts[plan.status] += 1;
    return counts;
  }, { Active: 0, 'Needs review': 0, Paused: 0 });
}

export function planCountByPillar(plans: CarePlan[]) {
  const counts = Object.fromEntries(clinicalPillars.map(({ name }) => [name, 0])) as Record<ClinicalPillar, number>;
  for (const plan of plans) counts[plan.pillar] += 1;
  return counts;
}