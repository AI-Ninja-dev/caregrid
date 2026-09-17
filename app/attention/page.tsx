'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, ClipboardCheck, Radio, UserRoundCheck } from 'lucide-react';
import type { OperationalAttentionItem } from '../../lib/attention';

type Person = { id: string; name: string; pillar?: string; programme?: string };
type Workspace = { people: Person[]; attention: OperationalAttentionItem[] };

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

  return <main>
    <div className="page-heading">
      <div>
        <span className="eyebrow">CAREGRID / OPERATIONS</span>
        <h1>Attention without clinical guesswork.</h1>
        <p>Workflow and data-flow checks only. Measurement values are not classified here.</p>
      </div>
      <Link className="secondary" href="/">Back to workspace</Link>
    </div>

    {status && <section className="panel"><p role="status">{status}</p><Link href="/">Open CareGrid</Link></section>}

    {workspace && <>
      <div className="metrics">
        <article><span>Operational items</span><strong>{workspace.attention.length}</strong><small>Derived from current stored records</small></article>
        <article><span>People represented</span><strong>{new Set(workspace.attention.map(item => item.personId)).size}</strong><small>Only active monitoring records are included</small></article>
        <article><span>Clinical alerts</span><strong>0</strong><small>This route does not classify measurement values</small></article>
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
