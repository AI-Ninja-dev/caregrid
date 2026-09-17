'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Activity, ArrowLeft, Search } from 'lucide-react';

type Result={type:string;id:string;title:string;detail:string;href:string};

export default function SearchPage(){
  const [query,setQuery]=useState('');const [results,setResults]=useState<Result[]>([]);const [message,setMessage]=useState('Search across people, devices, plans, tasks, providers, sites and support tickets.');const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);try{const response=await fetch(`/api/search/?q=${encodeURIComponent(query)}`,{cache:'no-store'});const body=await response.json();if(!response.ok)throw new Error(body.error||'Search failed.');setResults(body.results||[]);setMessage(body.results?.length?`${body.results.length} result${body.results.length===1?'':'s'}.`:'No matching workspace records.');}catch(error){setMessage((error as Error).message);setResults([]);}finally{setBusy(false);}}
  return <main className="clinical-page"><div className="clinical-shell">
    <header className="clinical-header"><Link className="clinical-back" href="/platform/"><ArrowLeft size={16}/> Platform hub</Link><div className="clinical-brand"><Activity/> CareGrid Search</div></header>
    <section className="clinical-hero"><span className="eyebrow">UNIVERSAL WORKSPACE SEARCH</span><h1>Find the care context, not just a record.</h1><p>Search the authenticated CareGrid workspace across clinical and operational records.</p></section>
    <section className="clinical-section"><form className="live-form" onSubmit={submit}><label className="field">Search<input value={query} onChange={e=>setQuery(e.target.value)} minLength={2} required placeholder="Person, device, plan, task, provider, site…"/></label><button className="primary" disabled={busy}><Search size={16}/> {busy?'Searching…':'Search'}</button></form><p className="muted" role="status">{message}</p></section>
    <section className="clinical-section"><div className="clinical-grid">{results.map(result=><Link href={result.href} className="clinical-card" key={`${result.type}-${result.id}`}><span className="eyebrow">{result.type.replaceAll('-',' ')}</span><h3>{result.title}</h3><p>{result.detail}</p></Link>)}</div></section>
  </div></main>;
}
