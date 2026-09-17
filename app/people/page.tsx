'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import type { PersonSummary } from '../../lib/person-summary';

type Person = { id: string; name: string; town: string; active: number; pillar: string; programme: string };
type Workspace = { people: Person[]; personSummaries: PersonSummary[] };

export default function PeopleDirectoryPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Loading people…');

  useEffect(() => {
    let active = true;
    fetch('/api/workspace/', { cache: 'no-store' })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(response.status === 401 ? 'Sign in to CareGrid to view the people directory.' : body.error || 'Could not load the workspace.');
        return body as Workspace;
      })
      .then(body => { if (active) { setWorkspace(body); setStatus(''); } })
      .catch(error => { if (active) setStatus(error instanceof Error ? error.message : 'Could not load the workspace.'); });
    return () => { active = false; };
  }, []);

  const people = useMemo(() => {
    if (!workspace) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return workspace.people;
    return workspace.people.filter(person => `${person.name} ${person.town} ${person.pillar} ${person.programme}`.toLowerCase().includes(needle));
  }, [workspace, query]);

  const summary = (id: string) => workspace?.personSummaries.find(item => item.personId === id);

  return <main>
    <div className="page-heading">
      <div>
        <span className="eyebrow">CAREGRID / PEOPLE</span>
        <h1>People, pathways and follow-through.</h1>
        <p>Search the live workspace by person, town, programme or clinical pillar.</p>
      </div>
      <div className="actions"><Link className="secondary" href="/attention/">Operational attention</Link><Link className="secondary" href="/">Back to workspace</Link></div>
    </div>

    {status && <section className="panel"><p role="status">{status}</p><Link href="/">Open CareGrid</Link></section>}

    {workspace && <section className="panel">
      <div className="filters">
        <label className="search"><Search size={18}/><span className="sr-only">Search people</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search people, town or pathway"/></label>
        <span className="muted" role="status">{people.length} people</span>
      </div>

      {people.length ? <div className="people-directory">{people.map(person => {
        const details = summary(person.id);
        return <Link className="person-directory-card" key={person.id} href={`/people/${encodeURIComponent(person.id)}/`}>
          <div className="panel-heading">
            <div><span className="eyebrow">{person.pillar}</span><h2>{person.name}</h2><p>{person.programme} · {person.town}</p></div>
            <span className={`badge ${person.active ? 'good' : 'amber'}`}>{person.active ? 'Monitoring active' : 'Monitoring paused'}</span>
          </div>
          <div className="person-summary-grid">
            <span><strong>{details?.devices.enabled ?? 0}</strong><small> enabled devices</small></span>
            <span><strong>{details?.tasks.open ?? 0}</strong><small> open follow-ups</small></span>
            <span><strong>{details?.plans.active ?? 0}</strong><small> active plans</small></span>
            <span><strong>{details?.plans.due ?? 0}</strong><small> reviews due</small></span>
          </div>
          <small className="muted">Latest stored reading: {details?.latestReadingAt ? new Intl.DateTimeFormat('en-ZA',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Johannesburg'}).format(new Date(details.latestReadingAt)) : 'None yet'}</small>
        </Link>;
      })}</div> : <div className="empty"><Users size={28}/><h3>No matching people</h3><p>Try a different name, town, programme or clinical pillar.</p><button className="secondary" onClick={() => setQuery('')}>Clear search</button></div>}
    </section>}
  </main>;
}
