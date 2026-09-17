'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Bell, CalendarClock, ChevronRight, ClipboardList, Gauge, HeartPulse, LayoutDashboard, Menu, Radio, RefreshCw, Search, ShieldCheck, Smartphone, Users, Wifi, X } from 'lucide-react';
import styles from './dashboard.module.css';

type Reading = { event_key:string; person_id:string; device_id:string; measured_at:string; payload:{ measurement:any } };
type Person = { id:string; name:string; town:string; active:number; pillar:string; programme:string };
type Attention = { id:string; kind:string; personId:string; subjectId:string; title:string; detail:string };
type Task = { id:string; person_id:string; title:string; owner:string|null; stage:string };
type Plan = { id:string; person_id:string; focus:string; pillar:string; next_review:string; status:string };
type Device = { id:string; label:string; person_id:string; kind:string; enabled:number; state:string; latestReading:Reading|null };
type Pillar = { name:string; activePeople:number; openTasks:number; attention:number; plansDue:number };
type DashboardData = {
  generatedAt:string;
  user:{ email:string; role:string };
  kpis:{ activePeople:number; enrolledDevices:number; readingsToday:number; attention:number; openTasks:number; plansDue:number; clinicalAlerts:number };
  people:Person[];
  devices:Device[];
  readings:Reading[];
  tasks:Task[];
  plans:Plan[];
  attention:Attention[];
  clinicalAlerts:any[];
  communications:any[];
  assessments:any[];
  integrationEvents:any[];
  pillars:Pillar[];
  operationalPolicy:{ deviceFreshnessHours:number|null };
};

