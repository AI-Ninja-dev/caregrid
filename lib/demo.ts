import type { ClinicalPillar } from './care-plans';

export type Patient = { id: string; name: string; initials: string; pillar: ClinicalPillar; programme: string; town: string; device: string; connected: boolean; battery: number; readings: number[]; unit: string; metric: string; last: string };
export type Alert = { id: string; patientId: string; title: string; description: string; time: string; kind: 'reading' | 'device' };

export const patients: Patient[] = [
  { id: 'CG-001', name: 'Thandi Mokoena', initials: 'TM', pillar: 'Diabetes management', programme: 'Glucose monitoring', town: 'Cape Town', device: 'Demo CGM sensor', connected: true, battery: 82, readings: [6.1, 6.4, 7.2, 7.8, 7.1, 6.6, 6.3, 6.5], unit: 'mmol/L', metric: 'Glucose', last: '09:40' },
  { id: 'CG-002', name: 'David Jacobs', initials: 'DJ', pillar: 'Hypertension management', programme: 'Blood pressure', town: 'Stellenbosch', device: 'Demo upper-arm monitor', connected: true, battery: 64, readings: [132, 128, 134, 130, 136, 138, 133, 131], unit: 'mmHg', metric: 'Systolic pressure', last: '09:15' },
  { id: 'CG-003', name: 'Naledi Dlamini', initials: 'ND', pillar: 'Diabetes management', programme: 'Glucose monitoring', town: 'Johannesburg', device: 'Demo CGM sensor', connected: false, battery: 18, readings: [7.3, 7.8, 7.4, 7.1, 6.8, 7.2, 7.6, 7.4], unit: 'mmol/L', metric: 'Glucose', last: 'Yesterday, 18:20' },
  { id: 'CG-004', name: 'Peter Williams', initials: 'PW', pillar: 'Hypertension management', programme: 'Blood pressure', town: 'Durban', device: 'Demo upper-arm monitor', connected: true, battery: 91, readings: [125, 129, 127, 131, 130, 128, 126, 129], unit: 'mmHg', metric: 'Systolic pressure', last: '08:50' },
  { id: 'CG-005', name: 'Amina Daniels', initials: 'AD', pillar: 'Cardiovascular health', programme: 'Heart-health monitoring', town: 'Cape Town', device: 'Demo pulse oximeter', connected: true, battery: 76, readings: [97, 98, 97, 96, 98, 97, 98, 97], unit: '%', metric: 'SpO2', last: '09:05' },
  { id: 'CG-006', name: 'Sibusiso Khumalo', initials: 'SK', pillar: 'Cardiovascular health', programme: 'Heart-health monitoring', town: 'Pretoria', device: 'Demo connected scale', connected: true, battery: 58, readings: [82.4, 82.2, 82.1, 81.9, 82.0, 81.8, 81.7, 81.8], unit: 'kg', metric: 'Weight', last: '07:35' },
  { id: 'CG-007', name: 'Lerato Molefe', initials: 'LM', pillar: 'Stroke prevention', programme: 'Risk-factor monitoring', town: 'Bloemfontein', device: 'Demo upper-arm monitor', connected: true, battery: 69, readings: [134, 132, 130, 135, 131, 133, 129, 130], unit: 'mmHg', metric: 'Systolic pressure', last: '08:20' },
  { id: 'CG-008', name: 'Michael Naidoo', initials: 'MN', pillar: 'Stroke prevention', programme: 'Risk-factor monitoring', town: 'Gqeberha', device: 'Demo pulse oximeter', connected: true, battery: 88, readings: [98, 98, 97, 98, 97, 98, 98, 97], unit: '%', metric: 'SpO2', last: '08:05' },
];

export const alerts: Alert[] = [
  { id: 'A-001', patientId: 'CG-001', title: 'Reading review requested', description: 'A sample reading has been flagged for the care team. Review the example timeline; no clinical threshold has been applied.', time: '09:42', kind: 'reading' },
  { id: 'A-002', patientId: 'CG-003', title: 'Device connection needs attention', description: 'The demo sensor has not supplied a recent reading. In a connected service, check device availability and follow the agreed contact workflow.', time: '09:10', kind: 'device' },
  { id: 'A-003', patientId: 'CG-002', title: 'Measurement context requested', description: 'A sample task asks the team to confirm the circumstances of a home measurement before interpretation.', time: '08:55', kind: 'reading' },
  { id: 'A-004', patientId: 'CG-005', title: 'Heart-health review requested', description: 'A fictional cardiovascular pathway item is ready for care-team review. The demo does not infer a diagnosis or emergency condition.', time: '08:35', kind: 'reading' },
  { id: 'A-005', patientId: 'CG-007', title: 'Prevention follow-up due', description: 'A fictional stroke-prevention follow-up is due under the sample care workflow. Review context before any real-world action.', time: '08:10', kind: 'reading' },
];

export function filterPatients(query: string, pillar: ClinicalPillar | 'All pillars') {
  const term = query.trim().toLowerCase();
  return patients.filter(p => (pillar === 'All pillars' || p.pillar === pillar) && `${p.name} ${p.id} ${p.town} ${p.programme} ${p.pillar}`.toLowerCase().includes(term));
}

export function toggleAcknowledgement(ids: string[], id: string) {
  if (!alerts.some(a => a.id === id)) return ids;
  return ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];
}
