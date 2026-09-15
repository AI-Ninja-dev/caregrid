import { patients, alerts } from './demo.ts';
import type { Workflow } from './workflow.ts';
export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function createDemoReport(workflow: Workflow, acknowledged: string[]): string {
  const rows: (string | number)[][] = [
    ['CAREGRID DEMONSTRATION EXPORT - FICTIONAL DATA ONLY'],
    ['Sample day', '2026-09-14', 'Time zone', 'Africa/Johannesburg'],
    ['No live monitoring. Task completion and acknowledgement are demo actions only.'], [],
    ['People'], ['Demo ID', 'Fictional name', 'Programme', 'Town', 'Device status', 'Latest sample', 'Unit'],
    ...patients.map(p => [p.id, p.name, p.programme, p.town, p.connected ? 'Available in demo' : 'Connection check', p.readings.at(-1)!, p.unit]), [],
    ['Sample alerts'], ['Alert ID', 'Person ID', 'Title', 'Acknowledgement'],
    ...alerts.map(a => [a.id, a.patientId, a.title, acknowledged.includes(a.id) ? 'Acknowledged' : 'Open']), [],
    ['Sample tasks'], ['Task ID', 'Fictional person', 'Title', 'Assigned role', 'Status', 'Source alert'],
    ...workflow.tasks.map(t => [t.id, t.person, t.title, t.owner, t.stage, t.alertId || 'Standalone demo task']), [],
    ['Demo activity - sequence only, not a production audit log'], ['Sequence', 'Task ID', 'Action'],
    ...workflow.history.map(e => [e.id, e.taskId, e.message]),
  ];
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
