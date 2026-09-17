import { NextRequest } from 'next/server';
import { store } from '../../../lib/server/live-store';
import { currentUser, failure, json } from '../../../lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Reading = { event_key:string; person_id:string; device_id:string; measured_at:string; payload:unknown };
type Person = { id:string; active:number|boolean; pillar:string };
type Device = { id:string; label:string; person_id:string; kind:string; enabled:number|boolean };
type Task = { person_id:string; stage:string };
type Plan = { pillar:string; status:string; next_review:string };
type Attention = { personId:string };
type ClinicalAlert = { status?:string|null };

export async function GET(request: NextRequest) {
  try {
    const user = currentUser(request);
    const snapshot = store().snapshot(user);
    const readings = snapshot.readings as unknown as Reading[];
    const people = snapshot.people as unknown as Person[];
    const devices = snapshot.devices as unknown as Device[];
    const tasks = snapshot.tasks as unknown as Task[];
    const plans = snapshot.plans as unknown as Plan[];
    const attention = snapshot.attention as unknown as Attention[];
    const clinicalAlerts = snapshot.clinicalAlerts as unknown as ClinicalAlert[];
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const latestByDevice = new Map<string, Reading>();
    for (const reading of readings) {
      const existing = latestByDevice.get(reading.device_id);
      if (!existing || Date.parse(reading.measured_at) > Date.parse(existing.measured_at)) latestByDevice.set(reading.device_id, reading);
    }
    const readingsToday = readings.filter(reading => now - Date.parse(reading.measured_at) < day).length;
    const openTasks = tasks.filter(task => task.stage !== 'Completed');
    const duePlans = plans.filter(plan => plan.status !== 'Paused' && Date.parse(`${plan.next_review}T23:59:59Z`) <= now);
    const deviceHealth = devices.map(device => ({
      ...device,
      latestReading: latestByDevice.get(device.id) || null,
      state: !device.enabled ? 'paused' : !latestByDevice.get(device.id) ? 'awaiting' : 'connected',
    }));
    const personById = new Map(people.map(person => [person.id, person]));
    const pillars = ['Diabetes management','Hypertension management','Cardiovascular health','Stroke prevention'].map(name => ({
      name,
      activePeople: people.filter(person => Boolean(person.active) && person.pillar === name).length,
      openTasks: openTasks.filter(task => personById.get(task.person_id)?.pillar === name).length,
      attention: attention.filter(item => personById.get(item.personId)?.pillar === name).length,
      plansDue: duePlans.filter(plan => plan.pillar === name).length,
    }));
    return json({
      generatedAt: new Date().toISOString(),
      user: snapshot.user,
      kpis: {
        activePeople: people.filter(person => Boolean(person.active)).length,
        enrolledDevices: devices.filter(device => Boolean(device.enabled)).length,
        readingsToday,
        attention: attention.length,
        openTasks: openTasks.length,
        plansDue: duePlans.length,
        clinicalAlerts: clinicalAlerts.filter(alert => !['resolved','closed'].includes(String(alert.status || '').toLowerCase())).length,
      },
      people: snapshot.people,
      devices: deviceHealth,
      readings: snapshot.readings.slice(0, 500),
      tasks: snapshot.tasks,
      plans: snapshot.plans,
      attention: snapshot.attention,
      clinicalAlerts: snapshot.clinicalAlerts,
      communications: snapshot.communications.slice(0, 100),
      assessments: snapshot.assessments.slice(0, 100),
      integrationEvents: snapshot.integrationEvents.slice(0, 100),
      pillars,
      operationalPolicy: snapshot.operationalPolicy,
    });
  } catch (error) {
    return failure(error);
  }
}
