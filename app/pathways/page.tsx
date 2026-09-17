'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Activity, Download, Users } from 'lucide-react';
import { buildPathwaySummaries } from '../../lib/pathway-summary';
import type { ClinicalPillar } from '../../lib/care-plans';
import type { PersonSummary } from '../../lib/person-summary';

type Person = { id: string; name: string; town: string; active: number; pillar: ClinicalPillar; programme: string };
type Workspace = { people: Person[]; personSummaries: PersonSummary[] };

const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"','""')}"` : text;
};

export default function PathwaysPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [status, setStatus] = useState('Loading pathway workload…');

  useEffect(() => {
    let active = true;
    fetch('/api/workspace/', { cache: 'no-store' })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(response.status === 401 ? 'Sign in to CareGrid to view pathway workload.' : body.error || 'Could not load the workspace.');
        return body as Workspace;
      })
      .then(body => { if (active) { setWorkspace(body); setStatus(''); } })
      .catch(error => { if (active) setStatus(error instanceof Error ? error.message : 'Could not load the workspace.'); });
    return () => { active = false; };
  }, []);

  const pathways = useMemo(() => workspace ? buildPathwaySummaries(workspace.people, workspace.personSummaries) : [], [workspace]);

  function download() {
    const rows = [
      ['Clinical pillar','People','Active people','Enabled devices','Open follow-ups','Unassigned follow-ups','Active plans','Reviews due'],
      ...pathways.map(item => [item.pillar,item.people,item.activePeople,item.enabledDevices,item.openTasks,item.unassignedTasks,item.activePlans,item.duePlans]),
    ];
    const url = URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'caregrid-pathway-workload.csv';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <main>
    <div className="page-heading">
      <div>
        <span className="eyebrow">CAREGRID / PATHWAYS</span>
        <h1>Four pathways. One workload view.</h1>
        <p>Operational counts across diabetes management, hypertension management, cardiovascular health and stroke prevention.</p>
      </div>
      <div className="actions"><Link className="secondary" href="/people/">People</Link><Link className="secondary" href="/attention/">Operational attention</Link><Link className="secondary" href="/">Back to workspace</Link></div>
    </div>

    {status && <section className="panel"><p role="status">{status}</p><Link href="/">Open CareGrid</Link></section>}

    {workspace && <>
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">CLINICAL FOUNDATION</span><h2>Pathway workload</h2></div><button className="secondary" onClick={download}><Download size={16}/> Download summary</button></div>
        <div className="pathway-workload-grid">{pathways.map(item => <article className="pathway-workload-card" key={item.pillar}>
          <div className="panel-heading"><div><span className="eyebrow">CLINICAL PILLAR</span><h3>{item.pillar}</h3></div><Users size={20}/></div>
          <div className="person-summary-grid">
            <span><strong>{item.activePeople}</strong><small>active people</small></span>
            <span><strong>{item.enabledDevices}</strong><small>enabled devices</small></span>
            <span><strong>{item.openTasks}</strong><small>open follow-ups</small></span>
            <span><strong>{item.duePlans}</strong><small>reviews due</small></span>
          </div>
          <dl><div><dt>Total people</dt><dd>{item.people}</dd></div><div><dt>Unassigned follow-ups</dt><dd>{item.unassignedTasks}</dd></div><div><dt>Active care plans</dt><dd>{item.activePlans}</dd></div></dl>
          <Link className="text-button" href={`/people/?pathway=${encodeURIComponent(item.pillar)}`}>Explore people in pathway</Link>
        </article>)}</div>
      </section>

      <section className="panel context"><Activity size={22}/><h2>Workload, not risk scoring.</h2><p>These counts summarise stored CareGrid workflow state. They do not rank pathways, score patient risk, or interpret measurement values.</p></section>
    </>}
  </main>;
}
