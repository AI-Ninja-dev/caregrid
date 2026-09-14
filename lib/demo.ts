export type Patient = { id: string; name: string; initials: string; programme: string; town: string; device: string; connected: boolean; battery: number; readings: number[]; unit: string; metric: string; last: string };
export type Alert = { id: string; patientId: string; title: string; description: string; time: string; kind: 'reading' | 'device' };
export const patients: Patient[] = [
  { id: 'CG-001', name: 'Thandi Mokoena', initials: 'TM', programme: 'Glucose monitoring', town: 'Cape Town', device: 'Demo CGM sensor', connected: true, battery: 82, readings: [6.1, 6.4, 7.2, 7.8, 7.1, 6.6, 6.3, 6.5], unit: 'mmol/L', metric: 'Glucose', last: '09:40' },
  { id: 'CG-002', name: 'David Jacobs', initials: 'DJ', programme: 'Blood pressure', town: 'Stellenbosch', device: 'Demo upper-arm monitor', connected: true, battery: 64, readings: [132, 128, 134, 130, 136, 138, 133, 131], unit: 'mmHg', metric: 'Systolic pressure', last: '09:15' },
  { id: 'CG-003', name: 'Naledi Dlamini', initials: 'ND', programme: 'Glucose monitoring', town: 'Johannesburg', device: 'Demo CGM sensor', connected: false, battery: 18, readings: [7.3, 7.8, 7.4, 7.1, 6.8, 7.2, 7.6, 7.4], unit: 'mmol/L', metric: 'Glucose', last: 'Yesterday, 18:20' },
  { id: 'CG-004', name: 'Peter Williams', initials: 'PW', programme: 'Blood pressure', town: 'Durban', device: 'Demo upper-arm monitor', connected: true, battery: 91, readings: [125, 129, 127, 131, 130, 128, 126, 129], unit: 'mmHg', metric: 'Systolic pressure', last: '08:50' },
];
export const alerts: Alert[] = [
  { id: 'A-001', patientId: 'CG-001', title: 'Reading review requested', description: 'A sample reading has been flagged for the care team. Review the example timeline; no clinical threshold has been applied.', time: '09:42', kind: 'reading' },
  { id: 'A-002', patientId: 'CG-003', title: 'Device connection needs attention', description: 'The demo sensor has not supplied a recent reading. In a connected service, check device availability and follow the agreed contact workflow.', time: '09:10', kind: 'device' },
  { id: 'A-003', patientId: 'CG-002', title: 'Measurement context requested', description: 'A sample task asks the team to confirm the circumstances of a home measurement before interpretation.', time: '08:55', kind: 'reading' },
];
export function filterPatients(query: string, programme: string) { const term = query.trim().toLowerCase(); return patients.filter(p => (programme === 'All programmes' || p.programme === programme) && `${p.name} ${p.id} ${p.town}`.toLowerCase().includes(term)); }
export function toggleAcknowledgement(ids: string[], id: string) { if (!alerts.some(a => a.id === id)) return ids; return ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]; }
