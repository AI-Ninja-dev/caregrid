export type AttentionKind = 'device-awaiting-reading' | 'device-stale' | 'plan-review-due' | 'task-unassigned';

export type OperationalAttentionItem = {
  id: string;
  kind: AttentionKind;
  personId: string;
  subjectId: string;
  title: string;
  detail: string;
};

type Person = { id: string; active: number | boolean };
type Device = { id: string; person_id: string; enabled: number | boolean };
type Reading = { device_id: string; measured_at: string };
type Task = { id: string; person_id: string; title: string; owner: string | null; stage: string };
type Plan = { id: string; person_id: string; focus: string; next_review: string; status: string };

type AttentionSnapshot = {
  people: readonly Person[];
  devices: readonly Device[];
  readings: readonly Reading[];
  tasks: readonly Task[];
  plans: readonly Plan[];
};

type AttentionOptions = {
  now?: Date;
  /** Optional operational freshness policy. Omit it when the service has not defined one. */
  deviceFreshnessMs?: number;
  timeZone?: string;
};

function localDate(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

/**
 * Builds workflow attention items only. It does not classify readings, infer medical risk,
 * create clinical alerts, or recommend treatment.
 */
export function buildOperationalAttention(snapshot: AttentionSnapshot, options: AttentionOptions = {}): OperationalAttentionItem[] {
  const now = options.now ?? new Date();
  const timeZone = options.timeZone ?? 'Africa/Johannesburg';
  const today = localDate(now, timeZone);
  const activePeople = new Set(snapshot.people.filter(person => Boolean(person.active)).map(person => person.id));
  const items: OperationalAttentionItem[] = [];

  for (const device of snapshot.devices) {
    if (!Boolean(device.enabled) || !activePeople.has(device.person_id)) continue;
    const readings = snapshot.readings
      .filter(reading => reading.device_id === device.id)
      .sort((a, b) => Date.parse(b.measured_at) - Date.parse(a.measured_at));
    const latest = readings[0];
    if (!latest) {
      items.push({
        id: `device-awaiting-reading:${device.id}`,
        kind: 'device-awaiting-reading',
        personId: device.person_id,
        subjectId: device.id,
        title: 'Device is awaiting its first stored reading',
        detail: 'Enrolment is active, but CareGrid has not received a measurement for this device yet.',
      });
      continue;
    }
    if (options.deviceFreshnessMs !== undefined) {
      if (!Number.isFinite(options.deviceFreshnessMs) || options.deviceFreshnessMs <= 0) throw new Error('deviceFreshnessMs must be a positive finite number.');
      const measured = Date.parse(latest.measured_at);
      if (Number.isFinite(measured) && now.getTime() - measured > options.deviceFreshnessMs) {
        items.push({
          id: `device-stale:${device.id}`,
          kind: 'device-stale',
          personId: device.person_id,
          subjectId: device.id,
          title: 'Device data is outside the configured freshness window',
          detail: 'This is a technical data-flow check only; it does not indicate a patient condition.',
        });
      }
    }
  }

  for (const plan of snapshot.plans) {
    if (!activePeople.has(plan.person_id) || plan.status === 'Paused' || plan.next_review > today) continue;
    items.push({
      id: `plan-review-due:${plan.id}`,
      kind: 'plan-review-due',
      personId: plan.person_id,
      subjectId: plan.id,
      title: 'Care plan review is due',
      detail: `${plan.focus} has reached its recorded review date. This is a workflow reminder, not a medical alert.`,
    });
  }

  for (const task of snapshot.tasks) {
    if (!activePeople.has(task.person_id) || task.stage === 'Completed' || task.owner) continue;
    items.push({
      id: `task-unassigned:${task.id}`,
      kind: 'task-unassigned',
      personId: task.person_id,
      subjectId: task.id,
      title: 'Open follow-up has no owner',
      detail: task.title,
    });
  }

  return items;
}
