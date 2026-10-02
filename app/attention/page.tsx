'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, ClipboardCheck, Radio, UserRoundCheck } from 'lucide-react';
import type { OperationalAttentionItem } from '../../lib/attention';

type Person = { id: string; name: string; pillar?: string; programme?: string };
type SourceAlarm = { id:string; person_id:string; type:string; severity:string; status:string; updated_ts:number; reviewed_at:string|null };
type Workspace = { thingsboardAlarms?:SourceAlarm[]; people: Person[]; attention: OperationalAttentionItem[]; operationalPolicy?: { deviceFreshnessHours: number | null } };

const iconFor = (kind: OperationalAttentionItem['kind']) => {
  if (kind === 'device-awaiting-reading' || kind === 'device-stale') return Radio;
  if (kind === 'plan-review-due') return ClipboardCheck;
  return UserRoundCheck;
};

export default function AttentionPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [status, setStatus] = useState('Loading operational attention…');

  useEffect(() => {
    let active = true;
    fetch('/api/workspace/', { cache: 'no-store' })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(response.status === 401 ? 'Sign in to CareGrid to view this workspace.' : body.error || 'Could not load the workspace.');
        return body as Workspace;
      })
      .then(body => {
        if (!active) return;
        setWorkspace(body);
        setStatus('');
      })
      .catch(error => {
        if (!active) return;
        setStatus(error instanceof Error ? error.message : 'Could not load the workspace.');
      });
    return () => { active = false; };
  }, []);

  const person = (id: string) => workspace?.people.find(item => item.id === id);
  const freshness = workspace?.operationalPolicy?.deviceFreshnessHours ?? null;

  return <main>
    <div className="page-heading">
      <div>
        <span className="eyebrow">CAREGRID / OPERATIONS</span>
        <h1>Attention without clinical guesswork.</h1>
        <p>Workflow and data-flow checks only. Measurement values are not classified here.</p>
      </div>
      <div className="actions"><Link className="secondary" href="/people/">People</Link><Link className="secondary" href="/">Back to workspace</Link></div>
    </div>

    {status && <section className="panel"><p role="status">{status}</p><Link href="/">Open CareGrid</Link></section>}

    {workspace && <>
      <section className="panel"><h2>ThingsBoard source alarms</h2><p>Provider alarms require care-team review. Review here records follow-up in CareGrid; ThingsBoard retains its own alarm state.</p>{(workspace.thingsboardAlarms || []).filter(alarm => !alarm.reviewed_at && !alarm.status.startsWith('CLEARED')).map(alarm => <article key={alarm.id}><h3>{alarm.type}</h3><p>{person(alarm.person_id)?.name} · {alarm.severity} · {alarm.status}</p><Link href={`/people/${alarm.person_id}/`}>Patient record</Link><button className="secondary" onClick={async () => { try { const response=await fetch('/api/thingsboard/alarms/', {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:alarm.id,updatedTs:alarm.updated_ts})}); const data=await response.json();if(!response.ok)throw new Error(data.error);setWorkspace(previous=>previous?{...previous,thingsboardAlarms:previous.thingsboardAlarms?.map(item=>item.id===alarm.id?{...item,reviewed_at:new Date().toISOString()}:item)}:previous); }catch(error){setStatus((error as Error).message);} }}>Mark reviewed</button></article>)}{!(workspace.thingsboardAlarms || []).some(alarm => !alarm.reviewed_at && !alarm.status.startsWith('CLEARED')) && <p>No unreviewed active source alarms.</p>}</section>
      <div className="metrics">
        <article><span>Operational items</span><strong>{workspace.attention.length}</strong><small>Derived from current stored records</small></article>
        <article><span>People represented</span><strong>{new Set(workspace.attention.map(item => item.personId)).size}</strong><small>Only active monitoring records are included</small></article>
        <article><span>Device freshness policy</span><strong>{freshness === null ? 'Off' : `${freshness}h`}</strong><small>{freshness === null ? 'No stale-device inference' : 'Technical data-flow window only'}</small></article>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div><span className="eyebrow">OPERATIONAL QUEUE</span><h2>Items needing workflow attention</h2></div>
          <span className="badge">{workspace.attention.length} open</span>
        </div>
        {workspace.attention.length === 0 ? <div className="empty"><CheckCircle2 size={30}/><h3>No operational attention items</h3><p>CareGrid has no current workflow or data-flow exceptions in this queue.</p></div> : workspace.attention.map(item => {
          const Icon = iconFor(item.kind);
          const profile = person(item.personId);
          return <article className="live-row" key={item.id}>
            <div>
              <span className="eyebrow">{item.kind.replaceAll('-', ' ')}</span>
              <h3><Icon size={18}/> {item.title}</h3>
              <p>{profile?.name || item.personId}{profile?.pillar ? ` · ${profile.pillar}` : ''}{profile?.programme ? ` · ${profile.programme}` : ''}</p>
              <p>{item.detail}</p>
              <Link className="text-button" href={`/people/${encodeURIComponent(item.personId)}/`}>Open person profile</Link>
            </div>
            <span className="badge">Operational</span>
          </article>;
        })}
      </section>

      <section className="panel context">
        <Activity size={22}/>
        <h2>Boundary of this queue</h2>
        <p>CareGrid uses this route for ownership, review-date and device-data-flow checks. It does not infer a person’s condition, interpret a reading as safe or unsafe, or trigger emergency response.</p>
      </section>
    </>}
  </main>;
}