const fmt = (value:string) => new Intl.DateTimeFormat('en-ZA',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Johannesburg'}).format(new Date(value));
const compact = (value:string) => new Intl.DateTimeFormat('en-ZA',{day:'2-digit',month:'short',timeZone:'Africa/Johannesburg'}).format(new Date(value));
function readingValue(reading:Reading){
  const m=reading.payload.measurement;
  if(m.kind==='blood-pressure') return `${m.systolic}/${m.diastolic} ${m.unit}${m.pulse===undefined?'':` · ${m.pulse} bpm`}`;
  return `${m.value} ${m.unit}${m.kind==='spo2'&&m.pulse!==undefined?` · ${m.pulse} bpm`:''}`;
}
function metricValue(reading:Reading){const m=reading.payload.measurement;return m.kind==='blood-pressure'?Number(m.systolic):Number(m.value);}
function label(kind:string){return kind.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}

function TrendChart({readings}:{readings:Reading[]}){
  const points=useMemo(()=>readings.slice().sort((a,b)=>Date.parse(a.measured_at)-Date.parse(b.measured_at)).slice(-30),[readings]);
  if(points.length<2)return <div className={styles.emptyChart}>Not enough readings yet to draw a trend.</div>;
  const values=points.map(metricValue).filter(Number.isFinite); if(values.length<2)return <div className={styles.emptyChart}>No plottable values.</div>;
  const min=Math.min(...values),max=Math.max(...values),spread=Math.max(1,max-min);
  const coords=points.map((p,i)=>`${(i/(points.length-1))*100},${88-((metricValue(p)-min)/spread)*68}`).join(' ');
  return <div className={styles.chartWrap}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Recent reading trend"><defs><linearGradient id="caregridTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".22"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><polyline points={coords} fill="none" stroke="currentColor" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/></svg>
    <div className={styles.chartMeta}><span>{compact(points[0].measured_at)}</span><strong>{values[values.length-1]}</strong><span>{compact(points[points.length-1].measured_at)}</span></div>
  </div>;
}

export default function DashboardPage(){
  const [data,setData]=useState<DashboardData|null>(null);
  const [message,setMessage]=useState('');
  const [query,setQuery]=useState('');
  const [pillar,setPillar]=useState('All');
  const [metric,setMetric]=useState('all');
  const [days,setDays]=useState(30);
  const [mobileMenu,setMobileMenu]=useState(false);
  const [selectedPerson,setSelectedPerson]=useState<string>('');

  const load=useCallback(async()=>{setMessage('');const response=await fetch('/api/dashboard/',{cache:'no-store'});if(response.status===401){location.href='/login/';return;}const body=await response.json();if(!response.ok)throw new Error(body.error||'Could not load dashboard.');setData(body);},[]);
  useEffect(()=>{load().catch(e=>setMessage(e.message));const timer=setInterval(()=>{if(document.visibilityState==='visible')load().catch(()=>setMessage('Live refresh paused — tap Refresh to retry.'));},30000);return()=>clearInterval(timer);},[load]);

  const peopleMap=useMemo(()=>new Map((data?.people||[]).map(p=>[p.id,p])),[data]);
  const visiblePeople=useMemo(()=>{if(!data)return[];return data.people.filter(p=>(pillar==='All'||p.pillar===pillar)&&`${p.name} ${p.town} ${p.pillar} ${p.programme}`.toLowerCase().includes(query.toLowerCase()));},[data,pillar,query]);
  const cutoff=Date.now()-days*86400000;
  const visibleReadings=useMemo(()=>{if(!data)return[];const allowed=new Set(visiblePeople.map(p=>p.id));return data.readings.filter(r=>allowed.has(r.person_id)&&Date.parse(r.measured_at)>=cutoff&&(metric==='all'||r.payload.measurement.kind===metric));},[data,visiblePeople,cutoff,metric]);
  const latestByPerson=useMemo(()=>{const map=new Map<string,Reading[]>();for(const reading of (data?.readings||[])){const list=map.get(reading.person_id)||[];list.push(reading);map.set(reading.person_id,list.sort((a,b)=>Date.parse(b.measured_at)-Date.parse(a.measured_at)).slice(0,4));}return map;},[data]);
  const selected=selectedPerson?peopleMap.get(selectedPerson):undefined;

  if(!data)return <main className={styles.loading}><Activity className={styles.pulse}/><h1>Opening CareGrid RPM</h1><p>{message||'Loading the live monitoring workspace…'}</p><button onClick={()=>load().catch(e=>setMessage(e.message))}>Retry</button></main>;

  const nav=[['Dashboard','/dashboard/',LayoutDashboard],['Patients','/people/',Users],['Attention','/attention/',Bell],['Care plans','/plans/',ShieldCheck],['Devices','/#/devices',Radio],['Platform','/platform/',Gauge]] as const;
  const currentMetric=metric==='all'?'All measurements':label(metric);

  return <div className={styles.appShell}>
    <aside className={`${styles.sidebar} ${mobileMenu?styles.sidebarOpen:''}`}>
      <div className={styles.brandRow}><Link href="/dashboard/" className={styles.brand}><span><Activity/></span>Care<b>Grid</b></Link><button className={styles.closeMenu} onClick={()=>setMobileMenu(false)} aria-label="Close navigation"><X/></button></div>
      <p className={styles.workspaceLabel}>HOMECLINICSTORE · RPM</p>
      <nav>{nav.map(([name,href,Icon])=><Link key={name} href={href} className={name==='Dashboard'?styles.activeNav:''}><Icon/><span>{name}</span></Link>)}</nav>
      <div className={styles.sidebarFoot}><div className={styles.avatar}>{data.user.email.slice(0,2).toUpperCase()}</div><div><strong>{data.user.email}</strong><span>{data.user.role}</span></div></div>
    </aside>

    <div className={styles.content}>
      <header className={styles.topbar}><button className={styles.menuButton} onClick={()=>setMobileMenu(true)} aria-label="Open navigation"><Menu/></button><div><span className={styles.breadcrumb}>CareGrid / RPM Dashboard</span><strong>Live connected-care workspace</strong></div><div className={styles.topActions}><button onClick={()=>load().catch(e=>setMessage(e.message))}><RefreshCw/> <span>Refresh</span></button><Link href="/platform/search/"><Search/></Link></div></header>

      <main className={styles.main}>
        <section className={styles.hero}><div><span className={styles.eyebrow}>REMOTE PATIENT MONITORING</span><h1>Care, visible in real time.</h1><p>Current readings, longitudinal context, care workload and device health in one adaptive workspace.</p></div><div className={styles.liveBadge}><span/> Live · {fmt(data.generatedAt)}</div></section>
        {message&&<div className={styles.notice} role="status">{message}</div>}

        <section className={styles.kpis} aria-label="RPM key metrics">
          <article><Users/><div><span>Active patients</span><strong>{data.kpis.activePeople}</strong><small>Across {data.pillars.filter(p=>p.activePeople>0).length} active pathways</small></div></article>
          <article><Radio/><div><span>Connected devices</span><strong>{data.kpis.enrolledDevices}</strong><small>{data.devices.filter(d=>d.state==='awaiting').length} awaiting first reading</small></div></article>
          <article><HeartPulse/><div><span>Readings today</span><strong>{data.kpis.readingsToday}</strong><small>Automatic monitoring events</small></div></article>
          <article><Bell/><div><span>Needs attention</span><strong>{data.kpis.attention}</strong><small>Operational, not diagnostic</small></div></article>
          <article><ClipboardList/><div><span>Open tasks</span><strong>{data.kpis.openTasks}</strong><small>{data.tasks.filter(t=>!t.owner&&t.stage!=='Completed').length} unassigned</small></div></article>
          <article><CalendarClock/><div><span>Plan reviews due</span><strong>{data.kpis.plansDue}</strong><small>{data.kpis.clinicalAlerts} governed alerts open</small></div></article>
        </section>

        <section className={styles.toolbar} aria-label="Dashboard filters"><div className={styles.searchBox}><Search/><input aria-label="Search patients" placeholder="Search patient, town, pathway or programme" value={query} onChange={e=>setQuery(e.target.value)}/></div><select aria-label="Clinical pillar" value={pillar} onChange={e=>setPillar(e.target.value)}><option>All</option>{data.pillars.map(p=><option key={p.name}>{p.name}</option>)}</select><select aria-label="Measurement" value={metric} onChange={e=>setMetric(e.target.value)}><option value="all">All measurements</option>{Array.from(new Set(data.readings.map(r=>r.payload.measurement.kind))).map(k=><option key={k} value={k}>{label(k)}</option>)}</select><select aria-label="Trend range" value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option></select></section>

        <div className={styles.dashboardGrid}>
          <section className={`${styles.card} ${styles.trendsCard}`}><div className={styles.cardHead}><div><span className={styles.eyebrow}>LONGITUDINAL VIEW</span><h2>{currentMetric} trend</h2></div><BarChart3/></div><TrendChart readings={visibleReadings}/><div className={styles.legend}><span><i/> Stored readings</span><small>No clinical interpretation is applied to this chart.</small></div></section>

          <section className={`${styles.card} ${styles.attentionCard}`}><div className={styles.cardHead}><div><span className={styles.eyebrow}>WORKFLOW QUEUE</span><h2>Needs attention</h2></div><Link href="/attention/">View all <ChevronRight/></Link></div><div className={styles.stack}>{data.attention.slice(0,5).map(item=><Link href={`/people/${item.personId}/`} className={styles.attentionItem} key={item.id}><span className={styles.alertDot}/><div><strong>{peopleMap.get(item.personId)?.name||'Patient'}</strong><p>{item.title}</p><small>{item.detail}</small></div><ChevronRight/></Link>)}{!data.attention.length&&<div className={styles.empty}><ShieldCheck/><strong>No operational attention items</strong><p>Current workflow checks are clear.</p></div>}</div></section>

          <section className={`${styles.card} ${styles.patientsCard}`}><div className={styles.cardHead}><div><span className={styles.eyebrow}>CURRENT READINGS</span><h2>Patient monitoring</h2></div><span>{visiblePeople.length} shown</span></div><div className={styles.patientList}>{visiblePeople.slice(0,8).map(person=>{const readings=latestByPerson.get(person.id)||[];return <button key={person.id} className={styles.patientCard} onClick={()=>setSelectedPerson(person.id)}><div className={styles.patientTop}><div className={styles.avatar}>{person.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><strong>{person.name}</strong><span>{person.programme} · {person.town}</span></div><span className={styles.pathway}>{person.pillar.replace(' management','')}</span></div><div className={styles.readingChips}>{readings.length?readings.map(r=><span key={r.event_key}><b>{label(r.payload.measurement.kind)}</b>{readingValue(r)}<small>{fmt(r.measured_at)}</small></span>):<span className={styles.noReading}>Awaiting first stored reading</span>}</div></button>})}{!visiblePeople.length&&<div className={styles.empty}><Users/><strong>No matching patients</strong><p>Adjust the dashboard filters.</p></div>}</div></section>

          <section className={`${styles.card} ${styles.deviceCard}`}><div className={styles.cardHead}><div><span className={styles.eyebrow}>DEVICE FLEET</span><h2>Connectivity health</h2></div><Smartphone/></div><div className={styles.deviceSummary}><div><span className={styles.goodDot}/><strong>{data.devices.filter(d=>d.state==='connected').length}</strong><small>with readings</small></div><div><span className={styles.warnDot}/><strong>{data.devices.filter(d=>d.state==='awaiting').length}</strong><small>awaiting data</small></div><div><span className={styles.neutralDot}/><strong>{data.devices.filter(d=>d.state==='paused').length}</strong><small>paused</small></div></div><div className={styles.stack}>{data.devices.slice(0,5).map(device=><div className={styles.deviceRow} key={device.id}><div className={`${styles.deviceIcon} ${styles[device.state]||''}`}><Wifi/></div><div><strong>{device.label}</strong><span>{peopleMap.get(device.person_id)?.name||device.person_id}</span></div><small>{device.latestReading?fmt(device.latestReading.measured_at):'No reading'}</small></div>)}</div></section>

          <section className={`${styles.card} ${styles.pillarsCard}`}><div className={styles.cardHead}><div><span className={styles.eyebrow}>CLINICAL FOUNDATION</span><h2>Four care pillars</h2></div><Gauge/></div><div className={styles.pillarGrid}>{data.pillars.map(p=><article key={p.name}><span>{p.name}</span><strong>{p.activePeople}</strong><small>active patients</small><div><em>{p.attention} attention</em><em>{p.openTasks} tasks</em><em>{p.plansDue} reviews</em></div></article>)}</div></section>

          <section className={`${styles.card} ${styles.activityCard}`}><div className={styles.cardHead}><div><span className={styles.eyebrow}>RECENT ACTIVITY</span><h2>Latest readings</h2></div><Activity/></div><div className={styles.activityList}>{data.readings.slice(0,8).map(r=><div key={r.event_key}><span className={styles.timelineDot}/><div><strong>{peopleMap.get(r.person_id)?.name||'Patient'}</strong><p>{label(r.payload.measurement.kind)} · {readingValue(r)}</p></div><time>{fmt(r.measured_at)}</time></div>)}{!data.readings.length&&<div className={styles.empty}><Activity/><strong>No readings yet</strong><p>Readings will appear when an enrolled connector sends them.</p></div>}</div></section>
        </div>
      </main>

      <nav className={styles.mobileNav} aria-label="Mobile navigation"><Link className={styles.mobileActive} href="/dashboard/"><LayoutDashboard/><span>Home</span></Link><Link href="/people/"><Users/><span>Patients</span></Link><Link href="/attention/"><Bell/><span>Attention</span></Link><Link href="/plans/"><ClipboardList/><span>Plans</span></Link><button onClick={()=>setMobileMenu(true)}><Menu/><span>More</span></button></nav>
    </div>

    {selected&&<div className={styles.drawerBackdrop} onClick={()=>setSelectedPerson('')}><aside className={styles.drawer} onClick={e=>e.stopPropagation()} aria-label={`${selected.name} monitoring summary`}><button className={styles.drawerClose} onClick={()=>setSelectedPerson('')} aria-label="Close patient summary"><X/></button><span className={styles.eyebrow}>PATIENT MONITOR</span><h2>{selected.name}</h2><p>{selected.pillar} · {selected.programme} · {selected.town}</p><div className={styles.drawerMetrics}>{(latestByPerson.get(selected.id)||[]).map(r=><article key={r.event_key}><span>{label(r.payload.measurement.kind)}</span><strong>{readingValue(r)}</strong><small>{fmt(r.measured_at)}</small></article>)}</div><div className={styles.drawerActions}><Link href={`/people/${selected.id}/`}>Open longitudinal record</Link><Link href="/attention/">Open attention queue</Link></div></aside></div>}
  </div>;
}
