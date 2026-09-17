'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Activity, ClipboardCheck, ListChecks, Radio, UserRound } from 'lucide-react';
import type { AutomaticReading } from '../../../lib/ingestion/reading';
import type { PersonSummary } from '../../../lib/person-summary';

type Person = { id: string; name: string; town: string; active: number; pillar: string; programme: string };
type Device = { id: string; label: string; person_id: string; adapter_id: string; kind: string; enabled: number };
type Task = { id: string; person_id: string; title: string; owner: string | null; stage: string };
type Plan = { id: string; person_id: string; focus: string; pillar: string; next_review: string; status: string };
type Reading = { event_key: string; person_id: string; device_id: string; measured_at: string; payload: AutomaticReading };
type Workspace = { people: Person[]; devices: Device[]; tasks: Task[]; plans: Plan[]; readings: Reading[]; personSummaries: PersonSummary[] };

const formatDate = (value: string) => new Intl.DateTimeFormat('en-ZA', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Africa/Johannesburg',
}).format(new Date(value));

function readingValue(reading: Reading) {
  const measurement = reading.payload.measurement;
  if (measurement.kind === 'blood-pressure') return `${measurement.systolic}/${measurement.diastolic} ${measurement.unit}${measurement.pulse === undefined ? '' : ` · Pulse ${measurement.pulse} bpm`}`;
  return `${measurement.value} ${measurement.unit}${measurement.kind === 'spo2' && measurement.pulse !== undefined ? ` · Pulse ${measurement.pulse} bpm` : ''}`;
}

export default function PersonPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [status, setStatus] = useState('Loading person profile…');

  useEffect(() => {
    let active = true;
    fetch('/api/workspace/', { cache: 'no-store' })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(response.status === 401 ? 'Sign in to CareGrid to view this profile.' : body.error || 'Could not load the workspace.');
        return body as Workspace;
      })
      .then(body => { if (active) { setWorkspace(body); setStatus(''); } })
      .catch(error => { if (active) setStatus(error instanceof Error ? error.message : 'Could not load the workspace.'); });
    return () => { active = false; };
  }, []);

  if (status) return <main><div className="page-heading"><div><span className="eyebrow">CAREGRID / PERSON</span><h1>Connected-care profile</h1></div><Link className="secondary" href="/">Back to workspace</Link></div><section className="panel"><p role="status">{status}</p><Link href="/">Open CareGrid</Link></section></main>;
  if (!workspace) return null;

  const person = workspace.people.find(item => item.id === id);
  if (!person) return <main><div className="page-heading"><div><span className="eyebrow">CAREGRID / PERSON</span><h1>Profile not found</h1><p>The requested person is not present in this workspace.</p></div><Link className="secondary" href="/">Back to workspace</Link></div></main>;

  const summary = workspace.personSummaries.find(item => item.personId === id);
  const devices = workspace.devices.filter(item => item.person_id === id);
  const readings = workspace.readings.filter(item => item.person_id === id);
  const tasks = workspace.tasks.filter(item => item.person_id === id);
  const plans = workspace.plans.filter(item => item.person_id === id);

  return <main>
    <div className="page-heading">
      <div>
        <span className="eyebrow">{person.pillar.toUpperCase()}</span>
        <h1>{person.name}</h1>
        <p>{person.programme} · {person.town}, South Africa · {person.active ? 'Monitoring active' : 'Monitoring paused'}</p>
      </div>
      <div className="actions"><Link className="secondary" href="/attention/">Operational attention</Link><Link className="secondary" href="/">Back to workspace</Link></div>
    </div>

    <div className="metrics">
      <article><span>Enabled devices</span><strong>{summary?.devices.enabled ?? 0}</strong><small>{summary?.devices.total ?? 0} enrolled</small></article>
      <article><span>Open follow-ups</span><strong>{summary?.tasks.open ?? 0}</strong><small>{summary?.tasks.unassigned ?? 0} without an owner</small></article>
      <article><span>Care plans</span><strong>{summary?.plans.active ?? 0}</strong><small>{summary?.plans.due ?? 0} due for workflow review</small></article>
    </div>

    <div className="detail-grid">
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">LATEST STORED CONTEXT</span><h2>Automatic readings</h2></div><Activity size={22}/></div>
        {readings.length ? <div className="table-scroll"><table><thead><tr><th>Measurement</th><th>Reading</th><th>Measured · SAST</th><th>Device</th></tr></thead><tbody>{readings.slice(0, 20).map(reading => <tr key={reading.event_key}><td>{reading.payload.measurement.kind}</td><td>{readingValue(reading)}</td><td>{formatDate(reading.measured_at)}</td><td>{reading.device_id}</td></tr>)}</tbody></table></div> : <div className="empty"><Activity size={28}/><h3>No stored readings yet</h3><p>This profile has no automatic measurements in the current workspace history.</p></div>}
      </section>

      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">PATHWAY</span><h2>{person.programme}</h2></div><UserRound size={22}/></div>
        <dl><div><dt>Clinical pillar</dt><dd>{person.pillar}</dd></div><div><dt>Programme</dt><dd>{person.programme}</dd></div><div><dt>Monitoring</dt><dd>{person.active ? 'Active' : 'Paused'}</dd></div><div><dt>Latest stored reading</dt><dd>{summary?.latestReadingAt ? formatDate(summary.latestReadingAt) : 'None yet'}</dd></div></dl>
        <p className="muted">This profile organises connected-care workflow and stored device context. It does not diagnose, score or recommend treatment.</p>
      </section>
    </div>

    <div className="device-grid context">
      <section className="panel"><div className="panel-heading"><h2>Devices</h2><Radio size={21}/></div>{devices.length ? devices.map(device => <article className="live-row" key={device.id}><div><h3>{device.label}</h3><p>{device.kind} · {device.adapter_id} · {device.enabled ? 'Ingestion enabled' : 'Ingestion paused'}</p></div><span className="badge">{device.id}</span></article>) : <p>No devices enrolled for this person.</p>}</section>
      <section className="panel"><div className="panel-heading"><h2>Care plans</h2><ClipboardCheck size={21}/></div>{plans.length ? plans.map(plan => <article className="live-row" key={plan.id}><div><h3>{plan.focus}</h3><p>{plan.pillar} · {plan.status} · Review {plan.next_review}</p></div></article>) : <p>No care plans recorded for this person.</p>}</section>
    </div>

    <section className="panel context"><div className="panel-heading"><h2>Follow-ups</h2><ListChecks size={21}/></div>{tasks.length ? tasks.map(task => <article className="live-row" key={task.id}><div><h3>{task.title}</h3><p>{task.stage} · {task.owner ? 'Owned' : 'Unassigned'}</p></div></article>) : <p>No follow-up tasks recorded for this person.</p>}</section>
  </main>;
}
