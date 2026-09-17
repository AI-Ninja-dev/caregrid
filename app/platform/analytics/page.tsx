'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, BarChart3 } from 'lucide-react';

type Row=Record<string,unknown>;
type Snapshot={people:Row[];devices:Row[];readings:Row[];tasks:Row[];plans:Row[];attention:Row[];programmeEnrollments:Row[];communications:Row[];assessments:Row[];careTime:Row[];billingActivity:Row[];supportTickets:Row[];connectors:Row[];clinicalAlerts:Row[]};
const count=(rows:Row[]|undefined,key:string,value:string)=>rows?.filter(row=>String(row[key]??'')===value).length||0;

export default function AnalyticsPage(){
  const [data,setData]=useState<Snapshot|null>(null);const [message,setMessage]=useState('Loading persisted workspace analytics…');
  useEffect(()=>{fetch('/api/workspace/',{cache:'no-store'}).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error||'Could not load analytics.');setData(body);setMessage('');}).catch(error=>setMessage(error.message));},[]);
  const analytics=useMemo(()=>{if(!data)return null;const activePeople=count(data.people,'active','1');const openTasks=data.tasks.filter(row=>String(row.stage)!=='Completed').length;const openTickets=data.supportTickets.filter(row=>String(row.status)!=='closed').length;const careSeconds=data.careTime.reduce((sum,row)=>sum+Number(row.duration_seconds||0),0);const billingEstimate=data.billingActivity.reduce((sum,row)=>sum+Number(row.amount_estimate||0),0);const pillars=new Map<string,number>();for(const row of data.people){const pillar=String(row.pillar||'Unassigned');pillars.set(pillar,(pillars.get(pillar)||0)+1);}return{activePeople,openTasks,openTickets,careSeconds,billingEstimate,pillars:[...pillars.entries()]};},[data]);
  return <main className="clinical-page"><div className="clinical-shell">
    <header className="clinical-header"><Link className="clinical-back" href="/platform/"><ArrowLeft size={16}/> Platform hub</Link><div className="clinical-brand"><BarChart3/> CareGrid Analytics</div></header>
    <section className="clinical-hero"><span className="eyebrow">LIVE WORKSPACE ANALYTICS</span><h1>Operational visibility from persisted CareGrid data.</h1><p>No synthetic performance claims: this view calculates directly from the authenticated workspace snapshot.</p></section>
    {message&&<section className="clinical-section"><p>{message}</p><Link href="/">Return to sign in</Link></section>}
    {data&&analytics&&<>
      <section className="metrics"><article><span>Active people</span><strong>{analytics.activePeople}</strong></article><article><span>Stored readings</span><strong>{data.readings.length}</strong></article><article><span>Open tasks</span><strong>{analytics.openTasks}</strong></article><article><span>Attention items</span><strong>{data.attention.length}</strong></article></section>
      <section className="clinical-section"><div className="clinical-section-heading"><div><span className="eyebrow">CARE DELIVERY</span><h2>Program and workload indicators</h2></div><Activity/></div><div className="metrics"><article><span>Program enrollments</span><strong>{data.programmeEnrollments.length}</strong></article><article><span>Care plans</span><strong>{data.plans.length}</strong></article><article><span>Communications</span><strong>{data.communications.length}</strong></article><article><span>Assessments</span><strong>{data.assessments.length}</strong></article></div></section>
      <section className="clinical-section"><span className="eyebrow">CLINICAL PILLARS</span><h2>People by pillar</h2><div className="clinical-grid">{analytics.pillars.map(([pillar,total])=><article className="clinical-card" key={pillar}><h3>{pillar}</h3><strong>{total}</strong><p>person{total===1?'':'s'} currently classified in this pathway.</p></article>)}</div></section>
      <section className="clinical-section"><span className="eyebrow">OPERATIONS</span><h2>Care-team and device operations</h2><div className="metrics"><article><span>Care time</span><strong>{Math.round(analytics.careSeconds/60)} min</strong></article><article><span>Support tickets open</span><strong>{analytics.openTickets}</strong></article><article><span>Connector definitions</span><strong>{data.connectors.length}</strong></article><article><span>Clinical alerts recorded</span><strong>{data.clinicalAlerts.length}</strong></article></div></section>
      <section className="clinical-section"><span className="eyebrow">FINANCIAL WORKFLOW</span><h2>Configurable billing activity</h2><p>Estimated amount across stored billing activity: <strong>{analytics.billingEstimate.toLocaleString('en-ZA',{maximumFractionDigits:2})}</strong>. Currency and reimbursement logic remain rule-driven per deployment.</p></section>
    </>}
  </div></main>;
}
