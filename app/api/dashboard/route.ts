import { NextRequest } from 'next/server';
import { store } from '../../../lib/server/live-store';
import { currentUser, failure, json } from '../../../lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = currentUser(request);
    const snapshot = store().snapshot(user) as any;
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const latestByDevice = new Map<string, any>();
    for (const reading of snapshot.readings || []) {
      const existing = latestByDevice.get(reading.device_id);
      if (!existing || Date.parse(reading.measured_at) > Date.parse(existing.measured_at)) latestByDevice.set(reading.device_id, reading);
    }
    const readingsToday = (snapshot.readings || []).filter((r:any) => now - Date.parse(r.measured_at) < day).length;
    const openTasks = (snapshot.tasks || []).filter((t:any) => t.stage !== 'Completed');
    const duePlans = (snapshot.plans || []).filter((p:any) => p.status !== 'Paused' && Date.parse(`${p.next_review}T23:59:59Z`) <= now);
    const deviceHealth = (snapshot.devices || []).map((device:any) => ({
      ...device,
      latestReading: latestByDevice.get(device.id) || null,
      state: !device.enabled ? 'paused' : !latestByDevice.get(device.id) ? 'awaiting' : 'connected',
    }));
    const pillars = ['Diabetes management','Hypertension management','Cardiovascular health','Stroke prevention'].map(name => ({
      name,
      activePeople: (snapshot.people || []).filter((p:any) => p.active && p.pillar === name).length,
      openTasks: openTasks.filter((t:any) => snapshot.people?.find((p:any) => p.id === t.person_id)?.pillar === name).length,
      attention: (snapshot.attention || []).filter((a:any) => snapshot.people?.find((p:any) => p.id === a.personId)?.pillar === name).length,
      plansDue: duePlans.filter((p:any) => p.pillar === name).length,
    }));
    return json({
      generatedAt: new Date().toISOString(),
      user: snapshot.user,
      kpis: {
        activePeople: (snapshot.people || []).filter((p:any) => p.active).length,
        enrolledDevices: (snapshot.devices || []).filter((d:any) => d.enabled).length,
        readingsToday,
        attention: (snapshot.attention || []).length,
        openTasks: openTasks.length,
        plansDue: duePlans.length,
        clinicalAlerts: (snapshot.clinicalAlerts || []).filter((a:any) => !['resolved','closed'].includes(String(a.status || '').toLowerCase())).length,
      },
      people: snapshot.people || [],
      devices: deviceHealth,
      readings: (snapshot.readings || []).slice(0, 500),
      tasks: snapshot.tasks || [],
      plans: snapshot.plans || [],
      attention: snapshot.attention || [],
      clinicalAlerts: snapshot.clinicalAlerts || [],
      communications: (snapshot.communications || []).slice(0, 100),
      assessments: (snapshot.assessments || []).slice(0, 100),
      integrationEvents: (snapshot.integrationEvents || []).slice(0, 100),
      pillars,
      operationalPolicy: snapshot.operationalPolicy,
    });
  } catch (error) {
    return failure(error);
  }
}
