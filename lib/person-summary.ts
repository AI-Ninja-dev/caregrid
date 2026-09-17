export type ReadingKind = 'blood-pressure' | 'glucose' | 'spo2';

export type PersonSummaryReading = {
  kind: ReadingKind;
  measuredAt: string;
  deviceId: string;
};

export type PersonSummary = {
  personId: string;
  latestReadingAt: string | null;
  latestReadings: Partial<Record<ReadingKind, PersonSummaryReading>>;
  devices: { total: number; enabled: number };
  tasks: { open: number; unassigned: number };
  plans: { total: number; active: number; due: number };
};

type Person = { id: string };
type Device = { id: string; person_id: string; enabled: number | boolean };
type Reading = {
  person_id: string;
  device_id: string;
  measured_at: string;
  payload: { measurement: { kind: ReadingKind } };
};
type Task = { person_id: string; owner: string | null; stage: string };
type Plan = { person_id: string; next_review: string; status: string };

export type PersonSummarySnapshot = {
  people: readonly Person[];
  devices: readonly Device[];
  readings: readonly Reading[];
  tasks: readonly Task[];
  plans: readonly Plan[];
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

/** Aggregates stored workflow state without interpreting the clinical meaning of measurements. */
export function buildPersonSummaries(
  snapshot: PersonSummarySnapshot,
  options: { now?: Date; timeZone?: string } = {},
): PersonSummary[] {
  const today = localDate(options.now ?? new Date(), options.timeZone ?? 'Africa/Johannesburg');

  return snapshot.people.map(person => {
    const readings = snapshot.readings
      .filter(reading => reading.person_id === person.id)
      .sort((a, b) => Date.parse(b.measured_at) - Date.parse(a.measured_at));
    const latestReadings: PersonSummary['latestReadings'] = {};
    for (const reading of readings) {
      const kind = reading.payload.measurement.kind;
      if (!latestReadings[kind]) latestReadings[kind] = { kind, measuredAt: reading.measured_at, deviceId: reading.device_id };
    }

    const devices = snapshot.devices.filter(device => device.person_id === person.id);
    const tasks = snapshot.tasks.filter(task => task.person_id === person.id && task.stage !== 'Completed');
    const plans = snapshot.plans.filter(plan => plan.person_id === person.id);

    return {
      personId: person.id,
      latestReadingAt: readings[0]?.measured_at ?? null,
      latestReadings,
      devices: {
        total: devices.length,
        enabled: devices.filter(device => Boolean(device.enabled)).length,
      },
      tasks: {
        open: tasks.length,
        unassigned: tasks.filter(task => !task.owner).length,
      },
      plans: {
        total: plans.length,
        active: plans.filter(plan => plan.status === 'Active' || plan.status === 'Needs review').length,
        due: plans.filter(plan => plan.status !== 'Paused' && plan.next_review <= today).length,
      },
    };
  });
}
